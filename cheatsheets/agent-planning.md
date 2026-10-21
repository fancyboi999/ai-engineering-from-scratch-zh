---
id: agent-planning
title: Agent 规划：工作流、HTN 与计划执行
code: AW
subtitle: 选择工作流、HTN 或演化规划器，或支持重新规划的执行器。使用课程中的 Python 标准库实现。
hue: 32
sources: phases/14-agent-engineering/11-planning-htn-and-evolutionary, phases/14-agent-engineering/12-anthropic-workflow-patterns, phases/19-capstone-projects/24-plan-execute-control-flow, phases/14-agent-engineering/44-plan-from-evidence
source_hash: 6965a457b50baedd
---

## 选择规划器
type: comparison
from: phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md

| 因素 | 工作流 | HTN + ChatHTN | AlphaEvolve | ReAct / ReWOO |
|---|---|---|---|---|
| 决策方 | 工程师 | 符号层 | 评估器选择 | 模型 |
| 保证 | 步数有界 | 可证明的可靠性 | 按适应度选最优计划 | 无形式化保证 |
| 要求 | 可枚举的步骤 | 操作符模式 | 机器可检查的适应度 | LLM 参与循环 |
| 适用场景 | 可预测、受合规约束 | 调度、受策略约束 | 编译器优化 | 开放式研究 |
| LLM 职责 | 在固定代码路径上调用 | 兜底分解 | 提出变异 | 选择每一步 |

## 五种工作流模式的代码
type: task-table
from: phases/14-agent-engineering/12-anthropic-workflow-patterns/code/main.py, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md
span: 2

| 任务 | 代码 |
|---|---|
| prompt 链：输出 N 是输入 N+1 | `prompt_chain(input_text, llm, steps)` |
| 路由：先分类，再分派 | `route(input_text, classifier, handlers)` |
| 并行：运行 N 次，多数投票 | `parallel_vote(prompt, llm, n=5)` |
| 编排器与工作者：选择专长模块 | `orchestrator_workers(task, workers, synth)` |
| 评估器与优化器：循环直到 PASS | `evaluator_optimizer(task, proposer, evaluator, max_iter=5)` |
| 未知路由标签 | `handlers.get("default")` 返回 "escalate to human" |
| 运行全部五个演示 | `python3 code/main.py` |

## 计划执行器
type: flow
from: phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md, phases/19-capstone-projects/24-plan-execute-control-flow/code/main.py

1. **规划器**：`planner(goal, history, None)` 返回首个计划。事件为 `plan.commit`。
2. **执行器**：通过分派器运行 `plan[cursor]`。事件为 `step.start` 和 `step.end`。
3. **执行器**：成功后追加历史，将游标移至下一步。
4. **执行器**：异常时保存 `step.error` 并设置 `last_error`。
5. **预算检查**：`replans_used >= self.max_replans` 返回失败，原因为 `replan_budget`。
6. **规划器**：`planner(goal, history, last_error)` 给出新计划。事件为 `plan.draft`。
7. **执行器**：发出 `plan.diff`，提交新计划并设置 `cursor = 0`。
8. **执行器**：最后一步成功。发出 `session.complete`，原因为 `goal_met`。

## 基于证据的计划批次
type: architecture
from: phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md, phases/14-agent-engineering/44-plan-from-evidence/code/main.py

```arch
node | contract | 1,1 | 契约 | 第 1 批，审查契约 | process
node | impl | 2,1 | 实现 | 第 2 批，unittest | process
node | docs | 2,2 | 文档 | 第 2 批，check_links.py | process
node | integ | 3,1 | 集成 | 第 3 批，验收关卡 | process
edge | contract | impl | 依赖
edge | contract | docs | 依赖
edge | impl | integ |
edge | docs | integ |
```

## 运行可重新规划的 agent
type: annotated-code
lang: python
from: phases/19-capstone-projects/24-plan-execute-control-flow/code/main.py

```python
agent = PlanExecuteAgent(
    planner=make_deterministic_planner(fail_step_id=2, recovery="route_around"),
    executor=executor,              # (tool_name, args) -> result，抛出 ToolFailure
    max_steps=12, max_replans=5,    # 两项预算均为硬限制
)
res = agent.run("ship the report")
res.status, res.reason              # "completed" 和 "goal_met"
res.revisions                       # PlanDiff 列表
r.to_dict()                         # revision、removed、added、revised
Step(2, "transform", {"mode": "v2"}, "computed via fallback")
```

