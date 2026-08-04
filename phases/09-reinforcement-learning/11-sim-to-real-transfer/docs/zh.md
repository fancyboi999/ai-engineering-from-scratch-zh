# 从仿真到现实的迁移

> 一个在仿真器里训练、却在硬件上失败的策略，是一个把仿真器背下来的策略。域随机化、域适配、系统辨识，是让学到的控制器跨越现实鸿沟的三件工具。

**类型：** Learn
**语言：** Python
**前置要求：** Phase 9 · 08（PPO）、Phase 2 · 10（偏差/方差）
**预计时间：** ~45 分钟

## 问题背景

训练一个真实机器人又慢、又危险、又贵。一个双足机器人要花上百万个训练 episode 才学会走路；一个真双足只要摔一次就弄坏硬件。仿真给你无限次重置、确定性可复现、并行环境，而且没有物理损坏。

但仿真器是错的。轴承的摩擦比 MuJoCo 模型里的大。摄像头有仿真器没包含的镜头畸变。电机有延迟、回程间隙和饱和，99% 的仿真模型都跳过了。风、灰尘、变化的光照会破坏一个在无菌渲染上训出来的策略。**现实鸿沟**——仿真分布和真实分布之间的系统性差异——是机器人部署 RL 的核心问题。

你需要一个*对仿真到现实分布偏移稳健*的策略。三种历史方法：随机化仿真器（域随机化）、用少量真实数据适配策略（域适配 / 微调），或者辨识真实系统的参数并去匹配它（系统辨识）。到了 2026 年，主导配方把这三者和大规模并行仿真（Isaac Sim、Isaac Lab、GPU 上的 Mujoco MJX）结合起来。

## 核心概念

![Three sim-to-real regimes: domain randomization, adaptation, system identification](../assets/sim-to-real.svg)

**域随机化（DR）。** Tobin 等人 2017，Peng 等人 2018。训练时，随机化每个可能在真实机器人上有差异的仿真参数：质量、摩擦系数、电机 PD 增益、传感器噪声、摄像头位置、光照、纹理、接触模型。策略学到一个关于"今天它在哪个仿真里"的条件分布，并在整个跨度上泛化。如果真实机器人落在训练包络内，策略就能用。

- **好处：** 不需要真实数据。一套配方，多种机器人。
- **坏处：** 过度随机化的训练产出一个"通用"但过分谨慎的策略。噪声太多 ≈ 正则化太多。

**系统辨识（SI）。** 训练前先把仿真器的参数拟合到真实世界数据上。如果你能在真实机器人上测出机械臂关节摩擦，就把它塞进仿真。然后训练一个预期这些值的策略。需要访问真实系统，但直接缩小现实鸿沟。

- **好处：** 精确、低噪声的训练目标。
- **坏处：** 残余的模型误差对策略不可见；小的未辨识效应（如电机死区）仍会破坏部署。

**域适配。** 在仿真里训练，用少量真实数据微调。两种风味：

- **Real2Sim2Real：** 用真实 rollout 学一个残差仿真器 `f(s, a, z) - f_sim(s, a)`，在修正后的仿真里训练。不用多少真实数据就能缩小鸿沟。
- **观测适配：** 训练一个策略，通过一个学到的特征提取器（如 GAN 像素到像素）把真实观测 → 类仿真观测。控制器留在仿真里。

**特权学习 / 师生。** Miki 等人 2022（ANYmal 四足）。在仿真里训练一个能访问特权信息（真值摩擦、地形高度、IMU 漂移）的*老师*。蒸馏出一个只看真实传感器观测的*学生*。学生学会从历史中推断特权特征，跨物理参数都稳健。

**大规模并行仿真。** 2024–2026。Isaac Lab、Mujoco MJX、Brax 都能在单个 GPU 上跑上千个并行机器人。配 4096 个并行人形的 PPO 在几小时内收集到数年的经验。训练分布越宽，"现实鸿沟"就越小；当那 4096 个环境每个都有不同的随机化参数时，DR 几乎是免费的。

**2026 年的真实世界配方（四足行走为例）：**

