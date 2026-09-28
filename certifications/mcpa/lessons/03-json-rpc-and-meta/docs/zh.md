# JSON-RPC 信封

> 即使服务端从未与你交互过，也必须仅凭这一条消息知道：你是否期待响应、使用哪个协议版本，以及元数据在哪里结束、参数从哪里开始。

**类型：** Reference
**语言：** Python
**前置要求：** 第 02 课
**预计时间：** 约 45 分钟

## 学习目标

- 把线上任意一条 2026-07-28 消息归类为请求、通知、结果响应或错误响应，并说明决定每种类型的 id 规则
- 解释 resultType 的含义、为什么 complete 与 input_required 是两个核心值，以及客户端必须如何处理未知值或缺失值
- 按前缀与名称语法验证 `_meta` 键名，并通过检查第二个 label 而非第一个 label，区分 MCP 保留前缀与只是看起来相似的前缀
- 说出请求、通知和结果各自携带的保留 `_meta` 键，以及前缀规则为 OpenTelemetry trace context 设置的唯一例外
- 解释为什么缺少必需 `_meta` 字段的请求要以 `-32602` 拒绝，以及为什么两条 MCP 消息绝不会组成同一个 batch 传输

## 问题背景

第 02 课展示了一个客户端如何发现两个从未见过的服务端，并在二者上调用工具。这些交互之下还有一个更小、更尖锐的问题，考试要求你不假思索就能回答：面对一包刚从 stdio 到达，或刚落入 Streamable HTTP POST body 的任意 JSON，它属于哪种消息？接收方可以对它做出哪些假设？

JSON-RPC 2.0 为 MCP 提供四种形状。规范严格规定接收方如何区分它们，因为无状态服务端没有连接级约定可供兜底。从来没有开场握手来规定“这条连接使用版本 X”或“这条 stream 只承载客户端 Y 的请求”。每条消息都必须携带足够的自身身份信息，使接收方能够独立处理它；即使上一条消息由完全不同的服务端 replica 处理，也必须每次得出相同结论。

这种自描述发生在两层。外层是信封本身：这是期待回复的请求、不应回复的通知、完成工作的结果，还是未能完成工作的错误？如果 `id` 字段用错，服务端就无法区分请求和通知，客户端也无法把响应匹配回产生它的调用。内层是 `_meta`：请求、通知或结果可以通过它携带协议级事实，例如请求声明使用的协议版本，同时避免这些事实与应用参数中恰好名为 `version` 或 `capabilities` 的字段冲突。如果 `_meta` 命名规则出错，服务端专有字段可能悄悄覆盖协议依赖的字段，或反过来被协议字段覆盖。

## 核心概念

**四种形状，各有一条判定规则。** 请求包含 `id`、`method` 和可选的 `params`；id 必须是字符串或整数，绝不能是 `null`，也不能与发送方仍在等待响应的其他 id 重复。

```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "get_weather", "arguments": {"location": "Pune"}}}
```

通知包含 `method` 和可选的 `params`，完全不能包含 `id`。接收方绝不能回复，无论成功还是失败。

```json
{"jsonrpc": "2.0", "method": "notifications/progress", "params": {"progressToken": 7, "progress": 1, "total": 2}}
```

结果响应回显请求的 `id`，并携带 `result` 对象。该对象必须包含 `resultType` 字段。

```json
{"jsonrpc": "2.0", "id": 7, "result": {"resultType": "complete", "content": [{"type": "text", "text": "Pune: sunny, 26C"}], "isError": false}}
```

错误响应同样回显请求的 `id`，只有一种例外：请求本身格式错误到无法读取 id。错误响应包含 `error` 对象，其中 `code` 为整数、`message` 为字符串，还可以附加 `data` 字段。

```json
{"jsonrpc": "2.0", "id": 3, "error": {"code": -32602, "message": "Missing required _meta field(s): io.modelcontextprotocol/protocolVersion"}}
```

**resultType 告诉客户端如何解读后续内容。** 值为 `"complete"` 表示结果包含最终内容，无需继续操作。值为 `"input_required"` 表示结果是 `InputRequiredResult`，即多轮往返模式在原始调用完成前向客户端索取更多输入时使用的形状；重试机制会在后续课程单独讲解。扩展可以注册其他值，例如长时任务使用的 `"task"`，但只有客户端公布了对应能力时才有效。客户端收到无法识别的 resultType 时，必须把结果视为无效，不能猜测其形状；如果客户端正在与从不发送 resultType 的早期协议版本服务端通信，则必须把缺失字段视为 `"complete"`。这是这条严格规则唯一保留的向后兼容空间。

