# 动态规划 —— 策略迭代与价值迭代

> 动态规划是开了挂的 RL。你已经知道转移函数和奖励函数；要做的只是迭代贝尔曼方程，直到 `V` 或 `π` 不再变化。它是每个基于采样的方法都试图逼近的基准。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 01（MDP）
**预计时间：** ~75 分钟

## 问题背景

你手上有一个模型已知的 MDP：对任意状态-动作对，你都能查询 `P(s' | s, a)` 和 `R(s, a, s')`。库存管理员知道需求分布。棋类游戏的转移是确定的。一个 gridworld 就是四行 Python。你有一个*模型*。

无模型 RL（Q-learning、PPO、REINFORCE）是为没有模型的情况发明的——你只能从环境里采样。但当你确实有模型时，有更快、更好的方法：动态规划。贝尔曼在 1957 年设计了它们。直到今天，它们仍然定义了"正确"：当人们说"这个 MDP 的最优策略"时，指的就是 DP 会返回的那个策略。

到了 2026 年，你需要它们有三个理由。第一，RL 研究里每个表格型环境（GridWorld、FrozenLake、CliffWalking）都用 DP 来求解，产出黄金标准策略。第二，精确的价值能让你*调试*采样方法：如果 Q-learning 对 `V*(s_0)` 的估计跟 DP 答案差了 30%，那你的 Q-learning 有 bug。第三，现代的离线 RL 和规划方法（MCTS、AlphaZero 的搜索、Phase 9 · 10 的基于模型 RL）都是在一个学到的或给定的模型上迭代贝尔曼回溯。

## 核心概念

![Policy iteration and value iteration, side by side](../assets/dp.svg)

**两个算法，都是贝尔曼方程上的不动点迭代。**

**策略迭代。** 交替两步，直到策略不再变化。

1. *评估：* 给定策略 `π`，反复套用 `V(s) ← Σ_a π(a|s) Σ_{s',r} P(s',r|s,a) [r + γ V(s')]` 直到收敛，算出 `V^π`。
2. *改进：* 给定 `V^π`，让 `π` 对 `V^π` 贪心：`π(s) ← argmax_a Σ_{s',r} P(s',r|s,a) [r + γ V(s')]`。

收敛是有保证的，因为（a）每个改进步要么让 `π` 保持不变，要么严格抬高某个状态的 `V^π`；（b）确定性策略的空间是有限的。即使状态空间很大，通常也在约 5–20 次外层迭代内收敛。

**价值迭代。** 把评估和改进塌缩进一次扫描。套用贝尔曼*最优*方程：

`V(s) ← max_a Σ_{s',r} P(s',r|s,a) [r + γ V(s')]`

重复直到 `max_s |V_{new}(s) - V(s)| < ε`。最后取贪心动作来提取策略。每次迭代严格更快——没有内层评估循环——但通常需要更多次迭代才收敛。

**广义策略迭代（GPI）。** 统一的框架。价值函数和策略锁死在一个双向改进的循环里；任何把两者驱向相互一致的方法（异步价值迭代、修正策略迭代、Q-learning、actor-critic、PPO）都是 GPI 的一个实例。

**为什么 `γ < 1` 重要。** 贝尔曼算子在上确界范数下是一个 `γ`-压缩：`||T V - T V'||_∞ ≤ γ ||V - V'||_∞`。压缩意味着唯一不动点和几何级收敛。一旦去掉 `γ < 1`，就丢了这个保证——你得用有限视野或一个吸收性终止状态。

```figure
value-iteration-gamma
```

## 动手构建

### 第 1 步：构建 GridWorld 的 MDP 模型

沿用第 01 课那个 4×4 GridWorld。我们加一个随机变体：agent 有 `0.1` 的概率滑向一个随机的垂直方向。

```python
SLIP = 0.1

def transitions(state, action):
    if state == TERMINAL:
        return [(state, 0.0, 1.0)]
    outcomes = []
    for direction, prob in action_probs(action):
        outcomes.append((apply_move(state, direction), -1.0, prob))
    return outcomes
```

