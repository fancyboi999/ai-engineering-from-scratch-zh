---
id: which-side-failed-the-engine-or-the-input
title: 哪一边失败了，引擎还是输入
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, screen]
tags: [errors, mcp, reverse-engineering, retries, agents]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: []
related: [scenarios/an-empty-list-is-not-none]
updated: 2026-11-03
system:
  version: rea 6.7.0 at 27dc42d with the Ghidra provider
  model: no model; the fixtures are the ledger binaries built at -O1 and -O2
  hardware: one aarch64 Mac
source:
  - manuals/reverse-engineering-101/capture/out/00-commands.txt
  - manuals/reverse-engineering-101/capture/out/04-inspect-binary-layout.json
  - manuals/reverse-engineering-101/capture/out/10-mcp-session.txt
  - manuals/reverse-engineering-101/capture/out/10-mcp-13-analyze-function-missing.json
  - manuals/reverse-engineering-101/capture/out/10-mcp-server.log
  - manuals/reverse-engineering-101/sections/r-3-errors.md
  - manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md
---


## Situation

一个团队在一个夜间分析二进制文件的 agent 流水线中封装了 rea。包装脚本对失败有一条规则：任何调用失败，就关闭目标、停止 Java 进程、重新打开目标并重试。夜间日志显示引擎重启了十一次，每次重启后都出现同样的失败，而且每次都重新付出了导入目标的开销。日志中出现了两处失败，包装脚本对它们采用了同样的处理方式。

第一处来自运行流水线的 Mac 上的命令行：对目标文件的布局检查以退出码 1 退出。第二处来自 MCP 会话：`analyze_function` 对 agent 输入的过程名称返回了错误。你手上有命令记录、两个错误包装、会话索引和服务端日志。说明每处失败是什么，并写出包装脚本本该具备的重试规则。

## Evidence

- [以退出码 1 退出的 CLI 调用](evidence/layout-call-exit-1.txt)
- [该调用的完整包装](evidence/capability-unavailable.txt)
- [MCP 会话的连续三次调用](evidence/session-around-the-error.txt)
- [MCP 调用的解码错误](evidence/invalid-request-envelope.txt)
- [诊断对象的末尾部分](evidence/diagnostics-tail.txt)
- [失败调用前后的服务端日志](evidence/server-log-around-the-error.txt)

## Questions

1. 两个包装具有相同的五个字段。在读取消息之前，哪两个字段决定下一步做什么？
2. 第一处失败说明某个 profile 只支持 Linux x64。到底哪里出了问题：主机、文件还是引擎？正确的下一次调用是什么？
3. 第二处失败标记为 `retryable: true`。使用相同参数重试会返回什么？必须改变什么？
4. 诊断对象如何表明调用失败时 Ghidra 进程是健康的？
5. 列出哪些错误码下重启引擎是正确的响应。

## Walkthrough

1. **先读 code、category 和 retryable。** 每个 rea 错误都带有 `code`、`category`、`message`、`retryable` 和 `remediation`。code 是判别字段，共二十个之一。category 是十个类别之一，指明问题种类。标志说明相同的调用后续是否可能成功。message 是给人看的。包装脚本应基于前两个字段和标志做分支，绝不能基于消息文本。
2. **读 CLI 失败。** 命令记录显示对目标文件执行 `inspect-binary-layout`，0.6 s 后以退出码 1 退出。包装带有 code `capability_unavailable`、category `unsupported_provider` 和 `retryable: false`。详情指出了提供者 `pwntools-elf` 和具体操作。该提供者只运行在一个平台上：Linux x64，而流水线运行在 Mac 上。引擎根本没有运行。正确的下一次调用是换一个提供者或换一台主机，在这台机器上手册使用 `inspect-macho` 作为布局工具。对一个在这里无法运行的提供者，重启没有任何用处。
3. **读 MCP 失败。** 会话索引显示在同一个打开的目标上，前一次调用和后一次调用都成功完成，失败的调用耗时 4 ms。解码后的错误带有 code `invalid_request`、category `invalid_input` 和 `retryable: true`。详情中的唯一问题说明过程名称未知。该标志意味着在同一个连接上，修正后的调用可以成功。使用相同的名称重试会返回同样的错误，因此必须修改参数，而 `list_procedures` 能给出实际存在的名称。
4. **读诊断信息。** `failure_output` 保存了 Ghidra 在失败请求期间写入的 stdout 和 stderr：两者都为空，且带有 `complete: true`。远程错误码为 `not_found`。带有远程错误码的完整空输出表明，引擎回答了问题，且答案是否定的。服务端日志也证实了这一点：级别为 40 的两行日志，一行属于 bridge 层，一行属于 server 层，耗时 2.73 ms，下一行是状态为 `ok` 的 `close_binary`。引擎在调用前、调用中和调用后都是健康的。
5. **安排重启的时机。** 重启应对的是另一组错误码：`provider_unavailable`、`provider_timeout`，以及诊断信息显示输出不完整的 `execution_failure`。手册指出，`provider_timeout` 对应基于 Ghidra 的首次调用超过 330,000 ms 启动截止时间时的错误码，而 `target_unavailable` 对应在 `open_binary` 之前每个提供者工具返回的错误码。这两处失败中都没有出现这两种情况。

## Resolution

两处失败都不是引擎造成的。第一处是提供者无法在主机上运行，不可重试，改用其他工具即可解决。第二处是参数错误，修改参数后可重试，Ghidra 进程保持运行并在同一个会话中响应了下一次调用。十一次重启没有换来任何好处，反而每次都付出了导入开销。

包装脚本现在在做其他操作之前先读取 `category` 和 `retryable`。`unsupported_provider` 和 `unsupported_target` 路由到其他提供者或主机并停止。`invalid_input` 从列表中纠正参数并重试一次。`unavailable`、`timeout` 以及带有不完整输出的 `execution_failure` 重启引擎，并限制重启次数。其他所有情况连同消息和补救建议一起报告给人工。修改后，接下来的夜间运行做到了零重启，两处失败在报告中各占一行。

## Wrong turns

- "退出码 1 意味着引擎崩溃；重启它。" 包装写明了 `unsupported_provider`，不可重试。提供者根本没有启动，重启启动不了任何新东西。
- "retryable 为 true，所以重试同一个调用。" 该标志表示修改输入后，调用稍后可以成功。同一个未知名称只会得到同样的回答。
- "匹配消息文本来决定分支。" 消息是写给人看的，不同版本之间可能改变。code、category 和标志才是契约。
- "服务端日志里出现级别 40 的行，意味着 bridge 不健康。" 这两行记录的是一个在 2.73 ms 内完成的失败请求，下一行记录了同一个连接上的成功调用。

## Generalize

错误包装是一个类型化回答，忽视其类型的重试策略会把每次失败都变成代价最高的那种。先读判别字段和 retryable 标志，维护一张从类别到动作的映射表，在重启引擎之前，先看诊断信息确认它是否还活着。对大多数失败而言，最便宜的修复是修改输入，最昂贵的是冷启动，策略必须把它们区分开。

## Taught in

[逆向工程 101 的错误参考](../../../manuals/reverse-engineering-101/sections/r-3-errors.md#the-shape-every-rea-error-has)列出了五个字段和二十个错误码，[档案页](../../../manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md#a-name-that-does-not-exist)解读了未知名称错误及其日志行，[MCP 服务端页](../../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md#the-startup-deadline-against-the-client-default)给出了启动截止时间以及超时所对应的恢复策略，[失败模式课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)把一次错误响应触发更多调用的情况命名为级联错误。
