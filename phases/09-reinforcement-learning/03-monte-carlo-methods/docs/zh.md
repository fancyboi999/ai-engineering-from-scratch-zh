# 蒙特卡洛方法 —— 从完整 episode 中学习

> 动态规划需要模型。蒙特卡洛什么都不需要，只要 episode。跑策略，看回报，求平均。这是 RL 里最简单的想法——也是解锁后续一切的那个。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 01（MDP）、Phase 9 · 02（动态规划）
**预计时间：** ~75 分钟

## 问题背景

动态规划很优雅，但它假设你能对每个状态和动作查询 `P(s' | s, a)`。现实世界里几乎没什么是这样运转的。一个机器人没法解析地算出施加关节力矩后摄像头像素的分布。一个定价算法没法对每一种可能的顾客反应做积分。一个 LLM 没法枚举出一个 token 之后所有可能的续写。

你需要一种只要求能从环境里*采样*的方法。跑策略。拿到一条轨迹 `s_0, a_0, r_1, s_1, a_1, r_2, …, s_T`。用它来估计价值。这就是蒙特卡洛。

从 DP 到 MC 的转变在哲学上很重要：我们从*已知模型 + 精确回溯*走到了*采样 rollout + 平均回报*。方差猛增，但适用范围爆炸式扩大。这一课之后的每个 RL 算法——TD、Q-learning、REINFORCE、PPO、GRPO——本质上都是一个蒙特卡洛估计器，有时上面叠了一层自举。

## 核心概念

![Monte Carlo: rollout, compute returns, average; first-visit vs every-visit](../assets/monte-carlo.svg)

**核心想法，一行说清：** `V^π(s) = E_π[G_t | s_t = s] ≈ (1/N) Σ_i G^{(i)}(s)`，其中 `G^{(i)}(s)` 是策略 `π` 下访问 `s` 之后观测到的回报。

**首次访问 vs 每次访问 MC。** 给定一个多次访问状态 `s` 的 episode，首次访问 MC 只统计第一次访问之后的回报；每次访问 MC 统计所有访问。两者在极限下都是无偏的。首次访问更好分析（iid 样本）。每次访问每个 episode 用了更多数据，实践中通常收敛更快。

**增量均值。** 不存所有回报，而是更新滑动平均：

`V_n(s) = V_{n-1}(s) + (1/n) [G_n - V_{n-1}(s)]`

重新整理：`V_new = V_old + α · (target - V_old)`，其中 `α = 1/n`。把 `1/n` 换成一个常数步长 `α ∈ (0, 1)`，你就得到了一个能追踪 `π` 变化的非平稳 MC 估计器。正是这一步，构成了从 MC 到 TD、再到每个现代 RL 算法的整个跨越。

**探索现在成了问题。** DP 靠枚举触及每个状态。MC 只看到策略访问过的状态。如果 `π` 是确定性的，状态空间里整片区域永远不会被采样到，它们的价值估计会永远停在零。三种修法，按历史顺序排：

1. **探索性起点。** 让每个 episode 从一个随机的 (s, a) 对开始。保证覆盖；实践中不现实（你没法把机器人"重置"到一个任意状态）。
2. **ε-greedy。** 对当前 Q 贪心地行动，但以概率 `ε` 挑一个随机动作。渐进地让所有状态-动作对都被采样到。
3. **离策略 MC。** 在行为策略 `μ` 下收集数据，通过重要性采样学习目标策略 `π`。方差很高，但它是通往 DQN 这类回放缓冲方法的桥梁。

**蒙特卡洛控制。** 评估 → 改进 → 评估，跟策略迭代一样，只是评估是基于采样的：

1. 跑 `π`，拿到一个 episode。
2. 用观测到的回报更新 `Q(s, a)`。
3. 让 `π` 对 `Q` 做 ε-greedy。
4. 重复。

在温和条件下（每个对被无限次访问，`α` 满足 Robbins-Monro），以概率 1 收敛到 `Q*` 和 `π*`。

```figure
epsilon-greedy
```

## 动手构建

### 第 1 步：rollout → (s, a, r) 列表

