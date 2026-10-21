---
id: reinforcement-learning
title: 强化学习
subtitle: MDP、价值方法、策略梯度、PPO、RLHF 与 GRPO。第 9 阶段的公式、更新代码与诊断方法。
hue: 75
sources: phases/09-reinforcement-learning/01-mdps-states-actions-rewards, phases/09-reinforcement-learning/02-dynamic-programming, phases/09-reinforcement-learning/03-monte-carlo-methods, phases/09-reinforcement-learning/04-q-learning-sarsa, phases/09-reinforcement-learning/05-dqn, phases/09-reinforcement-learning/06-policy-gradients-reinforce, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c, phases/09-reinforcement-learning/08-ppo, phases/09-reinforcement-learning/09-reward-modeling-rlhf, phases/09-reinforcement-learning/12-rl-for-games
code: RL
source_hash: 423a98922bbe6a92
---

## PPO 训练循环
type: architecture
from: phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/08-ppo/code/main.py, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md

```arch
node | envs | 1,1 | N 个并行环境 | 各执行 T 步
node | actor | 2,1 | Actor | softmax 策略
node | buf | 1,2 | 轨迹缓冲区 | s, a, r, log_pi_old
node | critic | 1,3 | Critic | 每状态的 v_old
node | gae | 3,2 | GAE | 优势、回报
node | clip | 3,1 | 裁剪替代目标 | K 个 epoch，小批量
node | diag | 4,1 | 诊断 | 平均 KL、裁剪比例
edge | actor | envs | 动作
edge | envs | buf | 转移
edge | critic | buf | 价值
edge | buf | gae |
edge | gae | clip | 优势
edge | clip | actor | 更新
edge | clip | diag |
```

## RLHF 三阶段
type: flow
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md

1. **SFT**：使用人工示范微调基座模型。
2. **偏好数据**：收集 prompt、chosen、rejected 三元组。
3. **奖励模型**：在 SFT 模型上用 Bradley-Terry 损失训练标量输出头。
4. **策略与参考**：策略从 SFT 开始，冻结一个副本作为参考。
5. **奖励**：RM 分数减去相对参考的 KL 乘以 $\beta$。
6. **PPO**：依据该奖励更新 token 级策略。
7. **监控**：关注平均 KL，超过约 5 至 10 时开始出现漂移或奖励投机。

## 价值公式
type: concepts
from: phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md, phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md

