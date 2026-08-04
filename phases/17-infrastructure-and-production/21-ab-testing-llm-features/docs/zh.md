# A/B 测试 LLM 特性 —— GrowthBook、Statsig 与"凭感觉"问题

> 传统 A/B 测试不是为非确定性的 LLM 造的。关键区别：eval 回答"模型能不能干这活？"A/B 测试回答"用户在不在乎？"两者都需要；凭感觉上线的时代结束了。2026 年测什么：prompt 工程（措辞）、模型选择（GPT-4 vs GPT-3.5 vs OSS；准确率 vs 成本 vs 延迟）、生成参数（temperature、top-p）。真实案例：一个聊天机器人的奖励模型变体带来 +70% 对话长度和 +30% 留存；Nextdoor 的 AI 主题行实验在奖励函数精调后带来 +1% CTR；Khan Academy 的 Khanmigo 在延迟 vs 数学准确率这个轴上迭代。平台划分：**Statsig**（2025 年 9 月被 OpenAI 以 11 亿美元收购）—— 序贯测试、CUPED、一体化。**GrowthBook** —— 开源、仓库原生、贝叶斯 + 频率派 + 序贯引擎、CUPED、SRM 检查、Benjamini-Hochberg + Bonferroni 校正。你基于对仓库-SQL 的偏好，以及"被 OpenAI 收购"对你的组织重不重要来挑。

**类型：** Learn
**语言：** Python（标准库，一个玩具级序贯测试模拟器）
**前置要求：** 阶段 17 · 13（可观测性）、阶段 17 · 20（渐进式部署）
**预计时间：** ~60 分钟

## 学习目标

- 区分 eval（"模型能不能干这活"）和 A/B 测试（"用户在不在乎"）。
- 列举三个可测的轴（prompt、模型、参数），并为每个挑指标。
- 解释 CUPED、序贯测试和 Benjamini-Hochberg 多重比较校正。
- 基于仓库-SQL 态度和企业收购立场，挑选 Statsig 还是 GrowthBook。

## 问题背景

你手调了一个系统 prompt。感觉更好。你上线了。转化率在噪声范围内变动。你怪指标。或者你上了一个新模型，转化率没动 —— 是模型退化了，还是改动太小检测不到？你不知道，因为你没做 A/B 就上了。

eval 回答的是模型在一个带标注集上能不能完成任务。它们不回答用户是否更喜欢这个输出。只有受控的在线实验才回答那个，而且只在实验有足够功效、控制了非确定性、对多重比较做了校正的前提下。

## 核心概念

### Eval vs A/B 测试

**Eval** —— 离线、带标注集、评判（rubric 或 LLM 当评判或人评）。回答："输出在这个固定分布上正确 / 有帮助 / 安全吗？"

**A/B 测试** —— 在线、实时用户、随机化。回答："新变体有没有撬动那个重要的用户级指标？"

两者都需要。eval 在暴露前抓回退；A/B 在之后确认产品影响。

### 测什么

1. **prompt 工程** —— 措辞、系统 prompt 结构、示例。指标：任务成功率、用户留存、单请求成本。
2. **模型选择** —— GPT-4 vs GPT-3.5-Turbo vs Llama-OSS。指标：准确率（任务）+ 单请求成本 + 延迟 P99。多目标。
3. **生成参数** —— temperature、top-p、max_tokens。指标：任务特定（输出多样性 vs 确定性）。

### CUPED —— 方差削减

Controlled-experiments Using Pre-Experiment Data（用实验前数据的受控实验）。在比较实验后数据前，把实验前的方差回归掉。典型方差削减：30-70%。有效样本量白白上升。

实现：Statsig 和 GrowthBook 都实现了。

### 序贯测试

经典 A/B 假设固定样本量。序贯测试（"偷看再决定"）在反复查看下控制假阳率。始终有效的序贯流程（mSPRT、Howard 的置信序列）让你在明显胜出时提早停止。

### 多重比较校正

在 95% 置信度下跑 20 个 A/B 测试，靠运气就会产生一个假阳。Bonferroni 校正收紧每个测试的 α；Benjamini-Hochberg 控制假发现率。GrowthBook 两者都实现了。

### SRM —— 样本比例失配

