# Serverless LLM 的冷启动缓解

> 一个 20 GB 的模型镜像从冷到能服务要花 5-10 分钟（7B）到 20+ 分钟（70B）。在一个真正的 serverless 世界里，那不是预热 —— 那是一次宕机。缓解手段在五层运作：预播种节点镜像（AWS 上的 Bottlerocket、双卷架构）、模型流式加载（NVIDIA Run:ai Model Streamer，vLLM 里原生）、GPU 内存快照（Modal checkpoint，重启最多快 10 倍）、warm pool（`min_workers=1`）、分层加载（ServerlessLLM 的 NVMe→DRAM→HBM 流水线，延迟降 10-200 倍），以及搬运输入 token（KB 级）而非 KV cache（GB 级）的 live migration。Modal 公布 2-4 秒冷启动作为下限；Baseten 默认 5-10 秒，预热后亚秒级。这一课教你测量、预算并叠加这五层。

**类型：** Learn
**语言：** Python（标准库，一个玩具级冷启动路径模拟器）
**前置要求：** 阶段 17 · 02（推理平台经济学）、阶段 17 · 03（GPU 自动扩缩）
**预计时间：** ~60 分钟

## 学习目标

- 列举冷启动缓解的五层，并为每层说出一个工具或模式。
- 把一个 70B 模型的总冷启动时间算成 (节点供给) + (权重下载) + (权重加载进 HBM) + (引擎初始化) 之和。
- 解释为什么 live migration 搬运的是输入 token（KB）而不是 KV cache（GB），以及代价是什么（重算）。
- 说出 warm pool 的权衡（为闲置 GPU 付费 vs 接受冷启动尾部），以及 `min_workers > 0` 变成强制项的 SLA 门槛。

## 问题背景

你的 serverless LLM 端点夜里缩到零。早上 8 点流量飙升。第一个请求要等以下这些：

1. Karpenter 供给一个 GPU 节点：45-60 秒。
2. 容器拉取一个 30 GB 带权重的镜像：120-300 秒。
3. 引擎把权重加载进 HBM：取决于模型规模和存储速度，45-120 秒。
4. vLLM 或 TRT-LLM 初始化 CUDA graph、KV cache 池、分词器：10-30 秒。

合计：220-510 秒（大致 3-8 分钟）才回来一个 token。你的 SLA 是 2 秒。你上了一个 warm pool（`min_workers=1`），问题看起来消失了 —— 但现在你 7×24 为一块闲置 GPU 付费。如果你的服务有 5 个产品、各一个 warm 副本，那就是 5 × 24 × 30 = 3,600 GPU 小时/月，无论有没有一个用户调用过。

冷启动缓解就是在保住 serverless 经济性的同时，逼近常开的延迟。

## 核心概念

### 第 1 层 —— 预播种节点镜像（Bottlerocket）

在 AWS 上，Bottlerocket 的双卷架构把操作系统和数据分开。给数据卷做快照、把容器镜像预拉好；在你的 `EC2NodeClass` 里引用快照 ID。新节点开机时权重已经在本地 NVMe 上 —— 第 2 步和第 3 步的一部分消失了。原生配合 Karpenter。典型节省：大模型每次冷启动 2-4 分钟。

GCP 上的对应物：预烘焙容器层的自定义 VM 镜像。Azure 上：用同样模式的托管磁盘快照。

### 第 2 层 —— 模型流式加载（Run:ai Model Streamer）

不在回答第一个请求前加载完整文件，而是把权重逐层流进 GPU 内存，第一个 transformer block 一常驻就开始处理。NVIDIA Run:ai Model Streamer 在 vLLM 2026 里原生发布。配合 S3、GCS 和本地 NVMe。通过把 I/O 与计算设置重叠，把大模型的权重加载时间大致砍半。

### 第 3 层 —— GPU 内存快照（Modal）

Modal 在首次加载后对 GPU 状态（权重、CUDA graph、KV cache 区域）做一个 checkpoint。后续重启直接反序列化进 HBM —— 比重新初始化快 10 倍。这是最接近"2 秒启动一块热 GPU"的东西。权衡：快照是按 GPU 拓扑的，所以如果 Karpenter 把你迁到另一个 SKU，你得重做 checkpoint。

### 第 4 层 —— warm pool（min_workers=1）

最简单的缓解：永远留一个副本就绪。成本是一块 GPU 7×24 的小时费率。对小模型这笔账很残酷（你付 $0.85-$1.50/小时来避免 30 秒冷启动），对大模型很友好（付 $4/小时来避免 5 分钟冷启动）。warm pool 变强制的 SLA 门槛：通常是 70B+ 模型上 TTFT P99 < 60 秒。

### 第 5 层 —— 分层加载（ServerlessLLM）

ServerlessLLM 把存储当成一个层级：NVMe（快但大）、DRAM（中但分层）、HBM（小但即时）。权重预加载到 DRAM；按需加载进 HBM。论文报告冷加载相比朴素的磁盘到 HBM 延迟降 10-200 倍。生产采用尚早，但与 vLLM 的集成已存在。

