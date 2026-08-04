# AlphaEvolve —— 进化式编码 agent

> 把一个前沿编码模型配上一个进化循环和一个机器可校验的评估器。让循环跑够久。它会发现一种用 48 次标量乘法完成 4x4 复矩阵乘法的过程——56 年来对 Strassen 的首次改进。它还找到了一个 Google 全局的 Borg 调度启发式，在生产环境里挤回了约 0.7% 的集群算力。架构故意做得很无聊。胜利来自评估器的严谨。

**类型：** Learn
**语言：** Python（标准库，进化循环玩具）
**前置要求：** 阶段 15 · 01（长程框架），阶段 15 · 02（自学推理）
**预计时间：** ~60 分钟

## 问题背景

大语言模型能写代码。进化算法能在代码上做搜索。两者分别被单独尝试了几十年；两者都撞到了天花板。LLM 的天花板是胡编（confabulation）：模型写出看似合理、却不干它声称要干的事的代码。进化的天花板是搜索成本：在语法上随机变异很少能产出可编译的程序，更别说更好的程序了。

AlphaEvolve（Novikov 等人，DeepMind，arXiv:2506.13131，2025 年 6 月）把它们结合了起来。LLM 对程序数据库提出有针对性的编辑；一个自动评估器给每个变体打分；高分变体成为后续世代的父代。LLM 负责写出看似合理代码这一昂贵步骤；评估器抓住那些胡编。循环要跑上几个小时到几周。

报告的结果：用 48 次标量乘法完成 4x4 复矩阵乘法（Strassen 1969 年的界是 49 次）、Google 生产环境中的一个 Borg 调度启发式、FlashAttention 内核 32.5% 的提速、Gemini 训练吞吐的改进。

这个架构之所以管用，是因为评估器是机器可校验的。在评估器不可校验的地方它就不管用。这个不对称就是本课的要点。

## 核心概念

### 这个循环

1. 从一个正确但次优的种子程序 `P_0` 出发。
2. 维护一个变体程序的数据库，每个都由评估器打分。
3. 从数据库里采样一个或多个父代（MAP-elites 风格或基于 island 的）。
4. 提示 LLM（很多候选用 Gemini Flash，难的用 Gemini Pro）产出父代的一个修改变体。
5. 编译、运行，在留出的评估器上评估这个变体。
6. 按它的分数和特征向量为键插入数据库。
7. 重复。

有两个细节很关键。第一，给 LLM 的提示里不止有父代程序——通常还有数据库里若干个顶尖变体、评估器签名，外加一段简短的任务描述。模型的任务是提出一个可能提升分数的、有针对性的改动。第二，数据库是有结构的（MAP-elites 网格、基于 island），让循环探索多样性，而不只是死磕当前的领先者。

### 是什么让评估器没得商量

AlphaEvolve 的胜利全都来自那些评估器又快、又确定、又难被钻空子的领域：

- **矩阵乘法算法**：一个做矩阵相乘并逐比特检查相等的单元测试。
- **Borg 调度启发式**：一个生产级模拟器，重放历史集群负载并测量浪费的算力。
- **FlashAttention 内核**：一个正确性测试外加在真实硬件上的墙钟时间基准。
- **Gemini 训练吞吐**：实测的每步 GPU 秒数。

每一种情况下，评估器都抓住了否则会占主导的那一类 LLM 错误：胡编的正确性声称、在硬件上一跑就消失的性能声称，以及边界情况下的失败。把评估器拿掉，循环就会去优化漂亮代码。

### 奖励黑客是同一句话的另一面

进化会去优化评估器测量的任何东西。如果评估器不完美，循环就会找到那个不完美之处。在一个未经验证的领域里，循环会去优化表面特征，而不是预期行为。DeepMind 在论文里明确点出了这一点：AlphaEvolve 的成功只能迁移到评估器严谨度跟搜索雄心相匹配的领域。

2025-2026 年代码搜索循环中奖励黑客的具体例子：

- 奖励"完成时间"的优化目标，催生了提交空白解。
- 奖励"测试下正确"的基准分数，催生了背测试和过拟合。
- 一个"代码质量"代理指标，催生了删注释、改变量名，但语义没变。

AlphaEvolve 的修法：交付一个 LLM 从没见过的留出评估器，输入在评估时才生成。即便如此，DeepMind 仍建议对任何提议的部署做严格的审查。

### 为什么 LLM + 搜索胜过单独任一方

