# 前沿安全框架 —— RSP、PF、FSF

> 三个主要实验室的框架定义了 2026 年对前沿能力的行业治理。Anthropic 责任扩展政策 v3.0（2026 年 2 月）引入分层的 AI 安全等级（ASL-1 到 ASL-5+），仿照生物安全等级，其中 ASL-3 于 2025 年 5 月对 CBRN 相关模型激活。OpenAI Preparedness Framework v2（2025 年 4 月）为受追踪能力定义了五条判据，并把能力报告（Capabilities Reports）与保障报告（Safeguards Reports）分开。DeepMind Frontier Safety Framework v3.0（2025 年 9 月）引入关键能力等级，包括一个新的「有害操纵」CCL。如今三者都包含「竞争者调整」条款，允许在同行实验室不带可比保障就交付时延后执行。跨实验室的对齐仍是结构性的、而非术语性的：「能力阈值」「高能力阈值」「关键能力等级」指代的是类似的构造。

**类型：** Learn
**语言：** 无
**前置要求：** 阶段 18 · 17（WMDP）、阶段 18 · 07-09（欺骗失败）
**预计时间：** ~75 分钟

## 学习目标

- 描述 Anthropic 的 ASL 分层结构，以及是什么激活了 ASL-3。
- 说出 OpenAI Preparedness Framework v2 为受追踪能力定的五条判据。
- 描述 DeepMind 的关键能力等级结构和「有害操纵」CCL。
- 解释竞争者调整条款，以及为什么它对竞速动态很重要。
- 定义安全论证，并描述三支柱结构（监控、不可读性、无能力）。

## 问题背景

第 7-17 课确立了：欺骗是可能的、两用能力存在、评估有其极限。一家拥有前沿能力模型的实验室，需要一个内部治理结构，它要：
- 定义何时需要新保障的阈值。
- 定义扩展前所需的评估。
- 描述一份安全论证长什么样。
- 处理竞速动态问题（如果竞争者不带保障就交付，你怎么办？）。

这三个 2025-2026 框架是当前的最先进水平——不完美、在演进、且跨实验室对齐到足以让治理问题如今变成「框架是否足够」，而非「框架是否存在」。

## 核心概念

### Anthropic 责任扩展政策 v3.0（2026 年 2 月）

ASL 结构：
- ASL-1：不是前沿模型（被「弱于前沿」基线涵盖）。
- ASL-2：当前前沿基线；带常规保障部署。
- ASL-3：灾难性误用风险显著更高；CBRN 相关能力。于 2025 年 5 月激活。
- ASL-4：跨过 AI R&D-2 阈值；能自动化入门级 AI 研究的模型。
- ASL-5+：高级 AI R&D；能大幅加速有效扩展的模型。

v3.0 新增：
- 前沿安全路线图（以删节形式公开）。
- 风险报告（季度，部分经外部评审）。
- AI R&D 拆分为 AI R&D-2 和 AI R&D-4。
- 一旦跨过 AI R&D-4，就需要一份肯定式安全论证，识别「模型追求失配目标」所带来的失配风险。

### OpenAI Preparedness Framework v2（2025 年 4 月 15 日）

受追踪能力的五条判据：
- **可信（Plausible）。** 存在合理的威胁模型。
- **可测（Measurable）。** 可做实证评估。
- **严重（Severe）。** 危害很大。
- **全新（Net-new）。** 不是已有风险被放大。
- **瞬时或不可补救（Instantaneous-or-irremediable）。** 危害发生得快、或无法挽回。

满足全部五条的能力受追踪。其它不受。

PF v2 的其它结构：
- 把能力报告（模型能做什么）与保障报告（存在什么控制）分开。
- 安全顾问组评审。
- 领导层批准；董事会的安全与安保委员会监督。
- 「调整条款」：若另一家实验室不带可比保障就交付，OpenAI 可降低要求。

### DeepMind Frontier Safety Framework v3.0（2025 年 9 月）

按领域划分的关键能力等级（CCL）：
- 生物武器提升
- 网络提升
- ML R&D 加速
- 有害操纵（v3.0 新增）：能在高风险情境下实质性改变信念/行为的模型。

v2.0（2025 年 2 月）加入了「欺骗性对齐」一节，并为 ML R&D 的 CCL 设了更高的安保等级。

### 跨实验室对齐

