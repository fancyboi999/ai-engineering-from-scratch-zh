# 传输方式与 HTTP Header 契约

> 传输方式不会改变消息的含义，只决定消息如何抵达：stdio 将一行 JSON-RPC 交给子进程，Streamable HTTP 则一次 POST 一条消息，同时把少数字段镜像到 gateway 无需解析请求体就能读取的 header 中。

**类型：** Reference
**语言：** Python
**前置要求：** 第 18 课
**预计时间：** 约 45 分钟

## 学习目标

- 按 stdio 传输要求对换行分隔的 JSON-RPC 消息进行 framing 与解析，并解释嵌入换行为何会破坏 framing
- 描述 Streamable HTTP 的请求与响应结构：每条消息一个 POST、返回 JSON 对象或当前请求专属的 SSE stream、接受 notification 时返回 `202 Accepted`，且不存在 GET endpoint
- 构建并验证必需 HTTP header：`MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name`，并通过 `x-mcp-header` 和 base64 sentinel 编码镜像工具参数
- 解释 Origin 验证和 localhost 绑定为何能防御 DNS rebinding，以及现代服务器如何响应 GET、DELETE 和不允许的 Origin
- 区分 `HeaderMismatch`（`-32020`）协议错误与传输层对那些永远不会成为 JSON-RPC 消息的结果所返回的普通 HTTP 状态

## 问题背景

每条 MCP 消息已经包含理解自身所需的一切：method、参数，以及 `_meta` 中逐请求携带的元数据。无论字节以何种方式在客户端和服务器间传输，这些内容都不变。但仍需某种机制承载字节、从连续数据中划出单条消息、通知客户端连接已断开，并让 load balancer 或 gateway 无需变成 JSON-RPC parser 就能路由流量。这就是传输层的工作。MCP 2026-07-28 只定义两种标准传输：stdio，用于客户端启动的子进程；Streamable HTTP，用于可被任意数量客户端访问的网络服务。

若课程把传输方式当作附带知识，就会留下考试专门考查的缺口。第 04 课的无状态核心只有在底层 binding 也不暗中夹带状态时才能端到端成立——不能有 session id、可恢复 stream，或依赖连接记住上次请求的服务器。本课所有规则都服务于同一个承诺：传输层只负责 framing 和投递消息，除此之外什么也不做。

## 核心概念

### stdio：共享三条 stream 的子进程

在 stdio binding 中，客户端将服务器作为子进程启动，双方共享它的标准 stream。服务器从 `stdin` 读取 JSON-RPC request 和 notification，向 `stdout` 写入 response 和 notification；每行一条消息，消息内不能嵌入换行。`stdout` 只承载有效 MCP 消息；服务器绝不会在其中写入 JSON-RPC request，因为 MRTR（第 14 课）已经用 `input_required` 结果取代所有服务器发起的请求。`stderr` 可用于任意严重级别的日志，客户端不能仅凭其中出现内容就认定发生错误。

stdio 没有 header 层。Streamable HTTP 镜像到 header 中的每项元数据仍然存在，但只会内联在 `params._meta` 中，与其他传输方式完全一样。要取消进行中的请求，客户端发送 `notifications/cancelled` 并指定请求 id，因为这里没有可直接关闭的逐请求 stream。关闭过程应优先协作完成：客户端关闭 `stdin` 并等待，只有服务器不退出时才升级为进程 signal。服务器若意外退出，客户端会重启它；所有进行中请求都会丢失，客户端还要为仍希望保留的订阅重新发送 `subscriptions/listen`。协议本身无状态，新进程与退出的进程能力完全相同。

### Streamable HTTP：一个 endpoint，每个 POST 一条消息

Streamable HTTP 服务器暴露单个 MCP endpoint，例如 `/mcp`，在协议层只接受 POST。每条 JSON-RPC request 或 notification 都使用独立 POST。客户端的 `Accept` header 同时列出 `application/json` 和 `text/event-stream`，因为服务器既可以用一个 JSON 对象回答请求，也可以使用仅属于该请求的 SSE stream，在最终响应前发送进度或日志 notification。服务器接受 notification POST 后返回没有响应体的 `202 Accepted`；notification 本来就没有 JSON-RPC reply。

