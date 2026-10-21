---
id: orchestration-patterns
title: 编排模式对比
code: OP
subtitle: 选择主管、群体、层级、辩论或普通工作流模式。代码来自课程，使用 Python 标准库。
hue: 285
sources: phases/14-agent-engineering/28-orchestration-patterns, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern, phases/16-multi-agent-and-swarms/06-hierarchical-architecture, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks, phases/14-agent-engineering/12-anthropic-workflow-patterns
source_hash: d7a547ddefa50431
---

## 四种拓扑对比
type: comparison
span: 2
from: phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md

| 比较项 | 主管与执行者 | 群体 | 层级 | 辩论 |
|---|---|---|---|---|
| 谁负责路由 | 一个中央 LLM | 无中央路由器 | 主管的主管 | 并行提案者 |
| agent 通信 | 只通过主管 | 直接交接 | 只有叶节点执行工作 | 交叉批评 |
| 演示轨迹 | 最清晰 | 最短 | 最深 | 最昂贵 |
| 适用场景 | 2-4 名专家 | 延迟优先于推理清晰度 | 大规模 agent 群体 | 准确率优先于成本 |
| 弱点 | 主管成为瓶颈 | 难以分析 | 任务拆分漂移 | 成本 |
| 框架 | LangGraph `create_supervisor` | LangGraph 群体拓扑 | 嵌套子图或 crew | 自定义 |

## 决策顺序
type: flow
from: phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md

1. **单 agent**：从第 12 课的工作流模式开始。
2. **主管与执行者**：有 2-4 名专家时使用。
3. **群体**：延迟比推理清晰度更重要时使用。
4. **层级**：只在主管上下文预算不足时使用。
5. **辩论**：准确率比成本更重要时使用。

## 主管与并行执行者
type: architecture
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py

```arch
node | q | 1,2 | 用户查询 | | client
node | plan | 2,2 | Lead.plan | 3 个子问题 | model
node | w0 | 3,1 | 执行者 0 | 全新上下文 | process
node | w1 | 3,2 | 执行者 1 | 全新上下文 | process
node | w2 | 3,3 | 执行者 2 | 全新上下文 | process
node | syn | 4,2 | 主管综合 | 仅接收摘要 | model
edge | q | plan |
edge | plan | w0 | sub_q
edge | plan | w1 | sub_q
edge | plan | w2 | sub_q
edge | w0 | syn | 摘要
edge | w1 | syn | 摘要
edge | w2 | syn | 摘要
```

## 各模式的适用条件
type: tips
from: phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md

- 能列出所有步骤时，使用工作流。
- 下一步取决于上一步结果时，使用 agent。
- 研究任务使用主管模式，每名执行者获得独立的 200k-token 窗口。
- 多个耗时不定的独立任务使用群体模式。
- 任务确有独立子团队时，使用层级模式。
- 第 2 步需要第 1 步输出时，使用顺序模式。
- 审计和重放比适应性更重要时，使用静态图。
- 生产起点使用 CrewAI Flow，自主角色使用 Crew。

## 代码中的五种工作流模式
type: task-table
span: 2
from: phases/14-agent-engineering/12-anthropic-workflow-patterns/code/main.py, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md

| 任务 | 代码 |
|---|---|
| prompt 链：第 N 次输出送入第 N+1 次调用 | `prompt_chain(input_text, llm, steps)` |
| 路由：先分类，再分发 | `route(input_text, classifier, handlers)` |
| 并行：运行 N 次，多数结果胜出 | `parallel_vote(prompt, llm, n=5)` |
| 编排器与执行者：选择执行者，再综合 | `orchestrator_workers(task, workers, synth)` |
| 评估器与优化器：循环直到 PASS | `evaluator_optimizer(task, proposer, evaluator, max_iter=5)` |
| 未知标签的回退处理器 | `handlers.get(label) or handlers.get("default")` |
| 运行全部五个演示 | `python3 code/main.py` |

## 主管分发到多个线程
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py

```python
sub_questions = self.plan(query)                  # 3 个子问题
results: list[WorkerResult | None] = [None] * len(sub_questions)
threads: list[threading.Thread] = []
for i, sq in enumerate(sub_questions):
    w = Worker(worker_id=i, trace=self.trace)     # 每个子问题使用新执行者
    th = threading.Thread(target=w.run, args=(sq, results, i))
    threads.append(th)
    th.start()                                    # 所有执行者同时运行
for th in threads:
    th.join()                                     # 总耗时接近最大值，而非总和
synthesis = self.synthesize(query, [r for r in results if r is not None])
```

