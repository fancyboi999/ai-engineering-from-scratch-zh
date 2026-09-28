# 请求失败的两种方式

> 失败的请求不能自创一套术语。MCP 2026-07-28 规定了少量固定错误码，将所有失败分入两条通道，并明确划出一组永远不能使用的编号。

**类型：** Reference
**语言：** Python
**前置要求：** 第 17 课
**预计时间：** 约 45 分钟

## 学习目标

- 区分协议错误与工具执行错误，并判断服务器该用哪条通道返回具体失败
- 说出 MCP 保留的三个错误码 `-32020`、`-32021`、`-32022`，以及各自携带的数据
- 应用 2026-07-28 错误码分配策略：旧版子区间、规范保留子区间，以及应用自定义错误码应放的位置
- 将 JSON-RPC 错误码映射到 Streamable HTTP 服务器必须同时返回的 HTTP 状态
- 解释为什么 2026-07-28 实现绝不能发出 `-32002` 和 `-32042`，以及两者分别由什么取代

## 问题背景

没有认真设计失败处理的服务器，往往会边开发边发明错误术语。缺少参数用一个临时错误码，下游超时再用一个，权限问题则变成塞在 message 字段里的自造字符串。这些约定无法跨系统通用。另一个团队开发的客户端不可能知道某台服务器随手挑的数字究竟是什么意思；两台服务器也可能都图方便使用 `-32001`，表达的却是完全无关的错误。这并非假设：2026-07-28 分配策略出台前，仅“资源不存在”这一种情况，各官方 MCP SDK 就意见不一。四个使用 `-32002`，一个使用 `-32602`，一个使用 `-32603`，还有一个使用普通的零。客户端若想跨服务器可靠识别“资源不存在”，只能逐个适配 SDK。

最难承受这种混乱的，恰恰是最没有猜测空间的一方：负责决定下一步动作的模型。如果工具调用失败后只返回一条不透明的 JSON-RPC 错误，且客户端在它进入模型上下文前就将其吞掉，模型便无从学习。它可能重复同一个错误调用，也可能放弃一个本可通过修正参数完成的任务。第 17 课的生命周期检查点已经勾勒出轮廓：验证、能力检查和执行都可能失败，而把所有失败一概处理，会丢掉调用方本可用于恢复的信息。本课给出每个错误的准确编号、传输通道，以及永远不能使用的编号。

## 核心概念

每个 MCP 失败都只会通过两条通道之一返回。按规范自己的说法，选对通道是整个错误模型中最常受考查的区别。

**协议错误**表示请求本身有问题：方法不存在、服务器没有暴露指定工具、缺少必填字段，或服务器内部故障。它是标准 JSON-RPC error 对象，通常由客户端自行处理，而不会展示给模型：

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "error": {
    "code": -32602,
    "message": "Unknown tool: delete_everything"
  }
}
```

**工具执行错误**表示请求有效、服务器运行了工具，但工具遇到调用方可以修正的问题：参数缺失或形状不对、下游 API 失败、输入违反业务规则、handle 已过期。它是带有 `isError: true` 的普通 `complete` 结果，模型能够直接读取内容并自行修正：

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "resolution is required for close_ticket"}],
    "isError": true
  }
}
```

2026-07-28 之前，规范对这一区分的指引并不清楚：早期版本把“无效参数”描述为协议错误，却把“无效输入数据”归为工具执行错误，没有划出明确边界。SEP-1303 将两者统一归入工具执行错误，消除了模糊地带。缺少必填字段、类型错误、值超出范围，全都使用 `isError: true`，绝不使用 `-32602`。未知工具仍是协议错误，因为参数无从修正——工具本身就不存在。

标准 JSON-RPC 2.0 错误码承担基础协议失败：`-32700` 是解析错误（请求体不是有效 JSON，因此无法读出 `id`，报告为 `null`）；`-32600` 是无效请求（JSON 有效，但不是格式正确的 JSON-RPC 对象）；`-32601` 是找不到方法（服务器没有实现该方法）；`-32602` 是无效参数（未知工具、请求缺少必需的 `_meta`、资源不存在、prompt 参数无效、分页 cursor 无效）；`-32603` 是内部错误（服务器自身失败）。尤其要记住 `-32601` 与 `-32602` 的区别：`-32601` 针对 *method*，`-32602` 针对请求中*其他所有错误*，包括服务器从未见过的工具名。