`transitions(s, a)` 返回一个 `(s', r, p)` 列表。这就是整个模型。

### 第 2 步：策略评估

给定一个策略 `π(s) = {action: prob}`，迭代贝尔曼方程直到 `V` 不再变化：

```python
def policy_evaluation(policy, gamma=0.99, tol=1e-6):
    V = {s: 0.0 for s in states()}
    while True:
        delta = 0.0
        for s in states():
            v = sum(pi_a * sum(p * (r + gamma * V[s_prime])
                              for s_prime, r, p in transitions(s, a))
                   for a, pi_a in policy(s).items())
            delta = max(delta, abs(v - V[s]))
            V[s] = v
        if delta < tol:
            return V
```

### 第 3 步：策略改进

把 `π` 换成对 `V` 贪心的策略。如果 `π` 没有变化，就返回——我们到达了最优点。

```python
def policy_improvement(V, gamma=0.99):
    new_policy = {}
    for s in states():
        best_a = max(
            ACTIONS,
            key=lambda a: sum(p * (r + gamma * V[s_prime])
                              for s_prime, r, p in transitions(s, a)),
        )
        new_policy[s] = best_a
    return new_policy
```

### 第 4 步：把它们拼起来

```python
def policy_iteration(gamma=0.99):
    policy = {s: "up" for s in states()}   # arbitrary start
    for _ in range(100):
        V = policy_evaluation(lambda s: {policy[s]: 1.0}, gamma)
        new_policy = policy_improvement(V, gamma)
        if new_policy == policy:
            return V, policy
        policy = new_policy
```

4×4 上的典型收敛：4–6 次外层迭代。输出 `V*(0,0) ≈ -6`，以及一个严格减少步数的策略。

### 第 5 步：价值迭代（单循环版本）

```python
def value_iteration(gamma=0.99, tol=1e-6):
    V = {s: 0.0 for s in states()}
    while True:
        delta = 0.0
        for s in states():
            v = max(sum(p * (r + gamma * V[s_prime])
                       for s_prime, r, p in transitions(s, a))
                   for a in ACTIONS)
            delta = max(delta, abs(v - V[s]))
            V[s] = v
        if delta < tol:
            break
    policy = policy_improvement(V, gamma)
    return V, policy
```

同一个不动点，更少的代码行。

## 注意事项

- **忘了处理终止状态。** 如果你对一个吸收状态套用贝尔曼，它仍会挑出一个什么都不改变的"最佳动作"。用 `if s == terminal: V[s] = 0` 防住。
- **上确界范数 vs L2 收敛。** 用 `max |V_new - V|`，不要用平均。理论保证是在上确界范数上的。
- **就地更新 vs 同步更新。** 就地更新 `V[s]`（Gauss-Seidel）比用单独的 `V_new` 字典（Jacobi）收敛更快。生产代码用就地更新。
- **策略并列。** 如果两个动作的 Q 值相等，`argmax` 可能每次迭代都用不同方式打破并列，导致"策略稳定"的检查来回震荡。用一个稳定的打破并列规则（固定顺序里的第一个动作）。
- **状态空间爆炸。** DP 每次扫描是 `O(|S| · |A|)`。能处理到约 10⁷ 个状态。再多就需要函数近似（从 Phase 9 · 05 起）。

## 实际使用

到了 2026 年，DP 是正确性基准，也是规划器的内层循环：

| 用途 | 方法 |
|----------|--------|
| 精确求解一个小型表格 MDP | 价值迭代（更简单）或策略迭代（外层步数更少） |
| 验证一个 Q-learning / PPO 实现 | 在玩具环境上和 DP 的最优 V* 对比 |
| 基于模型的 RL（Phase 9 · 10） | 在学到的转移模型上做贝尔曼回溯 |
| AlphaZero / MuZero 里的规划 | 蒙特卡洛树搜索 = 异步贝尔曼回溯 |
| 离线 RL（CQL、IQL） | 保守 Q 迭代 —— 对 OOD 动作加罚的 DP |

