---
id: harness-or-a-smarter-model
title: 现在构建 Harness 还是等待更聪明的模型
card: agents
kind: tradeoff
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, design-review]
tags: [harness, model-capability, reliability, receipts, primitives]
minutes: 10
lessons: [phases/14-agent-engineering/31-agent-workbench-why-models-fail]
manuals: []
practice: []
cheatsheet: [agent-harness]
related: [agents/seven-surfaces-one-symptom-each, agents/vendor-patterns-to-primitives]
updated: 2026-11-03
---

领导层希望暂停两个季度的 harness 开发工作，等待下一代模型的推出，其理论是更强大的模型将不再需要外部脚手架。请用实测证据论证，并指出他们论点中合理的部分。

## Short answer

如今真正承担工程重任的是模型外围的基础设施而非模型内部，各项数据也印证了这一点。在仅改变 harness 的前提下，同一款模型在终端基准测试中从 30 名开外跃升至第 5 名；而一个删除了其 agent 80 percent 工具的团队，其任务成功率从 80 percent 提升到了 100 percent。绝大多数失败的企业级 agent 项目，问题都出在运行时而非推理能力上。领导层的正确之处在于模型确实会随着时间吸收 harness 的技巧，因此必须基于能够在模型替换后继续存活的原语来构建 harness。

## Full answer

### 实测证据

| 观察项 | 改变的变量 | 产生的结果 |
|---|---|---|
| 终端基准测试上的编码 agent | 仅更换 harness，模型保持相同 | 从前 30 名开外跃升至第 5 名 |
| 某团队的自研 agent | 删除了 80 percent 的工具 | 成功率从 80 percent 飙升至 100 percent |
| 法律领域专业 agent | 仅优化 harness 工程外壳 | 准确率实现翻倍以上 |
| 企业级 agent 探索项目 | 无 | 88 percent 无法推进到生产阶段，故障主要集中在运行时 |
| 某基准测试上的三个开源框架 | 无 | 任务完成率仅在 50 percent 左右 |
| 长上下文中的网页 agent | 上下文持续拉长 | 完成率从 40 到 50 percent 断崖式下跌至 10 percent 以下，主要是死循环与目标迷失 |

最后两行正是反对盲目等待的核心依据。死循环和目标迷失根本不是推理能力的缺陷。它们是缺少轮数预算、缺少状态文件和缺少范围约束所导致的工程缺失。

### Harness 的真正构成

七个交互表面是面向用户的表层。在其底层，是每个高可靠生产系统早已具备的原语：函数、worker、触发器、运行时、通信总线、队列、会话持久化以及授权策略。Agent 循环本质上是一个消费事件、调用函数、写入记录并发出触发信号的 worker。这些工程原语没有一项特定于当前这一代模型，也不会随着模型能力的提升而失去价值。

### 领导层说对的部分

模型确实会不断吸收 harness 的外围技巧。两年前属于 prompt 技巧的模式如今已成为原生能力，原始循环中的思考 token 方案演变成了独立的推理通道。诚实的论断并不是说外部 harness 能永远包办一切，而是指当下绝大部分工程负载存在于模型周围，并且为了承载这些负载所构建的原语，本就是任何生产系统无论是否引入模型都必不可少的构件。

### 对领导层的建议方案

将各个表面构建为系统原语，而不是 prompt 文本。将状态、范围、反馈、关卡和交接落地为不依赖具体模型的磁盘文件与确定性检查。当下一代模型发布时，直接接入新模型并完整保留这些工程表面。Harness 的工程投入不是同模型能力的演进对赌，而是系统架构中真正能够持续保留的部分。

## Follow-ups

- **Level 3:** 上述实测证据中哪一条的论证力度最弱，为什么？ Expected: 企业项目失败率，因为那是没有受控对比的问卷调研数据，而基准测试排名变化是在保持模型不变的前提下测得的。
- **Level 3:** 更先进的模型不再需要重复动作检测器了，你会删除它吗？ Expected: 暂不删除，因为检测器是由低成本触发器和函数组成的，只有当追踪数据显示它从不触发时才予以退役。
- **Level 4:** 每个季度如何向领导层直观展示在 harness 上的投资回报？ Expected: 在当前模型上分别运行开启和关闭工程表面的同一套基准任务，汇报完成率、越界违规率和人工介入次数的差距。
- **Level 4:** 哪一个 harness 组件最有可能在接下来被模型自身吸收？ Expected: 给出有理有据的选择，例如工具报错后的自我修正，因为模型本身能看到观察结果，外部表面只负责格式化。

## Wrong answers

- "模型本身才是产品，因此 harness 是无谓的开销。" 在保持模型不变的情况下，正是 harness 决定了基准测试上的排名优劣。
- "更大的上下文窗口可以解决目标迷失的问题。" 课程中的长上下文实验结果恰恰相反，随着上下文膨胀，任务完成率跌落到了 10 percent 以下。
- "Harness 工程本质上不过是换了个名字的 prompt 工程。" Prompt 只能告诉模型当轮需要什么，而 harness 依靠文件与确定性检查在跨轮次与跨会话中承载工作状态。

## Taught in

[Agent 工作台工程：能干的模型为什么还会失败](../../../phases/14-agent-engineering/31-agent-workbench-why-models-fail/)课程汇总了实测证据并将 harness 拆解归纳为系统原语。
