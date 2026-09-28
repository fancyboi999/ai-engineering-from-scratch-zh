# 用一个 Trace ID 连接可审计性与可观测性

> Trace ID 是贯穿客户端、服务器及其后续调用的一次请求的唯一值；哈希链则让你在几个月后仍能证明，事件记录没有被悄悄修改。

**类型：** Reference
**语言：** Python
**前置要求：** 第 26 课
**预计时间：** 约 45 分钟

## 学习目标

- 按 SEP-414 定义的 W3C 格式，通过 `_meta` 在客户端、服务器和服务器代表调用方发起的上游调用之间传播 OpenTelemetry trace context：`traceparent`、`tracestate` 和 `baggage`
- 生成并验证 W3C `traceparent` 的四个小写十六进制分段（version、trace id、parent id、flags），派生子 span 时保留 trace id，并在每一跳生成新的 parent id
- 解释为什么 logging 已被弃用，stdio 应改写 `stderr`，结构化可观测性应采用 OpenTelemetry；同时说明弃用后单请求日志级别仍有什么作用
- 构建审计记录：使用已认证 principal 而非自行报告的 `clientInfo`，在条目产生之前脱敏标记参数，并按 request id 与 trace id 关联活动
- 验证哈希链审计日志，准确解释篡改会在哪里暴露及其原因，并把不具备此属性的日志视为主张而非证据

## 问题背景

某个账户的 API key 被轮换。这次调用实际涉及两个程序：支持人员调用的服务台工具，以及该工具在幕后要求持久化新值的凭据保管库。一个月后，审核人员提出三个直白的问题：证明轮换确实发生过，证明是谁发起的，还要证明展示的记录自写入后未被修改。两份日志文件——每项服务一份，各用自己的时钟和仅在自身进程内有意义的 request id——回答不了这些问题。在第一个问题还没弄清前，它们反而带来第二个问题：怎么证明这两行描述的是同一个事件？

风险与安全控制课构建了决定调用是否获准发生的机制：固定描述符、扫描注入指令、禁止把凭据转发到上游。但这些都不能证明实际运行了什么。控制是门，记录是记忆。本课来构建这份记忆：一个贯穿单次请求所触及的所有程序的值，以及由各程序独立保存、可供审核者信赖且不会事后改写的日志。

## 核心概念

MCP 在无意中已经解决了一半问题。协议是无状态的，服务器不能从共享连接推断请求信息，因此每个请求已经在 `_meta` 中携带自己的身份信息：协议版本和 capabilities，正如 json-rpc-and-meta 课程最初所讲。同一个区块恰好也是 correlation id 的归宿。SEP-414 为这个 id 规定了名称和格式，不让每个 SDK 各自发明：`traceparent`、`tracestate` 和 `baggage`。它们是 `_meta` 前缀规则中唯一有意设置的例外，使 MCP 能兼容已经读取这些裸键名的 OpenTelemetry 工具。

`traceparent` 由四个连字符分隔的小写十六进制分段组成，长度始终固定：两个字符的 version、32 个字符的 trace id、16 个字符的 parent id，以及两个字符的 flags 字节。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "reset_api_key",
    "arguments": {"account_id": "acct-42", "new_key": "k-8f2c9e"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    }
  }
}
```

Trace id 标识完整操作，在整个操作期间保持不变。Parent id 标识一个 span，也就是一跳的工作。规范参与方绝不会把他人的 parent id 复用为自己的 id。`ops-desk` 收到上述请求后，需要调用 `credential-vault` 才能真正轮换 key。它不会原样转发 `traceparent`，而是生成新的 parent id、保留同一 trace id，再把这组值作为出站调用自己的 `traceparent` 发送。

```python
def child_traceparent(value):
    parsed = parse_traceparent(value)
    return make_traceparent(parsed["trace_id"], new_span_id(), sampled=parsed["flags"] != "00")
