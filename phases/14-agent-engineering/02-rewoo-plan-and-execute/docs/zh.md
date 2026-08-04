# ReWOO 与 Plan-and-Execute：解耦的规划

> ReAct 在一条流里交替进行思考和行动。ReWOO 把它们分开：先来一个大计划，然后执行。token 少 5 倍，HotpotQA 上准确率 +4%，而且你还能把规划器蒸馏进一个 7B 模型。Plan-and-Execute 把它一般化了；Plan-and-Act 把它扩展到了网页导航。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）
**预计时间：** ~60 分钟

## 学习目标

- 解释为什么 ReWOO 的 Planner / Worker / Solver 拆分相比 ReAct 的交替循环能省 token、更稳健。
- 实现一个计划 DAG、一个按依赖排序的执行器，以及一个把 worker 输出组合起来的 solver —— 全部用标准库。
- 用 2026 年「五种工作流模式」的框架（Anthropic）判断一个任务该跑「先规划后执行」还是交替式 ReAct。
- 认清什么时候长跨度的网页或移动端任务需要 Plan-and-Act 的合成计划数据。

## 问题背景

ReAct 那个交替的「思考-行动-观察」循环既简单又灵活，但每次工具调用都得带上完整的前置上下文 —— 包括之前的每一个思考。token 用量随深度二次增长。更糟的是：当某个工具在循环中途失败时，模型得从错误观察里把整个计划重新推一遍。

ReWOO（Xu 等人，arXiv:2305.18323，2023 年 5 月）注意到了这一点，押了个注：先把整件事规划好，并行拉取证据，最后再组合答案。一次 LLM 调用做规划，N 次工具调用取证据（可并行），一次 LLM 调用做求解。代价是灵活性下降（计划是静态的），换来的是好得多的 token 效率和更清晰的失败模式。

## 核心概念

### 三个角色

```
Planner:  user_question -> [plan_dag]
Workers:  [plan_dag]     -> [evidence]        (tool calls, possibly parallel)
Solver:   user_question, plan_dag, evidence -> final_answer
```

Planner 产出一个 DAG。每个节点指明一个工具、它的参数，以及它依赖哪些更早的节点（像 `#E1`、`#E2` 这样的引用）。Worker 按拓扑序执行节点。Solver 把所有东西缝合到一起。

### 为什么 token 少 5 倍

ReAct 的 prompt 长度随步数线性增长。到第 10 步时，prompt 里包含思考 1 加动作 1 加观察 1 加思考 2 加动作 2 加观察 2，依此类推。而且每个中间步骤还冗余地把原始 prompt 又带了一遍。

ReWOO 只付出一个 planner prompt（大）、N 个小 worker prompt（每个就只有工具调用，不带链）、一个 solver prompt。论文在 HotpotQA 上测得 token 约少 5 倍，同时准确率绝对值 +4。

### 为什么它更稳健

在 ReAct 里如果 worker 3 失败了，循环得在流中途从错误里推理出路。在 ReWOO 里，worker 3 返回一个错误字符串；solver 在带着原始计划的上下文里看到它，可以优雅降级。失败定位是按节点的，不是按步骤的。

### 规划器蒸馏

论文的第二个结果：因为规划器看不到观察，你可以拿一个 175B 教师模型产出的规划器输出去微调一个 7B 模型。小模型负责规划；推理时不再需要大模型。这现在已经是标配 —— 2026 年许多生产 agent 用小规划器配大执行器，或反过来。

### Plan-and-Execute（2023）

LangChain 团队 2023 年 8 月那篇帖子把 ReWOO 一般化成了一个模式名：Plan-and-Execute。前置的规划器吐出一个步骤列表，执行器跑每一步，一个可选的重规划器（replanner）可以在观察到结果后修订。这比 ReWOO 更接近 ReAct（重规划器把观察带回了规划），但保留了 token 节省。

### Plan-and-Act（Erdogan 等人，arXiv:2503.09572，ICML 2025）

Plan-and-Act 把这个模式扩展到长跨度的网页和移动端 agent。关键贡献是合成计划数据：一个带标注的轨迹生成器产出计划显式可见的训练数据。用来微调规划器模型，让它们在类 WebArena 任务上跑过 30–50 步还能保持工作 —— 而单条 ReAct 轨迹在这种任务上早就丢了连贯性。

### 什么时候选哪个

