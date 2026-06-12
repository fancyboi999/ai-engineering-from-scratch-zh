# Jamba —— 混合 SSM-Transformer

> 状态空间模型（SSM）和 transformer 想要不同的东西。Transformer 以二次成本的注意力换质量。SSM 以一个递归换线性时间推理和恒定内存，但质量落后。AI21 的 Jamba（2024 年 3 月）和 Jamba 1.5（2024 年 8 月）把它们放进同一个模型：每 7 个 Mamba 层配 1 个 Transformer 层，每隔一个块用 MoE，以及一个能塞进单张 80GB GPU 的 256k context 窗口。Mamba-3（ICLR 2026）用复值状态空间和 MIMO 投影收紧了 SSM 那一侧。本节课端到端读两个架构，并解释为什么混合配方在纯 SSM 和纯 Transformer 的长 context 尝试都没撑住时，挺过了三年的规模化。

**类型：** Learn
**语言：** Python（stdlib，层混合计算器）
**前置要求：** 阶段 10 · 14（开放模型架构），阶段 10 · 17（原生稀疏注意力）
**预计时间：** ~60 分钟

## 学习目标

- 解释一个 Jamba 块里的三种原语——Transformer 层、Mamba 层、MoE——以及 1:7:隔一交错的配方。
- 高层陈述一个 SSM 的递归长什么样，以及为什么它能实现恒定内存推理。
- 计算一个 Jamba 模型在 256k context 下的 KV cache 占用，和一个纯 Transformer 模型会需要的相比。
- 说出三个 Mamba-3 创新（指数-梯形离散化、复值状态更新、MIMO）以及每个针对的问题。

## 问题背景

注意力对序列长度是二次的。状态空间模型是线性的。这个差异复合：在 256k token 下，一张 Transformer 注意力图每头 650 亿个条目；一个 SSM 的递归状态不管序列多长都是定长的。

纯 SSM 模型（Mamba、Mamba-2）在小规模匹配 Transformer 困惑度，但在状态追踪任务上落后，并在某些类别的 in-context 检索上失败。直觉是：SSM 把历史压进一个定长状态，历史长时信息泄漏。注意力精确地记住一切，但付二次成本。

显而易见的修法：两个都用。把 Transformer 层放在精确召回要紧的地方。其他地方用 SSM 层。调比例。Jamba 是第一个大规模发布这套混合配方的生产级模型（总 52B，激活 12B，256k context，单张 80GB GPU）。Jamba 1.5 把家族扩到总 398B / 激活 94B。Mamba-3（ICLR 2026）是当前最好的纯 SSM 基线，混合模型可以围绕它重建。

本节课读这三篇论文，产出 "挑对比例" 的心智模型。

## 核心概念

### 一页讲完 SSM

一个状态空间模型经一个定长状态 `h` 处理序列 `x_1, ..., x_N`：

```
h_t = A h_{t-1} + B x_t
y_t = C h_t
```

每一步状态经一个线性动力学 `A` 演化，吃输入 `B x_t`，发出输出 `C h_t`。`A, B, C` 可以是学来的。注意那个关键性质：计算 `y_t` 只需要 `h_{t-1}` 和 `x_t`，不需要任何更早的 `x`。内存恒定。推理每 token O(1)。

建模质量的诀窍在 `A` 的结构。S4（Gu 2021）用了一个高度结构化的矩阵，训练时能作为长卷积高效求值。Mamba（Gu, Dao 2023）把固定的 `A, B, C` 换成数据相关的（那个 "选择性" 部分）。Mamba-2（2024）进一步简化了结构。Mamba-3（2026）在特定地方重新加回复杂性。

关键性质：对一个解码器 LLM，一个 SSM 层是注意力层的直接替代品，用定长的每层状态而不是增长的 KV cache。

### Jamba 块

一个 Jamba 块按两个数字交错层：

- `l`：注意力对 Mamba 的比例。Jamba 用 `l = 8`，意思是每 7 个 Mamba 层配 1 个 Transformer 层（每组 7 个 Mamba + 1 个 Attention = 8 层）。
- `e`：MoE 频率。Jamba 用 `e = 2`，意思是每隔一层应用 MoE。

一个块内的层序列：

```
M  M  M  M  M  M  M  A    (7 Mamba + 1 Attention)
|  M  |  M  |  M  |  M    (| 标记应用了 MoE 的地方)
```

每个 Jamba 块是 8 层。4 块深（共 32 层）时，你得到 28 个 Mamba 和 4 个 Attention 层。其中 16 个用 MoE。

### 为什么是 1:7 比例

AI21 跑了消融：什么样的注意力对 Mamba 比例在他们的长 context eval 上给出最佳的每参数困惑度 *和* in-context 召回？

- 注意力太多（1:1）：质量上升但内存和速度退化。
- 注意力太少（1:15）：内存极好但 in-context 检索失败。
- 甜点区：1:7 或 1:8。

