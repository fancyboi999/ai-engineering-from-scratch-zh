# 自主编码 agent 全景（2026）

> SWE-bench Verified 在不到三年里从 4% 涨到了 80.9%。同一个 Claude Sonnet 4.5，在 SWE-agent v1 上得 43.2%，在 Cline autonomous 上得 59.8%——模型外围的脚手架如今跟模型本身一样要紧。OpenHands（前身是 OpenDevin）是活跃度最高的 MIT 许可平台，它的 CodeAct 循环直接在沙箱里执行 Python 动作，而不是 JSON 工具调用。这些头条数字掩盖了一个方法学问题：SWE-bench Verified 500 个任务里有 161 个只需改 1-2 行，而 SWE-bench Pro（10+ 行的任务）上同样这批前沿模型只落在 23-59%。

**类型：** Learn
**语言：** Python（标准库，CodeAct vs JSON 工具调用对比）
**前置要求：** 阶段 14 · 07（工具使用），阶段 15 · 01（长程 agent）
**预计时间：** ~45 分钟

## 问题背景

"哪个编码 agent 最好"是个错误的问题。对的问题是：在一个跟我工作匹配的任务分布上，用我会在生产里跑的那套脚手架，我能拿到多少端到端可靠度？

2022 到 2026 年间，这个领域明白了脚手架——检索层、规划器、沙箱、编辑-验证循环、反馈格式——是承重的。Claude Sonnet 4.5 在 SWE-agent v1 上 SWE-bench Verified 得 43.2%；同一个模型放进 Cline 的 autonomous 脚手架里得 59.8%。同样的权重，差了 16.6 个绝对百分点。基础模型是个组件；循环才是产品。

伴随的问题是基准饱和掩盖了回退。SWE-bench Verified 接近饱和，而简单任务的尾巴（500 个任务里有 161 个只需 ≤2 行）把顶尖分数往上拉。真实世界的质量更应该在像 SWE-bench Pro（10+ 行改动）这样的分布上衡量，那里同一批领先者仍只落在 23-59%。

## 核心概念

### 一段话讲清 SWE-bench

SWE-bench（Jimenez 等人）拿带真实补丁的真实 GitHub issue，要求 agent 产出一个能让测试套件通过的补丁。SWE-bench Verified（OpenAI，2024）是一个人工策划的 500 任务子集，去掉了歧义的和坏掉的任务。SWE-bench Pro 是更难的后继者——需要 10+ 行改动的任务，当前的前沿 agent 在那里落在 23-59%。

### 2022 → 2026 那条曲线实际展示了什么

- **2022**：研究模型在原始 SWE-bench 上约 4%。
- **2024**：GPT-4 + Devin 风格脚手架约 14%；SWE-agent 约 12%。
- **2025**：Claude 3.5/3.7 Sonnet 放进 Aider 和 SWE-agent 里，推进到 40-55% 区间。
- **2026**：Claude Sonnet 4.5 和前沿竞品在 SWE-bench Verified 上达到 70-80%+。Epoch AI 的排行榜实时跟踪这个。

这条斜率来自三个复利的来源：更好的基础模型、更好的脚手架（CodeAct、反思、验证器循环），以及更好的基准（Verified 去掉了噪声）。

### CodeAct vs JSON 工具调用

OpenHands（All-Hands-AI，arXiv:2407.16741，前身 OpenDevin）押了一个具体的架构赌注：不是让模型吐出 JSON 工具调用、由宿主解码并执行，而是让模型吐出 Python 代码，由一个 Jupyter 风格的内核在沙箱里跑它。agent 能在一个动作里遍历文件、串联工具，并捕获自己的异常。

权衡：

- **JSON 工具调用**：每个动作是一轮；易于审计；可组合性有限；默认安全，因为每次调用都过一个显式的验证器。
- **CodeAct**：一个动作可以是一整个程序；可组合；需要一个加固的沙箱（OpenHands 用 Docker 隔离）；失败模式包含沙箱运行时允许的任何事。

两种架构都在生产里。CodeAct 在开放平台里占主导（OpenHands、smolagents）。JSON 工具调用在托管服务里仍占主导（Anthropic Managed Agents、OpenAI Assistants），那里执行器由服务方控制。

### 2026 全景里的各种脚手架

| 脚手架 | 许可证 | 执行模型 | 值得注意的属性 |
|---|---|---|---|
| OpenHands（OpenDevin） | MIT | Docker 里的 CodeAct | 最活跃的开放平台；事件流可重放 |
| SWE-agent | MIT | Agent-Computer Interface（ACI） | 第一个端到端 SWE-bench 脚手架 |
| Aider | Apache-2 | 在本地仓库里靠 diff 编辑 | 极简脚手架，回退稳定性强 |
| Cline | Apache-2 | 带工具策略的 VS Code agent | Sonnet 4.5 上得分最高的开放脚手架 |
| Devin（Cognition） | 专有 | 托管 VM + 规划器 | 首个"AI 软件工程师"产品品类 |
| Claude Code | 专有 | 权限模式 + routines | 第 10 课详细讲它的 agent 循环 |

