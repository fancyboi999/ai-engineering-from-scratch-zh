# 基准：SWE-bench、GAIA、AgentBench

> 2026 年有三个基准锚定 agent 评估。SWE-bench 测代码打补丁。GAIA 测通才型工具使用。AgentBench 测多环境推理。要懂它们的构成、它们的污染情况，以及它们没测什么。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 06（工具使用）
**预计时间：** ~60 分钟

## 学习目标

- 说出 SWE-bench 的测试 harness（FAIL_TO_PASS），并解释它为什么以单元测试为关卡。
- 解释 SWE-bench Verified（OpenAI，500 个任务）为什么存在、它移除了什么。
- 描述 GAIA 的设计：对人简单、对 AI 难；三个难度等级。
- 说出 AgentBench 的八个环境，以及它对开源 LLM 的主要拦路虎。
- 总结 SWE-bench+ 的污染发现及其含义。

## 问题背景

排行榜告诉你哪个模型在某个基准上赢了。它们不告诉你：

- 这个基准是否被污染（解法在训练数据里、测试泄露）。
- 这个基准是否衡量你在乎的东西（代码 vs 浏览 vs 通才）。
- 评估器是否稳健（AST 匹配、状态检查、人工审查）。

在你引用任何数字之前，先懂这三个锚定基准及其失败模式。

## 核心概念

### SWE-bench（Jimenez 等人，ICLR 2024 oral）

- 来自 12 个热门 Python 仓库的 2,294 个真实 GitHub issue。
- agent 拿到：修复前那个 commit 的代码库 + 自然语言 issue 描述。
- agent 产出：一个补丁。
- 评估器：打上补丁，跑仓库的测试套件。补丁必须把 FAIL_TO_PASS 测试翻过来（之前失败，现在通过），同时不破坏 PASS_TO_PASS 测试。

SWE-agent（Yang 等人，2024）发布时拿到 12.5%，靠的是强调 agent-计算机接口（文件编辑器命令、模型能理解的搜索语法）。

### SWE-bench Verified

OpenAI，2024 年 8 月。人工策划的 500 任务子集。移除了有歧义的 issue、不可靠的测试，以及修复不明确的任务。是「你的 agent 能交付真实补丁吗？」的主要基准。

### 污染

- 超过 94% 的 SWE-bench issue 早于大多数模型的截止日期。
- **SWE-bench+** 发现 32.67% 的成功补丁在 issue 文本里泄露了解法（模型在描述里看到了修复），另有 31.08% 因测试覆盖薄弱而可疑。
- Verified 更干净，但并非无污染。

实际含义：一个在 SWE-bench 上得 50% 的模型，在 SWE-bench+ 上可能得 35%。如果你声称 SWE-bench 性能，永远两个都报。

### GAIA（Mialon 等人，2023 年 11 月）

- 466 道题；300 道保留给 huggingface.co/gaia-benchmark 上的私有排行榜。
- 设计哲学：「对人概念上简单（92%）但对 AI 难（带插件的 GPT-4：15%）。」
- 测推理、多模态、网页、工具使用。
- 三个难度等级；Level 3 需要跨模态的长工具链。

GAIA 是你用来衡量「通才能力」的东西。别和代码专用基准混为一谈。

### AgentBench（Liu 等人，ICLR 2024）

- 8 个环境，横跨代码（Bash、DB、KG）、游戏（Alfworld、LTP）、网页（WebShop、Mind2Web）和开放式生成。
- 多轮，每个 split 约 4k-13k 轮。
- 主要发现：长期推理、决策和指令遵循是开源 LLM 追上商业模型的拦路虎。

### 这些没测什么

- 真实世界的运维成本（token、墙钟）。
- 对抗条件下的安全行为。
- 在你领域上的表现（用你自己的评估，第 30 课）。
- 尾部失败（基准取平均；生产运维在乎最差的 1%）。

### 基准测试在哪里会出错

- **单一数字执念。** SWE-bench 50% 告诉你的，比 P50/P75/P95 成本 + 步数分布要少。
- **被污染的声称。** 报 SWE-bench 却不提 Verified 或 SWE-bench+ 是误导。
- **把基准当开发目标。** 为基准优化会偏离生产有用性。

```figure
ae-swebench-gate
```

## 动手构建

`code/main.py` 实现一个玩具版类 SWE-bench harness：

- 合成的修 bug 任务（3 个）。
- 一个脚本化「agent」，提出补丁。
- 一个测试运行器，检查 FAIL_TO_PASS（bug 现在修好了）和 PASS_TO_PASS（什么都没坏）。
- 一个 GAIA 式的难度分类器，基于问题分解深度。

运行它：

```
python3 code/main.py
```

输出展示每任务、每难度的解决率，并让评估器规则变得具体。

## 实际使用

- **SWE-bench Verified** 用于代码 agent。永远报 Verified 分数。
- **GAIA** 用于通才 agent。用私有排行榜 split。
- **AgentBench** 用于多环境对比。
- **自定义评估**（第 30 课）用于你产品的真实形态。

## 拿去用

`outputs/skill-benchmark-harness.md` 为任意「代码库-任务」对构建一个 SWE-bench 式 harness，带 FAIL_TO_PASS / PASS_TO_PASS 关卡。

## 练习

1. 把玩具 harness 移植到一个真实仓库上跑（挑一个你自己的）。为已知 bug 写 3 个 FAIL_TO_PASS 测试。
2. 加一个步数指标。在你的 3 个任务上，每次解决用了多少 agent 步？
3. 读 SWE-bench+ 论文。实现一个解法泄露检查（把 issue 文本与 diff 做模式匹配）。
4. 从公开 split 下载一道 GAIA 题。追踪一个 GPT-4 级 agent 会做什么。它需要哪些工具？
5. 读 AgentBench 的逐环境拆解。哪个环境映射你的产品接触面？那里的「SOTA」长什么样？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| SWE-bench | 「代码 agent 基准」 | 2,294 个 GitHub issue；补丁必须翻转 FAIL_TO_PASS 测试 |
| SWE-bench Verified | 「干净版 SWE-bench」 | 500 个人工策划的任务，OpenAI |
| FAIL_TO_PASS | 「修复关卡」 | 之前失败、补丁后必须通过的测试 |
| PASS_TO_PASS | 「无回归关卡」 | 之前通过、必须仍然通过的测试 |
| GAIA | 「通才基准」 | 466 道对人易、对 AI 难的多工具题 |
| AgentBench | 「多环境基准」 | 8 个环境；长跨度多轮 |
| Contamination | 「训练集泄露」 | 基准任务出现在模型训练里 |
| SWE-bench+ | 「污染审计」 | 在成功的 SWE-bench 补丁里发现 32.67% 解法泄露 |

## 延伸阅读

- [Jimenez et al., SWE-bench (arXiv:2310.06770)](https://arxiv.org/abs/2310.06770) —— 原始基准
- [OpenAI, SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) —— 策划的子集
- [Mialon et al., GAIA (arXiv:2311.12983)](https://arxiv.org/abs/2311.12983) —— 通才基准
- [Liu et al., AgentBench (arXiv:2308.03688)](https://arxiv.org/abs/2308.03688) —— 多环境套件