**`_meta` 把协议事实与应用自身命名空间隔开。** `_meta` 键由两部分组成：可选前缀和名称。前缀存在时，由一个或多个以点分隔的 label 加斜杠组成；每个 label 以字母开头，以字母或数字结尾，中间可使用字母、数字或连字符。名称非空时，以字母或数字开头和结尾，中间可使用字母、数字、连字符、下划线和点。只要前缀的第二个 label——不是第一个——为 `modelcontextprotocol` 或 `mcp`，该前缀就保留给 MCP 使用。大多数考题陷阱都藏在“第二个”这个词里：`io.modelcontextprotocol/protocolVersion` 与 `dev.mcp/anything` 都是保留前缀，因为 `modelcontextprotocol` 和 `mcp` 位于第二个位置。`com.example.mcp/scanId` 不是保留前缀，因为第二个 label 是 `example`，`mcp` 只出现在第三个位置。`mcp.example/thing` 也不受此规则保留，因为 `mcp` 位于第一个 label，第二个位置没有保留词。规范鼓励实现为自定义前缀使用反向 DNS 记法，例如 `com.example/`，而不是 `example.com/`，从而让命名空间冲突成为明确选择，而不是意外。

**每个请求都声明自己的版本和能力；每个结果都可以说明是谁回答。** 每个请求中有三个位于 `io.modelcontextprotocol/` 下的重要 `_meta` 键：`protocolVersion`（字符串，必需）、`clientCapabilities`（对象，必需，可以为空）和 `clientInfo`（用于命名客户端的 `Implementation`；并非严格必需，但除非客户端被特意配置为省略，否则每个请求都应携带）。第四个键 `logLevel` 让单个请求选择接收已弃用 logging 功能的日志通知；后续有关弃用客户端功能的课程会完整讲解。缺少任一必需字段的请求都属于格式错误，符合规范的服务端必须以 JSON-RPC error `-32602` 拒绝；使用 HTTP 传输时还要返回 `400 Bad Request`。响应方向上，服务端应在结果的 `_meta` 中附加 `io.modelcontextprotocol/serverInfo`，说明产生响应的实现。`clientInfo` 和 `serverInfo` 都由发送方自行报告，协议绝不会验证；它们只用于显示、日志和调试。如果服务端或 gateway 让任一字段影响授权或路由决策，就是把礼貌性信息误当成凭据。

**另有少量键直接被保留。** 不带前缀的 `progressToken` 让请求选择接收进度通知。`io.modelcontextprotocol/subscriptionId` 出现在通过 `subscriptions/listen` stream 投递的每条通知上，使客户端知道通知来自哪个订阅；后续通知与订阅课程会完整构建该机制。`traceparent`、`tracestate` 和 `baggage` 是前缀规则唯一有意设置的例外：OpenTelemetry 自身的 trace-context 约定要求使用这些无前缀的确切名称，因此 MCP 直接保留它们，避免破坏与现有 tracing 工具的互操作性。这项选择记录在 SEP-414 中。

**消息从不结伴传输。** JSON-RPC batching 已在 MCP 2025-06-18 修订版中移除，之后没有恢复。Streamable HTTP 的一个 POST body 只携带一个请求或一个通知；stdio 中每一条以换行分隔的记录也只携带一条消息。如果客户端准备好了三个请求，就发送三个 POST body，而不是一个包含三个元素的数组。

```figure
mcpa-03-envelope
```

## 交互实验

图的上半部分把四种形状并排列出，并标出各自的决定性字段：请求使用非 null id，通知完全没有 id，结果依赖 resultType，错误包含 code 与 message。下半部分两次放大单个 `_meta` 键，沿斜杠拆分 label 与名称。`io.modelcontextprotocol/protocolVersion` 高亮第二个 label `modelcontextprotocol`，说明它为什么被保留。`com.example.mcp/scanId` 也高亮第二个 label，但这里是 `example`，所以即使字符串后面出现 `mcp`，仍不属于保留前缀。把两行放在一起看，陷阱就很清楚：位置决定前缀是否属于 MCP，而不是有没有出现某个词。

