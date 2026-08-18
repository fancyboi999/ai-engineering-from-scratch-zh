# Claude 官方认证考试蓝图映射

> 面向课程维护者的事实依据说明。每次发布前都必须重新核验。

**已核验：** 2026-08-18
**考试指南版本：** 1.0
**生效时间：** 2026 年 7 月

## 官方指南

- [CCAO-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542847%2FClaude+Certified+Associate+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCDV-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCAR-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCAR-P 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf)

## 覆盖策略

仓库已经为提示工程、结构化输出、上下文工程、评估、智能体、工具设计、MCP、安全、
RAG、可观测性和生产运维打下了扎实基础。认证部分承担阶段课程不应承担的
三项工作：

1. 在考试风格的约束下，将每个主题组织为一项蓝图决策。
2. 补足 Claude 专有的产品、API、配置和生命周期知识缺口。
3. 组合面向不同角色的综合项目和加权评估。

在现有课程中发现的最重要缺口包括：

- Claude 对话、研究、项目（Projects）、工件（Artifacts），以及项目知识维护。
- 一套连贯的 Messages API 状态机，涵盖内容块、停止原因、工具续接、
  流式响应、思考、缓存和批处理取舍。
- Claude Code 的配置优先级、规则（Rules）、技能（Skills）、命令（Commands）、智能体（Agents）、
  记忆、无头执行和 CI 工作流。
- 业务发现、利益相关者沟通、架构论证、实现交接和运维负责制。

第二轮依据当前 Anthropic Academy 目录的核对，在不改变公开蓝图的前提下补充了
产品层面的深度：

- 直连 Claude、Amazon Bedrock、Google Vertex AI 和 Microsoft Foundry 的
  部署决策。
- SDK、REST、流式、异步、多模态、Files API、Tool Runner 和
  托管智能体访问模式。
- 高级 MCP 采样（sampling）、根（roots）、通知（notifications）、Inspector、Streamable HTTP，以及
  有状态与无状态部署决策。
- 当前 Claude Code 的运行控制、实际的技能（Skill）编写、子智能体
  协议和团队分发。
- 用于诊断下一个 token 预测、知识、工作记忆和可控性的四项属性。

## 现有深度课程

请直接使用下列课程，不要重复从零开始的教学内容：

| 能力 | 现有课程路径 |
|------------|-----------------------|
| 提示工程和少样本推理 | `phases/11-llm-engineering/01-prompt-engineering`, `phases/11-llm-engineering/02-few-shot-cot` |
| 结构化输出 | `phases/11-llm-engineering/03-structured-outputs`, `phases/13-tools-and-protocols/04-structured-output` |
| 上下文和缓存 | `phases/11-llm-engineering/05-context-engineering`, `phases/11-llm-engineering/11-caching-cost`, `phases/11-llm-engineering/15-prompt-caching` |
| 评估 | `phases/11-llm-engineering/10-evaluation`, `phases/14-agent-engineering/30-eval-driven-agent-development` |
| 智能体循环和编排 | `phases/14-agent-engineering/01-the-agent-loop`, `phases/14-agent-engineering/12-anthropic-workflow-patterns`, `phases/14-agent-engineering/28-orchestration-patterns` |
| Claude Agent SDK | `phases/14-agent-engineering/17-claude-agent-sdk` |
| 工具和 MCP 设计 | `phases/13-tools-and-protocols/01-the-tool-interface`, `phases/13-tools-and-protocols/05-tool-schema-design`, `phases/13-tools-and-protocols/06-mcp-fundamentals`, `phases/13-tools-and-protocols/07-building-an-mcp-server`, `phases/13-tools-and-protocols/11-mcp-sampling`, `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation` |
| 安全和审批 | `phases/14-agent-engineering/27-prompt-injection-defense`, `phases/15-autonomous-systems/10-claude-code-permission-modes`, `phases/17-infrastructure-and-production/25-security-secrets-audit` |
| RAG 和检索 | `phases/11-llm-engineering/06-rag`, `phases/11-llm-engineering/07-advanced-rag`, `phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense` |
| 可观测性和运维 | `phases/17-infrastructure-and-production/13-llm-observability`, `phases/17-infrastructure-and-production/23-sre-for-ai`, `phases/17-infrastructure-and-production/27-finops-llms` |

## 各路线重点

### CCAO-F

权重最高的领域是输出评估与验证，占 21%。
因此，这条路线会比提示语法投入更多时间在事实核验、偏见检查、
受众适配、合适的格式和人工审核上。

### CCDV-F

应用与集成占 33.1%。这条路线以协议为先：
Messages API 状态、应用边界、SDK 和 REST 行为、会话
卫生、配置、工具，以及生产故障隔离。

### CCAR-F

考试围绕真实场景组织。这条路线在六种公开场景语境中教授一套可复用的
决策方法，其中投入时间最多的是智能体架构与编排（Agentic Architecture and Orchestration），占 27%。

### CCAR-P

集成是权重最高的单一领域，占 19%；但专业级（Professional）是一项
覆盖完整生命周期的考试。课程将发现、架构、提示工程、
RAG、评估、安全、利益相关者沟通、Claude Code 赋能
和运维负责制串联起来，而不是把它们视为彼此孤立的事实。