| 模式 | 什么时候用 |
|---------|------|
| ReAct | 短任务、环境未知、需要反应式异常处理 |
| ReWOO | 工具已知的结构化任务、对 token 敏感、证据可并行 |
| Plan-and-Execute | 像 ReWOO，但在部分执行后会重规划 |
| Plan-and-Act | 长跨度（>30 步）、网页/移动端/computer-use |
| Tree of Thoughts | 搜索值得为之买单时（第 04 课） |

Anthropic 2024 年 12 月的建议：从最简单的开始。如果任务就是一次工具调用加一段汇总，别去搭 ReWOO。如果任务是一个 40 步的研究作业，别光用 ReAct。

```figure
rewoo-plan
```

## 动手构建

`code/main.py` 实现了一个玩具版 ReWOO：

- `Planner` —— 一个脚本化策略，从 prompt 吐出计划 DAG。
- `Worker` —— 通过注册表分派每个节点的工具调用。
- `Solver` —— 脚本化的组合逻辑，读取证据并产出最终答案。
- 依赖解析 —— 像 `#E1` 这样的引用会被替换成更早的 worker 输出。

这个演示回答「法国首都的人口是多少，四舍五入到百万？」，用一个两步计划：(1) 查首都，(2) 查人口，然后求解。

运行它：

```
python3 code/main.py
```

轨迹先展示完整计划，然后是 worker 结果，再然后是 solver 组合。把 token 数（我们打印了一个粗略的字符数）和一次 ReAct 式交替运行做对比 —— 在这种结构化任务上 ReWOO 胜出。

## 实际使用

LangGraph 把 Plan-and-Execute 作为一份配方提供（ReAct 用 `create_react_agent`，plan-execute 用自定义图）。CrewAI 的 Flows 直接编码了这个模式：你前置定义好任务，Flow DAG 就执行它们。Plan-and-Act 的合成数据方法目前大体上还停留在研究阶段；运行时模式（显式计划 DAG）已经通过 LangGraph 和 CrewAI Flows 进了生产。

## 拿去用

`outputs/skill-rewoo-planner.md` 在给定一份工具目录的情况下，从用户请求生成一个 ReWOO 计划 DAG。它在把活儿交给执行器之前会校验计划（无环、每个引用都能解析、每个工具都存在）。

## 练习

1. 为相互独立的计划节点并行化 worker 执行。在一个有 2 个并行组的 6 节点 DAG 上，这能给你带来什么？
2. 加一个重规划器节点，任何 worker 返回错误时就触发。让 ReWOO 变成 Plan-and-Execute 的最小改动是什么？
3. 把 `Planner` 换成一个小模型（7B 级），把 `Solver` 留在前沿模型上。对比端到端质量 —— 这种拆分在哪里会崩？
4. 读 ReWOO 论文第 4 节关于规划器蒸馏的内容。在概念上复现 175B -> 7B 的结果：你需要什么训练数据，又怎么给计划质量打分？
5. 把这个玩具移植到 Plan-and-Act 的轨迹形态：计划是一个序列，不是 DAG。哪些取舍发生了变化？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| ReWOO | 「无观察推理」 | 先规划、再并行取证据、再求解 —— 规划 prompt 里没有观察 |
| Plan-and-Execute | 「LangChain 的 plan-execute 模式」 | 带一个执行后可选重规划器节点的 ReWOO |
| Plan-and-Act | 「扩展版 plan-execute」 | 显式的规划器/执行器拆分，配长跨度任务的合成计划训练数据 |
| Evidence reference | 「#E1、#E2、……」 | 计划节点占位符，在分派时被替换成之前的 worker 输出 |
| Planner distillation | 「小规划器，大执行器」 | 拿大教师模型的规划器轨迹去微调一个小模型 |
| Token efficiency | 「更少的往返」 | 论文里 HotpotQA 上相比 ReAct token 少 5 倍 |
| DAG executor | 「拓扑分派器」 | 按依赖序跑计划节点；每一层内并行 |

## 延伸阅读

- [Xu et al., ReWOO: Decoupling Reasoning from Observations (arXiv:2305.18323)](https://arxiv.org/abs/2305.18323) —— 那篇标准论文
- [Erdogan et al., Plan-and-Act (arXiv:2503.09572)](https://arxiv.org/abs/2503.09572) —— 配合成计划的扩展版规划器-执行器
- [LangGraph Plan-and-Execute tutorial](https://docs.langchain.com/oss/python/langgraph/overview) —— 框架配方
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 挑能用的最简单模式
