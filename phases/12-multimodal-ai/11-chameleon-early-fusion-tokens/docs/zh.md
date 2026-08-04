# Chameleon 与早融合的纯 token 多模态模型

> 我们到目前为止见过的每个 VLM 都把图像和文本分开。视觉 token 来自视觉编码器，流进投影器，然后在 LLM 内部与文本相遇。视觉词表和文本词表从不重叠。Chameleon（Meta，2024 年 5 月）问：如果它们重叠呢？训一个 VQ-VAE，把图像变成一串来自共享词表的离散 token。现在每份多模态文档都是一条序列——文本 token 和图像 token 交错，一个自回归损失。副作用是：模型能在单次推理调用里生成混合模态输出——交替吐出文本 token 和图像 token。本节课通读早融合论点，并从头到尾搭一个玩具版。

**类型：** Build
**语言：** Python（标准库，VQ-VAE 分词器 + 交错解码器）
**前置要求：** Phase 12 · 05、Phase 8（生成式 AI）
**预计时间：** ~180 分钟

## 学习目标

- 解释为什么共享词表 + 单一损失改变了模型能做什么。
- 描述 VQ-VAE 如何把一张图分词成一条与 transformer 下一 token 目标兼容的离散序列。
- 说出 Chameleon 的训练稳定性技巧：QK-Norm、dropout 放置、LayerNorm 排序。
- 把 Chameleon 与 BLIP-2 的 Q-Former 路线作比较，并描述各自在什么情况下是正确选择。

## 问题背景

基于适配器的 VLM（LLaVA、BLIP-2、Qwen-VL）把文本和图像当成两种不同的东西。文本 token 走 `embed(text_token)`；图像走 `visual_encoder(image) → projector → ... pseudo_tokens`。模型有两条输入路径，在中途合并。

三个后果：

1. LLM 只能消费图像，不能吐出图像。输出只有文本。
2. 混合模态文档（段落和图像交替，像一篇文章那样）很别扭——你要么在模型外面解析多模态输入，要么把生成链起来。
3. 分布不匹配。视觉 token 和文本 token 住在隐藏空间的不同区域，制造出微妙的对齐问题。

Chameleon 拒绝这个前提：图像不过是来自共享词表的一串离散 token。在交错文档上训模型，一个损失、一个自回归解码器，你就免费解锁了混合模态生成。

## 核心概念

### VQ-VAE 作为图像分词器

分词器是一个向量量化的变分自编码器。架构：

- 编码器：CNN + ViT，把图像映射到一张空间特征图，比如 32x32 个维度 256 的特征。
- 码本：一个学出来的 K 个向量的词表（Chameleon 用 8192），也是维度 256。
- 量化：对每个空间特征，按 L2 距离查最近的码本条目。用整数索引替换连续特征。
- 解码器：CNN，把量化特征还原成像素。

训练：VAE 重建损失 + commitment 损失 + 码本损失。码本索引构成了图像的离散字母表。

对 Chameleon：一张图变成 32*32 = 1024 个 token，取自一个 8192 的词表。与文本 token（来自 LLM 的 BPE 词表，比如 32000）拼接。最终词表：40192。transformer 看到一条序列、一个损失。

### 共享词表

Chameleon 的词表把文本 token、图像 token 和模态分隔符合在一起。每个 token 有单一 ID。输入嵌入层把每个 ID 映射到一个 D 维隐藏向量。输出投影把隐藏映射回词表 logit。softmax 挑下一个 token，不管什么模态。

分隔符很要紧：`<image>` 和 `</image>` 标签括住图像 token 序列。生成时，如果模型吐出 `<image>`，下游软件就知道接下来 1024 个 token 是要送给解码器渲染像素的 VQ 索引。

### 混合模态生成

推理就是在共享词表里做下一 token 预测。示例 prompt："Draw a cat and describe it."Chameleon 吐出：

```
<image> 4821 1029 2891 ... (1024 image tokens) </image>
The cat is orange, sitting on a windowsill...
```

模型自主挑顺序——它可能先图后文、先文后图，或交错。同一个解码器，同一个损失。

对比适配器 VLM 那种只能生成文本的情况。Chameleon 重新打开了模型输出模态这个问题。

### 训练稳定性—— QK-Norm、dropout、LayerNorm 排序

早融合训练在大规模上不稳定。Chameleon 的论文记录了三个技巧：

- QK-Norm。在注意力内部、点积之前，对 query 和 key 投影施加 LayerNorm。防止深度处 logit 幅度爆炸。被多个 2024 年后的大模型采用。
- dropout 放置。每次残差相加之后都做 dropout，而不只在注意力和 MLP 之后。当来自图像 token 的梯度可能主导时，需要更多正则化。
- LayerNorm 排序。残差分支上用 Pre-LN（标准），加上对最后一个块跳跃连接的一个额外 LN。稳定末层梯度流。

没有这些技巧，34B 参数的 Chameleon 训练在多个 checkpoint 处发散。有了它们，它收敛。训练配方和架构一样是贡献的一部分。

### 分词器的重建天花板

