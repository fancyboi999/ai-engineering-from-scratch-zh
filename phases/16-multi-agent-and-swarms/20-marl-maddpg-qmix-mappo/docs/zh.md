# MARL —— MADDPG、QMIX、MAPPO

> 多 agent 协调的强化学习血脉，到 2026 年仍在影响 LLM-agent 系统。**MADDPG**（Lowe 等人，NeurIPS 2017，arXiv:1706.02275）引入了集中训练、分散执行（Centralized Training, Decentralized Execution，CTDE）：训练时每个 critic 看到所有 agent 的状态和动作；测试时只跑本地 actor。适用于合作、竞争、混合场景。**QMIX**（Rashid 等人，ICML 2018，arXiv:1803.11485）是带单调混合网络的价值分解；每个 agent 的 Q 组合成联合 Q，所以 `argmax` 能干净地分散——在星际争霸多 agent 挑战赛（SMAC）上占优。**MAPPO**（Yu 等人，NeurIPS 2022，arXiv:2103.01955）是带集中价值函数的 PPO；在 particle-world、SMAC、Google Research Football、Hanabi 上「出人意料地有效」，且几乎不用调参。这些支撑着「必须分散行动的 agent 团队」的策略训练。MAPPO 是 **2026 年默认的合作式 MARL 基线**。本课从一个小网格世界玩具构建每一个，让这三个想法在你碰 LLM-agent 训练之前就长进肌肉记忆里。

**类型：** Learn
**语言：** Python（标准库，不用 NumPy 的小实现）
**前置要求：** Phase 09（强化学习）、Phase 16 · 09（并行 Swarm 网络）
**预计时间：** ~90 分钟

## 问题背景

LLM-agent 系统越来越多地为 agent 间协调训练策略：何时退让、何时行动、调哪个同伴。告诉你如何训练这类策略的文献是多 agent 强化学习（Multi-Agent Reinforcement Learning，MARL），它早于 LLM 浪潮，有一小批占主导的算法。

不带这套模式词汇去读 MARL 论文很痛苦。集中训练分散执行（CTDE）、价值分解、集中 critic 不是流行词——它们是对具体问题的具体回答：

- 独立 RL（每个 agent 单独学）从每个 agent 视角看是非平稳的。糟糕。
- 集中 RL（一个 agent 控制全部）扩展不了，且违反执行约束。
- CTDE 取两者之长：用全局信息训练，用本地策略部署。

## 核心概念

### 论文用的三个环境

- **Particle World（多 agent 粒子环境）。** 简单 2D 物理，带合作/竞争任务。MADDPG 的原始试验台。
- **星际争霸多 agent 挑战赛（SMAC）。** 合作式微操，部分可观测。QMIX 的试验台。离散动作、连续状态。
- **Google Research Football、Hanabi、MPE。** MAPPO 的基线。

不同环境有不同的动作/观测类型。算法据此选择。

### MADDPG（2017）—— CTDE 模式

每个 agent `i` 有一个 actor `mu_i(o_i)`，把它自己的观测映射成动作。每个 agent 还有一个 critic `Q_i(x, a_1, ..., a_n)`，训练时看到所有观测和所有动作。actor 用针对 critic 评估的策略梯度来更新。

```
actor 更新：    grad_theta_i J = E[grad_theta mu_i(o_i) * grad_a_i Q_i(x, a_1..n) at a_i=mu_i(o_i)]
critic 更新：   在给定下一状态联合估计下，对 Q_i(x, a_1..n) 做 TD
```

为什么 CTDE：训练时我们知道每个人的动作；用它来降低每个 critic 的方差。部署时每个 agent 只看到 `o_i`、调 `mu_i(o_i)`。

故障模式：critic 随 agent 数 N 增长（输入包含所有动作）。不做近似的话扩展不过约 10 个 agent。

### QMIX（2018）—— 价值分解

仅合作。全局奖励是各 agent Q 值的一个单调函数：

```
Q_tot(tau, a) = f(Q_1(tau_1, a_1), ..., Q_n(tau_n, a_n)),   df/dQ_i >= 0
```

