# 案例研究与 2026 年的最新进展

> 三个值得端到端研究的生产级参考，每个展示多 agent 工程的一个不同切面。**Anthropic 的 Research 系统**（orchestrator-worker、15 倍 token、相比单 agent Opus 4 +90.2%、彩虹部署）是标准的 supervisor 案例。**MetaGPT / ChatDev**（用 SOP 编码的软件工程角色专精；ChatDev 的「沟通式去幻觉」；MacNet 通过 DAG 扩展到 >1000 agent，arXiv:2406.07155）是标准的角色拆解案例。**OpenClaw / Moltbook**（最初是 Peter Steinberger 的 Clawdbot，2025 年 11 月；改名两次；到 2026 年 3 月 24.7 万 GitHub star；本地 ReAct 循环 agent；Moltbook 作为一个纯 agent 社交网络，上线数天内约 230 万个 agent 账号，2026-03-10 被 Meta 收购）展示了人群规模下会发生什么：涌现的经济活动、prompt 注入风险、国家级监管（中国在 2026 年 3 月限制政府电脑使用 OpenClaw）。**2026 年 4 月的框架版图：** LangGraph 和 CrewAI 领跑生产；AG2 是社区版 AutoGen 延续；Microsoft AutoGen 处于维护模式（已并入 Microsoft Agent Framework，RC 2026 年 2 月）；OpenAI Agents SDK 是生产版 Swarm 继任者；Google ADK（2025 年 4 月）是 A2A 原生的入局者。如今每个主流框架都附带 MCP 支持；多数附带 A2A。本课端到端读完每个案例、提炼共同模式，让你能凭知识而非营销来为你下一个生产系统选对参考。

**类型：** Learn（收官）
**语言：** —
**前置要求：** 整个 Phase 16（第 01-24 课）
**预计时间：** ~90 分钟

## 问题背景

多 agent 工程是一门年轻的学科。生产参考很少，而每个覆盖空间的不同部分。一个一个读它们有用；把它们当成一组来对比更有用。本课把三个标准的 2026 案例研究当成一份端到端的阅读清单、钉住共同模式、并绘制框架版图，让你能凭知识而非营销来做框架选择。

## 核心概念

### Anthropic Research 系统

生产 supervisor-worker 案例。Claude Opus 4 做规划和综合；Claude Sonnet 4 subagent 并行调研。已发布的工程博客：https://www.anthropic.com/engineering/multi-agent-research-system。

测得的关键结果：

- 在内部研究评测上相比单 agent Opus 4 提升 **+90.2%**。
- **BrowseComp 80% 的方差** 仅靠 **token 用量** 就能解释——多 agent 之所以赢，很大程度上是因为每个 subagent 都拿到一个全新的上下文窗口。
- 每个查询相比单 agent **15 倍 token**。
- **彩虹部署**，因为 agent 长时间运行、有状态。

被编纂下来的设计教训：

1. **按查询复杂度匹配投入。** 简单 → 1 个 agent，3-10 次工具调用。中等 → 3 个 agent。复杂研究 → 10+ 个 subagent。
2. **先宽后窄。** subagent 做宽搜索；lead 综合；后续 subagent 做有针对性的深挖。
3. **彩虹部署。** 让旧运行时版本活着，直到它们飞行中的 agent 跑完。
4. **验证不是可选项。** 观察到该系统在没有显式 verifier 角色时会幻觉。

这是 supervisor-worker 拓扑（Phase 16 · 05）在生产规模上的参考案例。

### MetaGPT / ChatDev

生产 SOP-角色拆解案例。涵盖 arXiv:2308.00352（MetaGPT）和 arXiv:2307.07924（ChatDev）。

MetaGPT 把软件工程 SOP 编码成角色 prompt：产品经理、架构师、项目经理、工程师、QA 工程师。论文的提法：`Code = SOP(Team)`。每个角色有一条狭窄、专精的 prompt；角色间的 handoff 携带结构化产物（PRD 文档、架构文档、代码）。

ChatDev 的贡献：**沟通式去幻觉**。agent 在回答前索取具体信息——设计师 agent 在勾勒 UI 之前先问程序员打算用什么语言，而不是瞎猜。论文报告这能可测地减少多 agent 流水线里的幻觉。

MacNet（arXiv:2406.07155）把 ChatDev 扩展到 **通过 DAG 实现 >1000 agent**。每个 DAG 节点是一个角色专精；边编码 handoff 契约。这种规模之所以可能，是因为路由是显式的、可离线计算的。

设计教训：

1. **结构比规模更重要。** 一支紧凑的 5 角色 SOP 团队打败一个 50 agent 的无结构群体。
2. **书面的 handoff 契约。** 角色间传递的产物遵循一份 schema。
3. **沟通式去幻觉** 是一个便宜、承重的模式。
4. **DAG 比聊天扩展得更远。** 当流程可知时，把它编码下来。

