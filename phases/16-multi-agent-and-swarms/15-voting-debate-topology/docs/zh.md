# 投票、自洽性与辩论拓扑

> 最便宜的聚合：采样 N 个独立 agent，多数投票。Wang 等人 2022 年的自洽性用一个模型采样 N 次做了这件事。多 agent 用**异质** agent 扩展了它，以逃离单一栽培——不同模型、不同 prompt、不同温度、不同上下文。在多数投票之外，辩论拓扑也很重要：MultiAgentBench（arXiv:2503.01935，ACL 2025）评测了 star / chain / tree / graph 协调，发现 **graph 最适合研究**，超过约 4 个 agent 后出现「协调税（coordination tax）」。AgentVerse（ICLR 2024）记录了两种涌现模式——志愿行为和从众行为——而从众既是特性（找到共识）也是风险（群体思维，第 24 课）。本课绘制拓扑空间、构建每个变体、并测量协调税。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 07（心智社会与辩论）、Phase 16 · 14（共识与 BFT）
**预计时间：** ~75 分钟

## 问题背景

辩论能提升准确率（Du 等人，arXiv:2305.14325）。它也能降低准确率。辩论帮不帮得上，取决于四个结构选择：

1. 谁跟谁对话（拓扑）。
2. 几轮（Du 2023：轮数和 agent 数各自独立地重要）。
3. agent 是否异质（不同基础模型能打破单一栽培）。
4. 是否有对抗声音（steel-manning 对 straw-manning，即认真反驳 vs 攻击稻草人）。

把「跑 5 个 agent 然后投票」硬塞到一个任务上的团队，往往比单 agent 还退步。这些失败不是随机的。它们跟拓扑和异质性挂钩。本课就是那张拓扑地图。

## 核心概念

### 自洽性，单模型基线

Wang 等人 2022 年（《Self-Consistency Improves Chain of Thought Reasoning》）在温度 > 0 下对同一模型采样 N 次，对推理路径的答案做多数投票。GSM8K 上的结果：N=40 个样本相比单次贪心解码有显著提升。自洽性是多 agent 投票的单 agent 前身。

局限：自洽性用一个基础模型。误差天生相关。如果模型有系统性偏差，所有 N 个样本都共享它。

### 多 agent 投票，异质扩展

把 N 个样本换成 N 个*不同的* agent。不同基础模型（Claude、GPT、Llama）、不同 prompt、不同工具访问。好处：误差不相关。代价：不同 agent 成本不同；协调它们带来开销。

异质辩论在 2026 年的标准名字是 **A-HMAD**——对抗式异质多 agent 辩论（Adversarial Heterogeneous Multi-Agent Debate）。没被普遍采用，但论文用这个词表示「不同模型辩论，从而减少单一栽培塌缩带来的相关误差」。

### 四种拓扑

```
star                chain               tree                graph

    ┌─A─┐           A─B─C─D         ┌──A──┐              A───B
    │   │                           │     │              │ × │
    B   C                           B     C              D───C
    │   │                          / \   / \
    D   E                         D   E F   G           (fully connected)
```

Star：一个中枢，其他所有 agent 只跟中枢对话。等价于没有回传通道的 supervisor-worker。
Chain：线性，每个 agent 看到前一个的输出。流水线式。
Tree：层级式，被层级化 agent 系统使用（第 06 课）。
Graph：任意对任意。包括全连接团（clique）和任意 DAG。

### 协调税（MultiAgentBench）

MultiAgentBench（MARBLE，ACL 2025，arXiv:2503.01935）在一个含研究、编码、规划的任务集上对 star、chain、tree、graph 做了基准测试。测得的关键结果：

- **Graph** 拓扑在研究任务上胜出。信息任意对任意流动；agent 能互相批判。
- **Star** 在快答事实任务上胜出。中枢做过滤和整合。
- **Chain** 在逐步流水线（分阶段精炼）上胜出。
- **协调税** 在 graph 拓扑超过约 4 个 agent 后出现。墙钟时间和 token 成本增长得比质量快。

4 agent 天花板是经验性的，不是根本性的。它反映 2026 年 LLM 的上下文容量：每个 agent 的上下文被同伴的输出填满，一旦人人能看到人人，加入第 N+1 个 agent 的边际价值就下降了。

### 多 agent 辩论策略（《Should we be going MAD?》）

arXiv:2311.17371 是 2023 年关于 MAD 策略的综述。被他人复现的关键发现：那些在*结构上类似*自洽性的 MAD 变体（独立采样 + 聚合），在同样预算下往往跑不过自洽性。MAD 最有用的时候，是 agent 真正异质、且辩论有对抗结构（有一个 agent 唱反调）。

### AgentVerse 涌现模式

AgentVerse（ICLR 2024，https://proceedings.iclr.cc/paper_files/paper/2024/file/578e65cdee35d00c708d4c64bce32971-Paper-Conference.pdf）记录了两种即便没有显式设计、也会从多 agent 辩论中涌现的行为：

- **志愿（Volunteer）。** 一个 agent 没被要求就主动提供帮助（「下一步我来」）。有用：它把活儿分给某个子任务上最有能力的 agent。
- **从众（Conformity）。** 一个 agent 调整自己的立场去迎合批评者，哪怕批评者是错的。这是辩论版的谄媚（第 14 课）。

从众就是为什么「辩到一致」会奖励霸凌者。有界轮数加一个独立裁判能缓解。

### 异质性：真正能撬动准确率的那个旋钮

2024-2026 年实践文献里的一个模式：把你 N 个 agent 里的一个换成不同的基础模型，带来的准确率提升比把 N 加 1 还大。直觉是单一栽培——每个新的独立误差源，比一个额外的相关样本更值钱。

