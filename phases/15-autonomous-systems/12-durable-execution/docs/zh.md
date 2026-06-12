# 长时运行的后台 agent：持久化执行

> 生产级的长程 agent 不靠 `while True` 跑。每一次 LLM 调用都变成一个带 checkpoint、重试和重放的 activity。Temporal 的 OpenAI Agents SDK 集成在 2026 年 3 月 GA。Claude Code Routines（Anthropic）在没有一个常驻本地进程的情况下跑定时的 Claude Code 调用。会话在等待人类输入时暂停、在部署中存活，并从以 `thread_id` 为键的最新 checkpoint 恢复。这套新的工效背后坐着一个老模式——工作流编排——只多了一个新输入：把 LLM 调用当作必须在恢复时被确定性重放的非确定性 activity。

**类型：** Learn
**语言：** Python（标准库，最小持久化执行状态机）
**前置要求：** 阶段 15 · 10（权限模式），阶段 15 · 01（长程 agent）
**预计时间：** ~60 分钟

## 问题背景

设想一个跑四个小时的 agent。它调用三个工具，提示用户两次，发起四十次 LLM 调用。跑到一半，它所在的宿主重启了。会发生什么？

- 在一个朴素的 `while True` 循环里：一切都丢了。运行从头重启。那三次工具调用（带真实副作用）再执行一遍。用户已经批准过的东西被再问一次。四十次 LLM 调用被重新计费。
- 有持久化执行：运行从最近的 checkpoint 恢复。已完成的 activity 不被重新执行；它们的结果从持久日志里重放。用户不会再批准已经批准过的东西。已发起的 LLM 调用不会被重新计费。

这跟工作流引擎已经交付了十年的模式是同一个（Temporal、Cadence、Uber 的 Cherami）。新的地方在于，LLM 调用如今是一种 activity——非确定性、昂贵、带副作用——而它们干净地契合这个模式。

本课贯穿的主题是：长程可靠度会衰减（METR 观察到一种"35 分钟退化"——成功率随跨度大致呈二次方下降）。持久化执行让你能跑比可靠度画像所支持的更长的运行，如果设计对了这是一种安全失败的新方式，如果设计错了则是不安全失败的新方式。

## 核心概念

### activity、workflow 与重放

- **Workflow（工作流）**：确定性的编排代码。定义 activity 的序列、分支、等待。必须确定性，这样它才能从事件日志里重放，而不会出现意外的偏离。
- **Activity**：一个非确定性、可能失败的工作单元。LLM 调用、工具调用、文件写入、HTTP 请求。每个 activity 都被记录下它的输入和（一旦完成）它的输出。
- **Event log（事件日志）**：持久的后备存储。每个 activity 的开始、完成、失败、重试，以及每个工作流决策，都被记录。
- **Replay（重放）**：恢复时，工作流代码从头重跑；每个已经完成的 activity 都返回它记录的结果，而不重新执行。只有那些尚未完成的 activity 才被真正运行。

这跟 React 对着虚拟 DOM 重新渲染、或 Git 从提交重建工作树是同一个形态。编排器里的确定性，正是让持久性变便宜的东西。

### 为什么 LLM 调用契合这个模式

LLM 调用是：
- 非确定性的（temperature > 0；即便 temperature 为 0 也会随模型版本漂移）。
- 昂贵的（钱和延迟）。
- 可能失败的（限速、超时）。
- 有副作用的（如果它们调用工具）。

这正是 activity 的画像。把每次 LLM 调用包成一个 activity，你就得到了带指数退避的重试、跨重启的 checkpoint，以及一条可重放的、用于调试的轨迹。

### 以 `thread_id` 为键的 checkpoint

LangGraph、Microsoft Agent Framework、Cloudflare Durable Objects 和 Claude Code Routines 都收敛到了同一种 API 形态：一个 `thread_id`（或等价物）标识会话；每个状态转移持久化到一个后端（默认 PostgreSQL，开发用 SQLite，缓存用 Redis）；恢复时读取最新的 checkpoint。

后端的选择很重要：

- **PostgreSQL**：持久、可查询、在部署中存活。LangGraph 的默认。
- **SQLite**：仅本地开发；跨宿主会丢数据。
- **Redis**：快，但除非配了 AOF/快照否则易逝。
- **Cloudflare Durable Objects**：透明分布式；按一个唯一键划范围；存活几小时到几周。

