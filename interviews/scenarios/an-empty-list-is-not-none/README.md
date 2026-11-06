---
id: an-empty-list-is-not-none
title: agent 把空列表读成了“没有”
card: scenarios
kind: incident
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [evidence, coverage, unknowns, reverse-engineering, agents]
minutes: 25
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: []
related: [scenarios/plausible-is-not-equal, scenarios/exit-zero-was-not-a-pass]
updated: 2026-11-03
system:
  version: rea 6.7.0 at 27dc42d with the Ghidra provider
  model: no model; the fixtures are the ledger binaries built at -O1 and -O2
  hardware: one aarch64 Mac
source:
  - manuals/reverse-engineering-101/capture/out/10-mcp-09-analyze-function-percent-change-O1.json
  - manuals/reverse-engineering-101/capture/out/11-inspect-evidence-bundle-O1.json
  - manuals/reverse-engineering-101/sections/5-2-residual-unknowns-and-coverage.md
  - manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md
---

## Situation

一个编码 agent 通过 rea MCP 服务器分析 arm64 可执行文件 `ledger-arm64-O1`，服务器背后用的是 Ghidra provider。它的任务是对 `_percent_change` 里的除法做安全审查。agent 调用了一次 `analyze_function`，然后在报告里写道：“该函数是叶子函数。它不调用任何东西，所以这次除法不可能走到回调或处理函数。”审查者问这句话的依据是什么。agent 指向卷宗里的一行：`callees` 数组，内容为空。

审查者不接受这一行作为证据，请你说明这份卷宗能证明什么、不能证明什么。你手上有这份卷宗、同一条记录在 bundle 摘要里的对应行，以及介绍这两者的手册页面。报告一小时后要交，而关于叶子函数的那句话，是整份审查其余部分的前提。

## Evidence

- [卷宗里的 callees 数组](evidence/the-callees-line.txt)
- [同一卷宗里的 unresolved_calls 数组](evidence/unresolved-calls.txt)
- [记录里的 relationship_coverage 块](evidence/the-coverage-block.txt)
- [记录列出的十条局限说明](evidence/the-limitations.txt)
- [bundle 摘要里同一条记录的 value_flow 计数](evidence/value-flow-counts.txt)
- [bundle 摘要的开头](evidence/bundle-summary-head.txt)
- [同一卷宗的汇编切面](evidence/the-assembly-facet.txt)

## Questions

1. callees 数组为空。说出两种不同的实际情况，它们都会产生这同一行。
2. 记录里哪个字段说明 callees 集合有多完整？它的值覆盖了什么？
3. 局限说明列表很长。哪一条限定了 callees 数组？它会怎样改变报告里的那句话？
4. bundle 摘要报告了值流的计数。为什么 rea 为那里的零担保，却不为卷宗里的空数组担保？
5. 同一条记录里，什么证据能判定这个函数是否发起调用？写出报告里应该换上的那句话。
6. 如果没有任何切面能判定这个问题，你会记录什么？什么能关闭它？

## Walkthrough

1. **把数组和结论分开。** `callees` 数组为空，说明 provider 没有返回任何已解析的调用引用。它并没有说不存在调用。给出同一行的两种情况是：函数确实没有调用；函数有调用，但 Ghidra 没能把它解析到目标。agent 没有继续查，就选了其中一种。
2. **读第二个空列表。** `unresolved_calls` 也是空的。这排除了一种情况：Ghidra 看到了调用点，但不知道调用目标。它排除不了那些根本没有形成引用的计算跳转或间接控制流。
3. **读覆盖块。** `relationship_coverage.status` 是 `complete`，它的诊断信息说：只返回已解析的 Ghidra 调用引用，未解析的计算目标调用或间接调用仍然未知。complete 的意思是 rea 在没有读取上限的情况下返回了整个已解析集合。这是对 provider 读取结果的陈述，不是对程序运行时行为的陈述。
4. **找出适用的局限说明。** 十条字符串里的第七条说：已解析引用的元数据标出的是 Ghidra 找到的边，没有目标、未解析的控制流仍然未知。记录自己就告诉了你怎样读它的空数组。手册的规则也一样：缺少覆盖意味着未知，不意味着不存在。
5. **对比附有完整性说明的计数。** bundle 摘要展示了同一条记录的 `value_flow` 对象：`truncated` 为 false，被省略的运算、输入和边都是 0。这些零带着一个标志，说明没有任何内容被截掉。`callees` 数组没有这样的标志。附有截断情况说明的零才是一个有明确含义的计数。没有这种说明的空列表，只能说明“未观察到任何结果”。
6. **读未知项计数器。** 摘要开头显示 `unknown_revisions` 为 0。这个数字表示导出 bundle 时还没有记录任何未知项。它不表示调查已经没有悬而未决的问题。
7. **用观测到的切面。** 汇编切面有六条指令：比较并在为零时跳转、减法、移入常数、乘法、有符号除法、返回。没有一条把控制权转给另一个函数。汇编是 Ghidra 观测到的 Listing 文本，叶子函数的结论需要的正是这份证据。为一句正确的话引用 callees 数组，是引错了行。

## Resolution

报告的结论正确，但引用的证据不对。改正后的句子是：“`_percent_change` 的汇编有六条指令，没有调用指令；卷宗在已解析引用完整覆盖的前提下报告没有已解析的被调用方，记录同时说明没有目标、未解析的控制流仍然未知。”报告引用汇编切面、覆盖块和那条局限说明，`callees` 数组只作为次要观察引用。

团队还改了 agent 的写法。它的指令里新加了一条规则：空列表报告为“未观察到”，并在旁边附上覆盖状态，绝不报告为“没有”。如果没有观测切面能判定一个问题，agent 就调用 `record_unknown`，写下这个问题、能关闭它的权威来源和一个推荐的探查方法。对调用类问题，那就是来自汇编或进程采集的 `shipped-artifact` 权威和 `observed` 置信度，和 `compare_functions` 打开的未知项要求的一样。

## Wrong turns

- "callees 数组为空，覆盖又是 complete，所以可以证明这个函数不调用任何东西。" complete 覆盖的是 Ghidra 返回的已解析引用。记录自己的局限说明写着：没有目标、未解析的控制流仍然未知。
- "记一个残留未知项，带着这个悬而未决的问题交报告。" 同一条记录里就有能回答这个问题的观测切面。打开未知项之前，先读完所有切面。
- "bundle 摘要说未知项为零，所以没有未决问题。" 这个计数器报告的是已经记录的未知项。它数不到没人写下来的问题。
- "相信伪代码，它也没显示函数调用。" 伪代码是反编译器的一种解读，类型的置信度很低，同一本手册在这个函数上就展示了这一点。引用指令本身，不要引用对指令的解读。

## Generalize

工具结果里的列表，陈述的是工具看到了什么，不是实际存在什么。把空列表变成“没有”之前，先找到说明这个列表覆盖范围的字段，以及限定它的局限说明；一个带截断标志的计数，比一个什么都不带的数组更可信。某个切面是解读时，去找对同一事物做观测的切面，引用后者。没有观测能判定问题时，把问题写下来，并写明什么证据能关闭它。

## Taught in

[逆向工程 101 的覆盖页面](../../../manuals/reverse-engineering-101/sections/5-2-residual-unknowns-and-coverage.md#what-an-empty-list-proves)读的正是这几行，[卷宗页面](../../../manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md)列出十六个切面并展示了这六条指令，[失败模式这一课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)把超出证据的结论归为 agent 幻觉，[第 35 课](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)用 Python 构建了未知项台账。
