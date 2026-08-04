# 深度 Q 网络（DQN）

> 2013 年：Mnih 在原始像素上训了一个 Q-learning 网络，在七个 Atari 游戏上击败了所有经典 RL agent。2015 年：扩展到 49 个游戏，登上 Nature，点燃了深度 RL 时代。DQN 就是 Q-learning 加上三个让函数近似稳定的技巧。

**类型：** Build
**语言：** Python
**前置要求：** Phase 3 · 03（反向传播）、Phase 9 · 04（Q-learning、SARSA）
**预计时间：** ~75 分钟

## 问题背景

表格 Q-learning 需要为每个 (状态, 动作) 对存一个单独的 Q 值。一个国际象棋棋盘有约 10⁴³ 个状态。一帧 Atari 是 210×160×3 = 100800 个特征。表格 RL 在几千个状态时就撑不住了，更别提十亿级。

修法事后看来很显然：把 Q 表换成神经网络 `Q(s, a; θ)`。但"事后看来显然"花了几十年。Q-learning 配上朴素函数近似会发散，原因是"致命三元组"——函数近似 + 自举 + 离策略学习。Mnih 等人（2013、2015）找出了三个让学习稳定下来的工程技巧：

1. **经验回放**给转移去相关。
2. **目标网络**冻住自举目标。
3. **奖励裁剪**归一化梯度量级。

Atari 上的 DQN 第一次让单一架构、单一套超参数，从原始像素出发解决了几十个控制问题。从那以后造出来的每个"深度 RL"——DDQN、Rainbow、Dueling、Distributional、R2D2、Agent57——都叠在这个三技巧底座之上。

## 核心概念

![DQN training loop: env, replay buffer, online net, target net, Bellman TD loss](../assets/dqn.svg)

**目标函数。** DQN 在一个神经 Q 函数上最小化单步 TD 损失：

`L(θ) = E_{(s,a,r,s')~D} [ (r + γ max_{a'} Q(s', a'; θ^-) - Q(s, a; θ))² ]`

`θ` = 在线网络，每步用梯度下降更新。`θ^-` = 目标网络，周期性地从 `θ` 拷贝（每约 10000 步）。`D` = 过往转移的回放缓冲。

**三个技巧，按重要性排序：**

**经验回放。** 一个约 `10⁶` 条转移的环形缓冲。每个训练步均匀随机采一个 minibatch。这打破了时间相关性（连续帧几乎一样），让网络能从稀有的有奖励转移上多次学习，并给连续的梯度更新去相关。没有它，神经网络配同策略 TD 在 Atari 上会发散。

**目标网络。** 在贝尔曼方程两侧用同一个网络 `Q(·; θ)`，会让目标每次更新都在动——"追自己的尾巴"。修法：留一个权重冻住的第二网络 `Q(·; θ^-)`。每 `C` 步，把 `θ → θ^-` 拷贝一次。这一次性把回归目标稳定上千个梯度步。软更新 `θ^- ← τ θ + (1-τ) θ^-`（DDPG、SAC 里用）是一个更平滑的变体。

**奖励裁剪。** Atari 的奖励量级从 1 到 1000+ 不等。裁剪到 `{-1, 0, +1}` 能阻止任何单个游戏主导梯度。当奖励量级要紧时这么做就错了；对只看符号的 Atari 没问题。

**Double DQN。** Hasselt（2016）修了最大化偏差：用在线网络*选*动作，用目标网络*评估*它。

`target = r + γ Q(s', argmax_{a'} Q(s', a'; θ); θ^-)`

即插即用，稳定地更好。默认就用它。

**其他改进（Rainbow，2017）：** 优先回放（更多采样高 TD 误差的转移）、dueling 架构（分开 `V(s)` 和优势头）、噪声网络（学习式探索）、n-步回报、分布式 Q（C51/QR-DQN）、多步自举。每个加几个百分点；增益大致可加。

```figure
f3-dqn-stability
```

## 动手构建

这里的代码只用标准库、不依赖 numpy——我们在一个极小的连续 GridWorld 上手搓了一个单隐层 MLP，所以每个训练步在微秒级跑完。算法和大规模的 Atari DQN 完全一致。

### 第 1 步：回放缓冲

```python
class ReplayBuffer:
    def __init__(self, capacity):
        self.buf = []
        self.capacity = capacity
    def push(self, s, a, r, s_next, done):
        if len(self.buf) == self.capacity:
            self.buf.pop(0)
        self.buf.append((s, a, r, s_next, done))
    def sample(self, batch, rng):
        return rng.sample(self.buf, batch)
```

