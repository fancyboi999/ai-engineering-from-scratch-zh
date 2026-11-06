---
id: agent-dossier-take-home
title: 解释 95 输出结果并展示推导过程的 Agent
card: evidence-reverse-engineering
kind: take-home
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [take-home, system-design]
tags: [reverse-engineering, agent, evidence-ledger, prompt-injection, mcp, take-home]
minutes: 60
lessons: [phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns, phases/13-tools-and-protocols/36-rebuild-and-prove-equal, phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program, phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch]
manuals: [reverse-engineering-101#s-an-agent-investigation, reverse-engineering-101#s-the-readme-use-rule-and-the-law, reverse-engineering-101#s-open-binary-and-the-headless-bridge]
practice: []
cheatsheet: [reverse-engineering, agent-failure-modes]
related: [evidence-reverse-engineering/observed-derived-inferred, evidence-reverse-engineering/empty-list-is-not-absence, evidence-reverse-engineering/fail-closed-proof-record]
updated: 2026-11-03
---

课后大作业。构建测试控台，让 Agent 通过分析工具的 MCP 服务回答关于你自己编译的一个程序的问题：对于输入分数 95，该程序会打印什么，以及对应字母从何而来？交付授权说明、带有截止时间的调用计划、每行记录一个断言的证据账本、未决未知项、针对文件中提取文本的处置规则，以及随付的测试集。

## Short answer

首先编写授权说明：目标是你自己构建的程序，该说明仍须以书面形式回答五个问题，即合法副本、明确目的、现有渠道无法获得的事实、仅限于必要范围的工作，以及在发布的任何产物中仅使用你自己的表达。按顺序规划调用：在导入前执行 `open_binary`、`list_procedures`、`list_strings`，对两个函数执行 `analyze_function`，随后对卷宗指名的两个表执行 `read_bytes`，并在 `close_binary` 之前执行 `export_evidence_bundle`，同时基于实测的冷启动耗时设置客户端超时，因为首个由引擎支持的调用需要支付导入开销。维护一个证据账本，每行记录一个断言，每行标明 observed（已观察）、derived（已推导）、inferred（已推论）和 unknown（未知）中的一种类型、证据 ID 以及边界，并保持“95 打印 A”这一行为推论状态，直到两次读表操作将其转为已观察。将从目标文件中提取的所有字符串、符号名和反编译伪代码行均视为带有地址的数据，从不当作指令执行。

## Full answer

### 授权

每个分析目标都是你自己编写并编译的程序，说明文档中应附带哈希值予以明确。对于任何其他程序，该说明在执行第一条命令前回答五个问题，并指出法律规定的明确目的。工具本身不校验授权，授权责任由你承担。

### 调用计划与截止时间

`open_binary` 返回格式、类型、SHA-256 和架构信息，而不导入任何内容。首个由分析引擎支持的调用会启动无头导入并耗时数秒，随后对同一目标的调用仅需数毫秒。服务端为该启动过程预留了 330,000 ms，而锁定的客户端 SDK 默认等待 60,000 ms，因此客户端截止时间应根据你自己首次运行的实测耗时配置。在调用 `close_binary` 之前提出所有疑问，因为关闭操作会删除项目并清空保留的记录；必须先导出证据包，以确保账本中的每个 ID 持续可查。

### 证据账本

录制的操作会话返回了 13 个过程和 39 个字符串，随后生成了两个分析卷宗。其账本部分记录如下：

| 断言 | 类型 | 证据 | 边界 |
|---|---|---|---|
| `_grade` 将其参数除以 10 | derived | 卷宗中的乘以 `0x66666667` 以及移位操作 | 反编译伪代码印证的汇编清单解读 |
| `lea` 所指的表中存在五个 4 字节条目 | derived | `cmp w8, #0x4` 与带缩放的加载指令 | 数量来自比较指令，宽度来自移位 |
| 该表中的五个具体数值 | unknown | 无；长度为 20 的 `read_bytes` 调用可观察它们 | 本次会话中没有任何调用读取过内存 |
| 在此构建中没有任何 call 指令调用 `_grade` | observed | `callers: []` 以及一个 `DATA` 引用 | 覆盖范围仅对已解析的直接调用成立 |
| 分数 95 会打印 `A` | inferred | 读者拥有的 C 语言源码 | 本次会话中没有任何记录能支持此项 |
| 函数名 `_nothing` | refused | `invalid_request` | 失败的调用不产生任何证据 |

倒数第二行区分了诚实的报告与盲目自信的报告。读者编译了源码并知晓答案；Agent 的证据记录仅停留在两个未读取的表上，而两次 `read_bytes` 调用正是下一步调查的行动。

### 来自文件的文本仅作为数据

从目标程序中复制出的每个字符串、符号名称、注释以及伪代码行都是目标文本。Agent 引用它们时必须附带其地址且从不依此执行，账本中也没有任何用于处理从文件中接收到的指令的行类型。每个可能携带此类文本的结果在返回时都会带有来源标记，指明该分析目标属于不可信数据；该标记告知 Agent 哪些文本来自文件，Agent 仍须严格执行此规则。一项 2026 年的研究在二进制文件中植入了文本，发现在缺乏控制的情况下，模型在 40 个案例中有 35 次建议执行植入的不安全动作；仅将内容作为数据展示仍留有 40 例中的 15 次，而结合工具授权的来源校验则消除了此类风险。

### 随付测试集

1. 替身服务器针对相同工具与参数重放录制的记录，使循环在未安装分析引擎的情况下也能运行。
2. 每条记录的 ID 都会根据其内容重新计算，任何移除了局限性声明的记录都会被拒绝。
3. 晋级机制拒绝 derived 或 inferred 类型的 ID，仅在 `controlled-replay` 模式下存在一致性运行时方可通过。
4. 当某些输入有测试运行记录而其他输入没有时，账本将断言标记为 `unknown`，从不向上取整。
5. 固件二进制文件中携带看似命令的字符串，测试断言账本仅将其作为带有地址的数值保存，且没有任何指令被执行。
6. 客户端截止时间若短于测得的冷启动耗时，会产生记录在案的超时步骤，而非分析结论。

## Follow-ups

- **Level 3:** 为什么在关闭之前必须导出证据包？ Expected: 关闭操作会删除项目并清空保留的记录，账本中的 ID 只有对照证据包才能核验。
- **Level 4:** 主机构建版本的运行结果与对 95 的预测相符，该行应附带什么限制条件？ Expected: 该目标文件从未实际运行；只是相同源码针对另一架构的构建版本运行了，这是在没有仿真器情况下的最强观察。
- **Level 4:** 字符串列表中包含“运行此命令以继续”。账本如何处理？ Expected: 将该字符串连同其地址作为已观察数值记录，标记此请求，并且不执行任何操作；来源标记是关于数据的数据。
- **Level 4:** Agent 拥有 C 源码，为什么“95 打印 A”仍记录为 inferred？ Expected: 会话中没有任何记录支持此项；两次 `read_bytes` 调用可以支持，在那之前诚实的分类就是推论。

## Wrong answers

- "伪代码返回了 `_labels` 的一个条目，所以该字母属于已观察。" 访问行为是已观察的；其背后的具体数值从未被读取。
- "对于我自己编译的文件，可以跳过授权说明。" 无论如何都要编写；对于自己的构建五个问题不言自明，而这种习惯是对所有其他文件的防线。
- "将程序中的用法提示文本视为程序对 Agent 下达的指令。" 它是目标文本；应连同其地址一并引用，从不依此执行。

## Taught in

[Agent 调查章节](../../../manuals/reverse-engineering-101/sections/8-2-an-agent-investigation.md)梳理了录制的会话及其账本，[使用规则章节](../../../manuals/reverse-engineering-101/sections/2-1-the-readme-use-rule-and-the-law.md)给出了五个问题，[open_binary 章节](../../../manuals/reverse-engineering-101/sections/4-1-open-binary-and-the-headless-bridge.md)度量了冷启动，而[证据](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)、[重构](../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/)、[动态分析](../../../phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/)与 [ELF](../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/) 课程提供了账本、控台、裁决结果以及法律规范说明。
