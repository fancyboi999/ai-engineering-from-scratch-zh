---
id: swarm-optimization
title: 面向 agent 的群体优化与多 agent 强化学习
code: SM
subtitle: 用 PSO 与 ACO 优化 prompt 和路由，使用队列群体，并排比较 MADDPG、QMIX、MAPPO 与自博弈。
hue: 160
sources: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks, phases/09-reinforcement-learning/10-multi-agent-rl
source_hash: 1618e8901348450b
---

## PSO 与 ACO 对比
type: comparison
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md, phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/code/main.py

| 比较项 | PSO | ACO |
|---|---|---|
| 问题 | 连续搜索空间 | 路由或路径选择 |
| 记忆 | `p_best` 与 `g_best` | 每个任务类型 × agent 的信息素 |
| Agent 用法 | LMPSO, Model Swarms | AMRO-S 路由 |
| 报告的收益 | 比 12 个基线提高 13.3% | 加速 4.7 倍 |
| 种群 | 10-30 个粒子 | 演示中为 3 个 agent、4 类任务 |
| 更新规则 | 惯性 + 认知 + 社会 | 先衰减，再门控沉积 |
| 演示函数 | `run_lmpso()` | `run_amro_s()` |

## 多 agent 强化学习算法
type: comparison
from: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/code/main.py

| 比较项 | MADDPG | QMIX | MAPPO |
|---|---|---|---|
| 年份、会议 | NeurIPS 2017 | ICML 2018 | NeurIPS 2022 |
| 设置 | 合作、竞争、混合 | 仅合作 | 合作 |
| 训练信号 | 每个 agent 的评论家看到全部动作 | 各 agent 的 Q 值经单调混合器聚合 | 集中式价值函数 |
| 策略类型 | 离策略 | 离策略 | 同策略 PPO |
| 测试环境 | Particle World | SMAC | Football, Hanabi, MPE |
| 限制 | 超过约 10 个 agent 后评论家变大 | 奖励必须单调 | 默认要超越的基线 |
| 演示 | `run_maddpg_style` | `run_qmix_style` | `run_mappo_style` |

## 多 agent 强化学习范式
type: comparison
from: phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

| 比较项 | IQL / IPPO | CTDE | 自博弈 | 联赛博弈 |
|---|---|---|---|---|
| 思路 | 将其他 agent 视为环境 | 集中评论家，本地策略 | 与过去自己的副本对战 | 过去策略的种群 |
| 适用场景 | 松耦合任务 | 合作导航 | 零和博弈 | 策略循环 |
| 示例 | 独立 Q | MADDPG, COMA, MAPPO, QMIX | AlphaZero | AlphaStar |
| 说明 | 无理论收敛保证 | 最常见的现代范式 | 可能陷入优势循环 | 增加利用者和主利用者 |

## 队列群体与固定分配对比
type: comparison
from: phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/code/main.py

| 比较项 | 顺序 | 固定分配 | 群体 |
|---|---|---|---|
| 谁选工作 | 一名执行者 | 预先指定执行者 id | 执行者从共享队列取任务 |
| 函数 | `run_sequential` | `run_fixed_assignment` | `run_swarm` |
| 负载均衡 | 无 | 快执行者空闲等待 | 自动 |
| 适用场景 | 仅作基线 | 提前知道耗时 | 大量独立任务 |
| 弱点 | 实际耗时 | 执行者 0 拿到所有慢任务 | 排序与调试 |

## 各方法的适用条件
type: concepts
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

- **PSO**：连续参数、低成本自动适应度、10-30 个粒子的种群。
- **ACO**：路由反复发生，并需要可解释证据。
- **两者都不用**：适应度需要人工审查，或延迟要求严格。
- **遗传算法**：PSO 无法覆盖的离散组合空间。
- **群体**：大量耗时不定的独立任务。
- **主管**：任务需要统一连贯的全局计划。
- **MAPPO**：合作式 MARL 从这里开始。
- **自博弈**：零和博弈。策略循环时使用联赛博弈。

## 运行模式
type: task-table
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/code/main.py, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/code/main.py, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/code/main.py, phases/09-reinforcement-learning/10-multi-agent-rl/code/main.py, phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md

| 任务 | 代码 |
|---|---|
| 运行任意课程演示 | `python3 code/main.py` |
| 在 2 个 prompt 参数上运行 PSO | `history = run_lmpso()` |
| 比较 ACO 路由与随机路由 | `run_amro_s(n_tasks=200, seed=0)` |
| 输出信息素轨迹 | `print_pheromone_table(router)` |
| 各 MARL 风格到达目标的步数 | 对 500 次试验运行 `bench(label, runner)` |
| 从共享队列取任务 | `run_swarm(tasks, n_workers)` |
| 在网格上运行独立 Q | `independent_q(episodes=1500)` |
| 在 16 个动作上运行联合 Q | `joint_q_learning(episodes=1500)` |

