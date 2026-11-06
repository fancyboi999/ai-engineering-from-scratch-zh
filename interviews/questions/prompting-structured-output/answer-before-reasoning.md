---
id: answer-before-reasoning
title: 有效 JSON 却准确率更低：字段顺序导致的问题
card: prompting-structured-output
kind: debug
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer]
rounds: [debugging, ml-depth]
tags: [constrained-decoding, schema-design, field-order, reasoning]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding, phases/11-llm-engineering/03-structured-outputs]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/json-mode-is-not-a-schema, prompting-structured-output/read-the-constrained-decoder]
updated: 2026-11-03
---

某个分类器用约束解码输出，schema 有两个字段，依次是 `answer` 和 `reasoning`。输出始终是合法 JSON，准确率却比原来的自由文本版本差。问题出在哪里？

## Short answer

问题在字段顺序。模型还没写任何推理就先定下了答案，推理 token 影响不到答案，分步思考带来的提升也就没了。把 `reasoning` 放在前面，`answer` 放在最后；schema 依然合法，也没有任何校验器会发现这个差别，因为顺序是逻辑问题，不是格式问题。

## Full answer

### 陷阱本身

约束解码那一课把它称为真正让你吃亏的陷阱。`answer` 在前时，模型在语法允许的第一个位置就写下决策 token，后面的推理只是为已经做出的选择编故事。`reasoning` 在前时，推理链出现在决策之前，决策 token 以它为条件生成。两份文档都能通过校验，只有一份是对的。

这一课附带的 skill 会拒绝任何把 `answer` 或 `decision` 字段放在推理字段之前的设计。

### 同类的相邻错误

| Schema 设计 | 出什么问题 | 修复 |
|---|---|---|
| 对可能缺失的值（如日期）设严格的匹配模式 | 模型为满足语法编造一个值 | 允许 null 或哨兵值 |
| 重要字段设成可选 | 模型觉得不方便时就省略它 | 设为必填并允许 null，让缺失变成显式的 |
| 嵌套四层或更深 | 每多一层，就多一处可能丢失结构的地方 | 展平 |
| 枚举有数千个选项 | 语法编译很慢或超时 | 先预测一个简短的候选列表，再约束到这个列表 |

### 为什么不加约束的回复反而更好

自由文本回复往往先解释再下结论，所以它碰巧带上了推理链。约束 schema 把这条链去掉了。修复就是有意把它加回来。

## Follow-ups

- **Level 2:** 为什么没有校验器能发现这个问题？ Expected: 两种顺序都符合 schema；问题在于模型写答案 token 时已经看到了什么。
- **Level 2:** schema 强制了日期模式，模型就填入了原文里没有的日期。这是哪一种相邻错误？ Expected: 语法对可能缺失的数据过严；允许 null 或哨兵值，模型就不会编造。
- **Level 3:** 某个字段是可选的，模型在它重要的时候把它省略了。你改什么？ Expected: 改成必填并允许 null，模型就必须明确说出该值缺失。
- **Level 3:** schema 嵌套了四层，错误随之增加。你怎么处理？ Expected: 展平，因为每多一层嵌套，就多一处可能跟丢结构的地方。

## Wrong answers

- "约束解码保证输出正确。" 它只保证形状；课程就展示了合法 JSON 配错误答案的例子。
- "JSON 里的顺序无关紧要。" 对解析器无关紧要；对按顺序逐个写字段的模型很重要。
- "加一项检查，看推理是否支持答案。" 那是评估，不是修复；修复是先生成推理。

## Taught in

[约束解码](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)一课点出了字段顺序陷阱和语法过严陷阱，[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课讲了嵌套深度和可选字段。
