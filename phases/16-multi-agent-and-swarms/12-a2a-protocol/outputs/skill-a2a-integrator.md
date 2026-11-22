---
name: a2a-integrator
description: 设计两个 agent 之间的 A2A 集成：Agent Card、任务 schema、认证、流式或轮询。
version: 1.0.0
phase: 16
lesson: 12
tags: [multi-agent, a2a, protocol, interoperability, google]
---

给定两个需要互操作的 agent 系统，产出 A2A 集成方案：Agent Card 内容、任务 schema、认证和传输模式。

产出：

1. **Agent Card。** 名称、描述、版本、技能（每项带 `id`、`name`、`description`、`tags`）、`supportedInterfaces`（每项带 `url`、`protocolBinding`、`protocolVersion`）、以媒体类型表示的 `defaultInputModes` 和 `defaultOutputModes`（文本、结构化 JSON、图像、音频、视频），以及在 `securitySchemes` 和 `securityRequirements` 中声明的认证方式。
2. **每项技能的任务 schema。** 输入 JSON schema + 产物 JSON schema。写明确，客户端会做校验。
3. **认证方式。** Bearer token（OAuth2 或不透明 token）、mTLS 或 API key，每种都作为一条 `securitySchemes` 条目声明。结合威胁模型（公网、VPC、混合）说明理由。
4. **传输模式。** 轮询（`GetTask`）、SSE 流式（`SendStreamingMessage`、`SubscribeToTask`）还是推送通知（`CreateTaskPushNotificationConfig`）。长时运行或进度更新频繁的任务用流式；短任务用轮询。
5. **限流。** 按客户端和按任务的限额，防止滥用。
6. **幂等。** 处理重复 `POST /message:send` 请求的策略（客户端使用稳定的 `messageId`，服务端据此去重）。
7. **失败处理。** `TASK_STATE_FAILED` 之外的任务状态（可重试与致命）、死信策略、错误产物 schema。
8. **MCP 与 A2A 的划分。** 如果远端 agent 内部使用 MCP，注明哪些工具对外暴露、哪些保留在内部。

直接否决：

- `supportedInterfaces` 条目没有声明 `protocolVersion` 的 Agent Card。
- 用例需要结构化、任务 schema 却是自由文本。
- 公网部署上 `securityRequirements` 为空。

拒绝规则：

- 两个 agent 运行在同一个进程里时，拒绝 A2A，推荐直接用 Python/JS 调用。A2A 是为跨系统边界准备的。
- 延迟要求是往返 100ms 以内时，拒绝 A2A，推荐使用共享 schema 的直接 RPC。
- 远端 agent 没有声明 Agent Card 时，拒绝集成，建议先发布一份。

输出：一页集成简报。结尾内嵌粘贴 Agent Card JSON，方便工程团队直接放进 `/.well-known/agent-card.json`。
