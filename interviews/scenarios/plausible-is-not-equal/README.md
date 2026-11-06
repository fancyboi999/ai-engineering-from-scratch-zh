---
id: plausible-is-not-equal
title: 看似合理却不等价的重建函数
card: scenarios
kind: incident
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth, design-review]
tags: [reverse-engineering, verification, decompiler, evidence, agents]
minutes: 30
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: []
related: [scenarios/an-empty-list-is-not-none, scenarios/exit-zero-was-not-a-pass]
updated: 2026-11-03
system:
  version: rea 6.7.0 at 27dc42d with the Ghidra provider
  model: no model; the fixtures are the ledger binaries built at -O1 and -O2
  hardware: one aarch64 Mac
source:
  - manuals/reverse-engineering-101/capture/out/10-mcp-22-verify-reconstruction.json
  - manuals/reverse-engineering-101/capture/out/17-harness.txt
  - manuals/reverse-engineering-101/capture/out/17-harness-execute-plausible.json
  - manuals/reverse-engineering-101/capture/out/17-harness-execute-equal.json
  - manuals/reverse-engineering-101/capture/out/17-harness-bytes.json
  - manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md
  - manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md
---


## Situation

团队想丢掉原始目标文件，于是让一个 agent 根据 Ghidra 伪代码重建 `ledger` 夹具中的两个函数：`percent_change` 和 `grade`。agent 按反编译器给出的 `long` 写了 `percent_change`，把 `grade` 写成四个阈值比较。它运行课程 harness 里的十个手写测试，十个全部通过。接着它对两条 `compare_functions` 记录调用 `verify_reconstruction`，这两条记录覆盖 `-O1` 和 `-O2` 两个构建。结果是两条断言通过、两条失败。agent 报告："percent_change 已验证等价；total 在两次构建之间变了，所以是编译器把它弄坏了。"

技术负责人读完报告，问了两个问题。这个工具里一条断言通过，能证明函数的什么？一条断言失败，又能证明什么？哪项测试才能决定重建的函数与原函数是否等价？你手上有验证记录、harness 说明，以及 harness 对两组候选函数的输出。

## Evidence

- [验证状态、摘要和第一条断言](evidence/verify-status-and-first-claim.txt)
- [total 汇编文本的断言](evidence/total-assembly-claim.txt)
- [harness 是什么、运行了什么](evidence/the-harness.txt)
- [agent 那组函数在网格上的输出开头和第一处不一致](evidence/plausible-pair.txt)
- [阈值版重建算错的两个 grade 单元格](evidence/plausible-grade-misses.txt)
- [等价的那组函数在同一网格上的结果](evidence/equal-pair.txt)
- [字节比较中一个表项写错的重建版本](evidence/wrong-constant-passes-bytes.txt)

## Questions

1. 一条断言通过，状态为 `observed_status: "unchanged"`。它比较了什么？这里的 unchanged 指什么？
2. 两个构建来自同一行源码，`total` 的断言却失败了。断言失败是否说明函数的行为变了？
3. agent 那组函数通过了全部十个简单测试。它在网格的 92 个单元格中算错了多少个？这些错误属于哪几类隐患？
4. 哪组函数在每个单元格上都与原函数一致？在称它等价之前，它还必须通过什么检查？
5. 一个候选函数只有一个表项写错，它的掩码字节相等，重定位也匹配。哪项检查能发现它？
6. 按顺序写出重建函数的验收规则。

## Walkthrough

