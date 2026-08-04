# Flamingo 与用于少样本 VLM 的门控交叉注意力

> DeepMind 的 Flamingo（2022）抢在所有人前面做了两件事。它证明了单个模型能处理任意交错的图像、视频、文本序列。它还证明了 VLM 能做 in-context 学习——给一个带三个 (图像, caption) 示例的少样本 prompt，模型就能给一张新图配上 caption，一步梯度都不走。机制是：门控交叉注意力层，插在冻结 LLM 已有的层之间，配一个从零起步的可学习 tanh 门，于是 LLM 的文本能力在初始化时被完整保留。本节课走一遍 Flamingo 的 Perceiver resampler 和门控交叉注意力架构——它是 Gemini 交错输入和 Idefics2 视觉 token 的祖先。

**类型：** Learn
**语言：** Python（标准库，门控交叉注意力 + Perceiver resampler 演示）
**前置要求：** Phase 12 · 03（BLIP-2 Q-Former）
**预计时间：** ~120 分钟

## 学习目标

- 解释门控交叉注意力如何通过 tanh(gate) = 0 在初始化时保留冻结 LLM 的文本能力。
- 走一遍 Perceiver resampler：N 个图像 patch → 通过交叉注意力变成 K 个固定的"latent"query。
- 描述 Flamingo 如何用尊重图像位置的因果掩码来处理交错的图文序列。
- 复现一个少样本多模态 prompt 结构（3 个图-caption 示例后接一张查询图）。

## 问题背景

BLIP-2 把 32 个视觉 token 喂进冻结 LLM 的输入层。每个 prompt 一张图时这能用。但如果你想喂*很多*张图、和文本交错呢，就像"这是图 A，给它配 caption；这是图 B，给它配 caption；现在这是图 C，给它配 caption"？LLM 的自注意力就得在单一一条流里同时处理图像 token 和文本 token，而哪些位置能关注哪些图像这个问题会变得很烦人。

Flamingo 的答案：根本不改 LLM 的输入流。在已有的 LLM 块之间插入额外的交叉注意力层。文本 token 照旧流过 LLM 的因果自注意力。每隔几个 LLM 块，文本 token 还会通过一个新的门控层交叉关注图像特征。这个门（初始化为零）意味着第 0 步时新层是 no-op——模型的行为与预训练 LLM 一模一样。随着训练推进，门打开，视觉信息开始流入。

Flamingo 回答的第二个问题：每个 prompt 里图像数量可变（0 张、1 张或很多张）时怎么处理？用一个 Perceiver resampler——一个小型交叉注意力模块，无论你有多少个 patch，都产出固定数量的视觉 latent token。无论 prompt 里有几张图，LLM 的交叉注意力层看到的形状都一样。

## 核心概念

### 冻结的 LLM

Flamingo 从一个冻结的 Chinchilla 70B LLM 起步。全部 70B 权重原封不动。已有的文本自注意力和 FFN 正常运转。

### Perceiver resampler

对 prompt 里的每张图，ViT 产出 N 个 patch token。Perceiver resampler 有 K 个固定的可学习 latent（Flamingo 用 K=64）。每个 resampler 块分两个子步骤：

1. 交叉注意力：K 个 latent 关注 N 个 patch token（Q 来自 latent，K/V 来自 patch）。
2. latent 内部的自注意力 + FFN。

过完 6 个 resampler 块，输出是 K=64 个维度 1024 的视觉 token，无论 ViT 产出了多少 patch。一张 224x224 的图（196 个 patch）和一张 480x480 的图（900 个 patch）都以 64 个 resampler token 的形式出来。

对视频，resampler 在时间维上应用：每帧的 patch 产出 64 个 latent，一个时间位置编码让模型能区分 t=0 和 t=N。整段视频变成 T * 64 个视觉 token。

### 门控交叉注意力

在冻结 LLM 每隔 M 层（Flamingo 用 M=4），插入一个新的门控交叉注意力块：

