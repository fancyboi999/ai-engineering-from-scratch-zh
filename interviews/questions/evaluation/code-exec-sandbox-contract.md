---
id: code-exec-sandbox-contract
title: 给生成的代码打分，但不在评测进程里 exec
card: evaluation
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, agentic-ai-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [code-exec, sandbox, timeout, denylist, exit-codes]
minutes: 10
lessons: [phases/19-capstone-projects/72-code-exec-metric, phases/19-capstone-projects/49-lm-eval-harness]
manuals: []
practice: []
cheatsheet: [eval-driven-agents]
related: [evaluation/two-pass-at-k-formulas]
updated: 2026-11-03
---

你必须运行生成的代码来评分。队友提议在 harness 进程里直接调用解释器的 eval 函数，外面包一个 try 块。请改为设计一份执行契约，并说明超时、崩溃和命中黑名单分别在结果里怎么体现。

## Short answer

每个候选代码都在全新的解释器子进程里运行，设墙钟超时、输出上限和导入黑名单，绝不在 harness 进程里运行。分数是通过的断言所占的比例。超时、语法错误、断言失败和其他崩溃各自对应一个不同的退出原因，所以即使大多数情况分数都是 0，评审人也能分清代码是慢还是错。

## Full answer

### 为什么用子进程

进程内调用扛不住生成代码里的死循环，也扛不住生成代码删掉文件系统。每个候选代码配一个新的解释器：从标准输入读代码，用 JSON 封装每条断言的结果并写到标准输出，超限就被杀掉。harness 照常运行。

### 契约

1. **提取**：从生成结果里取出第一个围栏代码块，后处理规则与任务规格一致。
2. **构建**：用这段代码和任务的断言字符串拼出一个运行脚本。
3. **启动**：起一个新的解释器，默认墙钟预算 3 秒，运行器把它限制在 0.1 到 30 秒之间。
4. **限制输出**：运行器以流的方式读取标准输出，总量超过 256 KB 就杀掉子进程，记为错误，详情为输出溢出。
5. **拒绝危险导入**：把它们改写成抛出导入错误，包括调用操作系统 shell 的函数、subprocess、socket、shutil、各类网络请求库以及外部函数接口。这份名单只是兜底，真正起作用的是超时和输出上限。

### 结果用语

| 退出原因 | 含义 |
|---|---|
| pass | 所有断言都通过 |
| assertion_fail | 代码跑完了，至少一条断言失败 |
| syntax_error | 代码无法导入 |
| timeout | 墙钟时间用完 |
| error | 其他崩溃，包括命中黑名单和输出溢出 |

分数仍然是一个比例：三条断言过两条就是 0.667。退出原因是元数据，由排行榜那一层决定超时算 0 分还是算缺失数据。

### 更小的 harness 怎么做

排行榜那节课里的小 harness 在剥掉了内置函数的命名空间里运行预测，它的测试断言导入操作系统模块会失败。它还为了速率限制而限制批大小，并用哈希固定任务文件，这样分数变了就能追溯到是哪个任务变了。

### 它不是什么

它不是运行公网不可信代码的沙箱，也不适合需要文件或网络的有状态任务。那些需要容器或 microVM。

## Follow-ups

- **Level 3:** 为什么黑名单不是主要控制手段？ Expected: 存心绕过的代码能逃出任何进程内防护；不管代码做什么，墙钟超时和输出上限都能限住运行时间和输出量。它们限不住内存和文件写入，所以生产环境还要加只读文件系统和网络隔离，或者用容器。
- **Level 3:** 一个候选代码在死循环里不停打印。哪项控制会触发？ Expected: 256 KB 的输出上限，记为错误，详情为输出溢出；超时会更晚触发。
- **Level 4:** 排行榜该把超时算 0 分还是算缺失？ Expected: 这是要写进文档的选择；如果对这个任务来说慢就是错，算 0，如果只衡量正确性，算缺失；有了退出原因，两种都能报告。
- **Level 4:** 什么时候断言字符串就不够用了？ Expected: 当评测需要与生产 CI 一致时；换成在容器里跑真正的单元测试文件，并且别再把这些字符串叫作测试。

## Wrong answers

- "给调用包一个 try 块就是沙箱。" 它只能捕获异常，挡不住死循环、删文件和内存暴涨。
- "有了黑名单就安全了。" 它是保守的兜底；综合项目明确说它并非万无一失。
- "把超时当崩溃计分。" 在退出原因里把两者分开；分数可以都是 0，但原因会告诉你该不该调大预算。

## Taught in

[代码执行指标综合项目](../../../phases/19-capstone-projects/72-code-exec-metric/)给出了子进程契约、退出原因和各项限制，[语言模型评测 harness 综合项目](../../../phases/19-capstone-projects/49-lm-eval-harness/)在精简的命名空间里运行预测并固定任务文件。
