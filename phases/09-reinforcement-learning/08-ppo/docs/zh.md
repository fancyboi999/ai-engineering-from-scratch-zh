# 近端策略优化（PPO）

> A2C 每个 rollout 更新一次后就扔掉。PPO 把策略梯度裹进一个裁剪过的重要性比率里，让你能在同一份数据上做 10+ 轮而不让策略爆掉。Schulman 等人（2017）。直到 2026 年仍是默认的策略梯度算法。

**类型：** Build
**语言：** Python
**前置要求：** Phase 9 · 06（REINFORCE）、Phase 9 · 07（Actor-Critic）
**预计时间：** ~75 分钟

## 问题背景

A2C（第 07 课）是同策略的：梯度 `E_{π_θ}[A · ∇ log π_θ]` 要求数据从*当前*的 `π_θ` 采样。一更新，`π_θ` 就变了；你用过的数据现在成了离策略。复用它，梯度就有偏。

rollout 很贵。在 Atari 上，跨 8 个环境 × 128 步的一次 rollout = 1024 条转移，外加十几秒的环境时间。一个梯度步之后就扔掉它太浪费。

信任域策略优化（TRPO，Schulman 2015）是第一个修法：约束每次更新，让新旧策略间的 KL 散度保持在 `δ` 以下。理论上干净，但每次更新都要解一个共轭梯度。2026 年没人跑 TRPO。

PPO（Schulman 等人 2017）把硬性的信任域约束换成一个简单的裁剪目标。多一行代码。每个 rollout 十轮。没有共轭梯度。够用的理论保证。九年后，从 MuJoCo 到 RLHF，它仍是默认的策略梯度算法。

## 核心概念

![PPO clipped surrogate objective: ratio clipping at 1 ± ε](../assets/ppo.svg)

**重要性比率。**

`r_t(θ) = π_θ(a_t | s_t) / π_{θ_old}(a_t | s_t)`

这是新策略相对收集数据那个策略的似然比。`r_t = 1` 表示没变。`r_t = 2` 表示新策略采取 `a_t` 的可能性是旧策略的两倍。

**裁剪代理目标。**

`L^{CLIP}(θ) = E_t [ min( r_t(θ) A_t, clip(r_t(θ), 1-ε, 1+ε) A_t ) ]`

两项：

- 如果优势 `A_t > 0` 且比率试图涨过 `1 + ε`，裁剪把梯度压平——别把一个好动作推到比旧概率高出 `+ε` 以上。
- 如果优势 `A_t < 0` 且比率试图涨过 `1 - ε`（意味着相比它被裁剪后的削减，我们反而会让一个坏动作更可能），裁剪给梯度封顶——别把一个坏动作推到 `-ε` 以下。

`min` 处理另一个方向：如果比率往*有利*的方向动了，你仍然拿到梯度（在会伤到你的那一侧不裁剪）。

典型 `ε = 0.2`。把目标画成 `r_t` 的函数：一个分段线性函数，"好的一侧"有一个平顶，"坏的一侧"有一个平底。

**完整 PPO 损失。**

`L(θ, φ) = L^{CLIP}(θ) - c_v · (V_φ(s_t) - V_t^{target})² + c_e · H(π_θ(·|s_t))`

和 A2C 一样的 actor-critic 结构。三个系数，通常 `c_v = 0.5`、`c_e = 0.01`、`ε = 0.2`。

**训练循环。**

1. 跨 `N` 个并行环境各跑 `T` 步，收集 `N × T` 条转移。
2. 算优势（GAE），冻结成常数。
3. 把 `π_{θ_old}` 冻结为当前 `π_θ` 的一份快照。
4. 跑 `K` 轮，对每个 `(s, a, A, V_target, log π_old(a|s))` 的 minibatch：
   - 算 `r_t(θ) = exp(log π_θ(a|s) - log π_old(a|s))`。
   - 套用 `L^{CLIP}` + 价值损失 + 熵。
   - 走一个梯度步。
5. 丢掉这个 rollout。回到第 1 步。

`K = 10`、minibatch 大小 64 是一套标准超参数。PPO 很稳健：确切数字在 ±50% 范围内很少要紧。

**KL 惩罚变体。** 原论文提出了一个用自适应 KL 惩罚的替代方案：`L = L^{PG} - β · KL(π_θ || π_old)`，`β` 根据观测到的 KL 调整。裁剪版本占了主导；KL 变体在 RLHF 里存活了下来（那里到参考策略的 KL 本来就是一个你总想要的单独约束）。

