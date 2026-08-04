# Tree of Thoughts 与 LATS：刻意搜索

> 单条思维链轨迹没有回溯的余地。ToT（Yao 等人，2023）把推理变成一棵树，每个节点上做自评。LATS（Zhou 等人，2024）在蒙特卡洛树搜索之下统一了 ToT、ReAct 和 Reflexion。Game of 24 从 4%（CoT）涨到 74%（ToT）；LATS 在 HumanEval 上拿到 92.7% 的 pass@1。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 03（Reflexion）
**预计时间：** ~75 分钟

## 学习目标

- 把推理框定为搜索：节点是「思考」，边是「展开」，价值是「有多大希望」。
- 用标准库实现一个 ToT 式的 BFS 树搜索，带自评打分。
- 扩展成一个玩具版 LATS MCTS 循环，含 select / expand / simulate / backpropagate。
- 判断搜索什么时候值得那个 token 倍数（Game of 24、代码生成），什么时候单条轨迹就够（简单问答）。

## 问题背景

思维链是一次线性行走。如果第一步错了，后面每一步都在一个坏前提上干活。在 Game of 24（用四个数字加 + − × ÷ 凑出 24）上，GPT-4 CoT 只有 4% 准确率。模型早早挑错了子表达式，再也回不来。

推理需要的是：提出多个候选、评估它们、挑有希望的、遇到死路就回溯的能力。这就是搜索。Tree of Thoughts 和 LATS 是两个标准表述。

## 核心概念

### Tree of Thoughts（Yao 等人，NeurIPS 2023）

每个节点是一个连贯的中间步骤（「一个思考」）。每个节点可以展开成 K 个子思考。LLM 用一个打分 prompt 给每个节点自评。搜索遍历这棵树 —— BFS、DFS 或 beam。

```
                     (root: "find 24 from 4 6 4 1")
                    /               |            \
           ("6 - 4 = 2")    ("4 + 1 = 5")    ("4 * 6 = 24")  <- Score: HIGH
              /   \              |                  |
          ...    ...          ...                finish
```

自评是承重部件。论文给出三种变体：`sure / likely / impossible` 分类、`1..10` 数值打分、以及候选间投票。在 Game of 24 上这三种都大幅打败 CoT（GPT-4 从 4% -> 74%）。

### LATS（Zhou 等人，ICML 2024）

LATS 在 MCTS 之下统一了 ToT、ReAct 和 Reflexion。LLM 扮演三个角色：

- **Policy**：提出候选的下一步动作（ReAct 式）。
- **Value function**：给一条部分轨迹打分（ToT 式自评）。
- **Self-reflector**：失败时，写一段自然语言反思（Reflexion 式），用它给未来的 rollout 重新播种。

环境反馈（观察）混进价值函数，于是搜索是被真实工具结果引导的，而不只是模型的意见。论文发表时的结果：HumanEval pass@1 用 GPT-4 达 92.7%（SOTA），WebShop 用 GPT-3.5 平均 75.9（逼近基于梯度的微调）。

### MCTS，极简版

每次迭代四个阶段：

1. **Select** —— 用 UCT（树的置信上界）从根走到一个叶子。
2. **Expand** —— 通过 policy 生成 K 个子节点。
3. **Simulate** —— 用 policy 从一个子节点做 rollout，用价值函数（或环境奖励）给叶子打分。
4. **Backpropagate** —— 沿路径向上更新访问计数和价值估计。

UCT 公式：`Q(s, a) + c * sqrt(ln N(s) / N(s, a))`。第一项是利用；第二项是探索。按任务调 `c`。

### 成本的现实

搜索让 token 爆炸。ToT 在 Game of 24 上用的 token 是 CoT 的 100–1000 倍。LATS 类似。这不是免费的；把搜索留给：

- 单条轨迹明显不够的任务（Game of 24、复杂代码）。
- 墙钟时间没正确性重要的任务。
- 有一个廉价、可靠价值函数的任务（代码用单元测试、数学用显式目标）。

