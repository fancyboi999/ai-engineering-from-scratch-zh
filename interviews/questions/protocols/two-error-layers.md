---
id: two-error-layers
title: 协议错误不是工具错误
card: protocols
kind: concept
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, coding]
tags: [mcp, json-rpc, iserror, output-schema, tools]
minutes: 6
lessons: [phases/13-tools-and-protocols/07-building-an-mcp-server, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content]
manuals: []
practice: []
cheatsheet: [mcp-server-build]
related: [protocols/tool-resource-or-prompt]
updated: 2026-11-03
---

你的 MCP 服务端有一个工具 `route_report`，用于从上游源读取报告。一位审查者阅读了处理函数并发现了两点。当上游源宕机时，处理函数返回 JSON-RPC 错误。当客户端发送服务端未知的工具名称时，处理函数返回带有 `isError: true` 的结果。这是正确的做法吗？

## Short answer

不正确，两种情况颠倒了。JSON-RPC 错误意味着请求根本无法被分发：未知的工具名称、畸形的信封、缺失的请求元数据或无效的游标。带有 `isError: true` 的完整结果意味着有效调用到达了工具，且工具报告了模型可以采取行动的失败，例如当前不可用的源。

## Full answer

### 两个层级，两个受众

| 层级 | 用途 | 谁来修复 |
|---|---|---|
| JSON-RPC `error` | 信封或方法参数无效 | 客户端或开发者 |
| 带有 `isError: true` 的结果 | 工具已运行并报告可采取行动的失败 | 通常是模型，通过更改参数或等待 |

模型可以读取“报告源不可用”并稍后重试或告知用户。如果服务端拒绝了格式正确的请求，却将其报告为工具失败，模型就无法修复这个问题，因为模型不知道该请求从未运行。

### 输出 schema 依然有效

一旦服务端发布了 `outputSchema`，每个完整结果都必须提供符合该 schema 的 `structuredContent`。`isError` 标志划分结果类别。它并不免除契约。因此应在 schema 内部对失败建模。示例中的 `route_report` 失败返回其请求的区域并带有 `accepted: false`，加上错误文本，再加上 `isError: true`。

### 错误的错误码会发出错误的信号

缺失请求元数据属于无效参数，`-32602`。不支持的协议版本是 `-32022`，并在错误数据中包含 `requested` 和 `supported`。未知方法是方法未找到错误。保持它们的区别，因为客户端读取错误码来决定是纠正请求、重试其他版本还是停止。

### 注解不决定其中任何一项

`readOnlyHint`、`destructiveHint`、`idempotentHint` 和 `openWorldHint` 是用于展示和确认的提示。服务端仍会强制执行鉴权，且客户端仍会验证结果。

## Follow-ups

- **Level 1:** 请求到达时在 `params._meta` 中没有协议版本。返回哪个错误码？ Expected: `-32602`，无效参数，绝不从早期调用中补齐。
- **Level 2:** 工具发布了输出 schema。错误结果必须匹配它吗？ Expected: 是；每个完整结果（包括 `isError: true`）都必须返回符合契约的 `structuredContent`。
- **Level 2:** 为什么宿主验证 `structuredContent` 而不是信任描述符？ Expected: 服务端可能违背其自身的 schema，模型无法修复该问题，因此客户端在模型使用前验证。
- **Level 3:** 有效的工具调用其参数未能通过输入 schema。属于哪一层？ Expected: 方法参数无效，因此是 JSON-RPC 错误；综合项目的 TypeScript 模型则在不调用执行器的情况下返回带有 `isError: true` 的完整结果，因此说明你的选择并在各处一致应用。

## Wrong answers

- "对所有内容都返回 `isError`，以便模型始终获得文本。" 畸形的信封随后看起来像工具失败，且模型会重试一个永远无法运行的请求。
- "未知的工具是工具失败。" 该调用从未到达工具，因此它是协议层的分发错误。
- "错误结果可以跳过输出 schema。" 该标志划分结果类别，公布的契约依然有效。

## Taught in

[服务端课程](../../../phases/13-tools-and-protocols/07-building-an-mcp-server/)指明了这两个层级，[工具契约课程](../../../phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/)将错误结果与输出 schema 绑定。
