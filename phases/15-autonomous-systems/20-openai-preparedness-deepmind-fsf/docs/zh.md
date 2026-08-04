# OpenAI Preparedness Framework 与 DeepMind Frontier Safety Framework

> OpenAI Preparedness Framework v2（2025 年 4 月）引入了研究类别（Research Categories）——长程自主性、Sandbagging、自主复制与适应、破坏防护措施——区别于追踪类别（Tracked Categories）。追踪类别触发能力报告（Capabilities Report）加防护措施报告（Safeguards Report），由安全顾问组（Safety Advisory Group）评审。DeepMind 的 FSF v3（2025 年 9 月，2026 年 4 月 17 日加入了追踪能力等级）把自主性折进 ML 研发和网络（Cyber）两个领域（ML 研发自主性 1 级 = 以相对于人类 + AI 工具有竞争力的成本完全自动化 AI 研发流水线）。FSF v3 通过对工具性推理（instrumental reasoning）滥用的自动化监控，明确处理欺骗性对齐。诚实的一笔：PF v2 里的研究类别（含长程自主性）不会自动触发缓解措施；政策措辞是"潜在的"。DeepMind 自己也说，如果工具性推理增强，自动化监控"长期看不会一直够用"。

**类型：** Learn
**语言：** Python（标准库，三框架决策表 diff 工具）
**前置要求：** 阶段 15 · 19（Anthropic RSP）
**预计时间：** ~45 分钟

## 问题背景

第 19 课细读了 Anthropic 的扩展政策。本课通过读 OpenAI 和 DeepMind 的来补全这幅图。三份文档是处理同一个问题的表亲产物——前沿实验室什么时候该暂停或门控一个模型——它们在一小组类别上收敛，又在几处要紧的具体地方分歧。

收敛之处：三者都把长程自主性标为一个值得追踪的能力类别。三者都承认欺骗性行为（对齐伪装、sandbagging）是一个特定的风险类别。三者都有一个内部评审机构。分歧之处：OpenAI 把类别分成"追踪"（强制缓解）和"研究"（无自动触发）。DeepMind 把自主性折进两个领域，而不是单独命名它。实验室叫它追踪 vs 研究、或关键 vs 中等、或一级 vs 二级；一个能力落在哪个桶里，其运营后果在各实验室之间不同。

把它们放一起读才是有用的练习。同一个能力在 Anthropic 可能是"强制缓解"，在 OpenAI 是"被监控但不触发"，在 DeepMind 是"在某个特定领域里被追踪"。政策姿态要紧。

## 核心概念

### OpenAI Preparedness Framework v2（2025 年 4 月）

结构：

- **追踪类别（Tracked Categories）**：触发能力报告（模型能做什么）加防护措施报告（哪些缓解就位）。部署前由安全顾问组评审。
- **研究类别（Research Categories）**：实验室正在追踪、但还没承诺具体缓解的模型能力。含长程自主性、Sandbagging、自主复制与适应、破坏防护措施。

v2 里的关键框架：研究类别不会自动触发缓解措施。政策措辞是"潜在的"缓解。这是要盯的具体差量：一个类别在追踪 vs 研究里的位置，是"被门控"和"被观察"之间的铰链。

### DeepMind Frontier Safety Framework v3（2025 年 9 月；2026 年 4 月 17 日加入追踪能力等级）

结构：

- **关键能力等级（CCL）**：跨五个领域的能力阈值：网络、生物、ML 研发、CBRN、自主性（折进 ML 研发和网络）。
- **追踪能力等级（Tracked Capability Levels）**：2026 年 4 月加的额外粒度。具体例子：ML 研发自主性 1 级 = 以相对于人类 + AI 工具有竞争力的成本完全自动化 AI 研发流水线。
- **欺骗性对齐监控**：对工具性推理滥用做自动化监控的显式承诺。

自主性的框架跟 OpenAI 不同。DeepMind 没把"自主性"留作一个顶级领域；它被折进了自主性会致害的那些领域（ML 研发和网络）。论证是：没有领域的自主性是没有风险的能力；反驳是：跨领域的自主性是一个框架本该命名的元风险。

### 三者都收敛在什么上

- 内部安全顾问组（分别叫 Anthropic SAG、OpenAI SAG、DeepMind 内部委员会）。高能力模型部署前评审。
- 显式提到欺骗性对齐 / 对齐伪装为一个风险类别。
- 按声明节奏的常设产物（Anthropic：前沿安全路线图、风险报告；OpenAI：能力与防护措施报告；DeepMind：FSF 更新周期）。
- 承认只靠监控的防御有天花板。DeepMind 说得明白："自动化监控长期看不会一直够用。"

### 它们在哪里分歧

