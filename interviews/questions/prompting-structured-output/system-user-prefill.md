---
id: system-user-prefill
title: 对话调用的三个部分与 prefill 技巧
card: prompting-structured-output
kind: concept
level: 1
roles: [applied-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [system-prompt, prefill, prompt-anatomy, constraints]
minutes: 6
lessons: [phases/11-llm-engineering/01-prompt-engineering]
manuals: []
practice: []
cheatsheet: [prompt-engineering]
related: [prompting-structured-output/json-mode-is-not-a-schema]
updated: 2026-11-03
---

讲讲对话 API 调用的三个部分，以及每部分是做什么的。然后告诉我：不用结构化输出 API，你怎样让模型返回一个没有开场白的 JSON 对象？

## Short answer

system 消息设定身份、规则和输出约束，跨轮次保持不变。user 消息承载任务，每轮都会变。assistant prefill 替模型写好回复的开头，所以在接受不完整 assistant 轮次的服务商上，预填一个左花括号，模型就会接着写 JSON，不带开场白。

## Full answer

### 三个部分

| 部分 | 作用 | 生命周期 |
|---|---|---|
| system 消息 | 身份、行为规则、输出规则；模型把它当作最高优先级的上下文 | 跨轮次保持 |
| user 消息 | 任务或问题 | 每轮都变 |
| assistant prefill | 回复的前几个字符，由你写 | 一轮 |

没有 system 消息时，user 消息的约束不足，模型会用猜测填补空白。

### prefill

发送最后一条消息，role 是 assistant，内容是 `{`。模型从这里接着写，所以回复就是这个对象的剩余部分，你的代码再把花括号补回到最前面。没有开场白，也没有代码围栏。服务商不接受不完整的 assistant 轮次时，改用它的结构化输出模式。

### 写指令，不要写愿望

课程给出的清晰指令规则：说明格式、长度、受众、要包含什么、要排除什么，并给一个输出示例。三类约束有效：去掉部分输出空间的否定约束，保证每次回复都有某种结构的肯定约束，以及处理边界情况的条件约束。

### 不要过度约束

2,000 词规则的 system prompt 会让模型留给任务的余地变少。课程把大多数 system prompt 控制在 500 个 token 以内，并检查其中有没有矛盾，因为两条规则冲突时，模型会随机选一条。

## Follow-ups

- **Level 1:** 为什么 system 消息放在最前面？ Expected: 模型给它最高优先级，而且 user 轮次不断变化时它保持不变。
- **Level 2:** 与「用 JSON 回复」这样的指令相比，prefill 省掉了什么？ Expected: 开场白和代码围栏；回复从对象内部开始，解析器从第一个字符起看到的就是 JSON。
- **Level 2:** 你的 system prompt 已经涨到 2,000 词的规则。课程怎么说？ Expected: 过度约束；模型把能力花在规则上而不是任务上，大多数任务的 system prompt 应在 500 个 token 以内。
- **Level 3:** 怎样写一个在几家服务商上表现一致的 prompt？ Expected: 用平实的英文、明确的格式、XML 风格的分隔符，指令放在开头和结尾，测试时温度设为零，并给两到三个示例。

## Wrong answers

- "system 消息就是第一条 user 消息。" 它的处理优先级更高，并且在 user 轮次变化时保持不变。
- "prefill 在每家服务商上都能用。" 只有部分服务商接受不完整的 assistant 轮次；其他地方用结构化输出模式。
- "system prompt 里规则越多，控制力越强。" 超过某个程度，模型就把能力花在规则上；课程把大多数 system prompt 控制在 500 个 token 以内。

## Taught in

[prompt 工程](../../../phases/11-llm-engineering/01-prompt-engineering/)一课给出了一次调用的组成、prefill 和清晰指令的规则。
