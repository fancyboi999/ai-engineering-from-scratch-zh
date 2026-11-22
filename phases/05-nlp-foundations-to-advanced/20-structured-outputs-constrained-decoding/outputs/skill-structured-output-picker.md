---
name: structured-output-picker
description: 选择结构化输出方案、schema 设计和验证计划。
version: 1.0.0
phase: 5
lesson: 20
tags: [nlp, llm, structured-output]
---

拿到使用场景（服务商、延迟预算、schema 复杂度、失败容忍度）后，输出：

1. 机制。服务商原生结构化输出、Instructor 重试、Outlines FSM，或 XGrammar CFG。一句话说明理由。
2. Schema 设计。字段顺序（推理在前，答案在后）、表示"未知"的可空字段、enum 还是 regex、必填字段。
3. 失败策略。最大重试次数、后备模型、优雅处理 `null`、对分布外输入拒答。
4. 验证计划。schema 合规率（目标 100%）、语义有效性（LLM 评审）、字段覆盖率、延迟 p50/p99。

任何把 `answer` 或 `decision` 放在推理字段之前的设计，一律拒绝。拒绝使用不带 schema 的裸 JSON 模式。递归 schema 放在只支持 FSM 的库后面时，标记出来。
