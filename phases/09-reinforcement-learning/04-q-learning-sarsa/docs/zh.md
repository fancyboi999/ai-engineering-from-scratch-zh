# 时序差分 —— Q-Learning 与 SARSA

> 蒙特卡洛等到 episode 结束才动。TD 每走一步就靠自举下一步的价值估计来更新。Q-learning 是离策略、乐观的；SARSA 是同策略、谨慎的。两者都只要一行代码。两者都是本阶段每个深度 RL 方法的底座。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 01（MDP）、Phase 9 · 02（动态规划）、Phase 9 · 03（蒙特卡洛）
**预计时间：** ~75 分钟

## 问题背景

蒙特卡洛能用，但它有两个昂贵的要求。它需要能终止的 episode，而且只在拿到最终回报之后才更新。如果你的 episode 有 1000 步，MC 就要等 1000 步才更新任何东西。它高方差、低偏差，实践中很慢。

动态规划的画像正好相反——零方差的自举回溯——但需要一个已知模型。

时序差分（TD）学习取了个折中。从单次转移 `(s, a, r, s')` 出发，构造一个单步目标 `r + γ V(s')`，把 `V(s)` 朝它推一下。不需要模型。不需要完整 episode。在右侧用近似的 `V` 会带来偏差，但方差远低于 MC，而且从第一步就能在线更新。

这是整个现代 RL——DQN、A2C、PPO、SAC——转动所依托的支点。Phase 9 余下的部分，都是建立在你这一课要写的单步 TD 更新之上的一层层函数近似和技巧。

## 核心概念

![Q-learning vs SARSA: off-policy max vs on-policy Q(s', a')](../assets/td.svg)

**V 的 TD(0) 更新：**

`V(s) ← V(s) + α [r + γ V(s') - V(s)]`

括号里那个量是 TD 误差 `δ = r + γ V(s') - V(s)`。它是 MC 里 `G_t - V(s_t)` 的在线版本。收敛要求 `α` 满足 Robbins-Monro（`Σ α = ∞`，`Σ α² < ∞`），且所有状态被无限次访问。

**Q-learning。** 一种用于控制的离策略 TD 方法：

`Q(s, a) ← Q(s, a) + α [r + γ max_{a'} Q(s', a') - Q(s, a)]`

这个 `max` 假设从 `s'` 起会遵循*贪心*策略，不管 agent 实际采取什么动作。这种解耦让 Q-learning 在 agent 用 ε-greedy 探索的同时学到 `Q*`。Mnih 等人（2015）把它在 Atari 上转化成了深度 Q-learning（第 05 课）。

**SARSA。** 一种同策略 TD 方法：

`Q(s, a) ← Q(s, a) + α [r + γ Q(s', a') - Q(s, a)]`

这名字就是元组 `(s, a, r, s', a')`。SARSA 用的是 agent 接下来*实际*采取的动作 `a'`，而不是贪心的 `argmax`。它会收敛到当前运行的那个 ε-greedy `π` 的 `Q^π`，在 `ε → 0` 的极限下就变成 `Q*`。

**cliff-walking 的差别。** 在经典的 cliff-walking 任务（掉下悬崖 = 奖励 -100）上，Q-learning 学到沿悬崖边走的最优路径，但探索时偶尔会吃到惩罚。SARSA 学到一条离悬崖一步远的更安全路径，因为它把探索噪声算进了 Q 值。随着训练，两者在 `ε → 0` 时都达到最优。但实践中这很要紧：当部署时确实在做探索，SARSA 的行为更保守。

**Expected SARSA。** 把 `Q(s', a')` 换成它在 `π` 下的期望值：

`Q(s, a) ← Q(s, a) + α [r + γ Σ_{a'} π(a'|s') Q(s', a') - Q(s, a)]`

比 SARSA 方差更低（不采样 `a'`），同样的同策略目标。在现代教科书里常常是默认选项。

**n-步 TD 与 TD(λ)。** 通过在自举前等 `n` 步，在 TD(0) 和 MC 之间插值。`n=1` 是 TD，`n=∞` 是 MC。TD(λ) 用几何权重 `(1-λ)λ^{n-1}` 对所有 `n` 求平均。大多数深度 RL 用 3 到 20 之间的 `n`。

