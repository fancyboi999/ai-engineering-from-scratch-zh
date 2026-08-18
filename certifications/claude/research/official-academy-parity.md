# Anthropic Academy 官方对照图

> 对照意味着每项与认证相关的学习目标，都有本地说明、决策练习、学习产物和验证路径；并不意味着复制 Academy 目录。

**已核验：** 2026-08-18

## 官方备考快照

当前合作伙伴备考页面列出：

- 助理基础认证：8 个模块，列出 389 分钟。
- 开发者基础认证：5 个模块，列出 774 分钟。
- 架构师基础认证：由 7 门现有 Academy 课程组成的课程包。
- 架构师专业认证：5 个模块，列出 733 分钟。

这些总计是某一日期的目录快照，并非考试时长或必需学习时长。Academy 可以新增、
删除或重组课程，而不改变公开的考试指南。

来源：[助理基础认证备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-associate-foundations)、
[开发者基础认证备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-developer-foundations)、
[架构师基础认证备考课程包](https://anthropic-partners.skilljar.com/page/claude-certified-architect-foundations-prep-courses)和
[架构师专业认证备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-architect-professional)。

## 学习内容对照

| 官方 Academy 学习内容 | 与认证相关的目标 | 本地覆盖 |
|---|---|---|
| [AI 素养：框架与基础](https://anthropic.skilljar.com/ai-fluency-framework-foundations) | 委派、描述、辨别和勤勉 | 第 00、05、06 和 07 课将 4Ds 转化为学习计划、能力诊断、控制图和人工交接 |
| [AI 的能力与局限](https://anthropic.skilljar.com/ai-capabilities-and-limitations) | 诊断下一 token 预测、知识、工作记忆和可引导性 | 第 04 和 05 课提供上下文决策与已验证的四属性故障诊断 |
| [Claude 101](https://anthropic.skilljar.com/claude-101) | Claude 产品入口、Projects、知识、连接器、研究和安全的日常工作流 | 第 01、04 和 07 课，以及助理认证综合项目 |
| [产品基础](https://anthropic-partners.skilljar.com/product-foundations) | 根据业务和控制要求，在直接使用 Claude、Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry 之间做选择 | 第 01 课的部署 ADR；第 22、23 和 25 课延伸到采购、架构、身份和数据边界决策 |
| [Claude 平台 101](https://anthropic.skilljar.com/claude-platform-101) | 原始 Messages 循环、SDK Tool Runner、第一方工具、托管 Agent、事件流、工作区和支出控制 | 第 08、10、12、13 和 26 课提供离线状态机、执行界面、安全和运维练习 |
| [使用 Claude API 构建](https://anthropic.skilljar.com/claude-with-the-anthropic-api) | API 生命周期、流式传输、工具、结构化输出、缓存、批处理、RAG、评估、Computer Use 和 Agent | 第 08 至 14、20、24 和 26 课；现有阶段课程提供从零开始的 RAG 与评估深度 |
| [MCP 入门](https://anthropic.skilljar.com/introduction-to-model-context-protocol) | 客户端、服务器、工具、资源、提示、传输、MIME 和清理 | 第 11 课的契约实验室，以及第 13 阶段的 MCP 服务器和客户端构建 |
| [MCP 高级主题](https://anthropic.skilljar.com/model-context-protocol-advanced-topics) | 采样、根目录、通知、JSON-RPC、Streamable HTTP、会话和扩展 | 第 11 课的决策与部署实验室，以及第 13 阶段的采样与 roots/elicitation 构建 |
| [Claude Code 101](https://anthropic.skilljar.com/claude-code-101) | 权限、Plan Mode、上下文恢复、CLAUDE.md、子 Agent、Skills、MCP 和 hooks | 第 15 和 19 课，以及已有的 Claude Code 权限模式课程 |
| [实战 Claude Code](https://anthropic.skilljar.com/claude-code-in-action) | 上下文压缩、回退、目标与循环、worktree、无头自动化、审查、例行流程和分发 | 第 15 和 19 课的运维资料包与 CI 验证器 |
| [Agent Skills 入门](https://anthropic.skilljar.com/introduction-to-agent-skills) | 编写 SKILL.md、通过描述触发、限制工具、打包脚本、分发和调试 | 第 19 课交付并验证一个真实的多文件 Skill；仓库辅导器展示可移植分发 |
| [子 Agent 入门](https://anthropic.skilljar.com/introduction-to-subagents) | 隔离上下文、限制工具、结构化报告、障碍、时间盒和委派边界 | 第 16、17 和 19 课 |
| [Claude Cowork 入门](https://anthropic.skilljar.com/introduction-to-claude-cowork) | 引导式任务循环、常驻上下文、Skills/plugins、文件工作流和负责任的引导 | 仅有简要的产品版图和工作流选择覆盖；未提升为公开考试目标 |
| Claude 在 Amazon Bedrock 和 Google Vertex AI 上的使用 | 提供商特定的部署和运维 | 第 01 课讲授架构决策；提供商控制台演练仍是可选的官方配套材料 |

## 本地对照的补充内容

每节已映射课程都必须做到不止提及官方目标：

1. 解释机制及其失效边界。
2. 让学习者操作一个场景或决策。
3. 产出归学习者所有的学习成果。
4. 运行确定性的验证器或模拟器。
5. 通过原创题目和角色综合项目检验迁移能力。

对于概念课程，可执行学习界面会评估政策、威胁模型、ADR、审批流程或证据包。
它绝不会为了让课程看起来更技术化而添加伪造的提供商代码。

## 有意不做对照的内容

- 课程不复制 Academy 的讲解、幻灯片、练习或测验措辞。
- 不保留固定的 Academy 课程总数。
- 不将合作伙伴销售赋能转化为技术考试要求。
- 在这个以标准库为先的仓库中，不要求使用 Pydantic；第 09 课讲授其验证角色如何映射到底层契约。
- 当公开蓝图要求的是架构决策而非控制台导航时，不重复提供商控制台教程。
- 认证课程不走图书工作流，因为辅导器状态、实验室、图表和测评是必需的学习内容。