当前版本没有 GET endpoint、session 或断点恢复。现代服务器收到针对 MCP endpoint 的 GET 或 DELETE 时返回 `405 Method Not Allowed`。它既不生成也不读取 session header；SSE stream 中断后，客户端不会携带 replay id 重连，而是直接认定该请求丢失，并在重试安全时用新的 JSON-RPC id 重新发起。服务器开启长连接 stream 时，应发送 `X-Accel-Buffering: no`，避免 reverse proxy 缓冲事件；还应不时发送 SSE comment 作为 keep-alive，防止空闲期被 idle timeout 关闭。

Origin 验证只有一个目的：即使 MCP 服务器绑定到 `127.0.0.1`，恶意网页仍可通过 DNS rebinding 访问它，除非服务器检查请求来源。如果存在 `Origin` header 且不在允许列表中，服务器返回 `403 Forbidden`。没有 `Origin` 的客户端（例如非浏览器 HTTP 客户端）并不会自动变得可疑。这不是身份认证；服务器仍需在 Origin 验证之外执行自己的 bearer-token 检查。

### Header 镜像及其契约

Streamable HTTP 将少数请求体字段镜像到 header，使 gateway 或 load balancer 无需解析 JSON 即可路由 MCP 流量。每个 POST 都携带 `MCP-Protocol-Version`，其值必须等于 `params._meta["io.modelcontextprotocol/protocolVersion"]`。每个 request 都携带 `Mcp-Method`，其值等于 JSON-RPC `method`。`tools/call`、`resources/read`、`prompts/get` request 还携带 `Mcp-Name`，其值等于 `params.name`；资源读取则等于 `params.uri`。如果这些 header 与请求体不一致或缺失，服务器使用 HTTP `400` 拒绝请求，并返回错误码为 `-32020`（`HeaderMismatch`）的 JSON-RPC 错误。这不是建议：不同网络组件可能对哪个值才是真的意见不一——gateway 按 header 路由，而服务器按请求体执行——攻击者正会利用这道缝隙。

工具还可以通过属性 schema 中的 `x-mcp-header`，要求客户端把某个参数镜像进 header。标记为 `"x-mcp-header": "Region"` 的参数会变成 `Mcp-Param-Region` header，携带与请求体 `arguments.region` 相同的值。header 值必须是可见 ASCII；非 ASCII 字符、控制字符、首尾空白，或本身看起来像 sentinel 的值，都要先编码为 `=?base64?{value}?=` 再发送，服务器会先解码 sentinel，再与请求体比较。header 名称不区分大小写；header 值（包括 method 和工具名）区分大小写。镜像还有自身限制：只适用于从 schema 根部静态可达的 integer、string、boolean 参数，不适用于 `number`；在 Streamable HTTP 上，如果工具的 `x-mcp-header` 值违反这些限制，客户端必须将该工具排除在 `tools/list` 结果之外，而不能调用它；服务器开发者不应标记 API key 或 token 等敏感参数，因为每个 proxy、load balancer 和沿途日志都能看到 header 值。

运行在可靠字节流之上的自定义传输应复用 stdio framing，而不是另起炉灶，因为 stdio 本质上就是字节流上的换行分隔 JSON-RPC。2024-11-05 的旧 HTTP+SSE 传输已 Deprecated；新服务器不应采用，现有实现则应迁移到 Streamable HTTP。

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: run_report
Mcp-Param-Region: us-west1

