# 工具调用生命周期

> 工具调用不是单个事件，而是一系列固定检查点。调用究竟停在哪一步，决定了该走哪条错误通道，以及调用方下一步该怎么做。

**类型：** Reference
**语言：** Python
**前置要求：** 第 16 课
**预计时间：** 约 45 分钟

## 学习目标

- 按顺序走完工具调用的所有检查点：发现、列出、选择、确认、调用、验证、执行和结果
- 区分只存在于宿主应用内部的检查点，以及真正在线路上传递消息的检查点
- 解释为什么未知工具始终属于协议错误，而参数错误通常属于工具执行错误
- 对 `input_required` 结果和流中断应用重试规则：每次都使用新的 JSON-RPC id，绝不复用已经失败的 id
- 判断盲目重发是否安全时，把 `idempotentHint` 当作不可信提示，而不是保证
- 区分让客户端放弃等待的硬超时，以及仅暂停调用的 `input_required` 结果

## 问题背景

假设一个 agent 要求服务器轮询构建状态、发布版本或查询信息。最简单的叙述会把工具调用看成一个事件：发出请求，收到答案，结束。但真实调用不是这样。从模型决定使用工具，到调用方拿到可执行的最终结果，请求会经过多个不同的检查点，而且每个检查点都可能以不同方式终止流程。如果调用方把所有失败一视同仁，就会不断做错决定：反复重试一个无论发送多少次都不可能成功的调用；放弃一个其实只需修正参数的调用；更糟的是，盲目重复一个带副作用的调用，而第一次尝试可能已经生效。

解决办法不是让调用方变得更“聪明”，而是掌握每次工具调用都遵循的固定结构。这样一来，“流程停在哪里”就能直接回答“下一步该做什么”。一个在检查工具是否存在时就失败的调用，与一个已经运行工具处理器、却触发业务规则的调用，失败原因和应对方式完全不同。这正是考试中“交互与执行”领域反复考查的区别——它是蓝图中占比最大的单一领域：这是协议错误还是工具执行错误？错误发生在哪个检查点？

## 核心概念

在 2026-07-28 修订版中，一次工具调用按固定顺序经过八个检查点：发现（discover）、列出（list）、选择（select）、确认（confirm）、调用（call）、验证（validate）、执行（execute）和结果（result）。只有部分检查点会在线路上传递消息，另外一半完全发生在宿主应用内部。只观察 JSON-RPC 流量的客户端无法直接看到这些内部步骤，但它们仍然决定了模型可以做什么。

**发现和列出**是线路检查点，而且都可以缓存。客户端调用 `server/discover`，可以获知服务器支持的版本、能力以及可选的 `instructions`；这些信息都带有 `ttlMs` 和 `cacheScope`。客户端可以不调用它，但服务器必须实现它。`tools/list` 返回每个工具的名称、描述、`inputSchema` 和注解，同样可以缓存；其结果不能因连接不同而变化（但可以根据请求的授权信息变化）。完善的客户端会使用缓存列表，而不是每次调用前都重新查询。这就是“列出”和“调用”作为两个独立检查点存在的原因。

**选择和确认**完全不接触线路。选择是模型根据上下文中已有的描述和 schema，决定调用哪个工具。确认则由宿主决定：立即执行模型的选择，还是先征求人类同意。规范把它表述为 SHOULD，而不是协议消息：应用应明确展示暴露了哪些工具，在调用前显示输入，并要求用户确认敏感操作。`destructiveHint` 等注解可以辅助这个门禁，但它们只是提示；除非服务器本身可信，否则不能信任，更不是强制保证。如果人类拒绝，生命周期就在这里结束。此时根本不会发送 `tools/call`，验证和执行自然也无事可做。

**调用**是 `tools/call` 请求真正发出的时刻。和本修订版中的每个请求一样，它携带自己的元数据，而不是依赖之前的握手：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "get_build_status",
    "arguments": {"build_id": "bld_7"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "progressToken": "pt-9"
    }
  }
}
```

**验证**是请求到达后，服务器执行的第一个检查点。它只问一个问题：服务器是否真的暴露了这个工具？此时参数内容还不重要。如果名称与服务器列表中的任何工具都不匹配，调用会立即以协议错误结束，而且始终使用 `-32602`，绝不是 `-32601`。因为 JSON-RPC 方法（即 `tools/call`）本身完全已知，未知的只是其中的工具名称：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "error": {"code": -32602, "message": "Unknown tool: delete_all_builds"}
}
```

