# Handoff 与 Routine —— 无状态 orchestration

> OpenAI 的 Swarm（2024 年 10 月）把多 agent orchestration 提炼成两个原语：**routine**（作为 system prompt 的指令 + 工具）和 **handoff**（一个返回另一个 Agent 的工具）。没有状态机，没有分支 DSL——LLM 通过调用正确的 handoff 工具来路由。OpenAI Agents SDK（2025 年 3 月）是它的生产继任者。Swarm 本身仍是概念上最干净的参考——它的全部源码不过几百行。这个模式之所以病毒式传播，是因为它的 API 接口大致就是「agent = prompt + 工具；handoff = 返回 agent 的函数」。局限：无状态，所以记忆是调用方的问题。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 04（原语模型）
**预计时间：** ~60 分钟

## 问题背景

每个多 agent 框架都想让你学它的 DSL：LangGraph 的节点和边、CrewAI 的 crew 和 task、AutoGen 的 GroupChat 和 manager。这些 DSL 是真正的抽象，但它们让这件事感觉比它本该有的更重。

Swarm 朝相反方向推：用模型已经有的工具调用能力。handoff 变成工具调用。orchestrator 就是当前持有对话的那个 agent。状态机隐含在各 agent 的 system prompt 里。

## 核心概念

### 两个原语

**Routine。** 一条定义 agent 角色和可用工具的 system prompt。把它想成一套有范围的指令：「你是分诊 agent；如果用户问退款，handoff 给退款 agent。」

**Handoff。** agent 能调的一个工具，它返回一个新的 Agent 对象。Swarm 运行时检测到 Agent 返回值，就在下一轮切换活跃 agent。

整个抽象就这些。

```
def transfer_to_refunds():
    return refund_agent  # Swarm sees Agent return → switch active agent

triage_agent = Agent(
    name="triage",
    instructions="Route the user to the right specialist.",
    functions=[transfer_to_refunds, transfer_to_sales, transfer_to_support],
)
```

分诊 agent 的 system prompt 让它根据用户消息选对 handoff。LLM 的工具调用完成路由。

### 它为什么病毒式传播

- **小 API。** 要学的概念就两个。
- **用的是模型已经会的。** 工具调用在各家提供商那里已经是生产级。
- **没有状态机负担。** 你不去描述那张图；agent 的 prompt 描述它们 handoff 给谁。

### 无状态这笔交易

Swarm 在运行之间明确无状态。框架在一次运行期间保留消息历史，但它不持久化任何东西。记忆、连续性、长时间运行任务——全是调用方的问题。

在生产里（OpenAI Agents SDK，2025 年 3 月），这是变化最大的几点之一：SDK 加上了内置的会话管理、护栏、追踪，同时保留 handoff 原语。

### Swarm/handoff 何时适合

- **分诊模式。** 一线 agent 把用户路由给一个专精 agent。
- **基于技能的 handoff。** 「如果任务需要代码，叫 coder；需要调研，叫 researcher。」
- **短的、有界的对话。** 客服、FAQ 转工单、简单工作流。

### Swarm 何时吃力

- **带共享记忆的长会话。** handoff 把对话状态重置成新 agent 的 prompt 加历史。没有调用方管理的记忆，agent 之间就没有持久状态。
- **并行执行。** handoff 是一次一个——活跃 agent 切换。并行需要调用方去编排多次 Swarm 运行。
- **审计与回放。** 无状态运行很难精确回放；LLM 的 handoff 选择不是确定性的。

### OpenAI Agents SDK（2025 年 3 月）

生产继任者加了：

- **会话状态。** 跨运行持久化的 thread。
- **护栏。** 输入/输出校验钩子。
- **追踪。** 每次工具调用和 handoff 都被记录。
- **handoff 过滤器。** 控制 handoff 时哪些上下文被转移。

handoff 原语活了下来；生产工效在它周围被加了上去。

### Swarm 对 GroupChat

