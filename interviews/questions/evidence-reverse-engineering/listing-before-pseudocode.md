---
id: listing-before-pseudocode
title: 四个测试通过而重构产物长达 26 字节
card: evidence-reverse-engineering
kind: debug
level: 2
roles: [agentic-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, coding]
tags: [reverse-engineering, decompiler, pseudocode, rebuild, integer-width]
minutes: 8
lessons: [phases/13-tools-and-protocols/34-lifting-to-pseudocode, phases/13-tools-and-protocols/36-rebuild-and-prove-equal]
manuals: [reverse-engineering-101#s-a-proof-harness-outside-rea]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/observed-derived-inferred]
updated: 2026-11-03
---

某 Agent 根据反编译器的伪代码重构了 `percent_change`。伪代码显示为 `undefined1 [16] percent_change(int param_1, int param_2, ulong param_3)`，其中包含 `lVar1 = (long)((param_2 - param_1) * 100)`。重构代码写为 `(int)(((long)after - before) * 100 / before)`，且四个手写测试用例全部通过。然而同一条记录的汇编清单却显示为 `IMUL EAX, ESI, 0x64`、`CDQ`、`IDIV EDI`。哪里出了错，背后的规范原则是什么？

## Short answer

16 字节的返回值类型以及第三个参数是反编译器的推论，而非程序本身的事实：`idiv` 指令会同时写入寄存器对 `EDX:EAX`，而零值返回分支未触碰 `EDX`，导致反编译器构建了一个 16 字节的结果模型，并将 `%rdx` 误判为输入参数。汇编清单明确指出每个运算均为 32 位宽，因此忠实的重构代码应为使用 `int` 的 `100 * (after - before) / before`；而 `long` 版本对未发生回绕的 64 位乘积执行除法，会在 26 个溢出测试单元中失败，且编译后体积长达 26 字节（原始实现仅有 16 字节）。原则是在阅读伪代码之前先审查汇编清单，依据实际操作位宽编写重构代码，并引述其来源的记录 ID。

## Full answer

### 指令事实还是臆测，逐行分析

| 差异项 | 裁定结果 |
|---|---|
| 返回类型 `undefined1 [16]` 对比 `int` | 臆测；`idivl` 会写入两个寄存器，且没有调用方约束该位宽 |
| `param_3` | 由前一项衍生的臆测；仅因推测了返回值位宽，`%rdx` 才在零值路径上被误读 |
| `lVar1 / (long)param_1 & 0xffffffff` 对比 `/ param_1` | 指令事实；`cltd` 配合 `idivl` 是符号扩展的 32 位除法，两段文本均描述了该行为 |
| 先执行 `if (param_1 != 0)` | 指令呈现顺序；条件分支跳转到零值返回，任何一个分支都可以被优先打印 |

背后有具体指令支撑的差异属于表现形式的选择。背后没有指令支撑的差异则属于主观臆测，且这种臆测可能出现在任何一方。

### 为什么四个测试能够通过

浅层的测试用例避开了所有复杂边界类别。只要 `(after - before) * 100` 的乘积未超出 32 位表示范围，回绕与未回绕的乘积计算结果完全一致，因此从未跨越该临界线的测试会误以为两个函数完全等价。在包含溢出单元的测试网格中，`long` 重构版本会在 26 个测试单元中失败，且每个单元均满足 `|before| > 1`；当 `before` 等于 1 或 -1 时，64 位的商碰巧截断回了回绕后的 32 位数值，两者因而偶然吻合。

### 代码尺寸预先发出了警报

使用原始编译选项编译后，`long` 重构版本的长度为 26 字节：`movslq`、`imulq`、`cqto` 和 `idivq` 替代了原有的 32 位指令形式。尺寸是诊断线索而非最终验收标准，且汇编清单早在编译之前就已经展示了真实的操作数位宽。

### 业界研究对此类模式的揭示

一项 2026 年关于反编译系统的研究发现，某些候选代码虽然通过了基准测试中的全部测试用例，但在模糊测试输入下仍然出现分歧。最强的一款精炼模型将构建成功率从 75% 提升到了 90%，然而行为匹配率却从 74% 跌落到了 62%，其根本原因正是模型臆造了字段、类型、调用目标和保护守卫，以此填补了反编译器在文本中留下的显式未知项。保留 `long` 的重构代码正是这种臆造类型的典型写照。

## Follow-ups

- **Level 2:** 为什么最初的四个测试未能发现问题？ Expected: 它们均未使乘积超出 32 位表示范围，而在乘积能够容纳的所有输入下两版本结果均完全一致。
- **Level 3:** 哪些输入会暴露出差异，哪些输入会偶然掩盖差异？ Expected: `|before| > 1` 的溢出单元会失败；`before` 为 1 或 -1 则因宽位宽的商截断回回绕数值而偶然一致。
- **Level 3:** 在运行任何测试之前，26 字节的体积传达了什么信息？ Expected: 更宽位宽的指令形式替换了 32 位指令，说明候选代码以不同于汇编清单的位宽运算。
- **Level 4:** 关于精炼模型的研究发现如何改变你解读整洁伪代码的方式？ Expected: 当整洁的函数签名填补了未知项时，它往往是出于错误的原因而看似正确；宁可保留丑陋但诚实的原始形态，并记录下没有任何指令支持的未知内容。

## Wrong answers

- "反编译器损坏了，忽略其输出。" 它的指令解析是正确的；仅臆测了指令未明确约束的部分，同一记录中的汇编清单正是纠正依据。
- "`& 0xffffffff` 是反编译器的 bug。" 它正确地描述了符号扩展除法的位宽截断行为。
- "十个测试都通过了，直接发布。" 包含溢出、负数、取整和除法陷阱的测试网格才是严谨的测试；十个浅层用例避开了所有风险。

## Taught in

[代码提升课程](../../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/)填补了差异表，[重构课程](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)运行了测试网格，而[证明控台章节](../../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)记录了 26 个失败的测试单元与 26 字节的候选产物。
