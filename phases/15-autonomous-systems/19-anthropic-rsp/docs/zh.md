# Anthropic 负责任扩展政策 v3.0

> RSP v3.0 于 2026 年 2 月 24 日生效，取代了 2023 年的政策。两层缓解：Anthropic 会单方面去做的事 vs 被定位为全行业建议的事（包含 RAND SL-4 安全标准）。把前沿安全路线图（Frontier Safety Roadmap）和风险报告（Risk Report）加为常设文档，而非一次性交付物。删掉了 2023 年的暂停承诺。引入了 AI R&D-4 阈值：一旦越过，Anthropic 必须发表一份正面论证（affirmative case），指明失准风险与缓解措施。Claude Opus 4.6 没越过它。Anthropic 在 v3.0 公告里说"有把握地排除这一点正变得困难"。SaferAI 给 2023 年的 RSP 评了 2.2 分；他们把 v3.0 下调到 1.9，把 Anthropic 跟 OpenAI 和 DeepMind 一起放进了"弱"这一档 RSP。定性阈值取代了 2023 年的定量承诺；移除暂停条款是最尖锐的回退。

**类型：** Learn
**语言：** Python（标准库，RSP 阈值决策引擎）
**前置要求：** 阶段 15 · 06（AAR），阶段 15 · 07（RSI）
**预计时间：** ~45 分钟

## 问题背景

前沿实验室发布的扩展政策，一部分是技术文档，一部分是治理文档，一部分是发给监管方的信号。RSP v3.0 是 Anthropic 当前的文档。细读它要紧，不是因为遵守它有约束力（并没有），而是因为这套框架塑造了一个实验室如何构想灾难性风险、以及如何向公众沟通取舍。

v3.0 对比 v2.0 的 diff 是有用的单位。加了什么：前沿安全路线图、风险报告、AI R&D-4 阈值。删了什么：2023 年的暂停承诺。重新定位了什么：一张分成 Anthropic 单方面 和 行业建议 两层的缓解时间表。外部评审——SaferAI——把分数从 2.2（v2）下调到 1.9（v3.0）。一个扩展政策就是这样能在看起来更精致的同时变得更不严谨。

## 核心概念

### 两层缓解时间表

- **Anthropic 单方面行动**：无论其他实验室怎么做，Anthropic 都会做的事。超过某个阈值就停训、特定的安全措施、特定的部署门。
- **全行业建议**：Anthropic 认为整个行业应该集体去做的事。包含 RAND SL-4 安全标准。这些不是 Anthropic 一方的承诺；它们是 Anthropic 的政策倡导。

两层结构在 v2 里没有。它意味着读者需要看每条承诺活在哪一列。落在"全行业建议"列里的一项安全措施不是 Anthropic 的承诺；它是 Anthropic 的期望。

### AI R&D-4 阈值

这是 RSP v3.0 点名为重要的下一个阈值的能力等级。具体来说：一个能以有竞争力的成本自动化相当大一部分 AI 研究的模型。一旦 Anthropic 相信某个模型越过了它，他们就必须在继续扩展之前发表一份正面论证，指明失准风险与缓解措施。

按 v3.0 公告，Claude Opus 4.6 没越过它。文档补了一句："有把握地排除这一点正变得困难。"这个措辞要紧；它承认这个阈值已经近到成了一个现实关切，而不是一个空想的极限。

第 6 课（自动化对齐研究）和第 7 课（递归自我改进）直接喂进这个阈值。自主对齐研究员越过研究质量门槛，就是 AI R&D-4 阈值正在逼近的证据。

### 前沿安全路线图与风险报告

v3.0 把两类产物提升为常设文档：

- **前沿安全路线图（Frontier Safety Roadmap）**：前瞻性文档，描述计划中的安全工作、能力预期和缓解研究。
- **风险报告（Risk Report）**：回顾性文档，针对发布后的特定模型，描述观察到的能力和残余风险。

两者都是公开的。两者都按一个声明的节奏更新。用处是：读者能跟踪 Anthropic 在一份路线图里说要做什么，跟他们在一份风险报告里报告的相比如何。

### 移除暂停条款

2023 年的 RSP 含有一条显式的暂停承诺：如果一个模型越过特定能力阈值，训练就暂停，直到缓解措施就位。v3.0 用一个更软的表述（发表一份正面论证，如果缓解措施足够就继续）取代了这条显式暂停。SaferAI 和其他分析者都直接把这点出来，称它是新文档里最强的回退。