分配哈希把用户随机化到各变体。如果 50/50 切分给出 47/53，说明有东西坏了 —— SRM 检查会标记它。两个平台都实现了。

### Statsig vs GrowthBook

**Statsig**：
- 被 OpenAI 以 11 亿美元收购（2025 年 9 月）。托管、SaaS。
- 序贯测试、CUPED、留出人群。
- 一体化：feature flag + 实验 + 可观测性。
- 最佳适用：团队已经想要一个捆绑产品，不在乎 OpenAI 所有权。

**GrowthBook**：
- 开源（MIT）；仓库原生（直接从 Snowflake/BigQuery/Redshift 读）。
- 多引擎：贝叶斯、频率派、序贯。
- CUPED、SRM、Bonferroni、BH 校正。
- 自托管或托管云。
- 最佳适用：仓库-SQL 团队，数据团队掌控指标层，想要 OSS。

### 非确定性让功效计算变复杂

同一 prompt 产生不同输出。传统功效计算假设 IID 观测。有了 LLM 非确定性，有效样本量低于名义值。把所需样本量乘以约 1.3-1.5x 作为安全余量。

### 真实案例结果

- 聊天机器人奖励模型变体：+70% 对话长度，+30% 留存。
- Nextdoor 主题行：奖励函数精调后 +1% CTR。
- Khan Academy Khanmigo：延迟 vs 数学准确率的迭代权衡。

### 反模式：凭感觉上线

每个资深工程师都能说出一个因为"感觉更好"就上线、没做 A/B 的特性。它们中大多数让团队几个月都没注意到的产品指标退化了。A/B 就是那个逼你做决定的因素。

### 你该记住的数字

- Statsig 被 OpenAI 收购：11 亿美元，2025 年 9 月。
- GrowthBook：开源 MIT；贝叶斯 + 频率派 + 序贯。
- CUPED 方差削减：30-70%。
- LLM 非确定性 → +30-50% 样本量缓冲。

```figure
mx-sequential-test
```

## 实际使用

`code/main.py` 用固定边界和序贯边界模拟一个序贯 A/B 测试。展示序贯如何让你提早停止。

## 拿去用

这一课产出 `outputs/skill-ab-plan.md`。给定特性改动、工作负载、基线，挑平台、闸门、样本量。

## 练习

1. 跑 `code/main.py`。对一个基线 3% 转化率、预期 5% 提升的情况，到 80% 功效需要多少样本量？
2. 为一个受医疗监管的本地部署客户挑 Statsig 还是 GrowthBook。
3. 设计一个在"每解决工单成本"上测 GPT-4 vs GPT-3.5 的 A/B。主指标、护栏指标、次要指标各是什么？
4. 你的 canary 通过了，但 A/B 显示 -1.2% 转化。你上吗？写出升级准则。
5. 把 CUPED 应用到一个方差为实验后 60% 的实验前期。算有效样本量的提升。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Eval | "离线测试" | 对模型能力的带标注集评估 |
| A/B 测试 | "实验" | 对用户的实时随机化对比 |
| CUPED | "方差削减" | 用实验前期回归来削减方差 |
| 序贯测试 | "可偷看的测试" | 允许提早停止的始终有效流程 |
| 多重比较 | "族系误差" | 跑很多测试会膨胀假阳 |
| Bonferroni | "收紧校正" | 把 α 除以测试数 |
| Benjamini-Hochberg | "BH FDR" | 假发现率控制，没那么保守 |
| SRM | "坏切分" | 样本比例失配；分配 bug |
| Statsig | "OpenAI 拥有的" | 商用一体化，2025 年被收购 |
| GrowthBook | "那个 OSS 的" | MIT 仓库原生平台 |
| mSPRT | "序贯概率比检验" | 经典序贯流程 |

## 延伸阅读

- [GrowthBook — How to A/B Test AI](https://blog.growthbook.io/how-to-a-b-test-ai-a-practical-guide/)
- [Statsig — Beyond Prompts: Data-Driven LLM Optimization](https://www.statsig.com/blog/llm-optimization-online-experimentation)
- [Statsig vs GrowthBook comparison](https://www.statsig.com/perspectives/ab-testing-feature-flags-comparison-tools)
- [Deng et al. — CUPED](https://www.exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf)
- [Howard — Confidence Sequences](https://arxiv.org/abs/1810.08240)
