# 多 agent RL

> 单 agent RL 假设环境是平稳的。把两个会学习的 agent 放进同一个世界，这个假设就破了：每个 agent 都是另一个 agent 环境的一部分，而两者都在变。多 agent RL 就是那套在马尔可夫假设不再成立时让学习仍能收敛的技巧。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 04（Q-learning）、Phase 9 · 06（REINFORCE）、Phase 9 · 07（Actor-Critic）
**预计时间：** ~45 分钟

## 问题背景

一个机器人学习在房间里导航，是个单 agent RL 问题。一支足球队不是。AlphaStar 对阵《星际争霸》对手不是。一个竞价 agent 市场不是。两辆车在四向停车口博弈不是。现实世界里多对多的问题都不是。

在每一个多 agent 场景里，从任何一个 agent 的视角看，其他 agent *就是*环境的一部分。当它们学习、改变行为，环境就变得非平稳。马尔可夫性——"下一状态只取决于当前状态和我的动作"——被违反了，因为下一状态还取决于*其他* agent 选了什么，而它们的策略是移动的靶子。

这破坏了表格收敛证明（Q-learning 的保证假设环境平稳）。它也破坏朴素深度 RL：agent 互相追着兜圈，永远收敛不到一个稳定策略。你需要多 agent 专属的技术：中心化训练 / 去中心化执行、反事实基线、联赛对弈、自我对弈。

2026 年的应用：机器人集群、交通路由、自动驾驶车队、市场模拟器、多 agent LLM 系统（Phase 16），以及任何不止一个智能玩家的游戏。

## 核心概念

![Four MARL regimes: indep, centralized critic, self-play, league](../assets/marl.svg)

**形式化：马尔可夫博弈。** MDP 的推广：状态 `S`、联合动作 `a = (a_1, …, a_n)`、转移 `P(s' | s, a)`，以及每个 agent 各自的奖励 `R_i(s, a, s')`。每个 agent `i` 在自己的策略 `π_i` 下最大化自己的回报。如果奖励相同，就是**完全合作**。如果零和，就是**对抗**。如果混合，就是**一般和**。

**核心挑战：**

- **非平稳性。** 从 agent `i` 视角看，`P(s' | s, a_i)` 取决于 `π_{-i}`，而它在变。
- **信用分配。** 奖励共享时，是哪个 agent 造成的？
- **探索协调。** agent 必须探索互补的策略，而不是冗余地探索同一个状态。
- **可扩展性。** 联合动作空间随 `n` 指数增长。
- **部分可观测。** 每个 agent 只看到自己的观测；全局状态是隐藏的。

**四种主导范式：**

**1. 独立 Q-learning / 独立 PPO（IQL、IPPO）。** 每个 agent 学自己的 Q 或策略，把其他人当成环境的一部分。简单，有时能用（尤其当经验回放充当了一个平滑式的 agent 建模技巧时）。理论收敛：没有。实践中：对松耦合任务没问题，对紧耦合任务很糟。

**2. 中心化训练、去中心化执行（CTDE）。** 最常见的现代范式。每个 agent 有自己以局部观测 `o_i` 为条件的*策略* `π_i`——部署时是标准的去中心化执行。*训练*时，一个中心化 critic `Q(s, a_1, …, a_n)` 以完整全局状态和联合动作为条件。例子：
- **MADDPG**（Lowe 等人 2017）：每个 agent 配一个中心化 critic 的 DDPG。
- **COMA**（Foerster 等人 2017）：反事实基线——问"如果我当时改取动作 `a'`，我的奖励会是多少？"——把我的贡献孤立出来。
- 带共享 critic 的 **MAPPO** / **IPPO**（Yu 等人 2022）：带中心化价值函数的 PPO。2026 年合作 MARL 的主导。
- **QMIX**（Rashid 等人 2018）：价值分解——`Q_tot(s, a) = f(Q_1(s, a_1), …, Q_n(s, a_n))`，带单调混合。

**3. 自我对弈。** 同一个 agent 的两份拷贝互相对打。对手的策略*就是*我过去某个快照的策略。AlphaGo / AlphaZero / MuZero。OpenAI Five。对零和博弈效果最好；训练信号是对称的。

**4. 联赛对弈。** 自我对弈在一般和 / 对抗环境上的扩展：保留一个由过去和当前策略组成的种群，从联赛里采样一个对手，对着它训练。加入 exploiter（专门打当前最强）和 main exploiter（专门打 exploiter）。AlphaStar（《星际争霸 II》）。当博弈存在"石头剪刀布"式的策略循环时需要它。

