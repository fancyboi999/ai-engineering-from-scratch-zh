---
id: byte-match-is-not-source
title: 相同的 46 字节与重定位结构却对应错误的表
card: evidence-reverse-engineering
kind: design
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [reverse-engineering, rebuild, relocation-masking, byte-comparison, proof]
minutes: 10
lessons: [phases/13-tools-and-protocols/36-rebuild-and-prove-equal]
manuals: [reverse-engineering-101#s-a-proof-harness-outside-rea, reverse-engineering-101#s-compare-and-compare-functions]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/listing-before-pseudocode, evidence-reverse-engineering/addend-0x10-table-0x14]
updated: 2026-11-03
---

设计重构证明的第二阶段：使用生成原始二进制文件的相同编译器与编译选项构建每个候选源码，然后将其与原始函数比较。摆在桌面上的有八个候选对象，其中包括一对源码行写法不同但同样重构了 `percent_change` 的候选、一个 46 字节代码与重定位形态均匹配原始函数但在 `case 10` 时返回 3 的 `grade` 候选，以及若干重定位加数与原始函数不同的候选。说明比较过程在每一步执行的操作、每一步会拦截哪些候选，以及测试通过的真正含义。

## Short answer

按顺序执行三个步骤：首先将两边的每个重定位字段字节清零做掩码，然后比较指令代码；其次按偏移量、类型和目标节比较重定位记录，而不比较加数本身，因为原始文件记录的是 `.rodata+0x10` 而每个候选记录的是 `.rodata-0x4`，这代表不同的表位置而非不同的函数；随后读取每个重定位所指向的字节数据（在此处为五个 4 字节的字）并比较。包含错误常量的候选可以通过前两个步骤，仅在第三步对比 `1, 2, 3, 4, 4` 与 `1, 2, 3, 4, 3` 时失败。通过测试证明了该特定编译器在这些选项下从该候选生成了相同的代码及相同的引用数据；这并不证明候选就是原始源码文本，因为两份文本写法不同的 `percent_change` 重构源码编译出了完全相同的 16 个字节。

## Full answer

### 每个候选被拦截的环节

| 候选 | 大小 | 掩码后字节 | 重定位记录 | 数据表 | 状态 |
|---|---|---|---|---|---|
| `percent_change_mul_first` | 16 与 16 | 相等 | 无 | 无 | 通过 |
| `percent_change_split` | 16 与 16 | 相等 | 无 | 无 | 通过 |
| `percent_change_wide` | 16 与 26 | 大小不同 | 无 | 无 | 失败 |
| `percent_change_div_first` | 16 与 18 | 大小不同 | 无 | 无 | 失败 |
| `grade_switch` | 46 与 46 | 相等 | 形态相同 | 相等 | 通过 |
| `grade_table` | 46 与 46 | 相等 | 形态相同 | 相等 | 通过 |
| `grade_thresholds` | 46 与 39 | 大小不同 | 1 条对比 0 条 | 无 | 失败 |
| `grade_case10_wrong` | 46 与 46 | 相等 | 形态相同 | 不一致 | 失败 |

代码大小仅作为诊断依据，从不是验收标准：某记录在案的重构项目曾报告过一个长度完全吻合却有数百个字节不一致的候选。

### 为什么字段已为零仍需掩码

在 RELA 目标文件中，加数保存在重定位记录中，指令中的 4 字节字段在两边本就均为零，因此直接比较字节本可以通过，但两条重定位却可能指向不同的位置。无论如何都执行掩码操作，可以使方法统一适用于 REL 目标文件以及 Mach-O（在这两者中字段本身承载加数）。加数之所以不同，是因为原始目标文件在 `.rodata` 中的 switch 跳转表之前还存有另一张表，而候选目标文件则没有。

### 为什么要读取常量数据

这一步之所以存在，是因为另一重构项目中出现过一个记录在案的缺陷：某种对比实现将目标地址重放回重定位字段中，对比了指令字节，却从未核验该地址上的实际数据，导致源码字面量 `0.0` 在与目标字面量 `128.0` 对比时被误判为完全匹配，直到全面审计了 1,548 个浮点引用才暴露问题。包含错误常量的候选正是测试固件针对该缺陷的复现，而读取数据表就是审计手段。5 个元素的数量来自汇编清单：与 4 比较并配合无符号跳转允许索引 0 到 4，而加载指令为每个索引读取 4 个字节。

### 工具自带的比对功能能看到什么

比较工具在 8 个维度上逐行比对分析工具提供的文本差异，其汇编维度带有两项固定局限：比对的是未对地址或生成名称做归一化的分析工具原始文本，且汇编文本是不透明的原始字符串、无法做重定位归一化。汇编维度显示为 `unchanged` 仅意味着来自同一引擎的文本相同，显示为 `changed` 仅意味着文本不同，两者均不是关于二进制物理字节的断言。位于不同虚拟地址的两份相同代码会被比对判定为 changed。物理字节级别的证明是工具留给分析人员自行完成的部分。

## Follow-ups

- **Level 3:** 在匹配两条重定位记录时，为什么将加数排除在外？ Expected: 加数编码了该表在具体目标文件的 `.rodata` 中的存放位置，这取决于该目标文件还包含哪些其他内容，而非该函数本身的行为。
- **Level 3:** 比较工具中的 `changed` 汇编维度能告诉你关于两个函数的字节的什么信息？ Expected: 什么都不能说明；它只是包含地址的文本差异，可重定位目标文件与其链接后的映像文件相比也会被判定为 changed。
- **Level 4:** 两个源码文本不同的候选通过了所有字节级检查，你证明了什么？ Expected: 证明了该编译器将两者折叠为了完全相同的代码和数据，并不能证明其中任何一个是原始源码文本；有符号数溢出属于未定义行为，使编译器能够将两次乘法合并。
- **Level 4:** 候选通过了字节和常量比对，其行为是否完全确定？ Expected: 在相同架构下是确定的，因为代码和引用数据均相等；陷阱单元仍取决于运行网格的主机环境，因此证明文件指明了该主机。

## Wrong answers

- "代码大小相等即意味着功能相等。" 大小仅是诊断信息；长度匹配的候选可能存在数百字节的差异。
- "字节级别的一致可以还原原始源码。" 不同的源码文本可以编译出完全相同的字节；匹配只是针对特定编译器和特定标志集的结论。
- "比较工具显示 unchanged，所以字节匹配。" 它比对的是包含地址的反编译文本，且在其自身的局限性声明中对此有明确说明。

## Taught in

[重构课程](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)构建了掩码、记录对比和表读取逻辑，[证明控台章节](../../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)记录了这八个候选，而[比较章节](../../../manuals/reverse-engineering-101/sections/5-5-compare-and-compare-functions.md)陈述了汇编维度的局限性。
