---
id: few-shot-example-count
title: prompt 里放几个示例，放哪些
card: prompting-structured-output
kind: tradeoff
level: 2
roles: [applied-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-depth]
tags: [few-shot, example-selection, context-budget, classification]
minutes: 7
lessons: [phases/11-llm-engineering/02-few-shot-cot, phases/11-llm-engineering/01-prompt-engineering, phases/11-llm-engineering/15-prompt-caching]
manuals: []
practice: []
cheatsheet: [prompt-engineering]
related: [prompting-structured-output/cot-when-it-hurts]
updated: 2026-11-03
---

某个分类 prompt 有八个输出标签。一位工程师想放 20 个示例求稳，另一位想一个都不放，改写更长的指令。你放几个示例？放哪些？由什么决定？

## Short answer

大多数任务放三到五个；标签多的分类器每个标签放一个，所以这里放八个。选与输入语义相近、并覆盖每个标签的示例，因为在分类任务上，相似示例比随机示例高 5% 到 15%。少于三个，模型得到的信号不足以提取模式；多于五个，收益会递减，却仍要在每次调用中付出上下文 token 的成本。

## Full answer

### 示例是压缩过的指令

与其描述格式，不如直接展示。与其解释推理，不如直接演示。模型匹配模式比理解抽象规则更可靠。在简单情感分类上，零样本和少样本的差距在 2% 以内；在多步算术和符号推理上，示例能带来 10% 到 25% 的提升。

### 选哪些示例

1. **语义相似度。** 选在嵌入空间里离输入最近的示例。在处理请求时，这意味着维护一个标注示例池，为每次查询选择最近邻示例。
2. **标签多样性。** 覆盖每个输出类别，否则模型看不到某个标签的示例。
3. **难度匹配。** 与目标问题的复杂度相当。

### 成本这一侧

少样本让每次调用多出 200 到 500 个 token。有两件事能让它便宜。数量停在拐点，也就是三到五个。如果示例是固定的一组，就把它们放在 prompt 的稳定部分，即 system 消息和工具定义之后、任何按请求变化的内容之前，这样前缀缓存能按折扣价提供它们。按查询用最近邻挑出的示例每次请求都不同，而前缀缓存在第一个不同的 token 处就停止匹配。把这类示例放在缓存断点下方：上面的 system 消息和工具定义仍然命中，示例按全价计费。

### 零样本什么时候胜出

简单的事实问题、示例会束缚输出的创作任务，以及找到好示例比写好指令更难的任务。不过，prompt 工程那一课仍建议：如果一个 prompt 要在不同服务商上表现一致，就放两到三个示例，因为示例比单纯的指令迁移得更好。

## Follow-ups

- **Level 2:** 零样本什么时候胜出？ Expected: 简单的事实问题、示例会束缚输出的创作任务，以及好示例比好指令更难找的任务。
- **Level 2:** 示例能做到哪些指令做不到的事？ Expected: 它们展示格式和推理，而不是描述；模型匹配看到的模式比理解规则更可靠。
- **Level 3:** 请求时怎么挑示例？ Expected: 把标注池做嵌入，选离输入最近的示例，同时保持标签覆盖；课程测得比随机选择高 5% 到 15%。
- **Level 3:** 示例每次调用要花 200 到 500 个 token，怎么控制？ Expected: 数量保持在三到五个；固定的一组示例放进稳定前缀，让 prompt 缓存按折扣价提供；按查询挑选的示例放在断点下方，因为它们每次请求都在变。

## Wrong answers

- "示例越多越保险。" 超过五个收益递减，而且每个示例每次调用都占用上下文。
- "随机示例就够了，模型会泛化。" 在分类任务上，相似示例比随机示例高 5% 到 15%。
- "把标签描述详细，不放示例。" 对标签多、格式敏感的任务，示例比描述更能传达模式，跨服务商时也是如此。

## Taught in

[少样本与思维链](../../../phases/11-llm-engineering/02-few-shot-cot/)一课给出了示例数量和选择原则，[prompt 工程](../../../phases/11-llm-engineering/01-prompt-engineering/)一课建议跨服务商的 prompt 使用示例，[prompt 缓存](../../../phases/11-llm-engineering/15-prompt-caching/)一课把示例放进可缓存的前缀。