**通信。** 允许 agent 互相发送学到的消息 `m_i`。在合作场景里有效。Foerster 等人（2016）展示了可微的 agent 间通信能端到端训练。今天基于 LLM 的多 agent 系统（Phase 16）本质上是用自然语言通信。

```figure
f3-marl-orbit
```

## 动手构建

这一课用一个 6×6 GridWorld 配两个合作 agent。它们从相对的角落出发，必须到达一个共享目标。共享奖励：只要还有任一 agent 在动就每步 `-1`，两个都到达时 `+10`。见 `code/main.py`。

### 第 1 步：多 agent 环境

```python
class CoopGridWorld:
    def __init__(self):
        self.size = 6
        self.goal = (5, 5)

    def reset(self):
        return ((0, 0), (5, 0))  # two agents

    def step(self, state, actions):
        a1, a2 = state
        new1 = move(a1, actions[0])
        new2 = move(a2, actions[1])
        done = (new1 == self.goal) and (new2 == self.goal)
        reward = 10.0 if done else -1.0
        return (new1, new2), reward, done
```

*联合*动作空间是 `|A|² = 16`。全局状态是两个位置。

### 第 2 步：独立 Q-learning

每个 agent 跑自己的、以联合状态为键的 Q 表。每一步：两个都挑 ε-greedy 动作，收集联合转移，各自用共享奖励更新自己的 Q。

```python
def independent_q(env, episodes, alpha, gamma, epsilon):
    Q1, Q2 = defaultdict(default_q), defaultdict(default_q)
    for _ in range(episodes):
        s = env.reset()
        while not done:
            a1 = epsilon_greedy(Q1, s, epsilon)
            a2 = epsilon_greedy(Q2, s, epsilon)
            s_next, r, done = env.step(s, (a1, a2))
            target1 = r + gamma * max(Q1[s_next].values())
            target2 = r + gamma * max(Q2[s_next].values())
            Q1[s][a1] += alpha * (target1 - Q1[s][a1])
            Q2[s][a2] += alpha * (target2 - Q2[s][a2])
            s = s_next
```

在这个任务上能用，因为奖励稠密且对齐。在紧耦合任务上会失败（比如一个 agent 必须*等*另一个的那种）。

### 第 3 步：中心化 Q 配分解价值更新

用一个跨联合动作的 Q `Q(s, a_1, a_2)`。用共享奖励更新。执行时通过边缘化来去中心化：`π_i(s) = argmax_{a_i} max_{a_{-i}} Q(s, a_1, a_2)`。用指数级联合动作空间换一个*正确*的全局视角。

### 第 4 步：简单自我对弈（对抗 2-agent）

同一个 agent，两个角色。让 agent A 对阵 agent B 训练；`K` 个 episode 后，把 A 的权重拷进 B。对称训练，进展一致。微缩版的 AlphaZero 配方。

## 注意事项

- **非平稳回放。** 独立 agent 配经验回放比单 agent 还糟，因为旧转移是由现在已过时的对手生成的。修法：重新标注，或按近期性加权。
- **信用分配模糊。** 长 episode 后的共享奖励；没有清晰办法说是哪个 agent 贡献的。修法：反事实基线（COMA），或对每个 agent 做奖励塑形。
- **策略漂移 / 互追。** 每个 agent 的最佳响应随对方的更新而变。修法：中心化 critic、慢学习率，或一次冻一个。
- **靠协调的奖励 hacking。** agent 找到设计者没预料到的协调式漏洞。拍卖 agent 收敛到出价为零。修法：仔细的奖励设计、行为约束。
- **探索冗余。** 两个 agent 探索同样的状态-动作对。修法：每个 agent 的熵奖励，或角色条件化。
- **联赛循环。** 纯自我对弈可能卡在一个支配循环里。修法：用多样化对手的联赛对弈。
- **样本爆炸。** `n` 个 agent × 状态空间 × 联合动作。用函数近似来近似；因式化动作空间（每个 agent 一个策略输出头）。

## 实际使用

2026 年的 MARL 应用地图：

| 领域 | 方法 | 备注 |
|--------|--------|-------|
| 合作导航 / 操作 | MAPPO / QMIX | CTDE；共享 critic + 去中心化 actor。 |
| 双人游戏（象棋、围棋、扑克） | 配 MCTS 的自我对弈（AlphaZero） | 零和；对称训练。 |
| 复杂多人（Dota、星际） | 联赛对弈 + 模仿预训练 | OpenAI Five、AlphaStar。 |
| 自动驾驶车队 | 带注意力的 CTDE MAPPO / PPO | 部分观测；可变队伍规模。 |
| 拍卖市场 | 博弈论均衡 + RL | `n` → ∞ 时用平均场 RL。 |
| LLM 多 agent 系统（Phase 16） | 自然语言通信 + 角色条件化 | RL 循环在 agent 规划层。 |