## 群体执行者从同一队列取任务
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/code/main.py

```python
q: queue.Queue = queue.Queue()
for t in tasks:
    q.put(t)                          # 无编排器分配工作
def worker(wid: int) -> None:
    while True:
        try:
            task = q.get_nowait()
        except queue.Empty:
            return                    # 队列耗尽，执行者退出
        fake_work(task)
        with lock:
            counts[wid] += 1          # 快执行者取得更多任务
        q.task_done()
```

## 限制与预算
type: defaults
from: phases/14-agent-engineering/28-orchestration-patterns/code/main.py, phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md, phases/14-agent-engineering/12-anthropic-workflow-patterns/code/main.py, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 群体跳数 | 3 | `while hops < 3` 阻止 A 到 B 再到 A 的反复跳转 |
| `parallel_vote` `n` | 5 | 相同 prompt，多数投票 |
| `max_iter` | 5 | 评估器与优化器尝试 5 次后停止 |
| 树深度 | 2 | 三层会隐藏大多数错误 |
| 协调轮数 | 2 | 之后最高层管理者必须决断 |
| 执行者超时 | 运行时间中位数的 2 倍 | 终止后缩小范围重启，或跳过 |
| 执行者 token 上限 | 10 倍 | 相对于预期的综合输入量 |
| 主管专家数 | 2-4 | 决策顺序的第 2 步 |

## 关键数值
type: concepts
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/code/main.py, phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md

- **研究提升**：内部研究评估比单 agent Opus 4 高 90.2%。
- **Token 占比**：BrowseComp 方差的 80% 仅来自 token 用量。
- **Token 成本**：多 agent 的 token 用量约为单 agent 的 15 倍。
- **规模投入**：简单查询用一个 agent 和 3-10 次工具调用，复杂查询用 10+ 个 agent。
- **实际耗时**：三个各耗时 0.3 秒的执行者约在 0.35 秒完成，而不是 0.9 秒。
- **群体演示**：8 个任务，包括 4 个慢任务（0.4s）与 4 个快任务（0.1s），4 名执行者。
- **模式大小**：每种工作流模式约需 10-15 行代码。

## 故障与修正
type: troubleshooting
col: 3
from: phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 精确回答了错误的问题 | 主管规划产生幻觉 | 记录计划，与查询比较 |
| 综合结果被污染 | 执行者过度探索 | 设置明确的范围边界 |
| 用户看不到冲突 | 主管默默选边 | 重新提问或明确分歧 |
| 分支回答错误主题 | 管理者错误标注分支 | 添加持有原始查询的金丝雀执行者 |
| 子管理者循环 | 共识循环 | 设置协调预算 |
| 长任务始终不运行 | 队列饥饿 | 使用带老化机制的优先队列 |
| 崩溃后任务执行两次 | 执行者中途崩溃 | 执行者实现幂等，使用持久队列 |

## 工作流还是 agent
type: comparison
from: phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/zh.md

| 比较项 | 工作流 | Agent |
|---|---|---|
| 谁控制图 | 工程师 | 模型 |
| 步数 | 有界 | 可能失控增长 |
| 调试 | 更容易 | 失败模式更难处理 |
| 审计 | 审计者读取图 | 从轨迹推断 |
| 适用场景 | 可预测任务 | 开放式研究 |

## 问答
type: qa
from: phases/14-agent-engineering/28-orchestration-patterns/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/docs/zh.md

- **为何通过工具调用监督？** 你能精确决定每名专家可见的内容。
- **主管模式为何擅长研究？** 主要机制是每个子 agent 都有全新上下文。
- **为何使用彩虹部署？** agent 长时间运行且有状态，蓝绿部署不适用。
- **层级错误在哪里显现？** 在最高层综合结果中，与人类能捕获错误的位置相隔一层。
- **报告为何不用群体模式？** 一群研究者提供独立事实，不能自动形成连贯报告。
- **如何调试群体？** 为每个任务分配 trace ID，用它记录开始与结束。
