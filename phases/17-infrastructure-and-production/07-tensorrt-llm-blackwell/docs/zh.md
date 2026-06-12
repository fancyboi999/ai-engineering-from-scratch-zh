# Blackwell 上的 TensorRT-LLM，搭配 FP8 与 NVFP4

> TensorRT-LLM 只跑 NVIDIA，但它在 Blackwell 上赢。在带 Dynamo 编排的 GB200 NVL72 上，SemiAnalysis InferenceX 在 2026 年第一、二季度测得一个 120B 模型每百万 token 0.012 美元，对比 H100 + vLLM 的 $0.09/M —— 7 倍的经济差距。这套栈是三种浮点制度的叠加：FP8 对 KV cache 和注意力 kernel 仍然关键，因为它们需要 FP8 那种动态范围；NVFP4（4 比特微缩放）处理权重和激活；多 token 预测（MTP）和分离式 prefill/decode 又在上面叠了 2-3 倍。Day-0 模型支持直接加载 FP4 权重，不用训练后转换。2026 年工程团队的陷阱在于：TRT-LLM 是封闭的 NVIDIA 栈，所以采用它是拿可移植性换吞吐。在押注之前，对你那套模型和硬件的组合算一算账。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 FP8/NVFP4 内存与成本计算器）
**前置要求：** 阶段 17 · 04（vLLM 服务内部机制）、阶段 10 · 13（量化）
**预计时间：** ~75 分钟

## 学习目标

- 解释为什么即使权重是 NVFP4，FP8 对 KV cache 和注意力仍然关键。
- 算出一个前沿模型在 BF16、FP8、NVFP4 下的 HBM 占用，并推理节省从哪来。
- 说出 TRT-LLM 利用的 Blackwell 特有特性（day-0 FP4、MTP、分离式服务、all-to-all 原语）。
- 判断 TRT-LLM 的 NVIDIA 锁定何时值得相对 Hopper 上 vLLM 的 7 倍成本差距。

## 问题背景

2026 年推理经济学的前沿是"每美元多少 token"。答案取决于四个叠加的选择：硬件代际（Hopper H100/H200 vs Blackwell B200/GB200）、精度（BF16 → FP8 → NVFP4）、服务引擎（vLLM vs SGLang vs TRT-LLM）、编排（朴素 vs 分离式 vs Dynamo）。

在 Hopper 上用 vLLM，一个 120B MoE 跑到约每百万 token $0.09。在 Blackwell 上用 TRT-LLM + Dynamo，同一个模型跑到约 $0.012 —— 便宜 7 倍。这差距一部分来自硬件（Blackwell 单 GPU LLM 吞吐是 Hopper 的 11-15 倍）。一部分来自栈：FP4 权重、MTP 草稿、分离式 prefill/decode，以及给 MoE 专家通信用的 NVLink 5 all-to-all。

你没法在 NVIDIA 栈之外复制这个。这就是权衡 —— 拿可移植性换经济性。理解哪些栈的选择贡献了这差距的哪一份，正是这一课的要点。

## 核心概念

### 为什么 FP8 仍是 KV cache 的底线

2026 年一个常见错误：以为 NVFP4 处处适用。它不是。KV cache 需要 FP8（8 比特浮点），因为它存的注意力 key 和 value 跨越很宽的动态范围。把 KV 量化到 FP4 会导致灾难性的精度损失 —— 分布的尾巴掉没了，注意力分数崩塌。FP8 的指数位给了 KV cache 它需要的范围。

NVFP4（2025-2026）用于权重和激活。微缩放：每一 block 权重有自己的缩放因子，于是小 block 能跨越不同动态范围，不必承受按张量缩放的损失。对激活，FP4 顶得住，因为一层内激活的范围小。

典型的 Blackwell 配置：

- 权重：NVFP4（4 比特微缩放）。
- 激活：NVFP4。
- KV cache：FP8。
- 注意力累加器：FP32（softmax 稳定性）。

### TRT-LLM 用的 Blackwell 特有原语

- **Day-0 FP4 权重**：模型提供方直接发 FP4 权重；TRT-LLM 不用训练后转换就能加载。FP4 不需要 AWQ / GPTQ 这一步。
- **多 token 预测（MTP）**：和 EAGLE（阶段 17 · 05）一个思路，但集成进了 TRT-LLM 的 build。
- **分离式服务**：prefill 和 decode 在分开的 GPU 池上，KV cache 经 NVLink 或 InfiniBand 传输。和 Dynamo（阶段 17 · 20）一个思路。
- **all-to-all 通信原语**：NVLink 5 把 MoE 专家通信延迟相比 Hopper 砍了 3 倍。TRT-LLM 的 MoE kernel 为此调优。
- **NVFP4 + MXFP8 微缩放**：Blackwell Tensor Core 上硬件加速的缩放因子处理。

### 你该背下来的数字

- HGX B200 通过 TRT-LLM 在 GPT-OSS-120B 上每百万 token $0.02。
- GB200 NVL72 通过 Dynamo（编排 TRT-LLM）每百万 token $0.012。
- H100 + vLLM 在可比工作负载上 ≈ 每百万 token $0.09。
- TRT-LLM 三个月更新带来 2.8 倍吞吐提升（2026）。
- 单 GPU LLM 吞吐，Blackwell vs Hopper 为 11-15 倍。
- MLPerf Inference v6.0（2026 年 4 月）：Blackwell 在每一个提交的任务上都碾压。

