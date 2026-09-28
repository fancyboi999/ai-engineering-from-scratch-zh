# Prompt 与 Completion 参考

这是一份 MCPA“交互与执行”领域的单页参考，与 MCP 2026-07-28 对齐。

## prompts/list

- 可缓存、可分页：`resultType: "complete"` 结果携带 `ttlMs`（大于等于 0 的整数）和 `cacheScope`（`public` 或 `private`）。
- 请求接受可选的不透明 `cursor`；仅当还有下一页时，结果才包含 `nextCursor`。
- 不得因连接不同而变化；可根据请求携带的授权信息而变化。
- 无法识别的游标返回 `-32602`，绝不能静默回退到第一页。

## prompts/get

- 请求：`name` 和字符串组成的 `arguments` 映射。
- 不属于六个可缓存操作：结果中没有 `ttlMs`，也没有 `cacheScope`。
- 可以返回 `InputRequiredResult`（多轮请求），而不是最终结果。
- 结果携带 `description` 和 `messages`；每条消息包含一个 `role`（`user` 或 `assistant`）和一个内容块。

## PromptMessage 内容类型

| 类型 | 携带内容 | 典型用途 |
|------|---------|-------------|
| `text` | `text` | 渲染后的指令，参数已经代入 |
| `image` | base64 `data`、`mimeType` | 消息中内联的视觉上下文 |
| `audio` | base64 `data`、`mimeType` | 消息中内联的音频上下文 |
| `resource_link` | `uri`、`name`，以及可选的 `description`、`mimeType` | 指向资源而不内联其字节 |
| `resource`（嵌入式） | `uri`、`mimeType`、`text` 或 `blob` | 直接在消息中发送的小型资源内容 |

## 错误

| 情况 | 错误码 |
|-----------|------|
| 未知 prompt 名称 | `-32602` |
| 缺少必填参数 | `-32602` |
| 无法识别的分页游标 | `-32602` |
| 服务器内部故障 | `-32603` |

Prompts 没有 tools 风格的 `isError` 通道：渲染模板不执行任何操作，因此错误名称或缺失参数始终属于协议错误，绝不是留给模型补救的部分结果。

## completion/complete

- 请求：`ref`（按名称引用的 `ref/prompt`，或按 URI、URI 模板引用的 `ref/resource`）、`argument`（`name`、`value`），以及可选的 `context.arguments`（已经确定的参数名称和值）。
- 结果：`completion.values`（最多 100 个，按相关性排序）、可选的 `total`，以及 `hasMore`。
- 只要实际匹配数超过 100，`hasMore` 就是 `true`，与客户端如何得到结果无关。
- 不可缓存：结果中没有 `ttlMs`，也没有 `cacheScope`。
- 服务器必须在 `server/discover` 中声明 `completions: {}` capability。

## 引用类型

| 类型 | 示例 |
|------|---------|
| `ref/prompt` | `{"type": "ref/prompt", "name": "code_review"}` |
| `ref/resource` | `{"type": "ref/resource", "uri": "file:///src/{path}"}` |

## 考试要点

- Prompts 由用户控制；tools 由模型控制；resources 由应用驱动。
- `prompts/list` 可缓存；`prompts/get` 和 `completion/complete` 不可缓存。
- 未知 prompt、缺少必填参数和无效游标都返回 `-32602`。
- `context.arguments` 使用用户已经给出的答案缩小补全范围，而不是加入新的答案。
- 100 个值的上限及 `hasMore` 与分页游标无关；completion 从不使用游标。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`。
