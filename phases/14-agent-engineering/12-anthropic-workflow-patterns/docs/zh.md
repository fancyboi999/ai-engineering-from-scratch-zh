# Anthropic 的工作流模式：简单胜过复杂

> Schluntz 和 Zhang（Anthropic，2024 年 12 月）把工作流（预定义路径）和 agent（动态工具使用）区分开。五种工作流模式覆盖大多数情形。先从直接 API 调用开始。只在步骤无法预测时才加 agent。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）
**预计时间：** ~60 分钟

## 学习目标

- 说出 Anthropic 的五种工作流模式：prompt chaining、routing、parallelization、orchestrator-workers、evaluator-optimizer。
- 解释 agent 与工作流之分，以及各自的工程成本。
- 认清何时该选工作流而不是 agent（反之亦然）。
- 用标准库针对一个脚本化 LLM 实现全部五种模式。

## 问题背景

团队为那些只需要一次函数调用的问题去搬多 agent 框架。代价是真实的：框架加了一层层东西，遮蔽 prompt、隐藏控制流、招来过早的复杂度。Schluntz 和 Zhang 2024 年 12 月那篇帖子是业界被引用最多的反弹：从简单开始，只在复杂度对得起它的成本时才加。

## 核心概念

### 工作流 vs agent

- **工作流。** LLM 和工具通过预定义的代码路径编排。工程师掌管这张图。
- **agent。** LLM 动态指挥自己的工具、走自己的步骤。模型掌管这张图。

两者都有各自的位置。工作流更便宜、更快、更好调试。agent 解锁了开放式问题，但让失败模式更难推理。

### 增强型 LLM

所有五种模式的基础：一个接好了三种能力的 LLM —— 搜索（检索）、工具（动作）、记忆（持久化）。任何 API 调用都能用这些。

### 五种模式

1. **Prompt chaining（提示串联）。** 调用 1 的输出是调用 2 的输入。当一个任务有干净的线性分解时用。步骤之间可选地加程序化关卡。

2. **Routing（路由）。** 一个分类器 LLM 挑要调用哪个下游 LLM 或工具。当类别上不同的输入需要不同处理时用（一级客服 vs 退款 vs bug vs 销售）。

3. **Parallelization（并行化）。** 并发跑 N 个 LLM 调用，聚合结果。两种形态：分块（不同片段）和投票（同一 prompt，N 次运行，多数/综合）。

4. **Orchestrator-workers（编排器-worker）。** 一个编排器 LLM 动态决定跑哪些 worker（也是 LLM）并综合它们的输出。类似 agent 循环，但编排器不会无限循环下去。

5. **Evaluator-optimizer（评估器-优化器）。** 一个 LLM 提出答案，另一个 LLM 评估它。迭代直到评估器通过。这是 Self-Refine（第 05 课）的一般化。

### 工作流在哪里胜过 agent

- **可预测任务。** 如果你能把步骤列举出来，你就该列。
- **成本受限任务。** 工作流有有界的步数；agent 会失控盘旋。
- **合规受限任务。** 审计员想读这张图，而不是从轨迹里推断出来。

### agent 在哪里胜过工作流

- **开放式研究。** 当下一步取决于上一步返回了什么时。
- **变长任务。** 几分钟到几小时的工作，步数未知。
- **新颖领域。** 当你还不知道正确的工作流时 —— 先探索，后固化。

### 上下文工程的伴生学科

「Effective context engineering for AI agents」（Anthropic 2025）形式化了相邻的这门学科：200k 窗口是个预算，不是个容器。包括什么、何时压实、何时让上下文增长。在阶段 14 关于上下文压缩的课里有详细讨论（在本课程重新编号前，那是更早的阶段 14 第 06 课）。

```figure
workflow-chain
```

## 动手构建

`code/main.py` 针对一个 `ScriptedLLM` 实现全部五种工作流模式：

- `prompt_chain(input, steps)` —— 顺序。
- `route(input, classifier, handlers)` —— 分类 + 分派。
- `parallel_vote(prompt, n, aggregator)` —— N 次运行，聚合。
- `orchestrator_workers(task, workers)` —— 编排器挑 worker。
- `evaluator_optimizer(task, proposer, evaluator, max_iter)` —— 循环直到通过。

运行它：

```
python3 code/main.py
```

每个模式打印自己的轨迹。每个模式的代码总量约 10-15 行；一个框架的成本是以千行计的。

## 实际使用

- 大多数任务用直接 API 调用。
- 只在模式确实需要持久状态（LangGraph）、actor 模型并发（AutoGen v0.4）或角色模板（CrewAI）时才上框架。
- 当你想要 Claude Code 的 harness 形态又不想重造它时，上 Claude Agent SDK。

## 拿去用

`outputs/skill-workflow-picker.md` 为给定任务描述挑对模式，包含决策理由，以及当工作流不够用时改造成 agent 的路径。

## 练习

1. 实现带置信度阈值的路由。低于阈值 -> 升级到人工。对一级客服用例来说阈值落在哪里？
2. 给 `parallel_vote` 加超时。当一个调用挂住时会怎样？缺票时你怎么聚合？
3. 把 `evaluator_optimizer` 变成一个 bandit：跨迭代保留 top-2 输出，这样一个迟来的好结果不会被一个迟来的坏结果覆盖。
4. 把 prompt chaining 和 routing 组合起来：一个路由器从三条链里挑一条。对比 token 成本与单个大 prompt 方案。
5. 挑一个你的生产功能。画出工作流图。数步骤。在这里 agent 真的会更好吗？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Workflow | 「预定义流程」 | 工程师掌管的 LLM 和工具调用图 |
| Agent | 「自主 AI」 | 模型掌管的图；动态工具指挥 |
| Augmented LLM | 「带工具的 LLM」 | LLM + 搜索 + 工具 + 记忆；原子单元 |
| Prompt chaining | 「顺序调用」 | 调用 N 的输出是调用 N+1 的输入 |
| Routing | 「分类器分派」 | 挑哪条链/哪个模型处理这个输入 |
| Parallelization | 「扇出」 | N 个并发调用；按分块或投票聚合 |
| Orchestrator-workers | 「调度器 agent」 | 编排器 LLM 动态挑专家 LLM |
| Evaluator-optimizer | 「提议器 + 裁判」 | 迭代到评估器通过；Self-Refine 的一般化 |

## 延伸阅读

- [Anthropic, Building Effective Agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents) —— 五种工作流模式
- [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) —— 伴生学科
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 有状态图何时对得起它的成本
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) —— 产品化的 orchestrator-workers 模式
