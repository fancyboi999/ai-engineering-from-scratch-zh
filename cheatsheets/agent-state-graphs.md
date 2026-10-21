---
id: agent-state-graphs
title: Agent 状态机与持久化图
code: AM
subtitle: 状态、节点、边、归约器、检查点、中断和租约任务恢复。涵盖 LangGraph 与 Go 任务队列。
hue: 165
sources: phases/11-llm-engineering/16-langgraph-state-machines, phases/14-agent-engineering/13-langgraph-stateful-graphs, projects/durable-agent-jobs
source_hash: c1ec4f460e05e614
---

## 状态图的组成
type: concepts
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/zh.md

- **状态**：流经图的有类型字典。每个节点都取得完整状态。
- **节点**：`state -> partial_state` 函数。执行一个独立步骤。
- **边**：静态边指向一个节点，条件边调用路由函数。
- **归约器**：按字段执行 `(old, new) -> merged`。默认覆盖。
- **线程**：以 `thread_id` 字符串限定一次会话中所有检查点的范围。
- **检查点**：节点执行后的完整状态，以 `(thread_id, checkpoint_id)` 为键。
- **Send**：节点返回 `Send(node_name, state)` 来并行运行节点。
- **子图**：编译后的图，可作为另一个图中的节点。

## 四节点 ReAct 图
type: annotated-code
lang: python
from: phases/11-llm-engineering/16-langgraph-state-machines/code/main.py, phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md

```python
class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]  # 追加而非覆盖
def should_continue(state: State) -> str:
    last = state["messages"][-1]
    return "tools" if getattr(last, "tool_calls", None) else END
graph = StateGraph(State)
graph.add_node("agent", agent_node)  # 调用 LLM
graph.add_node("tools", ToolNode(TOOLS))  # 执行 tool_calls
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")  # 返回的静态边
app = graph.compile(checkpointer=MemorySaver(),
                    interrupt_before=["tools"])  # 在副作用前暂停
```

## 带检查点的 ReAct 循环
type: architecture
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md

```arch
node | user | 1,1 | 用户 | thread_id | client
node | agent | 2,1 | agent | 调用 LLM | model
node | tools | 3,1 | tools | ToolNode | process
node | end | 2,2 | END | 无 tool_calls |
node | ckpt | 3,2 | 检查点存储器 | 每个节点后的状态 | store
edge | user | agent | messages
edge | agent | tools | tool_calls
edge | tools | agent | 工具结果
edge | agent | end | 完成
edge | tools | ckpt | 保存
```

## 图操作
type: task-table
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/11-llm-engineering/16-langgraph-state-machines/code/main.py

| 任务 | 代码 |
|---|---|
| 设置线程 | `{"configurable": {"thread_id": "<id>"}}` |
| 流式返回增量 | `app.stream(<state>, config, stream_mode="updates")` |
| 读取暂停状态 | `app.get_state(config)` |
| 批准并恢复 | `app.invoke(Command(resume=True), config)` |
| 通过消息拒绝 | `app.update_state(config, {"messages": [...]})` |
| 列出检查点 | `list(app.get_state_history(config))` |
| 从检查点重放 | `app.stream(None, <old_config>)` |
| Postgres 存储 | `PostgresSaver.from_conn_string(<url>)` |

## 流式模式
type: comparison
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md

| 比较项 | `updates` | `messages` | `values` |
|---|---|---|---|
| 产出 | 状态增量 | LLM token | 完整快照 |
| 形态 | `{node_name: state_delta}` | 模型节点中的 token | 完整状态 |
| 用途 | UI | token 流式输出 | 评估 |

## 暂停、批准与恢复
type: flow
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/11-llm-engineering/16-langgraph-state-machines/code/main.py

1. **编译**：设置 `interrupt_before=["tools"]` 和检查点存储器。
2. **运行**：图在 `tools` 前停止，状态会持久化。
3. **API**：向用户回复“等待批准”。
4. **审核者**：从 `app.get_state(config)` 读取待执行的 `tool_calls`。
5. **批准**：在同一 `thread_id` 上发送 `Command(resume=True)`。
6. **拒绝**：通过 `app.update_state` 写入拒绝消息，再恢复。

## 标准库图：暂停与恢复
type: flow
from: phases/14-agent-engineering/13-langgraph-stateful-graphs/code/main.py, phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/zh.md

