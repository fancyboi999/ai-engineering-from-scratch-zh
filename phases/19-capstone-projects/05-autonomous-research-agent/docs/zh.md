# 顶点项目 05 —— 自主研究 agent（AI-Scientist 级）

> Sakana 的 AI-Scientist-v2 发表了完整的论文。Agent Laboratory 跑通了实验。Allen AI 公开了 trace。2026 年的形态是在实验上做规划-执行-验证的树搜索、有预算的成本、沙箱化的代码执行、一个带视觉反馈的 LaTeX 写作器，以及一组自动化的 NeurIPS 风格审稿人集成。这个顶点项目就是做一个出来，在每篇论文 30 美元以内端到端跑完，并扛住 Sakana 记录在案的沙箱逃逸红队。

**类型：** Capstone
**语言：** Python（agent + 沙箱）、LaTeX（输出）
**前置要求：** 第 2 阶段（ML）、第 3 阶段（深度学习）、第 7 阶段（transformer）、第 10 阶段（从零做 LLM）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 16 阶段（多 agent）、第 18 阶段（安全）
**涉及阶段：** P0 · P2 · P3 · P7 · P10 · P14 · P15 · P16 · P18
**预计时间：** 40 小时

## 问题背景

自主研究 agent 在 2026 年跨过了一道门槛。Sakana AI 的 AI-Scientist-v2 登上了 Nature，其生成的论文通过了 workshop 的同行评审。ShinkaEvolve（ICLR 2026）把这条线延伸到了演化假设。AMD 的 Agent Laboratory 交付了可复现的 trace。这些 agent 不是魔法——它们是一个跑在候选实验树上的规划-执行-验证循环，带成本上限、绑定随机种子的沙箱，以及自动化评审。手艺在于那个循环、那份预算，以及那套安全叙事。

你通过在一个狭窄领域里针对一个种子想法实现这样一个循环来学它（比如，在一个 1 亿参数的 transformer 上做注意力稀疏性的消融）。价值不在于第一次跑就发现新东西。价值在基础设施上：树搜索、实验沙箱、写作器-审稿人循环、红队报告。Sakana 团队记录过沙箱逃逸的失败；你的 agent 必须通过同一套红队。

## 核心概念

这个 agent 是一个最佳优先（best-first）的树搜索。节点是实验规格：（假设、配置、代码、预期结果）。一个扩展步骤用小改动提出子节点（换优化器、调批大小、消融某个组件）。每个子节点在一个带硬性资源上限的全新沙箱里运行。结果反馈进一个评分函数，按（新颖度 × 质量 × 剩余预算）给节点排序。树一直生长到预算耗尽，然后把最佳分支写成文章。

写作器是多模态的。它生成一份 LaTeX 草稿、编译它、渲染图表，再把渲染出的 PDF 喂回 Claude Opus 4.7 的视觉模式，让它对版式、图表可读性、断言与证据的一致性做批评。一组五个 LLM 评委的审稿集成给出 NeurIPS 风格的分数（新颖度、严谨性、清晰度、可复现性、影响力）；如果均分低于阈值，论文带着批评意见退回写作器。

安全是承重的。每个实验都在一个无网络出口、墙钟有界、资源限制锁死的 E2B 或 Daytona 沙箱里运行。agent 的代码生成步骤要过一个策略层，拦截会逃出沙箱的系统调用。红队报告复现 Sakana 记录在案的攻击面（fork 炸弹、文件系统逃逸、LLM 写出的网络调用）。

## 架构

```
seed idea + domain
      |
      v
  literature search (Semantic Scholar + OpenAlex + FAISS cache)
      |
      v
  LangGraph plan-execute-verify tree
      |
      v
  +--- expand node ----+      per-node sandbox
  |                    |      (E2B / Daytona)
  v                    v      resource caps
  child_1           child_k   no network egress
  |                    |      deterministic seeds
  v                    v
  run experiment       run experiment
  |                    |
  v                    v
  score nodes by (novelty, quality, budget)
      |
      v
  best branch -> LaTeX writer
      |
      v
  compile + vision critique (Opus 4.7 vision)
      |
      v
  reviewer ensemble (5 LLM judges, NeurIPS rubric)
      |
      v
  paper.pdf + review.md + trace.json
```

## 技术栈

- 编排：带 checkpoint 和人类审批闸门的 LangGraph
- 树搜索：在实验节点上自定义的最佳优先搜索（Sakana v2 的 AB-MCTS 风格）
- 沙箱：每个实验一个 E2B，Docker-in-Docker 作兜底；通过 cgroups 设资源上限
- 文献：Semantic Scholar Graph API + OpenAlex + 摘要的本地 FAISS 缓存
- 写作器：LaTeX 模板 + Claude Opus 4.7（视觉模式）做图表批评和版式
- 审稿人：5 个评委的集成（Opus 4.7、GPT-5.4、Gemini 3 Pro、DeepSeek R1、Qwen3-Max），加权聚合
- 实验框架：物理实验用 PyTorch 2.5，日志用 W&B
- 可观测性：agent trace 用 Langfuse，每篇论文 30 美元的硬预算

```figure
ce-experiment-tree
```

## 动手构建

1. **种子与领域圈定。** 拿一个种子想法（如“考察 10 亿参数以下 transformer 注意力图中的稀疏模式”）。定义搜索空间：模型、数据集、算力预算。

2. **文献遍历。** 查 Semantic Scholar + OpenAlex 找 50 篇被引最多的相关论文；把摘要缓存到本地；生成一页领域摘要。

3. **树脚手架。** 用种子假设初始化根节点。实现 `expand(node) -> children`，用小改动提案（每个子节点改一处配置）。把 `score(node)` 实现成一个加权的 新颖度 × 质量 × 预算 项。