直觉是：Transformer 层处理精确召回和状态追踪。Mamba 层处理廉价的大宗处理。

### 位置编码

Mamba 层本身就感知位置（经递归）。最初基于 Mamba 的混合里的注意力层不用 RoPE——SSM 层提供位置信息。Jamba 1.5 给注意力层加了 RoPE 以做更长 context 的泛化，这是基于经验长 context 评估的事后改进。

### 内存预算

对一个 Jamba-1 形状（32 层：28 Mamba + 4 Attention，hidden 4096，32 个注意力头）：

- KV cache（仅注意力层）：256k BF16 下 `2 * 4 * 32 * 128 * 256k * 2 = 8.4 GB`。只有那 4 个注意力层有贡献。
- SSM 状态：每 token 前缀 `28 * hidden * state_size`，但这是每层定长的，不随序列长度增长。典型 Mamba 状态每特征 16、hidden 4096：总共 `28 * 4096 * 16 * 2 = 3.7 MB`。

和一个 32 层、相同 hidden、32 头全 MHA 的纯 Transformer 对比：256k BF16 下 `2 * 32 * 32 * 128 * 256k * 2 = 128 GB`。KV cache 减少 8 倍。即便对比大多数 2024 年模型用的 GQA(8) 基线（`2 * 32 * 8 * 128 * 256k * 2 = 32 GB`），Jamba 的 1:7 混合在 16 GB 仍小 2 倍。

这就是 AI21 说的 "256k context 在单张 80GB GPU 上"。一个全 MHA 纯 Transformer 的 KV cache 装不下；即使 GQA 基线也不给权重和激活留空间；Jamba 的能装下。

### Mamba-3：2026 年的纯 SSM 基线

Mamba-3（ICLR 2026，arXiv:2603.15569）在纯 SSM 那一侧引入三个创新：

1. **指数-梯形离散化。** 用一个更有表达力的递归替换 Mamba-2 里的欧拉法离散化。在核心递归内对状态-输入应用类卷积操作，而不是作为对 `x_t` 的外层卷积。

2. **复值状态更新。** 之前的 Mamba 把状态矩阵从复（S4）减到实对角（Mamba）再到缩放单位（Mamba-2）。Mamba-3 重新加回复值——等价于对状态做一个数据相关的旋转 embedding。这恢复了之前实值简化所损失的状态追踪能力。

3. **多输入多输出（MIMO）投影。** 不用每特征的标量投影，而用矩阵值投影。提升建模能力和推理时硬件利用率，而不增加 decode 延迟。

在 1.5B 参数下，Mamba-3 比 Gated DeltaNet 把平均下游准确率提升 0.6 个点；MIMO 变体再加 1.2，总计 1.8 个点的提升。在相同状态大小下，Mamba-3 用一半的状态匹配 Mamba-2。

Mamba-3 还没在大规模生产混合里上线——但它是下一个 Jamba 级模型 SSM 那一侧的显而易见的候选。

### 什么时候上混合

混合在以下情况胜出：

- Context 长到纯 Transformer KV cache 变得痛苦（64k+）。
- 任务混合短程结构（对 SSM 好）和长程召回（需要 Transformer）。
- 你想部署在单 GPU 内存预算上，那里光 Transformer KV cache 就装不下。

混合在以下情况败下：

- Context 短（16k 以下）。SSM 开销被浪费；纯 Transformer 就好。
- 任务需要处处对处处的注意力（深度推理、多文档交叉引用）。混合里注意力层的稀疏性伤害它。
- 你在扩到万亿参数前沿模型。纯 Transformer + MLA + MoE（DeepSeek-V3 风格）目前在赢能力竞赛。

### 竞争格局

| 模型 | 家族 | 规模 | 独特卖点 |
|-------|--------|------|-------------|
| Mamba-2 | 纯 SSM | 3B | 线性时间，恒定内存 |
| Jamba | 混合 | 52B/12B | 80GB 上 256k |
| Jamba 1.5 Large | 混合 | 398B/94B | 企业级长 context |
| Mamba-3 | 纯 SSM | 1.5B（论文） | 状态追踪恢复 |
| DeepSeek-V3 | 纯 Transformer + MoE | 671B/37B | 前沿能力 |

2026 年格局：纯 Transformer MoE 主导前沿，但混合占据 256k 以上 context 的利基。Mamba-3 的状态追踪胜利可能在下一代把混合比例推得更低（更多 SSM，更少注意力）。

```figure
swiglu-ffn
```

## 实际使用

`code/main.py` 是一个混合架构的内存计算器。给定一个 SSM-Transformer 比例和一个 hidden-size / 层数配置，它计算：

- 目标 context 下的 KV cache。
- SSM 状态内存。
- 一系列模型形状在 context N 下的总内存。

计算器支持：

