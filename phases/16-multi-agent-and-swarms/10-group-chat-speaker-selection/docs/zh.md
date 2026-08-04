# 群聊与发言者选择

> 共享对话编排让 N 个 agent 进入同一段对话，再由选择器函数（LLM、轮询或自定义）决定谁接着发言。这是涌现式多 agent 对话的原型：agent 不知道自己在某张静态图里的角色，只对共享池作出反应。AutoGen GroupChat 和 AG2 GroupChat 是参考实现。AutoGen v0.2 的 GroupChat 语义被保留在 AG2 分叉里，AutoGen v0.4 则把它重写成事件驱动的 actor 模型。微软在 2026 年 2 月把 AutoGen 转入维护模式，并把它与 Semantic Kernel 合并进 Microsoft Agent Framework（RC 2026 年 2 月）。GroupChat 原语在 AG2 与 Microsoft Agent Framework 中都保留了下来，学一次即可迁移使用。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 04（原语模型）
**预计时间：** ~60 分钟

## 问题背景

静态图（LangGraph）在工作流已知时很棒。真实对话不是静态的：有时 coder 问 reviewer，有时问 researcher，有时问 writer。把每一种可能的 handoff 硬编码会导致边爆炸。你想要的是 *agent 对共享池子做反应*，由某个函数决定接下来谁说话。

这正是 AutoGen GroupChat 做的事。

## 核心概念

### 形状

```
              ┌─── shared pool ────┐
              │   m1  m2  m3  ...  │
              └─────────┬──────────┘
                        │ (everyone reads all)
      ┌───────┬─────────┼─────────┬───────┐
      ▼       ▼         ▼         ▼       ▼
    Agent A  Agent B  Agent C  Agent D  Selector
                                           │
                                           ▼
                                  "next speaker = C"
```

每个 agent 都看到每条消息。每一轮调用一个选择器函数来挑出接下来谁发言。

### 三种选择器口味

**轮询（Round-robin）。** 固定循环。确定性。在 N 上线性扩展，但无视上下文——哪怕话题是法务审查，coder 也会轮到发言。

**LLM 选择。** 一次 LLM 调用，读最近的池子、返回最佳的下一发言者。感知上下文但慢：每一轮都加一次 LLM 调用。AutoGen 的默认。

**自定义。** 一个想写什么逻辑就写什么逻辑的 Python 函数。典型：带兜底规则的 LLM 选择（比如「coder 之后永远轮到 verifier」）。

### ConversableAgent API

```
agent = ConversableAgent(
    name="coder",
    system_message="You write Python.",
    llm_config={...},
)
chat = GroupChat(agents=[coder, reviewer, tester], messages=[])
manager = GroupChatManager(groupchat=chat, llm_config={...})
```

`GroupChatManager` 持有选择器。当一个 agent 完成一轮，manager 调用选择器，它返回下一个 agent。循环持续到满足某个终止条件。

### 终止

三种常见模式：

- **最大轮数。** 对总轮数的硬上限。
- **「TERMINATE」token。** agent 可以发出一个哨兵消息；manager 一看到就停。
- **目标达成检查。** 每一轮跑一个轻量 verifier，完成时停掉聊天。

### 血缘：分叉与合并

2025 年初，微软围绕事件驱动的 actor 模型开始了对 AutoGen 的大重写（v0.4）。社区把 AutoGen v0.2 的 GroupChat 语义分叉成了 AG2，保留了早期采用者已经集成的那套 API。

2026 年 2 月，微软宣布 AutoGen 将转入维护模式，事件驱动的 actor 模型并入 **Microsoft Agent Framework**（RC 2026 年 2 月，现已与 Semantic Kernel 合并）。GroupChat 这个概念在两条线里都活着；实现细节有别。AG2 是 v0.2 兼容代码的首选上游。

### GroupChat 何时适合

- **涌现式对话。** 你不想预先把每一种可能的下一发言者都接好线。
- **角色混合任务。** coder 问 researcher，researcher 问 archivist，archivist 又问回 coder。流程不是 DAG。
- **探索式问题求解。** 想成「头脑风暴会」，而不是「流水线」。

