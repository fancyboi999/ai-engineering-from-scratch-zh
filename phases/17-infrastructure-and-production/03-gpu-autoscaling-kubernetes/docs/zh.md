# Kubernetes 上的 GPU 自动扩缩 —— Karpenter、KAI Scheduler、Gang Scheduling

> 是三层，不是一层。Karpenter 动态供给节点（不到一分钟，比 Cluster Autoscaler 快 40%）。KAI Scheduler 处理 gang scheduling、拓扑感知和分层队列 —— 它防住"八缺一"的部分分配陷阱：七个节点干等着、烧着钱，就因为缺一块 GPU。应用层自动扩缩器（NVIDIA Dynamo Planner、llm-d Workload Variant Autoscaler）按推理特有的信号扩缩 —— 队列深度、KV cache 利用率 —— 而不是按 CPU/DCGM 占空比。经典的 HPA 陷阱在于 `DCGM_FI_DEV_GPU_UTIL` 是一个占空比测量：100% 可能是 10 个请求，也可能是 100 个。vLLM 预分配 KV cache 内存，所以内存永远不会触发缩容。这一课教你把三层组合起来，并避开 Karpenter 默认的 `WhenEmptyOrUnderutilized` 策略 —— 它会在推理进行到一半时干掉正在跑的 GPU 任务。

**类型：** Learn
**语言：** Python（标准库，一个玩具级的队列深度自动扩缩模拟器）
**前置要求：** 阶段 17 · 02（推理平台经济学）、阶段 17 · 04（vLLM 服务内部机制）
**预计时间：** ~75 分钟

## 学习目标

- 画出三个自动扩缩层（节点供给、gang scheduling、应用层），并说出每一层用的工具。
- 解释为什么 `DCGM_FI_DEV_GPU_UTIL` 对 vLLM 是错误的 HPA 信号，并说出两个替代信号（队列深度、KV cache 利用率）。
- 描述 gang scheduling，以及 KAI Scheduler 防住的那种部分分配故障模式（8 块 GPU 里 7 块闲着）。
- 说出会干掉正在跑的 GPU 任务的那条 Karpenter consolidation 策略（`WhenEmptyOrUnderutilized`），并给出 2026 年安全的替代方案。

## 问题背景

你的团队在 Kubernetes 上交付一个 LLM 服务。你用 `DCGM_FI_DEV_GPU_UTIL` 作为信号配了 HPA。服务在工作时间钉死在 100% 利用率。HPA 从不扩容 —— 它已经认为你满了。你手动加了一个副本；TTFT 降了。HPA 仍然不扩。信号在骗你。

另一边，你的节点用的是 Cluster Autoscaler。凌晨 2 点来了一个 1M token 的 prompt；集群花 3 分钟供给一个节点，请求超时了。

再另一边，你部署一个 70B 模型，要跨 2 个节点用 8 块 GPU。集群空着 7 块 GPU，第 8 块散在 3 个节点上。Cluster Autoscaler 为那缺的 1 块 GPU 供给一个节点。七个节点干等 4 分钟、烧着钱，等 Kubernetes 把最后一块 GPU 拉起来。

三层，三种不同的故障模式。2026 年的 GPU 感知自动扩缩不是"打开 HPA"。它是把节点供给、gang scheduling 和应用信号扩缩组合起来。

## 核心概念

### 第 1 层 —— 节点供给（Karpenter）

Karpenter 盯着 pending 的 pod，在约 45-60 秒内供给节点（GPU 节点上 Cluster Autoscaler 通常要 90-120 秒）。它按 `NodePool` 约束动态挑实例类型 —— 如果你的 pod 要 8 块 H100、集群里又没有匹配的节点，Karpenter 会直接供给一个，而不是扩一个已有的组。

