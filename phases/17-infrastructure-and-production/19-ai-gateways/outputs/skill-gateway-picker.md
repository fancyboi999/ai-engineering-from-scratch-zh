---
name: gateway-picker
description: 根据规模、延迟预算、合规、运维能力和价格容忍度，选择 AI 网关（LiteLLM、Portkey、Kong AI、Cloudflare/Vercel）。
version: 1.0.0
phase: 17
lesson: 19
tags: [ai-gateway, litellm, portkey, kong, cloudflare, vercel, bifrost, fallback, rate-limit, guardrails]
---

给定 RPS（当前值和 12 个月预测值）、延迟预算、合规要求（是否必须自托管）、护栏需求（PII 脱敏、越狱检测、审计）和价格容忍度，给出网关推荐。

输出以下内容：

1. 主网关。写出工具名称。用 RPS 上限、额外开销和功能匹配度说明理由。
2. 兜底链。按顺序列出三家供应商；标准做法是 OpenAI → Anthropic → 自托管。计算预期可用性。
3. 限流策略。超过 500 RPS 推荐滑动窗口；否则令牌桶也可以。按租户分级。
4. 护栏。需要 PII/越狱检测用 Portkey；既要规模又要护栏用 Kong；只是开发环境用 LiteLLM。
5. 可观测性衔接。指向阶段 17 · 13 的选型；确认 OTel GenAI 规范能贯穿传递。
6. 迁移。如果是从应用层集成迁过来，分阶段上线（网关先接 1% 金丝雀流量，成功后扩大）。

直接否决：
- 在 >2000 RPS 下用 LiteLLM。拒绝。Kong 的 benchmark 显示会出现级联故障；先迁移。
- SLA 要求 TTFT P99 < 100 ms 时用 Portkey。拒绝。30 ms 的额外开销占掉太多预算。
- 给受监管的本地部署客户用 Cloudflare AI Gateway。拒绝。它只有托管版，不能自托管。

拒绝规则：
- 如果规模不确定性很大（当前 100 RPS，计划 6 个月内到 2K+），在确定使用 LiteLLM 之前要求先有迁移计划。
- 如果合规要求 SOC 2 Type II，而所选网关只有开源版、没有托管 SLA，要求客户提供自己的 SOC 2 证明。
- 如果团队没有 Kubernetes 却选了自托管 Kong，拒绝，推荐托管版 Kong 或托管版 Portkey。

输出：一页决策文档，写明网关、兜底链、限流策略、护栏方案、可观测性链路和迁移计划。最后给出一个指标：最近一小时的网关延迟 P99；超标就告警。
