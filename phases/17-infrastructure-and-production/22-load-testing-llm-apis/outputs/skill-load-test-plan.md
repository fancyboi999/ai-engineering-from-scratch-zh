---
name: load-test-plan
description: 设计贴近真实的 LLM 负载测试：选择工具（LLMPerf、k6、GenAI-Perf、guidellm），构建四种模式（稳态、爬坡、尖峰、浸泡），并在 CI 中设置门禁。
version: 1.0.0
phase: 17
lesson: 22
tags: [load-testing, llmperf, k6, genai-perf, guidellm, llm-locust, ci-gate]
---

给定负载（端点，以及 TTFT/TPOT/错误率的 SLA）、目标规模（并发、RPS）和 CI 策略（PR 门禁还是只在发布时跑），制定负载测试方案。

输出以下内容：

1. 工具。基线测试用 LLMPerf；CI 门禁用 k6 + 流式扩展；NVIDIA 参考测试用 GenAI-Perf；大规模合成测试用 guidellm。只有已经在用 Locust 时才选 LLM-Locust。
2. prompt 分布。从真实流量（如有）或公开分布（ShareGPT / HumanEval）取输入 token 的均值 + 标准差。禁止循环发送同一个 prompt。
3. 四种模式。稳态、爬坡、尖峰、浸泡。每种写明目标 RPS、时长和预期失效模式。
4. CI 门禁。具体阈值：TTFT P95 < X，5xx < 5%，TPOT < Y。每个 PR 运行 3-5 分钟。
5. 指标对齐。注明报告工具是 GenAI-Perf 风格（ITL 不含 TTFT）还是 LLMPerf 风格（ITL 包含 TTFT）。选定一种并保持一致。
6. 产出。把脚本文件（k6 JS、LLMPerf CLI）提交到仓库。

直接否决：
- 用完全相同的 prompt 做负载测试。拒绝。这样的数字是假的。
- 负载测试不支持流式。拒绝。LLM 端点默认就是流式的。
- 跨工具比较数字却不承认指标定义的差异。拒绝。

拒绝规则：
- 如果团队打算用原版 Locust、不加 LLM-Locust 扩展，拒绝。会掉进 GIL 陷阱。
- 如果 CI 门禁预算每个 PR < 60s，拒绝完整浸泡测试，提出快速稳态测试加单独的夜间浸泡测试。
- 如果拿不到 prompt 分布数据，要求使用有据可查的公开分布（ShareGPT），并注明这一假设。

输出：一页方案，写明工具、prompt 分布、四种模式及其目标、CI 门禁阈值和指标对齐方式。最后给出唯一的 CI 产出：所有阈值都满足且 3 次运行结果稳定时，PR 才变绿。
