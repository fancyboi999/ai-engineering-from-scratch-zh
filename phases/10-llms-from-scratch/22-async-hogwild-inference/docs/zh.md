# 异步与 Hogwild! 推理

> 推测解码（阶段 10 · 15）在一条序列内并行化 token。多 agent 框架跨整条序列并行，但强制显式协调（投票、子任务切分）。Hogwild! Inference（Rodionov et al., arXiv:2504.06261）做的是别的：让同一个 LLM 的 N 个实例并行地针对一个共享的 KV cache 运行。每个 worker 即时看到其他每个 worker 生成的 token。现代推理模型——QwQ、DeepSeek-R1——能经那个共享 cache 自我协调，不用任何微调。这个方法是实验性的，但它打开了一条全新的推理并行轴，和推测解码正交。本节课用 stdlib Python 实现一个两 worker 的 Hogwild! 模拟器，并解释为什么共享 cache 的协作从现有模型的推理能力里涌现。

**类型：** Build
**语言：** Python（stdlib）
**前置要求：** 阶段 10 · 12（推理优化），阶段 10 · 15（推测解码）
**预计时间：** ~60 分钟

## 学习目标

- 描述三种常见的并行 LLM 拓扑（投票、子任务、Hogwild!），并说出每种针对哪些问题。
- 陈述 Hogwild! 的核心设置：多个 worker、一个共享 KV cache、经自我 prompt 涌现的协调。
- 把 Hogwild! 的墙钟加速算成 worker 数 `N`、任务级并行度 `p` 和协调开销 `c` 的函数。
- 在一个玩具问题上实现一个两 worker 的 Hogwild! 模拟器，观察涌现的任务分工。

## 问题背景

现代 LLM 靠产出长推理链来解难题——5000 个 token 的逐步逻辑很常见，深度数学问题上会出现数万个 token。在 70B 模型 35 token/秒 decode 下，5 万 token 是 24 分钟。这模型不交互。

推测解码（阶段 10 · 15）通过在一条序列内并行化让你提速 3-5 倍。再往后，自回归解码的顺序依赖是硬天花板。每个新 token 依赖之前每个 token。

显而易见的问题：我们能跨序列并行吗？在同一个问题上跑同一个模型的多个副本，让它们合作、分工？

此前的工作：投票集成（跑 N 个模型，选多数答案）、tree-of-thought（分支推理路径并重组）、多 agent 框架（给每个 agent 分一个子任务，用一个协调者）。这些都在特定任务领域有帮助。它们也都引入了显式协调机制——投票规则、分支剪枝逻辑、agent 间消息协议。

Hogwild! Inference 走另一条路。N 个 worker 共享一个 KV cache。每个 worker 立刻看到其他每个 worker 生成的 token，就像那是它自己的上下文。这些 worker——不用任何训练或微调——自己搞清楚怎么分工。现代推理模型（QwQ、DeepSeek-R1、Claude 家族推理模式）能读共享 cache，说出像 "我看到 worker 2 已经处理了基线情况，所以我来做归纳步骤" 这样的话。

加速取决于工作负载，截至 2026 年 4 月是实验性的。但这个想法值得知道，因为它打开了一条新的推理并行轴。

## 核心概念

### 设置

初始化 N 个 worker 进程，全跑同一个 LLM。不用每 worker 的 KV cache，而是维护 *一个* 共享 cache。当 worker `i` 生成 token `t_j`，这个 token 被写进共享 cache 的下一个位置。当 worker `k` 走下一步，它读 cache 的当前状态（包含所有 N 个 worker 到目前生成的一切）。

步进时，worker 们竞相写 token。没有每 worker 的位置索引——cache 是单条增长的序列。顺序由写入到达时间决定。

### 为什么协调会涌现

worker 们共享一个 prompt。通常是像 "你是 N 个一起做这个问题的实例之一。每个实例读共享内存，能看到其他实例写了什么。避免重复工作" 这样。prompt 加共享 cache 就够了。推理模型读 cache，注意到问题的哪些部分已经被尝试过，并（往往但不总是）转向未探索的部分。

Hogwild! 论文（Rodionov et al., 2025）报告了像这样的观察：

- worker 们制定计划并经 cache 传达给其他 worker。
- worker 们注意到其他 worker 推理里的错误并指出来。
- worker 们在一个计划失败时适应并提出替代方案。
- 被提示检查冗余时，worker 们检测到它并转向。

这些都不需要微调。涌现的行为来自模型已有的推理能力。

### 命名

论文的名字玩了 Hogwild! SGD（Recht et al., 2011）的梗，那是个异步更新优化器。类比是：SGD 的异步 worker 全写到一个共享参数向量；Hogwild! Inference 的 worker 全写到一个共享 KV cache。两者都依赖经验收敛而非同步保证。

### RoPE 让这变得可行