### 它何时失败

- **严格确定性。** LLM 选择器可能不一致。同一 prompt、不同运行、不同的下一发言者。
- **谄媚级联。** agent 倒向谁说得最自信。要明确反向 prompt。
- **上下文膨胀。** 每个 agent 读每条消息；10 轮之后上下文就巨大了。用投影（第 15 课）来裁剪视图。
- **热门发言者。** 某个 agent 主导了对话，因为选择器偏爱它的专长。把发言者均衡作为选择器的一个特性引入。

### 群聊对 supervisor

同样的原语，不同的默认值：

- supervisor：一个 agent 规划、其他执行。选择器是「问 planner 该做什么」。
- 群聊：所有 agent 都是对等的；选择器是一个作用于共享池子的函数。

两者都用第 04 课的四个原语。群聊默认用 LLM 选择式 orchestration 和全池共享状态。

```figure
swarm-speaker
```

## 动手构建

`code/main.py` 用标准库从零实现了一个 GroupChat。三个 agent（coder、reviewer、manager），轮询和 LLM 选择两种变体，以及一个基于 `TERMINATE` token 的终止。

演示打印对话记录，外加两种变体的选择器决策轨迹。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-groupchat-selector.md` 为一个给定任务配置 GroupChat 选择器——轮询 vs LLM 选择 vs 自定义，以及该用哪些选择器输入（最近消息、agent 专长、轮次计数）。

## 拿去用

检查清单：

- **最大轮数上限。** 永远要有。典型任务 10-20。
- **发言者均衡指标。** 跟踪每个 agent 的轮次数；不均衡超过阈值时告警。
- **终止 token。** `TERMINATE` 或一个专门的 verifier agent。
- **投影或裁剪记忆。** 大约 10 条消息后，考虑只给每个 agent 一个裁剪视图，防止上下文膨胀。
- **选择器日志。** 对 LLM 选择变体，同时记录选择器的输入和它的选择。否则没法调试。

## 练习

1. 跑 `code/main.py`。对比轮询和 LLM 选择下的对话。每种下哪个 agent 主导？
2. 在选择器里加一条「每个 agent 最多发言次数」规则。它如何影响对话记录？
3. 实现一个目标达成终止：reviewer 返回「approved」时停。在触及轮数上限之前，它多久触发一次？
4. 读 AutoGen stable 关于 GroupChat 的文档（https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html）。指出 `GroupChatManager` 用的默认选择器。
5. 读 AG2 仓库（https://github.com/ag2ai/ag2），对比它的 v0.2 GroupChat 和 v0.4 事件驱动版本。v0.4 加了什么具体属性（吞吐、容错、可组合性）？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| GroupChat | 「同一个聊天室里的 agent」 | 共享消息池 + 选择器函数。AutoGen / AG2 的原语。 |
| Speaker selection | 「接下来谁说话」 | 挑下一个 agent 的那个函数。轮询、LLM 选择、或自定义。 |
| GroupChatManager | 「会议主持人」 | AutoGen 组件，持有选择器并循环跑各轮。 |
| ConversableAgent | 「基础 agent」 | AutoGen 基类；一个能收发消息的 agent。 |
| Termination token | 「那个『停』字」 | 结束聊天的哨兵字符串（通常是 `TERMINATE`）。 |
| Hot speaker | 「一个 agent 独占」 | 故障模式，选择器一直挑同一个 agent。 |
| Context bloat | 「池子无限增长」 | 每个 agent 都读之前的每条消息；上下文随轮次增长。 |
| Projection | 「裁剪视图」 | 进入共享池的角色专属视图，防止上下文膨胀。 |

## 延伸阅读

- [AutoGen group chat docs](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html) —— 参考实现
- [AG2 repo](https://github.com/ag2ai/ag2) —— 社区版 AutoGen v0.2 延续
- [Microsoft Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/) —— 合并后的继任者，RC 2026 年 2 月
- [AutoGen v0.4 release notes](https://microsoft.github.io/autogen/stable/) —— 事件驱动 actor 模型重写细节
