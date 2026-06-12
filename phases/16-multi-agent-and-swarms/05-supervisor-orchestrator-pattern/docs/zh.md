# Supervisor / Orchestrator-Worker 模式

> 一个 lead agent 做规划和分派；专精的 worker 在并行的上下文里执行、然后汇报。这就是 Anthropic Research 系统背后的模式（Claude Opus 4 当 lead，Sonnet 4 当 subagent），在内部研究评测上相比单 agent Opus 4 测得 +90.2%。Anthropic 的工程博客指出，BrowseComp 上 80% 的方差仅靠 token 用量就能解释——多 agent 之所以赢，很大程度上是因为每个 subagent 都拿到一个全新的上下文窗口。本课从原语出发构建 supervisor 模式，并覆盖 2026 年生产部署给出的工程教训。

**类型：** Learn + Build
**语言：** Python（标准库，`threading`）
**前置要求：** Phase 16 · 04（原语模型）
**预计时间：** ~75 分钟

## 问题背景

调研是单 agent 系统的典型滑铁卢任务。你问「2023 到 2026 年间多 agent 系统有哪些变化？」单 agent 一篇接一篇地串行读五篇论文，把一半上下文塞满它们的正文，然后还得对所有这些一起做推理。它读到第五篇时已经忘了第一篇。它没法并行。

supervisor 模式把这点修好：一个 lead agent 规划搜索、把每个子问题分派给一个 worker，再做综合。每个 worker 为一个狭窄的问题拿到自己的 200k token 窗口。lead 永远看不到原始论文——只看 worker 的摘要。

Anthropic 的生产 Research 系统报告称，在内部研究评测上相比单个 Opus 4 取得 +90.2%。同一篇博客指出，BrowseComp 上 80% 的方差仅靠 *token 用量* 就能解释。每个 subagent 的全新上下文是主要机制。

## 核心概念

### 这个模式

```
                 ┌──────────────┐
                 │   Lead       │  plans, decomposes,
                 │  (Opus 4)    │  synthesizes
                 └──┬────┬───┬──┘
                    │    │   │
            ┌───────┘    │   └───────┐
            ▼            ▼           ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ Worker1 │  │ Worker2 │  │ Worker3 │
      │(Sonnet) │  │(Sonnet) │  │(Sonnet) │
      └─────────┘  └─────────┘  └─────────┘
         fresh       fresh        fresh
         context     context      context
```

lead 从不阅读原始材料。worker 在 lead 做综合之前从不看到彼此的工作。每个箭头都是一次带狭窄产物的 handoff。

### 它为什么赢

三个机制：

1. **每个 subagent 全新的上下文。** 一个探索「FIPA-ACL 遗产」的 worker，不会背上 lead 在规划上花掉的那 40k token。它为一个问题拿到一个 200k 窗口。
2. **靠 prompt 实现专精。** lead 的 prompt 是「拆解和综合」，不是「调研」。每个 worker 的 prompt 很窄：「找出 X 里有什么变化。」聚焦的 prompt 产出聚焦的输出。
3. **并行。** worker 并发运行。墙钟时间大致是 `max(worker_times) + plan + synthesis`，而不是 `sum(worker_times)`。

### 工程教训（Anthropic 2025）

Anthropic 那篇博客列了几条到 2026 年仍然适用的生产教训：

- **按查询复杂度匹配投入。** 简单查询：一个 agent，3-10 次工具调用。复杂查询：10+ 个 agent。这得由 lead 来估，不是调用方。
- **先宽后窄。** 先拆成宽泛的子问题，如果答案值得深挖，再为每个子问题派生更多 worker。
- **彩虹部署（Rainbow deployment）。** agent 是长时间运行、有状态的。传统的蓝绿部署不管用。Anthropic 用彩虹部署：新版本逐步铺开，同时让旧版本逐渐排空。
- **token 用量是主导因素。** 多 agent 大约是单 agent 的 15 倍 token。只在任务价值配得上这笔成本时才跑它。

### LangGraph 的转向

LangGraph 早先发布了一个 `langgraph-supervisor` 库，带一个高层的 `create_supervisor` 辅助函数。2025 年 LangChain 把推荐改成了直接通过工具调用来实现 supervisor 模式，因为工具调用对 *supervisor 看到什么*（上下文工程）有更强的控制力。那个库仍然能用；文档现在推荐工具调用形式。

### 故障模式

- **lead 把计划幻想出来。** 如果 lead 生成的子问题没能拆解出真正的问题，worker 就会对错误的目标做精准调研。
- **worker 过度探索。** 没有明确的范围边界，worker 会偏离分配给它的子问题，污染综合那一步。
- **综合冲突。** 两个 worker 返回了矛盾的事实。lead 必须要么重新提问（加一轮），要么显式记下分歧。最糟的故障是悄悄选一边：用户永远不知道发生过分歧。

