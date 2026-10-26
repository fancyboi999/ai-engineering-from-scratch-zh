---
id: marl-sim-to-real
title: 多 Agent 强化学习与仿真到现实
code: MR
subtitle: CTDE、价值分解、自博弈、域随机化与 VLA 动作格式。涵盖公式、数值与修正方法。
hue: 60
sources: phases/09-reinforcement-learning/10-multi-agent-rl, phases/09-reinforcement-learning/11-sim-to-real-transfer, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot
source_hash: eefdf58e57225562
---

## 核心概念与公式
type: concepts
from: phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md

- **马尔可夫博弈**：$(S, A_1, \ldots, A_n, P, R_1, \ldots, R_n)$。每个 agent 有自己的奖励。
- **奖励类型**：奖励相同为合作，零和为对抗，混合为一般和。
- **非平稳性**：$P(s' \mid s, a_i)$ 依赖 $\pi_{-i}$，而 $\pi_{-i}$ 会变化。
- **CTDE**：训练时使用评论家 $Q(s, a_1, \ldots, a_n)$。策略 $\pi_i$ 只读取 $o_i$。
- **QMIX**：$Q_{\text{tot}} = f(Q_1, \ldots, Q_n)$，其中 $\partial f / \partial Q_i \ge 0$。
- **COMA**：优势等于自身 Q 减去自身动作上的期望 Q。
- **现实差距**：仿真与真实物理或传感之间的偏移。
- **控制预算**：30 Hz 循环给每个动作 33ms。

## MADDPG, QMIX, MAPPO
type: comparison
from: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

| 比较项 | MADDPG | QMIX | MAPPO |
|---|---|---|---|
| 年份 | 2017 | 2018 | 2022 |
| 思路 | 每个 agent 的评论家看见全部观测与动作 | 各 agent Q 值的单调混合 | 使用中心化价值函数的 PPO |
| 场景 | 合作、竞争、混合 | 仅合作 | 合作 |
| 测试环境 | Particle World | SMAC | Particle-world、SMAC、Football、Hanabi、MPE |
| 学习方式 | 离策略，DDPG | 价值分解 | 同策略，PPO |
| 关键特性 | 评论家随 N 增长，约 10 个 agent | 单调约束严格 | 稳定，调参少 |
| 地位 | 提出 CTDE | 在 SMAC 上占主导 | 合作任务的默认基线 |

## CTDE：中心化训练，本地执行
type: architecture
from: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

```arch
node | o1 | 1,1 | Agent 1 观测 | 仅本地 | client
node | o2 | 1,2 | Agent 2 观测 | 仅本地 | client
node | act1 | 2,1 | Actor 1 | 自身观测映射到动作 | model
node | act2 | 2,2 | Actor 2 | 自身观测映射到动作 | model
node | env | 3,1 | 环境 | 联合动作、共享奖励
node | critic | 3,2 | 中心化评论家 | 全部观测与动作，仅训练时 | process
edge | o1 | act1 |
edge | o2 | act2 |
edge | act1 | env | 动作
edge | act2 | env | 动作
edge | env | critic | 奖励
edge | critic | act1 | 梯度
edge | critic | act2 | 梯度
```

## 仿真到现实流程（四足机器人）
type: flow
from: phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md

1. **仿真**：大规模并行仿真，随机化重力、摩擦、电机增益与载荷。
2. **教师**：使用特权信息、地形图和真实机体速度训练。
3. **学生**：仅用本体感知，从教师蒸馏。
4. **适应**：可选地用真实 IMU 上的自编码器适配观测。
5. **部署**：在 10+ 个环境中零样本运行。
6. **兜底**：使用有安全约束的 PPO 做数分钟真实微调。

## 独立 Q 与联合 Q
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/10-multi-agent-rl/code/main.py

```python
a1 = epsilon_greedy(Q1, s, rng, epsilon)       # 每个 agent 独立选择
a2 = epsilon_greedy(Q2, s, rng, epsilon)
s_next, r, done = step(s, (a1, a2))            # 联合步骤，共享奖励
target1 = r + gamma * max(Q1[s_next].values())
Q1[s][a1] += alpha * (target1 - Q1[s][a1])     # 自身 Q 表
reward = 10.0 if done else -1.0                # 双方都到达时奖励 +10
joint_actions = [(a, b) for a in ACTIONS for b in ACTIONS]  # 16 对
ja = max(joint_actions, key=lambda a: Q[s][a]) # one greedy joint pick
```

## 域随机化代码
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/11-sim-to-real-transfer/code/main.py

```python
slip_ep = rng.uniform(slip_low, slip_high)     # 每回合使用新仿真参数
s_next, r, done = step(s, a, slip_ep, rng)     # 滑移方向与动作垂直
Q_fixed = train_fixed(0.0, rng=rng)            # 策略 A，无 DR
Q_dr = train_dr(0.0, 0.3, rng=rng)             # 策略 B，有 DR
for slip in (0.0, 0.1, 0.2, 0.3, 0.5, 0.7):    # 0.5 与 0.7 为分布外
    r_fixed = evaluate(Q_fixed, slip)
    r_dr = evaluate(Q_dr, slip)
```

## 四种 VLA 对比
type: comparison
span: 2
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md

| 比较项 | RT-2 | OpenVLA | π0 | GR00T N1 |
|---|---|---|---|---|
| 动作格式 | 文本 token，256 档 | 256 档 token | 流匹配动作专家 | 系统 1 动作头 |
| 骨干 | PaLM-X VLM | 7B Llama，DINOv2 + SigLIP | VLM 加小型动作 transformer | 大型 VLM 加小型动作头 |
| 速度 | 3-5 Hz | A100 上 4-5 Hz | 约 5 步去噪，约 50 Hz | 系统 1 为 50-100 Hz，系统 2 约 1 Hz |
| 细节 | 10 自由度每步 10 个 token | 新机器人使用 LoRA 微调 | 50 步动作序列 | 关节命令，>30 自由度 |
| 数据 | 网页与机器人，约 1:1 | Open X-Embodiment，网页与机器人约 0.5:1 | Open X-Embodiment，类似比例 | Omniverse 的仿真到现实数据 |

## 代码任务
type: task-table
from: phases/09-reinforcement-learning/10-multi-agent-rl/code/main.py, phases/09-reinforcement-learning/11-sim-to-real-transfer/code/main.py, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/code/main.py, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/code/main.py

| 任务 | 代码 |
|---|---|
| 两个 agent 的独立 Q | `independent_q(episodes=1500)` |
| 16 个联合动作上的单一 Q | `joint_q_learning(episodes=1500)` |
| 使用 DR 训练 | `train_dr(0.0, 0.3, rng=rng)` |
| 在一个滑移值上零样本评估 | `evaluate(Q_dr, slip)` |
| 基准测试 CTDE 模式 | `bench(label, run_mappo_style)` |
| 运行 MARL 模式演示 | `python3 code/main.py` |
| 动作离散为 256 档 | `discretize(action, bins=256)` |
| FAST 风格压缩 | `fast_compress(trajectory, keep_coeff=4)` |

## 课程代码默认值
type: defaults
from: phases/09-reinforcement-learning/10-multi-agent-rl/code/main.py, phases/09-reinforcement-learning/11-sim-to-real-transfer/code/main.py, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/code/main.py, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `alpha` | 0.1 | MARL 与 DR 简化实现 |
| `gamma` | 0.95 | MARL 与 DR 简化实现 |
| `epsilon`, `eps` | 0.15 | ε 贪心探索 |
| MARL `episodes` | 1500 | DR 简化实现为 3000 |
| DR 滑移范围 | Uniform[0.0, 0.3] | 策略 B |
| `max_steps` | 50 | CTDE 模式演示，500 次试验 |
| `bins` | 256 | 档宽为 2/255 |
| `keep_coeff` | 4 | 每维的低频 DCT 项数 |

## 故障排查
type: troubleshooting
from: phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Agent 互相追逐 | 各方最佳回应不断变化 | 中心化评论家、降低学习率、冻结一方 |
| 经验重放使表现更差 | 旧数据中的对手过时 | 重新标注，或按新近性加权 |
| 共享奖励无法归因 | 信用分配问题 | COMA 基线或按 agent 塑形 |
| 自博弈陷入循环 | 优势关系成环 | 与多样化对手进行联赛训练 |
| DR 策略过于谨慎 | 随机化过多 | 匹配预期的真实分布 |
| DR 没有帮助 | 随机化了错误参数 | 先分析真实机器人 |
| 学生无法匹配教师 | 特权信息泄漏 | 教师行为应能由观测实现 |
| 策略损坏硬件 | 没有安全包络 | 在外部设置速率、扭矩和关节限制 |

## 缩写
type: glossary
from: phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md

- **CTDE**：中心化训练、去中心化执行。
- **IPPO**：独立 PPO。每个 agent 单独运行 PPO。
- **COMA**：反事实多 agent 方法。隔离自身贡献。
- **DR**：域随机化。训练时随机化仿真参数。
- **SI**：系统辨识。测量真实机器人，拟合仿真。
- **ADR**：自动域随机化。随着策略改进扩大 DR 范围。
- **VLA**：视觉语言动作模型。输入图像与指令，输出动作。
- **FAST**：频域动作序列分词器。先 DCT，再量化。

## 经验法则
type: tips
from: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md

- 合作 MARL 从 MAPPO 开始。
- 独立 Q 仅用于耦合松散的任务。
- 零和博弈用自博弈，策略成环时用联赛训练。
- 记录每个 agent 的观测流与动作流。
- 部署前在留出仿真变体上测试。
- DR 范围宽于实测真实变化的 3 倍时应标记。
- 使用 100-1000 个任务示范做 LoRA，缩小 VLA 领域差距。

## 问答
type: qa
from: phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/11-sim-to-real-transfer/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md

- **独立 Q 在哪里失效？** 紧耦合任务，尤其是一个 agent 必须等待的场景。
- **QMIX 为何允许本地 argmax？** 混合器对每个 agent 的 Q 都是单调的。
- **训练范围太窄会怎样？** 只在滑移 0.0 上训练，真实滑移一旦超过 0，表现就会骤降。
- **为何联合微调 VLA？** 仅用机器人数据的模型无法处理新指令。
- **GR00T 为何分两部分？** 慢速规划不会阻塞快速控制。
