# Pipeline Parallel 与 Bubble 分析

> Tensor parallelism 把矩阵乘法切到各个 rank 上。Pipeline parallelism 把模型切到各个 rank 上，一个 rank 一个 stage。Microbatch 在 pipeline 里流动。开头和结尾那段空闲就是 bubble；把它压到最小，就是这门手艺的全部。

**类型：** Build
**语言：** Python
**前置要求：** 阶段19 Track C 第42-49课
**预计时间：** ~90 分钟

## 学习目标

- 把一个顺序模型切成 N 个 stage，模拟一条横跨 N 个 rank 的 forward pipeline。
- 用 GPipe 调度（只填 forward，再做 backward）把 M 个 microbatch 调度过 pipeline，并算出 bubble 比例。
- 把 bubble 和 Megatron-LM、PipeDream 用的交错式 1F1B 调度做对比。
- 论证 stage 分配：每个 stage 计算量相等，比每个 stage 参数量相等更重要。

## 问题背景

一个 fp16 的 700 亿参数模型，光参数就要 140 GB。没有消费级 GPU 装得下。ZeRO-3 把参数 shard 到各个 rank 上，但每次 forward 仍要每个 rank 把整层 allgather 出来，每层付 log(N) 跳。Pipeline parallel 走另一条路：把模型切成 N 个 stage，每个 rank 放一个 stage。第 1 层的 forward 在 rank 0 上算完，把激活张量交给 rank 1；rank 1 跑第 2 层再交给 rank 2；以此类推。Backward 反向流动。内存线性下降，因为每个 rank 只持有一个 stage；计算是顺序的，这就是 bubble 问题。

Bubble 是 pipeline 开头的空闲（等第一个 microbatch 到达最后一个 stage）和结尾的空闲（等最后一个 microbatch 反向排空）。有 M 个 microbatch 和 N 个 stage 时，每 stage 的 bubble 比例是 (N-1)/(M+N-1)。在 M=8、N=4 时是 27%。在 M=64、N=4 时是 4.5%。每步 microbatch 越多 bubble 越小，这意味着每 microbatch 的 batch size 要小，而这个约束正是驱动 microbatch 设计的因素。

## 核心概念

```mermaid
flowchart LR
  R0[rank 0：stage 0 / layer 0] --> R1[rank 1：stage 1 / layer 1]
  R1 --> R2[rank 2：stage 2 / layer 2]
  R2 --> R3[rank 3：stage 3 / loss]
  R3 -.backward.-> R2
  R2 -.backward.-> R1
  R1 -.backward.-> R0
```

### GPipe 调度

在开始任何 backward 之前，先用全部 M 个 microbatch 把 pipeline 正向填满；然后反向排空 backward。每个 microbatch 的激活值必须留到它的 backward 才能释放，所以内存随 M 线性增长。Forward 占 M+N-1 个周期，backward 再占 M+N-1 个周期。每 stage 的有用工作是 2M 周期；每 stage 的 bubble 是 2(N-1) 周期。当每次 forward 和 backward 各占一个时间单位时，bubble 比例是 (N-1)/(M+N-1)。选 M 远大于 N 就能把 bubble 藏起来。

### 1F1B 调度

交错进行：一个 microbatch 的 forward 一到达最后一个 stage，就启动它的 backward 并让它反向流回。这个调度在每个 stage 上交替做一次 forward 和一次 backward。Bubble 仍是 N-1，但激活内存被 pipeline 深度限住，而不是 microbatch 数量。生产 pipeline 用 1F1B（Megatron、PipeDream）。本课先实现 GPipe 因为它更简单，1F1B 留作练习。

### 为什么每 stage 计算量相等很重要

如果 stage 0 要 50 ms、stage 1 要 100 ms，每个周期都被 stage 1 卡着。其他 stage 每周期空等 50 ms 等 stage 1 放行。参数量相等是错误的衡量轴：transformer 的计算由每层的 attention 加 MLP 主导，而 embedding 层参数多但计算少。Stage 分配应该让每个 stage 的 FLOPs 相等，而不是权重相等。

### Microbatch 与 batch 的关系

一条 pipeline 跑 M 个大小为 B 的 microbatch。有效 batch size 是 M*B。Pipeline 一步结束时的梯度，就是在合起来的 M*B 个样本上的梯度。Bubble 比例取决于 M；optimizer 看到的是 M*B。调 M 就是在 bubble（M 高则更低）和每 microbatch 内存（在 GPipe 下 M 高则激活内存更高）之间权衡。

