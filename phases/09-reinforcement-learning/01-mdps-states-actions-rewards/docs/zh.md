# MDP、状态、动作与奖励

> 一个马尔可夫决策过程就是五样东西：状态、动作、转移、奖励、折扣。RL 里的一切——Q-learning、PPO、DPO、GRPO——都是在这个结构上做优化。学懂一次，后面整套强化学习就能白看了。

**类型：** Learn
**语言：** Python
**前置要求：** Phase 1 · 06（概率与分布）、Phase 2 · 01（机器学习分类）
**预计时间：** ~45 分钟

## 问题背景

你在写一个国际象棋 bot。或者一个库存计划器。或者一个交易 agent。又或者是训练推理模型的那个 PPO 循环。四个完全不同的领域，却有一个出人意料的事实：四者都能塌缩成同一个数学对象。

监督学习给你 `(x, y)` 对，让你去拟合一个函数。强化学习不给你标签——只给你一串状态、你采取的动作，和一个标量奖励。这一步走赢了吗？这次补货决策省钱了吗？这笔交易赚了吗？LLM 刚吐出的这个 token 有没有让评审给出更高的奖励？

在你把这串数据形式化之前，没法从里面学到任何东西。"我看到了什么"、"我做了什么"、"接下来发生了什么"、"那有多好"——每一样都得变成你能推理的对象。这套形式化就是马尔可夫决策过程。本阶段的每一个 RL 算法，包括最后的 RLHF 和 GRPO 循环，都是在这个结构上做优化。

## 核心概念

![Markov decision process: states, actions, transitions, rewards, discount](../assets/mdp.svg)

**五个对象。**

- **状态** `S`。agent 做决策所需的一切。在 GridWorld 里是格子，在国际象棋里是棋盘，在 LLM 里是上下文窗口加上任何记忆。
- **动作** `A`。可做的选择。上/下/左/右移动。走一步棋。吐出一个 token。
- **转移** `P(s' | s, a)`。给定状态 `s` 和动作 `a`，下一个状态的分布。象棋里是确定的，库存里是随机的，LLM 解码里几乎是确定的。
- **奖励** `R(s, a, s')`。标量信号。赢 = +1，输 = -1。收入减成本。GRPO 里的对数似然比项。
- **折扣** `γ ∈ [0, 1)`。未来奖励相对当下值多少分量。`γ = 0.99` 买来约 100 步的视野；`γ = 0.9` 买来约 10 步。

**马尔可夫性** `P(s_{t+1} | s_t, a_t) = P(s_{t+1} | s_0, a_0, …, s_t, a_t)`。未来只取决于当前状态。如果不成立，那就是状态表示不完整——这不是方法的失败，是状态的失败。

**策略与回报。** 策略 `π(a | s)` 把状态映射到动作分布。回报 `G_t = r_t + γ r_{t+1} + γ² r_{t+2} + …` 是未来奖励的折扣和。价值 `V^π(s) = E[G_t | s_t = s]` 是在策略 `π` 下从 `s` 出发的期望回报。Q 值 `Q^π(s, a) = E[G_t | s_t = s, a_t = a]` 是从一个具体动作出发的期望回报。每个 RL 算法都在估计这两者之一，然后据此改进 `π`。

**贝尔曼方程。** 本阶段一切都要用到的不动点方程：

`V^π(s) = Σ_a π(a|s) Σ_{s', r} P(s', r | s, a) [r + γ V^π(s')]`
`Q^π(s, a) = Σ_{s', r} P(s', r | s, a) [r + γ Σ_{a'} π(a'|s') Q^π(s', a')]`

这些方程把期望回报拆成"这一步的奖励"加上"落脚处的折扣价值"。递归的。Phase 9 里的每个算法，要么把这个方程迭代到收敛（动态规划），要么从中采样（蒙特卡洛），要么往前自举一步（时序差分）。

```figure
discount-horizon
```

## 动手构建

### 第 1 步：一个极小的确定性 MDP

一个 4×4 的 GridWorld。agent 从左上角出发，终点在右下角，每走一步奖励 -1，动作集 `{up, down, left, right}`。见 `code/main.py`。