支持这一改动的政策论证是：2023 年的定量阈值结果发现按 2026 时代的能力基准无法触及，因为基准本身被重新标度了。反驳是：扩展政策里的一条暂停条款是一个承诺装置；移除它就移除了这个政策的可信度。

### SaferAI 的下调

SaferAI 是一个给 RSP 风格文档评级的独立组织。他们的公开评级：2023 年 Anthropic RSP 得 2.2 分（在一个 4.0 是当前最佳 RSP、1.0 是名义底线的标度上）。v3.0 得 1.9 分。这把 Anthropic 从"中等"挪到了"弱"，跟 OpenAI 和 DeepMind 一起进了弱这一档。

按 SaferAI 的说法，下调的因素：
- 定性阈值取代了定量阈值。
- 暂停承诺被移除。
- AI R&D-4 阈值的缓解被描述为"正面论证"而非具体措施。
- 评审机制依赖 Anthropic 的安全顾问组（Safety Advisory Group），独立监督有限。

### 本课不是什么

这不是一节关于合规的课。RSP v3.0 不是一项法规；没有任何东西强迫 Anthropic 遵守它。本课在于以它应得的具体度和怀疑去读这份文档。扩展政策是前沿实验室就灾难性风险姿态发出的首要公开信号。把它们读好，对任何工作依赖前沿能力的人都是一项实用技能。

```figure
a5-rsp-ladder
```

## 实际使用

`code/main.py` 实现一个小决策引擎，镜像 RSP 阈值评估的形态：给定一个候选模型和一组能力测量，返回 AI R&D-4 阈值是否被越过、所需的正面论证章节，以及部署能否继续。它故意做得简单；要点是把这份文档的逻辑显式化。

## 拿去用

`outputs/skill-scaling-policy-review.md` 拿一份扩展政策（Anthropic、OpenAI、DeepMind 或内部的）对照 v3.0 参照来审查：两层结构、阈值、暂停承诺、独立评审。

## 练习

1. 运行 `code/main.py`。喂入三个不同能力等级的合成模型。确认阈值评估器表现符合预期，并产出正确的正面论证模板。

2. 完整读 RSP v3.0（32 页）。指出活在"全行业建议"层里的每一条承诺。这些承诺里有哪些在 v2 里本来会是"Anthropic 单方面"的？

3. 读 SaferAI 的 RSP 评级方法学。把他们的评分细则套到这份文档上，复现他们给 v3.0 的 1.9 分。哪一行细则最主导了这次下调？

4. 2023 年的暂停承诺被移除了。提出一条替代承诺，既保住政策的可信度，又承认 2026 年的基准重新标度问题。

5. 把 RSP v3.0 跟 OpenAI Preparedness Framework v2（第 20 课）对比。挑一个 v3.0 更强的领域。挑一个 Preparedness Framework 更强的领域。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| RSP | "Anthropic 的扩展政策" | 负责任扩展政策；v3.0 于 2026 年 2 月 24 日生效 |
| AI R&D-4 | "研究自动化阈值" | 以有竞争力的成本自动化相当大一部分 AI 研究的能力 |
| Affirmative case（正面论证） | "安全论证" | 发表的论证，主张风险已被指明、缓解措施足够 |
| Frontier Safety Roadmap（前沿安全路线图） | "前瞻计划" | 关于计划中安全工作和预期能力的常设文档 |
| Risk Report（风险报告） | "对某模型的回顾" | 关于发布后观察到的能力和残余风险的常设文档 |
| Two-tier mitigation（两层缓解） | "单方面 vs 行业" | Anthropic 承诺 vs 行业建议，分开 |
| Pause commitment（暂停承诺） | "2023 年的条款" | 暂停训练的显式承诺；在 v3.0 里被移除 |
| SaferAI rating（SaferAI 评级） | "独立 RSP 评分" | 第三方细则；v3.0 得 1.9（v2 是 2.2） |

## 延伸阅读

- [Anthropic — Responsible Scaling Policy v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) —— 完整的 32 页政策。
- [Anthropic — RSP v3.0 announcement](https://www.anthropic.com/news/responsible-scaling-policy-v3) —— 相对 v2 的改动摘要。
- [Anthropic — Frontier Safety Roadmap](https://www.anthropic.com/research/frontier-safety) —— RSP v3.0 链接的常设文档。
- [Anthropic — Risk Report: Claude Opus 4.6](https://www.anthropic.com/research/risk-report-claude-opus-4-6) —— 对当前前沿模型的回顾。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 把 AI R&D-4 跟实测的自主性联系起来。