- 纯 Transformer 基线（KV cache 随 N 增长）。
- Jamba 风格 1:7 混合。
- 纯 SSM（完全没有 KV cache）。

数字对已发布形状直接取自 Jamba-1 和 Jamba-1.5 论文，对假想变体外推。

真实部署的集成考量：

- 大多数生产推理服务器（vLLM、SGLang）支持 Jamba 和 Mamba。检查具体版本。
- 在 256k context 下，Jamba 的内存优势体现在并发请求吞吐上。同样的显存你能塞下比 Transformer 序列更多的 Jamba 序列。
- 作为独立模型的 Mamba-3 还没在生产里上线——1.5B 的研究预览。

## 拿去用

本节课产出 `outputs/skill-hybrid-picker.md`。给定一个工作负载规格（context 长度画像、任务混合、内存预算），它在纯 Transformer、Jamba 风格混合和纯 SSM 之间推荐，并对内存和质量权衡给出明确推理。

## 练习

1. 跑 `code/main.py` 计算一个 32 层纯 Transformer（hidden 4096，32 头）和一个相同形状的 Jamba-1 混合在 256k context 下的 KV cache。验证 AI21 论文宣称的 ~8 倍内存减少。

2. 改计算器去建模一个 1:3 混合（4 Mamba : 1 Attention）和一个 1:15 混合（14 Mamba : 1 Attention）。画 KV cache vs 比例。在什么比例下 KV cache 等于 SSM 状态内存？

3. 读 Jamba 论文（arXiv:2403.19887）第 3 节。解释为什么 AI21 用 Mamba-1 而不是 Mamba-2，尽管 Mamba-2 更快。提示：混合消融部分记录了这个。

4. 计算 Jamba 1.5 Large（总 398B，激活 94B）里 MoE-隔层 的参数开销。把激活比例和 DeepSeek-V3（37B/671B）对比，解释为什么 Jamba 的架构把激活比例推得更高。

5. 读 Mamba-3 论文（arXiv:2603.15569）第 3 节。用三句话解释为什么复值状态更新等价于一个数据相关的旋转 embedding。把答案和阶段 7 · 第 04 课的 RoPE 推导联系起来。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 状态空间模型（SSM） | "带定长状态的递归" | 一个带习得递归 `h_t = A h_{t-1} + B x_t` 的层；每 token 恒定内存 |
| 选择性 SSM | "Mamba 的诀窍" | 数据相关的 A、B、C 参数，让模型在线性时间下有类门控的选择性 |
| 注意力对 Mamba 比例 | "有多少注意力层" | 在 Jamba 里，`l = 8` 意味着每 7 个 Mamba 层 1 个注意力层 |
| Jamba 块 | "那个 8 层组" | 一个注意力 + 七个 Mamba + 在交替位置的 MoE |
| SSM 状态 | "那个隐藏缓冲" | Mamba 层用来替代 KV cache 的定长每层状态 |
| 256k context | "Jamba 的旗舰数字" | Jamba-1 能塞进单张 80GB GPU 的序列长度；纯 Transformer 在那个尺寸做不到 |
| Mamba-3 | "2026 纯 SSM" | 当前最好的纯 SSM 架构，带复状态 + MIMO；混合模型重建围绕的基线 |
| MIMO | "多输入多输出" | Mamba-3 的创新，用矩阵值投影而非每特征标量 |
| 指数-梯形离散化 | "Mamba-3 的递归" | 一个更有表达力的递归，涵盖了 Mamba-2 的欧拉法离散化 |
| 混合架构 | "混合注意力和 SSM" | 任何交错 Transformer 和 SSM 层的模型；Jamba 是生产原型 |

## 延伸阅读

- [Lieber et al. — Jamba: A Hybrid Transformer-Mamba Language Model (arXiv:2403.19887)](https://arxiv.org/abs/2403.19887) — 最初的 Jamba 论文，比例消融，256k context 主张
- [AI21 — Jamba 1.5: Hybrid Transformer-Mamba at Scale (arXiv:2408.12570)](https://arxiv.org/abs/2408.12570) — 扩大的家族，398B/94B 和 12B/52B 公开发布
- [Gu, Dao — Mamba: Linear-Time Sequence Modeling with Selective State Spaces (arXiv:2312.00752)](https://arxiv.org/abs/2312.00752) — Jamba 建立其上的选择性 SSM 论文
- [Dao, Gu — Mamba-2 (arXiv:2405.21060)](https://arxiv.org/abs/2405.21060) — 简化的结构化状态空间后继
- [Lahoti et al. — Mamba-3 (arXiv:2603.15569, ICLR 2026)](https://arxiv.org/abs/2603.15569) — 复值状态、MIMO，2026 纯 SSM 前沿
- [Gu et al. — Efficiently Modeling Long Sequences with Structured State Spaces (arXiv:2111.00396)](https://arxiv.org/abs/2111.00396) — S4 论文，SSM 谱系给 LLM 的起点
