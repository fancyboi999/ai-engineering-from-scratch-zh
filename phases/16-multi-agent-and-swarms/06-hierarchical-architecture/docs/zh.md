# 层级架构及其故障模式

> 层级式就是嵌套的 supervisor。manager agent 管 sub-manager，sub-manager 管 worker。CrewAI 的 `Process.hierarchical` 是教科书版本：一个 `manager_llm` 动态分派任务、校验输出。它在 LangGraph 里的对应物是 `create_supervisor(create_supervisor(...))`。当任务本身就是一张真实的组织架构图时，这是自然的模式。它也是最容易塌缩成「管理层空转」的模式——manager agent 派活儿派得烂、误读下级输出、或达不成共识。串行往往打得过它。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 05（Supervisor 模式）
**预计时间：** ~60 分钟

## 问题背景

一旦 supervisor 模式想通了，下一步很自然：「要是 worker 本身也是 supervisor 呢？」团队有子团队；公司有部门下的部门。层级架构正是这样的镜像。

问题在于：LLM 管理者跟人类管理者不是一回事。人类管理者对下属知道什么有稳定的先验。LLM 管理者每一轮都从它上下文里有什么、重新把整个组织推理一遍。那份上下文里只要有一点点漂移，整棵树就会派错活儿。

## 核心概念

### 形状

```
                 Manager
                 ┌─────┐
                 └──┬──┘
           ┌────────┴────────┐
           ▼                 ▼
       Sub-Mgr A         Sub-Mgr B
       ┌─────┐           ┌─────┐
       └──┬──┘           └──┬──┘
         ┌┴──┬──┐          ┌┴──┐
         ▼   ▼  ▼          ▼   ▼
       W1  W2  W3         W4  W5
```

每个内部节点都做规划、分派、综合。只有叶子节点干活儿。

### 它的亮点在哪

- **清晰的组织映射。** 如果真实任务是按部门划分的（「法务审这份文档、财务审这份文档、工程审这份文档，然后给高管做总结」），这套层级就很显式。
- **局部总结。** 每个 sub-manager 在顶层 manager 看到之前先综合自己团队的输出。顶层 manager 看到的是三份 sub-manager 摘要，而不是十五份 worker 输出。

### 它在哪崩

2026 年的复盘反复发现三种故障模式：

1. **任务分配错误。** manager 读了目标，幻想出一个拆解，把活儿派给了错误的 sub-manager。因为 sub-manager 乖乖地按拿到的内容干活儿，错误只会在顶层综合时才浮出来——离人本可以抓住它的地方隔了一层。
2. **输出误读。** sub-manager 返回「无法验证主张 X」。顶层 manager 总结成「主张 X 未被确认」。含义在每一层都漂移。
3. **共识循环。** 两个 sub-manager 意见不合；顶层 manager 让它们去调和；它们又往下重新分派；worker 重跑；sub-manager 返回略有不同的答案；循环。CrewAI 的 `Process.hierarchical` 用步数上限来防这个，但这个上限本身现在成了一个超参数。

### 决定性的那个问题

串行（线性流水线）对层级式：你的任务真有相互独立的子团队，还是一条假装成树的线性流？如果是后者，用串行。如果是前者，用层级式，但要给显式的调和规则留出预算。

### 基于角色框架的实现

CrewAI 的 `Process.hierarchical` 在专精 crew 之上接一个 manager LLM。manager：

- 接收顶层任务，
- 把子任务分配给各个 crew，
- 评估 crew 输出，
- 决定接受、重新分派、还是迭代。

文档：https://docs.crewai.com/en/introduction（在 Core Concepts 下找「Hierarchical Process」）。

### 图框架的实现

LangGraph 用嵌套的 `create_supervisor` 调用。内层 supervisor 有自己的图；外层 supervisor 把内层图当成一个不透明的节点。这在调试上比 CrewAI 干净（你可以分别单步跟踪每个图），但更难表达对树的动态重塑。

参考：https://reference.langchain.com/python/langgraph-supervisor。

```figure
swarm-hierarchy-token
```

## 动手构建

`code/main.py` 跑一个 3 层的层级：

- 顶层 manager：把一个任务拆成「工程」和「法务」两个分支，
- 工程 sub-manager：拆成「前端」和「后端」两个 worker，
- 法务 sub-manager：一个 worker。

演示把顺风路径（人人意见一致）和一条**被扰动的路径**做对比：后者里顶层 manager 的拆解把「法务」错标成了「财务」，然后看着错误如何级联——sub-manager 乖乖做财务的活儿，顶层综合者报告财务发现，最初的法务问题没人回答。

运行：

```
python3 code/main.py
```

输出展示两条路径，并把「问了什么」对「交付了什么」清晰地并排摆出来。

## 实际使用

`outputs/skill-hierarchy-fitness.md` 评估一个给定任务该用层级式、串行、还是扁平 supervisor。输入：任务描述、组织结构、调和预算。输出：模式推荐，附上要防范的具体故障模式。

## 拿去用

如果你要上层级式：

- **把树深限制在 2。** 三层就已经把大多数错误藏到可观测性之外了。
- **显式的调和预算。** 设定顶层 manager 必须拍板前的最大轮数。通常是 2。
- **每份综合都带溯源。** 每个节点的摘要都必须标明它由哪些叶子输出产出。
- **对拆解漂移告警。** 逐步记录 manager 的拆解；与用户查询做 diff。如果拆解不再覆盖查询，就触发告警。

## 练习

1. 跑 `code/main.py`，对比顺风和被扰动两条路径。要经过多少层 manager 交接，顶层输出才会与用户的问题彻底背离？
2. 加第三层（top → sub → sub-sub → worker）。随着深度增长，测量被扰动路径自我纠正与彻底背离各占多大比例。
3. 在每个 sub-manager 那里实现一个「金丝雀」worker，它永远被问原封不动的用户问题。用金丝雀的答案来检测拆解漂移。当金丝雀与综合答案不一致时，manager 该如何反应？
4. 读 CrewAI 的 `Process.hierarchical` 文档。指出 CrewAI 应用的一个具体护栏（步数上限、manager_llm 约束），描述它针对哪种故障模式。
5. 对比嵌套的 LangGraph supervisor 和 CrewAI 层级式。哪个让调和循环更便宜地被检测出来？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Hierarchical | 「组织架构图模式」 | supervisor 套 supervisor；只有叶子干活儿。 |
| Manager LLM | 「老板」 | 在内部节点做拆解、分配、校验的那个 LLM。 |
| Decomposition drift | 「老板跑题了」 | 顶层 manager 的拆分不再覆盖最初的问题。 |
| Reconciliation loop | 「开不完的会」 | sub-manager 意见不合；顶层重新分派；worker 重跑；循环到预算耗尽。 |
| Depth-2 ceiling | 「别超过 2 层」 | 经验护栏：3 层以上可观测性就塌了。 |
| Canary question | 「每一层的 ground truth」 | 一个永远被问原始查询、原封不动的 worker，用来检测漂移。 |
| Provenance chain | 「谁说了什么」 | 从每份综合追溯回产出它的叶子输出。 |

## 延伸阅读

- [CrewAI introduction — Process.hierarchical](https://docs.crewai.com/en/introduction) —— 带 manager LLM 的教科书层级式
- [LangGraph supervisor reference](https://reference.langchain.com/python/langgraph-supervisor) —— 通过 `create_supervisor` 实现的嵌套 supervisor
- [Anthropic engineering — Research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— Anthropic 为何刻意选了扁平 supervisor 而非层级式
- [Cemri et al. — Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) —— MAST 分类法；讲协调失败的那一节记录了拆解漂移
