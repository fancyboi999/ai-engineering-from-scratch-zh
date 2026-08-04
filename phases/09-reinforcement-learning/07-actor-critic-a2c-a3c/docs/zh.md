# Actor-Critic —— A2C 与 A3C

> REINFORCE 噪声大。加一个学习 `V̂(s)` 的 critic，从回报里减掉它，你就得到一个期望相同但方差低得多的优势。这就是 actor-critic。A2C 同步地跑它；A3C 跨线程跑它。两者都是每个现代深度 RL 方法的心智模型。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 04（TD 学习）、Phase 9 · 06（REINFORCE）
**预计时间：** ~75 分钟

## 问题背景

原版 REINFORCE 能用，但它的方差糟透了。蒙特卡洛回报 `G_t` 在不同 episode 间能摆动十倍。把这个噪声乘上 `∇ log π` 再求平均，得到的梯度估计器要花上千个 episode 才能把策略推动同样的距离，而你用少得多的 DQN 更新就能做到。

方差来自用原始回报。如果你减掉一个基线 `b(s_t)`——任何关于状态的函数，包括一个学到的价值——期望不变而方差下降。最好的可处理基线是 `V̂(s_t)`。现在乘上 `∇ log π` 的那个量就是*优势*：

`A(s, a) = G - V̂(s)`

一个动作如果产出高于平均的回报就是好的；低于就是坏的。带学习式 critic 的 REINFORCE 就是 *actor-critic*。critic 给 actor 当一个低方差的老师。这就是 2015 年之后每个深度策略方法（A2C、A3C、PPO、SAC、IMPALA）。

## 核心概念

![Actor-critic: policy net plus value net, TD residual as advantage](../assets/actor-critic.svg)

**两个网络，一个共享损失：**

- **Actor** `π_θ(a | s)`：策略。采样来行动。用策略梯度训练。
- **Critic** `V_φ(s)`：估计从某状态出发的期望回报。训练目标是最小化 `(V_φ(s) - target)²`。

**优势。** 两种标准形式：

- *MC 优势：* `A_t = G_t - V_φ(s_t)`。无偏，方差更高。
- *TD 优势：* `A_t = r_{t+1} + γ V_φ(s_{t+1}) - V_φ(s_t)`。有偏（用了 `V_φ`），方差低得多。也叫 *TD 残差* `δ_t`。

**n-步优势。** 在两者之间插值：

`A_t^{(n)} = r_{t+1} + γ r_{t+2} + … + γ^{n-1} r_{t+n} + γ^n V_φ(s_{t+n}) - V_φ(s_t)`

`n = 1` 是纯 TD。`n = ∞` 是 MC。大多数实现 Atari 用 `n = 5`，MuJoCo 上的 PPO 用 `n = 2048`。

**广义优势估计（GAE）。** Schulman 等人（2016）提出对所有 n-步优势做指数加权平均：

`A_t^{GAE} = Σ_{l=0}^{∞} (γλ)^l δ_{t+l}`

其中 `λ ∈ [0, 1]`。`λ = 0` 是 TD（低方差、高偏差）。`λ = 1` 是 MC（高方差、无偏）。`λ = 0.95` 是 2026 年的默认——调到偏差/方差旋钮停在你想要的地方。

**A2C：同步优势 actor-critic。** 在 `N` 个并行环境上收集 `T` 步。为每一步算优势。在合并的 batch 上更新 actor 和 critic。重复。A3C 那个更简单、更易扩展的兄弟。

**A3C：异步优势 actor-critic。** Mnih 等人（2016）。开 `N` 个 worker 线程，每个跑一个环境。每个 worker 在自己的 rollout 上本地算梯度，然后异步地把它们应用到一个共享参数服务器上。不需要回放缓冲——worker 靠跑不同轨迹来去相关。A3C 证明了你能在 CPU 上大规模训练。到了 2026 年，基于 GPU 的 A2C（批量并行环境）占主导，因为 GPU 想要大 batch。

**合并损失。**

