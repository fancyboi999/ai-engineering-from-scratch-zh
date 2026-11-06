---
id: fail-closed-proof-record
title: 没有编译器时保持 unknown 的证明记录
card: evidence-reverse-engineering
kind: design
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, design-review]
tags: [reverse-engineering, proof, verification, evidence, fail-closed]
minutes: 15
lessons: [phases/13-tools-and-protocols/36-rebuild-and-prove-equal, phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: [reverse-engineering-101#s-verify-reconstruction, reverse-engineering-101#s-a-proof-harness-outside-rea]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/byte-match-is-not-source, evidence-reverse-engineering/hazard-grid-estimate]
updated: 2026-11-03
---

为重构后的函数设计一份履约账本能够接受的证明记录。分析工具自带的校验器对照比对记录评判声明的断言，其固有局限性描述为“通过仅表示每个声明的断言均通过；并不确立全局实现的等价性”；其就绪规则指出，弱于 pass（通过）的任何状态都不能累加为 pass。你的 CI 主机上没有 C 编译器。说明你的记录包含什么内容、其 ID 如何生成、它可以和不能从该工具携带哪些断言，以及它在该主机上获得什么状态。

## Short answer

由于没有现成的公共工具能够生成此类记录，因此需要自行铸造一条证据记录，赋予其 `predicate_type: rea.reconstruction-proof`、`operation: verify_reconstruction_obligations`、`confidence: observed`、`authority: controlled-replay`，以及包含 `passed`、`status` 和断言列表的 `normalized_result`，每个断言为 `behavioral`（行为）或 `structural-function`（结构函数），带有其状态及所依赖的函数卷宗的 `ev_` 证据 ID，并在 `evidence_links` 中重复引用。ID 是 `ev_` 加上对排除了 ID 字段本身、基于键排序紧凑 JSON 的记录计算出的 SHA-256 哈希值。聚合逻辑采用故障关闭原则：`fail` 优先级最高，其次是 `unknown`，空断言列表亦判定为 `unknown`。工具的校验器只能将 `structural-function` 断言评判为在单一维度上拥有相同的工具输出文本，因此行为和物理字节必须来自你自己运行的两个阶段；在没有编译器的 CI 主机上，行为断言为 `unknown`，即便两个字节断言均通过，整个记录的状态仍判定为 `unknown`。

## Full answer

### 为什么工具自带的通过并不足够

一个 `structural-function` 断言指名 `compare_functions` 记录的 9 个维度之一，校验器按固定顺序计算其状态：任何局限性声明都会使其变为 `unknown`，观察到 `changed` 会使其变为 `fail`，观察到 `unknown` 或存在未结清的残留未知项会使其变为 `unknown`，否则才为 `pass`。某次录制的运行提交了 4 个断言，得到 2 个通过和 2 个失败。`total` 断言失败，即便两次构建来自完全相同的源码行，因为 `-O2` 优化将循环展开为 62 条指令，而 `-O1` 仅有 13 条指令；不同的指令文本并不意味着不同的行为。反之亦然：跳转查找表中带有错误常量的重构代码在反汇编时输出相同的汇编文本，因此文本断言在错误的函数上也可能通过。该工具本身既不运行函数，也不编译代码。

### 你亲自运行的两个阶段

第一阶段将原始函数与候选函数以不同名称编译进同一个程序中，针对每个危险类别运行网格测试，并记录每个测试单元的结果（包括异常陷阱）。第二阶段使用原始编译选项重新编译候选函数，掩码重定位字段，按结构对比重定位记录，并读取它们所指向的常量数据。每个阶段针对每个函数生成一个断言，且每个断言链接它所覆盖的函数的卷宗记录。在缺乏编译器的情况下，行为断言被标记为 `unknown`，而非跳过或通过。

### 权威度与证据 ID

`authority` 必须标记为 `controlled-replay`，因为证明事实来自你所控制的测试控台运行，而非仅仅来自目标文件本身；若标记为 `shipped-artifact` 则宣称目标文件本身就足以支持等价性，而事实并非如此。ID 除了自身之外不排除任何字段：增加断言或增加测试运行都会改变内容和 ID，因此随后在配备编译器的机器上生成的证明是一条全新的记录，两者都会被保留。没有任何公共工具直接输出这种记录，但履约账本需要它，因此由你负责铸造。

### 驱动校验器

该工具的校验器属于 65 个没有 CLI 命令行封装的 MCP 工具之一，因此 stdio 客户端需要依次发送 `initialize`、初始化通知以及 `tools/call`。两个分析卷宗和比对记录必须在同一个连接中提供，因为校验器读取的是该连接的证据包，而连接关闭会清空保留的记录；务必在关闭前导出证据包。

### 复述就绪规则

任何阶段结果为 fail、unknown、unsupported、truncated 或 skipped，从不能累加为 pass。这句话本身就是聚合函数。

## Follow-ups

- **Level 3:** 为什么权威度是 `controlled-replay` 而非 `shipped-artifact`？ Expected: 证据事实来自你所控制的运行和重编译过程；单凭目标文件无法证明两个函数等价。
- **Level 4:** 校验器通过了两个 `percent_change` 断言，而比对的总体状态却是 `unknown`，这是如何发生的？ Expected: 每个断言读取各自独立的维度；处于未知状态的维度是 `references`，而其开启的残留未知项仅指明了 `overall` 与 `references`。
- **Level 4:** 下周 CI 主机上安装了编译器，该记录会发生什么变化？ Expected: 行为断言重新运行并通过，内容发生改变，因此铸造了新的 ID，而先前的 `unknown` 记录作为历史凭据予以保留。

## Wrong answers

- "校验器判定通过证明了重构版本与原始版本完全等价。" 其自身的局限性声明明确说明了相反事实；它仅在单一维度上比对了反编译文本。
- "由于字节比对一致，在 CI 上将行为断言标记为通过。" 任何弱于 pass 的状态都不能累加为 pass；缺失测试运行属于 `unknown`。
- "添加测试运行结果后继续沿用相同的 ID。" ID 是内容哈希；变更后的记录属于新记录。

## Taught in

[重构课程](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)铸造了该记录及其故障关闭聚合，[核验章节](../../../manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md)展示了四个经过评判的断言与就绪规则，而[证明控台章节](../../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)运行了两个验证阶段。
