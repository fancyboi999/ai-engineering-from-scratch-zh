---
id: agent-reasoning-patterns
title: ReAct、ReWOO、Reflexion 与思维树
code: RR
subtitle: 选择、构建并终止 agent 推理循环。涵盖 ReAct、ReWOO、Reflexion、ToT、LATS、Self-Refine、CRITIC 和 CoT。
hue: 280
sources: phases/14-agent-engineering/01-the-agent-loop, phases/14-agent-engineering/02-rewoo-plan-and-execute, phases/14-agent-engineering/03-reflexion-verbal-rl, phases/14-agent-engineering/04-tree-of-thoughts-lats, phases/14-agent-engineering/05-self-refine-and-critic, phases/11-llm-engineering/02-few-shot-cot
source_hash: 260e01a4270f8ac2
---

## 四种模式对比
type: comparison
span: 2
from: phases/14-agent-engineering/01-the-agent-loop/docs/zh.md, phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/zh.md, phases/14-agent-engineering/03-reflexion-verbal-rl/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

| 维度 | ReAct | ReWOO | Reflexion | ToT / LATS |
|---|---|---|---|---|
| 角色 | 思考、行动、观察 | 规划器、工作器、求解器 | 执行者、评估器、自我反思器 | 策略、价值函数、搜索 |
| LLM 调用 | 每步一次 | 一次规划，一次求解 | 每次尝试执行一轮 | 每个节点一次 |
| 观察结果 | 每一步都有 | 规划器不接收 | 作为反思进入下一次尝试 | 融入价值函数 |
| token 成本 | 随深度增长 | HotpotQA 上约减少 5 倍 | 随缓冲区增长 | CoT 的 100-1000 倍 |
| 论文结果 | ALFWorld 提高 34 个百分点 | HotpotQA 准确率提高 4 个百分点 | ALFWorld 上超过 ReAct | 24 点游戏：4% 提高到 74% |
| 主要故障 | 循环长度膨胀 | 计划静态不变 | 记忆腐化 | 评估器噪声 |

## 各种模式的适用条件
type: concepts
from: phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/zh.md, phases/14-agent-engineering/03-reflexion-verbal-rl/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/zh.md, phases/14-agent-engineering/05-self-refine-and-critic/docs/zh.md

- **ReAct**：短任务、未知环境、需要即时处理异常。
- **ReWOO**：任务结构明确，工具已知，证据可并行获取。
- **Plan-and-Execute**：类似 ReWOO，但部分执行后会重新规划。
- **Plan-and-Act**：长程任务（>30 步），用于网页、移动端或电脑操作。
- **Reflexion**：失败信号明确，且同类任务会反复出现。
- **ToT / LATS**：价值函数便宜可靠，正确性比耗时更重要。
- **Self-Refine**：没有外部验证器，由同一个模型生成并批评。
- **CRITIC**：有外部验证器，例如搜索、代码、计算器或测试。

## ReAct 循环：AgentLoop.run
type: flow
from: phases/14-agent-engineering/01-the-agent-loop/code/main.py, phases/14-agent-engineering/01-the-agent-loop/docs/zh.md

1. **用户**：消息以 `user` 轮次加入历史记录。
2. **LLM**：`respond(history)` 返回思考和行动，或 `finish`。
3. **ToolRegistry**：`dispatch(call)` 按名称执行工具。
4. **格式化器**：工具或参数无效时返回 `error:` 字符串，不让程序崩溃。
5. **循环**：将行动轮次和观察结果加入历史记录，回到第 2 步。
6. **停止**：遇到 `finish`、没有工具调用、达到轮次或 token 上限，或触发护栏。
7. **预算**：超过 `max_turns` 后，循环返回 "budget exhausted"。

## ReWOO：规划、获取、求解
type: architecture
from: phases/14-agent-engineering/02-rewoo-plan-and-execute/code/main.py, phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/zh.md

```arch
node | q | 1,2 | 问题 | user_question | client
node | plan | 2,2 | 规划器 | 计划 DAG，不接收观察 | model
node | e1 | 3,1 | 工作器 E1 | 搜索首都 | process
node | e2 | 3,2 | 工作器 E2 | #E1 的人口 | process
node | e3 | 3,3 | 工作器 E3 | round_million #E2 | process
node | solve | 4,2 | 求解器 | 问题、计划、证据 | model
edge | q | plan |
edge | plan | e1 | 拓扑顺序
edge | e1 | e2 | #E1
edge | e2 | e3 | #E2
edge | e3 | solve | 证据
```

## Reflexion 的一次尝试
type: flow
from: phases/14-agent-engineering/03-reflexion-verbal-rl/code/main.py, phases/14-agent-engineering/03-reflexion-verbal-rl/docs/zh.md

1. **执行者**：`actor.act(memory)` 返回候选轨迹。
2. **评估器**：`binary_evaluator(attempt, TARGET)` 返回是否成功及差值。
3. **自我反思器**：写一行反思，例如“选择更大的值”。
4. **EpisodicMemory**：用 `memory.add` 保存反思，超过 `max_len` 后丢弃最旧记录。
5. **下一次尝试**：从头开始，但能看到先前反思。成功后结束运行。

## LATS：一次 MCTS 迭代
type: flow
from: phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/code/main.py

1. **选择**：按 `Q(s, a) + c * sqrt(ln N(s) / N(s, a))` 从根走到叶节点。
2. **扩展**：用策略生成 K 个子节点。
3. **模拟**：从子节点继续推演，用价值函数给叶节点评分。
4. **回传**：将路径上的 `visits` 加 1，并将奖励加入 `value_sum`。

