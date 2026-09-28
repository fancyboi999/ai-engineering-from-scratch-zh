# 已弃用，不等于已移除：Roots、Sampling 与 Logging

> 在 MCP 2026-07-28 中，Deprecated 不代表功能消失：roots、sampling 和 logging 仍按原样响应，只是十二个月的倒计时已经开始。

**类型：** Reference
**语言：** Python
**前置要求：** 第 14 课
**预计时间：** 约 45 分钟

## 学习目标

- 根据 MCP 功能生命周期区分 Deprecated 与 Removed，包括至少十二个月的窗口，以及最早移除时间的计算方式
- 追踪 roots 和 sampling 如何作为 MRTR 输入请求传递，以及调用方必须在当前请求中声明的客户端 capability 门控
- 解释 logging 为何改用每请求的 `io.modelcontextprotocol/logLevel` 键，以及服务器何时可以或不得发送 `notifications/message`
- 说明每项弃用功能的迁移路径：roots、sampling、logging、Dynamic Client Registration、限定作用域的 `includeContext`，以及 HTTP+SSE
- 识别 2026-07-28 真正删除的少量方法，如 `logging/setLevel` 和 `notifications/roots/list_changed`，并解释无状态核心为何无法保留它们

## 问题背景

把“deprecated”当作“gone”的同义词，会稳定丢掉一部分 MCPA 题；把它理解成“永久脚手架，不用理会”，则会丢掉另一部分。MCP 2026-07-28 一次弃用了三项面向客户端的完整功能：roots、sampling 和 logging；同一修订版又直接删除了一组更少且完全不同的方法。两份清单互不重叠，考试正会利用这个差异。某次 tool 调用返回 `input_required`，要求执行 `roots/list` 或 `sampling/createMessage`，在 2026-07-28 中完全属于正常 wire 流量；距离任一功能依法可以消失，可能还有数月甚至数年。若请求仍尝试 `logging/setLevel`，则会直接收到“method not found”，因为该消息依赖无状态核心已经取消的连接级 session。本课真正训练的是判断某个名称属于哪一类，以及原因。

## 核心概念

MCP 规范中的每项功能只会处于三种生命周期状态之一：Active、Deprecated 或 Removed。Active 表示按当前修订版的规范性文本实现，与其他当前功能相同。Deprecated 表示功能仍完整保留在规范中，也仍完全可用，但 Core Maintainer 已决定安排未来移除，并已发布迁移路径。Removed 表示功能已从草案规范删除，下一版 Current 修订版中不再存在，不过最后包含它的 Final 修订版仍会保留相关文档。Deprecated 功能至少有十二个月窗口，从首次把它标记为 Deprecated 的修订版发布时开始计算；窗口结束后，它才具备被移除的资格。实际移除日期由 Core Maintainer 在后续版本准备期间另行决定，可能远晚于窗口结束，甚至永不移除。根据 SEP-2577，Roots、Sampling 和 Logging 在 2026-07-28 修订版发布时成为 Deprecated，因此最早移除它们的是 2027-07-28 当日或之后发布的第一版规范，而不是固定在该日，也不是随便下一版规范。

SEP-2577 把三项功能归为一组，是因为它们都呈现相同模式：真实采用率低，实现成本却不低。Roots 向服务器提供仅供参考、服务器无需遵守的目录提示，很少有客户端实现目录选择 UI。Sampling 允许服务器借用客户端的模型访问权限，但正确实现需要人类参与审核、模型选择逻辑，并且从 2025-11-25 起还要完整的 tool 循环，采用率依旧很低。Logging 则重复了各运行时已有的基础设施：stdio transport 用 `stderr`，其他场景用 OpenTelemetry。三者都不触及真正定义 MCP 的 resource、tool 或 prompt 模型，因此弃用它们可以缩小实现面，而不改变协议用途。

