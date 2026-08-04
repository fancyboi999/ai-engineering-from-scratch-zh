# 视觉自回归建模（VAR）：下一尺度预测

> 扩散模型在时间上迭代采样（去噪步）。VAR 在尺度上迭代采样——它先预测一个 1x1 的 token，再 2x2、再 4x4，一直到最终分辨率，每个尺度都以前一个为条件。2024 年那篇论文表明 VAR 在图像生成上符合 GPT 式的扩展律，并在相同算力预算下击败 DiT。本课构建其核心机制。

**类型：** Build
**语言：** Python（配 PyTorch）
**前置要求：** 阶段 7 第 03 课（多头注意力）、阶段 8 第 06 课（DDPM）
**预计时间：** ~90 分钟

## 问题背景

自回归生成主导了语言建模，因为它扩展起来可预测：算力更多、参数更多、困惑度更低、输出更好。2024 年之前图像生成有两次主要的 AR 尝试：PixelRNN/PixelCNN（逐像素）和 DALL-E 1 / Parti / MuseGAN（在 VQ-VAE 码上逐 token）。

两者都受困于一个生成顺序问题。像素和 token 排在一个 2D 网格里，但 AR 模型必须以 1D 光栅顺序去访问它们。一个早期的角落像素压根不知道这张图最终会变成什么。生成质量的扩展性比 GPT-on-text 差，在匹配算力下从未达到扩散模型的质量。

VAR 通过改变所生成的东西来修这个生成顺序问题。VAR 不是在空间里逐个预测图像 token，而是在递增的分辨率上预测一整张图像。第 1 步：预测一个 1x1 token（整张图的「摘要」）。第 2 步：预测一个 2x2 token 网格（更粗的特征）。第 3 步：预测一个 4x4 网格。第 K 步：预测最终的 (H/8)x(W/8) 网格。

每个尺度注意所有先前的尺度（在「尺度顺序」上是因果的），在自身尺度内部则并行。顺序问题消失了：尺度 k 上的整张图像在一次 transformer 前向中产出。

## 核心概念

### VQ-VAE 多尺度分词器

VAR 需要一个**多尺度离散分词器**。对一张图像 x，它产出一串分辨率逐级升高的 token 网格：

```
x -> encoder -> latent f
f -> tokenize at 1x1: token grid z_1 of shape (1, 1)
f -> tokenize at 2x2: token grid z_2 of shape (2, 2)
...
f -> tokenize at (H/p)x(W/p): token grid z_K of shape (H/p, W/p)
```

每个 z_k 用同一个码本（典型大小 4096-16384）。各尺度上的 token 化不是独立的——它被训练成：把每个尺度的残差加起来能重建 f：

```
f ≈ upsample(embed(z_1), target_size) + ... + upsample(embed(z_K), target_size)
```

这是一个**残差 VQ** 变体。尺度 k 捕捉尺度 1..k-1 漏掉的东西。解码器接受所有尺度嵌入之和，产出图像。

多尺度 VQ 分词器训练一次（像 VQGAN），然后冻结。所有生成工作都由上层的自回归模型完成。

### 下一尺度预测

生成模型是一个 transformer，它看到所有先前尺度的 token，预测下一尺度的 token。

输入序列结构：
```
[START, z_1 tokens, z_2 tokens, z_3 tokens, ..., z_K tokens]
```

位置嵌入同时编码尺度索引和尺度内的空间位置。注意力在尺度顺序上是因果的：尺度 k、位置 (i, j) 的 token 能注意尺度 1..k 上的所有 token，以及尺度 k 自身中在任何所用的尺度内顺序里更早的 token（VAR 用固定位置注意力、无尺度内因果性——一个尺度内的所有位置并行预测）。

训练损失：在每个尺度 k，给定所有先前尺度的 token，预测 z_k 的 token。在离散 VQ 码上做交叉熵损失。结构和 GPT 一样，只是这个「序列」现在是按尺度结构化的。

### 生成

推理时：
```
generate z_1 = sample from p(z_1)                    # 1 token
generate z_2 = sample from p(z_2 | z_1)              # 4 tokens in parallel
generate z_3 = sample from p(z_3 | z_1, z_2)         # 16 tokens in parallel
...
decode: f = sum of embed-and-upsample scales 1..K
image = VAE_decoder(f)
```

对 K = 10 个尺度，生成是 10 次 transformer 前向。每一次并行产出它整个尺度——一个尺度内部没有逐 token 自回归。对一张 256x256 的图像，这大约是 10 次前向，而 DiT 是 28-50 次。

### 为什么下一尺度胜过下一 token

三个结构性胜果：
1. **由粗到细契合自然图像统计。** 人类视觉感知和图像数据集都展现尺度相关的规律性：低频结构稳定且可预测；高频细节以低频内容为条件。下一尺度预测利用了这一点。
2. **尺度内并行生成。** 不像 GPT 式 token AR，VAR 一步产出一个尺度上的所有 token。有效生成长度是对数级而不是线性级。
3. **没有生成顺序偏差。** 尺度 k 的 token 看到整个尺度 k-1；没有「左于」或「上于」的偏差逼着早 token 在后文上下文可得之前就提交。

### 扩展律

