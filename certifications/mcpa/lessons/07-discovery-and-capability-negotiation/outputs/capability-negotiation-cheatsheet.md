# 能力协商速查表

面向 MCPA「Architecture and Components」领域、与 MCP 2026-07-28 对齐的一页式参考资料。

## server/discover 一览

| 字段 | 位置 | 含义 |
|------|------|------|
| `supportedVersions` | result | 服务端接受的协议版本；后续请求从中选择一个 |
| `capabilities` | result | `ServerCapabilities` 对象：服务端提供的功能 |
| `instructions` | result，可选 | 给模型的自然语言指导，不是工具描述的副本 |
| `io.modelcontextprotocol/serverInfo` | `result._meta` | 自报的名称和版本，仅用于显示和日志 |
| `ttlMs` | result | 以毫秒表示的新鲜度提示；`DiscoverResult` 属于 `CacheableResult` |
| `cacheScope` | result | `public` 或 `private`；本身绝不是访问控制机制 |

实现要求：每个服务端都必须实现。调用要求：客户端可选择是否调用；也可以直接发送任意请求，并在返回版本错误时处理。

## ServerCapabilities 与 ClientCapabilities 对照

| ServerCapabilities 键 | 含义 | ClientCapabilities 键 | 含义 |
|---|---|---|---|
| `tools {listChanged}` | 提供工具，可在变化时通知 | `elicitation {form, url}` | 可回答表单或 URL 模式 elicitation |
| `resources {listChanged, subscribe}` | 提供资源，可发送变化通知或接受订阅 | `sampling`（已弃用） | 可代表服务端提供 LLM 补全 |
| `prompts {listChanged}` | 提供 prompt 模板 | `roots`（已弃用） | 可列出根目录 |
| `completions {}` | 提供参数补全 | `extensions {}` | 支持具名客户端扩展 |
| `logging {}`（已弃用） | 可发送日志通知 | | |
| `extensions {}` | 支持具名服务端扩展 | | |

空对象表示支持该功能，但没有额外配置。缺少某个键表示完全不提供该原语或功能。

## 协商规则

`DiscoverResult.capabilities` 以可缓存的方式一次描述服务端。它完全没有说明某个客户端请求能接受什么。`_meta["io.modelcontextprotocol/clientCapabilities"]` 描述客户端，而且必须出现在每一个请求中，保持正确且反映当前情况；即使请求来自同一条连接，服务端也绝不能从之前调用中推断。

## MissingRequiredClientCapabilityError（-32021）

- 处理请求需要某项能力，而请求自身的 `clientCapabilities` 未声明时返回。
- `data.requiredCapabilities` 的形状与 `ClientCapabilities` 相同，明确指出缺失内容。
- HTTP 状态：`400 Bad Request`。
- 修复：重试同一请求，并在该请求自己的 `_meta` 中声明能力，而不是在其他请求中声明。

## UnsupportedProtocolVersionError（-32022）

- 请求指定服务端未实现的协议版本时返回。
- `data.supported` 列出服务端接受的版本；`data.requested` 回显请求版本。
- HTTP 状态：`400 Bad Request`。
- 修复：使用新的请求 id，并从 `data.supported` 选择版本重试。
- 现代专用服务端即使拒绝旧版 `initialize` 请求，也应列出自己支持的版本，因为旧版客户端无法自行向前切换。

## 重试检查清单

1. 读取错误的 `data`，绝不要靠猜选择重试版本或能力。
2. 为重试分配全新的 JSON-RPC id；不要复用失败请求的 id。
3. 只修改错误要求修改的内容；请求其余部分保持不变。
4. 不要把 `-32021` 或 `-32022` 响应当成普通结果缓存。
5. 不要假设后续请求会继承之前请求声明的任何内容。

## 考试要点

- 服务端必须实现 `server/discover`，客户端可选择是否调用。
- 未知工具是 `-32602`；未知方法是 `-32601`；缺少能力是 `-32021`；版本不受支持是 `-32022`。
- `serverInfo` 和 `clientInfo` 都是自报信息，仅用于显示和日志，绝不能用于安全决策。
- 通过现代 `_meta` 形状请求一个真实存在的旧协议版本，不等同于旧版客户端；旧版客户端会发送 `initialize`。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 6 节。
