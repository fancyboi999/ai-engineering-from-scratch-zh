# 角色专精 —— Planner、Critic、Executor、Verifier

> 2026 年最常见的多 agent 拆解：一个 agent 做规划、一个执行、一个批判或验证。MetaGPT（arXiv:2308.00352）把它形式化为编码进角色 prompt 的 SOP——产品经理、架构师、项目经理、工程师、QA 工程师——遵循 `Code = SOP(Team)`。ChatDev（arXiv:2307.07924）用一条「聊天链」把设计师、程序员、评审、测试串起来，并带「沟通式去幻觉」（communicative dehallucination，agent 显式索取缺失的细节）。verifier 是承重的：Cemri 等人（MAST，arXiv:2503.13657）表明每一次多 agent 失败都能追溯到验证缺失或损坏。PwC 报告称 CrewAI 里结构化的校验循环带来 7 倍准确率提升（10% → 70%）。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 04（原语模型）、Phase 16 · 05（Supervisor）
**预计时间：** ~60 分钟

## 问题背景

泛用的多 agent 系统产出泛用的输出。一个群聊里的三个 coder 会写出同一份平庸代码的三种风味。你可以加更多 agent、加更多轮，照样跨不过质量门槛。

修法不是更多 agent，而是*不同的* agent。分配清晰的角色。给 critic 一些 planner 没有的工具。给 verifier 一套客观的测试集。这样系统就有了带扎实纠错的内部分歧，而不只是并行瞎猜。

## 核心概念

### 四个标准角色

**Planner（规划者）。** 读目标，产出一份步骤清单或一份 spec。工具：知识检索、文档。输出：结构化计划。

**Executor（执行者）。** 一次读一个计划步骤，产出产物。工具：真正干活儿的工具（代码编译器、shell、API 客户端）。输出：产物。

**Critic（批评者）。** 对照 planner 的意图来读 executor 的输出。工具：对产物的只读访问、静态分析。输出：接受/拒绝并附理由。

**Verifier（验证者）。** 读产物并跑一个确定性检查。工具：测试运行器、类型检查器、schema 校验器。输出：通过/失败并附证据。

critic 是主观的、有立场的、常基于 LLM。verifier 是客观的、确定性的、常基于代码。它们不是同一个角色。

### MetaGPT 的 SOP 模式

MetaGPT（arXiv:2308.00352）把软件工程 SOP 编码成角色 prompt：

- **产品经理** 写 PRD。
- **架构师** 产出系统设计。
- **项目经理** 拆分任务。
- **工程师** 实现。
- **QA 工程师** 跑测试。

每个角色都有严格的输入/输出 schema。角色 prompt 说明这个角色*是什么*、它*必须产出什么*。`Code = SOP(Team)` 这个表述——确定性的 SOP 把一队 LLM 变成一条可预测的流水线。

### ChatDev 的沟通式去幻觉

ChatDev 加了一个关键动作：当 executor 需要一个计划里没有的具体细节时，它会在继续之前显式去问设计师。这防住了 LLM 经典的失败——煞有介事地把细节编出来。

实现：角色 prompt 里包含「当你需要没被告知的具体信息时，在产出之前点名去问相关角色」。

### 为什么 verifier 最重要

Cemri 等人（MAST）追踪了 1642 次多 agent 执行失败。21.3% 是验证缺口——系统交付了一个没人检查过的答案。剩下的 79% 往往也能追溯到「有一个检查悄悄失败了、或者压根没跑过」。验证是那个承重的角色。

PwC 报告（CrewAI 部署，2025）称，加上一个结构化校验循环把准确率从 10% 拉到 70%。一个角色带来 7 倍提升。

### Critic 对 Verifier

- critic 是一个 LLM，为质量审查产物。主观。会被像样的措辞骗到。
- verifier 是一个跑在产物上的确定性程序。客观。给出带证据的通过/失败。

两个都用。critic 抓 verifier 说不清的品味问题。verifier 抓 critic 看不见的 bug——因为它们只在运行时才暴露。

### 反模式

你系统里每个角色都是 LLM，每个角色的输出都是「我看着挺好」。经典的 MAST 故障模式。至少加一个 verifier，它的通过/失败由代码决定，而不是由 LLM 决定。

### 框架映射

