# 证据对照：多 Agent 系统

中文主题：[多 Agent 系统](../multi-agent.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 四个基本要素

对应主题区块：**四个基本要素**（`architecture`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md`](../../phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py`](../../phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py)
- [`phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md`](../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md`](../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py`](../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py)

构建器核对的标识与数值：

- `thread_id`
- `super_step`

## 协调 agent

对应主题区块：**协调 agent**（`task-table`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py`](../../phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py)
- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py)
- [`phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py`](../../phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py)
- [`phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py`](../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py)
- [`phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/code/main.py`](../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/code/main.py)

构建器核对的标识与数值：

- `state.append`
- `SharedState`
- `append`
- `StaticOrchestrator`
- `run`
- `HandoffOrchestrator`
- `round_robin_selector`
- `LLMSelectorOrchestrator`
- `transfer_to_refunds`
- `refund_agent`
- `run_groupchat`
- `max_rounds`
- `threading.Thread`
- `w.run`
- `Thread`
- `bb.publish`
- `publish`

## 投票、持久化与保护

对应主题区块：**投票、持久化与保护**（`task-table`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py)
- [`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py`](../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py)
- [`phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py`](../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py)

构建器核对的标识与数值：

- `plurality`
- `cp_wbft`
- `decentllms`
- `store.write`
- `thread_id`
- `super_step`
- `write`
- `dict`
- `store.latest`
- `latest`
- `AgentQueue`
- `enqueue`
- `breaker.allow`
- `breaker.record`
- `allow`
- `record`

## 一次监督者运行

对应主题区块：**一次监督者运行**（`flow`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/code/main.py)
- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md)

构建器核对的标识与数值：

- `plan`
- `tokens_spent`
- `synthesize`
- `wall_clock_seconds`
- `total_tokens`
- `worker_count`

## 交接循环（Swarm 风格）

对应主题区块：**交接循环（Swarm 风格）**（`annotated-code`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py`](../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/code/main.py)

构建器核对的标识与数值：

- `run_swarm`
- `start_agent`
- `user_messages`
- `history.append`
- `append`
- `Msg`
- `scripted_router`
- `isinstance`
- `out.name`
- `active.name`
- `str`

## 按置信度加权投票

对应主题区块：**按置信度加权投票**（`annotated-code`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py)

构建器核对的标识与数值：

- `cp_wbft`
- `v.canonical`
- `canonical`
- `weights.get`
- `v.confidence`
- `get`
- `rep.setdefault`
- `v.answer`
- `setdefault`
- `weights.values`
- `sum`
- `values`
- `winner_key`
- `max`

## 选择模式

对应主题区块：**选择模式**（`concepts`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/01-why-multi-agent/docs/zh.md`](../../phases/16-multi-agent-and-swarms/01-why-multi-agent/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md`](../../phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md`](../../phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md`](../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md`](../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 代码默认值

对应主题区块：**代码默认值**（`defaults`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py`](../../phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py)
- [`phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py`](../../phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/code/main.py)
- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/code/main.py)
- [`phases/16-multi-agent-and-swarms/15-voting-debate-topology/code/main.py`](../../phases/16-multi-agent-and-swarms/15-voting-debate-topology/code/main.py)
- [`phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py`](../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py)

构建器核对的标识与数值：