1. **先看验证器比较的是什么。** 验证记录为 `status: "fail"`，其中两条结构断言通过、两条失败。第一条断言 `percent-change-assembly` 显示 `pass`，观测状态为 `unchanged`。一条结构断言的状态取自一条 `compare_functions` 记录的一个维度，这个维度是 Ghidra 输出文本的逐行 diff。所以通过只说明两份汇编文本逐行相同，仅此而已。记录自带的局限说明也写明：通过不能证明整个实现等价。
2. **再看失败的断言。** `total-assembly` 显示 `fail`，观测状态为 `changed`。`total` 的 `-O2` 构建与 `-O1` 构建的 Ghidra 文本不同，因为优化器展开了循环。手册统计出 62 条指令，而 `-O1` 只有 13 条。同一行源码，两份文本。文本断言失败并不说明行为变了，agent 说 `total` 被弄坏，没有依据。
3. **看 harness 做了什么。** harness 说明里有两段检查。第一段把原始源码和每个候选函数编译进同一个程序，在 92 个单元格上同时运行两者。第二段把每个候选函数按原始目标平台编译，做完重定位掩码后与原始目标文件比较。rea 6.7.0 两段都没有；这正是 agent 该自己运行却没运行的部分。
4. **看 agent 那组函数在网格上的表现。** 这组看似合理的函数是 `long` 版的 `percent_change` 加阈值版的 `grade`。`naive_passed` 为 true，不一致列表一开始就列出错误：`before` 为 3、`after` 为 2147483647 时，原函数返回 -133，候选函数返回 -1431655899。手册对整个文件的统计是 92 个单元格错 28 个，其中 26 个是 `percent_change` 的溢出单元格：原函数先把乘积按 32 位回绕再做除法，`long` 版不会回绕。
5. **看两个 grade 单元格。** 分数为 110 和 `INT_MAX` 时，阈值版返回 4；原函数的 switch 没有对应的 case，返回 0。这类隐患叫"超出 switch 范围"。十个简单测试一个隐患都没碰到，所以它们全部通过。
6. **看等价的那组函数。** 先乘法、保留 switch 的那组函数，在同样 92 个单元格上不一致列表为空，与 oracle 的分歧列表也为空。这说明第一段通过了。它仍然不能证明字节相等。
7. **看第二段如何处理写错的常量。** 候选函数 `grade_case10_wrong` 掩码后有 46 个代码字节与原函数相同，有一个偏移、类型和节都相同的重定位，状态却是 `fail`。它的表是 1, 2, 3, 4, 3，原函数的表是 1, 2, 3, 4, 4。只有顺着重定位去读数据才能发现它。一个重建版本可以通过文本断言，通过掩码字节比较，却仍然算出不同的 grade。

## Resolution

报告撤回重写。`percent_change` 的断言通过，只说明 Ghidra 对两个构建输出了相同文本；`total` 的断言失败，只说明输出的文本不同。两者都不涉及行为，`-O2` 构建里也没有任何东西坏掉。agent 的两个候选函数只是看似合理：能编译，能通过十个简单测试，却在 92 个网格单元格中错了 28 个。最终接受的是先乘法版的 `percent_change` 和 switch 版的 `grade`。它们在全部 92 个单元格上与原函数一致，掩码字节与原函数相同，重定位记录的结构相同，引用的表两边都是 1, 2, 3, 4, 4。

团队写下的验收规则有四步，每一步都必须通过，整体才算通过：rea 中的结构断言通过；第一段在指定主机上的每个网格单元格都一致；第二段的掩码字节和重定位记录都匹配；读出每个重定位指向的字节并加以比较。证明里要记录主机和编译器，因为那个陷阱单元格在这台 arm64 主机上返回一个值，在 x86-64 上会触发陷阱。

## Wrong turns

- "verify_reconstruction 对 percent_change 通过了，所以重建版本已验证。" 这些断言比较的是原函数两个构建的两份 Ghidra 文本。它们从没见过重建版本，通过只代表文本相同。
- "total 的断言失败了，所以编译器改变了 total 的计算结果。" 同一行源码产生了不同文本。失败只说明文本不同，到此为止。
- "十个测试都通过了，包括除数为零和负分数，所以重建是对的。" 十个测试没有一个碰到溢出单元格，也没有一个分数超出最后一个 case。网格有 92 个单元格，正是为此。
- "掩码字节相等，重定位也匹配，可以跳过读表。" 能让写错常量的候选函数失败的，恰恰只有这一项检查。要读出每个重定位指向的字节。

## Generalize

验证器只能评判它设计时要评判的断言，它给出的通过也带着它自己打印的局限。接受结论之前，先问清比较的是什么、和什么比，以及你关心的产物是否真的作为输入参与过。对重建函数来说，等价是一串检查，每一项都能拦下前一项放过的缺陷：文本；在网格上的行为，网格要覆盖代码清单中出现的每一类隐患；掩码字节；以及这些字节指向的数据。没有触及某个隐患的测试即使通过，对这个隐患也什么都没测到。

## Taught in

[逆向工程 101 的验证页](../../../manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md#what-a-pass-does-not-prove)解读了这四条断言，[harness 页](../../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md#leg-two-recompile-and-compare-bytes)对这些候选函数运行了两段检查，[第 36 课](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)搭建了这个 harness，[失败模式课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)讲了没有状态检查支撑的成功声明。