`L(θ, φ) = -E[ A_t · log π_θ(a_t | s_t) ]  +  c_v · E[(V_φ(s_t) - G_t)²]  -  c_e · E[H(π_θ(·|s_t))]`

三项：策略梯度损失、价值回归、熵奖励。`c_v ~ 0.5`、`c_e ~ 0.01` 是经典的起点。

```figure
actor-critic
```

## 动手构建

### 第 1 步：一个 critic

用 MSE 更新的线性 critic `V_φ(s) = w · features(s)`：

```python
def critic_update(w, x, target, lr):
    v_hat = dot(w, x)
    err = target - v_hat
    for j in range(len(w)):
        w[j] += lr * err * x[j]
    return v_hat
```

在表格环境上 critic 几百个 episode 就收敛。在 Atari 上，把线性 critic 换成共享 CNN 主干 + 价值头。

### 第 2 步：n-步优势

给定一个长度 `T` 的 rollout 和一个自举的末尾 `V(s_T)`：

```python
def compute_advantages(rewards, values, gamma=0.99, lam=0.95, last_value=0.0):
    advantages = [0.0] * len(rewards)
    gae = 0.0
    for t in reversed(range(len(rewards))):
        next_v = values[t + 1] if t + 1 < len(values) else last_value
        delta = rewards[t] + gamma * next_v - values[t]
        gae = delta + gamma * lam * gae
        advantages[t] = gae
    returns = [a + v for a, v in zip(advantages, values)]
    return advantages, returns
```

`returns` 是 critic 目标。`advantages` 是乘上 `∇ log π` 的那个。

### 第 3 步：合并更新

```python
for step_i, (x, a, _r, probs) in enumerate(traj):
    adv = advantages[step_i]
    target_v = returns[step_i]

    # critic
    critic_update(w, x, target_v, lr_v)

    # actor
    for i in range(N_ACTIONS):
        grad_logpi = (1.0 if i == a else 0.0) - probs[i]
        for j in range(N_FEAT):
            theta[i][j] += lr_a * adv * grad_logpi * x[j]
```

同策略，每次更新一个 rollout，actor 和 critic 用各自的学习率。

### 第 4 步：并行化（A3C vs A2C）

- **A3C：** 开 `N` 个线程。每个跑自己的环境和自己的前向传播。周期性地把梯度更新推给一个共享 master。master 上不加锁——竞争没关系，只是多点噪声。
- **A2C：** 在单进程里跑 `N` 个环境实例，把观测堆成一个 `[N, obs_dim]` 的 batch，批量前向、批量反向。GPU 利用率更高，确定性，更好推理。2026 年的默认。

我们的玩具代码为清晰起见是单线程的；改写成批量 A2C 是三行 numpy。

## 注意事项

- **actor 梯度前的 critic 偏差。** 如果 critic 是随机的，它的基线毫无信息量，你就是在纯噪声上训练。在打开策略梯度之前先把 critic 热身几百步，或者用一个慢的 actor 学习率。
- **优势归一化。** 把优势在每个 batch 内归一化到零均值/单位标准差。几乎零成本，却能极大稳定训练。
- **共享主干。** 在图像输入上，actor 和 critic 用一个共享特征提取器。分开的头。共享特征在两个损失上搭便车。
- **同策略契约。** A2C 把数据正好复用一次更新。再多梯度就有偏了（重要性采样修正正是 PPO 加的东西）。
- **熵坍缩。** 没有 `c_e > 0`，策略几百次更新内就变得近确定性、停止探索。
- **奖励尺度。** 优势量级取决于奖励尺度。归一化奖励（如除以滑动标准差），让不同任务间的梯度量级一致。

## 实际使用

A2C/A3C 在 2026 年很少是最终选择，但它们是后面一切所精炼的那个架构：