- `max_steps`
- `10`
- `max_rounds`
- `8`
- `TERMINATE`
- `cp_wbft`
- `0.5`
- `2`
- `failure_threshold`
- `window_size`
- `20`
- `open_cooldown_s`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md`](../../phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md`](../../phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md`](../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md`](../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md`](../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md`](../../phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py`](../../phases/16-multi-agent-and-swarms/04-primitive-model/code/main.py)

构建器核对的标识与数值：

- `max_steps`

## 术语表

对应主题区块：**术语表**（`glossary`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md`](../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md`](../../phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md`](../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md`](../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md`](../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md`](../../phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md`](../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md`](../../phases/16-multi-agent-and-swarms/04-primitive-model/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md`](../../phases/16-multi-agent-and-swarms/06-hierarchical-architecture/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md`](../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md`](../../phases/16-multi-agent-and-swarms/15-voting-debate-topology/docs/zh.md)
- [`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md`](../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/multi-agent.md

Paths are relative to /private/tmp/aiefs-cheatsheets/phases/16-multi-agent-and-swarms/. Lesson directories are shortened to their number: 04 = 04-primitive-model, and so on. D = docs/en.md, C = code/main.py.

## Four primitives (architecture, 8 nodes, 7 edges)
- Orchestrator static, handoff, selector: 04/D:23; 04/C:82-128
- CheckpointStore thread_id, super_step, each step: 22/C:22-48; 22/D:52
- Agents researcher, writer, reviewer, prompt + tools, stateless: 04/C:74-79; 04/D:21, 54
- handoff edges: 04/C:59, 65; 04/D:22
- SharedState message pool, append: 04/C:23-30; 04/D:24
- Blackboard topic pub/sub, publish: 13/D:47; 13/C:68-104
- Verifier read only, reads pool: 13/D:71, 93-102

## Coordinate agents (task-table, 8)
- SharedState(), append: 04/C:24-30
- StaticOrchestrator(order).run(team, state): 04/C:82-91, 155
- HandoffOrchestrator(start).run: 04/C:94-110, 160
- LLMSelectorOrchestrator(start, round_robin_selector): 04/C:113-128, 165
- transfer_to_refunds returns an Agent: 11/C:29-31
- run_groupchat(AGENTS, selector, max_rounds=8, label): 10/C:85-90, 121
- threading.Thread(target=w.run, args=(sq, results, i)): 05/C:96-100
- bb.publish(writer, topic, content, prompt): 13/C:77, 206

## Vote, persist and protect (task-table, 7)
- plurality(votes): 14/C:25, 80
- cp_wbft(votes, threshold=0.5): 14/C:36, 81
- decentllms(votes): 14/C:50, 82
- store.write(thread_id, super_step, dict(state)): 22/C:67
- store.latest(thread_id): 22/C:54
- AgentQueue(id).enqueue(msg): 22/C:81-88, 105
- breaker.allow(), breaker.record(ok): 23/C:126, 133

## One supervisor run (flow, 7)
1. plan(query) sub-questions: 05/C:74-80, 89
2. one Worker thread per sub-question: 05/C:92-97
3. fresh context, narrow question: 05/D:44
4. WorkerResult with summary and tokens_spent: 05/C:58-64
5. join, wall clock is max of workers: 05/C:99-100; 05/D:46
6. synthesize(query, results): 05/C:82-85, 103
7. wall_clock_seconds, total_tokens, worker_count: 05/C:104-110

## Handoff loop (annotated-code, 14 lines)
- all lines: 11/C:113-126. scripted_router stands in for an LLM: 11/C:86-88. Stateless: 11/D:47

## Confidence-weighted vote (annotated-code, 12 lines)
- all lines: 14/C:36-47 (return type annotation left out of the def line). canonical clusters answers: 14/C:20-22. retry or escalate below threshold: 14/D:69, 78

## Pick a pattern (concepts, 8)
- Pipeline: 01/D:154
- Fan-out / fan-in: 01/D:166
- Supervisor, wrong for sequential tasks: 05/D:69
- Hierarchical, only leaves work: 06/D:117
- Group chat selector: 10/D:84-90
- Handoff tool returns agent: 11/D:126
- Blackboard wins with many agents, long runs: 13/D:47
- Single agent under 20 tool calls and 100k tokens: 01/D:220

## Defaults in the code (defaults, 8)
- max_steps 10: 04/C:88, 100, 121
- max_rounds 8: 10/C:121
- TERMINATE: 10/C:32, 49, 103
- threshold 0.5: 14/C:36
- rounds 2: 15/C:79
- failure_threshold 0.5, window_size 20, open_cooldown_s 0.5: 23/C:66-68

## Troubleshooting (8)
- hot speaker, speaker balance: 10/D:82
- context bloat, projections: 10/D:81
- handoff loop: 11/D:130. max_steps cap: 04/C:100-102
- memory poisoning, provenance, append only, verifier: 13/D:69-71
- monoculture, mix models: 14/D:38; 15/D:80
- decomposition drift, canary question: 06/D:119, 122
- synthesis conflict: 05/D:65
- retry storm 10x, circuit breaker: 23/D:86, 91

## Glossary (6)
- BFT f < n/3: 14/D:22, 140
- CP-WBFT: 14/D:42
- MAST: 23/D:190
- MARBLE: 24/D:137
- Super-step: 22/D:168
- Outbox pattern: 22/D:99, 171

## Q&A (5)
- about 15 times the tokens: 05/D:55
- unwritable verifier: 13/D:71, 102
- threshold 0.5 to 0.67 for 5 to 7 agents: 14/D:78
- three models beat five copies: 15/D:80
- specification problems 41.77%: 23/D:20

## Tips (6)
- shared state is the only stateful part: 04/D:54
- depth 2 ceiling: 06/D:121
- bound rounds 2 or 3: 14/D:84; 15/D:90
- coordination tax past about 4 agents: 15/D:59
- async I/O, threads about 1MB: 22/D:75
- dedup key in every side-effect call: 22/D:98
````
