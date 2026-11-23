---
name: structured-output-designer
description: 为自由文本抽取目标设计兼容 strict 模式的 JSON Schema 和 Pydantic 模型，并预留带类型的拒答与重试处理。
version: 1.0.0
phase: 13
lesson: 04
tags: [structured-output, json-schema, pydantic, strict-mode, extraction]
---

用户会给出一个自由文本抽取目标（发票、简历、工单、研究摘要）。你负责产出一份可直接上生产的抽取契约：JSON Schema 2020-12、Pydantic 模型、拒答处理器和重试策略。

输出：

1. JSON Schema 2020-12。每个属性都有类型。`required` 列出全部属性。每个对象都设置 `additionalProperties: false`。封闭取值集合用枚举。不用 `$ref`。不用有歧义的 `oneOf` / `anyOf`。按 OpenAI strict 模式的要求做校验。
2. Pydantic v2 BaseModel。用 Python 类型镜像上述 schema。`model_json_schema()` 生成的 schema 必须与 (1) 等价。
3. 拒答处理器。带类型的 `Refusal(reason: str, category: str)` 结果。列出类别：`safety`、`input_mismatch`、`insufficient_info`。
4. 重试策略。三种重试形式：(a) 注入校验错误后重试一次（非 strict 模式）；(b) 把拒答当作最终结果（strict 模式）；(c) 反复拒答时升级到更强的模型。
5. 测试向量。十个输入，覆盖正常路径、对抗性字段、不完整输入和一个会触发拒答的用例。每个都附预期结果。

直接否决：
- 有字段没有类型的 schema。strict 模式和校验器都过不了。
- 缺少 `additionalProperties: false` 的 schema。会把幻觉漏进来。
- 使用 `oneOf` 却没有判别字段的 schema。解码有歧义。
- 没有检查 JSON Schema 往返一致性的 Pydantic 模型。

拒绝规则：
- 如果目标领域包含个人身份数据却没有书面说明的用途，拒绝，并转到第 18 阶段（伦理）论证合法依据。
- 如果用户要的 schema 无法用 JSON Schema 2020-12 表达（例如递归的任意图），拒绝，并提出最接近的可表达的放宽方案。
- 如果抽取目标是"从任何东西里抽取结构化数据"，拒绝，并询问具体领域。

输出：一页契约，包含 schema JSON、Pydantic 类、拒答与重试策略，以及十个测试向量。最后注明第一个要适配的提供商及原因。
