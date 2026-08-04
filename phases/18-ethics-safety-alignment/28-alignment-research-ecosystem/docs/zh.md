# 对齐研究生态 —— MATS、Redwood、Apollo、METR

> 五个组织定义了 2026 年实验室之外的对齐研究层。MATS（ML Alignment & Theory Scholars）：自 2021 年底以来 527+ 名研究者、180+ 篇论文、10K+ 引用、h 指数 47；2024 年夏季队列注册为 501(c)(3)，约 90 名学者和 40 名导师；2025 年之前的校友中 80% 从事安全/安保工作，其中 200+ 在 Anthropic、DeepMind、OpenAI、UK AISI、RAND、Redwood、METR、Apollo。Redwood Research：由 Buck Shlegeris 创立的应用对齐实验室；提出了 AI 控制（第 10 课）；与 UK AISI 合作搞控制安全论证。Apollo Research：为前沿实验室做部署前阴谋评估；撰写了上下文阴谋（第 8 课）和 Towards Safety Cases for AI Scheming。METR（Model Evaluation and Threat Research）：基于任务的能力评估、自主任务时间跨度研究；「Common Elements of Frontier AI Safety Policies」对比各实验室框架。Eleos AI Research：模型福祉部署前评估（第 19 课）；做了 Claude Opus 4 福祉评估。

**类型：** Learn
**语言：** 无
**前置要求：** 阶段 18 · 01-27（阶段 18 前面的课）
**预计时间：** ~45 分钟

## 学习目标

- 识别实验室之外对齐研究生态的五个组织及其核心产出。
- 描述 MATS 的规模（学者、论文、h 指数）及其作为人才管道的角色。
- 描述 Redwood 的 AI 控制议程及其与 UK AISI 的伙伴关系。
- 描述 METR 基于任务的评估方法论。

## 问题背景

前沿实验室（第 18 课）在内部产出安全评估，并发布选定的结果。实验室之外的生态，是评估被验证、新失败模式被首次发现、以及人才被培养的地方。理解这个生态有助于解读哪些研究发现被谁信任。

## 核心概念

### MATS（ML Alignment & Theory Scholars）

2021 年底启动。研究导师制项目；学者花 10-12 周与一位资深研究者一起做一个具体的对齐问题。

规模（2026）：
- 自成立以来 527+ 名研究者。
- 发表 180+ 篇论文。
- 10K+ 引用。
- h 指数 47。
- 2024 年夏季：90 名学者 + 40 名导师；注册为 501(c)(3)。

职业去向：2025 年之前的校友约 80% 在从事安全/安保工作。200+ 在 Anthropic、DeepMind、OpenAI、UK AISI、RAND、Redwood、METR、Apollo。

### Redwood Research

应用对齐实验室。由 Buck Shlegeris 创立。提出了 AI 控制议程（第 10 课）。与 UK AISI 合作搞控制安全论证。为 DeepMind 和 Anthropic 提供评估设计建议。

经典论文：Greenblatt、Shlegeris et al., "AI Control"（arXiv:2312.06942, ICML 2024）；对齐伪装（Greenblatt、Denison、Wright et al., arXiv:2412.14093, 与 Anthropic 合作）。

风格：具体的威胁模型、最坏情况的对手、可被压力测试的具体协议。

### Apollo Research

为前沿实验室做部署前阴谋评估。撰写了上下文阴谋（第 8 课, arXiv:2412.04984）。2025 年 OpenAI 反阴谋训练合作的伙伴。产出 Towards Safety Cases for AI Scheming（2024）。

风格：欺骗可能涌现的智能体设置评估；三支柱分解（失配、目标导向、情境觉知）。

### METR（Model Evaluation and Threat Research）

基于任务的能力评估。自主任务完成时间跨度研究。「Common Elements of Frontier AI Safety Policies」（metr.org/common-elements, 2025）对比各实验室框架。

与 Apollo 合著 AI 阴谋安全论证草图。

风格：长跨度任务评估、实证能力测量、框架综合。

### Eleos AI Research

模型福祉部署前评估。做了系统卡 5.3 节记录的 Claude Opus 4 福祉评估。为第 19 课与福祉相关的宣称提供外部方法论核查。

### 这条流

MATS 培养研究者。毕业生去 Anthropic、DeepMind、OpenAI（实验室安全团队），或去 Redwood、Apollo、METR、Eleos（外部评估）。外部评估方与实验室、以及 UK AISI / CAISI 合作。出版物把生态反哺给 MATS 的下一队列。

### 为什么这一层重要

单一来源的评估不可靠：实验室评估自己的模型有结构性的利益冲突。外部评估方能提出并验证实验室可能少报的失败模式。2024 年潜伏特工论文（第 7 课）是 Anthropic + Redwood；对齐伪装是 Anthropic + Redwood；上下文阴谋是 Apollo；反阴谋是 Apollo + OpenAI。这种多组织结构就是质量控制。

### 这在阶段 18 里的位置

第 7-11 课引用 Redwood 和 Apollo 的工作；第 18 课引用 METR 的框架对比；第 19 课引用 Eleos。第 28 课是本阶段其余部分所依赖的那个生态的明确组织地图。

```figure
sae-features
```

## 实际使用

没有代码。读 METR 的「Common Elements of Frontier AI Safety Policies」，作为「外部综合如何给实验室内部政策工作增值」的一个例子。

## 拿去用

本课产出 `outputs/skill-ecosystem-map.md`。给定一个对齐宣称或评估，它识别出组织、发表场所、方法论风格，并与已知的对应组织交叉核对。

## 练习

1. 从第 7-15 课里挑一篇论文，识别涉及的组织。把作者与 MATS 校友和当前的生态隶属交叉核对。

2. 读 METR 的「Common Elements of Frontier AI Safety Policies」。指出他们强调的三个跨实验室趋同点和两个最大分歧点。

3. MATS 职业去向约 80% 是安全/安保。论证这种选择压力是适应性的（培养了这个领域）还是有偏的（筛掉了异端立场）。

4. Redwood 和 Apollo 都做控制/阴谋工作，但风格不同。挑一个失败模式，描述各自会怎么调查它。

5. Eleos AI 是唯一纯粹的模型福祉组织。设计一个假想的第二组织，聚焦一个不同的福祉相邻问题（认知自由、机器人具身等），并说清它的方法论。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| MATS | 「那个导师制项目」 | ML Alignment & Theory Scholars；自 2021 年起 527+ 名研究者 |
| Redwood Research | 「那个控制实验室」 | 应用对齐；AI 控制作者；UK AISI 伙伴 |
| Apollo Research | 「那个阴谋评估」 | 为前沿实验室做部署前阴谋评估 |
| METR | 「那个任务跨度评估」 | 基于任务的能力评估；框架综合 |
| Eleos AI | 「那个福祉实验室」 | 模型福祉部署前评估 |
| 人才管道 | 「MATS -> 实验室」 | MATS 毕业生流向 Anthropic、DM、OpenAI、Redwood、Apollo、METR |
| 外部评估 | 「非实验室核查」 | 不由模型生产者做的评估；增加可信度 |

## 延伸阅读

- [MATS (ML Alignment & Theory Scholars)](https://www.matsprogram.org/) —— 导师制项目
- [Redwood Research](https://www.redwoodresearch.org/) —— AI 控制论文
- [Apollo Research](https://www.apolloresearch.ai/) —— 阴谋评估
- [METR — Common Elements of Frontier AI Safety Policies](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/) —— 框架对比
- [Eleos AI Research](https://www.eleosai.org/research) —— 模型福祉方法论