旋转位置编码（RoPE，Su et al. 2021）经 Q 和 K 向量里的旋转编码位置信息。因为位置是旋转而不是烤死的偏移，一个 token 的位置能移动而不用重算 KV cache 条目。当 worker `i` 写进共享 cache 的位置 `p`，其他读那个位置的 worker 能直接用缓存条目——不需要重新旋转。

在一个学习式位置或绝对位置模型里，Hogwild! 会需要在每次并发写时让缓存失效。RoPE 让缓存保持稳定。

### 墙钟数学

设 `T_serial` 是一个 worker 独自解决问题的时间。设 `p` 是任务级可并行比例。设 `c` 是每步协调开销（读扩展的 cache、决定写什么）。

单 worker 时间：`T_serial`。
N worker Hogwild! 时间，如果协调免费：`T_serial * ((1 - p) + p / N)`。经典阿姆达尔。
带协调开销：`T_serial * ((1 - p) + p / N) + c * steps_per_worker`。

要让一个 worker 高效，`c` 必须相对每步 decode 时间很小。在产出 5k+ token 的推理模型上，worker 们能承受几百个 token 的协调开销还占上风。在短聊天任务上，协调主导，Hogwild! 比串行更糟。

### 具体例子

推理问题：1 万 token 的思维链。假设问题有 `p = 0.7` 的可并行内容（不同证明策略、不同情况分析），每 worker `c = 200` 个 token 的协调开销。用 `N = 4` 个 worker：

- 串行时间：10000 个 decode 步骤。
- Hogwild! 时间：10000 * (0.3 + 0.7 / 4) + 200 * 4 = 10000 * 0.475 + 800 = 5550 个 decode 步骤。
- 加速：10000 / 5550 = 1.8 倍。

那是适度的。但在更长的推理问题（5 万 token）上，协调开销摊薄了，加速逼近 2.5-3 倍。Hogwild! 是推理界的线程级并行，相当于一门让你自然写多线程代码的语言。

### 什么时候上 Hogwild!

- 任务能跨独立子目标并行化的长推理问题（数千 token）。
- 被训练成逐步思考的推理模型。非推理模型自我协调得不好。
- 有足够显存装下共享 cache 加 N 个 worker 进程的单节点部署。cache 共享，但每个 worker 有自己的激活内存。

### 什么时候不上

- 短交互式聊天。协调开销主导。
- 不能并行化的任务（单条线性证明、单次编译）。N=1 是上限。
- 非推理模型。没有协调涌现。
- 多节点部署。共享 cache 需要非常快的跨 worker 同步。节点内没问题；跨节点是延迟灾难。

### 实验状态

截至 2026 年 4 月，Hogwild! 是一个带开源 PyTorch 实现的研究方法。生产采用还没发生。三个拦路虎：

1. 跨并发进程的共享 KV cache 管理是非平凡的工程。
2. 涌现的协调是任务相关的；基准还在建。
3. 相比推测解码已经交付的，加速适度，两者能结合但结合的工程是另一层。

值得知道。值得实验。还不值得拿一个产品去赌。

```figure
continuous-batching
```

## 动手构建

`code/main.py` 实现一个玩具 Hogwild! 模拟器：

- 两个 worker 进程，每个是个确定性的 "LLM"，以已知概率产出几个 token 类别之一（work-token、observe-token、coordinate-token）。
- 一个共享 cache（就是个 token 列表），两个 worker 都读写。
- 一个简单的协调逻辑：当一个 worker 看到另一个已经在某个类别产出了足够的 work token，它就挑一个不同的类别。

模拟器跑一个固定的步数预算并报告：

- 产出的 work-token 总数。
- 总墙钟时间（worker 步数）。
- 相比单 worker 的有效加速。
- 哪个 worker 写了哪个 token 的轨迹。

### 第 1 步：共享 cache

一个两个 worker 都往里 append 的列表。真实实现里用简单的锁（Python `threading.Lock`）；我们用一个计数器模拟。

### 第 2 步：worker 循环

每个 worker，每一步：

- 读当前共享 cache。
- 根据已有的内容决定写什么类别的 token。
- 写一个 token。

### 第 3 步：协调启发式

如果类别 X 在 cache 里已经有 K 个 token、而 worker 打算写的类别是 X，worker 切换到类别 Y。这是推理模型 "注意到这已经覆盖了，改做别的" 行为的一个玩具替身。

### 第 4 步：实测加速

用 N=1 个 worker 和 N=2 个 worker 各跑模拟器，相同的总步数预算。数产出的 work-token。N=2 应该因协调驱动的任务分工产出大约 1.5-1.8 倍多的 work-token。

### 第 5 步：压测协调

降低协调启发式的敏感度。再跑。观察到没有好的协调，N=2 冗余地产出相同的 token，加速掉到 1 以下。这匹配论文的观察：这个诀窍只有在 worker 有推理能力自我协调时才起作用。