{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "run_report", "arguments": {"region": "us-west1", "dataset": "signups"}, "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}
```

```json
{"jsonrpc": "2.0", "id": 7, "error": {"code": -32020, "message": "Header mismatch: Mcp-Method", "data": {"headers": ["Mcp-Method"]}}}
```

```figure
mcpa-19-transports
```

## 交互实验

图中并列展示 stdio 和 Streamable HTTP。左侧，客户端与服务器通过 `stdin`、`stdout` 和虚线表示的 `stderr` 交换行数据，完全没有 header 层，所有字段都位于 `_meta`。右侧，客户端向一个 endpoint 发 POST，服务器返回响应；箭头中间有一个检查点，服务器在此比较镜像 header 与请求体。若不一致，结果会变成 `400` 加 `-32020`，不会进入工具。沿两条路径追踪同一次调用，你会发现 JSON-RPC 请求体几乎不变，变化的只是外层 envelope。

## 实践实验

打开 `code/main.py`。它构建了一个服务器，其中 `run_report` 工具的 `region` 参数标记为 `x-mcp-header: Region`，然后用三种方式驱动同一次调用。`call_stdio` 将请求直接发送给服务器，模拟子进程看到的内容，并通过 `frame_message` 与 `parse_frames` 提供 framing。`call_http` 使用 `build_http_headers` 构建镜像 header，再用 `handle_http_request` 验证，之后才分派给服务器；请求和响应都会包装为 `{"http": {...}, "message": {...}}` 后写入日志。`call_http_with_header_mismatch` 使用同一个请求，只把 `Mcp-Method` header 改成 `prompts/get`，展示由此产生的 `400` 加 `-32020`。该记录用 `"violation"` 包装，transcript checker 会跳过其中故意错误的 header，转而验证紧随其后的实际错误响应。

```bash
python3 code/main.py
```

不会成为 JSON-RPC 消息的结果——GET 或 DELETE 的 `405`、不允许 Origin 的 `403`、接受 notification 后无响应体的 `202`——不会出现在 transcript 中，因为根本没有可表示它们的 `result` 或 `error` 对象。它们位于 `handle_http_get_or_delete`、`validate_origin`、`handle_http_notification` 及对应测试中。尝试把 `region` 参数改成包含逗号或非 ASCII 字符的值后重新运行；观察 `encode_header_value` 如何切换为 base64 sentinel，并确认 `decode_header_value` 能精确还原原值。

## 交付产物

`outputs/transport-selection-guide.md` 是一页参考资料：何时选择 stdio 或 Streamable HTTP；包含来源字段与适用请求的准确 header 表；base64 sentinel 规则；以及 GET、DELETE、错误 Origin、header 不匹配、接受 notification 的状态码决策清单。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会验证本课结论：stdio frame 能通过 `parse_frames` 往返；带嵌入换行的格式化消息会被拒绝；`tools/call` 的镜像 header 与请求体完全一致，包括 `x-mcp-header` 参数；base64 sentinel 编码符合规范示例并可还原；`resources/read` 的 `Mcp-Name` 来自 `params.uri`，没有 name 字段的方法则省略它；匹配 header 通过验证，改动后的 `Mcp-Method` 返回 `400` 和 `-32020`；不允许的 Origin 返回 `403`，允许或缺失 Origin 不会；GET、DELETE 都返回 `405`；接受 notification 返回 `202`；transcript 中故意制造的不匹配示例被包装为 violation，且后面立即跟着真实错误响应。仓库 wire checker 也会按 2026-07-28 规则验证 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/19-transports-and-http-headers
```

## 综合项目关联

综合项目的端到端交互必须通过某种传输方式，所携带的每个 header 也必须满足本课构建的“请求体才是真相”规则：镜像字段只服务于路由，绝不是第二个权威来源。综合项目场景在 wire 层验证请求时，运行的就是你在这里实现的 header 与请求体比较；当它解释中断的 stream 为何不能直接恢复时，依赖的也是同一种无状态性——stdio 重启和 HTTP 重发都建立在它之上。

## 关键术语

| 术语 | 含义 |
|------|------|
| stdio | 客户端将服务器作为子进程启动并与之通信时使用的传输 binding |
| Streamable HTTP | 每条 JSON-RPC 消息都通过独立 POST 发送到同一个 MCP endpoint 的传输 binding |
| Frame | stdio 上一条以换行分隔、内部绝不包含嵌入换行的 JSON-RPC 消息 |
| `MCP-Protocol-Version` | 必须等于请求 `_meta` 中协议版本的必需 header |
| `Mcp-Method` | 镜像 request JSON-RPC `method` 的必需 header |
| `Mcp-Name` | 为 `tools/call`、`resources/read`、`prompts/get` 镜像 `params.name` 或 `params.uri` 的 header |
| `x-mcp-header` | 将一个工具参数镜像到 `Mcp-Param-{Name}` header 的工具 schema annotation |
| Base64 sentinel | 当 header 值不能安全使用纯 ASCII 表示时采用的 `=?base64?{value}?=` 编码 |
| `HeaderMismatch` | 镜像 header 与请求体不一致时，服务器随 HTTP `400` 返回的 `-32020` 错误 |
| Origin 验证 | 拒绝不允许的 `Origin` header 并返回 `403`，用于防御 DNS rebinding 的检查 |

## 延伸阅读

- [传输概览](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [stdio 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [工具定义：x-mcp-header](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 9 节
- `phases/13-tools-and-protocols/09-mcp-transports`，更深入讲解同一个 POST-only 契约