未通过验证的调用不会进入执行，也不会产生任何 `result`，只会产生 `error`。这一点值得牢牢记住。完整的错误分类将在后续课程介绍，但验证与执行的分界，才是考试中绝大多数工具错误题真正要考的内容。

**执行**只会在验证确认工具存在后开始。它涵盖之后的所有工作：按照工具自己的 `inputSchema` 检查参数，然后实际运行处理器。缺失或格式错误的参数在这里被发现，而不是在验证阶段；返回的是一个正常、完整的结果，其中设置 `isError: true`，并携带模型可以读取和处理的内容：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "Missing required argument(s): environment."}],
    "isError": true
  }
}
```

最常考的规则就是：未知工具在验证阶段产生协议错误；schema 违规、上游 API 失败或业务规则违规，则都属于执行阶段产生的工具执行错误。因为模型能够针对后者自行修正，却无法对前者采取有意义的行动。只有一个例外需要记住：如果执行阶段遇到真正、意外的服务器故障，而不是输入或业务问题，仍应报告协议错误 `-32603`，因为调用方无法通过修改下一次请求来解决它。如果请求声明了 `progressToken`，执行阶段还可以流式发送 `notifications/progress`。每条通知都携带同一个 token、严格递增的 `progress` 值，以及可选的 `total` 和 `message` 字段；这些通知只能出现在该请求的响应流中。

**结果**是执行阶段的落点。`resultType` 只能是 `"complete"`（无论是否设置 `isError`）或 `"input_required"`。`input_required` 并不代表结束。它携带 `inputRequests`、`requestState`，或两者都有。客户端随后以全新的 JSON-RPC id 重试同一个逻辑调用，提供键名匹配的 `inputResponses`，并原样回传 `requestState`（这就是前几课介绍的多轮往返模式；如何用 HMAC 等手段保护状态，会在引导输入课程中深入介绍，此处保持简单，以便聚焦生命周期）。这次重试会重新经历调用、验证、执行和结果。因此，**重试**和**最终状态**不是独立阶段，而是闭合这个循环：重试就是带着历史再次调用；最终状态要么是实际保留下来的 `complete` 结果，要么是调用方决定放弃的时刻。

放弃也有明确规则。服务器应允许每个请求超时，并设置一个即使持续收到进度通知也不会延长的硬上限，因为进度只能证明工作仍在进行，不能证明它会及时完成。取消方式取决于传输：在 Streamable HTTP 上，关闭请求流就表示取消，无需发送消息；在 stdio 上，客户端发送 `notifications/cancelled`，指定 `requestId`，并可附带原因。超时和取消都不会产生自己的 resultType。不存在 `"cancelled"` 或 `"timed_out"` 值；服务器只是再也无法发送一个调用方仍关心的结果。客户端一旦放弃某个请求，就应忽略之后到达的任何响应。

流中断是相关但独立的故障：请求已经发出，但连接在任何响应——无论成功还是错误——到达前断开。本修订版不保留任何可恢复机制（没有 `Last-Event-ID`，也没有 SSE 重放），所以调用方只能使用新 id 重新发出调用。能否安全地盲目重发取决于 `idempotentHint`。但该注解只是提示，谨慎的客户端会区别对待非幂等工具：完善的服务器不会让客户端凭空重复一个可能已经生效的操作，而是在第一步返回明确、不透明的句柄（即无状态核心课程中的模式），让后续检查点——包括流中断后的重发——基于该句柄操作已有状态。

```figure
mcpa-17-lifecycle
```

## 交互实验

图中自上而下排列了八个检查点，两条错误分支恰好从错误实际发生的位置伸出：验证分支指向 `-32602`（协议错误，不会继续执行，也没有结果），执行分支指向 `isError`（工具执行错误，但仍是完整结果）。结果本身又分成两条路径：`complete` 结束流程，`input_required` 则使用新 id 回到调用，这是整张图中唯一的反向边。注意，选择和确认虽然位于链条中，却不出现在任何错误分支上。它们不会产生协议错误或工具执行错误，因为它们根本不发送 JSON-RPC 消息；确认被拒绝时，流程只是在调用前结束。

## 实践实验

在课程目录中运行模块：

```bash
python3 code/main.py
```

输出的每一行都包含一个场景的阶段轨迹，以及它的结束方式。把输出中的每条路径与图对应起来：`happy_path` 完整走过一次流程，中间带有进度通知；`needs_input_then_retry` 展示第二次回到调用、验证、执行和结果的循环；`confirmation_denied` 在确认后停止，根本没有调用；`unknown_tool` 在验证后停止；`invalid_arguments` 到达执行并返回 isError；`broken_stream_reissue` 针对同一个构建句柄，以两个不同 id 调用两次；`timeout_then_cancel` 在进度始终无法完成时放弃，并忽略迟到响应；`internal_fault` 展示执行阶段的意外服务器故障如何作为协议错误出现，而不是 isError。

然后在该目录打开 shell，手动逐步运行一个场景：

```python
import sys; sys.path.insert(0, "code")
import main
server, client = main.LifecycleServer(), None
client = main.Client(server)
run = main.run_needs_input_then_retry(server, client)
print(run.stages)
print(run.final)
```

修改 `main.py` 中 `publish_release` 的必需参数，或者给构建设置超过 `run_timeout_then_cancel` 轮询预算的 tick 数，再次运行，观察阶段轨迹如何改变。

## 交付产物

`outputs/tool-lifecycle-state-chart.md` 是一页式状态图，列出每个检查点、它是否在线路上可见、它可能终止在哪条错误通道，以及调用暂停或中断时的确切重试规则。实现客户端或服务器时，把它放在手边，随时查阅“这里应该发生什么”。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的所有关键结论：正常路径按文档顺序经过各阶段；`input_required` 之后使用新 id 重试并完成；确认被拒绝时在调用前停止；未知工具在验证阶段以 `-32602` 失败；schema 违规在执行阶段落入 isError；流中断后针对同一句柄用新 id 重发；硬超时会取消请求并忽略之后的迟到响应；执行阶段的意外服务器故障仍是协议错误，而不是 isError；`tools/list` 保持确定性排序；每个请求和结果都携带本修订版要求的字段。仓库的线路检查器会按照同一套规则验证本课的交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/17-tool-invocation-lifecycle
```