Atari 用约 50000 容量；我们的玩具环境 5000 就够。

### 第 2 步：一个极小的 Q 网络（手写 MLP）

```python
class QNet:
    def __init__(self, n_in, n_hidden, n_actions, rng):
        self.W1 = [[rng.gauss(0, 0.3) for _ in range(n_in)] for _ in range(n_hidden)]
        self.b1 = [0.0] * n_hidden
        self.W2 = [[rng.gauss(0, 0.3) for _ in range(n_hidden)] for _ in range(n_actions)]
        self.b2 = [0.0] * n_actions
    def forward(self, x):
        h = [max(0.0, sum(w * xi for w, xi in zip(row, x)) + b) for row, b in zip(self.W1, self.b1)]
        q = [sum(w * hi for w, hi in zip(row, h)) + b for row, b in zip(self.W2, self.b2)]
        return q, h
```

前向：线性 → ReLU → 线性。这就是整个网络。

### 第 3 步：DQN 更新

```python
def train_step(online, target, batch, gamma, lr):
    grads = zeros_like(online)
    for s, a, r, s_next, done in batch:
        q, h = online.forward(s)
        if done:
            y = r
        else:
            q_next, _ = target.forward(s_next)
            y = r + gamma * max(q_next)
        td_error = q[a] - y
        accumulate_grads(grads, online, s, h, a, td_error)
    apply_sgd(online, grads, lr / len(batch))
```

骨架就是第 04 课的 Q-learning，只有两处不同：（a）我们对一个可微的 `Q(·; θ)` 做反向传播，而不是索引一张表；（b）目标用的是 `Q(·; θ^-)`。

### 第 4 步：外层循环

每个 episode，对 `Q(·; θ)` 做 ε-greedy 行动，把转移推进缓冲，采一个 minibatch，走一个梯度步，周期性地同步 `θ^- ← θ`。模式如下：

```python
for episode in range(N):
    s = env.reset()
    while not done:
        a = epsilon_greedy(online, s, epsilon)
        s_next, r, done = env.step(s, a)
        buffer.push(s, a, r, s_next, done)
        if len(buffer) >= batch:
            train_step(online, target, buffer.sample(batch), gamma, lr)
        if steps % sync_every == 0:
            target = copy(online)
        s = s_next
```

在我们这个用 16 维 one-hot 状态的小 GridWorld 上，agent 约 500 个 episode 学到近最优策略。在 Atari 上，把它放大到 2 亿帧，再加一个 CNN 特征提取器。

## 注意事项

- **致命三元组。** 函数近似 + 离策略 + 自举可能发散。DQN 用目标网络 + 回放来缓解；两个都别拿掉。
- **探索。** ε 必须衰减，通常在训练前约 10% 里从 1.0 降到 0.01。早期探索不够，Q 网络会收敛到一个局部盆地。
- **高估。** 对有噪声的 Q 取 `max` 会向上偏。生产中永远用 Double DQN。
- **奖励尺度。** 裁剪或归一化奖励；梯度量级正比于奖励量级。
- **回放缓冲冷启动。** 缓冲攒到几千条转移之前别训练。在约 20 个样本上的早期梯度会过拟合。
- **目标同步频率。** 太频繁 ≈ 没有目标网络；太不频繁 ≈ 目标过时。Atari DQN 用 10000 个环境步。经验法则：每约 1/100 训练视野同步一次。
- **观测预处理。** Atari DQN 堆叠 4 帧让状态满足马尔可夫。任何带速度信息的环境都需要堆帧或循环状态。

## 实际使用

到了 2026 年，DQN 很少是 SOTA，但仍是离策略算法的参考基准：

| 任务 | 首选方法 | 为什么不用 DQN？ |
|------|------------------|--------------|
| 离散动作、类 Atari | Rainbow DQN 或 Muesli | 同一框架，更多技巧。 |
| 连续控制 | SAC / TD3（Phase 9 · 07） | DQN 没有策略网络。 |
| 同策略 / 高吞吐 | PPO（Phase 9 · 08） | 无回放缓冲；更易扩展。 |
| 离线 RL | CQL / IQL / Decision Transformer | 保守 Q 目标，没有自举爆炸。 |
| 大离散动作空间（推荐） | 带动作嵌入的 DQN，或 IMPALA | 可以；修饰很重要。 |
| LLM RL | PPO / GRPO | 序列级而非步级；不同的损失。 |

