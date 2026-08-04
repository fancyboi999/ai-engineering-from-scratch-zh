# AI 网关 —— LiteLLM、Portkey、Kong AI Gateway、Bifrost

> 网关坐在你的应用和模型供应商之间。核心特性是供应商路由、回退、重试、限流、密钥引用、可观测性、guardrails。2026 年的市场划分：**LiteLLM** 是 MIT OSS，100+ 供应商，OpenAI 兼容，但在约 2000 RPS 时崩溃（8 GB 内存，已发布基准里出现级联失败）；最适合 Python、<500 RPS、开发/原型。**Portkey** 定位控制面（guardrails、PII 脱敏、越狱检测、审计追踪），2026 年 3 月转 Apache 2.0 开源，20-40 ms 延迟开销，$49/月生产档。**Kong AI Gateway** 建在 Kong Gateway 之上 —— Kong 自家在相同 12 CPU 上的基准：比 Portkey 快 228%，比 LiteLLM 快 859%；$100/模型/月（Plus 档最多 5 个）；如果你已经在用 Kong 就很合适。**Bifrost**（Maxim AI）—— 带可配置退避的自动重试，OpenAI 429 时回退到 Anthropic。**Cloudflare / Vercel AI Gateway** —— 托管、零运维、基础重试。数据驻留驱动自托管决策；Portkey 和 Kong 居中，提供 OSS + 可选托管。

**类型：** Learn
**语言：** Python（标准库，一个玩具级网关路由模拟器）
**前置要求：** 阶段 17 · 01（托管 LLM 平台）、阶段 17 · 16（模型路由）
**预计时间：** ~60 分钟

## 学习目标

- 列举六项核心网关特性（路由、回退、重试、限流、密钥、可观测性、guardrails）。
- 把四个 2026 网关（LiteLLM、Portkey、Kong AI、Bifrost）对应到规模上限和用例。
- 引用 Kong 基准（比 Portkey 快 228%，比 LiteLLM 快 859%），并解释为什么这对 >500 RPS 重要。
- 在给定数据驻留和运维预算下，选择自托管 vs 托管。

## 问题背景

你的产品调 OpenAI、Anthropic 和一个自托管的 Llama。每家供应商有不同的 SDK、错误模型、限流和鉴权方案。你想要故障转移（如果 OpenAI 429，就试 Anthropic）、单一凭证库、统一可观测性，以及按租户的限流。

在应用层重造这些会把每个服务都和每家供应商耦死。一个网关层把它整合进一个进程、一个 API（通常 OpenAI 兼容），由它扇出到各供应商。

## 核心概念

### 六项核心特性

1. **供应商路由** —— OpenAI、Anthropic、Gemini、自托管等藏在一个 API 后面。
2. **回退** —— 在 429、5xx 或质量失败时，去别处重试。
3. **重试** —— 指数退避，有界次数。
4. **限流** —— 按租户、按 key、按模型。
5. **密钥引用** —— 运行时从 vault 拉凭证（绝不放在应用里）。
6. **可观测性** —— OTel + GenAI 属性（阶段 17 · 13）+ 成本归因。
7. **Guardrails** —— PII 脱敏、越狱检测、允许话题过滤。

### LiteLLM —— MIT OSS、Python

- 100+ 供应商，OpenAI 兼容，路由配置，回退，基础可观测性。
- 在 Kong 的基准里约 2000 RPS 崩溃；8 GB 内存占用，持续负载下级联失败。
- 最佳适用：Python 应用，<500 RPS，开发/预发网关，实验性路由。
- 成本：OSS 免费；存在云端免费档。

### Portkey —— 控制面定位

- 截至 2026 年 3 月为 Apache 2.0 OSS。Guardrails、PII 脱敏、越狱检测、审计追踪。
- 每请求 20-40 ms 延迟开销。
- 生产档 $49/月，带留存 + SLA。
- 最佳适用：需要 guardrails + 可观测性捆绑的受监管行业。

### Kong AI Gateway —— 规模化打法

- 建在 Kong Gateway 之上（成熟的 API 网关产品，lua+OpenResty）。
- Kong 自家在 12 CPU 等量级上的基准：比 Portkey 快 228%，比 LiteLLM 快 859%。
- 定价：$100/模型/月，Plus 档最多 5 个。
- 最佳适用：已经在用 Kong；>1000 RPS；愿意付授权费。

### Bifrost（Maxim AI）

- 带可配置退避的自动重试。
- OpenAI 429 时回退到 Anthropic 是个标准配方。
- 较新的入局者；商用。

### Cloudflare AI Gateway / Vercel AI Gateway