Roots 和 sampling 都保留了完全相同的 wire 形态，改变的只是传递机制。在 2026-07-28 之前，服务器会在打开的连接上直接向客户端发送 `roots/list` 或 `sampling/createMessage`，即服务器发起请求。无状态核心彻底移除了这种连接，因此两类请求现在与其他所有服务器向客户端提问一样传递：作为 `InputRequiredResult` 的 `inputRequests` 映射项，并由携带新 JSON-RPC id 的重试回答。这正是取代所有服务器推送的多轮模式。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "workspace_roots": {"method": "roots/list"},
      "workspace_summary": {
        "method": "sampling/createMessage",
        "params": {
          "messages": [
            {"role": "user", "content": {"type": "text", "text": "Summarize this workspace in one sentence."}}
          ],
          "maxTokens": 100
        }
      }
    },
    "requestState": "summarize-workspace:v1"
  }
}
```

除非客户端在同一请求的 `io.modelcontextprotocol/clientCapabilities` 中声明对应的 `roots: {}` 或 `sampling: {}` capability，否则两种输入项都不合法。服务器若确实需要该能力，就必须返回 `-32021`，并在 `data.requiredCapabilities` 中列出所需能力；这与其他任何服务器不能假定存在的功能使用同一门控。客户端使用全新 id 重试原请求，在 `params.inputResponses` 中以与 `inputRequests` 相同的键回答，并逐字节原样回传 `params.requestState`，绝不能自行编造。

Sampling 请求仍可携带 `includeContext`，但它的 `"thisServer"` 和 `"allServers"` 值也已单独弃用。这项更早的通知由另一 SEP 纳入同一生命周期注册表。该字段无论如何都默认为 `"none"`，最简单的正确做法是省略它，而不是刻意选择已弃用值。

Logging 的弃用方式不同，因为该功能名称涵盖两种不同的 wire 行为，只有一种保留下来。保留的是每请求行为：客户端在单个请求的 `_meta` 中添加 `io.modelcontextprotocol/logLevel`，服务器随后可在该请求自己的响应流上发送不低于指定严重级别的 `notifications/message`，但只能在最终结果之前发送。若当前请求未携带该键，则完全不得发送。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "warning",
    "logger": "diagnostics",
    "data": {"message": "cache subsystem degraded"}
  }
}
```

未保留的是环境级行为：客户端过去发送一次 `logging/setLevel`，同一连接中的后续消息都会继承该级别，直到再次修改。只有连接在请求间保存状态时，这才有意义。无状态核心没有地方保存连接级日志级别，因此 `logging/setLevel` 不只是 Deprecated，而是彻底消失：现代服务器完全没有对应 handler，返回 `-32601` Method not found，就像其他无法识别的方法名一样；它既不是 tool 执行错误，也不是 `-32602`。

弃用注册表还包含另外两项。Dynamic Client Registration 让位于 Client ID Metadata Documents（后续课程会深入讲完整注册决策）。首个公开版本中的 HTTP+SSE transport 让位于 Streamable HTTP。它们遵循与本课其他项目相同的规则：仍在规范中，仍可能合法出现，也遵循同类倒计时。考试最常见的陷阱是把整份清单压缩成“已移除”。事实并非如此。2026-07-28 真正移除的是一份更短且不同的清单：`initialize` 握手与 `notifications/initialized`、`Mcp-Session-Id` 与 session 作用域 HTTP 端点、`ping`、`resources/subscribe`、`logging/setLevel`、`notifications/roots/list_changed`、`Last-Event-ID` 与 SSE 恢复、MRTR 之外的所有服务器发起请求、`tasks/result` 和 `tasks/list`，以及与 `notifications/elicitation/complete` 绑定的 URL 模式信息征询字段。它们都不在弃用注册表中，因为注册表条目按定义描述的是仍然存在、等待迁移的功能。

还有一个不对称之处值得点明，它解释了为何 roots 本身仍在，`notifications/roots/list_changed` 却消失了。该通知用于告诉服务器客户端暴露的 roots 已发生变化，是从客户端推送到服务器的消息。MRTR 用请求与重试取代了所有服务器发起推送；2026-07-28 唯一保留的监听通道是客户端向服务器打开的 `subscriptions/listen`，绝不会反向使用。当客户端再也没有通道向服务器主动推送任何内容时，变化通知就无处传递，不论 roots 是否弃用，它都只能随承载它的连接模型一起离开。

```figure
mcpa-15-deprecation-timeline
```

## 交互实验

图中时间线从 2026-07-28 发布日延伸到一年后的最早移除日，并为 roots、sampling 和 logging 分别绘制一条泳道：从弃用日到今天是实线，跨过最早移除标记后逐渐转为虚线，因为具备移除资格不等于已安排移除。下方两列对照仍可在线上传输的 `roots/list`、`sampling/createMessage`，以及每请求 `logLevel` 与 `notifications/message`，和已经彻底消失的 `logging/setLevel`、`notifications/roots/list_changed`。沿任一泳道跨过移除标记后，线条仍继续，因为实际移除日期由 Core Maintainer 决定，而不是日历自动决定。

