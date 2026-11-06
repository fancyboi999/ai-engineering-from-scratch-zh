---
id: design-extraction-with-refusals
title: 为采购订单邮件设计信息抽取服务
card: prompting-structured-output
kind: design
level: 3
roles: [applied-ai-engineer, forward-deployed-ai-engineer, agentic-ai-engineer]
rounds: [system-design, design-review]
tags: [structured-outputs, json-schema, strict-mode, refusal, extraction]
minutes: 20
lessons: [phases/13-tools-and-protocols/04-structured-output, phases/11-llm-engineering/03-structured-outputs, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/three-failure-modes-structured, prompting-structured-output/schema-valid-value-wrong]
updated: 2026-11-03
---

为采购订单邮件设计一个抽取服务。输入是自由文本；输出是一条类型化记录，包含客户、明细行和总金额。请讲清 schema、约束执行模式、重试和拒答处理，以及在它接触会计系统之前怎样证明它可用。

## Short answer

写一份 JSON Schema 2020-12，写进真正重要的约束：必填字段、闭集用枚举、总金额最小值为零、禁止附加属性，任何推理字段都放在任何决策字段前面。用服务商的严格 schema 模式运行，这样正常结束的响应不会有解析错误或 schema 违规；检查停止原因，把因 token 上限被截断的响应送进错误路径；把拒答当作一种类型化结果，送进复核队列。在写入任何记录之前，用逐字段评分的真实邮件标注集、对不应抽取的输入做拒答检查，以及与人工流程并行运行来证明它可用。

## Full answer

### Schema

- 用 `type`、`properties` 和 `required` 定义结构；每个属性都列为必填，源文本可能缺值的地方允许 null。
- 闭集（如币种或状态）用 `enum`；总金额加 `minimum`；标识符加 `pattern`、`minLength` 和 `maxLength`；明细行用 `items`。
- 所有层级都设 `additionalProperties: false`，它能挡住编造的字段，严格模式也要求这样做。
- 字段顺序就是逻辑：任何 `reasoning` 字段都放在 `total` 或 `status` 之前，因为模型写第一个字段时就做出了选择。

在 Python 里，用 Pydantic 模型生成这份 schema；服务把 schema 当作契约，把 Pydantic 模型当作它的语言绑定。

### 约束执行模式

| 情况 | 选择 |
|---|---|
| 托管的前沿模型，扁平 schema | 服务商的严格 schema 模式 |
| 多家服务商，可以接受重试 | 基于 Pydantic 模型的重试库，可移植，不碰 logits |
| 本地模型，必须保证合法 | 语法引擎：扁平 schema 用有限状态机，递归 schema 用上下文无关文法 |

这里默认用严格模式：正常结束的输出天然能解析、能通过校验。还剩两种失败：拒答，以及在 token 上限处被截断的响应，后者仍可能解析失败。读输出之前先检查停止原因，把不完整的响应送进错误路径。

### 重试和拒答

不用严格模式时：生成、解析、校验，把类型化错误注入 prompt 后重试，最多三次。超过三次说明 schema 或 prompt 对某些输入有问题。无论使用哪种模式，都要把拒答作为独立的结果处理，并附上原因。记录日志，以类型化结果返回，送进复核队列，绝不重试，因为对不匹配的输入强行要一条记录，得到的只会是编造的记录。

### 会计系统看到记录之前的证明

1. **标注集**：真实邮件配上标准答案记录；结构化输出一课用了 50 份文档。报告完全匹配率、逐字段准确率和类型合规率。
2. **拒答检查**：构造不应被抽取的输入，比如一段歌词、一份证明或一封空邮件，统计拒答和编造输出各有多少。
3. **逐字段置信度**：来自重复抽取或 token 概率，低置信度记录交给人工。
4. **Schema 版本**：每条记录都带 schema 版本；任何部署之前，用 schema diff 区分破坏性变更和非破坏性变更。
5. **并行运行**：在标注集上与人工流程并排运行；字段级指标达到你和财务部门商定的门槛之前，服务不写入任何记录。

## Follow-ups

- **Level 3:** 为什么要禁止附加属性？ Expected: 它能挡住编造的字段，而且严格模式要求所有层级都这样设置。
- **Level 3:** 你预计明年要换服务商。选哪种模式？ Expected: 为了可移植，用基于 Pydantic 模型的重试库；或者让各服务商使用完全相同的 schema，这样每家的严格模式收到的是同一份契约。
- **Level 4:** 已经有记录之后，schema 怎么做版本管理？ Expected: 每条记录带版本字段，用 schema diff 区分破坏性变更和非破坏性变更。严格模式把每个字段都设为必填，所以新增字段也是破坏性的，因为之前写入的记录不包含它；删除字段和修改类型是破坏性的，放宽约束不是。
- **Level 4:** 这个设计消除不了哪种失败？它该交给谁？ Expected: 类型正确但值错误；它交给字段级评估和置信度标记，低置信度记录进入复核。

## Wrong answers

- "用 prompt 要求输出 JSON 再解析就行，模型够好了。" 这只有 85% 到 95% 的时候有效，还有六种不同的出错方式；会计系统需要契约。
- "遇到拒答就重试，直到模型给出记录。" 拒答说明输入不匹配；强行要记录就是让模型编一条。
- "生成后再校验，和严格模式一样好。" 它可靠，但每次重试都要花钱，而且每次截断的输出都会白白浪费一轮。

## Taught in

[结构化输出协议](../../../phases/13-tools-and-protocols/04-structured-output/)一课给出了 schema 构造、严格模式规则、重试模式和拒答处理，[结构化输出](../../../phases/11-llm-engineering/03-structured-outputs/)一课规定了标注集评估和 schema diff，[约束解码](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)一课给出了模式对照表和字段顺序规则。