## 实践实验

打开 `code/main.py`。它不联网，也不使用 SDK，只包含本课讲解的消息形状。`classify_message` 查看原始 dict 并返回 `"request"`、`"notification"`、`"result"`、`"error"` 或 `"invalid"`，严格采用上面的 id 规则：有 `method` 且没有 `id` 是通知；有 `method` 且 id 合法是请求；有 `method` 但 id 为 `null` 两者都不是，因此返回 invalid。`meta_key_status` 接收键字符串，返回 `"reserved"`、`"free"` 或 `"invalid"`，应用前缀语法与第二 label 规则完成判断。

```bash
python3 code/main.py
```

先对照核心概念阅读打印的分类列表，再观察 `run_scenario` 执行一段短交互：格式正确的 `tools/call` 请求得到 complete 结果；`notifications/progress` 通知不收到回复；另有三个故意制造的错误，wire checker 会把它们当作违规示例而非真实流量，每个都标明错误原因。第一项是通知携带了不该有的 id；第二项是请求 id 为 `null`；第三项是请求完全缺少 `_meta`。第三项后面紧跟符合规范的服务端应发送的真实 `-32602` 错误，由处理正常调用的同一个 `handle_request` 函数产生。把缺失字段从 `protocolVersion` 改为 `clientCapabilities` 后重新运行，观察错误消息改为指出另一个键。

## 交付产物

`outputs/message-shapes-reference.md` 是四种消息形状、resultType 值、写明第二 label 判断方法的 `_meta` 语法，以及完整保留键表的一页式参考，每一行都引用研究简报。阅读原始 MCP 流量时把它放在手边，可以快速回答“这个形状有效吗”和“这个键归我使用吗”。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课中的主张：四种形状均能正确分类；null 请求 id 和携带 id 的通知都会被拒绝；缺少 resultType 的结果会被标记；`io.modelcontextprotocol/protocolVersion` 与 `dev.mcp/anything` 返回 reserved，`com.example.mcp/anything` 返回 free；四个无前缀保留键可被识别；格式错误的键名无效；缺少 `protocolVersion` 或 `clientCapabilities` 的请求均返回 `-32602`；格式正确的请求正常完成；transcript 中每个未包装结果都携带 resultType。仓库的 wire checker 会按照完整的 2026-07-28 规则验证同一份 transcript，包括三个故意违规示例的包装方式：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/03-json-rpc-and-meta
```

## 综合项目关联

第 04 课直接基于本课定义的信封构建无状态性：服务端之所以能把每个请求当作自包含消息，是因为每个请求已经在 `_meta` 中携带版本与能力，连接上没有任何需要推断的遗留信息。第 18 课的错误分类假设你已经知道：格式错误的 `_meta` 会产生 `-32602`，错误响应的 `data` 字段可选。综合项目的端到端交互以与本课实践实验完全相同的请求开场，包括 `_meta`；如果第一层信封就错了，后面的一切都无法工作。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 请求 | 包含 `id`、`method` 和可选 `params` 的消息；期待恰好一个回复 |
| 通知 | 包含 `method` 和可选 `params`、绝不包含 `id` 的消息；不会收到回复 |
| 结果响应 | 回显请求 id，并携带包含 resultType 的 `result` 对象的回复 |
| 错误响应 | 携带 `error` 对象的回复，其中 `code` 为整数、`message` 为字符串 |
| resultType | 标明结果类型的字段：complete、input_required 或扩展值 |
| `_meta` | 携带协议级元数据的属性；键由可选点分前缀加名称组成 |
| 保留前缀 | 第二个点分 label 为 `modelcontextprotocol` 或 `mcp` 的 `_meta` 前缀 |
| protocolVersion | 标明请求所用协议版本的必需 `_meta` 字段 |
| clientCapabilities | 标明单个请求相关能力的必需 `_meta` 字段 |
| 自报告字段 | clientInfo 与 serverInfo；由发送方提供，未经验证，不能作为安全信号 |

## 延伸阅读

- [MCP 2026-07-28 规范：基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)，重点阅读 Messages 与 `_meta` 通用字段
- [SEP-414：在 `_meta` 中传递 OpenTelemetry trace 上下文](https://modelcontextprotocol.io/seps/414-request-meta)
- [TypeScript Schema：全部消息格式的权威定义](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 2、3 节