在极限处，异质性胜过数量。在大多数有干净 ground truth 的任务上，三个不同模型打得过同一模型的五份拷贝。

### 陪审团方法

Sibyl 框架（在 Minsky-LLM 文献里被引用）把「陪审团」形式化——一小组专精 agent，在每个阶段通过投票来精炼答案。和单纯的多数投票不同，陪审团有角色：一个 agent 交叉盘问、一个提供上下文、一个给合理性打分。陪审团方法是单纯投票（便宜、易单一栽培）和完整 MAD（贵、易从众）之间的中间点。

### 投票加辩论何时占优

- 问题有 ground truth（事实、数学、代码行为）。投票收敛是有意义的。
- agent 能访问不同来源或工具（具备异质性）。
- 轮数有界（通常 2-3）且有独立裁判或 verifier。
- 预算允许 3-5 个 agent。graph 拓扑上超过 5-7 个后，协调税占主导。

### 投票加辩论何时有害

- 问题是意见形态的。agent 收敛到看起来最自信、而非最正确的那个答案。
- 所有 agent 共享一个基础模型。单一栽培让共识毫无意义。
- 轮数无界。从众每次都赢。
- 任务简单。一个带 N=5 自洽性的单 agent 更便宜、且一样准。

```figure
sw-debate-topology
```

## 动手构建

`code/main.py` 实现：

- `run_star(agents, hub, question)` —— 中枢轮询每个 worker、聚合。
- `run_chain(agents, question)` —— 顺序精炼。
- `run_tree(root, children, question)` —— 带深度 2 聚合的层级式。
- `run_graph(agents, question, rounds)` —— 全对全辩论，有界轮数。
- 一个脚本化的异质性旋钮：每个 agent 有一个 `error_bias`，表示它的系统性错误程度。
- 一个测量装置，在 N=3、5、7 下跑每种拓扑，报告 (accuracy, total_tokens, wallclock_simulated)。

运行：

```
python3 code/main.py
```

预期输出：一张拓扑 × N → (accuracy, tokens, latency) 的表。graph 在研究型任务上 N=3-5 时胜出；star 在快答事实任务上胜出；graph 在 N=7 时露出协调税（延迟膨胀得比准确率快）。

## 实际使用

`outputs/skill-topology-picker.md` 是一个 skill，它读一段任务描述，推荐一种拓扑（star / chain / tree / graph）、一个 N（agent 数量）、一份异质性配置（用哪些基础模型）、以及一个轮数上界。

## 拿去用

对任何集成：

- 先用一个强基础模型做 **N=5 的自洽性**。这是便宜基线。
- 如果准确率重要，升级到 **N=3 的异质投票**。测量增量。
- 只在任务有结构（研究、多步）且有界轮数可行时，才升级到**辩论拓扑**。
- 永远记录少数簇。当少数持续正确时，你就有了一个多样性信号。
- 把墙钟时间和 token 跟准确率一起做基准。「10 倍成本换更好的准确率」是个商业决策。

## 练习

1. 跑 `code/main.py`。画出 graph 拓扑的协调税曲线：准确率 vs N、token vs N。曲线在哪个 N 拐弯？
2. 实现 A-HMAD：三个故意带不同偏差的 agent。在第 14 课的单一栽培攻击上，全同偏差基线跟 A-HMAD 比怎样？
3. 给 graph 拓扑加一个「裁判」角色，它不投票，只给最终共识打分。这改变了涌现的从众行为吗？
4. 读 AgentVerse 论文（ICLR 2024）。指出你的实现里哪种涌现行为最强。你能通过改 prompt 引出相反行为吗？
5. 读 MultiAgentBench（arXiv:2503.01935）第 4 节（拓扑实验）。用你的测量装置在论文里的一个任务上复现「graph 赢研究」的结果。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Self-consistency | 「采样 N 次，投票」 | Wang 2022。单模型，N 个温度>0 样本，对推理路径多数投票。 |
| Heterogeneity | 「不同模型」 | 不同基础模型或 prompt 家族组成的集成。打破单一栽培。 |
| MAD | 「多 agent 辩论」 | agent 跨轮交换批评的通称。见 Du 2023。 |
| A-HMAD | 「对抗式异质 MAD」 | 强调不同模型 + 对抗结构的 MAD 变体。 |
| Topology | 「谁跟谁对话」 | star、chain、tree、graph。决定信息流。 |
| Coordination tax | 「收益递减」 | graph 上超过约 4 个 agent，成本增长得比质量快。 |
| Volunteer behavior | 「没要求就帮忙」 | AgentVerse 涌现模式：一个 agent 主动接一步。 |
| Conformity behavior | 「压力下的附和」 | AgentVerse 涌现模式：一个 agent 迎合批评者。 |
| Jury | 「小型专精评审团」 | Sibyl 风格、带角色（盘问者、上下文、打分者）的集成。 |

## 延伸阅读

- [Wang et al. — Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171) —— 单模型基线
- [Du et al. — Improving Factuality and Reasoning via Multiagent Debate](https://arxiv.org/abs/2305.14325) —— agent 数和轮数各自独立地重要
- [MultiAgentBench / MARBLE](https://arxiv.org/abs/2503.01935) —— 拓扑基准，显示 graph 最适研究、chain 适流水线
- [Should we be going MAD?](https://arxiv.org/abs/2311.17371) —— MAD 策略综述；发现同等预算下 MAD 常输给自洽性
- [AgentVerse (ICLR 2024)](https://proceedings.iclr.cc/paper_files/paper/2024/file/578e65cdee35d00c708d4c64bce32971-Paper-Conference.pdf) —— 志愿和从众涌现模式
- [MARBLE repo](https://github.com/ulab-uiuc/MARBLE) —— 参考基准实现
