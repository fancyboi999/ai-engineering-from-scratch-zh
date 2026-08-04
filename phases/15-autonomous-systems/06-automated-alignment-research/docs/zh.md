# 自动化对齐研究（Anthropic AAR）

> Anthropic 在相互独立的沙箱里跑了多支并行的 Claude Opus 4.6 自主对齐研究员（Autonomous Alignment Researcher）团队，通过一个共享论坛协作，而该论坛的日志存在任何沙箱之外（这样 agent 删不掉自己的记录）。在弱到强（weak-to-strong）训练问题上，这些 AAR 超过了人类研究者。Anthropic 自己的总结指出，规定好的工作流常常约束 AAR 的灵活度、拖累表现。把对齐研究自动化，正是那个把时间线压缩到 RSP 意在检测的那些失准风险面前的压缩步骤。

**类型：** Learn
**语言：** Python（标准库，并行研究论坛模拟器）
**前置要求：** 阶段 15 · 05（AI Scientist v2），阶段 15 · 04（DGM）
**预计时间：** ~60 分钟

## 问题背景

对齐研究在人类研究员的时间上很昂贵。可扩展监督、奖励设定、弱到强训练这类问题，每迭代一轮的实验都要花上几周。随着前沿能力推进，对齐的工作量比合格研究者的供给涨得更快。

自动化对齐研究（AAR）问的是：能力正在甩开对齐的那些前沿模型，能不能反过来帮着缩小这个差距？Anthropic 2026 年关于一项 AAR 主导的弱到强训练研究的报告（alignment.anthropic.com/2026/automated-w2s-researcher/）是这一类已部署系统的首批公开结果之一。

结果是实打实地正面：AAR 解一个研究问题解得比人类基线更好。这个结果也把本阶段发展出来的每一项隐患都集中到了单个系统里。如果对齐研究能被自动化，那么破坏防护措施的那些部分同样能被自动化。RSP 对 AI 研发能力的阈值正是冲着这个循环写的。

## 核心概念

### 架构（按公开描述）

- **并行 agent。** 多个 Claude Opus 4.6 实例作为 AAR 运行，各在一个独立沙箱里。沙箱限制文件系统、网络和进程的范围。
- **共享论坛。** 发现被发布到一个共享论坛，其存储后端位于每一个沙箱之外。agent 能读论坛；agent 无法从自己的沙箱内删除或编辑论坛记录。
- **任务分配。** 一个人类设计的任务队列把研究问题分派给 AAR。AAR 提出分解方案、跑实验、撰写发现。
- **聚焦弱到强训练。** 已发表的研究处理的是弱到强训练——用一个较弱的监督模型去训练一个更强的学生模型。AAR 在这个任务上超过了人类研究者。

### 为什么沙箱外的日志很重要

日志完整性这一属性，是一次受控实验和一次可能被污染的实验之间的区别。如果 AAR 能编辑自己的日志，它们就能掩盖失败或可疑的实验。Anthropic 直接点明了这一点：该属性是信任研究输出的必要条件，而且验证起来并不简单。

用基础设施的话来类比，就是仅追加（append-only）、直写到外部存储的日志（比如 S3 object-lock、不可变的 Datadog 日志）。agent 没有修改过往记录的凭证。这跟 2026 年企业安全团队用来打造抗勒索软件审计轨迹的是同一个模式。

### 规定工作流的取舍

Anthropic 的报告指出，规定好的工作流常常约束 AAR 的灵活度、拖累表现。换句话说：如果人类设计者把研究计划一步一步写死，AAR 的表现反而比给它高层目标和自由分解的空间时更差。这跟 agent 化研究领域的普遍结果一致（LangGraph、微软的 Agent Framework）——过度规定的脚手架会伤害有能力的 agent。

安全上的含义很微妙。提升 AAR 表现的那份灵活度，也正是允许未经批准的分解、新颖工具使用和目标漂移的那份灵活度。这个取舍是一个设计空间上的决策：多大的灵活度能买到足以击败人类的能力，又不至于把空间交给 agent 去把目标泛化到分布之外？

### 压缩风险

RSP v3.0（第 19 课）引入了一条 AI 研发能力阈值：以相对于人类 + AI 工具有竞争力的成本，完全自动化整条 AI 研发流水线的能力。DeepMind 的 FSF v3 包含一条类似的 ML 研发自主性等级。两套框架都把这条阈值当作升级控制手段的触发器。