### 第 6 层 —— live migration（加分模式）

当一个节点变得不可用时（spot 驱逐、节点排空），传统模式是冷启动另一个副本、排空请求队列。Live migration 把输入 token（千字节）搬到一个已加载模型的目标，在目标上重算 KV cache。重算比在网络上传输几 GB 的 KV cache 更便宜。适用于分离式部署。

### warm pool 的账

对一个 P99 TTFT SLA 为 2 秒的服务，问题不是"要不要 warm pool"，而是"多少 warm 副本，哪些路径配它"。

- 高价值交互路径（实时聊天、语音 agent）：`min_workers=1-2`。
- 后台批处理路径（夜间分类）：接受缩到零，5-10 分钟冷启动可忍。
- 高级档：每租户配 `min_workers`，专属算力。

### 先测量再优化

一个 70B 模型在全新节点上的冷启动解剖（示意）：

| 阶段 | 时间 | 缓解 |
|-------|------|-----------|
| 节点供给 | 50s | Bottlerocket + 预播种镜像、warm pool |
| 镜像拉取 | 180s | 预播种数据卷（消除） |
| 权重到 HBM | 75s | 模型流式加载（砍半）；GPU 快照（消除） |
| 引擎初始化 | 20s | 持久化 CUDA graph 缓存 |
| 第一次 forward | 3s | 最小固有延迟 |
| **冷启动合计** | **328s** | |
| **带缓解合计** | **~15s** | 降 22 倍 |

### 你该记住的数字

- Modal 冷启动：2-4 秒（带 GPU 快照）。
- Baseten 默认冷启动：5-10 秒；预热后亚秒级。
- 裸 70B 冷启动：3-8 分钟。
- Run:ai Model Streamer：约 2 倍权重加载提速。
- ServerlessLLM 分层加载：延迟降 10-200 倍（论文数字）。

```figure
cold-start-pipeline
```

## 实际使用

`code/main.py` 对带和不带每种缓解的冷启动路径建模。报告总冷启动时间、warm pool 成本，以及 warm pool 开始划算的盈亏平衡请求速率。

## 拿去用

这一课产出 `outputs/skill-cold-start-planner.md`。给定 SLA、模型规模和流量形态，挑出该叠哪些缓解。

## 练习

1. 跑 `code/main.py`。算出那个盈亏平衡请求速率 —— 高于它时，一个 warm 副本比通过在 SLO 上多丢请求来交"冷启动税"更便宜。
2. 你部署一个 13B 模型，P99 TTFT SLA 为 3 秒。挑出能达成它的最小缓解栈（层数最少）。
3. Bottlerocket 预播种消除了镜像拉取，但权重仍要从快照加载到 HBM。如果快照支撑的 NVMe 以 7 GB/s 读取，算一个 70B 模型的墙钟时间。
4. 你的 serverless 供应商提供 GPU 快照（Modal），你的团队拒绝，理由是"快照会泄露 PII"。两边都论证一下 —— 现实风险是什么，缓解是什么（临时快照、加密、命名空间隔离）？
5. 设计一个分层 warm pool 策略：付费用户、试用用户、批处理工作负载各配多少 warm 副本？给出算账。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 冷启动 | "那个大停顿" | 在一个全新副本上从请求到首 token 的时间 |
| Warm pool | "常开下限" | `min_workers >= 1`，至少留一个副本就绪 |
| 预播种镜像 | "烘焙好的 AMI" | 容器权重已常驻的节点镜像 |
| Bottlerocket | "AWS 节点 OS" | AWS 容器优化操作系统，支持双卷快照 |
| 模型流式加载 | "流式加载" | 把权重 I/O 与计算设置重叠 |
| GPU 快照 | "checkpoint 到 HBM" | 序列化加载后的 GPU 状态；重启时反序列化 |
| 分层加载 | "NVMe + DRAM + HBM" | 存储层级；按需加载 |
| Live migration | "搬运 token" | 传输输入（KB），在目标上重算 KV |
| `min_workers` | "warm 副本" | serverless 最小保活数 |
| 缩到零 | "完全 serverless" | 闲置时无成本；接受全额冷启动税 |

## 延伸阅读

- [Modal — Cold start performance](https://modal.com/docs/guide/cold-start) —— Modal 公布的基准与 checkpoint 架构。
- [AWS Bottlerocket](https://github.com/bottlerocket-os/bottlerocket) —— 预播种数据卷快照模式。
- [NVIDIA Run:ai Model Streamer](https://github.com/run-ai/runai-model-streamer) —— 把权重加载与计算设置重叠。
- [Baseten — Cold-start mitigation](https://www.baseten.co/blog/cold-start-mitigation/) —— 预热操作手册。
- [ServerlessLLM paper (USENIX OSDI'24)](https://www.usenix.org/conference/osdi24/presentation/fu) —— 分层加载设计。
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/) —— 分离式部署的 live migration。
