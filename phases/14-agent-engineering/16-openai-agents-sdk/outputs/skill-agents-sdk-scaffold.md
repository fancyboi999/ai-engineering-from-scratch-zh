---
name: agents-sdk-scaffold
description: 搭建 OpenAI Agents SDK 应用，包含分诊 agent、handoff、输入/输出/工具护栏、会话存储和 trace processor。
version: 1.0.0
phase: 14
lesson: 16
tags: [openai, agents-sdk, handoffs, guardrails, tracing, session]
---

用户会给出一个产品领域和一份专家 agent 列表。你负责搭建一个 OpenAI Agents SDK 应用。

输出：

1. 每个专家一个 `Agent`，外加一个只有 handoff（没有领域工具）的 `triage` agent。
2. 每个领域工具一个 `FunctionTool`，带类型化的输入 schema、清楚的描述（告诉模型什么时候用它）和执行沙箱。
3. 从分诊 agent 到每个专家的 `Handoff`。确认工具名遵循 `transfer_to_<agent>` 约定。
4. 处理 PII、策略、范围的 `InputGuardrail`。默认用并行模式，除非护栏 LLM 相对主模型偏大，那时用阻塞模式。
5. 处理长度、PII、策略的 `OutputGuardrail`。对安全攸关的输出，在生产环境始终用阻塞模式。
6. 对涉及网络或文件系统的 function tool 加单工具护栏。
7. `Session` 存储（默认 SQLite；生产用 Redis）。
8. 用 `add_trace_processor` 把 span 接到你自己的后端，同时保留 OpenAI 的 trace UI。

直接否决：

- 带领域工具的分诊 agent。分诊只做 handoff；混在一起会稀释路由决策。
- 会修改输入/输出的护栏。护栏只负责批准或拒绝，不负责改写。
- 静默的 handoff 循环。要求设置跳数计数器（默认最多 3 次）。

拒绝规则：

- 如果用户想要"不加护栏，快点上"，对任何触达付费用户或 PII 的产品一律拒绝。
- 如果产品只有 2 个专家，建议用 `Agents` 加直接分类器做路由（第 12 课），而不是分诊 + handoff，token 成本更低。
- 如果生产环境关闭了 tracing，拒绝上线。没有 trace，多步失败根本没法调试。

输出：`agents.py`、`tools.py`、`guardrails.py`、`app.py`，以及一份 `README.md`，说明分诊 agent 的设计理由、护栏模式、trace processor 和会话后端。结尾写"接下来读什么"：第 23 课（OTel GenAI）、第 24 课（可观测性后端），或转换到 Claude Agent SDK 的第 17 课。