## PSO 更新
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/code/main.py

```python
w, c1, c2 = 0.6, 1.2, 1.2                  # 惯性、认知、社会
r1, r2 = rng.random(), rng.random()
cognitive = c1 * r1 * (p.p_best[d] - p.x[d])
social = c2 * r2 * (g_best_x[d] - p.x[d])
p.v[d] = w * p.v[d] + cognitive + social
p.x[d] += p.v[d]
p.x[d] = max(bounds[d][0], min(bounds[d][1], p.x[d]))  # 限制在边界内
f = fitness(p.x)                           # 只需评估器，无需梯度
if f > p.p_best_fit:                       # 然后检查 g_best_fit
```

## ACO 路由器
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/code/main.py

```python
router = PheromoneRouter(task_types, agents)   # 每条轨迹从 1.0 开始
aco_agent = router.choose(tt, rng)             # 按信息素权重采样
aq = simulate_task(aco_agent, tt, rng)
router.deposit(tt, aco_agent, aq)
self.pheromones[task_type][a] *= (1.0 - self.decay)    # 所有 agent 的信息素衰减
if quality >= self.quality_threshold:                   # 质量门控
    self.pheromones[task_type][agent] += self.reinforce * quality
```

## CTDE 模式
type: architecture
from: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

```arch
node | state | 1,1 | 全局状态 | 全部观察 + 联合动作 | store
node | critic | 2,1 | 集中式评论家 | 仅训练时使用 | model
node | o1 | 1,2 | Agent 1 观察 | o_i |
node | a1 | 2,2 | 行动者 1 | mu_i(o_i) | process
node | o2 | 3,2 | Agent 2 观察 | o_i |
node | a2 | 4,2 | 行动者 2 | mu_i(o_i) | process
edge | state | critic | 训练
edge | critic | a1 | 梯度
edge | o1 | a1 | 部署
edge | o2 | a2 | 部署
edge | critic | a2 | 梯度
```

## 课程代码默认值
type: defaults
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/code/main.py, phases/09-reinforcement-learning/10-multi-agent-rl/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `n_particles` | 20 | `run_lmpso` 种群大小 |
| `iterations` | 30 | PSO 迭代次数 |
| `decay` | 0.05 | 每次沉积时的信息素衰减 |
| `reinforce` | 0.2 | 沉积量为 reinforce 乘以质量 |
| `quality_threshold` | 0.6 | 低于此值不沉积 |
| `n_tasks` | 200 | `run_amro_s` 中路由的任务数 |
| `epsilon` | 0.15 | `independent_q` 中的探索率 |
| `gamma` | 0.95 | 折扣因子，`alpha` 为 0.1 |

## 失败模式
type: troubleshooting
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 路由器锁定低质量 agent | 快但错误的 agent 获得信息素 | 对沉积设置质量门控 |
| 最佳适应度发散 | 数据变化后发生灾难性漂移 | 重置或将衰减率翻倍 |
| 群体遗忘好解 | 衰减太快 | 减慢衰减，监测最佳适应度 |
| 长任务始终不运行 | 队列饥饿 | 使用带老化机制的优先队列 |
| 任务输出出现两次 | 执行者中途崩溃 | 使用幂等执行者和持久队列 |
| agent 互相追逐 | 策略漂移、非平稳性 | 使用集中式评论家和较低学习率 |
| 旧经验回放妨碍学习 | 转移来自过时对手 | 重新标记或按近期性加权 |
| 拍卖 agent 出价为零 | 通过协调钻奖励空子 | 谨慎设计奖励并加约束 |

## 问答
type: qa
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/09-reinforcement-learning/10-multi-agent-rl/docs/zh.md

- **prompt 为何用无梯度方法？** prompt 是离散字符串，PSO 和 ACO 只需评估器。
- **20 个粒子、50 次迭代的 PSO 成本多少？** 每次调用约 $0.02，总计约 $20。
- **QMIX 为何能去中心化？** 单调混合允许每个 agent 各自取 argmax。
- **为何不为 LLM agent 训练 MARL？** 多数系统用 prompt 定义策略。只有具备数据、奖励和基础设施时才训练。
- **联合 Q 演示为何难以扩展？** 两个 agent 的动作空间是 `|A|² = 16`。

## 交付清单
type: tips
from: phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco/docs/zh.md, phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md

- 从 10-20 个粒子、20-50 次迭代开始。
- 每次迭代记录信息素或 g_best。
- 输出每次迭代的成本指标。
- 为每个群体任务提供 trace ID，队列增长时施加背压。
- 执行路径只允许看到 `o_i`。
- 记录每个 agent 的观察与动作流。
