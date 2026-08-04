# OpenAI Agents SDK：Handoffs、Guardrails、Tracing

> OpenAI Agents SDK 是建在 Responses API 之上的轻量多 agent 框架。五个原语：Agent、Handoff、Guardrail、Session、Tracing。Handoff 是名为 `transfer_to_<agent>` 的工具。Guardrail 在输入或输出上触发。Tracing 默认开启。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 06（工具使用）
**预计时间：** ~75 分钟

## 学习目标

- 说出 OpenAI Agents SDK 的五个原语。
- 解释 handoff：为什么把它建模成工具、模型看到什么样的名称形态、上下文如何传递。
- 区分输入 guardrail、输出 guardrail 和工具 guardrail；解释 `run_in_parallel` vs 阻塞模式。
- 用标准库实现一个运行时，带 handoff + guardrail + span 式 tracing。

## 问题背景

不能干净委派的 agent 最后会把一切都塞进一个 prompt。没有 guardrail 的 agent 会泄露 PII、产出违反策略的内容，或者永远循环下去。OpenAI 的 SDK 把让多 agent 工作变得可控的三个原语固化下来。

## 核心概念

### 五个原语

1. **Agent。** LLM + 指令 + 工具 + handoff。
2. **Handoff。** 委派给另一个 agent。对模型表现为一个名为 `transfer_to_<agent_name>` 的工具。
3. **Guardrail。** 在输入（仅第一个 agent）、输出（仅最后一个 agent）或工具调用（每个函数工具）上做校验。
4. **Session。** 跨轮次的自动对话历史。
5. **Tracing。** 为 LLM 生成、工具调用、handoff、guardrail 内置的 span。

### 把 handoff 当工具

模型在它的工具列表里看到 `transfer_to_billing_agent`。调用它向运行时发出信号去：

1. 复制对话上下文（或通过 `nest_handoff_history` beta 把它折叠）。
2. 用目标 agent 的指令初始化它。
3. 用目标 agent 继续这次运行。

这就是 supervisor 模式（第 13 课 / 第 28 课）的产品化。

### Guardrail

三种口味：

- **输入 guardrail。** 跑在第一个 agent 的输入上。在任何 LLM 调用之前拒绝不安全或超范围的请求。
- **输出 guardrail。** 跑在最后一个 agent 的输出上。抓 PII 泄露、策略违规、格式错误的响应。
- **工具 guardrail。** 按函数工具跑。校验参数、检查权限、审计执行。

模式：

- **并行**（默认）。guardrail LLM 与主 LLM 并排跑。尾延迟更低。若被触发，主 LLM 的工作被丢弃（浪费 token）。
- **阻塞**（`run_in_parallel=False`）。guardrail LLM 先跑。若被触发，不在主调用上浪费 token。

触发线抛出 `InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered`。

### Tracing

默认开启。每次 LLM 生成、工具调用、handoff 和 guardrail 都发出一个 span。`OPENAI_AGENTS_DISABLE_TRACING=1` 退出。`add_trace_processor(processor)` 把 span 在 OpenAI 之外也扇出到你自己的后端。

### Session

`Session` 把对话历史存在一个后端里（SQLite、Redis、自定义）。`Runner.run(agent, input, session=session)` 自动加载并追加。

### 这个模式在哪里会出错

- **handoff 漂移。** Agent A 交给 Agent B，B 又交回给 A。加一个跳数计数器。
- **guardrail 绕过。** 工具 guardrail 只在函数工具上触发；内置工具（文件读取器、网页抓取）需要单独的策略。
- **过度 tracing。** span 里有敏感内容。配 OTel GenAI 的内容捕获规则（第 23 课）—— 外部存储，按 ID 引用。

```figure
ae-agent-handoff
```

## 动手构建

`code/main.py` 用标准库实现 SDK 的形态：

- `Agent`、`FunctionTool`、`Handoff`（作为带转移语义的函数工具）。
- 带输入/输出/工具 guardrail、handoff 分派和跳数计数器的 `Runner`。
- 一个简单的 span 发射器，用来展示轨迹形态。
- 一个分流 agent，基于用户查询交给 billing 或 support；guardrail 在一个输入上触发。

运行它：

```
python3 code/main.py
```

轨迹展示两次成功的 handoff、一次输入 guardrail 触发，以及一棵镜像真实 SDK 所发出内容的 span 树。

## 实际使用

- **OpenAI Agents SDK** 用于 OpenAI 优先的产品。
- **Claude Agent SDK**（第 17 课）用于 Claude 优先的产品。
- **LangGraph**（第 13 课）当你想要显式状态和持久恢复时。
- **自定义** 当你需要精确控制时（语音、多厂商、联邦部署）。

## 拿去用

`outputs/skill-agents-sdk-scaffold.md` 脚手架出一个 Agents SDK 应用，带分流 agent、handoff、输入/输出/工具 guardrail、session 存储和一个 trace processor。

## 练习

1. 加一个 handoff 跳数计数器：N 次转移后拒绝。追踪行为。
2. 把 `nest_handoff_history` 实现为一个选项 —— 转移前把先前消息折叠成一段摘要。
3. 写一个阻塞的输出 guardrail。对比会触发它的 prompt 与能通过的 prompt 的延迟。
4. 把 `add_trace_processor` 接到一个 JSON logger。它每个 span 发出什么形态？
5. 读 SDK 文档。把你的标准库玩具移植到 `openai-agents-python`。你哪里建模错了？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Agent | 「LLM + 指令」 | SDK 里的 Agent 类型；掌管工具和 handoff |
| Handoff | 「转移」 | 模型调用来委派给另一个 agent 的工具 |
| Guardrail | 「策略检查」 | 在输入 / 输出 / 工具调用上的校验 |
| Tripwire | 「guardrail 触发」 | guardrail 拒绝时抛出的异常 |
| Session | 「历史存储」 | 在运行之间持久化的对话记忆 |
| Tracing | 「span」 | 覆盖 LLM + 工具 + handoff + guardrail 的内置可观测性 |
| Blocking guardrail | 「顺序检查」 | guardrail 先跑；触发时不浪费 token |
| Parallel guardrail | 「并发检查」 | guardrail 并排跑；延迟更低，触发时浪费 token |

## 延伸阅读

- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) —— 原语、handoff、guardrail、tracing
- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) —— Claude 风味的对应物
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 究竟何时该上 handoff
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— Agents SDK span 映射到的标准