```python
def rollout(env, policy, max_steps=200):
    trajectory = []
    s = env.reset()
    for _ in range(max_steps):
        a = policy(s)
        s_next, r, done = env.step(s, a)
        trajectory.append((s, a, r))
        s = s_next
        if done:
            break
    return trajectory
```

没有模型，只有 `env.reset()` 和 `env.step(s, a)`。和 gym 环境一样的接口，只是精简了。

### 第 2 步：计算回报（反向扫描）

```python
def returns_from(trajectory, gamma):
    returns = []
    G = 0.0
    for _, _, r in reversed(trajectory):
        G = r + gamma * G
        returns.append(G)
    return list(reversed(returns))
```

一趟过，`O(T)`。反向递推 `G_t = r_{t+1} + γ G_{t+1}` 避免了重复求和。

### 第 3 步：首次访问 MC 评估

```python
def mc_policy_evaluation(env, policy, episodes, gamma=0.99):
    V = defaultdict(float)
    counts = defaultdict(int)
    for _ in range(episodes):
        trajectory = rollout(env, policy)
        returns = returns_from(trajectory, gamma)
        seen = set()
        for t, ((s, _, _), G) in enumerate(zip(trajectory, returns)):
            if s in seen:
                continue
            seen.add(s)
            counts[s] += 1
            V[s] += (G - V[s]) / counts[s]
    return V
```

干活的就三行：首次访问时把状态标记为已见，递增计数，更新滑动均值。

### 第 4 步：ε-greedy MC 控制（同策略）

```python
def mc_control(env, episodes, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})
    counts = defaultdict(lambda: {a: 0 for a in ACTIONS})

    def policy(s):
        if random() < epsilon:
            return choice(ACTIONS)
        return max(Q[s], key=Q[s].get)

    for _ in range(episodes):
        trajectory = rollout(env, policy)
        returns = returns_from(trajectory, gamma)
        seen = set()
        for (s, a, _), G in zip(trajectory, returns):
            if (s, a) in seen:
                continue
            seen.add((s, a))
            counts[s][a] += 1
            Q[s][a] += (G - Q[s][a]) / counts[s][a]
    return Q, policy
```

### 第 5 步：和 DP 黄金标准对比

当 episode → ∞ 时，你对 `V^π` 的 MC 估计应该和第 02 课的 DP 结果一致。实践中：在 4×4 GridWorld 上跑 50000 个 episode，你就能落在 DP 答案 `~0.1` 以内。

## 注意事项

- **无限 episode。** MC 要求 episode 能*终止*。如果你的策略可能永远循环，就给 `max_steps` 封顶，并把封顶当成隐式失败。GridWorld 配随机策略经常超时——这很正常，只要确保你计数正确。
- **方差。** MC 用完整回报。在长 episode 上方差巨大——末尾一个倒霉奖励就能让 `V(s_0)` 偏移同样的量。TD 方法（第 04 课）靠自举削掉这部分。
- **状态覆盖。** 对一个全新的、有并列的 Q 做贪心 MC，永远只会试一个动作。你*必须*探索（ε-greedy、探索性起点、UCB）。
- **非平稳策略。** 如果 `π` 在变（如 MC 控制中），旧回报来自一个不同的策略。常数-α MC 能处理这个；样本平均 MC 不行。
- **离策略重要性采样。** 权重 `π(a|s)/μ(a|s)` 沿一条轨迹连乘。方差随视野爆炸。用逐决策加权 IS 封顶，或者改用 TD。

## 实际使用

蒙特卡洛方法在 2026 年的角色：

| 用途 | 为什么用 MC |
|----------|--------|
| 短视野游戏（21 点、扑克） | episode 自然终止；回报干净。 |
| 对一个已记录策略做离线评估 | 对存下来的轨迹求折扣回报的平均。 |
| 蒙特卡洛树搜索（AlphaZero） | 从树叶出发的 MC rollout 指导选择。 |
| LLM RL 评估 | 对给定策略，计算采样补全的平均奖励。 |
| PPO 里的基线估计 | 优势目标 `A_t = G_t - V(s_t)` 用了一个 MC `G_t`。 |
| 教 RL | 唯一真正能跑通的最简单算法——剥掉自举来看清核心。 |