**consolidation 陷阱**：Karpenter 默认的 `consolidationPolicy: WhenEmptyOrUnderutilized` 对 GPU 池很危险。它会干掉一个正在跑的 GPU 节点，把 pod 迁到更便宜、尺寸更合适的实例上。对推理工作负载，这意味着驱逐正在跑的请求、在新节点上重新加载一个 70B 模型。损失是几分钟的算力外加请求失败。

GPU 池的安全设置：

```yaml
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 1h
```

让 Karpenter 在一小时后整理真正空着的节点，但永不驱逐正在跑的任务。

### 第 2 层 —— gang scheduling（KAI Scheduler）

KAI Scheduler（项目原名"Karp"后改名）处理默认 kube-scheduler 做不到的事：

**Gang scheduling** —— 全有或全无地调度。一个要 8 块 GPU 的分布式推理 pod，要么 8 块一起启动，要么一块都不启。没有它，你就掉进部分分配陷阱：8 个 pod 起了 7 个，无限期等待，烧钱。

**拓扑感知** —— 知道哪些 GPU 共享 NVLink、哪些在同一个机架、哪些之间有 InfiniBand。据此放置 pod。一个 DeepSeek-V3 67B 的张量并行工作负载必须留在一个 NVLink 域里；KAI Scheduler 会尊重这一点。

**分层队列** —— 多个团队带着优先级和配额抢同一个 GPU 池。只有优先级规则允许时，团队 A 的生产高峰才会被团队 B 的训练任务抢占。

KAI 作为次级调度器和 kube-scheduler 一起部署；你给工作负载打 annotation 让它走 KAI。Ray 和 vLLM production-stack 都集成了它。

### 第 3 层 —— 应用层信号

**HPA 陷阱**：`DCGM_FI_DEV_GPU_UTIL` 是一个占空比指标 —— 它测的是 GPU 在每个采样间隔里有没有在干活。100% 利用率可能是 10 个并发请求，也可能是 100 个；反正 GPU 都在忙。按占空比扩缩就是瞎扩缩。

更糟的是，vLLM 和类似引擎预分配 KV cache 内存（最高到 `--gpu-memory-utilization`）。哪怕只有一个请求，内存使用率也维持在 90% 上下。基于内存的 HPA 永远不会缩容。

**2026 年的替代信号**：

- 队列深度（等待 prefill 的请求数）。
- KV cache 利用率（多少比例的 block 分配给了活跃序列）。
- 每副本 P99 TTFT（你的 SLA 信号）。
- Goodput（每秒满足所有 SLO 的请求数）。

NVIDIA Dynamo Planner 和 llm-d Workload Variant Autoscaler 消费这些信号来扩缩副本。对 LLM 服务，它们完全取代 HPA。

### 什么时候用什么

| 扩缩决策 | 工具 |
|----------------|------|
| 增/删节点 | Karpenter |
| 调度多 GPU 任务 | KAI Scheduler |
| 增/删副本 | Dynamo Planner / llm-d WVA（或基于队列深度的自定义 HPA） |
| 选 GPU 类型 | Karpenter NodePool |
| 抢占低优先级 | KAI Scheduler 队列 |

### 分离式 prefill/decode 让一切更复杂

如果你跑分离式 prefill/decode（阶段 17 · 17），你就有两类 pod，扩缩触发器不同：prefill pod 按队列深度扩缩，decode pod 按 KV cache 压力扩缩。llm-d 把它们暴露成各自独立的 `Services`，按角色分别配 HPA。别想着在两者前面摆一个 HPA。

### 冷启动在这里也很重要

冷启动缓解（阶段 17 · 10）正是节点供给时间变得对用户可见的地方。Karpenter 的 45-60 秒预热，加上 20GB 模型加载，加上引擎初始化，意味着一个从零开始的请求要花 2-5 分钟。给 SLO 关键路径留一个 warm pool（`min_workers=1`），或者在应用层用 Modal 式的 checkpoint。

### 你该记住的数字

