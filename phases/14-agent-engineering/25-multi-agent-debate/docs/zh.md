# 多 Agent 辩论与协作

> Du 等人（ICML 2024，「Society of Minds」）跑 N 个模型实例，各自独立提出答案，然后在 R 轮里互相批判以收敛。改善事实性、规则遵循、推理能力。稀疏拓扑在 token 成本上胜过全连接网格。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 12（工作流模式）、阶段 14 · 05（Self-Refine 与 CRITIC）
**预计时间：** ~60 分钟

## 学习目标

- 解释辩论协议：N 个提议者、R 轮、收敛到一个共享答案。
- 描述为什么辩论能改善事实性、规则遵循和推理。
- 解释稀疏拓扑：不是每个辩论者都需要看到其他每一个。
- 用标准库针对一个脚本化 LLM 实现辩论，带全连接和稀疏变体；度量 token 成本 vs 准确率。

## 问题背景

Self-Refine（第 05 课）是一个模型批判自己 —— 有群体思维的风险。CRITIC（第 05 课）把批判锚定在外部工具上 —— 并非总能用得上。辩论引入第三种模式：多个实例、交叉批判、靠分歧来收敛。

## 核心概念

### Society of Minds（Du 等人，ICML 2024）

- N 个模型实例对同一个问题各自独立提出答案。
- 在 R 轮里，每个模型读其他人的提议并批判它们。
- 模型基于批判更新自己的答案。
- R 轮之后，返回收敛的答案。

原始实验因成本用了 N=3、R=2。在难题上（MMLU、GSM8K、国际象棋走子合法性、传记生成），准确率随更多 agent 和更多轮数而提升。

跨模型组合胜过单模型辩论：ChatGPT + Bard 合在一起 > 任何单独一个。

### 稀疏拓扑

「Improving Multi-Agent Debate with Sparse Communication Topology」（arXiv:2406.11776，2024-2025）表明全连接辩论并非总是最优。稀疏拓扑（星形、环形、轴辐式）能在更低 token 成本下匹配准确率。每个辩论者只看到一部分同伴。

含义：

- 全连接 N=5、R=3 = 5 × 3 = 15 个提议，每个读 4 个同伴 = 60 次批判操作。
- 星形 N=5、R=3（一个 hub + 4 个 spoke）= 15 个提议，spoke 只读 hub = 12 次批判操作。

### 辩论什么时候有帮助

- **事实性。** N 个独立提议，交叉核对降低幻觉。
- **规则遵循。** 国际象棋走子合法性 —— 一个模型漏了条规则，其他人抓到。
- **开放式推理。** 多种框定收窄到正确答案上。

### 辩论什么时候有害

- **延迟敏感的 UX。** N × R 串行轮次是你可能没有的延迟。
- **成本敏感的规模。** 每个问题 N × R 个 token。
- **简单的事实查找。** 一次查找比五次辩论便宜。

### 2026 年的实际实例化

- **Anthropic orchestrator-workers**（第 12 课）—— 辩论的一个变体，带一个综合步骤。
- **LangGraph supervisor**（第 13 课）—— 中央路由器 + 专家 agent，可以把辩论实现为一个节点。
- **OpenAI Agents SDK**（第 16 课）—— agent 来回 handoff 做迭代批判。
- **多 agent 评估** —— 把辩论 + evaluator-optimizer 配对获得评估信号。

### 这个模式在哪里会出错

- **收敛崩塌。** 所有 agent 收敛到第一个错误答案上。用强制分歧轮来缓解。
- **hub 失效。** 在星形拓扑里，一个坏 hub 污染所有人。轮换或用多个 hub。
- **prompt 同质化。** 所有 agent 用同样的 prompt；它们产出同样的答案。用多样的 prompt 和/或模型。

```figure
debate-converge
```

## 动手构建

`code/main.py` 用标准库实现辩论：

- `Debater` 类（脚本化 LLM，带每辩论者的观点漂移）。
- `FullMeshDebate` 和 `SparseDebate` 运行器。
- 三个问题：一个事实型、一个规则型、一个推理型。
- 指标：收敛答案、收敛所需轮数、批判操作总数。

运行它：

```
python3 code/main.py
```

输出：每协议的准确率和成本；稀疏在 2/3 问题上以更低成本匹配全连接。

## 实际使用

- **Anthropic orchestrator-workers** 用于简单的 2-3 worker 辩论。
- **LangGraph** 用于带检查点的有状态多轮辩论。
- **自定义** 用于研究或专门的正确性保证。

## 拿去用

`outputs/skill-debate.md` 脚手架出一个多 agent 辩论，拓扑、N、R 和收敛规则可配置。

## 练习

1. 实现一条「强制分歧」规则：在第 1 轮，每个辩论者必须产出一个不同的提议。度量它对收敛速度的影响。
2. 加一个置信度加权聚合：辩论者返回 (answer, confidence)；聚合器按置信度加权。它有帮助吗？
3. 把一个「agent」换成一个观点不同的不同脚本化 LLM。异质性能改善准确率吗？
4. 在你的 3 个问题上度量全连接 vs 稀疏的 token 成本。画出成本 vs 准确率。
5. 读 Society of Minds 论文。把你的玩具移植到 N=5、R=3。什么崩了？什么变好了？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Debate | 「多 agent 批判」 | N 个提议者，R 轮交叉批判，收敛 |
| Full mesh | 「人人读人人」 | 每个辩论者每轮读每个同伴 |
| Sparse topology | 「受限的同伴视野」 | 辩论者只读一部分同伴 |
| Hub-and-spoke | 「星形拓扑」 | 一个中心辩论者，N-1 个 spoke 只读 hub |
| Convergence | 「达成一致」 | 辩论者收敛到一个共享答案 |
| Society of Minds | 「Du 等人辩论论文」 | ICML 2024 多 agent 辩论方法 |

## 延伸阅读

- [Du et al., Society of Minds (arXiv:2305.14325)](https://arxiv.org/abs/2305.14325) —— 标准的多 agent 辩论
- [Sparse Communication Topology (arXiv:2406.11776)](https://arxiv.org/abs/2406.11776) —— 稀疏拓扑结果
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 作为辩论变体的 orchestrator-workers
- [Madaan et al., Self-Refine (arXiv:2303.17651)](https://arxiv.org/abs/2303.17651) —— 单模型自我批判的对应物