现代深度 RL 算法（PPO、SAC）通过 `n`-步回报或 GAE，在纯 MC（完整回报）和纯 TD（单步自举）之间做插值。两个端点都是同一个估计器的实例。

## 拿去用

存为 `outputs/skill-mc-evaluator.md`：

```markdown
---
name: mc-evaluator
description: Evaluate a policy via Monte Carlo rollouts and produce a convergence report with DP-comparison if available.
version: 1.0.0
phase: 9
lesson: 3
tags: [rl, monte-carlo, evaluation]
---

Given an environment (episodic, with reset+step API) and a policy, output:

1. Method. First-visit vs every-visit MC. Reason.
2. Episode budget. Target number, variance diagnostic, expected standard error.
3. Exploration plan. ε schedule (if needed) or exploring starts.
4. Gold-standard comparison. DP-optimal V* if tabular; otherwise a bound from a Q-learning / PPO baseline.
5. Termination check. Max-step cap, timeouts, handling of non-terminating trajectories.

Refuse to run MC on non-episodic tasks without a finite horizon cap. Refuse to report V^π estimates from fewer than 100 episodes per state for tabular tasks. Flag any policy with zero-variance actions as an exploration risk.
```

## 练习

1. **简单。** 在 4×4 GridWorld 上实现对均匀随机策略的首次访问 MC 评估。跑 10000 个 episode。把 `V(0,0)` 随 episode 数的变化画出来，和 DP 答案对照。
2. **中等。** 实现 ε-greedy MC 控制，`ε ∈ {0.01, 0.1, 0.3}`。对比 20000 个 episode 后的平均回报。曲线长什么样？偏差-方差权衡落在哪里？
3. **困难。** 实现带重要性采样的*离策略* MC：在均匀随机策略 `μ` 下收集数据，为确定性最优策略 `π` 估计 `V^π`。对比朴素 IS、逐决策 IS、加权 IS。哪个方差最低？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 蒙特卡洛 | "随机采样" | 通过对分布的 iid 样本求平均来估计期望。 |
| 回报 `G_t` | "未来奖励" | 从第 `t` 步到 episode 结束的折扣奖励和：`Σ_{k≥0} γ^k r_{t+k+1}`。 |
| 首次访问 MC | "每个状态只数一次" | 一个 episode 里只有首次访问对价值估计有贡献。 |
| 每次访问 MC | "用上所有访问" | 每次访问都有贡献；略有偏差但样本效率更高。 |
| ε-greedy | "探索噪声" | 以概率 `1-ε` 选贪心动作；以概率 `ε` 选随机动作。 |
| 重要性采样 | "修正从错误分布采样的偏差" | 用 `π(a|s)/μ(a|s)` 的连乘对回报重新加权，从 `μ` 的数据估计 `V^π`。 |
| 同策略 | "从我自己的数据里学" | 目标策略 = 行为策略。原版 MC、PPO、SARSA。 |
| 离策略 | "从别人的数据里学" | 目标策略 ≠ 行为策略。重要性采样 MC、Q-learning、DQN。 |

## 延伸阅读

- [Sutton & Barto (2018). Ch. 5 — Monte Carlo Methods](http://incompleteideas.net/book/RLbook2020.pdf) —— 经典处理。
- [Singh & Sutton (1996). Reinforcement Learning with Replacing Eligibility Traces](https://link.springer.com/article/10.1007/BF00114726) —— 首次访问 vs 每次访问的分析。
- [Precup, Sutton, Singh (2000). Eligibility Traces for Off-Policy Policy Evaluation](http://incompleteideas.net/papers/PSS-00.pdf) —— 离策略 MC 与方差控制。
- [Mahmood et al. (2014). Weighted Importance Sampling for Off-Policy Learning](https://arxiv.org/abs/1404.6362) —— 现代低方差 IS 估计器。
- [Tesauro (1995). TD-Gammon, A Self-Teaching Backgammon Program](https://dl.acm.org/doi/10.1145/203330.203343) —— 首个大规模实证展示 MC/TD 自我对弈收敛到超人水平的工作；本阶段后半部分每一课的概念先驱。