- Karpenter 节点供给：约 45-60 秒 vs Cluster Autoscaler 约 90-120 秒（GPU 节点）。
- KAI Scheduler 防住部分分配的浪费 —— 八缺一陷阱。
- `DCGM_FI_DEV_GPU_UTIL` 作为 HPA 信号：坏的；用队列深度或 KV 利用率。
- Karpenter 的 `WhenEmptyOrUnderutilized`：会干掉正在跑的 GPU 任务。推理用 `WhenEmpty + consolidateAfter: 1h`。

```figure
autoscaling
```

## 实际使用

`code/main.py` 在一个突发型 GPU 工作负载上模拟一个三层自动扩缩器。对比朴素 HPA（占空比）、队列深度 HPA 和 KAI gang 调度的扩缩。报告未满足的请求、GPU 空闲分钟数和一个综合得分。

## 拿去用

这一课产出 `outputs/skill-gpu-autoscaler-plan.md`。给定集群拓扑、工作负载形态和 SLO，它设计一套三层自动扩缩方案。

## 练习

1. 跑 `code/main.py`。在突发型工作负载下，朴素的占空比 HPA 丢掉了多少个队列深度 HPA 能接住的请求？差异从哪来？
2. 为一个在 H100 SXM5 上服务 Llama 3.3 70B FP8 的集群设计一个 Karpenter NodePool。指定 `capacity-type`、`disruption.consolidationPolicy`、`consolidateAfter`，以及一个把非 GPU 工作负载挡在这些节点之外的 taint。
3. 你的团队报告说部署卡在 Pending，理由是"有空闲 GPU 但 pod 不调度"。诊断 —— 这是 Karpenter、kube-scheduler 还是 KAI Scheduler 的问题？哪些指标能证实？
4. 给分离式 prefill pod 挑一个扩缩信号，给 decode pod 挑另一个。两个都给出理由。
5. 算一算 `WhenEmptyOrUnderutilized` consolidation 陷阱在一个 7×24 生产服务上的代价 —— 该服务平均每天发生 60 次"丢请求"事件，P99 TTFT > 10 秒。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Karpenter | "供给节点的那个" | Kubernetes 节点自动扩缩器；亚分钟级供给 |
| Cluster Autoscaler | "老的扩缩器" | Kubernetes 节点自动扩缩器的前身；更慢、基于组 |
| KAI Scheduler | "GPU 调度器" | 处理 gang + 拓扑 + 队列的次级调度器 |
| Gang scheduling | "全有或全无" | 原子地调度 N 个 pod，否则全部推迟 |
| 拓扑感知 | "机架感知" | 按 NVLink/IB/机架位置放置 pod |
| `DCGM_FI_DEV_GPU_UTIL` | "GPU 利用率" | 占空比指标；对 LLM 不是扩缩信号 |
| 队列深度 | "等待中的请求" | prefill 受限扩缩的正确 HPA 信号 |
| KV cache 利用率 | "内存压力" | decode 受限扩缩的正确 HPA 信号 |
| Consolidation | "Karpenter 整理" | 把节点干掉换更便宜的实例类型 |
| `WhenEmpty + 1h` | "安全整理" | 不驱逐正在跑的 GPU 任务的策略 |

## 延伸阅读

- [KAI Scheduler GitHub](https://github.com/kai-scheduler/KAI-Scheduler) —— 设计文档和配置示例。
- [Karpenter Disruption Controls](https://karpenter.sh/docs/concepts/disruption/) —— consolidation 策略语义与 GPU 安全默认值。
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/) —— Dynamo Planner 扩缩信号。
- [Ray docs — KAI Scheduler for RayClusters](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/kai-scheduler.html) —— Ray 集成模式。
- [AWS EKS Compute and Autoscaling Best Practices](https://docs.aws.amazon.com/eks/latest/best-practices/aiml-compute.html) —— 托管 Kubernetes 专属指南。
- [llm-d GitHub](https://github.com/llm-d/llm-d) —— Workload Variant Autoscaler 设计。
