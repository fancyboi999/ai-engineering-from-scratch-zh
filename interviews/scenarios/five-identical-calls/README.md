---
id: five-identical-calls
title: 五次相同调用后自行终止的运行
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [agents, tool-calls, permissions, background-agents, degenerate-loop]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: [docker-sandboxes-101#s-sub-agents-transfer-task-and-background-agents, docker-sandboxes-101#s-permissions-safety-and-hooks]
practice: []
cheatsheet: []
related: [scenarios/denied-by-policy-or-by-the-user]
updated: 2026-11-03
system:
  version: docker-agent v1.149.0 and sbx v0.47.0
  model: ai/qwen3:4b through the local model runner, at temperature 0
  hardware: one Mac, no GPU
source:
  - manuals/docker-sandboxes-101/capture/fixtures/agents/team.yaml
  - manuals/docker-sandboxes-101/capture/out/19-transcript.txt
  - manuals/docker-sandboxes-101/capture/out/19-background.txt
  - manuals/docker-sandboxes-101/capture/out/19-background.ndjson
  - manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md
  - manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md
---

## Situation

一个协调者 agent 在无人值守的夜间定时任务中以 `--exec` 模式运行。其配置文件为其赋予了一个负责编写内容的子 agent 以及 `background_agents` 工具集，使其能够将编写任务置于后台启动、等待并复述子 agent 的产出。在过去的数周内，当协调者使用 `transfer_task` 时该任务一直稳定运行。一名同事修改了输入指令，要求使用后台 agent 运行，随后的任务以退出码 1 异常终止，日志打印了 `Agent terminated: detected 5 consecutive identical calls to run_background_agent`。

该同事认为这是运行时的底层 bug：模型正在努力工作，却被运行时强行掐断。提出的修复方案是调高重复调用限制并更换模型。在两项改动发布前，你负责复盘这次运行。

## Evidence

- [团队配置文件中的协调者 agent 定义](evidence/the-team-file.txt)
- [同一个协调者在前一次使用 transfer_task 时的成功运行记录](evidence/a-delegation-that-needed-no-approval.txt)
- [用户消息、首个后台 agent 调用及其收到的返回结果](evidence/the-first-call-and-its-answer.txt)
- [后续的五次重复调用及其收到的五次响应](evidence/five-more-rounds.txt)
- [事件流中包含单轮交互的切片，涵盖从工具调用到下一条消息](evidence/one-round-in-the-event-stream.txt)
- [运行结束时打印的最后一行终止日志](evidence/the-termination.txt)
- [各种安全模式对未匹配规则调用的处理行为对照表](evidence/the-safety-modes.txt)

## Questions

1. 在打开事件流之前，列出模型在首次调用后可能收到的反馈，以及行为良好的 agent 面对每种反馈应作何反应。
2. 运行时先后发起了六次人工确认询问且无人应答。为什么会发起询问，是什么将每次询问变为了拒绝？
3. 比较这六次调用的入参。第一轮之后发生了什么改动，这说明模型是如何理解返回信息的？
4. 指出终结该运行的门禁机制、其默认值，以及为什么相同的配置文件在前一次运行中能够成功？
5. 编写针对配置文件或命令行的修改，使无人值守的协调者能够启动后台 agent，并说明哪些部分应当保持原样。

## Walkthrough

1. **分析 agent 配置文件。** 根 agent 配置了 `max_iterations: 6`、`sub_agents: [writer]`、`handoffs: [reviewer]` 以及一个 `background_agents` 类型的工具集。文件内没有定义 `permissions` 权限块，命令行也没有指定安全模式。因此任何默认未经批准的调用都必须征询人工确认。
2. **分析第一轮交互。** 运行时针对 `run_background_agent` 触发了 `tool_call_confirmation` 确认事件，元数据中的 `safety_label` 为 `unknown`。在 `--exec` 无终端环境下无法人工确认，运行时直接将确认请求转为拒绝。工具响应以纯文本形式返回给模型：`The user rejected the tool call.`。
3. **分析后续五轮交互。** 模型以相同的 agent 和相同的任务参数将完全相同的调用重复发起了五次。它仅在第一轮之后丢弃了 `expected_output` 字段，未做任何实质改变。用户拒绝是关于该调用的最终结论，模型却将其当成偶发错误并盲目重试。
4. **深入审查单轮事件流。** 工具调用带有 `safety_label: unknown`。内建的两个钩子事件 `tool_input_transform` 与 `tool_response_transform` 均报告 `allowed: true`。没有任何 `pre_tool_use` 钩子或 allow 模式参与决策。结果返回了 `isError: true`，紧接着触发 `message_added`，下一轮模型推理在完全相同的状态下再次启动。
5. **分析终止日志行。** 运行时在连续捕获五次完全相同的调用后主动终止了任务。手册指明了该限制参数 `max_consecutive_tool_calls`，当配置为 0 时代表默认值 5。运行时成功拦截了一个模型自身未能识别的死循环。前一次运行中同一个协调者调用的是 `transfer_task`，那是唯一无需任何人工确认即可默认放行的工具，因此那次运行从未触发确认提示。
6. **查阅安全模式规则表。** 未显式指定安全模式的运行保留历史默认行为：只读工具直接放行，其他工具一律询问确认。后台 agent 工具不属于只读工具且标签为 `unknown`。在 `restricted` 下 unknown 标签会被直接拦截，而在 `strict` 或 `balanced` 下会再次询问。唯有 `allow` 模式规则或 `autonomous` 模式能允许调用通过。手册补充说明在运行中任务内部，任何本应发起询问的调用都会被自动拒绝，因此无人值守的协调者必须为 `run_background_agent` 以及子 agent 调用的工具配置明确的 allow 规则。

## Resolution

根因在于无人值守运行中使用了标签为 `unknown` 的工具却未配置对应的 allow 规则。每次调用都触发确认，每次确认均退化为拒绝，模型随后不断重试该调用。重复调用限制机制按设计发挥了预期作用：将无休止的死循环截断为一个确定性的退出码。

修复方案是补充权限配置，而非调大限制阈值。在 agent 配置文件中为 `run_background_agent` 添加 `allow` 模式，并为 writer 调用的工具补充 allow 规则，随后在 `--exec` 下重新运行。手册未测试修复后的配置，验证责任由你承担：首个 `run_background_agent` 调用必须在流中返回任务 ID 而非拒绝信息，任务必须输出 writer 的文案并以退出码 0 正常结束。保持该限制阈值为默认值不变，避免使用宽泛的 `autonomous` 模式。

事件流已经确凿证实了权限缺失是唯一根因：每轮均记录了无人应答的人工确认提示、`isError: true` 的返回结果，且决策链中无任何规则或钩子介入。同一文件调用 `transfer_task` 的前序运行从反面提供了证据：无需确认的工具单次执行即可顺利返回。

## Wrong turns

- "调大连续调用次数上限以便任务能跑完。" 每次调用都会遭遇相同的拒绝。增加轮次只会换来更多拒绝，阈值限制是终结任务的唯一安全保护。
- "使用 `--yolo` 运行任务。" 那是 `--safety autonomous` 模式：所有工具（包括子 agent 的所有操作）均会被无条件放行。为特定工具配置单条 allow 规则是更细粒度的最小改动。
- "模型存在缺陷，应更换模型。" 模型仅收到了一个错误字符串。其他模型同样会采取重试策略，运行时设置门禁正是为了防范此类现象。在归咎于模型前先排查权限。
- "添加返回 allow 的 `pre_tool_use` 钩子。" 抢占式钩子返回的 allow 仅作为建议。钩子可以拒绝或发起询问，但无法越权直接授权。

## Generalize

以文本形式回传给模型的工具执行结果，属于模型有可能选择忽视的不可信输入。在无人值守的运行环境中，必须为 agent 明确赋予其执行所需工具的显式 allow 权限且不作过多授权，并始终保留运行时对死循环的熔断拦截机制。将任务终止行视为安全门禁生效的证明，进而追查模型陷入死循环的深层诱因。

## Taught in

[子 agent 章节](../../../manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md)记录了该运行过程，[权限章节](../../../manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md#the-order-and-what-a-hook-can-change)梳理了决策层级顺序，而[失效模式课程](../../../phases/14-agent-engineering/26-failure-modes-agentic/)将重复步骤列为防护门禁失效的典型表现。