如果你的任务只有一个正确答案、评估器又有噪声，搜索往往把事情搞得更糟 —— 它会找到一个「评分很高」的错误答案。

### 2026 年的定位

大多数生产 agent 不跑 LATS。它们跑带工具锚定验证的 ReAct（CRITIC，第 05 课）。搜索出现在一些专门的细分领域：

- 把测试当价值函数跑的编码 agent（HumanEval 式）。
- 探索多条查询路径的深度研究 agent。
- LangGraph 子图里规划密集的工作流。

AlphaEvolve（第 11 课）是 2025 年的极端：在代码上做演化搜索，机器可校验的适应度，前沿级收益（56 年来首次 4x4 矩阵乘法改进）。

```figure
tree-of-thoughts
```

## 动手构建

`code/main.py` 实现：

- 一个在风格化「挑算术运算」任务上的迷你 ToT BFS。
- 在同一任务上的玩具 LATS MCTS 循环（Select / Expand / Simulate / Backpropagate），带 UCT 选择。
- 一个把符号分数加自评分数组合起来的价值函数。

运行它：

```
python3 code/main.py
```

轨迹展示 ToT 用 BFS 在每个节点展开三个候选，对比 LATS 通过 MCTS 收敛到最佳 rollout。两者都打印 token 数。

## 实际使用

LangGraph 把 ToT 式探索作为子图模式提供；LangChain 团队关于 LATS 的博客（2024 年 5 月）是参考教程。LlamaIndex 提供一个 `TreeOfThoughts` agent。对 2026 年大多数生产 agent 来说，这个模式藏在一个 `if task_complexity > threshold: use_search()` 的门后 —— 见第 05 课的 evaluator-optimizer 模式。

## 拿去用

`outputs/skill-search-policy.md` 在给定任务形态、预算和评估器保真度的情况下，在线性 ReAct、ToT、LATS 和演化搜索之间做选择。

## 练习

1. 用 UCT c=0.1 对比 c=2.0 跑玩具 LATS。轨迹里有什么变化？
2. 把价值函数换成更有噪声的打分器（加随机抖动）。MCTS 还能找到最佳叶子吗？它能容忍的最小信噪比是多少？
3. 实现 beam-search 版 ToT（每层保留 top-k），和 BFS 对比。在紧张的 token 预算下哪个更好？
4. 读 LATS 第 5.1 节。复现 HumanEval 的轨迹数：要多少次 rollout 才能达到报告的 pass@1？
5. 读 LATS 论文里关于「LATS 什么时候帮助更小」的讨论。写一段决策规则，把任务形态映射到搜索策略。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Tree of Thoughts | 「分支式 CoT」 | Yao 等人 —— 带自评的思考节点树 |
| LATS | 「给 LLM 用的 MCTS」 | Zhou 等人 —— 在 MCTS 之下统一 ToT + ReAct + Reflexion |
| UCT | 「置信上界」 | 平衡利用（Q）和探索（ln N / n）的选择公式 |
| Value function | 「这个状态有多好」 | prompt 出来的 LLM 分数或环境奖励；喂给 backprop |
| Policy | 「动作提议器」 | ReAct 式生成器；吐出候选的下一步思考/动作 |
| Rollout | 「模拟轨迹」 | 用 policy 从一个节点走到叶子，用价值函数打分 |
| Backpropagate | 「更新祖先」 | 把叶子的奖励沿路径上推，更新访问计数和 Q |
| Search cost | 「token 爆炸」 | Game of 24 上是 CoT 的 100-1000 倍；采用前先算预算 |

## 延伸阅读

- [Yao et al., Tree of Thoughts (arXiv:2305.10601)](https://arxiv.org/abs/2305.10601) —— 那篇标准论文
- [Zhou et al., LATS (arXiv:2310.04406)](https://arxiv.org/abs/2310.04406) —— 带 Reflexion 反馈的 MCTS
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 用于搜索的子图模式
- [AlphaEvolve (arXiv:2506.13131)](https://arxiv.org/abs/2506.13131) —— 带程序化评估器的演化搜索
