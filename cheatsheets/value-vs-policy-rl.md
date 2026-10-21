---
id: value-vs-policy-rl
title: 价值方法与策略方法对比
code: VM
subtitle: 对比 Q-learning、SARSA、DQN、REINFORCE、A2C 与 PPO。目标、默认值、诊断和修正方法。
hue: 150
sources: phases/09-reinforcement-learning/04-q-learning-sarsa, phases/09-reinforcement-learning/05-dqn, phases/09-reinforcement-learning/06-policy-gradients-reinforce, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c, phases/09-reinforcement-learning/08-ppo
source_hash: f897f8fbb5421e0b
---

## 四类方法对比
type: comparison
span: 2
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

| 因素 | Q-learning、SARSA | DQN | REINFORCE | A2C、PPO |
|---|---|---|---|---|
| 学习对象 | Q 表 | 神经网络 $Q(s, a; \theta)$ | 策略 $\pi_\theta(a \mid s)$ | Actor $\pi_\theta$ 加 critic $V_\phi(s)$ |
| 动作选择 | 对 Q 做 ε-贪心 | 对 Q 做 ε-贪心 | 从 $\pi_\theta$ 采样 | 从 $\pi_\theta$ 采样 |
| 数据 | Q-learning 异策略，SARSA 同策略 | 异策略，回放缓冲区 | 同策略，一次更新 | A2C 一次更新，PPO K 个 epoch |
| 目标 | $r + \gamma \max_{a'} Q(s', a')$ | 相同，但来自目标网络 $\theta^-$ | 回报 $G_t$ | GAE 优势 |
| 偏差与方差 | 自举偏差，低方差 | max 引入向上偏差 | 无偏，高方差 | critic 偏差，方差低得多 |
| 连续动作 | 否 | 否，改用 SAC 或 TD3 | 是，高斯策略 | 是，高斯策略 |
| 教学 GridWorld | 约 2,000 回合 | 约 500 回合 | 带基线约 500 回合 | PPO 使用 ε 0.2、K 4 |

## 方法选型
type: tips
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

- Q-learning：小型表格环境。直接学习最优策略。
- SARSA 或 Expected SARSA：安全关键的同策略任务。探索期间保持保守。
- DQN：高维状态、离散动作。是经典异策略算法。
- REINFORCE：需要理解，很少直接运行。`loss = -advantage * log_prob` 就是带基线的 REINFORCE。
- A2C：GPU 上批量并行环境。2026 年基于 GPU 的 A2C 占优于 A3C。
- PPO：MuJoCo、Atari 与 LLM 的 RLHF 默认选择。
- SAC 或 TD3：连续控制。DQN 没有策略网络。
- GRPO：推理 LLM。不带 critic 的 PPO 变体。

## DQN 训练循环
type: architecture
from: phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/05-dqn/code/main.py

```arch
node | env | 1,1 | 环境 | 4x4 GridWorld | client
node | buf | 2,1 | 回放缓冲区 | 容量 2000 | store
node | online | 3,1 | 在线网络 | 权重 theta | model
node | target | 3,2 | 目标网络 | 冻结副本 | model
node | loss | 4,1 | train_step | TD 误差平方 | process
edge | env | buf | 状态转移
edge | buf | online | 小批次 32
edge | online | env | ε-贪心动作
edge | target | loss | y = r + γ max
edge | online | loss | q[a]
edge | online | target | 每 200 步克隆
```

## PPO 训练循环
type: flow
from: phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/08-ppo/code/main.py

1. **采样轨迹**：在 N 个并行环境中收集 N 乘 T 次状态转移。
2. **快照**：采样时存储每个动作的 `log_pi_old`。
3. **GAE**：计算优势，固定后逐批归一化。
4. **训练轮次**：执行 K 个 epoch，每轮将缓冲区打乱为小批次。
5. **比率**：`ratio = exp(logp - rec["log_pi_old"])`。
6. **裁剪**：样本沿有利方向越过 1 ± ε 后，梯度为零。
7. **损失**：加入价值 MSE 与熵奖励，执行梯度更新。
8. **丢弃**：丢弃本轮轨迹，重新采样。

## 价值侧：TD 目标
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/04-q-learning-sarsa/code/main.py

```python
a = epsilon_greedy(Q, s, rng, epsilon)     # 行为动作
s_next, r, done = step(s, a)
best_next = max(Q[s_next].values())        # Q-learning：贪心取最大值
target = r + gamma * best_next
a_next = epsilon_greedy(Q, s_next, rng, epsilon)
target = r + gamma * Q[s_next][a_next]     # SARSA：实际采取的下一个动作
Q[s][a] += alpha * (target - Q[s][a])      # 两者使用相同 TD 更新
Q[s][a] += alpha * (r - Q[s][a])           # 终止步，不自举
```

## 策略侧：梯度、GAE、裁剪
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/06-policy-gradients-reinforce/code/main.py, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/code/main.py, phases/09-reinforcement-learning/08-ppo/code/main.py

```python
G = r + gamma * G                           # 从后向前计算后续回报
grad = (1.0 if i == a else 0.0) - probs[i]  # onehot 减概率
theta[i][j] += lr * adv * grad * x[j]       # REINFORCE 梯度上升
delta = traj[t]["r"] + gamma * next_v - traj[t]["v"]  # TD 残差
gae = delta + gamma * lam * gae             # lam=0.95 的 GAE
ratio = math.exp(logp - rec["log_pi_old"])  # PPO 重要性比率
clipped = (adv > 0 and ratio > 1 + eps) or (adv < 0 and ratio < 1 - eps)
pg_scale = 0.0                              # 被裁剪的样本，无梯度
```

## 代码任务
type: task-table
from: phases/09-reinforcement-learning/04-q-learning-sarsa/code/main.py, phases/09-reinforcement-learning/05-dqn/code/main.py, phases/09-reinforcement-learning/06-policy-gradients-reinforce/code/main.py, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/code/main.py, phases/09-reinforcement-learning/08-ppo/code/main.py

| 任务 | 代码 |
|---|---|
| 表格 SARSA | `sarsa(episodes, alpha=0.1, gamma=0.99)` |
| 表格 Q-learning | `q_learning(episodes, alpha=0.1, gamma=0.99)` |
| 一次 DQN 梯度更新 | `train_step(online, target, mb, gamma, lr)` |
| 同步目标网络 | `target = clone(online)` |
| 带基线的 REINFORCE | `reinforce(episodes, use_baseline=True)` |
| GAE 优势 | `gae_advantages(traj, gamma=0.99, lam=0.95)` |
| 训练 A2C | `actor_critic(episodes, lam=0.95)` |
| 带诊断的 PPO 更新 | `mean_kl, clip_frac = ppo_update(...)` |

## 关键公式
type: concepts
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

- **TD 误差**：$\delta = r + \gamma V(s') - V(s)$
- **SARSA 目标**：$r + \gamma Q(s', a')$，使用实际采取的下一个动作。
- **DQN 损失**：$(r + \gamma \max_{a'} Q(s', a'; \theta^-) - Q(s, a; \theta))^2$
- **Double DQN**：$r + \gamma Q(s', \arg\max_{a'} Q(s', a'; \theta); \theta^-)$
- **策略梯度**：$\nabla J = \mathbb{E}[G_t \nabla_\theta \log \pi_\theta(a_t \mid s_t)]$
- **优势**：$A = G - \hat{V}(s)$。期望相同，方差更低。
- **GAE**：$A_t = \sum_l (\gamma \lambda)^l \delta_{t+l}$。λ 为 0 时是 TD，为 1 时是 MC。
- **PPO 裁剪**：$\min(r_t A_t, \mathrm{clip}(r_t, 1-\epsilon, 1+\epsilon) A_t)$

## 默认值
type: defaults
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 表格 α 与 ε | 0.1 | 将 α 固定在 [0.05, 0.3] |
| 折扣 γ | 0.99 | 课程代码默认值 |
| DQN 目标同步 | 10000 | Atari 环境步数 |
| GAE λ | 0.95 | 2026 年默认值 |
| 价值权重 `c_v` | 0.5 | A2C 与 PPO |
| 熵权重 `c_e` | 0.01 | A2C 与 PPO |
| PPO 裁剪 ε | 0.2 | 0.1 保守，0.3+ 不稳定 |
| PPO epoch 数 K | 10 | 小批次为 64 |

## 故障排查
type: troubleshooting
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Q 值高估 | 对含噪 Q 取 `max` 导致向上偏差 | Double DQN 或 Double Q-learning |
| DQN 发散 | 致命三元组 | 保留目标网络和回放缓冲区 |
| DQN 早期过拟合 | 仅约 20 个样本就计算梯度 | 等待数千次状态转移 |
| 策略停止探索 | 熵坍缩 | 加入熵奖励，使 `c_e` 大于 0 |
| 策略梯度爆炸 | 回报过大 | 每批将 G 归一化至约 N(0, 1) |
| Actor 学到噪声 | Critic 仍是随机的 | 先预热 critic，降低 actor LR |
| PPO 平均 KL 超过 0.1 | epoch 太多或 LR 太高 | 减小 `K_EPOCHS` 或 `LR` |
| 裁剪比例接近 0 | 裁剪从不触发 | 增大 `LR` 或 `K_EPOCHS` |

## 缩写
type: glossary
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

- **TD**：时序差分。每步根据自举目标更新。
- **SARSA**：元组 (s, a, r, s', a')。同策略 TD。
- **GLIE**：无限探索下极限贪心，描述 ε 的条件。
- **DQN**：使用神经网络 Q、回放缓冲区与目标网络的 Q-learning。
- **GAE**：广义优势估计。n 步优势的加权和。
- **A2C、A3C**：同步批量或异步线程式 actor-critic。
- **TRPO**：信赖域策略优化。KL 约束、共轭梯度。
- **PPO**：近端策略优化。裁剪重要性比率。

## 问答
type: qa
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md

- **Q-learning 为何是异策略？** 无论 agent 实际采取什么动作，`max` 都假定贪心策略。
- **SARSA 为何在悬崖任务中更安全？** 它将探索噪声计入 Q 值。
- **价值方法为何不擅长连续动作？** 对十维力矩做 `argmax` 很难。
- **基线为何无偏？** 基线乘以对数策略梯度的期望为 0。
- **PPO 为何能复用轨迹？** 策略漂移过大时，裁剪停止更新。
- **PPO 最常见错误？** 符号反了。应最小化裁剪代理目标的负值。
