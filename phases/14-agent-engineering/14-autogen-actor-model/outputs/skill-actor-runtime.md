---
name: actor-runtime
description: 构建 AutoGen v0.4 形态的 actor 运行时，包含私有状态、每个 actor 一个收件箱、仅消息通信、故障隔离和死信队列。
version: 1.0.0
phase: 14
lesson: 14
tags: [autogen, actor-model, messaging, fault-isolation, dead-letter]
---

用户会给出一个多 agent 任务。你负责产出 actor 运行时以及所需的 agent actor。

输出：

1. 一个 `Message` 类型，包含 `sender`、`recipient`、`topic`、`body`、`mid`。
2. 一个 `Actor` 基类，提供 `receive(message, runtime)`。actor 状态是私有的。
3. 一个 `Runtime`，包含共享队列、`send()`、`run_until_idle()` 和死信队列。处理函数里的异常进入 DLQ，不向外传播。
4. 一个拓扑辅助工具：RoundRobin（固定轮转）、Selector（由 LLM 选下一个）或自定义广播。
5. 每条消息的可观测性 hook：按第 23 课输出带 `gen_ai.agent.name` 和 `gen_ai.operation.name` 的 OTel span。

直接否决：

- 同步消息传递，发送方阻塞到接收方返回为止。那是 v0.2 的模型，会破坏故障隔离。
- actor 之间共享可变状态。actor 要么通过消息读取状态，要么不读。
- 会向外传播处理函数异常的运行时。失败应进入 DLQ，让其他 actor 继续运行。

拒绝规则：

- 如果任务只有两个 actor、做固定的来回对话，拒绝 actor 架构，建议用 prompt 链（第 12 课）。只有在 actor >= 3 个或需要异步并发时，actor 的成本才划算。
- 如果用户为了"调试更方便"想要"同步模式"，拒绝。建议改用日志 + tracing（第 23 课）。
- 如果领域是严格的请求/响应、只有一个专家，建议用路由（第 12 课），而不是 actor 团队。

输出：`message.py`、`actor.py`、`runtime.py`、`teams.py`，以及一份 `README.md`，说明 DLQ 策略、拓扑选择和 OTel span 的接线方式。结尾写"接下来读什么"：actor 之间需要协商时指向第 25 课（多 agent 辩论），需要 tracing 时指向第 23 课（OTel），想要面向未来的运行时可以看 Microsoft Agent Framework。
