---
id: three-failure-modes-structured
title: 结构化输出调用失败的三种方式
card: prompting-structured-output
kind: concept
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-depth]
tags: [structured-outputs, refusal, retry, strict-mode]
minutes: 7
lessons: [phases/13-tools-and-protocols/04-structured-output, phases/11-llm-engineering/03-structured-outputs]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/json-mode-is-not-a-schema, prompting-structured-output/design-extraction-with-refusals]
updated: 2026-11-03
---

某个抽取服务把采购订单邮件转换成类型化记录。说出结构化输出调用会以哪些方式失败，其中哪些在严格 schema 约束下会消失，以及代码该怎样处理剩下的。

## Short answer

三种：解析错误，输出不是 JSON；schema 违规，能解析但违反了类型、必填字段、枚举或取值范围；拒答，模型判断输入不适合这个 schema。对正常结束的响应，严格约束从机制上消除了前两种。拒答依然存在，它必须是代码记录日志并返回的类型化结果，绝不重试。在 token 上限处被截断的响应仍可能解析失败，所以读输出之前先检查停止原因。

## Full answer

### 三种做法，三种失败画像

1. **用 prompt 要求 JSON。** 在前沿模型上 85% 到 95% 的时候有效。有六种失败方式：缺括号、尾随逗号、类型错误、编造字段、在 token 上限处截断，以及混进 "here is your JSON" 这类文字。
2. **生成后校验。** 自由生成，解析，按 schema 校验，失败就注入错误并重试。可靠，但每次重试都要付费。
3. **约束解码。** 服务商在解码时屏蔽非法 token，所以正常结束的输出天然能解析、能通过校验。模型这一侧的失败收敛为一种：拒答；在 token 上限处截断的响应和请求错误仍需要各自的错误路径。

### 不用严格模式时的重试循环

```text
generate -> parse -> validate -> if fail, inject the error and retry, at most 3 times
```

通常重试一次就够了。三次能兜住弱模型的偶发抖动。超过三次说明 schema 或 prompt 对某些输入有问题，修复应该落在那里，而不是第四次尝试。校验器应返回类型化的错误列表，每个失败带路径和说明，这正是重试 prompt 需要的形状。

### 拒答分支

模型拒绝，可能是因为输入不合适，比如那封邮件是一首诗而不是订单，也可能是出于安全原因。拒答带有原因。记录日志，以类型化结果返回，不重试。课程还把拒答用作下游的安全信号。

### 一个关键的 schema 设置

`additionalProperties: false` 禁止出现 schema 没有列出的字段，严格模式就是靠它堵住编造字段的。严格模式要求所有层级都这样设置。

## Follow-ups

- **Level 2:** 最多重试几次？需要更多次说明什么？ Expected: 最多三次；通常一次就够，超过三次说明 schema 或 prompt 对某些输入有问题。
- **Level 2:** 为什么拒答分支不能重试？ Expected: 模型拒绝是有原因的，常见的是输入不合适或安全原因；重试浪费成本，还可能让一条错误的抽取结果混过去。
- **Level 3:** 重试 prompt 需要从校验器拿到什么？ Expected: 一份类型化的错误列表，每个失败带路径和说明，模型才知道该修哪个字段。
- **Level 3:** 哪个 schema 设置能挡住编造的字段？ Expected: 把附加属性设为 false，严格模式要求所有层级都这样设置。

## Wrong answers

- "拒答是一次失败的调用，重试就好。" 它是附带原因的一等结果；记录日志，以类型化结果返回。
- "严格模式消除了所有失败。" 它对正常结束的响应消除了解析错误和 schema 违规；拒答、被截断的响应和类型正确的错误值依然存在。
- "一直重试到通过校验。" 超过三次，成本不断增加，而真正的问题在 schema。

## Taught in

[结构化输出协议](../../../phases/13-tools-and-protocols/04-structured-output/)一课列出了三种失败方式、重试模式和拒答分支，[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课讲了带错误反馈的校验。
