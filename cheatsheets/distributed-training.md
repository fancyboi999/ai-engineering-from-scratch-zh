---
id: distributed-training
title: DDP、FSDP、ZeRO 与流水线并行
code: DF
subtitle: 选择并行方式、估算内存、连接集合通信并修复挂起。使用 CPU 上的 PyTorch gloo。
hue: 280
sources: phases/10-llms-from-scratch/05-scaling-distributed, phases/10-llms-from-scratch/19-dualpipe-parallelism, phases/19-capstone-projects/48-distributed-fsdp-ddp, phases/19-capstone-projects/76-collective-ops-from-scratch, phases/19-capstone-projects/77-data-parallel-ddp, phases/19-capstone-projects/78-zero-parameter-sharding, phases/19-capstone-projects/79-pipeline-parallel
source_hash: ca65515801c686a8
---

## 四种策略对比
type: comparison
span: 2
from: phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md, phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md

| 维度 | DDP | FSDP 或 ZeRO-3 | 流水线 | 张量并行 |
|---|---|---|---|---|
| 拆分对象 | 批次 | 参数、梯度、优化器 | 按层拆分模型 | 每个权重矩阵 |
| 每 GPU 内存 | 完整副本，不减少 | 每种状态的 1/N | 一组层 | 每层的一个切片 |
| 通信 | 梯度 all-reduce | 每层 all-gather、reduce-scatter | 层边界的激活值 | 每次矩阵乘法后 all-reduce |
| 链路 | 与计算重叠 | 比普通 DP 通信更多 | 跨节点，低带宽 | 节点内 NVLink |
| 主要成本 | 内存 | 每次前向传播都收集 | 流水线气泡 | 每层后的延迟 |

## 各策略的适用条件
type: concepts
from: phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md, phases/19-capstone-projects/78-zero-parameter-sharding/docs/zh.md, phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md, phases/10-llms-from-scratch/19-dualpipe-parallelism/docs/zh.md

- **DDP**：模型能放入单设备，数据集不能。
- **FSDP**：模型也无法放入单设备。
- **ZeRO-1**：默认选择。带宽需求与 DDP 相同，内存随 N 线性下降。
- **ZeRO-2 或 ZeRO-3**：参数分片内存也成为问题时。
- **张量并行**：节点内使用，需要高速 GPU 互连。
- **流水线**：跨节点使用，带宽需求低。
- **DualPipe**：数千 GPU 规模、专家并行占比较高的 MoE。
- **DualPipeV**：稠密模型或专家并行较少的模型。一个参数副本。

## ZeRO 阶段
type: comparison
span: 2
from: phases/19-capstone-projects/78-zero-parameter-sharding/docs/zh.md, phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md

| 维度 | DDP | ZeRO-1 | ZeRO-2 | ZeRO-3 |
|---|---|---|---|---|
| 分片对象 | 无 | 优化器状态 | 优化器 + 梯度 | 优化器 + 梯度 + 参数 |
| 每 rank 内存 | params + grads + optim | params + grads + optim/N | params + grads/N + optim/N | params/N + grads/N + optim/N |
| 每步通信 | 1x allreduce | 1x reduce_scatter + 1x allgather | 1x reduce_scatter + 1x allgather | 每层 allgather 和 reduce_scatter |
| 节省 | 无 | 约减少 4x | 约减少 8x | 约减少 Nx |
| PyTorch FSDP 名称 | 未列出 | 未列出 | `ShardingStrategy.SHARD_GRAD_OP` | `FULL_SHARD` |

## 内存数值
type: concepts
from: phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md, phases/19-capstone-projects/78-zero-parameter-sharding/docs/zh.md

- **Adam 状态**：m 和 v 使用 FP32。70B x 4 bytes x 2 = 560GB。
- **普通混合精度**：每 rank 为 16P 字节。
- **ZeRO-1**：4P + 12P/N 字节。N=8 时为 5.5P，下降 65%。
- **8 GPU 上的 70B FSDP**：每 GPU 为 105 GB，仍超过 80GB。
- **7B 混合精度**：112 GB 降至 84 GB。优化器保持 FP32。
- **有效批量大小**：per_gpu_batch_size x N。

