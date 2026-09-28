# 传输方式选择指南

这是一份针对 MCPA“Interactions and Execution”与“Architecture and Components”领域的单页参考，与 MCP 2026-07-28 对齐。

## 选择传输方式

| 场景 | 使用 | 原因 |
|---|---|---|
| 客户端启动服务器并拥有其生命周期（本地工具、IDE extension） | stdio | framing 最简单、没有网络暴露面、凭据从环境读取 |
| 服务器通过网络供多个客户端访问 | Streamable HTTP | 单一 endpoint、独立 POST，适用于 load balancer 和 gateway 后方 |
| 既不是子进程也不是 HTTP 的可靠字节流（Unix socket、TCP 连接） | 复用 stdio framing | stdio binding 本来就是字节流上的换行分隔 JSON-RPC；只有启动、`stderr` 和关闭是子进程专属行为 |
| 早于 2026-07-28 的旧客户端或服务器 | 先识别版本时期（第 05 课），再 fallback | 切勿想当然；按服务器进程或 origin 探测并缓存结论 |

## stdio 速览

- 换行分隔 JSON-RPC，每行一条消息，内部不能嵌入换行。
- `stdout` 只承载 MCP 消息；服务器绝不向其中写 request。
- `stderr` 用于任意严重级别的日志；客户端不能仅凭它判断出错。
- 完全没有 header 层：版本、能力和身份只存在于 `_meta`。
- 使用 `notifications/cancelled` 取消；关闭时先关闭 `stdin`，必要时再升级处理。
- 意外退出后：重启、放弃进行中请求、重新发送 `subscriptions/listen`。

## Streamable HTTP 必需 header

| Header | 来源字段 | 适用请求 | 不匹配时 |
|---|---|---|---|
| `MCP-Protocol-Version` | `params._meta["io.modelcontextprotocol/protocolVersion"]` | 每个 POST | `400` + `-32020` |
| `Mcp-Method` | `method` | 每个 request | `400` + `-32020` |
| `Mcp-Name` | `params.name`，`resources/read` 则使用 `params.uri` | `tools/call`、`resources/read`、`prompts/get` | `400` + `-32020` |
| `Mcp-Param-{Name}` | schema 中标记 `x-mcp-header` 的工具参数 | 仅声明该标记的工具 | `400` + `-32020` |

header 名称不区分大小写；header 值（包括 method 和工具名）区分大小写。

## Base64 sentinel 编码

适用于 `Mcp-Name` 和任意 `Mcp-Param-{Name}` 值。出现以下情况时，编码为 `=?base64?{Base64EncodedValue}?=`：

- 包含可见 ASCII、空格和水平制表符之外的字符；
- 存在首尾空白；或
- 本身就匹配 sentinel 模式，为避免歧义必须编码。

否则原样发送。服务器先解码 sentinel，再将 header 与请求体比较。

## 不属于 JSON-RPC 错误的 HTTP 状态码

| 场景 | 状态 | JSON-RPC 响应体 |
|---|---|---|
| 向 MCP endpoint 发送 GET 或 DELETE | `405` | 不要求 |
| 存在 `Origin` header 但不在允许列表中 | `403` | 不要求 |
| 接受 notification POST | `202` | 无；notification 从不获得 JSON-RPC reply |
| header 与请求体不一致 | `400` | `-32020` `HeaderMismatch` |
| 协议版本不受支持 | `400` | `-32022` `UnsupportedProtocolVersionError` |
| 未知方法 | `404` | `-32601` `Method not found` |

## Streamable HTTP 在 2026-07-28 中删除的内容

- 独立 GET stream 及其 `endpoint` event。
- `Mcp-Session-Id` 与 session 范围状态；每个请求都能自我描述。
- 用于结束 session 的 HTTP DELETE。
- 使用 `Last-Event-ID` 恢复 stream；stream 中断即丢失该请求，安全时用新 id 重发。

## 考试要点

- 请求体始终是权威来源；header 只服务于路由，绝不是第二个权威。
- 错误 Origin 的 `403`、GET 或 DELETE 的 `405`、接受 notification 的 `202` 都是 HTTP 层结果，不是 JSON-RPC result 或 error。
- `-32020` 是 `HeaderMismatch`，与 `-32021`（缺少能力）和 `-32022`（版本不受支持）无关。
- 字节流上的自定义传输应复用 stdio framing，而不是发明新格式。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 9 节。