VQ-VAE 是有损的。在 8192 个码本条目、每张 512x512 图 1024 个 token 下，重建 PSNR 封顶在 26-28 dB 左右。这足以做可辨认的图像生成，但明显比连续空间扩散差（Stable Diffusion 3 达到 32+ dB）。

分词器是瓶颈。更好的分词器（MAGVIT-v2、IBQ、SBER-MoVQGAN）抬高天花板。Emu3（第 12.12 课）光靠更好的分词器就达到了 SDXL 级质量的生成。

### Chameleon vs BLIP-2 / LLaVA

Chameleon（早融合，共享词表）：
- 一个损失，一个解码器。
- 生成混合模态输出。
- 分词器是质量天花板。
- 贵：推理路径上每生成一张图都要跑一次 VQ-VAE 解码器。

BLIP-2 / LLaVA（晚融合，分开的塔）：
- 视觉进，只出文本。
- 复用预训练 LLM。
- 理解时没有分词器瓶颈。
- 便宜：单次前向。

按任务挑。如果你需要图像生成，选 Chameleon 家族。如果你只需要理解，适配器 VLM 更简单，也复用了更多预训练算力。

### Fuyu 与 AnyGPT

Fuyu（Adept，2023）是一个相关路线：彻底跳过独立的视觉编码器，把原始图像 patch 当作 token 一样过 LLM 的输入投影，不用分词器。比 Chameleon 简单，但丢掉了共享词表的输出生成能力。

AnyGPT（Zhan 等人，2024）把 Chameleon 扩展到四种模态：文本、图像、语音、音乐。每种用同样的 VQ-VAE 戏法，共享 transformer。任意到任意生成。第 12.16 课讲得更多。

```figure
vq-codebook
```

## 实际使用

`code/main.py` 搭了一个玩具级端到端早融合模型：

- 一个微型 VQ-VAE 式量化器，把 8x8 patch 映射到码本索引（K=16）。
- 一个共享词表：(文本 id 0..31) + (图像 id 32..47) + (分隔符 48, 49)。
- 一个玩具自回归解码器（bigram 表），在合成 caption + 图像 token 序列上训练。
- 一个采样循环，给定 prompt 吐出交替的文本 + 图像 token。

代码故意把 transformer 保持得极小（bigram），好让你从头到尾追踪信号流。

## 拿去用

本节课产出 `outputs/skill-tokenizer-vs-adapter-picker.md`。给定一个产品规格（只理解 vs 理解 + 生成、所需图像质量、成本预算），它在 Chameleon 家族（早融合）和 LLaVA 家族（晚融合）之间挑选，并用定量的经验法则佐证。

## 练习

1. Chameleon 用 K=8192 个码本条目、每张 512x512 图 1024 个 token。估算它相对一张 24 位 RGB 图的压缩比。它有损吗？多有损？

2. 一张 4K 图（3840x2160）在同样的 VQ-VAE 密度下产出多少图像 token？一个 Chameleon 式模型能在单次推理调用里生成一张 4K 图吗？什么先崩——上下文、分词器质量，还是 KV cache？

3. 用纯 Python 实现 QK-Norm。给定一个 64 维的 query 和 key，展示 LayerNorm 前后的点积。为什么深度处的幅度控制重要？

4. 读 Chameleon 第 2.3 节关于训练稳定性的内容。描述论文在 34B 上不用 QK-Norm 时观察到的确切失败模式。"范数爆炸"的特征是什么？

5. 扩展那个玩具解码器，让它在只给文本 prompt 时吐出一个混合模态回应。在训练数据分布 60% 先文 / 40% 先图下，测一下模型多频繁选先图 vs 先文。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 早融合 | "统一 token" | 图像从第一步起就转成与 transformer 词表共享的离散 token |
| VQ-VAE | "图像分词器" | CNN + ViT + 码本，把图像映射成 transformer 能预测的整数索引 |
| 共享词表 | "一本字典" | 涵盖文本 + 图像 + 模态分隔符的单一 token ID 空间 |
| QK-Norm | "注意力稳定器" | 在 query 和 key 点积之前对它们施加 LayerNorm，防止范数暴涨 |
| 混合模态生成 | "文本 + 图像输出" | 一次前向里自主产出交错文本和图像 token 的推理 |
| 码本大小 | "K 个条目" | VQ-VAE 能量化到的离散向量数；在压缩和保真之间取舍 |
| 分词器天花板 | "重建上限" | 解码 VQ token 能达到的最佳 PSNR；为模型的图像质量封顶 |

## 延伸阅读

- [Chameleon Team — Chameleon: Mixed-Modal Early-Fusion Foundation Models (arXiv:2405.09818)](https://arxiv.org/abs/2405.09818)
- [Aghajanyan et al. — CM3 (arXiv:2201.07520)](https://arxiv.org/abs/2201.07520)
- [Yu et al. — CM3Leon (arXiv:2309.02591)](https://arxiv.org/abs/2309.02591)
- [Zhan et al. — AnyGPT (arXiv:2402.12226)](https://arxiv.org/abs/2402.12226)
- [Adept — Fuyu-8B blog (adept.ai)](https://www.adept.ai/blog/fuyu-8b)
