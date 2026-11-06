---
id: hazard-grid-estimate
title: 估算证明两个小函数等价所需的测试网格单元数
card: evidence-reverse-engineering
kind: estimate
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [ml-depth, coding]
tags: [reverse-engineering, differential-testing, input-grid, overflow, undefined-behavior]
minutes: 10
lessons: [phases/13-tools-and-protocols/36-rebuild-and-prove-equal]
manuals: [reverse-engineering-101#s-a-proof-harness-outside-rea]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/byte-match-is-not-source, evidence-reverse-engineering/listing-before-pseudocode]
updated: 2026-11-03
---

设计一个输入网格，用于并排对比运行 `percent_change(int before, int after)` 与 `grade(int score)` 的原始版本与重构版本，确保汇编清单中揭示的每个风险点均至少有一个网格测试单元覆盖。估算你需要多少个测试单元以及分别属于哪些类别，并估算保留了反编译器 `long` 类型的重构版本会在多少个测试单元上失败。

## Short answer

直接从汇编指令清单中识别风险点：来自 `TEST EDI, EDI` 的零值保护守卫、针对负操作数朝零截断的整除处理、用于保证四舍五入精度的先乘后除运算顺序、来自 `IMUL EAX` 的 32 位有符号溢出回绕、当回绕后的乘积为 `INT_MIN` 且除数为 -1 时的除法异常陷阱，以及对于 `grade` 函数各个分数区间的边界两侧值加上 switch 分支范围之外的分数。10 个 `before` 输入与 7 个 `after` 输入交叉得到 70 个单元，22 个分数测试用例补充其余部分，总计 92 个测试单元：其中 32 个溢出用例、17 个负数用例、14 个边界用例、12 个常规普通用例、7 个零保护用例、5 个负数截断用例、2 个超出 switch 范围用例、2 个取整精度用例、1 个除法陷阱用例。保留了 `long` 类型的重构版本在 `|before| > 1` 的溢出单元上均会失败（共 26 个），而使用阈值判断重构的 `grade` 会在超出 switch 范围的两个测试单元上失败，因此这对看似合理的重构实现将在 92 个单元中失败 28 个，而 10 个浅层手写测试用例则全部通过。

## Full answer

### 每个风险点对应一个类别

差分测试需要两个具备可比性的系统输入机械生成的测试用例，而最困难的部分在于评判输出结果。在这里，原始二进制文件充当预言机（oracle），因此唯一的问题是两者会在何处出现分歧，而每个测试类别正是回答一个具体的潜在分歧点。零保护单元触发提前返回。负数测试单元检验 `-9 / 10` 为 0 而 `-10 / 10` 为 -1。取整测试单元检验 `(105 - 100) * 100 / 100` 等于 5 而非 0。溢出测试单元促使 `(after - before) * 100` 超过 32 位表示范围。唯一的异常陷阱单元使得回绕后的乘积等于 `INT_MIN` 且 `before` 等于 -1：差值为 536870912，乘百后回绕为 -2147483648，而除数为 -1。

### 为什么溢出属于测试范畴

有符号数溢出在 C 语言规范中属于未定义行为，避免未定义行为的程序生成器之所以规避它，是因为那里的预言机分歧属于不可控噪声。但这里的预言机是一个具有单一固定确定性行为的已编译目标文件，因此溢出测试单元完全属于测试范畴；这里的工程原则是明确区分哪些测试单元立足于语言标准，哪些立足于实际编译生成的字节。汇编清单明确了一切：乘法指令保留了低 32 位，重构实现也必须如此。

### 运行主机是结果的一部分

在 x86-64 架构上，除法陷阱单元会触发除法错误异常，因为商无法装入 32 位寄存器，测试驱动程序会将 `SIGFPE` 捕获并记录为字符串 `trap`。在 AArch64 架构上，`sdiv` 指令不产生异常陷阱，直接返回 -2147483648。在 arm64 主机上的录制运行显示该数值并伴随 `match: true`，而在 x86-64 架构上运行相同网格则记录为字符串 `trap`。报告在每一行旁均标明了所处架构，不包含主机名称的等价证明是不完备的。

### 仿真模型与实际运行严格区分

汇编清单的 Python 仿真模型（包含 32 位回绕与 C 风格除法）预测每个单元的结果；测试运行则负责观察实际结果。零分歧意味着仿真模型与二进制目标文件在每个测试单元上完全一致。仿真模型属于 derived（推导）证据，而测试运行属于 observed（观察）证据，报告将它们保存在各自独立的字段中，而不是将一方混淆归约入另一方。

## Follow-ups

- **Level 3:** 为什么将 C 语言中属于未定义行为的测试单元纳入其中？ Expected: 预言机是一个行为固定的编译目标文件，汇编清单指明了数据位宽，因此重构实现受制于物理指令字节而非语言抽象标准。
- **Level 3:** 在 32 个溢出单元中，`long` 重构版本通过了多少个，为什么？ Expected: 六个，即 `before` 为 1 或 -1 的那些，因为 64 位除法所得的商碰巧截断回了回绕后的 32 位数值。
- **Level 4:** 该测试网格在 arm64 主机上全部通过，对于 x86-64 还有什么未被证明？ Expected: 除法陷阱单元，其原始指令结果因架构而异；需要在 x86-64 上重新运行或明确标注宿主环境限制。
- **Level 4:** 将测试网格扩展到 `total(const int *values, int count)`，应引入哪些类别？ Expected: count 为 0、负数 count、单个元素，以及在 32 位发生回绕的累加和，每一类均对应汇编清单中促使其设立的具体指令。

## Wrong answers

- "十个手写测试用例足以覆盖。" 它们在两处错误的重构版本上均判定通过；没有任何一个用例跨越了数据位宽或 switch 边界。
- "使用模糊测试（fuzzing）替代固定网格。" 随机输入能发现分歧但无法具名归因风险点；对应指令的测试类别能够阐明一次失败意味着什么以及一次通过覆盖了什么。
- "跳过除以负一的测试单元，现实中没人这么做。" 它是输出结果完全取决于底层架构的唯一单元，报告必须标明测试主机。

## Taught in

[重构课程](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)构建了该网格与驱动程序，[证明控台章节](../../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)记录了 arm64 主机上的 92 个测试单元、28 处不匹配以及陷阱测试行。
