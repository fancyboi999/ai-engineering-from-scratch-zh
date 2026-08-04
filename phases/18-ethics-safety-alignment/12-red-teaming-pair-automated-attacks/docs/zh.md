# 红队：PAIR 与自动化攻击

> Chao、Robey、Dobriban、Hassani、Pappas、Wong（NeurIPS 2023, arXiv:2310.08419）。PAIR——Prompt Automatic Iterative Refinement——是经典的自动化黑盒越狱。一个带红队系统提示的攻击者 LLM，迭代地为目标 LLM 提议越狱方案，把尝试和响应累积进自己的对话历史，当作上下文反馈。PAIR 通常在 20 次查询内成功，比 GCG（Zou et al. 的 token 级梯度搜索）高效几个数量级，而且不需要白盒访问。如今 PAIR 已是 JailbreakBench（arXiv:2404.01318）和 HarmBench 里的标准基线，与 GCG、AutoDAN、TAP、Persuasive Adversarial Prompt 并列。

**类型：** Build
**语言：** Python（标准库，针对玩具目标的模拟 PAIR 循环）
**前置要求：** 阶段 18 · 01（遵循指令）、阶段 14（智能体工程）
**预计时间：** ~75 分钟

## 学习目标

- 描述 PAIR 算法：攻击者系统提示、迭代精化、上下文反馈。
- 解释为什么当目标是黑盒时，PAIR 严格比 GCG 高效。
- 说出另外四种自动化攻击基线（GCG、AutoDAN、TAP、PAP），并说出各自的一个区别特征。
- 描述 JailbreakBench 和 HarmBench 的评估协议，以及「攻击成功率」在各自定义下是什么意思。

## 问题背景

红队曾经是一项手工活动。少数专家测试者构造对抗提示，并追踪哪些管用。这不可规模化：攻击成功率需要统计样本，而每发布一个模型，目标都在移动。PAIR 把红队操作化成一个带黑盒目标的优化问题。

## 核心概念

### PAIR 算法

输入：
- 目标 LLM T（我们要攻击的模型）。
- 裁判 LLM J（评判一个响应是否构成越狱）。
- 攻击者 LLM A（红队优化器）。
- 目标串 G：「以 [有害指令] 来回复。」
- 预算 K（通常 20 次查询）。

循环，对 k 取 1..K：
1. 用目标 G 和到目前为止的（提示, 响应）对历史来提示 A。
2. A 产出一个新提示 p_k。
3. 把 p_k 提交给 T；收到响应 r_k。
4. J 就目标给 (p_k, r_k) 打分。
5. 若分数 >= 阈值，停止——找到越狱。
6. 否则，把 (p_k, r_k) 追加进 A 的历史；继续。

实证结果（NeurIPS 2023）：对 GPT-3.5-turbo、Llama-2-7B-chat 的攻击成功率 >50%；到成功的平均查询数在 10-20 区间。

### 为什么 PAIR 高效

GCG（Zou et al. 2023）按梯度在对抗 token 后缀上搜索；它需要白盒模型访问，并产出不可读的后缀。PAIR 是黑盒的，产出能跨模型迁移的自然语言攻击。PAIR 的上下文反馈让攻击者能从每次被拒中学习；GCG 没有等价物（每次新的 token 更新都得重新发现先前的进展）。

### 相关的自动化攻击

- **GCG（Zou et al. 2023, arXiv:2307.15043）。** 对抗后缀的 token 级梯度搜索。白盒、可迁移、产出不可读的字符串。
- **AutoDAN（Liu et al. 2023）。** 在提示上做进化搜索，由一个分层目标引导。
- **TAP（Mehrotra et al. 2024）。** 带剪枝的攻击树——分叉出多条 PAIR 风格的 rollout。
- **PAP（Zeng et al. 2024）。** Persuasive Adversarial Prompts——把人类说服技巧编码成提示模板。

### JailbreakBench 与 HarmBench

两者（2024）都把评估标准化：

