---
id: multi-agent
title: 多 Agent 系统
subtitle: Agent、交接、共享状态与编排器：选择模式、投票、保存检查点并排查已知故障。
hue: 290
sources: phases/16-multi-agent-and-swarms/01-why-multi-agent, phases/16-multi-agent-and-swarms/04-primitive-model, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern, phases/16-multi-agent-and-swarms/06-hierarchical-architecture, phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection, phases/16-multi-agent-and-swarms/11-handoffs-and-routines, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard, phases/16-multi-agent-and-swarms/14-consensus-and-bft, phases/16-multi-agent-and-swarms/15-voting-debate-topology, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks
code: MA
source_hash: d5be1678f92ea623
---

## 四个基本要素
type: architecture
from: phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md, phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py

```arch
node | orch | 2,1 | 编排器 | 静态、交接、选择器
node | ckpt | 4,1 | CheckpointStore | thread_id, super_step
node | a | 1,2 | Agent：研究员 | prompt 与工具
node | b | 2,2 | Agent：作者 | 无状态
node | c | 3,2 | Agent：评审员 | 无状态
node | pool | 2,3 | SharedState | 消息池
node | bb | 1,3 | 黑板 | 按主题发布与订阅
node | ver | 3,3 | 验证器 | 只读
edge | orch | b | 运行
edge | orch | ckpt | 每步
edge | a | b | 交接
edge | b | c | 交接
edge | b | pool | 追加
edge | a | bb | 发布
edge | pool | ver | 读取
```

## 协调 agent
type: task-table
from: phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py, phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py, phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/code/main.py

| 任务 | 代码 |
|---|---|
| 共享消息池 | 先 `state = SharedState()`，再 `state.append(<msg>)` |
| 按固定顺序运行 | `StaticOrchestrator(<order>).run(team, state)` |
| 由 agent 选择下一位 | `HandoffOrchestrator("<start>").run(team, state)` |
| 由选择器选择下一位 | `LLMSelectorOrchestrator("<start>", round_robin_selector)` |
| 通过工具交接 | `def transfer_to_refunds() -> "Agent": return refund_agent` |
| 运行群聊 | `run_groupchat(AGENTS, <selector>, max_rounds=8, label="<label>")` |
| 扇出工作进程 | `threading.Thread(target=w.run, args=(sq, results, i))` |
| 向主题发布 | `bb.publish("<writer>", "<topic>", "<content>", "<prompt>")` |

## 投票、持久化与保护
type: task-table
from: phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py

| 任务 | 代码 |
|---|---|
| 统计票数 | `plurality(votes)` |
| 按置信度加权投票 | `cp_wbft(votes, threshold=0.5)` |
| 无领导选择 | `decentllms(votes)` |
| 保存检查点 | `store.write(thread_id, super_step, dict(state))` |
| 崩溃后恢复 | `store.latest(thread_id)` |
| 给 agent 分配队列 | `AgentQueue("<agent_id>").enqueue(<msg>)` |
| 阻止重试风暴 | 先 `if not breaker.allow(): ...`，再 `breaker.record(ok)` |

## 一次监督者运行
type: flow
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md

1. **主管**：`plan(query)` 将查询拆为子问题。
2. **主管**：为每个子问题启动一个 `Worker` 线程。
3. **工作者**：从全新上下文开始，只处理一个窄范围问题。
4. **工作者**：写入包含摘要与 `tokens_spent` 的 `WorkerResult`。
5. **主管**：等待全部线程，墙钟耗时约等于最慢工作者。
6. **主管**：`synthesize(query, results)` 合并答案。
7. **主管**：报告 `wall_clock_seconds`、`total_tokens` 与 `worker_count`。

## 交接循环（Swarm 风格）
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py

```python
def run_swarm(start_agent: Agent, user_messages: list[str]) -> list[Msg]:
    history: list[Msg] = []
    active = start_agent                      # 当前持有对话的 agent
    for user in user_messages:
        history.append(Msg(role="user", content=user))
        out = scripted_router(active, user)   # 代替 LLM
        if isinstance(out, Agent):            # 工具返回了 agent
            history.append(
                Msg(role="assistant", content=f"(handoff to {out.name})", sender=active.name)
            )
            active = out                      # 切换活跃 agent
            out = scripted_router(active, user)
        history.append(Msg(role="assistant", content=str(out), sender=active.name))
    return history                            # 不持久化任何内容
```

## 按置信度加权投票
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py