1. 大规模并行仿真，随机化重力、摩擦、电机增益、载荷。
2. 用特权信息（地形图、机身速度真值）训练老师策略。
3. 只用本体感知（腿部关节编码器）从老师蒸馏出学生策略。
4. 可选：在真实 IMU 上用自编码器做观测适配。
5. 部署。在 10+ 个环境上零样本。如果失败，用安全约束的 PPO 做几分钟的真实世界微调。

```figure
f3-reality-gap
```

## 动手构建

这一课的代码是域随机化在带*噪声*转移的 GridWorld 上的微缩演示。我们训练一个策略，让它在"仿真"里经历随机化的滑动概率，再在一个它训练时从没见过的滑动水平的"现实"上评估。这个形状直接对应 MuJoCo 到硬件的迁移。

### 第 1 步：参数化仿真

```python
def step(state, action, slip):
    if rng.random() < slip:
        action = random_perpendicular(action)
    ...
```

`slip` 是仿真器暴露出来的一个参数。在真实机器人里它可以是摩擦、质量、电机增益——任何在仿真和现实间偏移的东西。

### 第 2 步：用 DR 训练

每个 episode 开始时，采样 `slip ~ Uniform[0.0, 0.4]`。训练 PPO / Q-learning / 任何东西。这样跑很多个 episode。

### 第 3 步：在"现实"滑动值上做零样本评估

在 `slip ∈ {0.0, 0.1, 0.2, 0.3, 0.5, 0.7}` 上评估。前四个在训练支撑内；`0.5` 和 `0.7` 在外。一个 DR 训练的策略应该在支撑内接近最优，在支撑外优雅降级。一个固定滑动值训练的策略在它训练滑动值之外会很脆。

### 第 4 步：和窄训练对比

训练第二个策略，只用 `slip = 0.0`。在同样的 `slip` 扫描上评估。你应该看到一旦真实滑动 > 0 就出现灾难性下跌。

## 注意事项

- **随机化太多。** 在 `slip ∈ [0, 0.9]` 上训练，你的策略会风险厌恶到从不尝试最优路径。匹配*预期*的真实世界分布，而不是"什么都可能发生"。
- **随机化太少。** 在薄薄一片上训练，策略根本没法泛化。用自适应课程（自动域随机化），随策略改进而拓宽分布。
- **参数空间辨识错了。** 随机化错的东西（真实鸿沟是电机延迟，你却去随机化摄像头色调），DR 就帮不上忙。先给真实机器人做剖析。
- **特权信息泄漏。** 一个用全局状态而非仅用观测来决策的老师，可能产出一个学生永远追不上的策略。确保老师的策略在给定观测历史下对学生是可实现的。
- **仿真到仿真迁移失败。** 如果你的策略对一个更难的仿真变体不稳健，它对真实世界也不会稳健。部署前永远在留出的仿真变体上测试。
- **没有真实世界安全包络。** 一个在仿真里能用、在现实里"也能用"但没有底层安全护盾的策略，仍然能弄坏硬件。在一个非学习式控制器里加速率限制、力矩限制、关节限制。

## 实际使用

2026 年的仿真到现实技术栈：

| 领域 | 技术栈 |
|--------|-------|
| 腿足运动（ANYmal、Spot、人形） | Isaac Lab + DR + 特权老师 / 学生 |
| 操作（灵巧手、抓取放置） | Isaac Lab + DR + 用于视觉的 DR-GAN |
| 自动驾驶 | CARLA / NVIDIA DRIVE Sim + DR + 真实微调 |
| 无人机竞速 | RotorS / Flightmare + DR + 在线适配 |
| 手指/手内操作 | OpenAI Dactyl（前所未有规模的 DR） |
| 工业机械臂 | MuJoCo-Warp + SI + 少量真实微调 |

对所有规模的控制，工作流是一致的：尽你所能拟合仿真，随机化你拟合不了的，训练庞大的策略，蒸馏，带着安全护盾部署。

## 拿去用

存为 `outputs/skill-sim2real-planner.md`：

