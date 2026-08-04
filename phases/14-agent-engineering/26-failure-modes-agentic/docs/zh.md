# 失败模式：agent 为什么会坏

> MASFT（Berkeley，2025）编目了 3 大类、14 种多 agent 失败模式。微软的 Taxonomy 记录了既有 AI 失败在 agent 场景下如何被放大。行业实地数据收敛到五种反复出现的模式：幻觉动作、范围蔓延、级联错误、上下文丢失、工具误用。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 05（Self-Refine 与 CRITIC）、阶段 14 · 24（可观测性）
**预计时间：** ~60 分钟

## 学习目标

- 说出 MASFT 的三大失败类别，每类至少四种具体模式。
- 解释为什么 agent 失败会放大既有的 AI 失败模式（偏见、幻觉）。
- 描述五种行业反复出现的模式及其缓解办法。
- 用标准库实现一个检测器，给 agent trace 打上失败模式标签。

## 问题背景

团队上线在 90% 的 trace 上能跑的 agent。那 10% 的失败不是随机噪声 —— 它们落入少数几个反复出现的类别。一旦你能给它们命名，你就能监控它们、修复它们。

## 核心概念

### MASFT（Berkeley，arXiv:2503.13657）

多 agent 系统失败分类法。14 种失败模式聚成 3 类。标注者间 Cohen's Kappa 0.88 —— 这些类别可被可靠区分。

核心主张：失败是多 agent 系统的根本设计缺陷，而不是靠更好的基础模型就能修的 LLM 局限。

### 微软《Taxonomy of Failure Mode in Agentic AI Systems》

- 既有 AI 失败（偏见、幻觉、数据泄露）在 agent 场景下被放大。
- 新失败从自主性中涌现：大规模的非预期动作、工具误用、任务漂移。
- 这份白皮书是 agent 产品的风险登记册。

### 《Characterizing Faults in Agentic AI》（arXiv:2603.06847）

- 失败源自编排、内部状态演化和环境交互。
- 不只是「坏代码」或「坏模型输出」。

### LLM Agent 幻觉综述（arXiv:2509.18970）

两种主要表现：

1. **指令遵循偏离** —— agent 不遵循 system prompt。
2. **远距离上下文误用** —— agent 忘记或误用更早轮次的上下文。

子意图错误：Omission（漏掉一步）、Redundancy（重复一步）、Disorder（步骤乱序）。

### 五种行业反复出现的模式

Arize、Galileo、NimbleBrain 在 2024-2026 的实地分析收敛到：

1. **幻觉动作。** agent 调用一个不存在的工具或编造参数。
2. **范围蔓延。** agent 把任务扩展到超出用户所求（建额外的 PR、发额外的邮件）。
3. **级联错误。** 一次错误调用触发下游效应。一个不存在的 SKU 幻觉触发四个 API 调用 —— 一次多系统事故。
4. **上下文丢失。** 长跨度任务忘了早轮次的约束。
5. **工具误用。** 用错误参数调对工具，或者完全调错工具。

级联是致命的。agent 分不清「我失败了」和「这任务根本做不到」，还经常在 400 错误上幻觉出一条成功消息来收尾。

### 缓解：每一步都设关卡

在推理链的每一步设自动化验证关卡，对照环境状态检查事实锚定。具体来说：

- 逐步安全分类器（第 21 课）。
- 工具调用参数校验（第 06 课）。
- 把检索到的内容与已知事实交叉核对（第 05 课，CRITIC）。
- 通过重新探测状态来检测成功幻觉（文件真的创建了吗？）。

### 失败监控在哪里会出错

- **只给崩溃打标。** 大多数 agent 失败产出看着有效的输出。需要内容级检查。
- **没有基线。** 漂移检测需要一个上一次已知良好；没有它你就没法说「这在变糟」。
- **过度告警。** 每个失败都来一次呼叫。聚类并限速。

```figure
failure-cascade
```

## 动手构建

`code/main.py` 用标准库实现一个失败模式打标器：

- 一个覆盖五种模式的合成 trace 数据集。
- 每模式的检测器函数（工具调用、输出、重复动作上的特征模式）。
- 一个打标器，给每条 trace 打标并报告模式分布。

运行它：

```
python3 code/main.py
```

输出：每 trace 标签 + 聚合分布，廉价复现 Phoenix 的 trace 聚类所揭示的东西。

## 实际使用

- **Phoenix** 用于生产漂移聚类（第 24 课）。
- **Langfuse** 用于会话回放 + 标注。
- **自定义** 用于你的可观测性平台检测不到的领域专用特征。

## 拿去用

`outputs/skill-failure-detector.md` 生成为你的领域量身定做的失败模式检测器，接到一个 trace 存储。

## 练习

1. 加一个「成功幻觉」检测器：agent 返回成功但目标状态没变。
2. 给一个你构建过的产品的 100 条真实 trace 打标。哪个模式占主导？修它的成本是多少？
3. 实现一个「级联半径」指标：给定第 N 步的一次失败，它影响了多少下游步骤？
4. 读 MASFT 的 14 种失败模式。挑三个适用于你产品的。写检测器。
5. 把一个检测器接进一个 CI 作业：如果 >=5% 的 trace 命中某个模式就让构建失败。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MASFT | 「多 agent 失败分类法」 | Berkeley 的 14 模式分类 |
| Cascading error | 「涟漪失败」 | 一个早期错误在 N 步里传播 |
| Context loss | 「忘了约束」 | 长跨度轮次丢掉早轮次事实 |
| Tool misuse | 「错工具 / 错参数」 | 有效调用，错误的调用方式 |
| Success hallucination | 「伪造完成」 | agent 在 400 上声称成功；状态没变 |
| Scope creep | 「越界」 | agent 做了比所求更多的事 |
| Instruction-following deviation | 「不服从」 | 无视 system prompt 或用户约束 |
| Sub-intention errors | 「计划 bug」 | 计划执行中的遗漏、冗余、乱序 |

## 延伸阅读

- [Cemri et al., MASFT (arXiv:2503.13657)](https://arxiv.org/abs/2503.13657) —— 14 种失败模式、3 类
- [Microsoft, Taxonomy of Failure Mode in Agentic AI Systems](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-brand/documents/Taxonomy-of-Failure-Mode-in-Agentic-AI-Systems-Whitepaper.pdf) —— 风险登记册
- [Arize Phoenix](https://docs.arize.com/phoenix) —— 实战中的漂移聚类
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 何时更简单的模式能彻底避开这些模式