```

全零的 trace id 或 parent id 本身就是无效值，这是 W3C 格式用来捕获从未真正运行过的生成器的办法。`tracestate` 和 `baggage` 的行为不同：与 parent id 不同，转发它们时无需在每一跳修改。因此，本课服务器会原样传递二者，调用方第一次调用时设置的值，在操作最后一跳仍保持不变。

这里也正是 logging 退场的位置。本修订版已弃用 logging：过去依靠 `notifications/message` 获得可见性的服务器，现在应在 stdio 上写入 `stderr`，需要结构化数据时则采用 OpenTelemetry。机制不会一夜消失。请求若仍在 `_meta` 中设置 `io.modelcontextprotocol/logLevel`，仍可能在自身响应流上收到达到或高于该级别的 `notifications/message`，但不会出现在其他地方。即使 logging 最有用时，也不具备持久性：它是实时信息流，有人观看才能看到，无人观看就会消失。Trace id 解决关联问题，却不能单独回答审核者真正关心的问题——如何获得一份比写入时刻活得更久的记录。

这份记录就是审计条目。它只有回答五件事，才配得上“审计”二字：谁、做了什么、何时发生、结果通过哪个通道返回，以及如何与同一操作中发生的其他事件关联。“谁”必须是已认证 principal，即 bearer token 等有效凭据真正解析出的身份，绝不能是调用方可随意设置的 `io.modelcontextprotocol/clientInfo`。早在 json-rpc-and-meta 课程中，该字段就已被标明只供展示，不是安全信号。“做了什么”包括 method、工具及其参数。所有标记为敏感的内容必须在条目以任何形式存在之前替换为固定标记，使原始 secret 一次也不会写下。“何时”是时间戳。通道是请求实际终结于三者中的哪一个：完成的工具结果、带 `isError` 的工具执行结果，或 JSON-RPC 协议错误。关联信息由本跳唯一的 request id 与同一操作各跳共享的 trace id 组成。于是 `ops-desk` 与 `credential-vault` 各自保存的两个独立哈希链，即使由两个程序分别维护，审核者也能通过匹配 trace id 一起阅读。

只有无法被静默改写的记录才能证明事实，这正是哈希链的用途。每个条目都存储前一个条目的哈希及自身字段摘要，因此条目形成链，而不是一堆散点。修改条目内容却不改其存储哈希，会被立即发现：用新内容重算摘要后，与记录值不匹配，验证就在该处停止。更谨慎的篡改者若连该条目自身的哈希也重算并覆盖，验证仍会在下一个条目失败，因为下一个条目仍把原始哈希作为反向链接，而该链接与篡改后条目产生的新值不再匹配。若要无痕掩盖修改，就必须按顺序重写其后的每个条目；这比编辑一行难得多。哈希链不会像权限检查那样阻止写入，只会让未授权写入可被检测。而审核者说“证明这份记录没被改过”时，真正要求的正是这种属性。

```figure
mcpa-27-trace-propagation
```

## 交互实验

图中，一个 `traceparent` 从客户端调用进入 `ops-desk`，跨越一跳进入 `credential-vault`，再返回；每条箭头上的 trace id 保持不变，parent id 则随跳变化。下方两个小账本代表两台服务器各自独立的哈希链。虽然两份日志从不接触对方的条目或哈希，但都标有同一 trace id。

`code/main.py` 正好构建了这对服务器。`ops-desk` 暴露两个工具：只读且无需脱敏的 `list_recent_grants`，以及会标记 `new_key` 参数的 `reset_api_key`。后者为了真正执行轮换，会通过 `ctx.call_upstream(...)` 调用 `credential-vault` 的 `store_secret`。从仓库根目录运行：

```bash
python3 certifications/mcpa/lessons/27-auditability-and-observability/code/main.py
```

先看线路消息：`reset_api_key` 请求与嵌套的 `store_secret` 请求，其 `traceparent` 共享同一个 32 字符 trace id 分段，只有 parent id 不同。再看打印出的两份审计日志。`ops-desk` 的 `reset_api_key` 条目把 `new_key` 显示为固定标记，同时保留可读的 `account_id`；`credential-vault` 的 `store_secret` 条目则独立地以相同方式脱敏 `secret`，因为每台服务器都在自己的日志上执行自己的脱敏策略。找到 `ops-desk` 中 principal 为 `unauthenticated` 的条目：该调用携带了无人签发的 bearer token，所以没有工具运行，但尝试本身仍被记录。最后两行先对干净的 `ops-desk` 日志调用 `verify()`，然后就地篡改第一个条目的参数并再次调用 `verify()`；结果会翻转，并指出链实际断裂的条目。

## 实践实验

再把链延长一跳。为 `credential-vault` 添加自己的上游服务器 `key-escrow`，其中只有一个工具 `escrow_key`，收到请求后简单确认。更新 `store_secret` 处理器，让它返回前调用 `ctx.call_upstream("escrow_key", {"account_id": arguments["account_id"]})`，使用与 `reset_api_key` 调用 `credential-vault` 相同的模式。再次运行演示，在线路日志中确认三点：`escrow_key` 请求的 `traceparent` 与原始客户端调用和 `store_secret` 携带完全相同的 trace id；它有新的 parent id；request id 与线路上其他 id 均不冲突，因为仍来自同一个共享 `IdSequence`。然后分别对 `ops-desk`、`credential-vault`、`key-escrow` 三台服务器的日志调用 `verify()`，确认每一份都独立返回 `(True, None)`。这证明三个程序维护的三条独立哈希链，仅靠共享 trace id 就能关联到同一次操作。

## 交付产物

`outputs/audit-and-telemetry-spec.md` 是一页式参考资料：其中列出 `traceparent` 字段布局、有效长度和全零拒绝规则，审计条目必须携带的五类字段，以可检查步骤表述的脱敏与哈希链规则，以及 `clientInfo` 绝不能充当 principal 的一句话理由。把它放在风险与安全控制课的威胁控制矩阵旁边：前者说明允许发生什么，后者证明实际发生了什么。

## 验证

从课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会验证本课主张：`traceparent` 符合 W3C 格式，格式错误或全零值会被拒绝；子 span 保留父级 trace id，同时生成新的 parent id；`tracestate` 和 `baggage` 原样到达上游调用；标记参数在两台服务器各自的日志中独立脱敏；记录的 principal 来自 token subject，而不是调用方自行报告的 `clientInfo` 名称；未认证调用在拒绝前仍会记录；干净链可以通过验证；简单修改会在变化条目处被发现；连自身哈希也一并修补的谨慎篡改仍会在后一条目被发现；两台不同服务器日志中的条目可以通过 trace id 关联，而 request id 不同。仓库线路检查器也会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/27-auditability-and-observability
```

