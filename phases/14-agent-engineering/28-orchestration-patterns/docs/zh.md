# 编排模式：Supervisor、Swarm、Hierarchical

> 四种编排模式在 2026 年的各框架里反复出现：supervisor-worker、swarm / 点对点、hierarchical、debate。Anthropic 的建议：「关键是为你的需求构建对的系统。」从简单开始；只在「单个 agent 加五种工作流模式」不够用时才加拓扑。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 12（工作流模式）、阶段 14 · 25（多 agent 辩论）
**预计时间：** ~60 分钟

## 学习目标

- 说出四种反复出现的编排模式，以及各自何时合适。
- 描述 2026 年 LangChain 的建议：基于工具调用的 supervision vs supervisor 库。
- 解释 Anthropic 的「构建对的系统」规则，以及它如何约束拓扑选择。
- 用标准库针对一个公共的脚本化 LLM 实现全部四种。

## 问题背景

团队在需要「多 agent」之前就去够它。四种模式在各框架里反复出现；一旦你能给它们命名，你就能挑对的那个 —— 或者完全跳过拓扑。

## 核心概念

### Supervisor-worker

- 一个中央路由 LLM 分派给专家 agent。
- 决定：回到自己、交给专家、终止。
- 专家之间不交谈；所有路由都过 supervisor。

框架：LangGraph `create_supervisor`、Anthropic orchestrator-workers、CrewAI Hierarchical Process。

**2026 年 LangChain 的建议：** 通过直接工具调用而非 `create_supervisor` 来做 supervision。给你更细的上下文工程控制 —— 你精确决定每个专家看到什么。

### Swarm / 点对点

- agent 通过一个共享工具接触面直接交接。
- 没有中央路由器。
- 比 supervisor 延迟更低（跳数更少）。
- 更难推理（没有单一控制点）。

框架：LangGraph swarm 拓扑、OpenAI Agents SDK handoff（当所有 agent 都能交给所有其他 agent 时）。

### Hierarchical

- supervisor 管理子 supervisor 管理 worker。
- 在 LangGraph 里实现为嵌套子图；在 CrewAI 里实现为嵌套 crew。
- 以运维复杂度为代价扩展到大规模 agent 群体。

什么时候需要它：当单个 supervisor 的上下文预算装不下所有专家的描述时。

### Debate

- 并行提议者 + 迭代交叉批判（第 25 课）。
- 算不上真正的编排 —— 更偏验证 —— 但在框架里以拓扑选择的形式出现。

### Autonomous crews vs deterministic flows

CrewAI 形式化了两种部署模式：

- **Flow** 用于确定性的事件驱动自动化（生产的推荐起点）。
- **Crew** 用于自主的、基于角色的协作。

这与上面四种模式正交，但映射到拓扑：Flow 通常是 supervisor 或 hierarchical；Crew 通常是带 LLM 路由器的 supervisor。

### Anthropic 的建议

「在 LLM 领域，成功不在于构建最复杂的系统。在于为你的需求构建对的系统。」

决策顺序：

1. 单个 agent + 工作流模式（第 12 课）—— 从这里开始。
2. supervisor-worker —— 当你有 2-4 个专家时。
3. swarm —— 当延迟比推理清晰度更重要时。
4. hierarchical —— 只在 supervisor 上下文预算撑不住时。
5. debate —— 当准确率比成本更重要时。

### 这个模式在哪里会出错

- **拓扑优先思维。** 在认清多 agent 解决什么问题之前就「我们需要多 agent」。
- **swarm 里来回弹跳的 handoff。** A -> B -> A -> B。用跳数计数器。
- **假分层。** 因为「企业级」就搞三层；实际只有两个团队。压平。

```figure
orchestration-pattern
```

## 动手构建

`code/main.py` 用标准库针对一个脚本化 LLM 实现全部四种模式：

- `Supervisor` —— 中央路由器。
- `Swarm` —— 带直接 handoff 的点对点。
- `Hierarchical` —— supervisor 的 supervisor。
- `Debate` —— 并行提议者 + 批判。

每个模式处理同一个三意图任务（refund / bug / sales）。轨迹形态各不相同。

运行它：

```
python3 code/main.py
```

输出：每模式的轨迹 + 操作数。supervisor 最干净；swarm 最短；hierarchical 最深；debate 最贵。

## 实际使用

- **LangGraph** 用于 supervisor 和 hierarchical（嵌套子图）。
- **OpenAI Agents SDK** 用于「handoff 即工具」（supervisor 形态）。
- **CrewAI Flow** 用于生产确定性。
- **自定义** 用于 debate 或当你想要精确控制时。

## 拿去用

`outputs/skill-orchestration-picker.md` 挑一个拓扑并实现它。

## 练习

1. 通过移除路由器把一个 supervisor-worker 转成 swarm。什么崩了？什么改善了？
2. 给 swarm 加一个跳数计数器：3 次 handoff 后拒绝。它能抓到 A->B->A 弹跳吗？
3. 为一个 12 专家的领域构建一个两级 hierarchical 系统。不嵌套的话上下文预算在哪里撑不住？
4. 在一个生产形态的工作负载上给四种模式做性能分析。哪个在哪个指标上胜出（延迟、成本、准确率、可调试性）？
5. 读 Anthropic 的「Building Effective Agents」帖子。把你每个生产流程映射到四种之一。有没有映射不干净的？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Supervisor-worker | 「路由器 + 专家」 | 中央 LLM 分派给专家；它们彼此不交谈 |
| Swarm | 「点对点」 | 通过共享工具直接 handoff；无中央路由器 |
| Hierarchical | 「supervisor 的 supervisor」 | 用于大规模群体的嵌套子图 |
| Debate | 「提议者 + 批判」 | 并行提议者，交叉批判（第 25 课） |
| Tool-call-based supervision | 「无库的 supervisor」 | 把 supervisor 实现为直接工具调用以控制上下文 |
| Crew | 「自主团队」 | CrewAI 基于角色的协作模式 |
| Flow | 「确定性工作流」 | CrewAI 事件驱动的生产模式 |

## 延伸阅读

- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 五种模式 + agent vs 工作流
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— supervisor、swarm、hierarchical
- [CrewAI docs](https://docs.crewai.com/en/introduction) —— Crew vs Flow
- [Du et al., Society of Minds (arXiv:2305.14325)](https://arxiv.org/abs/2305.14325) —— debate 模式