### FP4 实际在质量上的代价

NVFP4 很激进。在推理重的工作负载上（思维链、数学、带长上下文的代码生成），FP4 权重会肉眼可见地退化。按 block 校准能缓解但不能消除。交付推理模型的团队常用 FP8 权重 + FP4 激活作为折中，或者干脆全程留在 H200 + FP8 上。

规律：在押注 NVFP4 权重之前，永远先在你的 eval 集上验证任务质量。

### 为什么这是个 NVIDIA 锁定的决策

TRT-LLM 是 C++ + CUDA + 闭源 kernel。模型需要为特定 GPU SKU 编译。没有 AMD、没有 Intel、没有 ARM。如果你的基础设施策略是多厂商，那 TRT-LLM 对那一档 TRT-LLM 服务来说就不可行 —— 你仍然可以在混合硬件上用 vLLM 服务。如果你只用 NVIDIA，那 7 倍差距就为这份锁定买单。

### 2026 年实战配方

对一年 1 亿美元以上的推理账单，跑在 Hopper + vLLM 上等于把 7-10 倍留在桌上。把成本主导的工作负载迁到 Blackwell + TRT-LLM + Dynamo。为模型迭代速度，把实验档留在 H100 + vLLM。在每个 NVFP4 转换过的模型上线前验证质量。

### 分离式的加成

TRT-LLM 的分离式服务（分开的 prefill 和 decode 池）在阶段 17 · 20 里深入讲。在 Blackwell 上，乘数叠加：FP4 权重 × MTP 加速 × 分离式放置 × 缓存感知路由。那个 7 倍数字假设的就是这整套栈。

```figure
pipeline-parallel
```

## 实际使用

`code/main.py` 跨三套栈为一个模型算 HBM 占用、decode 吞吐（内存受限制度）和 $/M-token：H100 + BF16 + vLLM、H100 + FP8 + vLLM、B200 + NVFP4/FP8 + TRT-LLM。跑一下，看看叠加效应，以及每项改动贡献了差距的多少份。

## 拿去用

这一课产出 `outputs/skill-trtllm-blackwell-advisor.md`。给定一个工作负载、模型规模和年 token 量，它判断 Blackwell + TRT-LLM 这套栈是否值得 NVIDIA 锁定。

## 练习

1. 跑 `code/main.py`。对一个 30% 激活参数的 120B MoE，算出 H100 BF16、H100 FP8、B200 NVFP4/FP8 上受内存带宽限制的 decode 吞吐。最大的跳跃来自哪？
2. 一个客户每年在 H100 + vLLM 上花 200 万美元。给定 7 倍经济差距，他们要买多少块 Blackwell GPU 才能在 12 个月内摊平迁到 TRT-LLM 的成本，这个盈亏平衡数是多少？
3. 你看到 NVFP4 权重转换后 MATH 上精度掉了 3 个点。说出两条恢复路径：一条质量优先（保留 FP8 权重），一条成本优先（用领域内数据校准）。
4. 读 MLPerf v6.0 推理结果。哪个任务的 Blackwell 对 Hopper 的差距最小，为什么？
5. 算一算一个 405B 模型在 NVFP4 权重 + FP8 KV cache、128k 上下文下需要的 HBM。它装得进单个 GB200 NVL72 节点吗？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| FP8 | "八位浮点" | 8 比特浮点；因动态范围用于 KV cache 和注意力 |
| NVFP4 | "四位微" | NVIDIA 的 4 比特微缩放 FP 格式；Blackwell 上用于权重和激活 |
| MXFP8 | "MX 八" | 微缩放 FP8 变体；Blackwell Tensor Core 上硬件加速 |
| Day-0 FP4 | "直接发 FP4 权重" | 模型提供方发布的权重已是 FP4；无训练后转换步骤 |
| MTP | "多 token 预测" | TRT-LLM 集成的 speculative decoding 草稿（阶段 17 · 05） |
| 分离式服务 | "拆开 prefill/decode" | prefill 和 decode 在分开的 GPU 池；KV 经 NVLink/IB 传输 |
| all-to-all | "MoE 专家通信" | 把 token 路由到专家 GPU 的通信模式；NVLink 5 砍 3 倍 |
| InferenceX | "SemiAnalysis 推理基准" | 2026 年业界公认的每 token 成本基准 |

## 延伸阅读

- [NVIDIA — Blackwell Ultra MLPerf Inference v6.0](https://developer.nvidia.com/blog/nvidia-blackwell-ultra-sets-new-inference-records-in-mlperf-debut/) —— 2026 年 4 月 MLPerf 结果。
- [NVIDIA — MoE Inference on Blackwell](https://developer.nvidia.com/blog/delivering-massive-performance-leaps-for-mixture-of-experts-inference-on-nvidia-blackwell/) —— NVLink 5 all-to-all 与 MoE kernel。
- [TensorRT-LLM Overview](https://nvidia.github.io/TensorRT-LLM/overview.html) —— 官方引擎文档。
- [NVIDIA — Introducing Dynamo](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models/) —— TRT-LLM 之上的分离式编排。
- [MLPerf Inference](https://mlcommons.org/benchmarks/inference-datacenter/) —— 发布 Blackwell 数字的基准套件。