## 代码中的任务
type: task-table
from: phases/14-agent-engineering/01-the-agent-loop/code/main.py, phases/14-agent-engineering/02-rewoo-plan-and-execute/code/main.py, phases/14-agent-engineering/03-reflexion-verbal-rl/code/main.py, phases/14-agent-engineering/04-tree-of-thoughts-lats/code/main.py, phases/14-agent-engineering/05-self-refine-and-critic/code/main.py

| 任务 | 代码 |
|---|---|
| 注册工具 | `tools.register("calculator", calculator)` |
| 给计划 DAG 排序 | `topological(plan)` |
| 填入 #E 引用 | `resolve_references(value, evidence)` |
| 带记忆的 Reflexion | `run_reflexion(max_trials=4, use_memory=True)` |
| ToT 广度优先搜索 | `tot_bfs(root_tot)` |
| LATS 搜索 | `mcts(root_lats, iterations=80, rng=rng)` |
| CRITIC 循环 | `run_loop("world facts", use_critic=True)` |

## CoT 逐级升级流程
type: annotated-code
lang: python
from: phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

```python
single_answer, _ = few_shot_cot_solve(question, examples, client, model)  # temperature 为 0.0
sc_answer, confidence, reasonings, votes = self_consistency_solve(
    question, examples, client, model, n_samples=5
)                                                   # temperature 为 0.7，多数投票
if confidence >= 0.8 and single_answer == sc_answer:
    return sc_answer                                # 5 个样本中有 4 个一致
tot_answer, tot_reasoning = tree_of_thought_solve(
    question, client, model, breadth=3, depth=2
)                                                   # 难题升级处理
```

## prompt 推理阶梯（GPT-5、GSM8K）
type: comparison
from: phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

| 维度 | 零样本 CoT | 少样本 CoT | 自一致性（N=5） | 思维树 |
|---|---|---|---|---|
| API 调用 | 1 | 1 | 5 | 10-40+ |
| token 开销 | 50-200 token | 300-600 token | 5 倍 token 成本 | 10-40 倍 token 成本 |
| 准确率 | 97% | 98% | 98.5% | 24 点游戏上为 74% |
| 最适合 | 快速提升推理能力 | 最大化单次调用准确率 | 高风险推理 | 搜索与规划问题 |

## 课程代码的默认值
type: defaults
from: phases/14-agent-engineering/01-the-agent-loop/code/main.py, phases/14-agent-engineering/03-reflexion-verbal-rl/code/main.py, phases/14-agent-engineering/04-tree-of-thoughts-lats/code/main.py, phases/14-agent-engineering/05-self-refine-and-critic/code/main.py, phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_turns` | 12 | AgentLoop 轮次预算。演示设为 10 |
| `max_len` | 6 | EpisodicMemory 容量 |
| `max_iters` | 4 | `run_loop` 中的修订循环上限 |
| `uct` 中的 `c` | 1.4 | 探索权重 |
| `max_expansions_per_level` | 8 | ToT BFS 搜索前沿宽度 |
| `max_depth` | 3 | ToT BFS 深度 |
| `n_samples` | 5 | 自一致性投票数 |
| `temperature` | 0.7 | 采样路径；设为 0.0 时所有样本相同 |

## 故障排查
type: troubleshooting
from: phases/14-agent-engineering/01-the-agent-loop/docs/zh.md, phases/14-agent-engineering/02-rewoo-plan-and-execute/code/main.py, phases/14-agent-engineering/03-reflexion-verbal-rl/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/zh.md, phases/14-agent-engineering/05-self-refine-and-critic/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| agent 遇到 400 错误仍声称成功 | 错误没有反馈给模型 | 将每个错误转成观察字符串 |
| 网页向 agent 发号施令 | 信任边界失效 | 只有用户的直接指令才构成授权 |
| "cyclic plan or unresolved reference" | 某一步引用了不存在的节点 | 修正计划中的 #E 引用 |
| 重跑越来越慢，建议过时 | 记忆腐化 | 压缩反思或设置 TTL |
| 反思没有帮助 | 外部故障、网络中断 | 不保存偶发失败运行的反思 |
| 批评总说没问题 | 走过场的审查循环 | 使用结构不同的 prompt |
| 搜索得到高分错误答案 | 评估器有噪声 | 仅在价值函数可靠时使用搜索 |

## 问答
type: qa
from: phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/zh.md, phases/14-agent-engineering/05-self-refine-and-critic/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

- **ReWOO 为什么使用更少 token？** ReAct 的 prompt 携带之前的每一步；ReWOO 工作器只接收工具调用。
- **7B 模型为什么能规划？** 规划器不看观察结果，而是学习 175B 教师模型的计划。
- **LATS 在 ToT 上增加了什么？** MCTS。LLM 同时充当策略、价值函数和自我反思器。
- **Self-Refine 为什么保留历史？** 修订时会查看之前的输出与批评。没有历史，质量会大幅下降。
- **为什么选择 CRITIC 而不是 Self-Refine？** 产生幻觉的模型往往也会觉得这个幻觉可信。
- **要给推理模型加 CoT 吗？** 不要。o 系列和 DeepSeek-R1 内部已执行 CoT。

## 提示
type: tips
from: phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/zh.md, phases/14-agent-engineering/04-tree-of-thoughts-lats/outputs/skill-search-policy.md, phases/14-agent-engineering/05-self-refine-and-critic/docs/zh.md

- 从最简单的模式开始。一次工具调用加一段总结用不着 ReWOO。
- 验证器通过后就停止修订循环，同时用 `max_iterations` 设置上限。
- 将分支因子 K 保持在 3-5。K=10 会让成本暴涨。