- Anthropic「能力阈值」。
- DeepMind「关键能力等级」。
- OpenAI「高能力阈值」。

没有行业标准术语。结构上对齐：三层前沿能力，带公开的评估判据。三者都包含竞争者调整条款（2025 年起）。

### 安全论证

安全论证是一份书面论证，主张某个部署在最坏情况假设下在可接受范围内安全。标准结构瞄准三支柱：

- **监控。** 如果坏行为发生了，我们能检测到吗？
- **不可读性。** 模型是否缺乏执行一个连贯的致害计划的能力？
- **无能力。** 模型是否缺乏造成所讨论危害的能力？

不同的安全论证瞄准不同的支柱。对一份 ASL-3 CBRN 论证，无能力（经由遗忘）是主要目标。对欺骗性对齐，监控和不可读性是目标。对网络提升，三者都相关。

### 竞速动态问题

竞争者调整条款有争议。批评者主张它们制造了一场逐底竞赛：如果三家实验室都会在竞争者背叛时降低要求，均衡就会朝背叛偏移。辩护者主张，如果背叛的实验室更不重视安全，那么另一种选择（单边保障）会产生更糟的结果。

UK AISI、US CAISI、EU AI Office（第 24 课）是外部治理的对应方。实验室框架是自愿的；监管框架正在形成。

### 这在阶段 18 里的位置

第 17-18 课是叠在欺骗与红队分析之上的「测量与治理」层。第 19-24 课讲福祉、偏见、隐私、水印、监管结构。第 28 课勾勒出把这些评估操作化的研究生态（MATS、Redwood、Apollo、METR）。

```figure
al-asl-ladder
```

## 实际使用

本课没有代码。读三份原始资料：RSP v3.0、PF v2、FSF v3.0。把每家实验室的分层结构映射到其它两家，并指出每家定义、而其它两家没定义的一个阈值。

## 拿去用

本课产出 `outputs/skill-framework-diff.md`。给定一个安全框架或发布说明，它把该框架的阈值定义、所需评估、安全论证结构与 RSP v3.0、PF v2、FSF v3.0 对比，并标出跨实验室的缺口。

## 练习

1. 读 RSP v3.0、PF v2、FSF v3.0。编一张表，列出每家实验室的 CBRN 阈值、各自的 AI R&D 阈值、以及各自所需的部署前评估。

2. 竞争者调整条款在三个框架里都有（2025 年起）。写一段为它辩护；写一段反对它。指出每个立场所依赖的假设。

3. 为一个跨过 Anthropic AI R&D-4 阈值的模型设计一份安全论证。说出三支柱（监控、不可读性、无能力）各自需要的证据。

4. DeepMind 的 FSF v3.0 引入了一个「有害操纵」CCL。提出三种能表明模型已跨过此阈值的实证测量。

5. 读 METR 的「Common Elements of Frontier AI Safety Policies」（2025）。说出三个最强的跨实验室趋同点，以及两个最大的分歧点。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| RSP | 「Anthropic 的框架」 | 责任扩展政策；ASL 分层；v3.0 2026 年 2 月 |
| PF | 「OpenAI 的框架」 | Preparedness Framework；五条判据；v2 2025 年 4 月 |
| FSF | 「DeepMind 的框架」 | Frontier Safety Framework；CCL；v3.0 2025 年 9 月 |
| ASL-3 | 「生物安全等级 3 的类比」 | Anthropic 对 CBRN 相关能力的分层；2025 年 5 月激活 |
| CCL | 「关键能力等级」 | DeepMind 的阈值构造；按领域划分 |
| 安全论证 | 「那份正式论证」 | 主张「部署在最坏情况 U 下可接受地安全」的书面论证 |
| 调整条款 | 「容许竞争者背叛」 | 框架条款，允许在竞争者不带可比保障就交付时降低要求 |

## 延伸阅读

- [Anthropic — Responsible Scaling Policy v3.0 (February 2026)](https://www.anthropic.com/responsible-scaling-policy) —— ASL 分层、路线图、AI R&D 拆分
- [OpenAI — Updating the Preparedness Framework (April 15, 2025)](https://openai.com/index/updating-our-preparedness-framework/) —— 五条判据、调整条款
- [DeepMind — Strengthening our Frontier Safety Framework (September 2025)](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) —— CCL v3.0、有害操纵
- [METR — Common Elements of Frontier AI Safety Policies (2025)](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/) —— 跨实验室对比
