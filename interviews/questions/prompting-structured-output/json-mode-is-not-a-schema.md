---
id: json-mode-is-not-a-schema
title: JSON 模式能保证什么，不能保证什么
card: prompting-structured-output
kind: concept
level: 1
roles: [applied-ai-engineer, agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth]
tags: [json-mode, json-schema, strict-mode, constrained-decoding]
minutes: 6
lessons: [phases/11-llm-engineering/03-structured-outputs, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding, phases/13-tools-and-protocols/04-structured-output]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/three-failure-modes-structured, prompting-structured-output/schema-valid-value-wrong]
updated: 2026-11-03
---

一位队友打开了服务商的 JSON 模式，说抽取输出现在有保证了。JSON 模式保证什么，不保证什么？你应该改开什么？

## Short answer

JSON 模式只保证正常结束的输出能被解析，仅此而已；在 token 上限处被截断的响应仍可能解析失败，所以先检查结束原因。它不保证你的键名、类型、枚举值，也不保证没有多余字段。改开 schema 模式，由服务商接收一份 JSON Schema 并据此约束解码；同时在你这一侧保留检查，覆盖 schema 判断不了的值。

## Full answer

### 四个控制层级

| 层级 | 保证 | 典型失败 |
|---|---|---|
| prompt 里写「用 JSON 回复」 | 无保证；约 90% 合法 | 代码围栏、前导文字、截断、结构错误 |
| JSON 模式 | 语法合法 | 多余的键、类型错误、缺字段 |
| Schema 模式 | 输出符合你的 schema | 类型对但值错，或者拒答 |
| 约束解码 | 每个 token 对 schema 都合法 | 与 schema 模式相同；schema 模式就是这样实现的 |

约束解码那一课说得很直白：纯 JSON 模式保证的是合法 JSON，不是对你的用途合法的 JSON，所以一定要提供完整的 schema。

### 严格 schema 模式对你的要求

结构化输出协议那一课列出了严格模式的规则：每个属性都出现在 `required` 里，所有层级的 `additionalProperties` 都为 false，没有未解析的引用。违反这些规则的 schema 在请求时就会被 400 拒绝。

### 仍然归你管的部分

严格约束下，对正常结束的响应，解析错误和 schema 违规这两种失败消失了。在 token 上限处被截断的响应仍可能解析失败，所以读之前先检查结束原因。还剩两种失败。输入不符合 schema 时，模型可能拒答，你的代码把它当作类型化结果处理。模型还可能在字段里填一个类型正确、内容错误的值；任何格式层都看不到这一点。

## Follow-ups

- **Level 1:** 严格 schema 模式下还剩哪种失败？ Expected: 拒答，即模型判断输入不符合 schema；把它当作类型化结果处理，并把在 token 上限处截断的响应送进错误路径。
- **Level 2:** 严格模式对 schema 有什么要求？ Expected: 每个属性都必填，禁止附加属性，没有未解析的引用；否则请求会被 400 拒绝。
- **Level 2:** 输出符合 schema，但价格是错的。哪一层失败了？ Expected: 没有哪个格式层失败；这个值是编出来的，只有语义检查或评估能发现。
- **Level 3:** 某个字段在源文本里有时没有。schema 怎么写？ Expected: 允许 null 或哨兵值；强制要求一个值的语法会让模型编一个，比如编一个日期。

## Wrong answers

- "JSON 模式意味着键名和我的数据模型一致。" 它只保证语法；多余的键、类型错误和缺字段照样会发生。
- "在 prompt 里加一句「用合法 JSON 回复」是一回事。" 只靠 prompt 的做法可靠性约 90%，会因代码围栏、前导文字和截断而失败。
- "有了 schema 模式就不用校验了。" schema 抓不到类型正确的错误值；要保留语义检查。

## Taught in

[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课列出了四个层级，[约束解码](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)一课警告不要只用 JSON 模式而不给 schema，[结构化输出协议](../../../phases/13-tools-and-protocols/04-structured-output/)一课给出了严格模式的规则。
