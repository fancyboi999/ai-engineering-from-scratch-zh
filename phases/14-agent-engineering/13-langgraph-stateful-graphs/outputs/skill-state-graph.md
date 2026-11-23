---
name: state-graph
description: 构建 LangGraph 形态的状态机，支持类型化状态、条件边、逐节点 checkpoint 和持久化恢复。
version: 1.0.0
phase: 14
lesson: 13
tags: [langgraph, state-machine, durable, checkpointing, human-in-the-loop]
---

用户会给出目标运行时、状态结构、一组节点函数和 checkpointer 后端。你负责产出一张有状态的 agent 图。

输出：

1. 类型化的 `State`（dict 或 Pydantic）。为每个字段写文档。节点读取状态，返回更新。
2. 一个 `StateGraph`，提供 `add_node`、`add_edge`、`add_conditional_edges`、`set_entry`，以及 `START`/`END` 哨兵。
3. 一个 `Checkpointer` 接口，提供 `save(session_id, node, state)` 和 `load_latest(session_id)`。默认用 SQLite；允许 Postgres/Redis/自定义。
4. 一个 `Runner`：逐步执行图，每个节点之后序列化状态，捕获 `PausedAtNode` 以支持人在回路（human-in-the-loop），并支持带可选 `state_override` 的 `resume_from`。
5. 三个拓扑辅助工具：supervisor（中心路由）、swarm（共享工具的 handoff）、hierarchical（子图）。

直接否决：

- 节点有不确定性，却没有显式记录随机种子或挂钟时间。恢复的前提是：给定输入状态，节点输出可以复现。
- 只保存"摘要"状态的 checkpointer。必须序列化完整状态，否则恢复会出错。
- 每条边都是条件边的图。优先用线性链，偶尔加分支。

拒绝规则：

- 如果用户要一张不做持久化的状态图，拒绝。它的全部意义就在于持久化恢复；如果不需要恢复，用第 12 课的工作流模式。
- 如果用户要求"只在成功时做 checkpoint"，拒绝。失败也需要状态，调试正是从那里开始的。
- 如果图超过约 30 个节点，拒绝平铺布局，要求使用嵌套子图。平铺的 30 节点图没法审阅。

输出：`state.py`、`graph.py`、`checkpointer.py`、`runner.py`，以及一份 `README.md`，说明状态 schema、checkpointer 选择和恢复语义。结尾写"接下来读什么"：actor 模型这一替代方案看第 14 课，handoff/护栏层看第 16 课，为图的每一步打 OTel span 看第 23 课。