## 综合项目关联

第 33 课会组装一次覆盖所有领域的交互，其检查清单直接点名本课构建的两项能力：端到端保留 trace id，以及可验证的审计链。当该交互抵达工具调用时，它已经携带本课格式规则可以接受的 `traceparent`；处理它的服务器应把真实 principal 而非展示名称写入审核者可以实际验证的日志。继续携带这份字段简报，并准备指出 trace id 如何跨越一跳，而不只是口头描述概念。

## 关键术语

| 术语 | 含义 |
|------|---------|
| `traceparent` | 采用 W3C 格式的 `_meta` 键，为 trace 的一跳携带 version、trace id、parent id 和 flags |
| Trace id | 一次操作所有 span 共享的 32 字符十六进制值，跨跳不变 |
| Parent id | 标识一个 span 的 16 字符十六进制值，每一跳都会生成新值 |
| `tracestate` | 与 `traceparent` 一同原样传播的供应商专用 trace 状态 |
| `baggage` | 跨 trace 每一跳原样传播的用户自定义键值上下文 |
| Principal | 有效凭据解析出的已认证身份，绝不是自行报告的字段 |
| 脱敏 | 在审计条目产生之前，用固定标记替换已标记参数 |
| 哈希链 | 每个条目的哈希覆盖自身内容和前一条目的哈希，使修改可被检测 |
| 结果通道 | 调用实际终结于完成结果、`isError` 结果或协议错误中的哪一种 |
| 关联 | 即使 request id 不同，也通过共享 trace id 连接不同日志中的记录 |

## 延伸阅读

- [MCP specification 2026-07-28, Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic)，了解 `_meta` 保留键和 OpenTelemetry trace context 章节
- [SEP-414, OpenTelemetry trace context in `_meta`](https://modelcontextprotocol.io/seps/414-request-meta)
- [Logging (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/logging)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 3、11、13 节
- `phases/13-tools-and-protocols/20-opentelemetry-genai`，了解完整 tracing 后端在本课 `_meta` 传播之外所需的 span 层级和 `gen_ai.*` 属性
