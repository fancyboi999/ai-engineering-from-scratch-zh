---
id: tool-description-is-a-prompt
title: 工具描述决定调用哪个工具
card: prompting-structured-output
kind: concept
level: 2
roles: [agentic-ai-engineer, applied-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-depth]
tags: [function-calling, tool-schema, tool-choice, error-handling]
minutes: 7
lessons: [phases/11-llm-engineering/09-function-calling]
manuals: []
practice: [tool-call-parser]
cheatsheet: [tool-calling]
related: [prompting-structured-output/structured-output-vs-function-call, prompting-structured-output/tool-call-security-rules]
updated: 2026-11-03
---

某个 agent 有八个工具，却总是调错。每个工具的描述只有一两个词，比如 "gets weather"。描述起什么作用？你怎样重写一条描述？

## Short answer

模型靠读描述来决定何时、怎样调用这个工具，所以描述就是用于工具选择的 prompt。把它重写成一个完整的句子，说明工具做什么、返回什么，比如它获取某个城市的当前天气，返回摄氏温度和天气状况；并为每个参数写上说明，附示例值，取值集合封闭时给出枚举。然后在执行任何东西之前，按 schema 校验参数。

## Full answer

### 模型看到的是什么

工具定义是一份 JSON Schema 契约：名称、描述，以及参数及其类型、各自的描述和必填列表。模型从来看不到你的代码。它只凭这段文字选工具、填参数，所以模糊的描述比精确的描述选得更差；带示例（比如一个城市名）的参数，也比光秃秃的字符串填得更可靠。

### 描述之外

- **工具选择模式（tool choice）。** auto 让模型自己决定。required 强制至少调用一次，当你知道需要查询时，它能阻止模型瞎猜。指定某个工具则强制调用那一个，用于上游逻辑已经知道该走哪条路的情况。
- **并行调用。** 一个问题里有两个城市，可能在一轮里返回两次调用；两个都执行，两个结果都返回。
- **结构化错误。** 失败也作为结果返回，带消息、错误码和建议，比如城市没找到，并给出最接近的名字。模型能根据结构化错误自我修正，空的或笼统的错误则不行。
- **调用预算。** 每次对话最多 10 到 20 次调用，防止循环失控。

### 测量它

写一组查询，每条标上预期的工具；课程练习用了 30 条。运行选择，报告选对工具的比例，并列出容易混淆的工具对。

## Follow-ups

- **Level 2:** 除了工具本身，描述还能用在哪里？ Expected: 用在每个参数上，附示例值，取值集合封闭时给出枚举，这样参数才能填对。
- **Level 2:** 该调用工具时，模型还是在猜。哪个设置能改变这一点？ Expected: 把 tool choice 设为 required；上游逻辑已经知道用哪个时，设为指定工具。
- **Level 3:** 怎样证明重写有效？ Expected: 一组标有预期工具名的测试查询，课程里是 30 条，统计选对工具的比例，并列出混淆的工具对。
- **Level 3:** 工具失败了。它应该返回什么，模型才能恢复？ Expected: 带消息、错误码和建议的结构化错误，而不是异常或空响应。

## Wrong answers

- "模型能从函数名推断用途。" 它读的是描述；模糊的描述比完整的句子选得更差。
- "保险起见，每个工具都写一段话。" 定义随每个请求发送；目标是一句精确的话，加上参数描述。
- "让模型按名字调用任意函数。" 课程的规则是只用你定义的工具组成白名单，绝不做通用的按名执行工具。

## Taught in

[函数调用](../../../phases/11-llm-engineering/09-function-calling/)一课给出了工具定义契约、tool choice 的几种模式、结构化错误和选择准确率练习。