每当有人说"最优价值函数"，指的就是"DP 的不动点"。当你在论文里看到 `V*` 或 `Q*`，脑子里浮现出来的就该是这个循环。

## 拿去用

存为 `outputs/skill-dp-solver.md`：

```markdown
---
name: dp-solver
description: Solve a small tabular MDP exactly via policy iteration or value iteration. Report convergence behavior.
version: 1.0.0
phase: 9
lesson: 2
tags: [rl, dynamic-programming, bellman]
---

Given an MDP with a known model, output:

1. Choice. Policy iteration vs value iteration. Reason tied to |S|, |A|, γ.
2. Initialization. V_0, starting policy. Convergence sensitivity.
3. Stopping. Sup-norm tolerance ε. Expected number of sweeps.
4. Verification. V*(s_0) computed exactly. Greedy policy extracted.
5. Use. How this baseline will be used to debug/evaluate sampling-based methods.

Refuse to run DP on state spaces > 10⁷. Refuse to claim convergence without a sup-norm check. Flag any γ ≥ 1 on an infinite-horizon task as a guarantee violation.
```

## 练习

1. **简单。** 在 4×4 GridWorld 上用 `γ ∈ {0.9, 0.99}` 跑价值迭代。要扫描多少次才满足 `max |ΔV| < 1e-6`？把 `V*` 打印成 4×4 网格。
2. **中等。** 在*随机* GridWorld（滑动概率 `0.1`）上对比策略迭代和价值迭代。统计：扫描次数、墙钟时间、最终的 `V*(0,0)`。哪个在迭代次数上收敛更快？墙钟时间上呢？
3. **困难。** 实现修正策略迭代：在评估步里，只跑 `k` 次扫描而不是跑到收敛。对 `k ∈ {1, 2, 5, 10, 50}` 画出 `V*(0,0)` 误差随 `k` 的曲线。这条曲线告诉了你关于评估/改进权衡的什么？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 策略迭代 | "DP 算法" | 交替评估（`V^π`）和改进（对 `V^π` 贪心的 `π`），直到策略不再变化。 |
| 价值迭代 | "更快的 DP" | 在一次扫描里套用贝尔曼最优回溯；几何级收敛到 `V*`。 |
| 贝尔曼算子 | "那个递归" | `(T V)(s) = max_a Σ P (r + γ V(s'))`；上确界范数下的 `γ`-压缩。 |
| 压缩 | "DP 为什么收敛" | 任何满足 `||T x - T y|| ≤ γ ||x - y||` 的算子 `T` 都有唯一不动点。 |
| GPI | "一切都是 DP" | 广义策略迭代：任何把 `V` 和 `π` 驱向相互一致的方法。 |
| 同步更新 | "Jacobi 风格" | 整次扫描都用旧的 `V`；分析起来干净但更慢。 |
| 就地更新 | "Gauss-Seidel 风格" | 边更新边用 `V`；实践中收敛更快。 |

## 延伸阅读

- [Sutton & Barto (2018). Ch. 4 — Dynamic Programming](http://incompleteideas.net/book/RLbook2020.pdf) —— 策略迭代和价值迭代的经典呈现。
- [Bertsekas (2019). Reinforcement Learning and Optimal Control](http://www.athenasc.com/rlbook.html) —— 对压缩映射论证的严谨处理。
- [Puterman (2005). Markov Decision Processes](https://onlinelibrary.wiley.com/doi/book/10.1002/9780470316887) —— 修正策略迭代及其收敛分析。
- [Howard (1960). Dynamic Programming and Markov Processes](https://mitpress.mit.edu/9780262582300/dynamic-programming-and-markov-processes/) —— 策略迭代的原始论文。
- [Bertsekas & Tsitsiklis (1996). Neuro-Dynamic Programming](http://www.athenasc.com/ndpbook.html) —— 从 DP 通往近似 DP / 深度 RL 的桥梁，后面每一课都用得上。