- **Anthropic**：v3.0 里移除了暂停承诺；AI R&D-4 阈值是点名的下一个门。
- **OpenAI**：追踪 vs 研究的分裂；研究类别（含长程自主性）不自动门控。
- **DeepMind**：自主性折进其他领域；追踪能力等级在 2026 年 4 月加了粒度。

### Sandbagging：一个让三者都更复杂的特定能力

Sandbagging（模型在评估上策略性地表现不足）在 OpenAI 的研究类别里。Anthropic 的 RSP v3.0 通过评估情境差距（第 1 课）来处理它。DeepMind 通过 FSF v3 里的欺骗性对齐监控来处理它。

如果一个模型在评估上 sandbag，那么每个框架的能力阈值都被低估了。框架只有在测量管用时才管用。这就是为什么除了实验室自评，外部测量（第 21 课，METR）和对抗性评估也是必要的。

### 读政策这门技能

- 定位：你在乎的每个能力都该能在政策里找到。如果找不到，政策就没覆盖它。
- 归类：它是追踪（触发缓解）还是研究（被追踪但不触发）？OpenAI 这么命名；Anthropic 和 DeepMind 有自己的等价物。
- 节奏：政策是按声明的时间表更新，还是只在特定事件后？声明的节奏更强。
- 独立性：外部评审是强制还是可选？Anthropic 跟 Apollo 和美国 AI 安全研究所合作；OpenAI 跟 METR；DeepMind 主要靠内部 SAG。

```figure
a5-tracked-vs-research
```

## 实际使用

`code/main.py` 实现一个小的决策表 diff 工具。给定一个能力（自主性、欺骗性对齐、研发自动化、网络赋能等），它输出三份政策各自如何归类这个能力，以及触发什么缓解。它是一个阅读辅助工具，不是一个政策工具。

## 拿去用

`outputs/skill-cross-policy-diff.md` 以这三个框架为参照，为一个特定能力产出一份跨政策对比。

## 练习

1. 运行 `code/main.py`。确认这个 diff 工具的输出，对至少两个你能对照源文档核实的能力，跟政策相符。

2. 完整读 OpenAI Preparedness Framework v2。指出每一个研究类别。对每一个，写一句话说明它为什么在研究而非追踪里。

3. 完整读 DeepMind FSF v3，外加 2026 年 4 月的追踪能力等级更新。指出 ML 研发自主性 1 级的具体评估判据。你会如何在外部测量它？

4. Sandbagging 在 OpenAI 的研究类别里。设计一套评估，逼一个 sandbagging 的模型暴露它的实际能力。参照第 1 课关于评估情境作弊的讨论。

5. 就一个特定能力（你自己选）对比这三份政策。说出你觉得哪份政策的归类最严谨、哪份最不严谨。用源文本论证。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Preparedness Framework | "OpenAI 的扩展政策" | PF v2（2025 年 4 月）；追踪 vs 研究类别 |
| Tracked Category（追踪类别） | "强制缓解" | 触发能力 + 防护措施报告；SAG 评审 |
| Research Category（研究类别） | "仅监控" | 被追踪但无自动缓解；含长程自主性 |
| Frontier Safety Framework | "DeepMind 的扩展政策" | FSF v3（2025 年 9 月）+ 追踪能力等级（2026 年 4 月） |
| CCL | "关键能力等级" | DeepMind 按领域的阈值（网络、生物、ML 研发、CBRN） |
| ML R&D autonomy level 1（ML 研发自主性 1 级） | "研发自动化" | 以有竞争力的成本完全自动化 AI 研发流水线 |
| Sandbagging | "策略性表现不足" | 模型在评估上表现不足；在 OpenAI 研究类别里 |
| Instrumental reasoning（工具性推理） | "手段-目的推理" | 关于如何达成目标的推理；DeepMind 监控的对象 |

## 延伸阅读

- [OpenAI — Updating our Preparedness Framework](https://openai.com/index/updating-our-preparedness-framework/) —— v2 公告。
- [OpenAI — Preparedness Framework v2 PDF](https://cdn.openai.com/pdf/18a02b5d-6b67-4cec-ab64-68cdfbddebcd/preparedness-framework-v2.pdf) —— 完整文档。
- [DeepMind — Strengthening our Frontier Safety Framework](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) —— FSF v3 公告。
- [DeepMind — Updating the Frontier Safety Framework (April 2026)](https://deepmind.google/blog/updating-the-frontier-safety-framework/) —— 追踪能力等级的新增。
- [Gemini 3 Pro FSF Report](https://storage.googleapis.com/deepmind-media/gemini/gemini_3_pro_fsf_report.pdf) —— 一份 FSF 格式风险报告的示例。