这是角色专精（Phase 16 · 08）和结构化拓扑（Phase 16 · 15）的参考案例。

### OpenClaw / Moltbook 生态

生产人群规模案例。时间线：

- **2025 年 11 月：** Clawdbot（Peter Steinberger 的本地 ReAct 循环编码 agent）发布。
- **2025 年 12 月 – 2026 年 3 月：** 改名两次（Clawdbot → OpenClaw → 继续以 OpenClaw 之名）。
- **2026 年 2 月：** Moltbook 作为一个建在同样原语上的纯 agent 社交网络上线；数天内约 230 万个 agent 账号。
- **2026 年 3 月（2026-03-10）：** Meta 收购 Moltbook。
- **2026 年 3 月：** 中国限制政府电脑使用 OpenClaw。
- **2026 年 3 月：** OpenClaw 越过 24.7 万 GitHub star。

这就是当你把数百万 agent 放上一个共享底层时，多 agent 长什么样：

- **涌现的经济活动。** agent 用 token 支付互相买卖、互相服务。
- **人群规模下的 prompt 注入风险。** 一个病毒式 agent 资料里的恶意 prompt，几小时内就传播到数千次 agent 间交互。
- **国家级监管响应。** 上线数周内，监管就触及了这个生态。

这个案例的设计教训部分是技术、部分是治理：

1. **人群规模的多 agent 是一个新机制。** 单系统最佳实践（验证、角色清晰）仍然适用，但不充分。
2. **prompt 注入是新的 XSS。** 默认把 agent 资料和跨 agent 消息当成不可信输入。
3. **监管比设计周期快。** 为它做规划。
4. **开源 + 病毒式规模会叠加。** 约 4 个月 24.7 万 star 不同寻常；为「部署即爆发负载」做设计。