单调性保证 `argmax_a Q_tot` 可以由每个 agent 独立选 `argmax_{a_i} Q_i` 算出。这**正是**你需要的分散执行属性。训练时，一个混合网络从各 agent 的 Q 产出 `Q_tot`。

QMIX 为何在 SMAC 上赢：合作式星际微操有同质 agent、本地观测、全局奖励——和价值分解完美契合。

故障模式：单调性约束有限制性；有些任务的奖励结构不是单调可分解的（一个 agent 为团队牺牲）。扩展（QTRAN、QPLEX）放松了这点。

### MAPPO（2022）—— 被忽视的默认

多 agent PPO：带集中价值函数的 PPO。每个 agent 有自己的策略；所有 agent 共享（或各自有）能看到完整状态的价值函数。Yu 等人 2022 年在五个基准上把 MAPPO 跟 MADDPG、QMIX 及它们的扩展做对比，发现：

- MAPPO 在 particle-world、SMAC、Google Research Football、Hanabi、MPE 上追平或打败 off-policy MARL 方法。
- 几乎不需要调超参。
- 训练稳定；跨种子可复现。

在这篇论文之前，社区低估了 on-policy MARL。2026 年，MAPPO 是合作式 MARL 的默认基线；任何新方法都得打败它。

### LLM-agent 工程师为何该在意

三个直接用途：

1. **路由器训练。** 一个 meta-agent 选哪个子 agent 处理任务。这是一个 MARL 问题：N 个分散子 agent 加一个集中路由器。MAPPO 契合。
2. **角色涌现。** 在生成式 agent 仿真里，训练 agent 随时间采纳互补角色是一个伪装的 MARL 问题。QMIX 式的价值分解从构造上就强制互补。
3. **多 agent 工具使用。** 当 agent 共享工具、争抢预算时，用 CTDE 训练它们能产出尊重资源约束的、可部署的本地策略。

实际注意：2026 年，大多数生产 LLM-agent 系统用 prompt 而非训练来定它们的策略。当你有 (a) 大量交互数据、(b) 清晰的奖励信号、(c) 愿意投入训练基础设施时，MARL 才登场。

### CTDE 作为超出 RL 的设计模式

即便不训练，CTDE 也是一个有用的架构模式：

- *设计*时，假设全团队可见。
- *运行*时，强制分散执行：每个 agent 只看到 `o_i`。

这个模式逼你把每个 agent 的状态显式保留下来，并在一开始就思考部分可观测性。许多生产多 agent 系统默默地到处假设共享状态——CTDE 纪律能防住这个。

### 非平稳性问题

当多个 agent 同时学习时，每个 agent 的环境（其中包含别人的策略）是非平稳的。经典单 agent RL 的证明就崩了。本课的 MARL 算法都应对这点：

- MADDPG：全局 critic 看到所有动作，所以它的价值估计是平稳的。
- QMIX：价值分解把学习挪到一个联合 Q 空间，最优性在那里有明确定义。
- MAPPO：集中价值函数抑制别人策略变化带来的方差。

在 LLM-agent 系统里，非平稳性表现为「我的 agent 上个月还好好的，现在上游那个 agent 改了，我的就出毛病了」。用 CTDE 训练 MARL 是有原则的修法；prompt 层面的修法更快但更不耐用。

### 本课不涵盖的内容

训练真实网络是 Phase 09 的话题。本课构建脚本化策略版本，在不做梯度更新的情况下演示 CTDE、价值分解、集中价值这三个模式。目标是在你拿起一个完整 MARL 库（PyMARL、MARLlib、RLlib multi-agent）之前先把模式内化。

```figure
sw-ctde
```

## 动手构建

`code/main.py` 实现三个模式演示，都在一个微小的 2-agent 合作网格世界上：

- 环境：4x4 网格上的 2 个 agent，一个奖励颗粒。奖励 = 1，若任一 agent 到达颗粒；任务结束。
- `IndependentAgents` —— 每个 agent 把别人当环境。基线。
- `MADDPGStyle` —— 集中 critic 计算一个联合价值；actor 策略据此更新。脚本化的策略改进。
- `QMIXStyle` —— 带单调混合器的价值分解。
- `MAPPOStyle` —— 集中价值函数；策略针对共享基线更新。

