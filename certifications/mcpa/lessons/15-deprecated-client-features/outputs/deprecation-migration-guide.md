# 弃用客户端功能迁移指南

这是一份 MCPA“交互与执行”领域的单页参考，与 MCP 2026-07-28 对齐。

## Deprecated 的含义

- Active：当前修订版有完整规范并要求实现。
- Deprecated：仍有完整规范且可正常使用，已有迁移路径，并且至少经过十二个月窗口（从标记弃用的修订版发布时开始计算）后才具备移除资格。
- Removed：已从草案规范删除，在下一版 Current 修订版中缺席。
- 最早移除时间是窗口结束当日或之后成为 Current 的第一版修订版。实际移除日期由 Core Maintainer 另行决定，可能更晚。

## SEP-2577 弃用的三项面向客户端功能

| 功能 | 原用途 | 迁移路径 | 最早移除时间 |
|---|---|---|---|
| Roots | 让客户端把目录提示作为参考信息交给服务器 | 通过 tool 参数、resource URI 或服务器配置传递目录或文件 | 2027-07-28 当日或之后的第一版修订版 |
| Sampling | 让服务器请求客户端代为运行 LLM 生成 | 直接集成 LLM provider API | 2027-07-28 当日或之后的第一版修订版 |
| Logging | 让服务器向客户端发送结构化日志通知 | stdio transport 记录到 stderr，其他场景使用 OpenTelemetry 提供可观测性 | 2027-07-28 当日或之后的第一版修订版 |

## 弃用注册表中的其他功能

| 功能 | 弃用版本 | 迁移路径 | 最早移除时间 |
|---|---|---|---|
| Dynamic Client Registration | 2026-07-28 | Client ID Metadata Documents | 2027-07-28 当日或之后的第一版修订版 |
| `includeContext: "thisServer" / "allServers"` | 2025-11-25 | 省略该字段，或发送默认值 `"none"` | 跟随 Sampling |
| HTTP+SSE transport | 2025-03-26 | Streamable HTTP | SEP-2596 达到 Final 三个月后 |

## 目前仍然有效、仍可在线上传输（不要包裹成旧版）

- 把 `roots/list` 作为 MRTR `inputRequests` 项；客户端必须声明 `roots` capability。
- 把 `sampling/createMessage` 作为 MRTR `inputRequests` 项；客户端必须声明 `sampling` capability。
- 在 `_meta` 中使用每请求 `io.modelcontextprotocol/logLevel` 键，并在该请求自己的响应流上以 `notifications/message` 回答；仅在请求进行期间发送不低于指定级别的消息。

## 2026-07-28 真正移除的内容（另一份更短的清单）

- `initialize` 和 `notifications/initialized`
- `Mcp-Session-Id`，以及 Streamable HTTP 的 GET、DELETE session 端点
- `resources/subscribe` 和 `resources/unsubscribe`（改用 `subscriptions/listen`）
- `ping`
- `logging/setLevel`（连接级日志级别设置器；已无 session 保存该级别）
- `notifications/roots/list_changed`
- `Last-Event-ID` 和 SSE 恢复
- MRTR 之外的所有服务器发起请求
- `tasks/result` 和 `tasks/list`（tasks 已移至 `io.modelcontextprotocol/tasks` 扩展）
- `notifications/elicitation/complete` 和 URL 模式 `elicitationId` 字段
- 错误码 `-32002` 和 `-32042`

## 考试要点

- Deprecated 不等于 Removed。某项功能可以今天仍完全可用，同时安排在未来移除。
- `roots/list`、`sampling/createMessage` 和每请求 `logLevel` 都能无需包裹地通过 2026-07-28 wire 检查器。
- `logging/setLevel` 和 `notifications/roots/list_changed` 在 2026-07-28 中完全不存在。
- 若干扰项给出精确移除日期，而不是“该日或之后的第一版修订版”，它就错误描述了弃用窗口。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 11 节和第 15 节。