```figure
cd-pipeline-bubble
```

## 动手构建

`code/main.py` 实现了：

- `PipelineStage`：一个小 `nn.Module`，持有一个 stage 的参数并暴露 `forward(activation)`。
- `Pipeline(stages, num_microbatches)`：用每个 stage 的模拟墙钟时间，在模拟 stage 上编排 GPipe 调度。
- `bubble_fraction(num_stages, num_microbatches)`：闭式解 (N-1)/(M+N-1)。
- 一个 4-stage demo，打印逐 microbatch 的 trace 和实测的 bubble 比例。

运行：

```bash
python3 code/main.py
```

输出：一张 stage 对 microbatch 的甘特图，以及 bubble 百分比与闭式预测的对比。

## 真实世界中的生产模式

有三个模式能把 pipeline parallel 打磨到可以上线。

**activation checkpointing 要和 pipeline 配套。** 在 GPipe 上有 M 个 microbatch 在飞时，激活内存是单个 microbatch 的 M 倍。Activation checkpointing 在 backward 时重算 forward，拿计算换内存；正是这个组合让 pipeline 对长序列变得可行。

**stage 平衡是测出来的，不是假设出来的。** 生产团队会跑一遍 profiling，在目标硬件上测出实际的逐层计算量（FLOPs 和墙钟），再按这个测量值来切分。Megatron-LM 的 `--num-layers-per-stage` flag 接受一个列表，允许在各 stage 单层成本不同时使用不均的层数。

**send-recv 调度必须避免死锁。** 一条每个 stage 都先 send 再 recv 的 pipeline 会在线路上死锁。标准修法是交错：偶数 rank 的 stage 先 send 再 recv，奇数 rank 的 stage 先 recv 再 send。本课显式地排 rank 的顺序，让这个模式看得见。

## 实际使用

生产模式：

- **Megatron-LM。** 大规模 pipeline parallel 的标杆。用 1F1B，支持 tensor + pipeline + data parallel 三者组合。
- **DeepSpeed Pipeline。** 和 ZeRO 集成；ZeRO-1 + pipeline 是最大那批开源模型的常见组合。
- **PyTorch Pipe。** PyTorch 原生的 pipeline wrapper，构建于 `torch.distributed.pipeline.sync.Pipe`。

## 拿去用

第 80 课把每个 stage 的参数 shard 存进 sharded checkpoint。第 81 课在端到端 demo 上把 DDP + ZeRO + pipeline 组装起来（在精神上如此；为了运行时间，demo 把 pipeline 保持为模拟）。

## 练习

1. 实现 1F1B，验证 bubble 比例与 GPipe 一致，但激活内存被限住。
2. 在一个更深的模型上 profile 真实的每 stage 时间，按实测墙钟重新平衡 stage。
3. 加上跨 pipeline microbatch 的梯度累积，检查梯度等于等价的整 batch forward 的梯度。
4. 把 pipeline 和 activation checkpointing 配在一起，测量内存下降与计算代价的对比。
5. 把 pipeline 和 DDP 组合（每个 pipeline rank 在一个数据并行组里被复制），推理这套 2D 调度。

## 关键术语

| 术语 | 大家怎么说 | 实际含义 |
|------|----------------|------------------------|
| Pipeline | "沿深度的模型并行" | 一个 rank 一个 stage，激活值在 stage 间流动 |
| Bubble | "pipeline 空闲时间" | 开头 + 结尾各 (N-1) 步，部分 stage 没活干 |
| Microbatch | "batch 的一片" | 一个 forward/backward 单元；M 越大 bubble 越小 |
| GPipe | "先填后排" | 全部 M 个 forward 在任何 backward 之前；激活内存高 |
| 1F1B | "交错调度" | 每个 stage 一次 forward 一次 backward；激活内存有界 |

## 延伸阅读

- [Huang 等，GPipe：巨型神经网络的高效训练](https://arxiv.org/abs/1811.06965)
- [Narayanan 等，PipeDream：面向 DNN 训练的通用 Pipeline Parallelism](https://arxiv.org/abs/1806.03377)
- [Megatron-LM pipeline parallel 文档](https://github.com/NVIDIA/Megatron-LM)
- 阶段19 第76课 - 这套调度所用的 send/recv 原语
- 阶段19 第78课 - ZeRO 与 pipeline 正交，常被组合使用
