# 评估与协调基准

> 五个 2025-2026 年的基准覆盖了多 agent 评估空间。**MultiAgentBench / MARBLE**（ACL 2025，arXiv:2503.01935）用里程碑 KPI 评测 star/chain/tree/graph 拓扑；**graph 最适合研究**，认知规划带来约 3% 的里程碑达成提升。**COMMA** 评测多模态非对称信息协调；包括 GPT-4o 在内的最先进模型都难以打败随机基线。**MedAgentBoard**（arXiv:2505.12371）覆盖四个医疗任务类别，常发现多 agent 不优于单 LLM。**AgentArch**（arXiv:2509.10769）对结合工具使用 + 记忆 + orchestration 的企业 agent 架构做基准。**SWE-bench Pro**（[arXiv:2509.16941](https://arxiv.org/abs/2509.16941)）有横跨 41 个仓库的 1865 个问题，涵盖商业应用、B2B 服务、开发者工具；前沿模型在 Pro 上得约 23%、而在 Verified 上 70%+——一记针对污染的现实检验。据报告，Claude Opus 4.7（2026 年 4 月）在 Pro 上以显式 agent 团队协调取得 **64.3%**（Anthropic 尚未发布一手来源——当作初步数据看待）；Verdent（agent 脚手架）在 Verified 上达到 **76.1% pass@1**（[Verdent 技术报告](https://www.verdent.ai/blog/swe-bench-verified-technical-report)）。**AAAI 2026 Bridge Program WMAC**（https://multiagents.org/2026/）是 2026 年的社区焦点。本课建立在 MARBLE 的指标之上，跑一遍拓扑对指标的扫描，并钉死「光通过 SWE-bench Verified 不是泛化的证据」这条规则。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** Phase 16 · 15（投票与辩论拓扑）、Phase 16 · 23（故障模式）
**预计时间：** ~75 分钟

## 问题背景

当一篇论文声称「我们的多 agent 系统更好」时，问题是：比什么好、在什么上好、怎么衡量？2023-2024 年的多 agent 评估时代是一片混乱——人人选自己的指标、自己的基线、自己的任务集。2025-2026 年的基准强加了结构。

没有共享基准，你没法有意义地比较两个多 agent 系统。更糟的是，没有留出（hold-out）基准，前沿模型会被污染。SWE-bench Verified 在 2025 年中已部分被训练语料污染；前沿分数虚高；Pro 被设计成一个未受污染的现实检验。

本课枚举 2026 年五个标准基准，说出每个衡量什么，并教你用怀疑的眼光读基准声称。

## 核心概念

### MultiAgentBench（MARBLE）—— ACL 2025

arXiv:2503.01935。在研究、编码、规划任务上评测四种协调拓扑（star、chain、tree、graph）。基于里程碑的 KPI 追踪部分进展，而不只是最终成功。

测得的结果：

- **Graph** 拓扑最适合研究场景；支持任意对任意的批判。
- **Chain** 最适合逐步精炼的编码。
- **Star** 最适合快答事实的整合。
- **协调税** 在 graph 上超过约 4 个 agent 后出现。
- **认知规划** 在各拓扑上带来约 3% 的里程碑达成提升。

何时用：你想把协调拓扑做苹果对苹果的比较。MARBLE 仓库（https://github.com/ulab-uiuc/MARBLE）提供了评估器。

### COMMA —— 多模态非对称信息

覆盖的任务里，agent 有不同的观测模态、必须在不完全共享信息的情况下协调。报告的结果令人不适：包括 GPT-4o 在内的前沿模型在 COMMA 的 agent-agent 协作上都难以打败**随机基线**。信号是：多 agent 模态训练不足、评估不足——LLM 处理单模态合作还行；多模态协调就崩了。

何时用：你的系统有多模态或非对称信息协调。COMMA 的零结果是一记警告：先测量，再声称。

### MedAgentBoard —— 领域压力测试

arXiv:2505.12371。四个医疗任务类别：诊断、治疗规划、报告生成、患者沟通。对比多 agent vs 单 LLM vs 传统基于规则的系统。

发现：在大多数类别上，多 agent 并不优于单 LLM。多 agent 优势很窄——当子任务清晰可分（诊断 + 治疗）时，任务拆解有帮助；当协调开销超过专精收益（报告生成）时，它有害。

何时用：你的领域有清晰的单 LLM 基线。如果 MedAgentBoard 的教训能泛化，许多被提出的多 agent 系统都过度工程了。

### AgentArch —— 企业架构

arXiv:2509.10769。把工具使用、记忆、orchestration 叠在一起的企业场景。基准隔离每一层的贡献：加工具帮多少？加记忆？加多 agent orchestration？

何时用：你在设计一套企业 agent 栈、需要为每一层辩护。AgentArch 帮你避免买那些你衡量不出价值的功能。

### SWE-bench Pro —— 现实检验

arXiv:2509.16941。横跨 41 个仓库的 1865 个问题，涵盖商业应用、B2B 服务、开发者工具。被设计成对更晚的训练截止日期**未受污染**。前沿模型在 Pro 上得约 23%、而在 Verified 上 70%+。这个差距就是污染信号。

2026 年 4 月分数：
- Claude Opus 4.7 在 Pro 上：**64.3%**（报告称用了显式 agent 团队协调；Anthropic 尚未发布一手来源——当作初步看待）。
- Verdent（agent 脚手架）在 Verified 上：**76.1% pass@1**（[技术报告](https://www.verdent.ai/blog/swe-bench-verified-technical-report)）。
- 前沿模型在 Pro 上不带 agent 脚手架的原始分数：约 23-35%（[SWE-bench Pro 论文](https://arxiv.org/abs/2509.16941)）。

要点：「我们打败了 SWE-bench Verified」不再是能力的证据。Pro 是当前的门禁测试。agent 团队脚手架在 Pro 上产生可测的提升（约 30-40 个点的增量），这是 2026 年支持多 agent 协调最有力的经验论据之一。

### AAAI 2026 WMAC

AAAI 2026 Bridge Program —— 多 agent 协调研讨会（Workshop on Multi-Agent Coordination，https://multiagents.org/2026/）。2026 年多 agent AI 研究的社区焦点。被接收的论文和研讨会会议录是评估新方法的标准场所；做生产决策时，相信 WMAC 接收的声称胜过 arXiv 预印本。

### 用怀疑的眼光读基准声称 —— 2026 检查清单

当有人声称一个多 agent 结果时：

1. **哪个基准、哪个 split？** SWE-bench Verified vs Pro 差别很大。报在错误 split 上的数字一文不值。
2. **污染检查。** 基准是在模型训练截止之后发布的吗？如果不是，谨慎对待。
3. **基线对比。** 对单 LLM 基线、对随机、对先前多 agent 工作。不是「对同一系统未调优的版本」。
4. **统计显著性。** N 次试验、p 值、置信区间。前沿模型方差大；单次运行会误导。
5. **任务多样性。** 一个任务还是多个？泛化对生产很重要。
6. **成本披露。** 每任务 token、墙钟时间。20 倍成本换来的 90% 解是个商业决策，不是能力声称。

### 哪些是所有基准都没好好衡量的

- **长视野协调。** 数天的墙钟交互。当前所有基准跑得都短。
- **对抗韧性。** 当一个 agent 恶意或被攻陷时会怎样？
- **部署下的漂移。** 基准是静态的；生产分布会变。
- **成本归一化的性能。** 大多数基准报告原始准确率，而非每美元准确率。

为你真正在意的那条轴构建自己的内部基准，往往才是正确的做法。

```figure
a5-bench-gap
```

## 动手构建

`code/main.py` 是一个非交互的演练：

- 在一个玩具任务上模拟 3 个多 agent 系统。
- 为每个计算 MARBLE 风格的里程碑指标。
- 通过从「训练」集里扣下任务来做污染检查。
- 显式地跟随机基线对比。
- 打印一张基准声称记分卡。

运行：

```bash
python3 code/main.py
```

预期输出：系统记分卡，含原始准确率、里程碑达成、每任务成本、相对随机基线的增量、以及一条污染检查备注。

## 实际使用

`outputs/skill-benchmark-reader.md` 读取任意多 agent 基准声称、套用审视清单。输出：一个评级和注意事项。

## 拿去用

生产评估纪律：

- **构建一个内部基准**，反映你实际的生产分布。公开基准提供参考但不能替代。
- **每次对比都含一个随机基线。** 如果你在一个协调任务上没法大幅打败随机，这任务可能本身就没立好。
- **成本和准确率一起报。** token 成本和墙钟时间。运维团队两个都要。
- **每季度重建基准。** 生产分布会变；陈旧基准误导。
- **避免对公开基准过拟合。** 如果你的团队专门为 SWE-bench Pro 的数字做优化，你会在生产上退步。

## 练习

1. 跑 `code/main.py`。指出三个模拟系统里哪个每里程碑成本最优。它跟原始准确率最高的那个系统是同一个吗？
2. 读 MultiAgentBench（arXiv:2503.01935）。为你自己的任务领域，判断 MARBLE 会推荐四种拓扑里的哪个。从论文的结果出发论证。
3. 读 SWE-bench Pro 论文。具体是什么让它抗污染？同样的技术能用到你在意的其他基准上吗？
4. 读 COMMA 关于多模态协调的发现。设计一个你能加进内部基准的简单多模态协调任务。什么算作有用的信号？
5. 把基准声称清单应用到最近一篇多 agent 论文的头条结果上。你会给这个声称什么评级？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| MARBLE | 「MultiAgentBench」 | ACL 2025；带里程碑 KPI 的 star/chain/tree/graph 拓扑。 |
| COMMA | 「多模态基准」 | 多模态非对称信息协调；前沿模型都难胜随机。 |
| MedAgentBoard | 「领域压力测试」 | 四个医疗类别；常发现多 agent 不优于单 LLM。 |
| AgentArch | 「企业基准」 | 工具 + 记忆 + orchestration 叠在一起。 |
| SWE-bench Pro | 「抗污染」 | 1865 个问题、41 个仓库；约 23% vs Verified 上 70%+（污染信号）。 |
| Milestone achievement | 「部分得分」 | 奖励进展、而非只奖励最终成功的基准。 |
| Contamination | 「基准泄进了训练」 | 发布后基准漂进训练语料；分数虚高。 |
| WMAC | 「AAAI 2026 Bridge Program」 | 多 agent 协调研讨会；社区焦点。 |

## 延伸阅读

- [MultiAgentBench / MARBLE](https://arxiv.org/abs/2503.01935) —— 带里程碑 KPI 的拓扑基准
- [MARBLE repository](https://github.com/ulab-uiuc/MARBLE) —— 参考实现
- [MedAgentBoard](https://arxiv.org/abs/2505.12371) —— 领域压力测试；多 agent 常不占优
- [AgentArch](https://arxiv.org/abs/2509.10769) —— 企业 agent 架构
- [SWE-bench leaderboards](https://www.swebench.com/) —— 前沿模型的 Verified 和 Pro 分数
- [AAAI 2026 WMAC](https://multiagents.org/2026/) —— 2026 年的社区焦点
