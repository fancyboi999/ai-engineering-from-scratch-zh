---
id: structured-output-vs-function-call
title: 类型化数据还是动作，这个区别为什么重要
card: prompting-structured-output
kind: tradeoff
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, system-design]
tags: [structured-outputs, function-calling, tool-use, json-schema]
minutes: 7
lessons: [phases/11-llm-engineering/09-function-calling, phases/11-llm-engineering/03-structured-outputs]
manuals: []
practice: []
cheatsheet: [structured-outputs, tool-calling]
related: [prompting-structured-output/tool-description-is-a-prompt, prompting-structured-output/json-mode-is-not-a-schema]
updated: 2026-11-03
---

你需要同一个模型做两件事：给支持工单生成一份类型化摘要，以及在对话中查询客户的账户。一位队友想把两件事都做成工具。各自适合哪种机制？这个区别为什么重要？

## Short answer

工单摘要是结构化输出：类型化数据就是最终产物，所以用 schema 模式并做校验。账户查询是函数调用：模型声明一个要执行的动作，你的代码执行它并把结果送回去，所以这个输出只是中间步骤。两者共用 JSON Schema 那套机制，区别在于之后发生什么；把它们混在一起，就分不清哪些输出是数据、哪些是你的代码要执行的动作。

## Full answer

### 一套机制的两种用法

| | 结构化输出 | 函数调用 |
|---|---|---|
| 模型输出什么 | 一条符合 schema 的记录 | 一个函数名和带类型的参数 |
| 接下来发生什么 | 你的代码校验并存储它 | 你的代码执行它，把结果返回给模型 |
| 这个输出是 | 最终产物 | 中间步骤 |
| 适合 | 抽取、分类、类型化摘要 | 查询、写入、任何会触及其他系统的操作 |

函数调用那一课给出了规则：想要数据时用结构化输出，想让模型与外部系统交互时用函数调用。模型从不执行任何东西；它只决定调用什么、传什么参数。

### 什么时候用工具来拿数据是对的

结构化输出那一课给出了例外。当模型必须根据输入在多个 schema 中选一个，比如 10 个抽取 schema，工具调用能一步同时完成选择和结构化。还有一家服务商直接用工具调用提供 schema 模式，schema 放在工具的输入上。这种情况下，按工具返回的数据给它命名，永远不执行它，把它的参数直接送进校验器。

### 为什么在代码里这个区别很重要

记录要经过 schema 校验和语义检查。动作在执行任何东西之前，要经过参数校验、白名单、结果清理和调用预算，因为执行什么是模型选的。如果摘要和查询放在同一个注册表里，针对动作的安全规则要么覆盖了不需要它的数据，要么漏掉了本该覆盖的动作。

## Follow-ups

- **Level 2:** 什么时候用工具调用来拿结构化数据是对的？ Expected: 模型必须根据输入从几个 schema 中选一个时；课程的例子是 10 个抽取 schema，工具调用同时给出选择和结构。
- **Level 2:** 查询的场景里，谁来运行这个函数？ Expected: 你的代码；模型输出函数名和参数，结果作为一条消息送回去。
- **Level 3:** 两者的校验有什么不同？ Expected: 数据要做 schema 校验和语义检查；动作在运行前要做参数校验、白名单和调用预算。
- **Level 3:** 某家服务商只用工具调用提供 schema 输出。怎么保住这个区分？ Expected: 按它返回的数据给工具命名，永远不执行，把参数作为最终记录送进校验器，真正的动作放在单独的注册表里。

## Wrong answers

- "它们是同一个东西，只是名字不同。" 它们共用 schema 机制；一个产出最终数据，另一个请求你的代码执行一个动作。
- "全都用函数调用，更灵活。" 每个工具都是一个带安全规则的可执行面；数据抽取不需要它。
- "模型自己去执行查询。" 模型从不执行任何东西；它输出一次调用，执行者是你的代码。

## Taught in

[函数调用](../../../phases/11-llm-engineering/09-function-calling/)一课区分了数据和动作，并给出了五步循环，[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课讲了用工具调用在多个 schema 中做选择。