```figure
ppo-clip
```

## 动手构建

### 第 1 步：在 rollout 时记下 `log π_old(a | s)`

```python
for step in range(T):
    probs = softmax(logits(theta, state_features(s)))
    a = sample(probs, rng)
    s_next, r, done = env.step(s, a)
    buffer.append({
        "s": s, "a": a, "r": r, "done": done,
        "v_old": value(w, state_features(s)),
        "log_pi_old": log(probs[a] + 1e-12),
    })
    s = s_next
```

快照只在 rollout 时拍一次。它在更新轮里不变。

### 第 2 步：算 GAE 优势（第 07 课）

和 A2C 一样。在 batch 内归一化。

### 第 3 步：裁剪代理更新

```python
for _ in range(K_EPOCHS):
    for mb in minibatches(buffer, size=64):
        for rec in mb:
            x = state_features(rec["s"])
            probs = softmax(logits(theta, x))
            logp = log(probs[rec["a"]] + 1e-12)
            ratio = exp(logp - rec["log_pi_old"])
            adv = rec["advantage"]
            surrogate = min(
                ratio * adv,
                clamp(ratio, 1 - EPS, 1 + EPS) * adv,
            )
            # backprop -surrogate, add value loss, subtract entropy
            grad_logpi = onehot(rec["a"]) - probs
            if (adv > 0 and ratio >= 1 + EPS) or (adv < 0 and ratio <= 1 - EPS):
                pg_grad = 0.0  # clipped
            else:
                pg_grad = ratio * adv
            for i in range(N_ACTIONS):
                for j in range(N_FEAT):
                    theta[i][j] += LR * pg_grad * grad_logpi[i] * x[j]
```

"裁剪后 → 零梯度"这个模式是 PPO 的核心。如果新策略已经在有利方向上漂得太远，更新就停下。

### 第 4 步：价值与熵

给 critic 目标加标准 MSE，给 actor 加熵奖励，和 A2C 一样。

### 第 5 步：诊断

每次更新都要盯三样东西：

- **平均 KL** `E[log π_old - log π_θ]`。应该待在 `[0, 0.02]`。如果冲过 `0.1`，调小 `K_EPOCHS` 或 `LR`。
- **裁剪比例**——比率落在 `[1-ε, 1+ε]` 之外的样本占比。应该 `~0.1-0.3`。如果 `~0`，说明裁剪从不触发 → 调高 `LR` 或 `K_EPOCHS`。如果 `~0.5+`，说明你在过拟合这个 rollout → 调低它们。
- **解释方差** `1 - Var(V_target - V_pred) / Var(V_target)`。critic 质量指标。随着 critic 学习应朝 1 爬升。

## 注意事项

- **裁剪系数没调好。** `ε = 0.2` 是事实标准。降到 `0.1` 让更新太胆怯；`0.3+` 招来不稳定。
- **轮数太多。** `K > 20` 经常导致失稳，因为策略漂得离 `π_old` 太远。给轮数封顶，尤其是大网络。
- **没做奖励归一化。** 大的奖励尺度会吃掉裁剪区间。算优势前先归一化奖励（滑动标准差）。
- **忘了优势归一化。** 每个 batch 零均值/单位标准差归一化是标准做法。跳过它会在大多数 benchmark 上毁掉 PPO。
- **学习率没衰减。** PPO 受益于线性衰减到零的学习率。常数 LR 往往更差。
- **重要性比率算错。** 为数值稳定，永远用 `exp(log_new - log_old)`，而不是 `new / old`。
- **梯度符号错了。** 最大化代理目标 = *最小化* `-L^{CLIP}`。符号翻反是最常见的 PPO bug。

## 实际使用

PPO 是 2026 年默认的 RL 算法，覆盖的领域多得出人意料：

| 用途 | PPO 变体 |
|----------|-------------|
| MuJoCo / 机器人控制 | 配高斯策略、GAE(0.95) 的 PPO |
| Atari / 离散游戏 | 配类别策略、滚动 128 步 rollout 的 PPO |
| LLM 的 RLHF | 带到参考模型 KL 惩罚、回复末尾从 RM 取奖励的 PPO |
| 大规模游戏 agent | IMPALA + PPO（AlphaStar、OpenAI Five） |
| 推理 LLM | GRPO（第 12 课）—— 去掉 critic 的 PPO 变体 |
| 仅有偏好数据 | DPO —— PPO+KL 的闭式塌缩、无需在线采样 |