### 什么时候 supervisor 是错的

- **串行任务。** 如果第 2 步真的需要第 1 步的输出，并行什么都买不到。用流水线（CrewAI Sequential、LangGraph 线性图）。
- **简单查询。** 单 agent 处理它们更快更省。在派生 worker 之前先用 lead 的「匹配投入」检查。
- **严格确定性。** supervisor 用的是 LLM 选择式的分派。当审计/回放比适应性更重要时，静态图更好。

```figure
supervisor-hierarchy
```

## 动手构建

`code/main.py` 用 `threading` 实现了一个管三个并行 worker 的 supervisor。lead 把一个查询拆成子问题，worker 各自对一个子问题并发运行，lead 做综合。没有真实 LLM——worker 是脚本化的，用来模拟「抓取并总结」。

关键结构：

- `Lead.plan(query)` 把一个查询拆成 3 个子问题。
- `Worker.run(sub_q)` 返回一份假摘要（生产里可以是任何用工具的 agent）。
- `Lead.run(query)` 在线程里启动 worker、join、再做综合。

运行：

```
python3 code/main.py
```

输出展示计划、带起止时间戳的并行 worker 轨迹，以及最终综合。你能看到墙钟时间的收益：三个 0.3 秒的 worker 在约 0.35 秒里跑完，而不是 0.9 秒。

## 实际使用

`outputs/skill-supervisor-designer.md` 接收一个用户查询，产出一份 supervisor 模式设计：lead system prompt、worker 角色、子问题拆解规则、以及综合模板。在构建新的调研型 agent 系统之前用它。

## 拿去用

部署 supervisor 模式之前的检查清单：

- **模型搭配。** lead 用推理档模型（Opus 类、`o3` 类）。worker 用更快更便宜的模型（Sonnet、`o4-mini`）。
- **worker 超时。** 任何超过中位运行时长 2 倍的 worker 都被杀掉；lead 要么以更窄的范围重新派生，要么不带它继续。
- **每个 worker 的 token 上限。** 一个硬限制（比如预期综合输入的 10 倍）能防止一个失控的 worker 把预算烧穿。
- **可观测性。** 追踪 lead 的计划、每个 worker 的工具调用、以及综合。这是任何事后调试的基础。
- **彩虹铺开。** 有状态的长时间运行 agent 需要分版本逐步过渡，不是热替换。

## 练习

1. 跑 `code/main.py`，然后把 lead 改成派生 5 个 worker 而不是 3 个。观察墙钟时间效果。在这个演示里，worker 数到多少时派生开销会超过并行节省？
2. 实现一个 worker 超时：杀掉任何运行超过 0.5 秒的 worker，让 lead 综合剩下的结果。你需要什么可观测性才能知道某个 worker 被掐了？
3. 给 lead 的综合加一个冲突检测步骤：如果两个 worker 返回矛盾答案，lead 记下分歧而不是挑一个。不调 LLM 你怎么检测矛盾？
4. 读 Anthropic 的 Research 系统工程博客。列出这个玩具演示要上生产需要采纳的三条实践。
5. 对比 LangGraph 的 `create_supervisor`（旧法）和新的工具调用推荐。哪个能让你更好地控制 supervisor 看到什么？为什么 Anthropic 明确只把子答案、而不是原始 worker 上下文传入综合？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Supervisor | 「lead agent」 | 一个做规划、分派、综合的 orchestrator agent。自己不干活儿。 |
| Worker | 「subagent」 | 由 supervisor 用狭窄范围调起的聚焦 agent，有自己的上下文窗口。 |
| Orchestrator-worker | 「supervisor 模式」 | 同一回事，叫法不同。2026 年的文献两种都用。 |
| Fresh context | 「干净窗口」 | worker 的上下文从它的 system prompt 和分配到的问题开始，不带 lead 的历史。 |
| Rainbow deployment | 「逐步铺开」 | 长时间运行的有状态 agent 需要分版本的排空-替换，而不是蓝绿部署。 |
| Token dominance | 「上下文才是变量」 | 据 Anthropic，研究评测 80% 的方差来自总 token 用量，而不是模型选择。 |
| Scale effort | 「按复杂度匹配 agent 数量」 | lead 估算查询难度，相应派生 1 个还是 10+ 个 worker。 |
| Synthesis conflict | 「worker 意见不合」 | 两个 worker 返回矛盾事实；lead 必须把分歧摆出来，而不是悄悄挑一个。 |

## 延伸阅读

- [Anthropic engineering — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— supervisor 模式的生产参考
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) —— 工具调用式 supervisor 现在是推荐形式
- [LangGraph supervisor reference](https://reference.langchain.com/python/langgraph-supervisor) —— 旧的辅助函数，2026 年生产里仍在用
- [OpenAI cookbook — Orchestrating Agents: Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) —— 基于 handoff 的 supervisor 变体