```
x_after_llm_block = llm_block(x_before)
cross = cross_attn(x_after, resampler_output)
gated = tanh(alpha) * cross + x_after
x_before_next_block = gated
```

- `alpha` 是一个初始化为零的可学习标量。
- `tanh(0) = 0`，所以初始化时门控分支贡献为零。
- 随着 `alpha` 偏离零，交叉注意力的贡献平滑增长。
- 残差连接意味着即使门完全打开，也不会覆盖 LLM 的文本表示；它只是在上面叠加视觉信息。

这是 Flamingo 里最重要的一个设计选择：视觉条件是加性的、门控的、初始化为零的。第 0 步的 Flamingo 在纯文本输入上是一个完美的 Chinchilla 70B。

### 用于交错输入的掩码交叉注意力

在像"<image A> caption A <image B> caption B <image C> ?"这样的 prompt 里，每个文本 token 应该只看到序列中排在它前面的图像。交叉注意力掩码强制：位置 `t` 处的文本 token 只关注图像索引 `i < i_t` 的那些图像 resampler token，其中 `i_t` 是位置 `t` 之前最近的那张图。"只看最近的前一张图"和"看前面所有图"都是合法选择；Flamingo 选了前者。

### in-context 少样本学习

一个 Flamingo prompt 长这样：

```
<image1> A photo of a cat. <image2> A photo of a dog. <image3> A photo of a
```

模型看到这个补全模式，输出"bird"（或 image3 显示的任何东西）。不走梯度。冻结 LLM 的 in-context 学习能力穿过门控交叉注意力传递了过来——这是论文的点睛之处，也是它重要的原因。

### 训练数据

Flamingo 在三个数据集上训练：

1. MultiModal MassiveWeb（M3W）：4300 万个图文交错的网页，重建了阅读顺序。
2. 图文对（ALIGN + LTIP）：44 亿对。
3. 视频文本对（VTP）：2700 万段短视频。

OBELICS（2023）是交错网页语料的开放复现，Idefics、Idefics2 和大多数开放的"类 Flamingo"模型都在它上面训练。

### OpenFlamingo 与 Otter

OpenFlamingo（2023）是开放复现。架构完全相同（Perceiver resampler + 冻结 LLaMA 或 MPT 上的门控交叉注意力）。有 3B、4B、9B 的 checkpoint。由于基座 LLM 更小、数据更少，质量落后于 Flamingo。

Otter（2023）在 OpenFlamingo 基础上用 MIMIC-IT（一个多模态指令数据集）做指令微调，证明了门控交叉注意力对指令遵循也有效。

### 后代

- Idefics / Idefics2 / Idefics3：Hugging Face 的门控交叉注意力一脉，逐步简化（Idefics2 砍掉了 resampler，改用带自适应池化的直接 patch token）。
- Flamingo 到 Chameleon 的转变：到 2024 年许多团队转向早融合（第 12.11 课）；在需要冻结骨干的场景里，Flamingo 式门控交叉注意力仍在生产中。
- Gemini 的交错输入：概念上继承了 Flamingo 交错格式的灵活性，尽管确切机制是专有的。

### 与 BLIP-2 的对比

| | BLIP-2 | Flamingo |
|---|---|---|
| 视觉桥 | 输入处一次 Q-Former | 每 M 层一次门控交叉注意力 |
| 视觉 token | 每张图 32 个 | 每张图每个交叉注意力层 64 个 |
| 冻结 LLM | 是 | 是 |
| 少样本 in-context | 弱 | 强——论文的核心卖点 |
| 交错输入 | 无原生支持 | 有，正是设计目标 |
| 训练数据 | 1.3 亿对 | 13 亿对 + 4300 万交错页 |
| 参数量 | 训 188M | 训约 10B（交叉注意力层） |
| 算力 | 8 张 A100 跑几天 | 上千张 TPUv4 跑几周 |

预算有限做单图 VQA 选 BLIP-2。做交错、少样本或多图推理选 Flamingo/Idefics2。

```figure
cross-attention-fusion
```

## 实际使用

`code/main.py` 演示：