四个都跑同样的回合，报告平均到达目标步数。CTDE 变体收敛到比独立基线更短的路径。

运行：

```
python3 code/main.py
```

预期输出：独立 agent 平均约 6 步；CTDE 变体收敛到约 3.5 步（4x4 网格的最优是 3）。尽管是脚本化策略，模式差异仍然显现。

## 实际使用

`outputs/skill-marl-picker.md` 是一个 skill，它为一个给定的多 agent 任务挑 MARL 算法：合作 vs 竞争、同质 vs 异质、动作空间类型、规模、奖励信号。

## 拿去用

MARL 在生产里很少见。当你确实要用时：

- **从 MAPPO 开始。** 2022 年那篇论文把它确立为基线；先复现它能省下几周追逐花哨方法的时间。
- **记录每个 agent 的观测和动作流。** 没有每 agent 轨迹去调 MARL 是没指望的。
- **把训练代码和执行代码分开。** CTDE 是一种纪律；让执行路径真的只看到 `o_i`。
- **奖励塑形警告。** MARL 对奖励设计极其敏感。塑形里一个协调 bug，agent 就学会利用它。跑对抗测试。
- **对 LLM agent**，先考虑 prompt 层面的策略。只在交互数据 + 奖励信号 + 基础设施都齐备时才投入 MARL 训练。

## 练习

1. 跑 `code/main.py`。测量独立 agent 和 MAPPO 式 agent 之间的到达目标步数差距。在 6x6 网格上这个差距是变大还是缩小？
2. 实现一个竞争变体：两个 agent、一个颗粒，只有先到的拿奖励。哪个模式干净地处理竞争？历史上是 MADDPG。
3. 读 MADDPG（arXiv:1706.02275）第 3 节。用你自己的话把确切的 critic 更新规则以符号伪代码实现出来。
4. 读 MAPPO（arXiv:2103.01955）。作者为什么主张「集中价值 + PPO」在他们的基准上打败 off-policy MARL？列出三个最有力的论断。
5. 把 CTDE 作为设计模式应用到一个假想的 LLM-agent 系统（比如 research agent + summarizer + coder）。设计时可用、而运行时不可用的联合信息是什么？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| MARL | 「多 agent RL」 | 面向多 agent 系统的强化学习。 |
| CTDE | 「集中训练，分散执行」 | 用全局信息训练；用本地策略部署。 |
| MADDPG | 「多 agent DDPG」 | 带「每 agent critic 看到所有观测 + 动作」的 CTDE。 |
| QMIX | 「价值分解」 | 各 agent Q 的单调混合。合作。 |
| MAPPO | 「多 agent PPO」 | 带集中价值函数的 PPO。2026 年默认基线。 |
| Value decomposition | 「个体 Q 之和」 | 联合 Q 表示为各 agent Q 的一个单调函数。 |
| Non-stationarity | 「移动的靶子」 | 别人学习时每个 agent 的环境都在变。MARL 的核心问题。 |
| On-policy / off-policy | 「从当前学 / 回放学」 | PPO 是 on-policy（MAPPO）；DDPG 和 Q-learning 是 off-policy。 |
| SMAC | 「星际争霸多 agent 挑战赛」 | 合作式微操基准；QMIX 的自家地盘。 |

## 延伸阅读

- [Lowe et al. — Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments](https://arxiv.org/abs/1706.02275) —— MADDPG；NeurIPS 2017
- [Rashid et al. — QMIX: Monotonic Value Function Factorisation for Deep Multi-Agent Reinforcement Learning](https://arxiv.org/abs/1803.11485) —— QMIX；ICML 2018
- [Yu et al. — The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games](https://arxiv.org/abs/2103.01955) —— MAPPO；NeurIPS 2022
- [BAIR blog post on MAPPO](https://bair.berkeley.edu/blog/2021/07/14/mappo/) —— 对 MAPPO 结果易读的解读
- [SMAC repository](https://github.com/oxwhirl/smac) —— 星际争霸多 agent 挑战赛
