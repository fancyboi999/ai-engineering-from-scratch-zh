# LLM 路由层——LiteLLM、OpenRouter、Portkey

> provider 锁定很贵。不同的工具调用工作负载适配不同的模型。路由网关给你一套 API 表面、重试、故障转移、成本跟踪和护栏。2026 年主导的有三种原型：LiteLLM（开源自托管）、OpenRouter（托管 SaaS）、Portkey（生产级，2026 年 3 月开源）。本课点名决策标准并走一遍一个标准库路由网关。

**类型：** Learn
**语言：** Python（标准库，路由 + 故障转移 + 成本跟踪器）
**前置要求：** 阶段 13 · 02（function calling）、阶段 13 · 17（网关）
**预计时间：** ~45 分钟

## 学习目标

- 区分自托管、托管、生产级三种路由选项。
- 实现一条 fallback 链，按定义好的优先级顺序在 provider 失败时重试。
- 跨 provider 跟踪每请求成本和 token 用量。
- 为给定的生产约束在 LiteLLM、OpenRouter、Portkey 之间做选择。

## 问题背景

provider 路由有用的场景：

1. **成本。** Claude Sonnet 的价是 Haiku 的 3 倍。对一个分诊任务，Haiku 就够了；对一个合成任务，Sonnet 值这个钱。按请求路由。

2. **故障转移。** OpenAI 有糟糕的一小时。每个请求都失败。你想要不重新部署就自动 fallback 到 Anthropic。

3. **延迟。** 一个实时聊天 UI 需要快的首 token 时间。一个批量摘要器不需要。按延迟 SLA 路由。

4. **合规。** 欧盟用户必须留在欧盟区域。按区域路由。

5. **实验。** 在同一工作负载上 A/B 两个模型。按测试桶路由。

每个集成都手搓这一切很重复。一个路由网关给你一套 OpenAI 兼容的 API，其余的它包办。

## 核心概念

### OpenAI 兼容的代理形状

人人都说 OpenAI 形状。路由网关暴露 `/v1/chat/completions`，接受 OpenAI schema，内部代理给 Anthropic / Gemini / Cohere / Ollama / 任何东西。client 不在乎。

### 模型别名

你的代码不写死某个 snapshot ID，而说 `our_smart_model`。网关把别名映射到真实模型。某家提供商发布新一代模型时，你只需在 server 端改别名，业务代码一点不用动。

### fallback 链

```
primary: openai/gpt-4o
5xx 时: anthropic/claude-3-5-sonnet
5xx 时: google/gemini-1.5-pro
5xx 时: 拒绝
```

网关在一份配置里定义这个。重试计入一份预算，免得 fallback 级联把成本炸开。

### 语义缓存

完全或近乎完全相同的 prompt 命中缓存，而不走 provider。在重复的 agent 循环上能省 30% 到 60%。键基于 embedding；近乎相同的 prompt 共享一个缓存槽。

### 护栏

网关层面：

- **PII 脱敏。** 发 prompt 前做一道正则或 ML 的扫描。
- **策略违规。** 拒绝带禁止内容的 prompt。
- **输出过滤。** 清洗补全里的泄漏。

Portkey 和 Kong 都交付有主见的护栏。LiteLLM 把它们留作可选。

### 每 key 限流

一个 API key = 一个团队。每 key 预算防止一个团队消耗掉共享配额。多数网关支持这个。

### 自托管 vs 托管的权衡

| 因素 | LiteLLM（自托管） | OpenRouter（托管） | Portkey（生产） |
|--------|----------------------|----------------------|----------------------|
| 代码 | 开源，Python | 托管 SaaS | 开源（2026 年 3 月）+ 托管 |
| 搭建 | 部署一个代理 | 注册 | 二者皆可 |
| provider | 100+ | 300+ | 100+ |
| 计费 | 用你自己的 key | OpenRouter 额度 | 用你自己的 key |
| 可观测性 | OpenTelemetry | 仪表盘 | 完整 OTel + PII 脱敏 |
| 最适合 | 想要完全掌控的团队 | 快速原型 | 带合规的生产 |

当你有一个 SRE 团队、想要数据主权时，LiteLLM 赢。当你想要单一订阅、不要基础设施时，OpenRouter 赢。当你需要开箱即用的护栏和合规时，Portkey 赢。