```python
GRID = 4
TERMINAL = (3, 3)
ACTIONS = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}

def step(state, action):
    if state == TERMINAL:
        return state, 0.0, True
    dr, dc = ACTIONS[action]
    r, c = state
    nr = min(max(r + dr, 0), GRID - 1)
    nc = min(max(c + dc, 0), GRID - 1)
    return (nr, nc), -1.0, (nr, nc) == TERMINAL
```

五行。这就是整个环境。确定性转移、恒定的步罚、吸收性终止状态。

### 第 2 步：roll out 一个策略

策略是从状态到动作分布的函数。最简单的：均匀随机。

```python
def uniform_policy(state):
    return {a: 0.25 for a in ACTIONS}

def rollout(policy, max_steps=200):
    s, total, steps = (0, 0), 0.0, 0
    for _ in range(max_steps):
        a = sample(policy(s))
        s, r, done = step(s, a)
        total += r
        steps += 1
        if done:
            break
    return total, steps
```

把随机策略跑 1000 次。这个 4×4 棋盘的平均回报在 -60 到 -80 之间。最优回报是 -6（直线斜插到右下角）。Phase 9 的全部内容，就是去缩小这个差距。

### 第 3 步：用贝尔曼方程精确计算 `V^π`

对小型 MDP，贝尔曼方程就是一个线性方程组。枚举状态，套用期望，迭代到价值不再变化。

```python
def policy_evaluation(policy, gamma=0.99, tol=1e-6):
    V = {s: 0.0 for s in all_states()}
    while True:
        delta = 0.0
        for s in all_states():
            if s == TERMINAL:
                continue
            v = 0.0
            for a, pi_a in policy(s).items():
                s_next, r, _ = step(s, a)
                v += pi_a * (r + gamma * V[s_next])
            delta = max(delta, abs(v - V[s]))
            V[s] = v
        if delta < tol:
            return V
```

这就是迭代式策略评估。它是 Sutton & Barto 书里的第一个算法，也是后续每个 RL 方法的理论根基。

### 第 4 步：`γ` 是一个有物理含义的超参数

有效视野大约是 `1 / (1 - γ)`。`γ = 0.9` → 10 步。`γ = 0.99` → 100 步。`γ = 0.999` → 1000 步。

太低，agent 会变得短视。太高，信用分配会变得嘈杂，因为很多早期步骤要共同为远期奖励负责。LLM RLHF 通常用 `γ = 1`，因为 episode 短而有界。控制类任务用 `0.95–0.99`。长视野策略游戏用 `0.999`。

## 注意事项

- **非马尔可夫状态。** 如果你得靠最近三次观测才能决策，那"状态"就不只是当前这次观测。解法：堆叠帧（Atari 上的 DQN 堆 4 帧），或用循环状态（在观测序列上跑 LSTM/GRU）。
- **稀疏奖励。** 只在赢的时候给奖励，会让大状态空间里的学习几乎不可能。要塑造奖励（给中间信号），或用模仿学习来自举（Phase 9 · 09）。
- **奖励 hacking。** 优化代理奖励常常产出病态行为。OpenAI 那个赛艇 agent 不去完成比赛，而是原地转圈无限刷道具。永远从目标结果定义奖励，而不是从代理量定义。
- **折扣设错。** 在无限视野任务上用 `γ = 1`，会让每个价值都变成无穷大。永远用有限视野或 `γ < 1` 来封顶。
- **奖励尺度。** {+100, -100} 和 {+1, -1} 给出相同的最优策略，但梯度量级天差地别。塞进 PPO/DQN 之前，先归一化到大致 `[-1, 1]` 区间。

## 实际使用

2026 年的技术栈在动代码之前，先把每条 RL 流水线归约成一个 MDP：

| 场景 | 状态 | 动作 | 奖励 | γ |
|-----------|-------|--------|--------|---|
| 控制（运动、操作） | 关节角度 + 速度 | 连续力矩 | 任务专属塑形 | 0.99 |
| 游戏（象棋、围棋、扑克） | 棋盘 + 历史 | 合法走子 | 赢=+1 / 输=-1 | 1.0（有限） |
| 库存 / 定价 | 库存 + 需求 | 订货量 | 收入 - 成本 | 0.95 |
| LLM 的 RLHF | 上下文 token | 下一个 token | 末尾奖励模型打分 | 1.0（episode 约 200 token） |
| 推理的 GRPO | prompt + 部分回复 | 下一个 token | 末尾验证器 0/1 | 1.0 |