### 为什么脚手架占主导

一次编码运行是一条长程轨迹（第 1 课）。可靠度在步骤之间复利。脚手架买到分数的三个地方：

1. **检索**：找到该读的正确文件是那个沉默的瓶颈。SWE-agent 的 ACI、OpenHands 的文件索引、Aider 的 repo-map 都在攻这个。
2. **验证器循环**：跑测试、读栈回溯、再重试，在 SWE-bench 上是 10+ 个百分点的增量。
3. **失败遏制**：一个出错就回滚的沙箱阻止损害累积。同一个模型带与不带验证器循环，看起来像两个不同的产品。

### 基准饱和与真实分布

OpenHands 的作者和 Epoch AI 都指出，SWE-bench Verified 有一条简单尾巴：500 个任务里有 161 个只需改 1-2 行。高分部分由这条尾巴驱动。SWE-bench Pro 限制为 10+ 行改动，即便对前沿系统也返回 23-59% 区间的分数。你的生产分布几乎肯定更接近 Pro 而非 Verified。

选 agent 的含义是：在你自己的 bug 待办里跑一个类 Pro 的子集。要紧的分数，是在那些代表你实际交付内容的任务上的分数。

```figure
a5-scaffold-delta
```

## 实际使用

`code/main.py` 在一个固定的迷你任务分布上对比两个玩具 agent 脚手架：

1. 一个**JSON 工具调用**脚手架，每轮一个动作。
2. 一个**CodeAct**脚手架，每个动作能吐出一小段 Python。

两者都用一个桩"模型"（确定性规则），这样对比就把脚手架从模型质量里隔离出来。输出显示 CodeAct 脚手架以更少的轮数解出更多任务，代价是每个动作的爆炸半径更大。

## 拿去用

`outputs/skill-scaffold-audit.md` 帮你在采用一个编码 agent 脚手架之前审计它：检索质量、是否有验证器、沙箱隔离，以及基准与分布的契合度。

## 练习

1. 运行 `code/main.py`。每个脚手架在同一组任务上花多少轮？各自每个动作的爆炸半径是多少？

2. 读 OpenHands 论文（arXiv:2407.16741）。论文论证 CodeAct 在复杂任务上胜过 JSON 工具调用。指出论文承认的一种失败模式，并用一句话说明这种模式在生产里何时会占主导。

3. 从你的 bug 待办里挑一个需要跨两个文件改 10+ 行的任务。估算一个前沿模型在 (a) JSON 工具调用 和 (b) CodeAct 下的端到端成功概率。论证这个差距。

4. SWE-bench Verified 有 161 个单文件、1-2 行的任务。构造一个把它们排除掉的评分。排行榜怎么重排？

5. 读 "Introducing SWE-bench Verified"（OpenAI）。解释用来去掉歧义任务的具体方法学，并说出这套策划会漏掉的一个类别。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| SWE-bench | "编码基准" | 带真实补丁和测试套件的真实 GitHub issue |
| SWE-bench Verified | "清洗过的子集" | 500 个人工策划的任务，仍含简单尾巴 |
| SWE-bench Pro | "更难的子集" | 10+ 行改动；前沿落在 23-59% |
| CodeAct | "代码即动作" | agent 吐出 Python；Jupyter 风格内核在沙箱里执行 |
| JSON tool call（JSON 工具调用） | "函数调用" | 每个动作是一份结构化 JSON 载荷，执行前被验证 |
| Scaffold（脚手架） | "agent 框架" | 围绕基础模型的检索 + 规划器 + 执行器 + 验证器循环 |
| ACI（Agent-Computer Interface） | "SWE-agent 的格式" | 为 LLM 工效设计的命令集，而非为人类 shell |
| Verifier loop（验证器循环） | "测试再重试" | 跑测试、读输出、改补丁；最大的非模型可靠度收益 |

## 延伸阅读

- [Jimenez et al. — SWE-bench](https://www.swebench.com/) —— 最初的基准与方法学。
- [OpenAI — Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) —— 策划子集是怎么造的。
- [Wang et al. — OpenHands: An Open Platform for AI Software Developers](https://arxiv.org/abs/2407.16741) —— CodeAct 架构与事件流设计。
- [Epoch AI — SWE-bench leaderboard](https://epoch.ai/benchmarks) —— 实时跟踪的分数。
- [Anthropic — Measuring agent autonomy](https://www.anthropic.com/research/measuring-agent-autonomy) —— 长程编码 agent 可靠度的框架。