```markdown
---
name: sim2real-planner
description: Plan a sim-to-real transfer pipeline for a given robot + task, covering DR, SI, and safety.
version: 1.0.0
phase: 9
lesson: 11
tags: [rl, sim2real, robotics, domain-randomization]
---

Given a robot platform, a task, and access to real hardware time, output:

1. Reality gap inventory. Suspected sources ranked by expected impact (contact, sensing, actuation delay, vision).
2. DR parameters. Exact list, ranges, distribution. Justify each range against real measurements.
3. SI steps. Which parameters to measure; measurement method.
4. Teacher/student split. What privileged info the teacher uses; what obs the student uses.
5. Safety envelope. Low-level limits, emergency stops, backup controller.

Refuse to deploy without (a) a zero-shot sim-variant test, (b) a safety shield, (c) a rollback plan. Flag any DR range wider than 3× measured real variability as likely over-randomized.
```

## 练习

1. **简单。** 在固定滑动 GridWorld（slip=0.0）上训练一个 Q-learning agent。在 slip ∈ {0.0, 0.1, 0.3, 0.5} 上评估。画出回报对 slip。
2. **中等。** 训练一个采样 `slip ~ Uniform[0, 0.3]` 的 DR Q-learning agent。在同样的扫描上评估。在 slip=0.5（分布外）时 DR 带来了多少收益？
3. **困难。** 实现一个课程：从 slip=0.0 起，每次策略达到最优的 90% 就拓宽 DR 范围。测一下零样本到达 slip=0.3 所需的总环境步数，对比固定 DR 基线。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 现实鸿沟 | "仿真到现实的差异" | 训练与部署的物理/感知之间的分布偏移。 |
| 域随机化（DR） | "跨随机仿真训练" | 训练时随机化仿真参数，让策略泛化。 |
| 系统辨识（SI） | "测真实、拟合仿真" | 估计真实物理参数；把仿真设成匹配。 |
| 域适配 | "在真实数据上微调" | 仿真训练后做少量真实世界微调；可能适配观测或动力学。 |
| 特权信息 | "给老师的真值" | 只有仿真才有的信息；学生必须从观测历史中推断它。 |
| 师生 | "把特权蒸馏成可观测" | 老师带捷径训练；学生学会在没有捷径时模仿它。 |
| ADR | "自动域随机化" | 随策略改进而拓宽 DR 范围的课程。 |
| Real2Sim | "用真实数据缩小鸿沟" | 学一个残差，让仿真模仿真实 rollout。 |

## 延伸阅读

- [Tobin et al. (2017). Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World](https://arxiv.org/abs/1703.06907) —— 最初的 DR 论文（机器人视觉）。
- [Peng et al. (2018). Sim-to-Real Transfer of Robotic Control with Dynamics Randomization](https://arxiv.org/abs/1710.06537) —— 动力学的 DR，四足运动。
- [OpenAI et al. (2019). Solving Rubik's Cube with a Robot Hand](https://arxiv.org/abs/1910.07113) —— Dactyl，大规模 ADR。
- [Miki et al. (2022). Learning robust perceptive locomotion for quadrupedal robots in the wild](https://www.science.org/doi/10.1126/scirobotics.abk2822) —— ANYmal 的师生。
- [Makoviychuk et al. (2021). Isaac Gym: High Performance GPU Based Physics Simulation for Robot Learning](https://arxiv.org/abs/2108.10470) —— 驱动 2025–2026 部署的大规模并行仿真。
- [Akkaya et al. (2019). Automatic Domain Randomization](https://arxiv.org/abs/1910.07113) —— ADR 课程方法。
- [Sutton & Barto (2018). Ch. 8 — Planning and Learning with Tabular Methods](http://incompleteideas.net/book/RLbook2020.pdf) —— Dyna 框架（用模型做规划 + rollout），现代仿真到现实流水线的底座。
- [Zhao, Queralta & Westerlund (2020). Sim-to-Real Transfer in Deep Reinforcement Learning for Robotics: a Survey](https://arxiv.org/abs/2009.13303) —— 仿真到现实方法的分类法及 benchmark 结果。
