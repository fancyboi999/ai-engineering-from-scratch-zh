---
id: design-a-research-team
title: 为生产环境设计 Lead 与 Workers 研究系统
card: multi-agent
kind: take-home
level: 4
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [take-home, system-design]
tags: [supervisor, shared-memory, verifier, circuit-breaker, observability]
minutes: 60
lessons: [phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink]
manuals: []
practice: []
cheatsheet: [multi-agent, research-agent-pipeline, agent-failure-modes]
related: [multi-agent/why-a-fresh-context-wins, multi-agent/the-verifier-that-cannot-write, multi-agent/the-retry-storm]
updated: 2026-11-03
---

课后任务（Take-home）。为一个用户提出开放式问题并期望获得附带引证答案的产品，设计一套由一个主控 lead agent 负责规划、多个 worker agent 并行检索的研究系统。交付一份设计文档，包含 lead 和 worker 的 prompt 框架大纲、共享内存、你预期的故障模式及每种模式的缓解措施、操作限制以及成本模型。如果预算减半，说明你会削减什么。

## Short answer

Lead 负责将问题拆解为子问题，根据问题的复杂度调整 worker 数量，并直接合成 worker 提交的摘要而无需通读原始素材。每个 worker 都有纯净上下文、明确的作用域、设定在中位数运行时两倍左右的超时以及 token 上限。共享内存为每条记录附加溯源信息，采用仅追加结构，并由重新获取源数据并在专属频道上报告的只读校验器检查。每个对外调用都置于熔断器之后，系统采用新旧版本并行部署，且成本模型预先说明该模式的 token 消耗约为单个 agent 的 15 倍。

## Full answer

### Lead

- Prompt 大纲：拆解、委派、合成，绝不直接研究。
- 根据查询调整算力：简单问题分配一个 agent 和少数工具调用，复杂问题分配超过十个 worker。由 lead 估算，调用方不干预。
- 先广后深拆解，仅在子回答有充分理由时再派生更深的 worker。
- 带有溯源的合成：答案中的每个断言都指明源自哪个 worker 和哪个源。
- 冲突处理：当两个 worker 返回矛盾事实时，缩小提问范围重新提问或呈现分歧，绝不在沉默中做出选择。

### Workers

- Prompt 大纲：单个子问题、优先考虑的源、超出范围的内容、输出形态。
- 每个 worker 拥有纯净上下文，以便 lead 的规划 token 绝不进入 worker 的窗口。
- 设定在中位数 worker 运行时两倍左右的超时，超时后 lead 可以缩小作用域重新派生或在没有该结果的情况下继续。
- 每个 worker 的硬性 token 上限，大约为预期合成输入的十倍量级，因此失控的单个 worker 不会耗尽预算。

### 共享内存

- 每条记录包含编写者、时间戳、prompt 哈希及其引用的源。
- 日志是仅追加的；修正会替代并引用其替换的记录。
- 只读校验器重新获取引用的源，标记不匹配项，且仅向 lead 和人类可读的校验频道写入。
- 监控替代旧条目的写入占比，将其作为编写者出现幻觉的早期迹象。

### 故障模式与缓解措施

| 预期故障 | 缓解措施 |
|---|---|
| Lead 拆解了错误的问题 | 记录拆解并在 worker 开始前与用户问题做比对 |
| Worker 过度探索 | 明确的作用域、超时和 token 上限 |
| 两个 Worker 出现分歧 | 按每个子问题规范化断言来检测；重新提问或呈现分歧 |
| 内存投毒 | 溯源、仅追加、只读校验器 |
| 针对搜索或获取服务的重试风暴 | 错误率达到 5% 到 10% 时熔断的断路器和有上限的重试预算 |
| 静默的错误答案 | 每周运行一次具有已知答案的黄金问题集，并抽样人工审查 |

### 运维

- 跟踪 lead 的计划、每个 worker 的工具调用以及合成，以便将错误答案追溯到 worker 和源。
- 在旧版本旁边部署新版本，让长时间运行的问题在它们启动时的版本上完成。
- 每个季度在约 1000 条跟踪记录样本上运行故障模式审计，并按消除的故障数量给缓解措施排序。

### 成本模型

说明测得的倍数：该模式消耗的 token 约为单个 agent 的 15 倍，且浏览基准上约 80% 的质量方差可以用 token 使用量解释。针对每个问题类别，在答案质量旁边报告 token 和真实耗时。

### 预算减半的情况下

保留 lead 的伸缩规则，并提高问题在 lead 添加 worker 之前必须达到的复杂度，以便更多问题分配给单个 agent。保留溯源和校验器，因为它们成本低廉且能保护引证答案。在削减校验器之前优先削减每个问题的 worker 数量，并彻底削减辩论轮次。

### 评分标准

prompt 大纲、带有溯源字段的内存 schema、每行一个缓解措施的故障表、三个附带推导依据的操作限制，以及展示倍数而非掩盖成本的成本部分。

## Follow-ups

- **Level 3:** 为什么 lead 绝不阅读原始源数据，即使是为了检查 worker？ Expected: 其窗口用于规划和合成，检查属于校验器，后者重新获取源而不向池写入。
- **Level 3:** worker 返回了没有源的摘要，设计如何处理？ Expected: 溯源将条目标记为未引用，lead 赋予其较低权重，校验器无法检查它，因此答案要么省略它要么给它加上标注。
- **Level 4:** 如果在 lead 和 workers 之外只能保留一个组件，你会保留哪个？ Expected: 带有溯源的只读校验器，因为带有引证的错误答案是产品无法承受的故障。
- **Level 4:** 下个季度你如何知道系统仍在正常工作？ Expected: 每周运行黄金集、替代率和标记率、并行 worker 之间的一致率，以及季度审计。

## Wrong answers

- "给每个 worker 完整的对话以便其拥有上下文。" 这会消耗纯净上下文的优势，并将 lead 的规划复制到每个窗口中。
- "让 lead 靠挑选写得更好的答案化解冲突。" 沉默的选择对用户隐瞒了分歧，设计必须重新提问或呈现它。
- "跳过校验器，因为 lead 已经阅读了 worker 摘要。" lead 比较的是摘要之间的差异，而不是摘要与来源是否相符，共享的摘要可能共享幻觉。

## Taught in

[Supervisor 模式课程](../../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/)给出了 lead、worker 和限制，[共享内存课程](../../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/)给出了溯源字段和只读检查器，[故障模式课程](../../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/)给出了熔断器和审计。