Tian 等人证明 VAR 在 ImageNet 上的 FID 遵循一条幂律扩展曲线——就像 GPT 对困惑度那样。参数或算力翻倍能可靠地把误差减半。这是第一个像语言模型一样干净地展现这类扩展行为的图像生成模型。结果是 VAR 规模的预测变得可从算力推断，而不是每个架构靠经验瞎猜。

### 与扩散的关系

VAR 和扩散共享同一个数据压缩故事：两者都把生成问题拆成一串更容易的子问题。

- 扩散：逐步加噪声，学着撤销一步。
- VAR：逐步加分辨率，学着预测下一尺度。

它们是穿过这个问题的不同维度。两者都产出可解的条件分布。经验上 VAR 推理更快（前向更少，尺度内全并行），在类别条件 ImageNet 上追平或击败 DiT。文本条件的 VAR（VARclip、HART）是活跃的研究方向。

```figure
gx-var-next-scale
```

## 动手构建

在 `code/main.py` 里你会：
1. 在合成的「图像」数据（2D 高斯环）上构建一个迷你**多尺度 VQ 分词器**。
2. 训练一个 **VAR 风格的 transformer** 去下一尺度预测这些 token。
3. 通过调用 transformer 4 次（4 个尺度）并解码来采样。
4. 验证尺度顺序的训练让生成在尺度内并行。

这是一个玩具实现。重点是亲眼看到尺度结构化的注意力掩码和尺度内并行生成确实在工作。

## 拿去用

本课产出 `outputs/skill-var-tokenizer-designer.md`——一个用于设计多尺度分词器的技能：尺度数量、尺度比例、码本大小、残差共享、解码器架构。

## 练习

1. **尺度数量消融。** 用 4、6、8、10 个尺度训练 VAR。测量重建质量 vs 自回归前向次数。尺度越多 = 残差越细 = 质量越好但前向越多。

2. **码本大小。** 用 512、4096、16384 的码本大小训练分词器。更大的码本给出更好的重建但更难预测。找到那个拐点。

3. **尺度内并行检查。** 对一个训好的 VAR，显式测量注意力模式。在尺度 k 内部，模型是否注意跨尺度的位置而不注意尺度内？验证掩码的实现。

4. **VAR vs DiT 扩展。** 对同一个 ImageNet 类别条件任务，在匹配的参数预算下训练 VAR 和 DiT（比如 33M、130M、458M）。画 FID vs 算力。VAR 应在每个尺寸上都领先 DiT——在小规模上复现论文的结果。

5. **文本条件化。** 扩展 VAR，通过 adaLN 接受一个文本嵌入（CLIP 池化）作额外条件输入。这是 HART 的配方。在文本对齐采样上 FID 改善了多少？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|----------------|----------------------|
| VAR | 「视觉自回归」 | 在一个 VQ token 网格金字塔上通过下一尺度预测来生成图像 |
| 下一尺度预测 | 「先预测粗的，再细的」 | 模型在递增的分辨率尺度上预测 token，以所有先前尺度为条件 |
| 多尺度 VQ 分词器 | 「残差 VQ」 | 产出 K 个递增分辨率 token 网格的 VQ-VAE，解码器把所有尺度加起来 |
| 尺度 k | 「金字塔第 k 层」 | K 个分辨率层级之一，从 k=1 的 1x1 到 k=K 的 (H/p)x(W/p) |
| 尺度内并行 | 「每个尺度一次前向」 | 尺度 k 的所有 token 在一次 transformer 前向中预测，而非自回归 |
| 尺度间因果 | 「尺度顺序注意力」 | 尺度 k 的 token 能注意尺度 1..k 的全部，但不能注意尺度 k+1..K |
| 残差 VQ | 「加性 token 化」 | 每个尺度的 token 编码低尺度留下的残差；解码器把所有尺度嵌入加起来 |
| VAR 扩展律 | 「图像 GPT 扩展」 | FID 在算力上遵循可预测的幂律，像语言模型的困惑度 |
| HART | 「混合 VAR + 文本」 | 文本条件 VAR 变体，把 MaskGIT 风格的迭代解码与 VAR 的尺度结构结合 |
| 尺度位置嵌入 | 「(尺度, 行, 列) 三元组」 | 位置编码同时携带尺度索引和尺度内的空间坐标 |

## 延伸阅读

- [Tian et al., 2024 — "Visual Autoregressive Modeling: Scalable Image Generation via Next-Scale Prediction"](https://arxiv.org/abs/2404.02905) —— VAR 那篇论文，权威参考
- [Peebles and Xie, 2022 — "Scalable Diffusion Models with Transformers"](https://arxiv.org/abs/2212.09748) —— DiT，扩散对比基线
- [Esser et al., 2021 — "Taming Transformers for High-Resolution Image Synthesis"](https://arxiv.org/abs/2012.09841) —— VQGAN，VAR 多尺度分词器所扩展的分词器家族
- [van den Oord et al., 2017 — "Neural Discrete Representation Learning"](https://arxiv.org/abs/1711.00937) —— VQ-VAE，离散图像 token 化的基础
- [Tang et al., 2024 — "HART: Efficient Visual Generation with Hybrid Autoregressive Transformer"](https://arxiv.org/abs/2410.10812) —— 文本条件 VAR
