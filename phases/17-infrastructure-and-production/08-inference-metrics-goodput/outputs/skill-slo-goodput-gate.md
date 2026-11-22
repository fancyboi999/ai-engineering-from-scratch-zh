---
name: slo-goodput-gate
description: 产出一份可直接放进 CI/CD 的 benchmark 方案，用 goodput 而非吞吐作为 LLM 部署门禁，报告 P50/P90/P99 分位数并写明工具选择。
version: 1.0.0
phase: 17
lesson: 08
tags: [inference-metrics, goodput, ttft, tpot, itl, slo, benchmarking]
---

给定负载（模型、硬件、目标并发、面向用户的交互类型：流式聊天 / 单次调用 / 语音 / agent），为 CI/CD 产出基于 goodput 的 SLO 门禁。

输出以下内容：

1. SLO 规格。三个阈值：TTFT P99 上限、TPOT P99 上限、E2E P99 上限。根据交互类型选出站得住的数值（流式聊天：TTFT 500 ms、TPOT 25 ms、E2E 3 s；语音：TTFT 300 ms，更严；agent：E2E 5 s，更松）。
2. benchmark 方案。工具选择（LLMPerf 或 GenAI-Perf，写明选哪个以及原因）。prompt 分布（输入和输出 token 的均值 + 标准差）。并发扫描（目标值的 25%、50%、100%、150%）。
3. goodput 计算。公式：同时满足三项约束的请求占比。生产环境目标 >= 99%，金丝雀 >= 95%。
4. 分位数报告。每个指标都报告 P50、P90、P99（绝不只报均值）。均值只作为合理性检查附注。
5. 工具陷阱说明。写明工具计算 ITL 时是否包含 TTFT。跨团队比较前先统一定义。
6. 门禁逻辑。在目标并发下 goodput >= 目标值，CI 才通过。如果从 100% 到 150% 并发 goodput 下降超过 5 个百分点，标出来，这说明负载测试缺少余量。

直接否决：
- 只用吞吐做门禁。拒绝，并要求用 goodput。
- 只报均值不报 P99。拒绝。
- 不写工具名称和版本。拒绝。
- 只在目标并发下跑 benchmark；必须做并发扫描。

拒绝规则：
- 如果用户没有成文的 SLO，拒绝，先根据交互类型写一份。
- 如果 prompt 分布是"循环发送相同 prompt"，拒绝。这是 prompt 单一化陷阱。要求使用贴近真实的合成数据。
- 如果 benchmark 少于 30 轮，或每轮少于 100 个请求，以统计量不足为由拒绝。

输出：一页 SLO 门禁规格，列出阈值、benchmark 方案、工具选择、分位数报告模板和 CI 通过/失败规则。最后用一段"接下来测什么"，根据已知弱点，从 goodput-并发曲线、prompt 分布敏感度或 chunked prefill 开关的尾延迟对比中选一个。