## 流水线调度
type: comparison
from: phases/10-llms-from-scratch/19-dualpipe-parallelism/docs/zh.md, phases/10-llms-from-scratch/19-dualpipe-parallelism/code/main.py

| 维度 | 1F1B | Zero Bubble | DualPipe | DualPipeV |
|---|---|---|---|---|
| 参数副本 | 1 | 1 | 2 | 1 |
| 气泡随微批次变化 | 增长 | 增长 | 恒定 | 小幅增长 |
| 重叠 | 极少 | 部分 | 完全 | 部分 |
| 模拟器 | `bubble_1f1b` | `bubble_zero_bubble` | `bubble_dualpipe` | `bubble_dualpipev` |

## 集合通信
type: comparison
from: phases/19-capstone-projects/76-collective-ops-from-scratch/docs/zh.md

| 维度 | 环形 allreduce | 树形 allreduce | Allgather | Reduce_scatter |
|---|---|---|---|---|
| 每 rank 字节数 | 2T(N-1)/N | T log2(N) | T(N-1)/N | T(N-1)/N |
| 步数 | 2(N-1) | 2 log2(N) | N-1 | N-1 |
| 适用条件 | T 大 | T 小、延迟高 | ZeRO 解除分片 | ZeRO 梯度分片 |
| 消息大小 | 约 1 MB 以上 | 约 1 MB 以下 | 任意 | 任意 |

## 队列网格上的环形 allreduce
type: architecture
from: phases/19-capstone-projects/76-collective-ops-from-scratch/docs/zh.md, phases/19-capstone-projects/76-collective-ops-from-scratch/code/main.py

```arch
node | r0 | 1,1 | rank 0 | 持有分块 0 | process
node | r1 | 2,1 | rank 1 | 持有分块 1 | process
node | r2 | 2,2 | rank 2 | 持有分块 2 | process
node | r3 | 1,2 | rank 3 | 持有分块 3 | process
edge | r0 | r1 | 队列 0 到 1
edge | r1 | r2 | 队列 1 到 2
edge | r2 | r3 | 队列 2 到 3
edge | r3 | r0 | 队列 3 到 0
```

## DDP worker 循环
type: annotated-code
lang: python
from: phases/19-capstone-projects/77-data-parallel-ddp/code/main.py

```python
dist.init_process_group(
    backend="gloo",
    init_method=f"file://{init_file}",  # 通过文件会合
    rank=rank,
    world_size=world_size,
)
torch.manual_seed(SEED)  # 每个 rank 初始化相同
ddp = DistributedDataParallel(model, world_size=world_size)  # 广播参数
for step in range(steps):
    offset = step * world_size * batch + rank * batch  # 自己的切片
    optim.zero_grad(set_to_none=True)
    loss.backward()
    ddp.sync_grads()  # all_reduce SUM，然后除以 world_size（div_）
    optim.step()
```

## 集合通信调用
type: task-table
span: 2
from: phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md, phases/19-capstone-projects/77-data-parallel-ddp/code/main.py, phases/19-capstone-projects/78-zero-parameter-sharding/code/main.py, phases/19-capstone-projects/79-pipeline-parallel/code/main.py, phases/19-capstone-projects/77-data-parallel-ddp/docs/zh.md

| 任务 | 代码 |
|---|---|
| 设置会合端口 | `os.environ["MASTER_PORT"] = str(port)` |
| 启动 CPU 进程组 | `dist.init_process_group(backend="gloo", rank=rank, world_size=world_size)` |
| 所有 rank 使用相同参数 | `dist.broadcast(p.data, src=0)` |
| 梯度求和 | `dist.all_reduce(p.grad.data, op=dist.ReduceOp.SUM)` |
| 梯度求均值 | `p.grad.data.div_(world_size)` |
| ZeRO-1 梯度分片 | `dist.reduce_scatter(local_grad, chunks, op=dist.ReduceOp.SUM)` |
| ZeRO-1 收回参数 | `dist.all_gather(gathered, self.master_shard)` |
| GPipe 气泡 | `bubble_fraction(num_stages, num_microbatches)` |

