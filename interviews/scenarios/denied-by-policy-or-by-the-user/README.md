---
id: denied-by-policy-or-by-the-user
title: 两次拒绝，两种措辞，同一个 agent 文件
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-breadth]
tags: [agents, permissions, safety-mode, hooks, tool-calls]
minutes: 20
lessons: []
manuals: [docker-sandboxes-101#s-permissions-safety-and-hooks]
practice: []
cheatsheet: []
related: [scenarios/five-identical-calls]
updated: 2026-11-03
system:
  version: docker-agent v1.149.0 and sbx v0.47.0
  model: ai/qwen3:4b through the local model runner, at temperature 0
  hardware: one Mac, no GPU
source:
  - manuals/docker-sandboxes-101/capture/fixtures/agents/guarded.yaml
  - manuals/docker-sandboxes-101/capture/fixtures/hooks/log-hook.sh
  - manuals/docker-sandboxes-101/capture/out/20-restricted.txt
  - manuals/docker-sandboxes-101/capture/out/20-strict.txt
  - manuals/docker-sandboxes-101/capture/out/20-hook-stdin.jsonl
  - manuals/docker-sandboxes-101/capture/out/20-debug-tool.txt
  - manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md
---

## Situation

同一个早上来了两张工单，说的是同一个 agent 文件。这个文件给 agent 配了一个 shell 工具集、一条匹配 `echo` 的 `allow` 模式、一条匹配 `rm` 的 `deny` 模式，以及一个在每次 shell 调用时记日志的 hook。两位工程师发了同样的三条消息：运行 `echo m101-ok`，运行 `pwd`，运行 `rm -rf work/m101-nothing`。

第一位工程师在流水线里用 `--exec --safety restricted` 运行 agent。工单说 agent 拒绝了 `rm`，提示文字是 `Tool 'shell' is denied by permissions configuration`，并要求删掉 deny 模式，因为流水线需要一个清理步骤。第二位工程师在笔记本上用 `--exec --safety strict` 运行。工单说 agent 拒绝了 `pwd`，提示文字是 `The user rejected the tool call`，可从头到尾没出现过任何确认提示；工单还说 hook 一定坏了，因为它对每次调用都回答 allow。你手上有这两张工单和两次运行的采集记录。

## Evidence

- [受防护 agent 的工具集、hook 和两条模式](evidence/the-agent-file.txt)
- [--safety restricted 下的三条命令](evidence/the-restricted-run.txt)
- [--safety strict 下的第二和第三条命令](evidence/the-strict-run.txt)
- [hook 写下的三条记录，每次调用一条](evidence/what-the-hook-received.txt)
- [hook 脚本](evidence/what-the-hook-answered.txt)
- [不经过模型，直接调用 shell 工具](evidence/the-tool-without-the-model.txt)
- [运行时对每次工具调用采用的决策顺序](evidence/the-order-of-decisions.txt)

## Questions

1. 两次拒绝用了两种措辞。打开 agent 文件之前，说说每种措辞告诉你决定是在哪里做出的。
2. 没有哪条模式提到 `pwd`。为什么它在一种模式下运行了，在另一种下没有？
3. hook 对三次调用都回答了 allow。为什么这什么也没改变？hook 本来能改变什么？
4. 直接运行工具证明了什么？没证明什么？
5. 哪张工单报告的是 bug，哪张报告的是设计在正常工作？分别要改什么？

## Walkthrough

1. **读 agent 文件。** 一个 `shell` 类型的工具集。一个 `pre_tool_use` hook，带 `matcher: shell` 和 `preempt_yolo: true`，它运行一个脚本。`permissions` 下，`allow` 里是 `shell:cmd=echo*`，`deny` 里是 `shell:cmd=rm*`。没有任何东西提到 `pwd`。
2. **读 restricted 运行。** `echo` 运行了，打印 `m101-ok`。`pwd` 运行了，打印工作目录。`rm` 调用根本没到达工具：响应说配置拒绝了这个工具。这就是 `deny` 模式，它匹配 `rm*`。
3. **读 strict 运行。** `echo` 又运行了。对于 `pwd`，运行时发出了 `tool_call_confirmation`，元数据是 `blast_radius: safe`、`category: fs-read` 和 `safety_label: safe`。在 `strict` 下，无论是哪种标签，都要请求确认。用了 `--exec` 就没有终端，于是询问变成了拒绝，模型收到一条消息，说用户拒绝了这次调用。`rm` 调用收到的拒绝和另一个模式下一样。两种措辞对应两个决策点：denial 表示策略不允许，rejection 表示被询问的人没有批准。
4. **读 hook 记录和脚本。** restricted 运行中，hook 写了三条记录，每次调用一条，`rm` 调用也在内。记录带着 `safety_policy: restricted` 和完整的 `tool_input`。脚本追加这条记录，然后打印 `permission_decision: allow`。决策顺序把抢占式 hook 放在最前面，而从这个位置发出的 allow 只是建议：hook 回答 deny 或 ask 会结束这次调用，回答 allow 并不放行。随后 deny 模式在第二步拦下了 `rm`。
5. **读直接运行工具的结果。** `debug tool` 用同一个 agent 文件的 shell 工具执行 `echo m101-direct`，打印出 `m101-direct`，退出码 0。工具是好的。拒绝是决策，不是工具故障。直接运行说明不了模型会调用什么，所以它只回答了工具集的问题。
6. **把每条命令对应到决策顺序。** `echo`：第三步，命中 allow 模式。`rm`：第二步，命中 deny 模式，两种模式下都一样。`pwd`：没有模式命中，所以走到第五步，由安全模式根据标签 `safe` 决定：`restricted` 允许 safe 标签运行，`strict` 则询问。

## Resolution

第一张工单描述的是策略在正常工作。`deny` 模式在任何模式下都会拦截调用，手册的决策顺序把它放在所有 allow、所有 ask 和所有模式之上。保留这条模式。必须删除文件的流水线，应该在 agent 之外删，或者换一条更窄的 deny，但仍然排除 `rm -rf`。删掉这条不受任何模式或 hook 覆盖的规则后，无人值守的 agent 就失去了这道关卡。

第二张工单报告的是一个不适合无人值守运行的模式。`strict` 对每个未匹配的调用都询问，而没有终端的 `--exec` 会把每次询问变成拒绝。修复方法是笔记本上的运行改用 `--safety restricted`，它让 `safe` 标签运行，拒绝 `destructive` 和 `unknown`；或者为 `pwd` 加一条 `allow` 模式。hook 没有坏：抢占式 hook 不授予任何权限，它记下的三条日志说明每次调用它都看到了。证据就是 restricted 运行：`pwd` 打印了工作目录，`rm` 仍然被拒绝，hook 记录了全部三次调用。

两张工单的回复里都该写上手册里的一句话：客户端负责执行权限规则，用来防止意外，不是安全边界。不信任的 agent，就放进沙箱里运行。

## Wrong turns

- "hook 坏了，因为它返回了 allow，调用还是被拒绝。" 抢占式 hook 给出的 allow 只是建议。它回答 deny 或 ask 才会结束调用。没有东西坏了。
- "删掉 deny 模式，让清理步骤在流水线里跑起来。" deny 是唯一一条任何模式、任何 hook 都推翻不了的规则。允许 `rm` 的无人值守 agent 就没有关卡了。
- "用 `--yolo` 运行，这样就不会询问。" 那就是 `autonomous`：每个未匹配的调用都会运行，`destructive` 和 `unknown` 也包括在内。`pwd` 这个情况只需要 `restricted` 或一条 allow 模式。
- "笔记本上的 shell 工具集配置错了。" 针对同一个 agent 文件，直接运行打印出了 `m101-direct`，退出码 0。工具是好的，拒绝它的是决策层。

## Generalize

先读拒绝的措辞。denial 指向策略，rejection 指向用户；无界面运行时，请求确认会变成拒绝。然后把每次调用对应到决策顺序：抢占式 hook、deny、allow、ask、模式。根据是否有人值守终端来选择模式，并记住这些都不是安全边界。

## Taught in

[权限一节](../../../manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md#three-calls-in-two-modes)在两种模式下运行了这三条命令，并给出了决策顺序。
