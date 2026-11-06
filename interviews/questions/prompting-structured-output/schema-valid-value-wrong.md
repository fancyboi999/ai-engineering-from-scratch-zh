---
id: schema-valid-value-wrong
title: 校验错误为零，发票总额却是错的
card: prompting-structured-output
kind: debug
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [structured-outputs, hallucination, extraction-eval, enum]
minutes: 10
lessons: [phases/11-llm-engineering/03-structured-outputs, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding, phases/13-tools-and-protocols/04-structured-output]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/json-mode-is-not-a-schema, prompting-structured-output/design-extraction-with-refusals]
updated: 2026-11-03
---

一条开了严格 schema 约束的抽取流水线，一个月来报告的校验错误为零。财务复核发现，有一部分抽取出的发票总额与源文件不符，而且状态字段经常填着一个枚举允许、但对这份文件来说是错的值。工程师说 schema 保证了正确性。你怎么回应他们？你要搭建什么？

## Short answer

schema 约束保证的是形状，不是真实性。类型正确、数字错误的总额能通过所有格式检查，枚举成员也可以是允许的但选错了。搭建一套语义评估：一组带标准答案记录的标注文档，按字段统计完全匹配率和字段级准确率，再加上来自重复抽取或 token 概率的置信度信号，把低置信度字段送去人工复核。

## Full answer

### schema 看不见的失败

结构化输出那一课列出了开着约束也会发生的失败：

| 失败 | 示例 | schema 为什么放行 |
|---|---|---|
| 编造的值 | 文本写的是一个金额，记录里是另一个 | 类型对，内容错 |
| 枚举混淆 | 模型选了一个允许的成员，但它与文件不符 | 这个成员在集合里 |
| 数组长度 | 明细行太多或太少 | 不是每家服务商都在解码时约束数组长度上下限 |
| 省略可选字段 | 不方便时把字段省掉 | 可选就意味着允许缺失 |

约束解码那一课补充了两个让值变得更差的原因：对可能缺失的数据语法过严，逼得模型编造；以及决策字段放在推理之前。

### 要搭建什么

1. **标注集。** 课程练习用了 50 份带人工标注记录的文档。标注真实发票，包括难的情况。
2. **字段级指标。** 整条记录的完全匹配率、每个字段的准确率，以及作为健全性检查的类型合规率，它应该接近 100%。
3. **逐字段置信度。** 把抽取跑三次并测一致性，或者读 token 概率，标出不一致的字段。
4. **复核队列。** 低置信度记录在进入会计系统前先交给人工。
5. **修 schema。** 在状态字段前加一个推理字段，给枚举成员加上说明，让含义明确；如果源文件里有任何成员都不适用的情况，加一个 null 或 "other" 成员。

### 为什么换大模型解决不了

结构化输出协议那一课指出，语法约束能让小模型在结构化任务上胜过大得多的模型，因为格式与模型规模解耦了。值并没有解耦。只有标注评估能告诉你值对的频率有多高。

## Follow-ups

- **Level 3:** 哪种失败是 schema 永远看不见的？ Expected: 类型正确、内容错误的值，比如从错误的那一行抄来的总额。
- **Level 3:** 不加新模型，怎样得到逐字段置信度？ Expected: 抽取跑三次测一致性，或者读 token 概率，把不一致的字段标出来送去复核。
- **Level 4:** 状态枚举里有个成员模型总是选错。有哪些候选修复？ Expected: 给成员加说明让含义明确，在状态前加推理字段，并检查源文件里是否有任何成员都不适用的情况，有的话就需要 null 或 "other" 成员。
- **Level 4:** 完成后的评估报告长什么样？ Expected: 先列接近 100% 的 schema 合规率作为健全性检查，再列标注集上的完全匹配率和逐字段准确率，并点名最难的字段。

## Wrong answers

- "校验错误为零，就是抽取错误为零。" 校验只查形状；复核发现的是任何形状检查都看不见的值错误。
- "换个更大的模型，值就对了。" 规模改变的是错误率，不是盲区；没有标注评估，你说不出改善了多少。
- "给总额字段加个更严的模式。" 更严的语法不会让数字变真；语法过严甚至会逼模型编一个数。

## Taught in

[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课列出了 schema 挡不住的失败，并设计了标注抽取评估，[约束解码](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)一课讲了语法过严和字段顺序这两个原因，[结构化输出协议](../../../phases/13-tools-and-protocols/04-structured-output/)一课把格式可靠性和模型规模分开讨论。