## 实际使用

截至 2026 年 4 月，Hogwild! 在生产里的集成是研究级的。Yandex/HSE/IST 的参考实现基于 PyTorch，针对 DeepSeek-R1 和 QwQ 模型的单节点多进程设置。

务实的采用路径：

1. 给你的推理任务工作负载做剖析。测量探索性（多策略、情况分析、搜索）token 对线性 token 的比例。
2. 如果探索主导，跑一个两 worker 的 Hogwild! 实验。测量墙钟改善。
3. 如果改善低于 1.3 倍，你在协调主导的区间。回退到单 worker。
4. 如果改善超过 1.5 倍，推到 N=4 再测。收益递减通常在 N=4-8 附近撞上。

和推测解码结合：每个 Hogwild! worker 能独立用 spec decode。两个加速（大致）相乘，把 3 倍 spec decode 和 1.8 倍 Hogwild! 带到相比朴素单 worker 解码的有效 5.4 倍。

## 拿去用

本节课产出 `outputs/skill-parallel-inference-router.md`。给定一个推理工作负载画像（token 预算、任务并行画像、模型家族、部署目标），它在投票、tree-of-thought、多 agent、Hogwild! 和推测解码策略之间路由。

## 练习

1. 用默认设置跑 `code/main.py`。确认 N=2 的 Hogwild! 配置在相同墙钟时间里产出比 N=1 基线更多的 work-token。

2. 降低协调启发式的强度（设 `coordination_weight=0.1`）。重跑。展示加速崩溃。解释为什么：worker 们在不能协调时重复劳动。

3. 为一个 5 万 token 的推理任务（`p=0.8, c=500`，N=4 个 worker）计算预期 Hogwild! 加速。对一个 1k token 的聊天任务（`p=0.3, c=200`，N=4）做同样的事。为什么一个是赢、一个是输？

4. 读 Hogwild! 论文第 4 节（初步评估）。识别作者报告的两个失败模式。描述更好的协调 prompt 可能如何缓解每一个。

5. 在玩具里把 Hogwild! 和推测解码结合：每个 worker 内部用一个 2-token 的 spec-decode。报告乘性加速。当两个 worker 都想扩展同一个共享 cache 前缀时，会出现什么记账问题？

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Hogwild! | "并行 worker，共享 cache" | 同一个 LLM 的 N 个实例并发运行、共享一个 KV cache；经自我 prompt 涌现协调 |
| 共享 KV cache | "协调媒介" | 一个所有 worker 都读写的增长 KV 缓冲；让 token 在 worker 间即时可见 |
| 涌现协调 | "不需要训练" | 有推理能力的 LLM 能读共享 cache 并分工，不用任何微调或显式协议 |
| 协调开销（c） | "花在定位上的 token" | 每 worker 读扩展 cache、决定做什么的成本；必须相对总 decode 时间保持小 |
| 可并行比例（p） | "什么能并行跑" | 任务级并行：总工作里非本质顺序的那部分 |
| RoPE 使 Hogwild! 可行 | "旋转位置位移不变" | 因为位置是旋转，写进共享 cache 不需要重算之前的 token |
| 投票集成 | "跑 N 个，选多数" | 最简单的并行推理拓扑；对分类有用，对长篇推理较少 |
| Tree of thought | "分支和剪枝" | 探索多个分支并剪枝的推理策略；显式协调逻辑 |
| 多 agent 框架 | "分配子任务" | 每个 agent 拿一个角色；一个协调者编排；重协议开销 |

## 延伸阅读

- [Rodionov et al. — Hogwild! Inference: Parallel LLM Generation via Concurrent Attention (arXiv:2504.06261)](https://arxiv.org/abs/2504.06261) — Hogwild! 论文，在 QwQ 和 DeepSeek-R1 上的初步评估
- [Recht, Re, Wright, Niu — Hogwild!: A Lock-Free Approach to Parallelizing Stochastic Gradient Descent (arXiv:1106.5730, NeurIPS 2011)](https://arxiv.org/abs/1106.5730) — 最初的 Hogwild!，命名起源
- [Su et al. — RoFormer: Enhanced Transformer with Rotary Position Embedding (arXiv:2104.09864)](https://arxiv.org/abs/2104.09864) — RoPE，让共享 cache 推理可行的性质
- [Yao et al. — Tree of Thoughts: Deliberate Problem Solving with Large Language Models (arXiv:2305.10601)](https://arxiv.org/abs/2305.10601) — Hogwild! 与之正交的 tree-of-thought 推理策略
- [Leviathan et al. — Fast Inference from Transformers via Speculative Decoding (arXiv:2211.17192)](https://arxiv.org/abs/2211.17192) — 推测解码，Hogwild! 与之组合的序列内并行
- [Hogwild! reference PyTorch implementation](https://github.com/eqimp/hogwild_llm) — 论文实验的唯一真相来源