- JailbreakBench（arXiv:2404.01318）。100 种有害行为，覆盖 10 个 OpenAI 政策类别。以攻击成功率（ASR）为主指标。需要一个裁判（GPT-4-turbo、Llama Guard，或 StrongREJECT）。
- HarmBench（Mazeika et al. 2024）。510 种行为，覆盖 7 个类别，带语义和功能两种危害测试。把 18 种攻击对照 33 个模型做比较。

ASR 通常在固定查询预算下报告。比较攻击需要匹配预算；200 次查询下的 90% ASR 跟 20 次查询下的 85% ASR 不可比。

### 为什么这对 2026 年的部署重要

如今每家前沿实验室在发布前都会拿 PAIR 和 TAP 攻打生产模型。ASR 轨迹出现在模型卡（第 26 课）和安全论证附录（第 18 课）里。这种攻击不稀奇——它是标准基础设施。

### 这在阶段 18 里的位置

第 12 课是自动化攻击的基础。第 13 课（多样本越狱）是一种互补的长度利用。第 14 课（ASCII 艺术 / 视觉）是一种编码攻击。第 15 课（间接提示注入）是 2026 年的生产攻击面。第 16 课讲防御工具对手（Llama Guard、Garak、PyRIT）。

```figure
al-pair-loop
```

## 实际使用

`code/main.py` 造了一个玩具 PAIR 循环。目标是一个模拟分类器，它拒绝「显眼的」有害提示（关键词过滤）。攻击者是一个基于规则的精化器，会尝试改写、角色扮演框定、编码。裁判给响应打分。你会看着攻击者在约 5-15 次迭代内攻破关键词过滤，而对语义过滤失败。

## 拿去用

本课产出 `outputs/skill-attack-audit.md`。给定一份红队评估报告，它审计：跑了哪些攻击（PAIR、GCG、TAP、AutoDAN、PAP）、各自在什么预算下、用哪个裁判、在哪个有害行为集上（JailbreakBench、HarmBench、内部集）。

## 练习

1. 运行 `code/main.py`。测量三种内置攻击者策略到成功的平均查询数。解释每种利用了哪一条目标防御假设。

2. 实现第四种攻击者策略（比如翻译成另一种语言、base64 编码）。报告它对关键词过滤目标和语义过滤目标的新「到成功平均查询数」。

3. 读 Chao et al. 2023 图 5（PAIR vs GCG 对比）。描述两个尽管 PAIR 有效率优势、仍更偏好 GCG 的场景。

4. JailbreakBench 报告针对固定目标集的 ASR。设计一个额外指标，测量攻击多样性（成功提示的方差）。解释为什么多样性对防御评估很重要。

5. TAP（Mehrotra 2024）用分叉 + 剪枝扩展 PAIR。勾画一个对 `code/main.py` 的 TAP 风格扩展，并描述计算成本与成功率之间的权衡。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| PAIR | 「自动化越狱」 | Prompt Automatic Iterative Refinement；攻击者 LLM + 裁判 LLM 循环 |
| GCG | 「梯度越狱」 | 对抗后缀的白盒 token 级梯度搜索 |
| 攻击成功率（ASR） | 「k 次查询的越狱百分比」 | 主指标；必须连同查询预算和裁判身份一起报告 |
| 裁判 LLM | 「那个打分器」 | 评判响应是否满足有害目标的 LLM |
| JailbreakBench | 「那个评估」 | 带标记类别的标准化有害行为集 |
| HarmBench | 「那个更广的基准」 | 510 种行为，功能 + 语义危害测试 |
| TAP | 「攻击树」 | 带分叉 + 剪枝的 PAIR；以更高算力换更好 ASR |

## 延伸阅读

- [Chao et al. — Jailbreaking Black Box LLMs in Twenty Queries (arXiv:2310.08419)](https://arxiv.org/abs/2310.08419) —— PAIR 论文，NeurIPS 2023
- [Zou et al. — Universal and Transferable Adversarial Attacks on Aligned LLMs (arXiv:2307.15043)](https://arxiv.org/abs/2307.15043) —— GCG 论文
- [Chao et al. — JailbreakBench (arXiv:2404.01318)](https://arxiv.org/abs/2404.01318) —— 标准化评估
- [Mazeika et al. — HarmBench (ICML 2024)](https://arxiv.org/abs/2402.04249) —— 更广的评估