JSON-RPC 将 `-32000` 至 `-32099` 保留给实现自定义的服务器错误，而 2026-07-28 分配策略进一步清晰划分了这段空间。`-32000` 至 `-32019` 属于旧版区间，即该策略出台前各实现自行选择的错误码。新实现不得在这里分配编号，也应避开整个子区间。`-32020` 至 `-32099` 留给规范本身，其中只定义了三个错误码：

```json
{"code": -32020, "message": "Header mismatch: Mcp-Name header value 'foo' does not match body value 'bar'"}
```

`-32020` 是 `HeaderMismatch`：HTTP header 与请求体不一致，或缺少必需 header。`-32021` 是 `MissingRequiredClientCapability`：服务器需要某项能力，但当前请求的 `clientCapabilities` 未声明；错误通过 `data.requiredCapabilities` 列出缺失能力，这与第 07 课的逐请求协商相呼应。`-32022` 是 `UnsupportedProtocolVersion`：请求的协议版本不受服务器支持，并携带 `data.supported`（列表）和 `data.requested`，也就是第 05 课介绍的版本协商结构。除这三个错误码外，严禁发出 `-32020` 至 `-32099` 范围内的任何其他编号。

有两个错误码已明确退役，绝不能出现在 2026-07-28 响应中。`-32002` 在 2025-11-25 及更早版本中表示资源不存在；各 SDK 对旧建议的实现无法统一后，SEP-2164 将其替换为 `-32602`。`-32042` 是更窄的“需要 URL 模式 elicitation”错误码，只存在于 2025-11-25 版本；它没有直接替代项，因为 URL 模式 elicitation 现在通过普通 MRTR 流程协商，而非专用错误。为了向后兼容，宽容的客户端仍可接受旧服务器返回的 `-32002`，但 2026-07-28 服务器绝不能生成它。

既不适合已定义 MCP 错误码，也不适合 `isError` 的应用自定义错误码，应完全放在 `-32768` 至 `-32000` 这一整个 JSON-RPC 保留范围之外。实践中这种情况应该很少见：SEP-1303 的目的正是让实现先选择 `isError`，而不是先发明新编号。

在 Streamable HTTP 上，其中一些错误码有规定的 HTTP 状态。header 不匹配、缺少能力、版本不受支持，以及缺少 `_meta` 的畸形请求，都对应 `400 Bad Request`：

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/list

