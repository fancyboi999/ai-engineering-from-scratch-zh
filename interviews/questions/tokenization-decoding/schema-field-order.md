---
id: schema-field-order
title: 每条输出都校验通过，答案却是错的
card: tokenization-decoding
kind: design
level: 3
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, system-design]
tags: [structured-output, json-schema, field-order, constrained-decoding, schema-design]
minutes: 10
lessons: [phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [tokenization-decoding/constrained-decoding-how]
updated: 2026-11-03
---

你在评审一个抽取服务的 schema。它是 `{"answer": ..., "reasoning": ..., "date": <a strict year-month-day regex>}`，由约束解码强制执行（最后一项是严格的年月日正则）。格式遵从率无可挑剔，准确率却很差，还有些日期是编出来的。设计哪里错了？你会怎么改？

## Short answer

有两个任何校验器都抓不到的问题。答案字段排在推理字段前面，模型还没推理就先定了答案；严格的日期模式又没有给"未知"留合法的写法，模型只能编一个日期来满足格式。把推理放前面、答案放最后，并允许缺失日期用 null 或一个占位值；字段顺序是逻辑，不是排版，过严的语法会逼出一个自信的错误值。

## Full answer

### 问题一：过早下结论

生成是从左到右的。`answer` 在前，模型一个字的分析都还没写，就得先输出标签；后面的推理只是在为已经做出的选择找理由。把顺序换过来，模型先把分析写进上下文，答案再以它为条件。两种写法的 JSON 同样合法，只有第二种是对的。

```json
{"reasoning": "... therefore ...", "answer": "yes"}
```

### 问题二：没有出口的语法

日期正则只放行格式正确的日期。源文本里没有日期时，模型输出不了"unknown"；掩码把所有诚实的 token 都禁掉了，剩下的只有不诚实的。在 schema 里允许 `null` 或一个占位字符串，并在指令里告诉模型什么时候用它。

### 同一次评审里还要查的坑

- **递归 schema 放在状态机库后面。** 状态机会把递归展平到固定深度；嵌套结构需要上下文无关语法引擎。
- **超大枚举。** 10,000 个选项的枚举编译很慢甚至超时；先用检索器缩小候选，再约束到这些候选上。
- **不带 schema 的普通 JSON 模式。** 它保证语法，不保证你的字段。

### 本可以发现问题的验证方案

遵从率只是四个指标之一。还要加上语义正确率（用 judge 或标注集衡量）、字段覆盖率，以及 p50 和 p99 延迟。遵从率满分、语义正确率很差，说的正是这个案例。

### 给团队的规则

把 `answer` 或 `decision` 放在推理字段之前的 schema，一律不通过。不带 schema 的裸 JSON 模式，不通过。放在只支持状态机的库后面的递归 schema，标记出来。

## Follow-ups

- **Level 3:** 遵从率已经满分时，怎样衡量语义正确率？ Expected: 取一份标注样本，用 judge 或基于内容的规则打分，与 schema 遵从率分开跟踪。
- **Level 3:** 输出需要一棵树，比如嵌套评论。要改什么？ Expected: 状态机库会把递归展平；换成上下文无关语法引擎。
- **Level 4:** 产品要把答案流式推给用户，为了延迟希望答案在最前面。这个冲突怎么解决？ Expected: 把取舍讲明白；可选方案有分成两次调用、在可见答案之前用隐藏字段写推理，或者接受这段延迟；不能答案在前，同时还期待同样的准确率。
- **Level 4:** 编造的日期在监控里会怎样暴露？ Expected: 在一个日期经常缺失的语料上，字段覆盖率接近 100%，这本身就是警报；把这个比率和源数据里该字段的基础比率对比。

## Wrong answers

- "把正则收紧，只放行看起来合理的日期。" 语法本身就是问题；更严的语法会逼出更多编造。
- "在 prompt 里加一句，要求模型诚实。" 掩码已经禁掉了诚实的 token；任何指令都没法让模型输出 logit 为负无穷的 token。
- "校验通过了，系统就是好的。" 校验只检查形状；它看不出答案是在推理之前定下的，也看不出日期是编的。

## Taught in

[结构化输出与约束解码课程](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)指出了字段顺序的坑、过严的语法和验证方案。