两者都用 LLM 驱动的路由，但它们在**谁挑下一个**上不同：

- GroupChat：一个选择器（函数或 LLM）从外部挑下一个发言者。
- Swarm：当前 agent 通过调一个 handoff 工具来挑自己的继任者。

Swarm 是「agent 决定下一步是什么」；GroupChat 是「manager 决定下一步是什么」。Swarm 的决策住在活跃 agent 的工具调用里；GroupChat 的住在 `GroupChatManager` 里。

```figure
sw-handoff-routing
```

## 动手构建

`code/main.py` 从零实现 Swarm：一个 Agent dataclass、一个 handoff 机制（工具返回 Agent）、以及一个检测 agent 切换的运行循环。

演示：一个分诊 agent 路由到退款、销售、或支持专精 agent。每个专精 agent 有自己的工具。运行循环打印每次 handoff。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-handoff-designer.md` 为一个给定任务设计 handoff 拓扑：有哪些 agent、它们能调哪些 handoff、什么上下文被转移。

## 拿去用

检查清单：

- **handoff 日志。** 每次 handoff 写一条带 from-agent、to-agent、上下文快照的 trace 事件。
- **上下文转移规则。** 决定 handoff 时什么被搬走：全历史（贵）、最后 N 条消息、或一份摘要。
- **handoff 上的护栏。** handoff 到一个工具权限不同的专精 agent 必须经过认证——否则 prompt 注入能逼出非预期的 handoff。
- **循环检测。** 两个 agent 来回交接是常见故障；用一个简单的末 K 项环检查来检测。
- **兜底 agent。** 如果 handoff 目标不存在，回退到一个安全默认。

## 练习

1. 跑 `code/main.py`，分诊到退款 agent。确认第二轮的活跃 agent 是退款。
2. 加一条循环检测规则：如果同两个 agent 连续交接 3 次，强制退出。设计兜底。
3. 读 OpenAI Agents SDK 关于 handoff 过滤器的文档。实现一个「handoff 时摘要」版本：交出方 agent 在接入方接手前把上下文压成要点摘要。
4. 对比 Swarm 的 handoff 和 GroupChatManager 的选择器。哪个模式让 prompt 注入更糟，为什么？
5. 读 Swarm cookbook（https://developers.openai.com/cookbook/examples/orchestrating_agents）。指出 Swarm 做的一个显式设计决策，OpenAI Agents SDK 改了它还是保留了它。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Routine | 「agent 的 prompt」 | system prompt + 工具列表。定义角色和可用的 handoff。 |
| Handoff | 「转交给另一个 agent」 | 活跃 agent 能调的、返回新 Agent 的工具。运行时据此切换活跃 agent。 |
| Stateless | 「运行之间没记忆」 | Swarm 不持久化任何东西；记忆是调用方的责任。 |
| Active agent | 「现在谁在说话」 | 当前持有对话的 agent。handoff 改变它。 |
| Context transfer | 「handoff 时搬走什么」 | 接入方 agent 看到什么历史的策略：全部、最后 N 条、或摘要。 |
| Handoff loop | 「agent 来回乒乓」 | 故障模式，两个 agent 不停地交接回对方。 |
| OpenAI Agents SDK | 「生产版 Swarm」 | 2025 年 3 月继任者；在 handoff 原语之上加了会话、护栏、追踪。 |
| Handoff filter | 「转移时设闸」 | SDK 特性，在 handoff 边界处检视并修改上下文。 |

## 延伸阅读

- [OpenAI cookbook — Orchestrating Agents: Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) —— 参考阐述
- [OpenAI Swarm repo](https://github.com/openai/swarm) —— 原始实现，作为概念参考保留
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) —— 带会话和追踪的生产继任者
- [Anthropic handoff-in-Claude notes](https://docs.anthropic.com/en/docs/claude-code) —— Claude Code subagent 如何通过 `Task` 用一种类似 handoff 的模式