```figure
qlearning-gridworld
```

## 动手构建

### 第 1 步：在 ε-greedy 策略上跑 SARSA

```python
def sarsa(env, episodes, alpha=0.1, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})

    def choose(s):
        if random() < epsilon:
            return choice(ACTIONS)
        return max(Q[s], key=Q[s].get)

    for _ in range(episodes):
        s = env.reset()
        a = choose(s)
        while True:
            s_next, r, done = env.step(s, a)
            a_next = choose(s_next) if not done else None
            target = r + (gamma * Q[s_next][a_next] if not done else 0.0)
            Q[s][a] += alpha * (target - Q[s][a])
            if done:
                break
            s, a = s_next, a_next
    return Q
```

八行。和 Q-learning *唯一*的区别就是那行目标计算。

### 第 2 步：Q-learning

```python
def q_learning(env, episodes, alpha=0.1, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})
    for _ in range(episodes):
        s = env.reset()
        while True:
            a = choose(s, Q, epsilon)
            s_next, r, done = env.step(s, a)
            target = r + (gamma * max(Q[s_next].values()) if not done else 0.0)
            Q[s][a] += alpha * (target - Q[s][a])
            if done:
                break
            s = s_next
    return Q
```

那个 `max` 把目标和行为解耦。仅仅这一个符号，就是同策略和离策略的区别。

### 第 3 步：学习曲线

每 100 个 episode 跟踪一次平均回报。在简单的确定性 GridWorld 上 Q-learning 收敛更快；在 cliff-walking 上 SARSA 更保守。在 `code/main.py` 里的 4×4 GridWorld 上，用 `α=0.1, ε=0.1`，两者约 2000 个 episode 后都接近最优。

### 第 4 步：和 DP 真值对比

跑价值迭代（第 02 课）拿到 `Q*`。检查 `max_{s,a} |Q_learned(s,a) - Q*(s,a)|`。一个健康的表格 TD agent 在 4×4 GridWorld 上跑 10000 个 episode 后会落在 `~0.5` 以内。

## 注意事项

- **初始 Q 值很重要。** 乐观初始化（对一个负奖励任务设 `Q = 0`）会鼓励探索。悲观初始化可能把贪心策略永远困住。
- **α 调度。** 常数 `α` 对非平稳问题没问题。衰减的 `α_n = 1/n` 理论上收敛但实践中太慢——把 `α` 钉在 `[0.05, 0.3]` 里，盯着学习曲线。
- **ε 调度。** 从高处起（`ε=1.0`），衰减到 `ε=0.05`。"GLIE"（无限探索下的极限贪心）是收敛条件。
- **Q-learning 的 max 偏差。** 当 `Q` 有噪声时，`max` 算子会向上偏。导致高估——Hasselt 的 Double Q-learning（第 05 课的 DDQN 用了它）用两张 Q 表来修正。
- **不终止的 episode。** TD 能在没有终止状态时学习，但你得要么给步数封顶，要么在封顶处正确处理自举。标准做法：把封顶当成非终止，继续自举。
- **状态哈希。** 如果状态是元组/张量，用一个可哈希的键（用元组而非列表；用四舍五入后的浮点元组，而非原始值）。

## 实际使用

2026 年的 TD 全景：

| 任务 | 方法 | 理由 |
|------|--------|--------|
| 小型表格环境 | Q-learning | 直接学到最优策略。 |
| 同策略、安全攸关 | SARSA / Expected SARSA | 探索期间保守。 |
| 高维状态 | DQN（Phase 9 · 05） | 带回放和目标网络的神经网络 Q 函数。 |
| 连续动作 | SAC / TD3（Phase 9 · 07） | 在 Q 网络上做 TD 更新；策略网络吐出动作。 |
| LLM RL（基于奖励模型） | PPO / GRPO（Phase 9 · 08、12） | actor-critic，通过 GAE 用 TD 式优势。 |
| 离线 RL | CQL / IQL（Phase 9 · 08） | 带保守正则化的 Q-learning。 |

2026 年论文里你读到的"RL"，九成是 Q-learning 或 SARSA 的某种精细演绎。在往深里读之前，先把表格更新练到指尖上。