```python
def cp_wbft(votes: list[Vote], threshold: float = 0.5):
    weights: dict[str, float] = {}
    rep: dict[str, str] = {}
    for v in votes:
        key = v.canonical()                   # 将等价答案聚类
        weights[key] = weights.get(key, 0.0) + v.confidence
        rep.setdefault(key, v.answer)
    total = sum(weights.values()) or 1.0
    winner_key = max(weights, key=weights.get)
    if weights[winner_key] / total < threshold:
        return None, weights                  # 支持不足：重试或升级处理
    return rep[winner_key], weights
```

## 选择模式
type: concepts
from: phases/16-multi-agent-and-swarms/01-why-multi-agent/docs/zh.md, phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md, phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md

- **流水线**：各 agent 处理后向下传递，某阶段失败会阻塞后续阶段。
- **扇出与汇聚**：拆给并行 agent 后再合并，适用于独立子任务。
- **监督者**：主管规划、分配与综合，不适合顺序任务。
- **层级结构**：监督者管理监督者，仅叶子节点执行工作。
- **群聊**：同级 agent 共享消息池，选择器决定下一位发言者。
- **交接**：活跃 agent 调用工具，由工具返回下一个 agent。
- **黑板**：按主题发布与订阅，适用于大量 agent 的长任务。
- **单 agent**：少于 20 次工具调用、100k token 时优先单个 agent。

## 代码默认值
type: defaults
from: phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py, phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py, phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py, phases/16-multi-agent-and-swarms/15-voting-debate-topology/code/main.py, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_steps` | 10 | 每个编排器的 `run` |
| `max_rounds` | 8 | 群聊演示上限 |
| `TERMINATE` | TERMINATE | 结束群聊的 token |
| `threshold` | 0.5 | `cp_wbft` 接受比例 |
| `rounds` | 2 | 图拓扑辩论轮数 |
| `failure_threshold` | 0.5 | 错误率超过此值时熔断 |
| `window_size` | 20 | 窗口内的熔断结果数 |
| `open_cooldown_s` | 0.5 | 进入半开状态前的秒数 |

## 故障排查
type: troubleshooting
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md, phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md, phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md, phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 某个 agent 每轮都发言 | 选择器偏爱活跃发言者 | 加入发言平衡约束 |
| 每轮上下文都增长 | 每个 agent 读取全部消息 | 给 agent 提供状态投影 |
| 两个 agent 来回交接 | 交接循环 | 限制编排器 `max_steps` |
| 错误数字传播到所有 agent | 共享状态被投毒 | 记录来源、仅追加、只读验证器 |
| 多数 agent 一起答错 | 全部使用同一基座模型 | 混合不同基座模型 |
| 工作者研究错目标 | 管理者拆分偏离目标 | 增加金丝雀问题工作者 |
| 工作者意见不同却只采纳一方 | 综合阶段静默忽略冲突 | 重新提问或报告分歧 |
| 下游负载增长 10 倍 | 重试风暴 | 熔断器与重试上限 |

## 术语表
type: glossary
from: phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md

- **BFT**：拜占庭容错，可容忍 `f < n/3` 个故障节点。
- **CP-WBFT**：置信度探测加权 BFT，按置信度加权投票。
- **MAST**：失败分类，涵盖规格、协调与验证。
- **MARBLE**：MultiAgentBench，含星形、链形、树形和图拓扑。
- **超步**：两个检查点之间的工作单元。
- **Outbox 模式**：先写入副作用意图，再由独立执行器运行。

## 问答
type: qa
from: phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md, phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md, phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md

- **多 agent 成本如何？** token 消耗约为单 agent 的 15 倍。
- **验证器为何不可写？** 被投毒的共享池就无法经写操作污染它。
- **5 至 7 名投票者用什么阈值？** 0.5 至 0.67，低于阈值就升级处理。
- **增加 agent 还是增加模型种类？** 模型种类，三个不同模型胜过同模型五个副本。
- **最常见失败是什么？** 规格问题，占 MAST 失败的 41.77%。

## 提示
type: tips
from: phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md, phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md, phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md, phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md

- 共享状态是唯一有状态部分，排查时先看这里。
- 层级深度保持在 2 层以内。
- 辩论限制在 2 至 3 轮。
- 图中超过约 4 个 agent 后，协调成本会增长。
- LLM 调用使用异步 I/O，每个线程约占 1MB。
- 每次有副作用的调用都带去重键。