- 托管、零运维。基础重试和可观测性。
- 最佳适用：在 Cloudflare/Vercel 上做边缘服务的 JavaScript 应用。
- 在 guardrails 和限流上相比 Kong/Portkey 受限。

### 自托管 vs 托管

数据驻留是那个逼你做选择的因素。医疗和金融默认自托管（LiteLLM 或 Portkey OSS 或 Kong）。消费产品默认托管（Cloudflare AI Gateway）或中间档（Portkey 托管）。混合：受监管租户自托管，其他人托管。

### 延迟预算

- LiteLLM：典型 5-15 ms 开销。
- Portkey：20-40 ms 开销。
- Kong：3-8 ms 开销。
- Cloudflare/Vercel：1-3 ms 开销（边缘优势）。

网关延迟直接加进 TTFT。对 TTFT P99 < 100 ms 的 SLA，用 Kong 或 Cloudflare。对 P99 < 500 ms，随便哪个都行。

### 限流语义很重要

简单的令牌桶在中等规模以内能用。多租户需要滑动窗口 + 突发额度 + 按租户分档。LiteLLM 用令牌桶；Kong 用滑动窗口；Portkey 用分档。

### 网关 + 可观测性 + 路由组合在一起

阶段 17 · 13（可观测性）+ 16（模型路由）+ 19（网关）在生产里是同一层。挑一个覆盖全部三者的工具，或者小心地把它们接起来：大多数 2026 部署把 Helicone（可观测性）或 Portkey（guardrails）和 Kong（规模）组合起来分担角色。

### 你该记住的数字

- LiteLLM：约 2000 RPS 崩溃，8 GB 内存。
- Portkey：20-40 ms 开销；自 2026 年 3 月起 Apache 2.0。
- Kong：比 Portkey 快 228%，比 LiteLLM 快 859%。
- Kong 定价：$100/模型/月，Plus 档最多 5 个。
- Cloudflare/Vercel：边缘上 1-3 ms 开销。

```figure
mx-gateway-fallback
```

## 实际使用

`code/main.py` 在注入 429/5xx 的情况下，跨 3 家供应商模拟带回退的网关路由。报告延迟、重试率和回退命中率。

## 拿去用

这一课产出 `outputs/skill-gateway-picker.md`。给定规模、运维态度、合规、延迟预算，挑一个网关。

## 练习

1. 跑 `code/main.py`。配置从 OpenAI→Anthropic→自托管 的回退。在 5% 供应商错误率下预期命中率是多少？
2. 你的 SLA 是 300 ms 基线上 TTFT P99 < 200 ms。哪些网关留在预算内？
3. 一个医疗客户要求自托管 + PII 脱敏 + 审计。在 Portkey OSS 和 Kong 之间挑。
4. 对比 LiteLLM vs Kong：在什么 RPS 上限时一个团队该迁移？
5. 为一个多租户 SaaS 设计限流策略：免费档、试用档、付费档。令牌桶还是滑动窗口？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 网关 | "API 中介" | 坐在应用和供应商之间的进程 |
| LiteLLM | "那个 MIT 的" | Python OSS，100+ 供应商，2K RPS 崩溃 |
| Portkey | "guardrails 网关" | 控制面 + 可观测性，Apache 2.0 |
| Kong AI Gateway | "规模那个" | 建在 Kong Gateway 上，基准领先 |
| Bifrost | "Maxim 的网关" | 重试 + Anthropic 回退配方 |
| Cloudflare AI Gateway | "边缘托管" | 边缘部署的托管网关，零运维 |
| PII 脱敏 | "数据擦洗" | 发给模型前用正则 + NER 掩码 |
| 越狱检测 | "prompt 注入防护" | 对用户输入的分类器 |
| 审计追踪 | "受监管日志" | 每次 LLM 调用的不可变记录 |
| 令牌桶 | "简单限流" | 基于补充的限流器 |
| 滑动窗口 | "精确限流" | 按时间窗口的限流器；公平性更好 |

## 延伸阅读

- [Kong AI Gateway Benchmark](https://konghq.com/blog/engineering/ai-gateway-benchmark-kong-ai-gateway-portkey-litellm)
- [TrueFoundry — AI Gateways 2026 Comparison](https://www.truefoundry.com/blog/a-definitive-guide-to-ai-gateways-in-2026-competitive-landscape-comparison)
- [Techsy — Top LLM Gateway Tools 2026](https://techsy.io/en/blog/best-llm-gateway-tools)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [Portkey GitHub](https://github.com/Portkey-AI/gateway)
- [Kong AI Gateway docs](https://docs.konghq.com/gateway/latest/ai-gateway/)