## 拿去用

存为 `outputs/skill-td-agent.md`：

```markdown
---
name: td-agent
description: Pick between Q-learning, SARSA, Expected SARSA for a tabular or small-feature RL task.
version: 1.0.0
phase: 9
lesson: 4
tags: [rl, td-learning, q-learning, sarsa]
---

Given a tabular or small-feature environment, output:

1. Algorithm. Q-learning / SARSA / Expected SARSA / n-step variant. One-sentence reason tied to on-policy vs off-policy and variance.
2. Hyperparameters. α, γ, ε, decay schedule.
3. Initialization. Q_0 value (optimistic vs zero) and justification.
4. Convergence diagnostic. Target learning curve, `|Q - Q*|` check if DP is possible.
5. Deployment caveat. How will exploration behave at inference? Is SARSA's conservatism needed?

Refuse to apply tabular TD to state spaces > 10⁶. Refuse to ship a Q-learning agent without a max-bias caveat. Flag any agent trained with ε held at 1.0 throughout (no exploitation phase).
```

## 练习

1. **简单。** 在 4×4 GridWorld 上实现 Q-learning 和 SARSA。画出 2000 个 episode 的学习曲线（每 100 个 episode 的平均回报）。谁收敛更快？
2. **中等。** 搭一个 cliff-walking 环境（4×12，最后一行是悬崖，奖励 -100 并重置到起点）。对比 Q-learning 和 SARSA 的最终策略。把各自走的路径截图。哪个离悬崖更近？
3. **困难。** 实现 Double Q-learning。在一个噪声奖励 GridWorld（每步奖励上加高斯噪声 σ=5）上，展示 Q-learning 会把 `V*(0,0)` 高估一个可观的量，而 Double Q-learning 不会。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| TD 误差 | "更新信号" | `δ = r + γ V(s') - V(s)`，自举后的残差。 |
| TD(0) | "单步 TD" | 每次转移后只用下一个状态的估计来更新。 |
| Q-learning | "离策略 RL 入门" | 对下一状态动作取 `max` 的 TD 更新；不管行为策略如何都学到 `Q*`。 |
| SARSA | "同策略 Q-learning" | 用实际的下一动作做 TD 更新；为当前 ε-greedy π 学到 `Q^π`。 |
| Expected SARSA | "低方差版 SARSA" | 把采样的 `a'` 换成它在 π 下的期望。 |
| GLIE | "正确的探索调度" | 无限探索下的极限贪心；Q-learning 收敛所需。 |
| 自举 | "在目标里用上当前估计" | 这是 TD 区别于 MC 之处。偏差的来源，但带来巨大的方差削减。 |
| 最大化偏差 | "Q-learning 会高估" | 对有噪声的估计取 `max` 会向上偏；由 Double Q-learning 修正。 |

## 延伸阅读

- [Watkins & Dayan (1992). Q-learning](https://link.springer.com/article/10.1007/BF00992698) —— 原始论文和收敛证明。
- [Sutton & Barto (2018). Ch. 6 — Temporal-Difference Learning](http://incompleteideas.net/book/RLbook2020.pdf) —— TD(0)、SARSA、Q-learning、Expected SARSA。
- [Hasselt (2010). Double Q-learning](https://papers.nips.cc/paper_files/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html) —— 最大化偏差的修法。
- [Seijen, Hasselt, Whiteson, Wiering (2009). A Theoretical and Empirical Analysis of Expected SARSA](https://ieeexplore.ieee.org/document/4927542) —— Expected SARSA 的动机。
- [Rummery & Niranjan (1994). On-line Q-learning using connectionist systems](https://www.researchgate.net/publication/2500611_On-Line_Q-Learning_Using_Connectionist_Systems) —— 提出 SARSA 的论文（当时叫"modified connectionist Q-learning"）。
- [Sutton & Barto (2018). Ch. 7 — n-step Bootstrapping](http://incompleteideas.net/book/RLbook2020.pdf) —— 把 TD(0) 推广到 TD(n)，是从 Q-learning 通往资格迹、再到后来 PPO 里 GAE 的路径。