生态细节见 [OpenClaw 维基百科](https://en.wikipedia.org/wiki/OpenClaw) 以及 CNBC / Palo Alto Networks 的报道。技术底层方面，Clawdbot / OpenClaw 仓库暴露了本地 ReAct 循环；Moltbook 的公开帖揭示了建在其上的社交图架构。

### 2026 年 4 月的框架版图

| 框架 | 状态 | 最适合 | 备注 |
|---|---|---|---|
| **LangGraph**（LangChain） | 生产领跑者 | 结构化图 + 检查点 + human-in-the-loop | 生产推荐默认 |
| **CrewAI** | 生产领跑者 | 带 Sequential/Hierarchical 流程的角色 crew | 角色拆解强 |
| **AG2** | 社区维护 | GroupChat + 发言者选择 | AutoGen v0.2 延续 |
| **Microsoft AutoGen** | 维护模式（2026 年 2 月） | — | 并入 Microsoft Agent Framework RC |
| **Microsoft Agent Framework** | RC（2026 年 2 月） | orchestration 模式 + 企业集成 | 新入局者；关注 |
| **OpenAI Agents SDK** | 生产 | Swarm 继任者 | 工具返回的 handoff 模式 |
| **Google ADK** | 生产（2025 年 4 月） | A2A 原生 | Google Cloud 集成 |
| **Anthropic Claude Agent SDK** | 生产 | 单 agent + Research 扩展 | 见 Research 系统博客 |

如今每个主流框架都附带 **MCP** 支持；多数附带 **A2A**。协议兼容性不再是一个区分点。

### 三个案例共有的模式

1. **orchestrator + worker**（Anthropic 显式 supervisor、MetaGPT 的 PM 当 supervisor、OpenClaw 的个体 agent + 网络效应）。
2. **结构化 handoff 契约**（Anthropic 的 subagent 任务描述、MetaGPT 的 PRD/架构文档、OpenClaw 的 A2A 产物）。
3. **验证作为一等角色**（Anthropic 的 verifier、MetaGPT 的 QA 工程师、OpenClaw 的网内验证者）。
4. **扩展是拓扑 + 底层，不只是更多 agent**（彩虹部署、MacNet DAG、人群规模底层）。
5. **成本是实打实的、且被披露**（15 倍 token、MetaGPT 里每角色预算、Moltbook 里每交互定价）。
6. **安全姿态是显式的**（Anthropic 的沙箱、MetaGPT 的角色限制、OpenClaw 把 prompt 注入当成已知攻击面）。

### 为你下一个项目选参考

- **生产研究 / 知识任务 → Anthropic Research。** 全新上下文的 subagent 赢。
- **工程 / 工具链工作流 → MetaGPT / ChatDev。** 角色 + SOP + handoff 契约。
- **有网络效应的社交产品 → OpenClaw / Moltbook。** 底层 + 涌现经济。
- **经典企业自动化 → CrewAI 或 LangGraph**（生产领跑者，运行时稳定）。

### 2026 年最新进展总结

2026 年 4 月，这个领域的位置：

- **框架在趋同。** MCP + A2A 支持是基本盘。handoff 语义是剩下的设计选择。
- **评估在变硬。** SWE-bench Pro、MARBLE、STRATUS 缓解基准。Pro 是当前抗污染的现实检验。
- **生产失败率是可测的**（Cemri 2025 MAST；真实 MAS 上 41-86.7%）。这个领域走出了「演示里看着很棒」的时代。
- **成本是核心工程约束。** 每任务 token 成本、每交互墙钟时间、彩虹部署开销。多 agent 在准确率上赢、在成本上输——而这笔交易就是那个商业决策。
- **监管是近期输入，不是背景顾虑。** 各司法辖区动得比单个部署周期还快。

```figure
a5-orchestrator-scale
```

## 实际使用

`outputs/skill-case-study-mapper.md` 是一个 skill，它读取一份拟议的多 agent 系统设计，把它映射到最接近的案例研究，浮现出那个案例研究已经验证过的设计决策。

## 拿去用

2026 年生产多 agent 的起步规则：

- **从一个案例研究出发，不从零开始。** 在 Anthropic Research / MetaGPT / OpenClaw 里挑最接近的、改造它。
- **采纳 MCP + A2A。** 跨框架的可移植性有价值；协议支持是免费的。
- **对照 SWE-bench Pro 或你内部的 Pro 等价物来衡量。** Verified 已被污染。
- **付验证税。** 一个独立 verifier 花掉约 20-30% 的 token 预算，买来可测的正确性。
- **对长时间运行 agent 做彩虹部署。** 把数小时的 agent run 当成家常便饭。
- **读 WMAC 2026 和 MAST 后续工作。** 这门学科进展很快。

## 练习

1. 端到端读 Anthropic Research 系统博客。指出三个设计决策，它们在你把 Opus 4 换成更小模型（比如 Haiku 4）时会变。
2. 读 MetaGPT 第 3-4 节（arXiv:2308.00352）。把你自己领域（非软件）的一个 SOP 编码成角色 prompt。这个 SOP 隐含多少个角色？
3. 读 ChatDev（arXiv:2307.07924）。指出「沟通式去幻觉」的机制。在你现有的某个多 agent 系统里实现它。
4. 读关于 OpenClaw 和 Moltbook 的内容。挑一个在人群规模下涌现、而不会出现在 5 agent 系统里的具体故障模式。你会如何工程性地防它？
5. 挑你当前的多 agent 项目。三个案例研究里哪个是最接近的参考？那个案例研究里哪些设计决策你还没采纳？写下一个你这个季度会采纳的。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Anthropic Research | 「supervisor 参考」 | Claude Opus 4 + Sonnet 4 subagent；15 倍 token；相比单 agent +90.2%。 |
| MetaGPT | 「SOP 即 prompt」 | 软件工程的角色拆解；`Code = SOP(Team)`。 |
| ChatDev | 「agent 即角色」 | 设计师 / 程序员 / 评审 / 测试；沟通式去幻觉。 |
| MacNet | 「用 DAG 扩展 ChatDev」 | arXiv:2406.07155；通过显式 DAG 路由实现 1000+ agent。 |
| OpenClaw | 「本地 ReAct 循环 agent」 | Steinberger 的项目；到 2026 年 3 月 24.7 万 star。 |
| Moltbook | 「纯 agent 社交网络」 | 230 万个 agent 账号；2026 年 3 月被 Meta 收购。 |
| Rainbow deploy | 「多个版本并发」 | 为飞行中的长运行 agent 让旧运行时版本活着。 |
| Communicative dehallucination | 「回答前先问」 | agent 向同伴索取具体信息，而不是瞎猜。 |
| WMAC 2026 | 「那个 AAAI 研讨会」 | 2026 年 4 月多 agent 协调的社区焦点。 |

## 延伸阅读

- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— supervisor-worker 的生产参考
- [MetaGPT — Meta Programming for Multi-Agent Collaborative Framework](https://arxiv.org/abs/2308.00352) —— SOP-角色拆解
- [ChatDev — Communicative Agents for Software Development](https://arxiv.org/abs/2307.07924) —— 沟通式去幻觉
- [MacNet — scaling role-based agents to 1000+](https://arxiv.org/abs/2406.07155) —— 基于 DAG 的扩展
- [OpenClaw on Wikipedia](https://en.wikipedia.org/wiki/OpenClaw) —— 生态概览
- [WMAC 2026](https://multiagents.org/2026/) —— AAAI 2026 Bridge Program 多 agent 协调研讨会
- [LangGraph docs](https://docs.langchain.com/oss/python/langgraph/workflows-agents) —— 生产领跑者
- [CrewAI docs](https://docs.crewai.com/en/introduction) —— 基于角色的框架