```

如果该请求的 header 与请求体不一致，或请求体完全缺少 `_meta`，响应就是 `400`，并在其中包含相应 JSON-RPC 错误。未知方法则返回 `404 Not Found`，因为失败来自 endpoint 自身的路由，而非消息结构。JSON-RPC 层之外，还有一些传输和授权事件只带 HTTP 状态，完全没有 JSON-RPC 错误：服务器接受 notification 后返回无响应体的 `202 Accepted`；对现代 MCP endpoint 发送 `GET` 或 `DELETE` 返回 `405 Method Not Allowed`；bearer token 缺失或无效返回 `401 Unauthorized`；OAuth scope 不足返回 `403 Forbidden`。

最后，有一条很窄的例外：错误响应总会回显请求 `id`，除非该 id 根本无法读取，例如请求体一开始就无法解析为 JSON。此时响应报告 `id: null`，因为没有任何 id 可供回显。

```figure
mcpa-18-error-taxonomy
```

## 交互实验

图中并排列出两条通道。左栏包含本课场景中协议错误可以携带的五个错误码，每个都是由客户端读取并自行处理的小框。右栏只有一张卡片：无论工具层问题由什么引起，都归入同一种 `isError: true` 结构；只有这条通道会把普通内容送达模型。底部虚线区域是禁区：旧版子区间和两个明确退役的错误码，合规实现绝不能越界使用。

## 实践实验

`code/main.py` 构建了一个包含两个工具的小型 helpdesk 服务器，以及一个覆盖本课全部场景的客户端：正常发现与工具调用、缺少参数、无效枚举值、调用不存在的工具、调用需要但请求未声明的能力、不受支持的协议版本，以及完全缺少 `_meta` 的请求。从仓库根目录运行：

```bash
python3 certifications/mcpa/lessons/18-error-handling/code/main.py
```

先读防护函数：`is_forbidden_error_code` 以纯函数实现分配策略，`safe_error` 则会在构造任何错误响应前调用它。服务器返回的每个错误都经过 `safe_error`，所以禁用错误码不会意外流到 socket。transcript 末尾附近有两条标记为 `violation` 的记录：它们展示不合规服务器可能错误返回的旧版“工具调用失败”错误码和已退役“资源不存在”错误码。两条记录都明确包裹为反例，绝不属于真实协议行为。你可以在 shell 中亲自调用 `main.safe_error(1, -32050, "made up")`，观察它如何在构造任何响应前抛出 `ForbiddenErrorCode`；再试试三个已定义保留错误码之一 `main.safe_error(1, -32021, "fine")`，它会正常成功。

## 交付产物

`outputs/error-code-decision-table.md` 是一张四步决策表：选择通道、选择错误码、确认错误码不在禁用列表中，以及在没有其他合适方案时正确放置应用自定义错误码。它还包含 HTTP 状态映射，以及完全不携带 JSON-RPC 错误的传输事件。审查服务器错误处理时可以随手查阅。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的关键结论：未知工具使用 `-32602`；未知方法使用 `-32601` 并映射到 HTTP 404；缺失或无效参数使用 `isError: true`，而不是协议错误；缺少 `_meta` 的请求使用 `-32602` 并映射到 HTTP 400；不受支持的版本携带 `data.supported` 和 `data.requested`；缺少能力时携带 `data.requiredCapabilities`；声明能力后调用能够通过；防护函数拒绝 `-32001`、`-32002`、`-32042` 和任意未定义的保留错误码，同时允许三个已定义错误码以及完全位于保留范围之外的编号；解析失败报告 null id；完整 transcript 除 `violation` 包装之外绝不携带禁用错误码。仓库的 wire checker 还会直接按 2026-07-28 规则验证同一份 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/18-error-handling
```

## 综合项目关联

综合项目的端到端交互每次内部出错时都依赖本课规则：schema 无效的工具调用必须作为 `isError` 返回，使模型能在继续运行前自行修正；被篡改的 MRTR `requestState` 必须遭到拒绝，不能临时发明新错误码；为错误 audience 签发的 token 必须按第 23 课的方法拒绝，不能塞进某个临时协议错误。综合项目要求你说明失败响应的依据时，答案永远是两条通道之一和本课表格中的某个错误码，而不是临场自造的数字。

## 关键术语

| 术语 | 含义 |
|------|------|
| 协议错误 | 请求本身有误时使用的 JSON-RPC error 对象：未知方法、未知工具、畸形 envelope、服务器故障 |
| 工具执行错误 | 带有 `isError: true` 的普通 `complete` 结果；模型可以读取内容并自行修正 |
| 分配策略 | 2026-07-28 规则，将 `-32000` 至 `-32099` 划分为旧版子区间和规范保留子区间 |
| `HeaderMismatch` | `-32020`，当 HTTP header 与请求体不一致或缺少必需 header 时返回 |
| `MissingRequiredClientCapabilityError` | `-32021`，当请求需要自身 `clientCapabilities` 未声明的能力时返回，并携带 `data.requiredCapabilities` |
| `UnsupportedProtocolVersionError` | `-32022`，当请求指定服务器未实现的版本时返回，并携带 `data.supported` 和 `data.requested` |
| 已退役错误码 | 过去版本定义、但 2026-07-28 禁止发出的错误码，例如 `-32002` 或 `-32042` |
| `safe_error` | 本课的防护函数：在构造响应前拒绝禁用错误码 |

## 延伸阅读

- [基础协议：错误码](https://modelcontextprotocol.io/specification/2026-07-28/basic/index#error-codes)
- [工具：错误处理](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling)
- [Streamable HTTP：服务器验证与 header 要求](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#server-validation)
- [SEP-1303：将输入验证错误作为工具执行错误](https://modelcontextprotocol.io/seps/1303-input-validation-errors-as-tool-execution-errors)
- [SEP-2164：统一资源不存在错误码](https://modelcontextprotocol.io/seps/2164-resource-not-found-error)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5 节