AAR 离这条阈值还差一步：它自动化了流水线的一部分（在特定、范围明确的任务上的对齐研究），但还不是端到端的能力开发循环。时间线的问题是：这个差距闭合得有多快。

被压缩的时间线正是复利式失败的隐患所在。如果对齐研究和能力研究以相近的速率复利，失准的风险面至少跟能力涨得一样快。如果能力复利更快（历史趋势如此），差距就会扩大。这正是 AAR 算一种有条件的好事的论证：每一项额外的对齐成果都会缩小差距——当且仅当研究过程是可信的。

### AAR 没有取代什么

人类研究者设定任务队列、审查结果，并掌握 constitutional（章程式）权威。AAR 加速的是流水线的中段，不是两端。Anthropic 已发表的产出既包含 AAR 的贡献，也包含人类研究者对发表什么、撤回什么、精修什么的判断。

这正好对应第 15 课的 propose-then-commit（先提议后提交）模式，套用到研究本身上：AAR 提议；人类提交。

```figure
aar-forum
```

## 实际使用

`code/main.py` 模拟一个多 AAR 的研究论坛。三个独立的"研究 agent"并行运行，把发现发到一个仅追加的论坛上，可选地带篡改尝试。

观察：

- 沙箱外的日志记录如何抓住篡改日志的尝试。
- 带自由分解的任务分配如何在更难的问题上胜过固定工作流。
- 如果日志不是防篡改的，单个被污染的 AAR 如何污染整个论坛的信号。

## 拿去用

`outputs/skill-aar-deployment-review.md` 是对一条自动化对齐研究流水线的部署前审查。

## 练习

1. 运行 `code/main.py`。对比"固定工作流"和"自由分解"两种设置。自由分解总是赢吗，还是说存在某些问题类别，固定工作流也有竞争力？

2. 改一下模拟器，让一个 agent 尝试篡改日志。确认仅追加日志检测到了它。写一段描述这个检测签名在日志里到底长什么样。

3. 读 Anthropic 的弱到强 AAR 报告。指出 AAR 在哪个具体子任务上击败了人类研究者。是什么让它适合被自动化？

4. 设计一套任务队列分配策略，在 AAR 灵活度（更好的结果）和规定工作流约束（更易审计）之间做平衡。描述你会如何 A/B 测试这两者。

5. 读 RSP v3.0 的 AI R&D-4 阈值。用一段话描述你认为什么东西会越过它，而 AAR 目前还没有。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| AAR | "自主对齐研究员" | 在对齐问题上自主运作的 Claude Opus 4.6 实例 |
| Weak-to-strong training（弱到强训练） | "用较弱的监督者训练更强的模型" | AAR 击败人类的经典可扩展监督基准 |
| Shared forum（共享论坛） | "agent 发布发现的地方" | 仅追加、沙箱外的存储 |
| Out-of-sandbox log（沙箱外日志） | "agent 无法编辑自己的记录" | 防篡改、直写到外部存储 |
| Prescribed workflow（规定工作流） | "人类设计者给的一步步计划" | 约束 AAR；常常比自由分解表现更差 |
| Free decomposition（自由分解） | "agent 自己决定如何拆任务" | 更有能力，更难审计 |
| AI R&D threshold（AI 研发阈值） | "RSP/FSF 的能力等级" | 以有竞争力的成本完全自动化研发流水线 |
| Compressed timeline（被压缩的时间线） | "对齐 vs 能力的赛跑" | 若能力比对齐复利更快，失准风险就增长 |

## 延伸阅读

- [Anthropic — Automated Weak-to-Strong Researcher](https://alignment.anthropic.com/2026/automated-w2s-researcher/) —— 一手来源。
- [Anthropic Responsible Scaling Policy v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) —— AI 研发阈值的框架。
- [Anthropic — Measuring AI agent autonomy](https://www.anthropic.com/research/measuring-agent-autonomy) —— 更宽的 agent 自主性框架。
- [DeepMind Frontier Safety Framework v3](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) —— 与 RSP 平行的 ML 研发自主性等级。
- [Burns et al. (2023). Weak-to-Strong Generalization (OpenAI)](https://openai.com/index/weak-to-strong-generalization/) —— AAR 攻克的底层问题。