到了 2026 年，MARL 增长最快的领域是基于 LLM 的：成群的语言模型 agent 谈判、辩论、构建软件。RL 表现为对*轨迹级*输出（而非 token 级）的偏好优化（Phase 16 · 03）。

## 拿去用

存为 `outputs/skill-marl-architect.md`：

```markdown
---
name: marl-architect
description: Pick the right multi-agent RL regime (IPPO, CTDE, self-play, league) for a given task.
version: 1.0.0
phase: 9
lesson: 10
tags: [rl, multi-agent, marl, self-play]
---

Given a task with `n` agents, output:

1. Regime classification. Cooperative / adversarial / general-sum. Justify.
2. Algorithm. IPPO / MAPPO / QMIX / self-play / league. Reason tied to coupling tightness and reward structure.
3. Information access. Centralized training (what global info goes to the critic)? Decentralized execution?
4. Credit assignment. Counterfactual baseline, value decomposition, or reward shaping.
5. Exploration plan. Per-agent entropy, population-based training, or league.

Refuse independent Q-learning on tightly-coupled cooperative tasks. Refuse to recommend self-play for general-sum with cycle risks. Flag any MARL pipeline without a fixed-opponent eval (cherry-picked self-play numbers are common).
```

## 练习

1. **简单。** 在 2-agent 合作 GridWorld 上训练独立 Q-learning。多少个 episode 后平均回报 > 0？画出联合学习曲线。
2. **中等。** 加一个"协调"任务：只有两个 agent 在同一回合一起踏上目标时才算到达。独立 Q 还能收敛吗？哪里崩了？
3. **困难。** 为 MAPPO 风格的训练实现一个中心化 critic，在协调任务上和独立 PPO 对比收敛速度。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 马尔可夫博弈 | "多 agent MDP" | `(S, A_1, …, A_n, P, R_1, …, R_n)`；每个 agent 有自己的奖励。 |
| CTDE | "中心化训练，去中心化执行" | 训练时用联合 critic；每个 agent 的策略只用局部观测。 |
| IPPO | "独立 PPO" | 每个 agent 各跑各的 PPO。简单基线；常被低估。 |
| MAPPO | "多 agent PPO" | 带以全局状态为条件的中心化价值函数的 PPO。 |
| QMIX | "单调价值分解" | `Q_tot = f_monotone(Q_1, …, Q_n)`，允许去中心化 argmax。 |
| COMA | "反事实多 agent" | 优势 = 我的 Q 减去对我的动作边缘化后的期望 Q。 |
| 自我对弈 | "agent 对阵过去的自己" | 单 agent，两个角色；零和游戏的标准做法。 |
| 联赛对弈 | "种群训练" | 缓存过去的策略，从池里采样对手；处理策略循环。 |

## 延伸阅读

- [Lowe et al. (2017). Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments (MADDPG)](https://arxiv.org/abs/1706.02275) —— 带中心化 critic 的 CTDE。
- [Foerster et al. (2017). Counterfactual Multi-Agent Policy Gradients (COMA)](https://arxiv.org/abs/1705.08926) —— 用于信用分配的反事实基线。
- [Rashid et al. (2018). QMIX: Monotonic Value Function Factorisation](https://arxiv.org/abs/1803.11485) —— 带单调性的价值分解。
- [Yu et al. (2022). The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games (MAPPO)](https://arxiv.org/abs/2103.01955) —— PPO 在 MARL 上意外地强。
- [Vinyals et al. (2019). Grandmaster level in StarCraft II using multi-agent reinforcement learning (AlphaStar)](https://www.nature.com/articles/s41586-019-1724-z) —— 大规模联赛对弈。
- [Silver et al. (2017). Mastering the game of Go without human knowledge (AlphaGo Zero)](https://www.nature.com/articles/nature24270) —— 零和博弈里的纯自我对弈。
- [Sutton & Barto (2018). Ch. 15 — Neuroscience & Ch. 17 — Frontiers](http://incompleteideas.net/book/RLbook2020.pdf) —— 包含教科书对多 agent 场景以及 CTDE 所要解决的非平稳性问题的简短处理。
- [Zhang, Yang & Başar (2021). Multi-Agent Reinforcement Learning: A Selective Overview](https://arxiv.org/abs/1911.10635) —— 涵盖合作、竞争、混合 MARL 及收敛结果的综述。
