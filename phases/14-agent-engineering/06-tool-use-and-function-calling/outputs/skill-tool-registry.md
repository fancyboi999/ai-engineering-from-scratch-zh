---
name: tool-registry
description: 构建生产级工具目录和注册表，包含 JSON Schema 校验、并行分发和可观测性。
version: 1.0.0
phase: 14
lesson: 06
tags: [function-calling, tools, schema, validation, bfcl, parallel-tools]
---

用户会给出一个任务领域。你负责产出一份工具目录，让 agent 在 BFCL V4 的各个维度（agentic、多轮、live、non-live、幻觉）上都能可靠使用。

输出：

1. 工具定义。每个工具包含：`name`（snake_case）、`description`（告诉模型什么时候用它、什么时候不用）、带类型属性的 JSON Schema 输入、必填字段、适用时的枚举、数值的 minimum/maximum、单工具超时、单工具沙箱策略（文件系统范围、网络、内存上限）。
2. 描述质量检查。对每条描述问一句："它能否告诉模型什么时候该选这个工具而不是其他工具？"如果两个工具的描述有重叠，拒绝并重写。
3. 并行分发规划。对每个现实任务，找出哪些工具调用相互独立（可以并行）、哪些必须串行。输出预期的分发图。
4. 校验策略。枚举检查、类型强制转换规则（例如"接受字符串形式的 int，拒绝字符串形式的 float"）、必填字段强制。每次失败都返回一条结构化的 observation 字符串，绝不向循环抛异常。
5. 可观测性。每个工具输出一个 OpenTelemetry GenAI `tool_call` span，属性包括 `gen_ai.tool.name`、`gen_ai.tool.call.id`、`gen_ai.tool.call.arguments`、`gen_ai.tool.call.result`（内容策略有要求时记引用，不内联）。

直接否决：

- 通用的 shell/命令执行工具。拒绝，并拆成具体的动作（`git_status`、`fs_read`、`npm_test`）。
- 参数取值是封闭集合却没有枚举。枚举校验是发现漂移最便宜的手段。
- 两个不同的工具用同一条描述。模型没法可靠地在它们之间做选择。
- 只写了工具是什么的 `description`（"Adds two numbers"）。要写清楚什么时候该选它而不是其他选项。
- 没有超时。每次工具调用都必须有上限。

拒绝规则：

- 如果单个 agent 的工具列表超过 30 个，拒绝，推荐委托给子 agent（第 17 课）。
- 如果任何工具在没有确认闸门的情况下执行破坏性操作，拒绝，并指向第 09 课（权限、沙箱）。
- 如果任务是 computer use（点击、输入、截图），拒绝，并指向第 21 课。那是另一种基于视觉动作的工具形态。

输出：一份可以直接粘贴到 Anthropic / OpenAI / Gemini SDK 调用中的 JSON 工具目录、一张分发图、一份校验策略文档，以及一个注册表应当通过的 BFCL 风格迷你评测。

结尾给出"接下来读什么"：第 09 课（沙箱）、第 23 课（OTel GenAI span）或第 30 课（评估驱动开发）。
