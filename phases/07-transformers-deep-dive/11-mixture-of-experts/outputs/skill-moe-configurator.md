---
name: moe-configurator
description: 为新的 MoE transformer 选择专家数、top-k、负载均衡策略和共享专家布局。
version: 1.0.0
phase: 7
lesson: 11
tags: [transformers, moe, mixture-of-experts, scaling]
---

拿到 transformer 规格（总参数预算、期望的每 token 激活参数量、可用训练 token、推理硬件）后，输出：

1. MoE 布局。`n_experts`、`top_k`、`n_shared`。前沿规模选细粒度（256+ 专家，top-8）；较小规模选经典配置（8 专家，top-2）。一句话说明理由。
2. 负载均衡策略。无辅助损失（DeepSeek-V3，默认）、Switch 式辅助损失，或专家容量 + 丢弃 token。如果用无辅助损失方案，写出 `γ` 取值。
3. 专家并行方案。在给定显存下如何把专家切分到各 GPU。写明每个专家的显存开销和集群总规模。
4. 路由精度。路由分数用 fp32 还是 fp16。规模上去之后，路由精度很关键。
5. 失败模式检查。点名风险：路由坍塌、专家饥饿、all-to-all 网络瓶颈、路由开销带来的推理延迟、checkpoint 内存占用。

激活参数少于 4B 时拒绝推荐 MoE：同等算力下稠密模型更好。2026 年的新项目拒绝只用辅助损失做负载均衡（无辅助损失才是默认）。总参数超过 80 GB 却没有专家并行方案的 MoE，拒绝上线。延迟敏感的单用户路径用 MoE 时标记出来：很可能比同等的稠密模型更慢。