## 综合项目关联

综合项目的端到端交换，就是本课生命周期的真实运行：先发现和列出，再发起一个需要 schema 验证参数的调用；处理一次 `input_required` 暂停并用新 id 回答；接收进度，并可能取消；最后得到审计轨迹可以引用的结果。当综合项目要求你解释为什么某个设计选择重试、放弃或以特定方式报告错误时，答案始终取决于“当时处于哪个检查点”。本课的目标就是让这个判断成为本能。

## 关键术语

| 术语 | 含义 |
|------|------|
| 检查点 | 工具调用会经过的八个固定节点，从发现到结果 |
| 验证 | 只检查指定工具是否存在的检查点；失败始终属于协议错误 |
| 执行 | 检查参数并运行处理器的检查点；失败通常属于工具执行错误 |
| 协议错误 | JSON-RPC `error`；它不是模型可以据此修正并重试的可操作内容 |
| 工具执行错误 | 设置 `isError: true` 的完整结果；模型可以读取并修正的可操作内容 |
| 重试 | MRTR 延续：使用新的 JSON-RPC id、匹配的 `inputResponses`，并原样回传 `requestState` |
| 重发 | 流中断后使用新 id 再次发送调用，因为该传输没有任何可恢复机制 |
| idempotentHint | 关于重复调用是否安全的不可信提示，不是强制保证 |

## 延伸阅读

- [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)，尤其是 Error Handling 和 Stateful Tools
- [多轮请求](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Cancellation](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation) 和 [Progress](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 的第 5、7、8 节
- `phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control`，深入讲解超时、取消和流量控制