PPO 的*损失形状*——裁剪代理 + 价值 + 熵——是 DPO、GRPO 以及几乎每条 RLHF 流水线的脚手架。

## 拿去用

存为 `outputs/skill-ppo-trainer.md`：

```markdown
---
name: ppo-trainer
description: Produce a PPO training config and a diagnostic plan for a given environment.
version: 1.0.0
phase: 9
lesson: 8
tags: [rl, ppo, policy-gradient]
---

Given an environment and training budget, output:

1. Rollout size. `N` envs × `T` steps.
2. Update schedule. `K` epochs, minibatch size, LR schedule.
3. Surrogate params. `ε` (clip), `c_v`, `c_e`, advantage normalization on.
4. Advantage. GAE(`λ`) with explicit `γ` and `λ`.
5. Diagnostics plan. KL, clip fraction, explained variance thresholds with alerts.

Refuse `K > 30` or `ε > 0.3` (unsafe trust region). Refuse any PPO run without advantage normalization or KL/clip monitoring. Flag clip fraction sustained above 0.4 as drift.
```

## 练习

1. **简单。** 在 4×4 GridWorld 上用 `ε=0.2, K=4` 跑 PPO。在环境步数对齐的前提下，和 A2C（每个 rollout 一轮）对比样本效率。
2. **中等。** 扫 `K ∈ {1, 4, 10, 30}`。画出回报对环境步数，并跟踪每次更新的平均 KL。在这个任务上，`K` 取多少时 KL 会爆？
3. **困难。** 把裁剪代理换成自适应 KL 惩罚（若 `KL > 2·target` 则 `β` 翻倍，若 `KL < target/2` 则减半）。对比最终回报、稳定性和无裁剪程度。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 重要性比率 | "r_t(θ)" | `π_θ(a|s) / π_old(a|s)`；相对收集数据那个策略的偏离。 |
| 裁剪代理 | "PPO 的主要技巧" | `min(r·A, clip(r, 1-ε, 1+ε)·A)`；在有利侧越过裁剪后梯度变平。 |
| 信任域 | "TRPO / PPO 的意图" | 限制每次更新的 KL，以保证单调改进。 |
| KL 惩罚 | "软信任域" | 另一种 PPO：`L - β · KL(π_θ || π_old)`。自适应 `β`。 |
| 裁剪比例 | "裁剪多频繁触发" | 诊断量——应在 0.1-0.3；超出就是没调好。 |
| 多轮训练 | "数据复用" | 每个 rollout 跑 K 轮；用方差成本换样本效率。 |
| 近似同策略 | "基本同策略" | PPO 名义上同策略，但 K>1 轮安全地用了略微离策略的数据。 |
| PPO-KL | "另一个 PPO" | KL 惩罚变体；用在 RLHF 里，那里到参考的 KL 本来就是个约束。 |

## 延伸阅读

- [Schulman et al. (2017). Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347) —— 那篇论文。
- [Schulman et al. (2015). Trust Region Policy Optimization](https://arxiv.org/abs/1502.05477) —— TRPO，PPO 的前身。
- [Andrychowicz et al. (2021). What Matters In On-Policy RL? A Large-Scale Empirical Study](https://arxiv.org/abs/2006.05990) —— 把每个 PPO 超参数都做了消融。
- [Ouyang et al. (2022). Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) —— InstructGPT；RLHF 里的 PPO 配方。
- [OpenAI Spinning Up — PPO](https://spinningup.openai.com/en/latest/algorithms/ppo.html) —— 配 PyTorch 的清晰现代讲解。
- [CleanRL PPO implementation](https://github.com/vwxyzjn/cleanrl) —— 被很多论文使用的参考单文件 PPO。
- [Hugging Face TRL — PPOTrainer](https://huggingface.co/docs/trl/main/en/ppo_trainer) —— 在语言模型上跑 PPO 的生产配方；配合第 09 课（RLHF）一起读。
- [Engstrom et al. (2020). Implementation Matters in Deep Policy Gradients](https://arxiv.org/abs/2005.12729) —— "37 个代码级优化"那篇；哪些 PPO 技巧是承重的，哪些是民间传说。
