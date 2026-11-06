---
id: resolved-breakpoint-zero-hits
title: 所有断点均已解析且未命中任何一个
card: evidence-reverse-engineering
kind: debug
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [debugging, coding]
tags: [reverse-engineering, dynamic-analysis, debugger, inlining, verdicts]
minutes: 10
lessons: [phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program, phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: []
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/observed-derived-inferred, evidence-reverse-engineering/empty-list-is-not-absence]
updated: 2026-11-03
---

某 Agent 报告称“main 调用了 `bump`、`classify` 和 `sum_balances`”。你在 `-O2` 优化级别下编译该程序，在每个函数名上设置断点，并在调试器下运行。程序正常输出了四行内容并以退出码 0 退出，而 `breakpoint list` 显示每个断点均为 `resolved`（已解析）且 `hit count = 0`（命中计数为 0）。为 Agent 的这项声明以及计划中的其他七项静态分析声明评定裁决等级，并指出测试控台中会导致在真实发生调用的构建版本上也不产生任何中断记录的设计失误。

## Short answer

每个断点都成功解析，说明符号确实存在且已在其地址写入了陷阱指令；在程序完整运行并以退出码 0 退出的前提下命中计数为 0，意味着没有任何指令预取到达过该地址，因此对于本次构建，调用边声明被证伪（refuted），且仅有这一项被证伪，因为编译器内联了所有这三个调用并将求和直接折叠为了常量 315。输出声明被实际打印的四行内容与退出状态码所证实（confirmed），而参数寄存器、字段偏移量、存储操作和步长声明均为未观察到（not-observed），因为没有任何断点中断能够测试它们，且命中计数为零正是其未被观察的原因。测试控台的设计失误在于使用了 `--auto-continue` 自动继续参数：此类断点不报告中断且中断钩子从不执行，导致第一版测试控台即使在所有调用均真实发生的未优化构建上也记录不到任何内容；改用普通断点、中断钩子以及带有固定配额的 `continue` 命令即可解决此问题。

## Full answer

### 三种裁决结果，绝无第四种

测试了断言且结果一致的中断属于 `confirmed`（已证实）；测试了断言且结果不一致的中断属于 `refuted`（已证伪）；没有任何中断能够测试的断言属于 `not-observed`（未观察到），并附带具体原因。证据账本将前两者作为权威度为 `controlled-replay` 的已观察记录予以采纳，而将第三者作为未决的残留未知项保留。已解析的断点从不能替代实际的运行测试。

### 证伪结论的边界与内涵

此处的断言是“该程序中的 `main` 调用了这三个函数”。对于本次构建和本次运行而言，它确实没有调用，且测试控台核实了程序已运行完毕，因为如果程序尚未退出，命中计数为 0 仅表示运行尚未到达调用点。该断言并未声称这三个函数是死代码，本次运行也没有得出死代码的结论：`nm` 仍然列出了它们，因为它们是外部导出的符号，其他目标文件完全可以调用它们，且优化后构建版本的调试信息包含四个子程序条目且没有任何内联子例程条目，甚至调试信息自身都未记录内联事实。结构体在此构建中仍然在偏移 4 处包含 `balance`；只是没有任何断点中断读取内存来证实它，而 `not-observed` 正好如实保留了这一区分。

### 对照用的未优化构建版本运行

在 `-O0` 构建版本上执行相同的测试计划共产生了 11 次中断：三个函数名断点的命中计数分别为 1、3、1，而放置在两个条件分支的目标与顺序执行落入处的四个分支边断点命中计数分别为 2、1、1、1。针对 `a->balance` 设置的内存观察点触发了一次，旧值为 250，新值为 255，这对应着一次 `by` 等于 5 的写入操作，且在函数入口中断处读取的首行内存对照 DWARF 偏移逐字解码成功。在那次运行中，所有八项断言最终全部被裁定为 `confirmed`。

### 输出记录中的另外两处陷阱

若在设置地址断点时未指定模块名称，则在整个运行过程中它都会保持为 `unresolved`（未解析）且 `hit count = 0`，因为在进程建立之前单纯的数字地址背后没有任何具体的节；将汇编清单地址与加载地址关联的正确形式必须指明模块名。此外，在进程退出后执行的第一条 `continue` 命令会导致整个命令脚本中断退出，除非将 `interpreter.stop-command-source-on-error` 设置为 false，否则 `breakpoint list` 根本不会被执行，转储记录中也将没有任何命中计数可供读取。

## Follow-ups

- **Level 3:** 为什么本次运行证伪了调用边却并未判定这些函数是死代码？ Expected: 断言针对的是本程序中的 `main` 函数；这些函数对外导出，其他目标文件可以合法调用它们。
- **Level 3:** 在优化后的运行中，针对 `a->balance` 的内存观察点情况如何？ Expected: 根本没有生效；它原本设置在 `bump` 函数的中断处，而该中断从未发生，因此存储断言属于未观察到；保存在寄存器中的局部变量也不会触发观察点。
- **Level 4:** 调试转储记录在 `breakpoint list` 之前就终止了，发生了什么，如何修复？ Expected: 进程退出后的 `continue` 命令导致命令脚本提前中断；将解释器配置为出错时不停止执行后续命令，以便正常打印统计表格。
- **Level 4:** 为什么保留完整的调试转储记录而不仅仅保留裁决结果？ Expected: 裁决结果是从转储记录中推导而来的，任何人都可以据此重新推导，且转储头部记录了命令行参数与调试器版本。

## Wrong answers

- "命中计数为零意味着这些函数属于死代码。" 这仅意味着在本次构建的本次运行中没有指令预取到达它们；它们是对外导出的，存在被其他调用方调用的可能。
- "`nm` 列出了它们，所以它们被调用了。" 符号表仅列出导出的函数符号；调试信息显示包含四个子程序且没有内联条目。
- "使用 auto-continue 参数保持转储记录整洁。" auto-continue 断点不报告中断且其钩子函数从不运行；整洁的记录实际上是空空如也的无效证据。

## Taught in

[动态分析课程](../../../phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/)运行了两个构建版本并评判了每项断言，[证据课程](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)将裁决结果保存为已观察记录并将其余各项存为未知项。
