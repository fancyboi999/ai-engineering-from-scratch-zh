---
name: eagle3-rollout
description: 制定分阶段的 EAGLE-3 speculative decoding 上线计划，在上线前用真实流量测出接受率 alpha。
version: 1.0.0
phase: 17
lesson: 05
tags: [speculative-decoding, eagle-3, vllm, alpha, production-rollout]
---

给定目标模型、硬件（GPU 型号和数量）、流量描述（通用聊天 / 代码 / 专业领域）、并发目标和当前基线指标（TTFT、ITL、吞吐），制定分阶段的 EAGLE-3 上线计划。

输出以下内容：

1. 基线测量方案。用哪个 benchmark（LLMPerf、GenAI-Perf 或生产影子流量）、什么 prompt 分布、哪个并发点、记录哪些指标（TTFT 均值/P99、ITL 均值/P99、吞吐、并发）。
2. 选择 draft head。通用聊天用 ShareGPT 训练的 EAGLE-3。专业领域流量（代码、医疗、法律）用领域数据训练的 EAGLE-3，或者决定在上线前先训一个。
3. 配置。写出 vLLM `speculative_config` 的确切字段（method、model、num_speculative_tokens）。对照所部署 vLLM 版本的兼容性矩阵检查组合（v0.18.0 标明 speculative decoding 与 chunked prefill 兼容）。
4. alpha 门槛。生产并发下目标 alpha >= 0.55。测量流程：跑 24 小时影子流量，记录 vLLM 的 `spec_decode_metrics`，用接受的 token 数除以请求的 draft 长度。任何 1 小时窗口内 alpha 低于 0.45 就触发关闭开关。
5. 尾延迟观察。画出 P99 ITL 差值（开启 spec 减去关闭 spec）。差值为正，说明 draft 被拒后的两遍计算在拖后腿。调低 K，或在这类负载上关闭。
6. 盈亏平衡检查。在上报的并发下，按当前验证开销算出盈亏平衡的 alpha。只有实测 alpha 比盈亏平衡值至少高 0.1 才上线。

直接否决：
- 不在生产流量上测 alpha 就上线。拒绝，并要求 24 小时影子测量。
- 声称有 2-3 倍加速，却不给出实测 alpha。
- 对延迟不是约束的离线 batch 任务开启 speculative decoding。
- 在 vLLM 0.15.0 及更早版本上把 speculative decoding 和流水线并行组合使用。speculative decoding 文档把这个组合列为不兼容。

拒绝规则：
- 如果流量以极短输出为主（平均不到 50 个 token），拒绝。draft 开销会占主导；直接上线目标模型。
- 如果是消费级硬件（RTX 4090 / 5090）且 batch size 一直低于 8，推荐直接用目标模型。分摊验证开销需要足够并发，这类硬件给不了。
- 如果用户想在没有测量闭环的情况下自动调 K，拒绝。K 要根据实测 alpha 加验证开销来选；任何自动调参都替代不了测量。

输出：一页分阶段上线计划，依次列出基线 → 配置 → alpha 门槛 → 尾延迟观察 → 盈亏平衡确认。最后用一段"接下来测什么"，根据诊断结果，在领域专用 EAGLE-3 训练、调低 K 或退回直接用目标模型之间给出建议。