1. 在 36 个假 patch token 上跑一个带 8 个可学习 latent 的 Perceiver resampler（纯 Python 交叉注意力）。
2. 一个门控交叉注意力步骤：`alpha = 0` → 输出等于输入（LLM 不变），然后 `alpha = 2.0` → 视觉贡献被混入。
3. 一个交错掩码构建器，为"(图 1) (文本 1) (图 2) (文本 2)"序列产出二维注意力掩码。

## 拿去用

本节课产出 `outputs/skill-gated-bridge-diagnostic.md`。给定一个开放 VLM 的配置（是否有 resampler、交叉注意力频率、门控方案），它识别出 Flamingo 一脉的元素，并解释冻结策略。这对排查"为什么一次微调把文本性能搞退化了"很有用（答案：门开得太快太大了）。

## 练习

1. 算一下 Flamingo-9B 的视觉参数量：9B LLM + 1.4B 门控交叉注意力层 + 64M resampler。被训练的参数占总数的多少？

2. 用 PyTorch 实现门控残差 `y = tanh(alpha) * cross + x`。用实验展示：`alpha=0` 时，初始化处 `y==x` 完全相等。

3. 读 OpenFlamingo 第 3.2 节（arXiv:2308.01390），看他们在一个 batch 里每个 prompt 图像数量不同时是怎么处理多张图的。描述其填充策略。

4. 为什么 Flamingo 的交叉注意力掩码让文本 token 只关注*最近的*前一张图，而不是前面所有图？读 Flamingo 论文第 2.4 节并解释这个取舍。

5. in-context 少样本：为一个新的 Flamingo 变体构造一个带 4 个"图像 → 主体物体颜色"示例的 prompt。描述当你把示例数从 0 变到 8 时预期的准确率走势。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|----------------|------------------------|
| Perceiver resampler | "固定 latent 交叉注意力" | 从数量可变的输入 patch 产出 K 个固定 token 的模块 |
| 门控交叉注意力 | "tanh 门控桥" | 残差层 `y = tanh(alpha)*cross + x`，alpha 可学习，初始为 0 |
| 交错输入 | "混合序列" | 图像和文本按阅读顺序自由混排的 prompt 格式 |
| 冻结 LLM | "无 LLM 梯度" | 文本 LLM 权重不更新；只训 resampler + 交叉注意力层 |
| 少样本 | "in-context 示例" | 在 prompt 里给几个 (图像, 答案) 对；模型无需微调即泛化 |
| OBELICS | "交错网页语料" | 一个开放数据集，1.41 亿个按阅读顺序排布图像和文本的网页 |
| Chinchilla | "70B 冻结基座" | Flamingo 冻结的文本 LLM，来自 DeepMind 的 Chinchilla 论文 |
| 门控调度 | "alpha 怎么变" | 训练中交叉注意力门打开的速率 |
| 交叉注意力频率 | "每 M 层" | 多久插入一个门控交叉注意力块；Flamingo 用 M=4 |
| OpenFlamingo | "开放复现" | MosaicML/LAION 的 3-9B 开放 checkpoint；架构与 Flamingo 完全相同 |

## 延伸阅读

- [Alayrac et al. — Flamingo (arXiv:2204.14198)](https://arxiv.org/abs/2204.14198) —— 原论文。
- [Awadalla et al. — OpenFlamingo (arXiv:2308.01390)](https://arxiv.org/abs/2308.01390) —— 开放复现。
- [Laurençon et al. — OBELICS (arXiv:2306.16527)](https://arxiv.org/abs/2306.16527) —— 交错网页语料。
- [Jaegle et al. — Perceiver IO (arXiv:2107.14795)](https://arxiv.org/abs/2107.14795) —— 通用的 Perceiver 架构。
- [Li et al. — Otter (arXiv:2305.03726)](https://arxiv.org/abs/2305.03726) —— 指令微调的 Flamingo 后代。
- [Laurençon et al. — Idefics2 (arXiv:2405.02246)](https://arxiv.org/abs/2405.02246) —— Flamingo 方法的现代简化版。