## 实践实验

打开 `code/main.py`。`advise_migrations` 是实验说明中的迁移顾问：输入服务器 capability 和客户端 capability，它会报告双方使用的每项弃用功能，包括对应 SEP、迁移路径，以及由 `add_months` 根据十二个月窗口计算出的最早移除日期。其背后的 `Server` 暴露两个 tools。`summarize_workspace` 同时需要 roots 和 sampling：两者都未声明的客户端会立即收到 `-32021`，响应中指出缺少的能力；同时声明两者的客户端会收到 `input_required` 结果，其中包含 `workspace_roots` 和 `workspace_summary` 项；客户端回答并用新 id、原样回传的 `requestState` 重试后，得到完成结果。回传错误 `requestState` 的重试会被拒绝。`run_diagnostic` 不需要任何 capability：未指定日志级别时保持静默；指定 `logLevel: "info"` 时，会为 info 和 warning 事件发送 `notifications/message`，但跳过 debug；指定无法识别的级别时返回 `-32602`。

```bash
python3 code/main.py
```

阅读输出的最后一块：一个经过包裹并明确标记的旧版交互向同一服务器发送 `logging/setLevel`，收到 `-32601` Method not found。这就是仍然存在的功能与已经移除的功能之间最具体的区别。

## 交付产物

`outputs/deprecation-migration-guide.md` 是单页参考：生命周期策略下 Deprecated 的含义，三项 SEP-2577 功能与 Dynamic Client Registration、HTTP+SSE 的对照表，2026-07-28 真正移除的简短名称列表，以及当前无需包裹为旧版就能通过 wire 检查器的更短弃用名称列表。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课结论：roots、sampling 和 logging 都会被标记，并提供迁移路径及正确计算的最早移除日期；不含弃用功能的 capability 集合不会产生发现；`summarize_workspace` 对未声明 capability 返回 `-32021`，否则发起正确的 MRTR 往返，并由使用新 id、回传 `requestState` 的重试完成；不匹配的 `requestState` 会被拒绝；`run_diagnostic` 在没有日志级别时保持静默，指定级别后只发送不低于该严重级别的消息，并拒绝无法识别的级别；包裹的旧版示例还会展示现代服务器如何用 `-32601` 响应真正移除的方法。仓库 wire 检查器也会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/15-deprecated-client-features
```

## 综合项目关联

综合项目的端到端交互默认考生能一眼分辨 Deprecated 和 Removed：它像本课对 roots 与 sampling 的处理一样，用 MRTR 获取同意；构建交互记录时绝不会使用 `initialize` 或 `logging/setLevel`。本课构建的迁移顾问也是后续策略引擎和审计流水线都会复用的形态：检查 capability 集合或 wire 记录，并报告在某个截止窗口前需要修改的内容。注意，这是窗口，不是固定日期。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Active | 当前修订版完整规定并要求实现的功能 |
| Deprecated | 仍有完整规范且可正常使用、已有迁移路径，并且至少十二个月后才可能移除的功能 |
| Removed | 已从草案规范删除，并在下一版 Current 修订版中缺席的功能 |
| Earliest removal | 功能弃用窗口结束当日或之后发布的第一版规范 |
| Roots | 向服务器提供目录提示的弃用客户端功能，现在作为 MRTR 输入请求发起 |
| Sampling | 允许服务器借用客户端模型访问权限的弃用客户端功能，现在作为 MRTR 输入请求发起 |
| `io.modelcontextprotocol/logLevel` | 让单个请求选择接收 `notifications/message` 的每请求 `_meta` 键 |
| `notifications/message` | 服务器只能在设置了 `logLevel` 的请求响应流上发送的日志通知 |
| `logging/setLevel` | 已移除的连接级日志级别设置器，在无状态核心中已无处保存 |
| SEP-2577 | 在 2026-07-28 修订版中同时弃用 roots、sampling 和 logging 的提案 |

## 延伸阅读

- [Roots (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [Sampling (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/client/sampling)
- [Logging (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/logging)
- [Deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
- [Feature lifecycle and deprecation policy](https://modelcontextprotocol.io/community/feature-lifecycle)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 11 节和第 15 节
- `phases/13-tools-and-protocols/11-mcp-sampling`，深入构建 sampling 迁移路径
