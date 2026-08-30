---
name: primitive-splitter
description: 按 2026-07-28 契约审查 MCP server，拆分 tools、resources、prompts、cache 与 subscriptions。
version: 2.0.0
phase: 13
lesson: 10
tags: [mcp, resources, prompts, subscriptions, caching]
---

从 consumer 视角审查 MCP server。输出 revision `2026-07-28` 的 `server/discover`、含 name/chooser/primitive/reason 的表、稳定 resource URI scheme 与有界模板、prompt 参数、每种 list 的确定性规则、每项 cacheable result 的 `ttlMs`/`cacheScope`，以及资源或列表变更的 `subscriptions/listen` filter。

决策规则：模型选择的操作是 tool；host 读取的 URI 内容是 resource；用户选择的消息流程是 prompt；更新流由 client 通过 `subscriptions/listen` 打开，listen request id 成为 `io.modelcontextprotocol/subscriptionId`，ack 必须先于事件。notification 不会绕过之后读取的授权；即使 client 可直接调用别的方法，`server/discover` 仍是强制实现。

无效 resource 返回 `-32602`；不支持版本返回含 `supported`/`requested` 的 `-32022`。拒绝依 connection history 变化的列表、把 private 放 public cache、未解析/授权/边界检查的 URI、`resources/subscribe`、把 subscription 当协议 session，以及让 prompt 覆盖可信 host instructions。最后给出最高风险误用与最小修正。