教训仍然通用。回放和目标网络出现在 SAC、TD3、DDPG、SAC-X、AlphaZero 的自我对弈缓冲，以及每个离线 RL 方法里。奖励裁剪以 PPO 里的优势归一化形式活了下来。这个架构就是蓝图。

## 拿去用

存为 `outputs/skill-dqn-trainer.md`：

```markdown
---
name: dqn-trainer
description: Produce a DQN training config (buffer, target sync, ε schedule, reward clipping) for a discrete-action RL task.
version: 1.0.0
phase: 9
lesson: 5
tags: [rl, dqn, deep-rl]
---

Given a discrete-action environment (observation shape, action count, horizon, reward scale), output:

1. Network. Architecture (MLP / CNN / Transformer), feature dim, depth.
2. Replay buffer. Capacity, minibatch size, warmup size.
3. Target network. Sync strategy (hard every C steps or soft τ).
4. Exploration. ε start / end / schedule length.
5. Loss. Huber vs MSE, gradient clip value, reward clipping rule.
6. Double DQN. On by default unless explicit reason to disable.

Refuse to ship a DQN with no target network, no replay buffer, or ε held at 1. Refuse continuous-action tasks (route to SAC / TD3). Flag any reward range > 10× per-step mean as needing clipping or scale normalization.
```

## 练习

1. **简单。** 跑 `code/main.py`。画出每 episode 的回报曲线。多少个 episode 后滑动均值超过 -10？
2. **中等。** 禁用目标网络（贝尔曼目标两侧都用在线网络）。测一下训练的不稳定性——回报是震荡还是发散？
3. **困难。** 加上 Double DQN：用在线网络挑 `argmax a'`，用目标网络评估。在一个噪声奖励 GridWorld 上，对比有无 Double DQN 时 1000 个 episode 后 `Q(s_0, best_a)` 相对真实 `V*(s_0)` 的偏差。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| DQN | "深度 Q-learning" | 配神经 Q 函数、回放缓冲、目标网络的 Q-learning。 |
| 经验回放 | "打乱的转移" | 每个梯度步均匀采样的环形缓冲；给数据去相关。 |
| 目标网络 | "冻住的自举" | 在贝尔曼目标里用的 Q 的周期性拷贝；稳定训练。 |
| 致命三元组 | "RL 为什么发散" | 函数近似 + 自举 + 离策略 = 没有收敛保证。 |
| Double DQN | "最大化偏差的修法" | 在线网络选动作，目标网络评估它。 |
| Dueling DQN | "V 和 A 头" | 分解 Q = V + A - mean(A)；输出相同，梯度流更好。 |
| Rainbow | "所有技巧" | DDQN + PER + dueling + n-步 + 噪声 + 分布式 合一。 |
| PER | "优先回放" | 按 TD 误差量级成比例地采样转移。 |

## 延伸阅读

- [Mnih et al. (2013). Playing Atari with Deep Reinforcement Learning](https://arxiv.org/abs/1312.5602) —— 开启深度 RL 的 2013 NeurIPS workshop 论文。
- [Mnih et al. (2015). Human-level control through deep reinforcement learning](https://www.nature.com/articles/nature14236) —— Nature 论文，49 游戏 DQN。
- [Hasselt, Guez, Silver (2016). Deep Reinforcement Learning with Double Q-learning](https://arxiv.org/abs/1509.06461) —— DDQN。
- [Wang et al. (2016). Dueling Network Architectures](https://arxiv.org/abs/1511.06581) —— dueling DQN。
- [Hessel et al. (2018). Rainbow: Combining Improvements in Deep RL](https://arxiv.org/abs/1710.02298) —— 技巧堆叠的论文。
- [OpenAI Spinning Up — DQN](https://spinningup.openai.com/en/latest/algorithms/dqn.html) —— 清晰的现代讲解。
- [Sutton & Barto (2018). Ch. 9 — On-policy Prediction with Approximation](http://incompleteideas.net/book/RLbook2020.pdf) —— 教科书对"致命三元组"（函数近似 + 自举 + 离策略）的处理，DQN 的目标网络和回放缓冲就是为驯服它而设计的。
- [CleanRL DQN implementation](https://docs.cleanrl.dev/rl-algorithms/dqn/) —— 消融研究里用的参考单文件 DQN；适合和本课的从零版本对照着读。