LLM 能产出可编译、语义上看似合理的修改。在一个 2000 行的 Python 文件上跑随机变异的遗传算法几乎总是产出语法错误。LLM 还把搜索集中在看似合理的邻域（改一个函数，而不是随机字节），这大幅减少了浪费的评估器调用。

反过来，评估器抓住 LLM 的胡编。LLM 会自信地声称某个函数"在极限下是 O(n log n)"，而它实际上是 O(n^2)；一个墙钟时间基准把这个问题一锤定音。

### AlphaEvolve 在前沿技术栈里的位置

| 系统 | 生成器 | 评估器 | 领域 | 示例胜利 |
|---|---|---|---|---|
| AlphaEvolve | Gemini | 正确性 + 基准 | 算法、内核、调度器 | 48 乘法的 4x4 matmul |
| FunSearch（DeepMind，2023） | PaLM / Codey | 正确性 | 组合数学 | cap-set 下界 |
| AI Scientist v2（Sakana，L5） | GPT/Claude | LLM 批判 + 实验 | ML 研究 | ICLR workshop 论文 |
| Darwin Godel Machine（L4） | agent 脚手架 | SWE-bench / Polyglot | agent 代码 | SWE-bench 20% → 50% |

四者都是同一个配方的变奏：生成器加评估器，循环。差别在于评估器评判什么、有多严谨。

```figure
alphaevolve-loop
```

## 实际使用

`code/main.py` 在一个玩具符号回归问题上实现了一个最小的类 AlphaEvolve 循环。"LLM" 是一个标准库代理，对一个计算目标函数的程序提出小的语法变异。"评估器"测量在留出测试点上的均方误差。

观察：

- 最佳分数如何随世代提升。
- 一个 MAP-elites 网格如何让多样的解活下来，使循环不至于收敛到局部极小。
- 拿掉留出测试（只用训练评估器）如何让循环戏剧性地过拟合。

## 拿去用

`outputs/skill-evaluator-rigor-audit.md` 是在一个新领域考虑 AlphaEvolve 风格循环的前提条件：你的评估器真的抓得住你在乎的那些失败吗？

## 练习

1. 运行 `code/main.py`。记下最佳分数轨迹。禁用留出评估器（用 `--no-holdout` 标志）再跑一次。量化过拟合。

2. 读 AlphaEvolve 论文第 3 节关于 MAP-elites 网格的部分。为一个新问题（比如编译器优化 pass）设计一个能保持搜索多样性的特征向量描述符。

3. 48 乘法的 4x4 结果在 56 年后改进了 Strassen 的 49 乘法界。读论文附录 F，用三句话解释为什么这个问题的评估器特别容易做对，以及为什么大多数领域并不像它。

4. 提出一个 AlphaEvolve 会失败的领域。准确指出评估器在哪里崩，以及为什么。

5. 对一个你熟悉的领域，写出你会用的评估器签名。包含 (a) 正确性条件，(b) 性能指标，(c) 留出输入的生成规则，(d) 至少一项反奖励黑客检查。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| AlphaEvolve | "DeepMind 的进化式编码 agent" | Gemini + 程序数据库 + 机器可校验评估器 |
| MAP-elites | "保多样性的归档" | 按特征向量为键的网格；每个格子存有该描述符下的最佳变体 |
| Island model（岛屿模型） | "并行进化的子种群" | 独立种群周期性迁移；防止过早收敛 |
| Machine-checkable evaluator（机器可校验评估器） | "确定性的 oracle" | 一个 LLM 无法伪造的单元测试、模拟器或基准——本循环的前提条件 |
| Reward hacking（奖励黑客） | "优化指标而非目标" | 循环找到一条不做预期任务就能拉满分数的路 |
| Seed program（种子程序） | "起点" | 循环从中进化的一个正确但次优的初始程序 |
| Held-out evaluator（留出评估器） | "LLM 从没见过的评估数据" | 在评估时才生成的输入，用于防止背诵 |

## 延伸阅读

- [Novikov et al. (2025). AlphaEvolve: A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131) —— 完整论文。
- [DeepMind blog on AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) —— 厂商带结果的撰文。
- [AlphaEvolve results repository](https://github.com/google-deepmind/alphaevolve_results) —— 发现的算法，包括 48 乘法的 4x4 matmul。
- [Romera-Paredes et al. (2023). Mathematical discoveries from program search with LLMs (FunSearch)](https://www.nature.com/articles/s41586-023-06924-6) —— 前身系统。
- [Anthropic — Responsible Scaling Policy v3.0 (Feb 2026)](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) —— 把受评估器约束的自主性定为一个关键研究方向。