4. **沙箱封装。** 每个实验跑 `docker run --network=none --memory=8g --cpus=2 --pids-limit=256 --read-only`（或等价的 E2B 策略）。随机种子写进沙箱；输出以只读方式挂载回来。

5. **规划-执行-验证循环。** `plan` 提出子节点。`execute` 跑沙箱，捕获日志和指标。`verify` 对指标跑单元检查（损失降了吗？消融隔离出效应了吗？）。失败的节点把失败原因存在树上。

6. **写作器。** 预算用完后，选出最佳分支。用 matplotlib 渲染图表。把分支 trace 放进上下文，让 Claude Opus 4.7 生成 LaTeX 草稿。编译。把编译出的 PDF 喂回 Opus 4.7 视觉做批评。迭代。

7. **审稿人集成。** 五个评委按 NeurIPS 风格的标准给草稿打分（新颖度、严谨性、清晰度、可复现性、影响力）。如果均分 < 4.0/5，带着批评退回写作器。重写 3 次后硬性停止。

8. **红队。** 搭建或集成一组针对沙箱的对抗任务：fork 炸弹、网络外泄尝试、文件系统逃逸、LLM 写出的 shell 元字符。确认全部被拦截。写一份发现报告。

9. **可复现性。** 每篇论文都带上它的树搜索 trace JSON、随机种子、W&B run 链接、沙箱配置，以及一个端到端复现它的 README。

## 实际使用

```
$ ai-scientist run --seed "attention sparsity in sub-1B transformers" --budget 30
[lit]    50 papers, digest in 12s
[tree]   expanded 8 nodes, budget 12/30
[exec]   node #3 sparsity=top-8, loss=2.83 (best so far)
[exec]   node #6 sparsity=top-4, loss=3.12 (worse)
[exec]   ...
[tree]   chose branch rooted at node #3 (novelty 0.62, quality 0.81)
[write]  LaTeX draft v1 complete
[vision] critique: figure 2 legend too small, claim-evidence ok
[write]  draft v2 after 3 edits
[review] mean 4.2/5 (novelty 3.9, rigor 4.3, clarity 4.1, repro 4.5, impact 4.2)
[done]   paper.pdf + review.md + trace.json     $28.40 spent
```

## 拿去用

`outputs/skill-ai-scientist.md` 是交付物。给定一个种子想法 + 一个领域 + 30 美元预算，它跑完整条流水线，产出一篇可评审的论文加一份可复现性包。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 论文质量 | 对照已发表的 workshop 论文做盲审 |
| 20 | 实验严谨性 | 基线、随机种子、消融；每条断言都有结果表里的一格撑着 |
| 20 | 成本与算力纪律 | 每篇论文 30 美元上限被执行，Langfuse 追踪 |
| 20 | 安全性 | 沙箱红队通过；网络策略和急停开关已验证 |
| 15 | 可复现性 | 用相同随机种子一条命令重跑能复现论文 |
| **100** | | |

## 练习

1. 在同一个领域针对三个不同的种子想法跑流水线。比较树搜索里哪些部分重叠。找出被重复浪费的算力。

2. 在实验执行前给估算超过 5 美元的节点加一道人在环闸门。衡量总成本降了多少。

3. 把审稿人集成换成单个评委。在一组已知是坏论文的留出集上衡量误接受率。

4. 引入一个网络外泄红队测试：agent 写出试图 `curl` 一个外部地址的代码。确认 `--network=none` 策略把它拦下。记录这次尝试。

5. 把你的树搜索跟一个平坦的随机基线（相同预算、无扩展策略）对比。报告 新颖度 × 质量 的增益。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Tree search（树搜索） | “AB-MCTS 风格的扩展” | 在实验节点上的最佳优先探索，用 新颖度×质量×预算 打分 |
| Sandbox（沙箱） | “实验隔离” | 无网络、CPU/内存有界、种子锁死、输入只读的容器 |
| Vision critique（视觉批评） | “渲染后再读” | 把论文编译成 PDF，再把 PDF 喂回 VLM，对版式和断言-证据做批评 |
| Reviewer ensemble（审稿人集成） | “自动化同行评审” | 多个 LLM 评委用 NeurIPS 标准给论文打分；加权聚合作为流水线闸门 |
| Novelty score（新颖度分） | “这是新东西吗？” | 一个惩罚与 50 篇文献缓存过于接近的启发式 |
| Cost ceiling（成本上限） | “美元预算” | 每篇论文总花费的硬上限；Langfuse 计数器 + 运行前估算 |
| Red team（红队） | “沙箱逃逸审计” | 一组在策略写错时会逃出沙箱的对抗任务 |

## 延伸阅读

- [Sakana AI-Scientist-v2 repository](https://github.com/SakanaAI/AI-Scientist-v2) —— 参考级的生产研究 agent
- [Sakana AI-Scientist-v1 paper (arXiv:2408.06292)](https://arxiv.org/abs/2408.06292) —— 最初的方法论
- [ShinkaEvolve (Sakana ICLR 2026)](https://sakana.ai) —— 演化式扩展
- [Agent Laboratory (AMD)](https://github.com/SamuelSchmidgall/AgentLaboratory) —— 多角色研究实验室框架
- [LangGraph documentation](https://langchain-ai.github.io/langgraph/) —— 参考编排层
- [Semantic Scholar Graph API](https://api.semanticscholar.org/) —— 文献搜索
- [E2B sandboxes](https://e2b.dev) —— 参考级实验隔离
- [NeurIPS reviewer guidelines](https://neurips.cc/Conferences/2026/Reviewer-Guidelines) —— 审稿人集成所编码的评审标准