### 人类输入作为一等状态

propose-then-commit（第 15 课）需要一个持久的"等待人类"状态。工作流暂停，外部队列持有待处理的请求，一次批准就从那个确切的点恢复。没有持久性，这只能尽力而为；有了它，一次过夜的批准在早上到达，工作流接着往下跑。

### 35 分钟退化

METR 观察到，所测的每一类 agent 在连续运行约 35 分钟后都表现出可靠度衰减。把任务时长翻倍，失败率大约翻两番。持久化执行修不了这个；它让你能跑比可靠度画像所支持的更长。安全的模式是把持久性跟"重新进入时要求新鲜 HITL 的 checkpoint"结合起来，并跟"无论墙钟时间多长都给总算力封顶的预算急停开关"（第 13 课）结合起来。

### 持久化执行是错误答案的时候

- 短于几分钟、没有人类输入的运行。开销 > 收益。
- 严格只读的信息检索。
- 那些正确性要求在一个上下文窗口内端到端完成的任务（某些推理任务；某些一次性生成）。

```figure
memory-consolidation
```

## 实际使用

`code/main.py` 用标准库 Python 实现了一个最小的持久化执行引擎。它支持：

- 一个 `@activity` 装饰器，把输入和输出记录到一个 JSON 事件日志。
- 一个把 activity 排序的工作流函数。
- 一个 `run_or_replay(workflow, event_log)` 函数，重放已完成的 activity 而不重新执行它们。

驱动程序模拟一个三 activity 的工作流，在中途崩溃，并展示 (a) 一次朴素重试把一切都重新执行 对比 (b) 一次重放只跑那个缺失的 activity。

## 拿去用

`outputs/skill-durable-execution-review.md` 审查一个提议的长时运行 agent 部署，看它的持久化执行形态是否正确：activity、确定性、checkpoint 后端、人类输入状态，以及恢复时的 HITL 策略。

## 练习

1. 运行 `code/main.py`。观察朴素重试和重放之间 activity 执行计数的差异。改一下崩溃点，展示重放计数随之变化。

2. 把这个玩具引擎改成显式使用 `thread_id`。模拟两个共享引擎的并发会话，确认它们的事件日志不会撞车。

3. 拿玩具引擎里的一个 activity。引入一个非确定性（在一个工作流决策里放一个墙钟时间戳）。演示重放时的偏离。解释真实引擎如何处理这个（副作用注册、`Workflow.now()` API）。

4. 读 LangChain 的 "Runtime behind production deep agents" 帖子。列出运行时持久化的每一个状态，并指出每个覆盖哪种失败模式。

5. 为一个 6 小时的自主编码任务设计一套 checkpoint 策略。你在哪里 checkpoint？崩溃后恢复长什么样？什么需要新鲜的 HITL？

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Workflow（工作流） | "agent 的脚本" | 确定性的编排代码；可从事件日志重放 |
| Activity | "一步" | 非确定性单元（LLM 调用、工具调用）；前后都记录 |
| Event log（事件日志） | "后备存储" | 每个状态转移的持久记录 |
| Replay（重放） | "恢复" | 重跑工作流；已完成的 activity 返回记录的结果而不重新执行 |
| Checkpoint | "存档点" | 以 thread_id 为键持久化的状态；恢复时最新者胜 |
| thread_id | "会话键" | 给持久状态划范围的标识符 |
| 35-minute degradation（35 分钟退化） | "可靠度衰减" | METR：成功率随跨度约呈二次方下降 |
| Non-determinism（非确定性） | "重放时漂移" | 墙钟、随机、LLM 输出；必须被注册为副作用 |

## 延伸阅读

- [Anthropic — Claude Code Agent SDK: agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) —— 预算、轮次与恢复语义。
- [Microsoft — Agent Framework: human-in-the-loop and checkpointing](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) —— RequestInfoEvent 的形态。
- [LangChain — The Runtime Behind Production Deep Agents](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents) —— 具体的运行时要求。
- [OpenAI Agents SDK + Temporal integration (Trigger.dev announcement)](https://trigger.dev) —— LLM 调用的 activity 形态。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 35 分钟退化的出处。