### 成本跟踪

每个请求都携带 `provider`、`model`、`input_tokens`、`output_tokens`。乘以每模型每 token 价格（从网关维护的一张定价表拉取）。按用户 / 团队 / 项目聚合。

### MCP 加路由

一个网关能同时路由 LLM 调用和 MCP sampling 请求。当一个 sampling 请求的 modelPreferences 偏好某个特定模型时，网关翻译到正确的后端。这就是阶段 13 · 17（MCP 网关）和本课的路由网关有时合并成一个服务的地方。

### 路由策略

- **静态优先级。** 清单里第一个；出错时 fallback。
- **负载均衡。** 轮询或加权。
- **成本感知。** 挑满足延迟 / 质量的最便宜模型。
- **延迟感知。** 挑过去 N 分钟里最快的模型。
- **任务感知。** prompt 分类器把编码路由给一个模型、摘要路由给另一个。

```figure
tp-router-failover
```

## 实际使用

`code/main.py` 用约 150 行实现一个路由网关：接受 OpenAI 形状的请求、翻译成每 provider 的桩、跑一条优先级 fallback 链、跟踪每请求成本，并对输入应用一道 PII 脱敏。用三个场景跑它：正常请求、主 provider 中断触发 fallback、被脱敏抓住的 PII 泄漏。

要看什么：

- `ROUTES` dict：别名 -> 按优先级排序的具体 provider 列表。
- fallback 循环在 5xx 时重试。
- 成本跟踪器把 token 用量乘以每模型费率。
- PII 脱敏器在转发前清洗 SSN 形状的模式。

## 拿去用

本课产出 `outputs/skill-routing-config-designer.md`。给定一个工作负载画像（延迟、成本、合规），这个 skill 挑 LiteLLM / OpenRouter / Portkey 并产出一份路由配置。

## 练习

1. 跑 `code/main.py`。触发中断场景；确认 fallback 落到第二个 provider，且成本被正确归属。

2. 加语义缓存：prompt 的 SHA256 是一个查找键；缓存命中即时返回。在一个重复调用上测量成本节省。

3. 加一个 prompt 分类器，把 "code ..." 的 prompt 路由到一个偏好智能的别名，把 "summarize ..." 的 prompt 路由到一个偏好速度的别名。

4. 设计每团队预算：每个团队有一个月度花费上限；一旦撞上限网关就拒绝请求。挑一个强制粒度（每请求或窗口化）。

5. 把 LiteLLM、OpenRouter、Portkey 的文档并排读。点名每家交付、而另外两家没有的那一个特性。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Routing gateway | "LLM 代理" | 在许多 provider 前面的一套 API 表面层 |
| OpenAI-compatible | "说 OpenAI schema" | 接受 `/v1/chat/completions` 形状，翻译到任意后端 |
| Model alias | "our_smart_model" | 你代码里、网关映射到具体模型的名字 |
| Fallback chain | "重试列表" | 失败时尝试的有序 provider 列表 |
| Semantic caching | "prompt-embedding 缓存" | 键是 prompt 的 embedding；近重复共享一次缓存命中 |
| Guardrails | "输入/输出过滤器" | 脱敏 PII、拒绝策略违规 |
| Per-key rate limit | "团队预算" | 限定到一个 API key 的配额 |
| Cost tracking | "每请求花费" | 聚合 token 用量 x 每模型价格 |
| LiteLLM | "开源代理" | 可自托管的开源路由网关 |
| OpenRouter | "托管 SaaS" | 基于额度计费的托管网关 |
| Portkey | "生产选项" | 开源 + 托管，内建护栏 |

## 延伸阅读

- [LiteLLM — docs](https://docs.litellm.ai/) — 自托管路由网关
- [OpenRouter — quickstart](https://openrouter.ai/docs/quickstart) — 托管路由 SaaS
- [Portkey — docs](https://portkey.ai/docs) — 带护栏的生产路由
- [TrueFoundry — LiteLLM vs OpenRouter](https://www.truefoundry.com/blog/litellm-vs-openrouter) — 决策指南
- [Relayplane — LLM gateway comparison 2026](https://relayplane.com/blog/llm-gateway-comparison-2026) — 厂商综览