- **CrewAI** —— `Agent(role, goal, backstory)` 是教科书式的专精接口。
- **LangGraph** —— 节点可以有专精的 prompt；边强制流水线。
- **AutoGen** —— 在 GroupChat 里用单词命名的角色专属 ConversableAgent。
- **OpenAI Agents SDK** —— 角色专精 Agent 之间的 handoff 工具。

```figure
swarm-roles
```

## 动手构建

`code/main.py` 实现了一条 4 角色流水线，构建一个简单的 Python 函数：

- **Planner** 产出一份 spec。
- **Executor** 生成一段代码字符串。
- **Critic**（LLM 模拟）标出明显问题。
- **Verifier** 在沙箱里（`exec`）针对一个测试用例运行生成的代码。

演示跑两遍：一遍 executor 产出正确代码（critic + verifier 都通过），一遍 executor 产出偏离 spec 的代码（critic 因为看着像样而漏掉 bug，verifier 因为测试失败而抓住它）。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-role-designer.md` 接收一个任务，产出角色花名册（3-5 个角色）、每个角色的输入/输出 schema、以及 verifier 检查。在把 agent 接进框架之前用它。

## 拿去用

检查清单：

- **至少一个确定性 verifier。** 绝不全是 LLM。
- **每个角色显式的 I/O schema。** planner 返回一份 spec，不是散文；executor 读那份 schema。
- **沟通式去幻觉。** executor 缺信息时必须去问 planner；绝不自己编。
- **critic/verifier 的顺序。** 先跑 critic（便宜，抓设计问题），后跑 verifier（慢，抓 bug）。
- **循环预算。** critic-executor 修订最多 2 轮，再不行就上报给人。

## 练习

1. 跑 `code/main.py`，观察 verifier 如何抓住 critic 漏掉的 bug。加一个静态分析检查（数 `return` 出现的次数）当作额外的 verifier。它抓到了什么运行时测试漏掉的东西？
2. 加第 5 个角色：「需求分析师」，把用户的愿望翻译成 planner 可用的 spec。哪些沟通式去幻觉请求该往上流到它这里？
3. 读 MetaGPT 第 3 节（「Agents」）。列出 MetaGPT 5 个角色各自的输入/输出 schema。
4. 读 ChatDev 的聊天链图（arXiv:2307.07924 图 3）。指出沟通式去幻觉在哪里打破了一个本会无限的循环。
5. PwC 的 7 倍准确率提升来自验证循环。假设三个加 verifier 也帮不上忙的任务——那些确定性地检查正确性不可能、或贵到离谱的任务。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Role specialization | 「不同 agent，不同活儿」 | 为 planner/executor/critic/verifier 角色调好的不同 system prompt。 |
| SOP pattern | 「编码进去的标准操作流程」 | MetaGPT 的提法：每个角色严格的 I/O schema 把团队变成流水线。 |
| Communicative dehallucination | 「编之前先问」 | ChatDev 模式：executor 缺细节时去问 planner，而不是瞎编一个。 |
| Critic | 「LLM 评审」 | 主观、有立场的评审。抓品味问题。会被像样的措辞骗到。 |
| Verifier | 「确定性检查」 | 基于代码的通过/失败。测试运行器、类型检查器、schema 校验器。骗不了。 |
| Verification gap | 「没人检查」 | MAST 失败的 21.3%。答案在没有一个本会抓住 bug 的检查的情况下交付了。 |
| Revision loop | 「critic 给打回来」 | critic 拒绝触发 executor 带反馈重跑。需要一个预算。 |
| All-LLM anti-pattern | 「我看着挺好」 | 每个角色都是 LLM，没有确定性检查。经典 MAST 故障。 |

## 延伸阅读

- [Hong et al. — MetaGPT: Meta Programming for Multi-Agent Collaboration](https://arxiv.org/abs/2308.00352) —— SOP 即角色 prompt 的参考论文
- [Qian et al. — Communicative Agents for Software Development (ChatDev)](https://arxiv.org/abs/2307.07924) —— 聊天链 + 沟通式去幻觉
- [Cemri et al. — Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) —— MAST 分类法；验证缺口占失败的 21.3%
- [CrewAI docs — Agent roles](https://docs.crewai.com/en/introduction) —— 生产级的角色描述接口