- **MDP**：满足马尔可夫性质的五元组 $(S, A, P, R, \gamma)$。
- **回报**：$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \ldots$
- **贝尔曼 V**：$V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s', r} P(s', r \mid s, a) [r + \gamma V^\pi(s')]$
- **价值迭代**：$V(s) \leftarrow \max_a \sum_{s',r} P(s',r \mid s,a) [r + \gamma V(s')]$
- **TD(0)**: $V(s) \leftarrow V(s) + \alpha [r + \gamma V(s') - V(s)]$
- **Q-learning**: $Q(s, a) \leftarrow Q(s, a) + \alpha [r + \gamma \max_{a'} Q(s', a') - Q(s, a)]$
- **SARSA**: $Q(s, a) \leftarrow Q(s, a) + \alpha [r + \gamma Q(s', a') - Q(s, a)]$
- **DQN 损失**：在重放样本上计算 $(r + \gamma \max_{a'} Q(s', a'; \theta^-) - Q(s, a; \theta))^2$。

## 策略公式
type: concepts
from: phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

- **策略梯度**：$\nabla J(\theta) = \mathbb{E}[ \sum_t G_t \cdot \nabla_\theta \log \pi_\theta(a_t \mid s_t) ]$
- **TD 优势**：$\delta_t = r_{t+1} + \gamma V(s_{t+1}) - V(s_t)$
- **GAE**: $A_t^{\text{GAE}} = \sum_{l=0}^{\infty} (\gamma \lambda)^l \delta_{t+l}$
- **PPO 比率**：$r_t(\theta) = \pi_\theta(a_t \mid s_t) / \pi_{\theta_{\text{old}}}(a_t \mid s_t)$
- **PPO 裁剪**：$\mathbb{E}_t [ \min( r_t A_t, \mathop{\mathrm{clip}}(r_t, 1-\epsilon, 1+\epsilon) A_t ) ]$
- **Bradley-Terry**: $L(\phi) = -\mathbb{E}[ \log \sigma(R_\phi(x, y_+) - R_\phi(x, y_-)) ]$
- **RLHF 奖励**：$R_\phi(x, y) - \beta \cdot \mathrm{KL}(\pi_\theta \Vert \pi_{\text{ref}})$
- **GRPO 优势**：同一 prompt 的 $G$ 个样本上计算 $A_i = (r_i - \text{mean}_r) / \text{std}_r$。

## 选择方法
type: command-table
from: phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

| 场景 | 方法 |
|---|---|
| 小型表格 MDP，已知模型 | 价值迭代或策略迭代 |
| 小型表格 MDP，只有样本 | Q-learning |
| 同策略，安全要求高 | SARSA 或 Expected SARSA |
| 高维状态，离散动作 | DQN，生产使用 Double DQN |
| 连续控制 | 高斯策略 PPO，或 SAC、TD3 |
| 依据偏好对齐 LLM | 先 DPO，再带 KL 惩罚的 RLHF-PPO |
| LLM 数学与代码推理 | 带验证器奖励的 GRPO |
| 双人棋类 | AlphaZero 或 MuZero |

## 更新代码
type: task-table
from: phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

| 任务 | 代码 |
|---|---|
| 逆向扫描计算回报 | `G = r + gamma * G` |
| epsilon 贪心探索 | `if random() < epsilon: return choice(ACTIONS)` |
| Q-learning 目标 | `target = r + (gamma * max(Q[s_next].values()) if not done else 0.0)` |
| SARSA 目标 | `target = r + (gamma * Q[s_next][a_next] if not done else 0.0)` |
| TD 步骤 | `Q[s][a] += alpha * (target - Q[s][a])` |
| 同步 DQN 目标网络 | `if steps % sync_every == 0: target = copy(online)` |
| 带 KL 的 RLHF 奖励 | `reward = dot(w, bag([token])) - beta * kl(probs, probs_ref)` |
| GRPO 组优势 | `advs = [(r - mean_r) / std_r for r in rewards]` |

## PPO 裁剪更新
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/08-ppo/code/main.py

```python
for rec, adv in zip(mb, adv_norm):                 # 每个小批量内归一化优势
    x = rec["x"]
    probs = softmax(logits(theta, x))              # 当前策略
    logp = math.log(max(probs[rec["a"]], 1e-12))
    ratio = math.exp(logp - rec["log_pi_old"])     # 新概率除以旧概率
    clipped = (adv > 0 and ratio > 1 + eps) or (adv < 0 and ratio < 1 - eps)
    pg_scale = 0.0 if clipped else ratio * adv     # 被裁剪时梯度为零
    for action in range(N_ACTIONS):
        grad_logpi = (1.0 if action == rec["a"] else 0.0) - probs[action]
        for j in range(N_FEAT):
            theta[action][j] += lr_a * pg_scale * grad_logpi * x[j]
    err = rec["ret"] - value(w, x)                 # critic 误差
    for j in range(N_FEAT):
        w[j] += lr_v * err * x[j]                  # critic 更新
```

## 默认值与数值
type: defaults
from: phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 折扣 $\gamma$ | 0.99 | 时间跨度约 $1 / (1 - \gamma)$，即 100 步 |
| 表格 $\alpha$ 与 $\epsilon$ | 0.1 | 4x4 GridWorld 的 Q-learning 与 SARSA |
| PPO 裁剪 $\epsilon$ | 0.2 | 0.1 过于保守，0.3 及以上不稳定 |
| 价值系数 $c_v$ | 0.5 | PPO 与 A2C |
| 熵系数 $c_e$ | 0.01 | PPO 与 A2C |
| GAE $\lambda$ | 0.95 | 0 为 TD，1 为 MC |
| RLHF KL $\beta$ | 0.01-0.05 | 使策略接近 SFT |
| GRPO 组大小 $G$ | 8 | 常见为 8 至 64，小于 4 噪声较大 |

## 故障排查
type: troubleshooting
from: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 平均 KL 超过 0.1 | 策略远离旧策略 | 降低 `K_EPOCHS` 或 `LR` |
| 裁剪比例接近 0 | 从未触发裁剪 | 提高 `LR` 或 `K_EPOCHS` |
| 裁剪比例至少 0.5 | 对采样轨迹过拟合 | 降低 `LR` 或 `K_EPOCHS` |
| 奖励上升，人工评估下降 | 对 RM 奖励投机 | 早停、提高 $\beta$、扩展 RM 数据 |
| 响应越来越长 | RM 奖励长度 | 使用长度归一化奖励 |
| Q 值过高 | 带噪 Q 的最大值偏差 | Double DQN |
| DQN 发散 | 致命三角组合 | 保留目标网络和重放缓冲区 |
| 策略停止探索 | 熵坍塌 | 使用 $c_e > 0$ 的熵奖励 |

## 缩略语
type: glossary
from: phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

- **MDP**：马尔可夫决策过程，包含状态、动作、转移、奖励与折扣。
- **TD**：时序差分，依据一步自举目标更新。
- **DQN**：深度 Q 网络，Q-learning 加重放、目标网络和奖励裁剪。
- **A2C**：优势 Actor-Critic，同步批量并行环境。
- **GAE**：广义优势估计，TD 残差的加权和。
- **PPO**：近端策略优化，裁剪重要性比率，多轮更新。
- **RLHF**：基于人类反馈的强化学习，依次执行 SFT、RM、PPO。
- **GRPO**：组相对策略优化，无 critic 的 PPO 变体。

## 问答
type: qa
from: phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md, phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md, phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md

- **同策略还是异策略？** 同策略从自己的数据学习，异策略从其他策略的数据学习。
- **Q-learning 还是 SARSA？** Q-learning 对最大值自举，SARSA 使用实际下一动作，更谨慎。
- **为何减去基线？** 保持梯度无偏并降低方差。
- **RLHF 中为何加入 KL？** 让策略保持在 RM 训练数据附近。
- **推理为何使用 GRPO？** 无价值网络，内存减半，按 prompt 归一化适合稀疏奖励。

## 提示
type: tips
from: phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md, phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md, phases/09-reinforcement-learning/05-dqn/docs/zh.md, phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md, phases/09-reinforcement-learning/08-ppo/docs/zh.md

- 写训练循环前，先写清 MDP 五元组。
- 用 DP 价值 $V^{\ast}$ 检查表格 agent。
- 在训练前 10% 过程中将 $\epsilon$ 从 1.0 衰减至 0.01。
- 每批将优势归一化到均值零、标准差一。
- 用 exp(log_new 减 log_old) 计算比率，保持数值稳定。
- PPO 可从 $K = 10$ 个 epoch、每小批 64 个样本开始。
