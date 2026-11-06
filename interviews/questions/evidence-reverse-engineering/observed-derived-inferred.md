---
id: observed-derived-inferred
title: 描述 grade(55) 的一句话中包含的三个层级词汇
card: evidence-reverse-engineering
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [reverse-engineering, evidence, confidence, authority, decompiler]
minutes: 6
lessons: [phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: [reverse-engineering-101#s-the-evidence-record]
practice: []
cheatsheet: [reverse-engineering]
related: []
updated: 2026-11-03
---

某 Agent 向反编译器查询 `grade` 函数，阅读了伪代码的默认分支，随后报告称“grade(55) 返回 0，observed（已观察）”。对应的伪代码行为 `uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);`，而该位置的实际物理指令字节为 `xor eax, eax`。在隐藏于这句话中的各个断言上，分别应标注哪一个置信度层级词汇？

## Short answer

置信度是三个词汇之一，且从不是数值：`observed`（已观察）是从指令字节或实际运行中读取的事实；`derived`（已推导）是从已观察记录中计算得出的事实；而 `inferred`（已推论）是尚未被任何观察直接证实的预期。对于反编译器输出了什么内容，记录属于已观察，其权威度为 `shipped-artifact`，因为磁盘上的文件是直接信息源。默认分支返回值是 0 这一断言属于已推导，由汇编清单中的 `xor` 指令以及伪代码表达式推导得出，该表达式计算结果恒为 0 却从未显式写出 0。而当函数实际运行时 `grade(55)` 是否返回 0 则属于推论，直到出现一条与之相符、权威度为 `controlled-replay` 的 `execute_function` 记录为止。

## Full answer

### 两个核心枚举

| 枚举值 | 含义 |
|---|---|
| `observed` | 从物理字节或实际运行中直接读取 |
| `derived` | 根据已观察到的记录计算得出 |
| `inferred` | 尚无任何直接观察支撑的预期 |
| `shipped-artifact` | 磁盘上的物理文件是事实来源 |
| `controlled-replay` | 你所控制的运行过程产生了该事实 |
| `analyst-inference` | 来自分析人员自身的主观判断 |
| `historical-reference` | 较早的代码树或归档文档 |
| `external-service` | 独立于文件和当前主机的外部服务 |

当数据生成方未明确声明时，记录默认赋予 `observed` 和 `shipped-artifact`。但对 `observed` 必须审慎解读：在函数卷宗中，它仅表示该工具记录了反编译器所返回的文本内容，以二进制字节作为权威依据；这并不意味着伪代码就是该程序最初的源码。

### 代价最高的两种常见混淆

第一种混淆是将伪代码误当成对程序运行行为的直接观察。伪代码仅仅是对反编译器输出了什么的观察。上述表达式和汇编指令对任何输入都输出 0，但 Agent 并不知道这一点，它仅仅因为工具输出了文本就盲目相信。第二种混淆是将空列表当作证明不存在的证据。覆盖缺失代表未知，而非不存在。

### 断言如何晋级流转

一个断言从 inferred 推进到有依据支撑，唯一途径是通过实际观察到的测试运行：当每个输入均有相符的运行记录且没有任何不一致时评定为 `pass`；当任何一次运行出现分歧时评定为 `fail`；当部分输入有运行记录而其他输入没有时评定为 `unknown`；当没有任何输入具有运行记录时评定为 `unsupported`。使用相同源码针对当前主机编译的构建版本的运行也可以计入，但必须附带原目标文件本身从未实际运行的局限性声明。该说明必须随断言一同流转，因为删除了它的报告会丢失读者所必需的关键信息。

## Follow-ups

- **Level 1:** 为什么置信度采用明确的词汇而非概率百分比？ Expected: 这三个词汇指明了证据支撑的具体类型，而单纯的数值会掩盖其证据来源类别。
- **Level 2:** 为当前主机编译的相同源码运行结果与预测相符，关于 x86-64 目标文件的断言是否算作 observed？ Expected: 算作，但必须带有主机构建实际运行而原始目标未运行的限制声明；这是在缺乏仿真器情况下的最强观察。
- **Level 2:** 在你自己的测试控台下运行能获得何种权威度？ Expected: `controlled-replay`，以区别于单纯读取文件的 `shipped-artifact`。
- **Level 3:** 反编译器的签名声明该函数返回 16 字节并接受第三个参数，应使用哪个词？ Expected: 分析工具的 inference（推论）；卷宗将其返回类型置信度标记为 low，记录中应当予以如实陈述。

## Wrong answers

- "因为它是工具生成的，所以属于 observed（已观察）。" 工具输出的文本是已观察的；其描述的运行时行为属于已推导或已推论。
- "赋予它百分之九十的置信度。" 置信度是一个包含三个取值的分类标签，不是数值。
- "该表达式是反编译器的 bug。" 它是正确的但难以阅读；同一比特的两种写法相互抵消，而底层汇编指令仅用两个字节就完成了表达。

## Taught in

[证据课程](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)使用这三个词汇和五种权威度构建了证据账本，[证据记录章节](../../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)展示了录制卷宗上的对应字段。
