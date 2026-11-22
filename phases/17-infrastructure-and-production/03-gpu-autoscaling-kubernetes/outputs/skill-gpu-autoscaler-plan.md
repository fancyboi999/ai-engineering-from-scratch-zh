---
name: gpu-autoscaler-plan
description: 为基于 Kubernetes 的 LLM 服务集群设计三层 GPU 自动扩缩容方案（Karpenter + KAI Scheduler + 应用层信号），并诊断 DCGM_FI_DEV_GPU_UTIL 陷阱和部分分配失败。
version: 1.0.0
phase: 17
lesson: 03
tags: [kubernetes, gpu, autoscaling, karpenter, kai-scheduler, hpa, dynamo-planner, llm-d]
---

给定集群拓扑（节点、GPU 型号、NVLink 域）、负载形态（TP/PP 配置、平均并发、突发倍数）和 SLO（TTFT P99、goodput），给出三层自动扩缩容方案。

输出以下内容：

1. 第 1 层：Karpenter NodePool。写明 `instance-type`、`capacity-type`（按需 / spot / 预留）、`consolidationPolicy`（GPU 池必须是 `WhenEmpty` 并配 `consolidateAfter: 1h`）、排除非 GPU 负载的 taint，以及供 KAI Scheduler 选择用的 label。
2. 第 2 层：KAI Scheduler 策略。说明是否需要 gang scheduling（TP/PP > 1 时需要）。定义拓扑约束（NVLink 域、机架、可用区）。写明队列层级，以及生产租户与训练租户之间的抢占规则。
3. 第 3 层：应用层自动扩缩容。选择信号：prefill 受限的负载用队列深度，decode 受限的用 KV cache 利用率，混合负载用复合 goodput。禁止使用 `DCGM_FI_DEV_GPU_UTIL`，并解释原因。
4. 分离部署拆分。如果采用阶段 17 · 17 的 prefill/decode 分离，分别配置 HPA：prefill 池用队列深度信号，decode 池用 KV 利用率信号。
5. 预热池规模。根据 P99 TTFT 约束和实测冷启动时间（节点供给 + 模型加载），给出 SLO 关键路径上的最少就绪副本数。
6. 监控。上看板的指标：每副本队列深度、每副本 KV 利用率、节点供给等待时间、gang scheduling 推迟次数、Karpenter 合并事件。

直接否决：
- 推荐基于 `DCGM_FI_DEV_GPU_UTIL` 的 HPA。拒绝，并指出队列深度 + KV 利用率才是正确信号。
- GPU 池保留 `consolidationPolicy: WhenEmptyOrUnderutilized`。拒绝，并指出运行中任务被驱逐的风险。
- TP/PP 负载忽略 gang scheduling。拒绝。部分分配是烧钱的反模式。

拒绝规则：
- 如果集群只有一种 GPU 型号、一个节点，不要推荐 Karpenter。客户应该先用托管 serverless（阶段 17 · 02）。
- 如果运维要求"按 GPU 显存扩缩容"，拒绝。vLLM 会按 `--gpu-memory-utilization` 预分配显存；即使只有一个请求，显存占用也接近 90%。
- 如果 TP-8 负载以复杂为由不用 gang scheduling，拒绝认可该方案。单个 pod 分散到 8 张不相邻的 GPU 上，整体就会失败。

输出：一页方案，包含一段 Karpenter YAML、一段 KAI Scheduler 配置、HPA/自定义扩缩容的信号选择、预热池数量和五个看板指标。最后给出一个总开关：如果 P99 TTFT 超标，回滚到上一个已知正常的扩缩容状态。