在写任何训练循环之前，先把这五元组写出来。绝大多数"RL 跑不通"的 bug 报告，最后都能追溯到一个在纸上就已经破掉的 MDP 建模。

## 拿去用

存为 `outputs/skill-mdp-modeler.md`：

```markdown
---
name: mdp-modeler
description: Given a task description, produce a Markov Decision Process spec and flag formulation risks before training.
version: 1.0.0
phase: 9
lesson: 1
tags: [rl, mdp, modeling]
---

Given a task (control / game / recommendation / LLM fine-tuning), output:

1. State. Exact feature vector or tensor spec. Justify Markov property.
2. Action. Discrete set or continuous range. Dimensionality.
3. Transition. Deterministic, stochastic-with-known-model, or sample-only.
4. Reward. Function and source. Sparse vs shaped. Terminal vs per-step.
5. Discount. Value and horizon justification.

Refuse to ship any MDP where the state is non-Markovian without explicit mention of frame-stacking or recurrent state. Refuse any reward that was not defined in terms of the target outcome. Flag any `γ ≥ 1.0` on an infinite-horizon task. Flag any reward range >100x the typical step reward as a likely gradient-explosion source.
```

## 练习

1. **简单。** 在 `code/main.py` 里实现 4×4 GridWorld 和随机策略的 rollout。跑 10000 个 episode。报告回报的均值和标准差。和最优回报（-6）对比。
2. **中等。** 对均匀随机策略，用 `γ ∈ {0.5, 0.9, 0.99}` 跑 `policy_evaluation`。把每种情况下的 `V` 打印成 4×4 网格。解释为什么 `γ` 越大，终点附近的状态价值增长得越快。
3. **困难。** 把 GridWorld 改成随机的：每个动作有 `p = 0.1` 的概率滑向相邻方向。重新评估均匀策略。`V[start]` 是变好了还是变差了？为什么？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| MDP | "强化学习的设定" | 满足马尔可夫性的元组 `(S, A, P, R, γ)`。 |
| 状态 | "agent 看到的东西" | 在所选策略类下，对未来动态而言的充分统计量。 |
| 策略 | "agent 的行为" | 条件分布 `π(a | s)` 或确定性映射 `s → a`。 |
| 回报 | "总奖励" | 从当前步起的折扣和 `Σ γ^t r_t`。 |
| 价值 | "一个状态有多好" | 在 `π` 下从 `s` 出发的期望回报。 |
| Q 值 | "一个动作有多好" | 在 `π` 下从 `s` 出发、首动作为 `a` 的期望回报。 |
| 贝尔曼方程 | "动态规划递归" | 把价值 / Q 拆成单步奖励加折扣后继价值的不动点分解。 |
| 折扣 `γ` | "未来对当下" | 远期奖励上的几何权重；有效视野 `~1/(1-γ)`。 |

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction, 2nd ed.](http://incompleteideas.net/book/RLbook2020.pdf) —— 那本教科书。第 3 章讲 MDP 和贝尔曼方程；第 1 章引出了奖励假设，后面每一课都建立在它之上。
- [Bellman (1957). Dynamic Programming](https://press.princeton.edu/books/paperback/9780691146683/dynamic-programming) —— 贝尔曼方程的起源。
- [OpenAI Spinning Up — Part 1: Key Concepts](https://spinningup.openai.com/en/latest/spinningup/rl_intro.html) —— 从深度 RL 角度切入的简明 MDP 入门。
- [Puterman (2005). Markov Decision Processes](https://onlinelibrary.wiley.com/doi/book/10.1002/9780470316887) —— MDP 及其精确求解方法的运筹学参考书。
- [Littman (1996). Algorithms for Sequential Decision Making (PhD thesis)](https://www.cs.rutgers.edu/~mlittman/papers/thesis-main.pdf) —— 把 MDP 作为动态规划特例的最干净的推导。