1. **classify**：将 `route` 设为 refund、bug 或 sales。
2. **路由器**：`add_conditional_edges` 根据 `route` 选择分支节点。
3. **分支**：写入 `BUG-...` 等 `ticket`。
4. **human_gate**：没有 `human_approval`，因此设置 `_pause_reason`。
5. **运行器**：保存状态，然后抛出 `PausedAtNode`。
6. **人工**：调用 `load_latest(session)`，将 `human_approval` 设为 True。
7. **恢复**：调用 `runner.run(..., resume_from="send", state_override=...)`。

## 持久化任务状态
type: architecture
from: projects/durable-agent-jobs/solution/stage1.go, projects/durable-agent-jobs/solution/stage2.go, projects/durable-agent-jobs/solution/stage3.go

```arch
node | new | 1,1 | NewJob | 版本 0 |
node | q | 2,1 | queued | 等待领取 | queue
node | r | 3,1 | running | LeaseUntil = now + ttl | process
node | c | 4,1 | completed | LeaseUntil 0 | store
node | lim | 2,2 | ErrLimit | Attempts 达到上限 |
edge | new | q |
edge | q | r | ClaimJob
edge | r | c | Finish
edge | r | q | Reclaim
edge | q | lim | 上限
```

## 运行任务队列
type: command-table
from: projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/API.md

| 命令 | 作用 |
|---|---|
| `go build -o /tmp/durable-jobs .` | 构建参考 worker |
| `enqueue --store "$STORE" --input samples/jobs.json` | 添加 id/text 记录 |
| `worker --store "$STORE" --max-jobs 100` | 领取并运行任务 |
| `status --store "$STORE"` | 显示任务、副作用和作用域 |
| `worker ... --crash-after effect` | 写入回执后以 86 退出 |
| `worker ... --now-ms 111 --lease-ms 10` | 恢复租约过期的任务 |
| `--crash-after claim` | 在产生任何输出前崩溃 |
| `go run . demo` | 自动演示副作用后的崩溃流程 |

## Worker 默认值
type: defaults
from: projects/durable-agent-jobs/API.md, projects/durable-agent-jobs/solution/main.go, projects/durable-agent-jobs/solution/stage4.go, projects/durable-agent-jobs/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--lease-ms` | 30000 | 领取租约，单位为毫秒 |
| `--max-attempts` | 3 | 达到上限后任务仍可见 |
| `--max-jobs` | 1 | 每次 worker 调用的任务数 |
| `--delay-ms` | 0 | 范围为 0..60000 |
| `--now-ms` | -1 | 表示当前实际时间 |
| `--store` | jobs-data | 本地目录 |
| 快照大小 | 4 MiB | 超出时返回 `ErrLimit` |

## 故障排查
type: troubleshooting
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/zh.md, projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/API.md, projects/durable-agent-jobs/solution/stage3.go

| 现象 | 原因 | 修正 |
|---|---|---|
| 丢失半轮消息 | 没有 `add_messages` 归约器 | 使用 `Annotated[list, add_messages]` |
| 无法恢复或回溯 | 没有检查点存储器 | 测试用 `MemorySaver`，生产用真实存储 |
| 批准前已造成影响 | 在副作用后中断 | 在副作用节点前中断 |
| 恢复后工具状态丢失 | 检查点过小 | 序列化完整状态 |
| 恢复产生新结果 | 节点不确定 | 捕获随机种子、时钟和 API 回复 |
| 旧 worker 无法完成任务 | 版本或租约已变 | 符合预期；`Finish` 会阻止过时 worker 写入 |
| 入队出现 `conflict` | 旧 ID 对应的文本已变 | 使用新标识 |
| 退出码 86 | 设置了 `--crash-after` | 符合预期；再次运行 worker |

## 问答
type: qa
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/zh.md, projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/solution/stage2.go, projects/durable-agent-jobs/solution/stage3.go

- **输入 `None` 会怎样？** 从指定检查点重放。
- **为何一次崩溃后完成版本为 v4？** 领取、回收、再次领取、完成各加 1。
- **是否恰好执行一次？** 否。是至少一次。
- **为何没有重复回执？** 本地不可变回执使副作用具备幂等性。
- **何时触发 `Reclaim`？** 任务运行中且 `now` 达到或超过 `LeaseUntil` 时。
- **哪三种拓扑？** 监督者、群体和层级。

## 提示
type: tips
from: phases/11-llm-engineering/16-langgraph-state-machines/docs/zh.md, phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/zh.md, projects/durable-agent-jobs/README.md

- 先给节点命名。每次决策或副作用各是一个节点。
- 将 `plan`、`budget` 等任务字段移出 `messages`。
- 优先使用线性链，偶尔加分支。
- 在进入副作用节点的边上设置批准。
- 不要把任务存储放在 NFS 上。
- 每次可重复的崩溃测试都使用新存储。
