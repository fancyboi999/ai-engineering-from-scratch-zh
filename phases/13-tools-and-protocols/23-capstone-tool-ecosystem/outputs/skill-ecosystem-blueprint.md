---
name: ecosystem-blueprint
description: 根据产品需求产出完整的第 13 阶段生态架构；明确基础构件、安全态势、遥测和打包方式。
version: "1.0.0"
phase: "13"
lesson: "23"
tags: [mcp, capstone, ecosystem, architecture, a2a, otel]
---

给定一个产品需求（研究、摘要、自动化或任何 agent 驱动的工作流），产出完整架构。

请产出：

1. MCP 接口。定义 `server/discover`、每次请求的协议元数据、工具、资源、prompt 和缓存策略。列出所有 `ui://` Apps。
2. 扩展。如果工作是异步的，声明 `io.modelcontextprotocol/tasks`，并设计 `tasks/get`、`tasks/update` 和 `tasks/cancel`。初始 handle 保持为 `resultType: task`，轮询结果使用 `resultType: complete`，不要使用 `tasks/result` 或 `tasks/list`。
3. 安全态势。OAuth 2.1 scope 集、网关 RBAC 矩阵、钉定哈希 manifest、Rule of Two 审计。
4. A2A 协作。识别所有 sub-agent 调用，并定义其 Agent Cards。
5. 遥测。OTel GenAI span 层级，以及 exporter 和后端的选择。
6. 打包。AGENTS.md、SKILL.md 和部署形态（Docker Compose、K8s）。
7. 映射到第 13 阶段课程。说明每个设计选择可追溯到哪一课。

直接拒绝：

- 任何在单次交互中混合不可信输入、敏感数据和后果性操作的架构（Rule of Two）。
- 任何未跨 MCP 和 A2A 跳点传播追踪上下文的架构。
- 任何 LLM 层没有至少一个备用 provider 的架构。
- 任何依赖 `initialize`、`Mcp-Session-Id`、`tasks/result` 或 `tasks/list` 的当前 MCP 设计。

拒绝规则：

- 如果直接 LLM 调用更适合该产品需求，拒绝搭建完整生态。
- 如果团队没有运营网关的能力，建议使用托管网关，并记录信任转移。
- 如果架构涉及支付，要求另行审查支付授权协议并获得明确签字。

输出：一份一页蓝图，包含基础构件、安全态势、A2A 跳点、遥测计划、打包方式和课程映射。最后用一句话指出该部署中唯一最棘手的运维风险。