| 方法 | 与 A2C 的关系 |
|--------|----------------|
| PPO | A2C + 裁剪重要性比率，做多轮更新 |
| IMPALA | A3C + V-trace 离策略修正 |
| SAC（Phase 9 · 07） | 带软价值 critic 的离策略 A2C（下一课） |
| GRPO（Phase 9 · 12） | 去掉 critic 的 A2C —— 组相对优势 |
| DPO | 塌缩成偏好排序损失、无需采样的 A2C |
| AlphaStar / OpenAI Five | A2C + 联赛训练 + 模仿预训练 |

如果你在 2026 年的论文里看到"优势"，想到 actor-critic。

## 拿去用

存为 `outputs/skill-actor-critic-trainer.md`：

```markdown
---
name: actor-critic-trainer
description: Produce an A2C / A3C / GAE configuration for a given environment, with advantage estimation and loss weights specified.
version: 1.0.0
phase: 9
lesson: 7
tags: [rl, actor-critic, gae]
---

Given an environment and compute budget, output:

1. Parallelism. A2C (GPU batched) vs A3C (CPU async) and the number of workers.
2. Rollout length T. Steps per env per update.
3. Advantage estimator. n-step or GAE(λ); specify λ.
4. Loss weights. `c_v` (value), `c_e` (entropy), gradient clip.
5. Learning rates. Actor and critic (separate if using).

Refuse single-worker A2C on environments with horizon > 1000 (too on-policy, too slow). Refuse to ship without advantage normalization. Flag any run with `c_e = 0` and observed entropy < 0.1 as entropy-collapsed.
```

## 练习

1. **简单。** 在 4×4 GridWorld 上用 MC 优势（`G_t - V(s_t)`）训练 actor-critic。和第 06 课的"带滑动均值基线的 REINFORCE"对比样本效率。
2. **中等。** 切换到 TD 残差优势（`r + γ V(s') - V(s)`）。测一下优势 batch 的方差。它下降了多少？
3. **困难。** 实现 GAE(λ)。扫 `λ ∈ {0, 0.5, 0.9, 0.95, 1.0}`。画出最终回报对样本效率。这个任务的偏差/方差甜点在哪？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| Actor | "策略网络" | `π_θ(a|s)`，由策略梯度更新。 |
| Critic | "价值网络" | `V_φ(s)`，通过对回报 / TD 目标做 MSE 回归来更新。 |
| 优势 | "比平均好多少" | `A(s, a) = Q(s, a) - V(s)` 或其估计器。`∇ log π` 的乘子。 |
| TD 残差 | "δ" | `δ_t = r + γ V(s') - V(s)`；单步优势估计。 |
| GAE | "插值旋钮" | n-步优势的指数加权和，由 `λ` 参数化。 |
| A2C | "同步 actor-critic" | 跨环境批量；每个 rollout 走一个梯度步。 |
| A3C | "异步 actor-critic" | worker 线程把梯度推给共享参数服务器。原始论文；2026 年较少见。 |
| 自举 | "在视野处用上 V" | 截断 rollout，加上 `γ^n V(s_{t+n})` 来收尾求和。 |

## 延伸阅读

- [Mnih et al. (2016). Asynchronous Methods for Deep Reinforcement Learning](https://arxiv.org/abs/1602.01783) —— A3C，最初的异步 actor-critic 论文。
- [Schulman et al. (2016). High-Dimensional Continuous Control Using Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438) —— GAE。
- [Sutton & Barto (2018). Ch. 13 — Actor-Critic Methods](http://incompleteideas.net/book/RLbook2020.pdf) —— 基础；当 critic 是神经网络时，配合第 9 章关于函数近似的内容一起读。
- [Espeholt et al. (2018). IMPALA](https://arxiv.org/abs/1802.01561) —— 带 V-trace 离策略修正的可扩展分布式 actor-critic。
- [OpenAI Baselines / Stable-Baselines3](https://stable-baselines3.readthedocs.io/) —— 值得一读的生产级 A2C/PPO 实现。
- [Konda & Tsitsiklis (2000). Actor-Critic Algorithms](https://papers.nips.cc/paper/1786-actor-critic-algorithms) —— 双时间尺度 actor-critic 分解的奠基性收敛结果。