## 带 LLM 兜底的 HTN 规划器
type: annotated-code
lang: python
from: phases/14-agent-engineering/11-planning-htn-and-evolutionary/code/main.py

```python
op = Operator("open_editor", ("logged_in",), ("editor_open",))
m = Method("ship_change_m1", "ship_change", ("logged_in",),
           ("open_editor", "write_tests", "run_tests", "open_pr"))
planner = HTNPlanner(operators=operators, methods=methods, llm=llm)
plan = planner.plan("ship_change", {"logged_in"})  # 操作符列表或 None
planner.cached_methods      # 保留 LLM 分解结果供下次调用
planner.llm.calls           # 命中缓存时新增调用为 0
```

## 规划术语
type: concepts
from: phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md, phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md

- **操作符**：带前置条件和效果的基本动作。
- **方法**：将复合任务拆成子任务的方式，带有前置条件。
- **ChatHTN**：没有匹配方法时，符号规划器向 LLM 求助。
- **适应度函数**：针对输出的确定性评分，可由机器检查。
- **增强型 LLM**：LLM 加搜索、工具和记忆，是基本单元。
- **expected_outcome**：规划器定义的成功条件，执行器不强制检查。
- **重新规划**：把错误交给规划器。这一步将脚本变为 agent。

## 默认值
type: defaults
from: phases/19-capstone-projects/24-plan-execute-control-flow/code/main.py, phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md, phases/14-agent-engineering/11-planning-htn-and-evolutionary/code/main.py, phases/14-agent-engineering/12-anthropic-workflow-patterns/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_steps` | `12` | 所有步骤执行，包括重新规划后的步骤 |
| `max_replans` | `5` | 首个计划之后的规划器调用次数 |
| `max_depth` | `12` | HTN 递归上限，超限返回 None |
| `max_iter` | `5` | 评估器与优化器的循环轮数 |
| `n` | `5` | `parallel_vote` 的投票数 |
| `generations` | `12` | 演化演示，从 6 个中保留前 3 个 |

## 失败与修正
type: troubleshooting
from: phases/19-capstone-projects/24-plan-execute-control-flow/code/main.py, phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md, phases/14-agent-engineering/44-plan-from-evidence/code/main.py, phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `failed`，原因为 `replan_budget` | 规划器反复返回同一错误计划 | 传入 `last_error` 并绕过故障 |
| `failed`，原因为 `step_budget` | 重新规划使步数超过 `max_steps` | 缩短计划或复用历史 |
| `failed`，原因为 `no_plan` | 规划器返回 `[]` | 为该错误添加恢复计划 |
| `dependency cycle among:` | 工作项互相等待 | 解决背后的分歧 |
| `has no repository evidence` | 工作项的 `evidence` 为空 | 引用一项仓库事实 |
| `has no proof command` | `proof` 为空 | 给出一条精确检查命令 |
| HTN 可靠性失效 | 缺少前置条件与效果模式 | 用操作符校验 LLM 输出 |
| 演化不收敛 | 让 LLM 判断代码是否更好 | 使用确定性且快速的评估器 |

## 命令
type: command-table
from: phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md, phases/19-capstone-projects/24-plan-execute-control-flow/code/main.py, phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 运行课程演示并打印轨迹 |
| `python3 -m unittest discover code/tests -v` | 运行证据计划测试 |
| `outputs/evidence-plan.json` | 第 44 课写入，状态为 ready 或 blocked |

## 问答
type: qa
from: phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md, phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md, phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md, phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md

- **工作流还是 agent？** 能枚举步骤时用工作流。下一步取决于上一步结果时用 agent。
- **为何限制重新规划次数和步数？** 有上限的重新规划更快失败，原因也更明确。
- **ChatHTN 为何可靠？** LLM 输出只作为候选分解进入，模式会拒绝无效结果。
- **哪些步骤一起运行？** 同一批次的步骤。集成等待两个分支完成。

## 提示
type: tips
from: phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/zh.md, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md, phases/19-capstone-projects/24-plan-execute-control-flow/docs/zh.md, phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md

- 从直接调用 API 开始。使用 HTN 前先考虑 ReAct 或 ReWOO。
- 先定义契约，再编写实现。
- 每个工作项都要包含 id、改动、证据、依赖和证明。
- 每次修订都输出计划差异，不要悄悄重写计划。
- 将计划存放在工作旁，而非聊天复选框中。
