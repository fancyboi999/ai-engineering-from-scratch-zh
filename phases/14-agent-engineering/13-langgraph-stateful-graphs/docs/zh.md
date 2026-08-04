# 有状态图编排——持久执行与检查点

> agent 是一个状态机；节点是函数；边是转移；每个节点后都保存状态检查点。遇到失败时，从最后一个成功检查点恢复。LangGraph 是这种底层有状态编排模型在 2026 年的参考实现。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 12（工作流模式）
**预计时间：** ~75 分钟

## 学习目标

- 描述 LangGraph 的核心模型：带类型化状态的状态机、函数节点、条件边、每个节点后的检查点。
- 说出文档强调的四项能力：持久执行、流式、human-in-the-loop、全面记忆。
- 解释 LangGraph 支持的三种编排拓扑：supervisor、点对点（swarm）、分层（嵌套子图）。
- 用标准库实现一个状态图，带类型化状态、条件边和一个检查点/恢复周期。

## 问题背景

agent 和工作流共享一个问题：当一次 40 步的运行在第 38 步失败时，你想从第 38 步恢复，而不是从头来过。二等公民的状态模型逼着运维围着一个假设「全新运行」的库去硬凑重试。

LangGraph 的设计回答：状态是一等的带类型对象，变更是显式的，每个节点后检查点都被持久化。恢复就是一次 `load_state(session_id)` 调用。

## 核心概念

### 图

一张图由以下定义：

- **状态类型。** 一个带类型的字典（或 Pydantic 模型），每个节点都读取并变更它。
- **节点。** 纯函数 `(state) -> state_update`。返回后更新被合并进状态。
- **边。** 节点之间的条件转移或直接转移。
- **入口和出口。** `START` 和 `END` 哨兵节点标记边界。

例子：一个带 `classify`、`refund`、`bug`、`sales`、`done` 节点的 agent —— 一个表现为图的路由工作流。

### 持久执行

每个节点返回后，运行时序列化状态并写进一个检查点器（SQLite、Postgres、Redis、自定义）。在第 N 步失败时，运行时可以 `resume(session_id)` 并从第 N+1 步带着精确的状态接着跑。

LangGraph 文档明确强调了这一点重要的生产用户：Klarna、Uber、J.P. Morgan。主张不在于图的形态；而在于图的形态加上检查点让恢复变得廉价。

### 流式

每个节点都能产出部分输出。图把每节点的增量事件流式推给调用者，于是 UI 随图运行而更新。

### Human-in-the-loop

在节点之间检视并修改状态。实现方式：在一个关键节点前暂停、把状态暴露给人、接受修改、恢复。检查点器让这件事很容易，因为状态已经序列化好了。

### 记忆

短期（一次运行内 —— 状态里的对话历史）和长期（跨运行 —— 通过检查点器加一个独立长期存储来持久化）。LangGraph 通过工具与外部记忆系统（Mem0、自定义）集成。

### 三种拓扑

1. **Supervisor。** 一个中央路由器 LLM 分派给专家子 agent。`langgraph-supervisor` 里的 `create_supervisor()`（不过 2026 年 LangChain 团队建议直接通过工具调用来做这件事，以获得更多上下文控制）。
2. **Swarm / 点对点。** agent 通过一个共享工具接触面直接交接。没有中央路由器。
3. **分层。** supervisor 管理子 supervisor，实现为嵌套子图。

### 这个模式在哪里会出错

- **检查点太小。** 只对对话轮次做检查点，会让工具状态和记忆写入无法恢复。完整状态必须序列化。
- **非确定性节点。** 恢复假设节点输入会产生同样的状态更新。随机种子、墙钟、外部 API 都必须被捕获。
- **过度使用条件边。** 一张每条边都是条件的图，是个无法被推理的状态机。优先用线性链加偶尔的分支。

```figure
langgraph-state
```

## 动手构建

`code/main.py` 用标准库实现一个有状态图：

- `State` —— 一个带类型的字典，含 `messages`、`step`、`route`、`output`、`human_approval`。
- `Node` —— 接收状态并返回更新字典的可调用对象。
- `StateGraph` —— 节点 + 边 + 条件边 + 运行 + 恢复。
- `SQLiteCheckpointer`（内存假货）—— 每个节点后序列化状态；`load(session_id)` 恢复。
- 一个演示图：classify -> branch(refund / bug / sales) -> 人工关卡 -> send。

运行它：

```
python3 code/main.py
```

轨迹展示第一次运行在人工关卡处失败、持久化、然后恢复并产出最终输出。

## 实际使用

- **LangGraph** —— 参考，生产就绪。用 `create_react_agent`、`create_supervisor`，或自己造图。
- **AutoGen v0.4**（第 14 课）—— 高并发场景的 actor 模型替代品。
- **Claude Agent SDK**（第 17 课）—— 带内置会话存储的托管 harness。
- **自定义** —— 当你需要对状态形态或检查点器后端做精确控制时。

## 拿去用

`outputs/skill-state-graph.md` 在任意目标运行时生成一个 LangGraph 形态的状态图，检查点和恢复都接好。

## 练习

1. 加一条从 `classify` 到 `end` 的条件边，当分类置信度低于阈值时走。在人工手动设置 `route` 后恢复运行。
2. 把类 SQLite 的假货换成一个真实的 SQLite 检查点器。度量每步序列化开销。
3. 实现并行边：两个节点并发跑，用一个自定义 reducer 合并。不可变状态在这里带来什么好处？
4. 读 `langgraph-supervisor` 参考。把玩具移植到 `create_supervisor`。对比轨迹形态。
5. 加流式：每个节点运行时产出部分状态。增量到达时就打印出来。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| State graph | 「agent 即状态机」 | 带类型状态 + 节点 + 边 + reducer |
| Checkpointer | 「持久化后端」 | 每个节点后序列化状态；使恢复成为可能 |
| Reducer | 「状态合并器」 | 把当前状态与一个节点的更新合并的函数 |
| Conditional edge | 「分支」 | 由状态的某个函数选出的边 |
| Subgraph | 「嵌套图」 | 用作另一张图里一个节点的图 |
| Durable execution | 「从失败恢复」 | 带精确状态从上一个成功节点重启 |
| Supervisor | 「路由器 LLM」 | 给专家子 agent 的中央调度器 |
| Swarm | 「P2P agent」 | agent 通过共享工具交接；无中央路由器 |

## 延伸阅读

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 参考文档
- [langgraph-supervisor reference](https://reference.langchain.com/python/langgraph/supervisor/) —— supervisor 模式 API
- [AutoGen v0.4, Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) —— actor 模型替代品
- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) —— 会话存储与子 agent
