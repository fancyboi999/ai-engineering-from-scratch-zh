# 工具结果结构

这是面向 MCPA“交互与执行”领域的一页参考，依据 MCP 2026-07-28 整理。

## tools/list 速查

| 字段 | 位置 | 含义 |
|-------|-------|---------|
| `cursor` | 请求，可选 | 来自上一页的不透明 token；第一次请求省略 |
| `tools` | 结果 | 当前页的工具定义 |
| `nextCursor` | 结果，可选 | 还有更多工具时存在，即使值为空字符串 |
| `ttlMs` | 结果，必填 | 以毫秒为单位的新鲜度提示；客户端可缓存至到期 |
| `cacheScope` | 结果，必填 | `public`（可共享）或 `private`（仅限当前授权上下文） |

工具列表不能按连接变化，也不能因其他请求的副作用而变化。它可以根据请求自身携带的授权而变化。

## tools/call 与 CallToolResult

| 字段 | 是否必填 | 含义 |
|-------|----------|---------|
| `content` | 是 | content block 列表；绝不能省略，可以为空 |
| `structuredContent` | 否 | 任意 JSON 值；存在 `outputSchema` 时应与其一致 |
| `isError` | 否 | 缺失或 false 表示成功；true 表示模型可读取并修正的工具执行错误 |

## Content block 目录

| Block type | 必填字段 | 用途 |
|------------|------------------|----------|
| `text` | `text` | 普通自然语言输出 |
| `image` | `data`（base64）、`mimeType` | 面向用户的图片 |
| `audio` | `data`（base64）、`mimeType` | 语音或声音输出 |
| `resource_link` | `uri`、`name` | 指向资源，而不内联内容 |
| `resource` | 含 `uri`、`mimeType`，以及 `text` 或 `blob` 的 `resource` 对象 | 直接嵌入资源内容 |

任何 block 都可携带 `annotations`：`audience`（`user`、`assistant` 或两者）、`priority`（0 到 1）和 `lastModified`。它们与 block 的其他字段并列，是 `data` 或 `resource` 的 sibling，绝不会再嵌套一层。

## 工具注解默认值

| 注解 | 默认值 | 说明 |
|------------|---------|------|
| `readOnlyHint` | false | true 表示工具永不修改环境 |
| `destructiveHint` | true | 仅在 `readOnlyHint` 为 false 时有意义 |
| `idempotentHint` | false | true 表示用相同参数重复调用不会产生新增效果 |
| `openWorldHint` | true | false 表示工具的交互领域是封闭的 |

四项都只是提示，不是保证。除非服务器本身可信，否则应将它们视为不可信信息，绝不能只凭注解作出安全决策。

## 工具调用的两种错误通道

| 情况 | 通道 | 示例 |
|-----------|---------|---------|
| 指定工具不存在 | JSON-RPC error | `-32602` |
| 工具已经运行，但遇到模型可以修正的问题 | `isError: true` 的 result | 日期无效、值超出范围 |

## 一句话理解 listChanged

客户端用 `toolsListChanged: true` 打开 `subscriptions/listen`，先收到 `notifications/subscriptions/acknowledged`；集合变化时，再收到带有该 stream subscription id 的 `notifications/tools/list_changed`，随后用普通 `tools/list` 重新获取。

## 考试要点

- 是否继续分页取决于 `nextCursor` 是否存在，而非值是否 truthy；空字符串是合法 cursor。
- 工具 annotations 描述意图，不负责强制执行；content annotations 描述单个 block，而不是整个工具。
- `isError` 是供模型读取的正常结果数据，不是协议级 error。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节。