## 运行课程
type: command-table
from: phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md, phases/19-capstone-projects/48-distributed-fsdp-ddp/code/main.py, phases/19-capstone-projects/76-collective-ops-from-scratch/docs/zh.md, phases/19-capstone-projects/77-data-parallel-ddp/docs/zh.md, phases/19-capstone-projects/78-zero-parameter-sharding/docs/zh.md, phases/19-capstone-projects/79-pipeline-parallel/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 第 48 课：两个 gloo rank，写入 `outputs/ddp-demo.json` |
| `--world-size 4` | 第 48 课：四个 rank。参数差异保持在 1e-3 以下 |
| `--no-write` | 第 48 课：跳过 JSON 文件 |
| `python3 code/main.py` | 第 76 课：队列网格对比 gloo，统计字节数 |
| `python3 code/main.py` | 第 77 课：单进程对比 4 rank DDP |
| `python3 code/main.py` | 第 78 课：损失与 ZeRO-1 内存表 |
| `python3 code/main.py` | 第 79 课：甘特图与气泡百分比 |

## 代码中的默认值
type: defaults
from: phases/19-capstone-projects/48-distributed-fsdp-ddp/code/main.py, phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md, phases/19-capstone-projects/76-collective-ops-from-scratch/code/main.py, phases/19-capstone-projects/76-collective-ops-from-scratch/docs/zh.md, phases/19-capstone-projects/79-pipeline-parallel/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--world-size` | 2 | 第 48 课的 rank 数 |
| `--backend` | `gloo` | GPU 上使用 `nccl` |
| `--num-steps` | 6 | 第 48 课训练步数 |
| `--batch-size` | 8 | 每 rank |
| `RECV_TIMEOUT_S` | 30.0 | 队列网格接收截止时间 |
| DDP 桶大小 | 25 MB | 每桶一次 allreduce |
| `NUM_STAGES` | 4 | 第 79 课流水线 |
| `NUM_MICROBATCHES` | 8 | 第 79 课流水线 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/48-distributed-fsdp-ddp/docs/zh.md, phases/19-capstone-projects/77-data-parallel-ddp/docs/zh.md, phases/19-capstone-projects/79-pipeline-parallel/docs/zh.md, phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| rank 从第一步开始偏离 | 各 rank 独立初始化 | 构造时调用 `dist.broadcast(tensor, src=0)` |
| 所有 rank 看到相同批次 | 打乱时共享同一个种子 | 打乱时使用 `torch.manual_seed(seed + rank)` |
| Allreduce 死锁 | 跳过的参数无梯度 | 使用 `find_unused_parameters=True` |
| 梯度累积缓慢 | 每个微批次都 allreduce | 将微批次包在 `no_sync()` 中 |
| N 变化后学习率失效 | 只求 SUM，未做除法 | 除以 world_size |
| 流水线通信挂起 | 每个阶段都先发后收 | 偶数 rank 先发，奇数 rank 先收 |
| 某阶段卡住每个周期 | 按参数量划分阶段 | 让每阶段 FLOPs 相当 |
| 70B FSDP 在 8 GPU 上超过 80GB | 每 GPU 为 105 GB | 用 16 GPU 或激活检查点 |

## 问答
type: qa
from: phases/19-capstone-projects/77-data-parallel-ddp/docs/zh.md, phases/10-llms-from-scratch/05-scaling-distributed/docs/zh.md, phases/19-capstone-projects/79-pipeline-parallel/docs/zh.md, phases/19-capstone-projects/78-zero-parameter-sharding/docs/zh.md, phases/10-llms-from-scratch/19-dualpipe-parallelism/docs/zh.md

- **为什么取均值而不是求和？** 单 rank 调好的学习率可以继续用于四个 rank。
- **混合精度会将内存减半吗？** 不会，约节省 25%。
- **M=8、N=4 时 GPipe 气泡多大？** 27%。M=64、N=4 时为 4.5%。
- **选 GPipe 还是 1F1B？** 气泡相同。1F1B 限制激活内存。
- **ZeRO 为何使用 reduce_scatter？** 每个 rank 只收到自身分片的和。
- **ZeRO-3 与 FSDP 相同吗？** 是，机制相同。
- **少于 1k GPU 时用 DualPipe？** 过度设计。气泡只占成本的一小部分。
