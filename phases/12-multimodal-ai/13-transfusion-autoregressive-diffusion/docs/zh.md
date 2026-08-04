# Transfusion：一个 transformer 里的自回归文本 + 扩散图像

> Chameleon 和 Emu3 把全部赌注押在离散 token 上。它们能work，但量化瓶颈是看得见的——图像质量在连续空间扩散模型之下平台化。Transfusion（Meta，Zhou 等人，2024 年 8 月）下了反方向的赌注：让图像保持连续，彻底扔掉 VQ-VAE，用两个损失训一个 transformer。文本 token 走下一 token 预测。图像 patch 走 flow-matching / 扩散损失。两个目标优化同一套权重。Stable Diffusion 3 底层的架构（MMDiT）是它的近亲。本节课通读 Transfusion 论点，搭一个玩具级双损失训练器，并追踪那个让一个 transformer 同时干两份活的注意力掩码。

**类型：** Build
**语言：** Python（标准库，MNIST 规模玩具上的双损失训练器）
**前置要求：** Phase 12 · 11（Chameleon）、Phase 8（生成式 AI）
**预计时间：** ~180 分钟

## 学习目标

- 接好一个 transformer，在一个骨干上跑两个损失（文本 token 上的 NTP、图像 patch 上的扩散 MSE）。
- 解释为什么跨图像 patch 的双向注意力加上跨文本 token 的因果注意力是正确的掩码选择。
- 在算力、质量和代码复杂度上把 Transfusion 式（连续图像，扩散损失）与 Chameleon 式（离散图像，NTP）作比较。
- 说出 MMDiT 的贡献：每个块的模态专属权重、残差流上的联合注意力。

## 问题背景

离散 vs 连续图像 token 之争比 LLM 还老。连续表示（原始像素、VAE 潜变量）保留细节。离散 token（VQ 索引）契合 transformer 的原生词表，但在量化那一步丢失细节。

Chameleon / Emu3 走了离散：一个损失、一个架构，但图像保真度被分词器质量封顶。

扩散模型走了连续：图像质量出众，但它是个独立于 LLM 的模型，需要复杂的噪声调度工程，且无法与文本生成干净集成。

Transfusion 问：我们能两者兼得吗？让图像保持连续，仍然训一个模型，用两个缝进同一个梯度步的损失。

## 核心概念

### 双损失架构

单个纯解码器 transformer 处理一条包含以下内容的序列：

- 文本 token（离散，来自 BPE 词表）。
- 图像 patch（连续，16x16 像素块经线性嵌入投影到隐藏维度——与 ViT 编码器的输入相同）。
- 标记连续 patch 所在位置的 `<image>` 和 `</image>` 标签。

前向跑一次。损失为每个 token 挑两个头之一：

- 对文本 token：词表 logit 头上的标准交叉熵。
- 对图像 patch：连续 patch 上的扩散损失——预测加到每个 patch 上的噪声。

梯度流过共享的 transformer 主体。两个损失同时改进共享权重。

### 注意力掩码：因果文本 + 双向图像

文本 token 必须是因果的——你不能让一个文本 token 关注未来的文本，否则 teacher forcing 就坏了。而图像 patch 代表一个快照；它们应该在同一个图像块内部彼此双向关注。

掩码：

```
M[i, j] = 1 if:
  (i is text and j is text and j <= i)   # causal for text
  OR (i is image and j is image and same_image_block(i, j))   # bidirectional within image
  OR (i is text and j is image and j < i_image_end)   # text attends to previous images
  OR (i is image and j is text and j < i_image_start)   # image attends to preceding text
```

训练和推理时都实现为一个块三角掩码。

### transformer 内部的扩散损失

扩散损失是标准的：给一个图像 patch 加噪，让模型预测噪声（或等价地预测干净 patch）。Transfusion 的版本用 flow matching——预测从含噪到干净的速度场。

训练时：
1. 对每个图像 patch x0，采一个随机时间步 t。
2. 采噪声 ε，算 xt = (1-t) * x0 + t * ε（flow matching 的线性插值）。
3. transformer 预测 v_theta(xt, t)；损失 = MSE(v_theta(xt, t), ε - x0)。
4. 与来自同一序列的文本 NTP 损失一起反向传播。

推理时，生成是：
- 文本 token：标准自回归采样。
- 图像 patch：以先前文本 token 为条件的扩散采样循环（典型 10-30 步）。

### MMDiT：Stable Diffusion 3 的变体

Stable Diffusion 3（Esser 等人，2024 年 3 月）出货的 MMDiT（多模态扩散 transformer）与 Transfusion 大约同期。这两个架构是兄弟。

MMDiT 的关键区别：

- 每个块的模态专属权重。每个 transformer 块为文本 token 和图像 patch 分别有独立的 Q、K、V 和 MLP 权重。注意力是联合的（跨模态）；其余一切都是模态专属的。
- rectified flow 训练。一个特定的 flow-matching 变体，采样已知且数学比 DDPM 更简单。
- 规模。MMDiT 是 SD3（2B 和 8B 参数变体）的骨干。Transfusion 论文扩展到 7B。

两者收敛到同一个核心想法：一个 transformer 在文本上跑 NTP、在连续图像表示上跑扩散。

### 为什么这胜过 Chameleon 式

连续扩散和离散 NTP 在图像生成上的质量差距是可测的。Transfusion 论文报告：

- 7B 参数下，在 FID 上比同规模 Chameleon 式模型高 3-5 分。
- 不需要训练分词器——图像编码器更简单（线性投影到隐藏维度，与 ViT 的输入层相同）。
- 推理能并行化图像 patch 去噪，不像自回归图像 token。

缺点：Transfusion 是个双损失模型，训练动态更棘手。损失权重需要调。NTP 和扩散之间的调度不匹配会让一个头主导。

### 下游有什么

Janus-Pro（第 12.15 课）通过把理解和生成的视觉编码器解耦——一个用 SigLIP、一个用 VQ——同时共享 transformer 主体，精炼了 Transfusion 的想法。Show-o（第 12.14 课）把扩散换成离散扩散（掩码预测）。统一生成家族在 Transfusion 之后迅速分叉。

2026 年那些能吐图像的生产 VLM——Gemini 3 Pro、GPT-5、Claude Opus 4.7 的图像生成路径——几乎肯定用了这个家族的某个后代。细节是专有的。

```figure
cfg-guidance-scale
```

## 实际使用

`code/main.py` 在一个微型 MNIST 式问题上搭了一个玩具 Transfusion：

- 文本 caption 是描述一个数字（0-9）的短整数序列。
- 图像是 4x4 的字节网格。
- 一对共享权重的线性投影充当 transformer 替身；文本上 NTP 损失，含噪 patch 上 MSE 损失。
- 训练循环交替这两个损失，注意力掩码是显式的。
- 生成在一次前向里产出一个文本 caption 和一张 4x4 图。

transformer 是玩具。双损失管路、注意力掩码构建和推理循环才是真正的产物。

## 拿去用

本节课产出 `outputs/skill-two-loss-trainer-designer.md`。给定一个新的多模态训练任务（文本 + 图像、文本 + 音频、文本 + 视频），它设计双损失调度（损失权重、掩码形状、共享 vs 模态专属块）并标记实现风险。

## 练习

1. 一个 Transfusion 式模型训 70% 文本 token 和 30% 图像 patch。图像扩散损失在量级上约是文本 NTP 损失的 10 倍。什么样的损失权重能平衡它们？

2. 为序列 `[T, T, <image>, P, P, P, P, </image>, T]` 实现块三角掩码。把每个项标为 0 或 1。

3. MMDiT 有模态专属的 QKV 权重。相对 Transfusion 完全共享的 transformer，这增加了多少参数量开销？在 7B 参数下，值得吗？

4. 生成：给定一个文本 prompt，模型先跑 50 个 token 的 NTP，然后撞上 `<image>`，再对 256 个 patch 跑 20 个去噪步的扩散。总共多少次前向？

5. 读 SD3 论文第 3 节。描述 rectified flow，以及它为什么比 DDPM 用更少的推理步收敛。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 双损失训练 | "NTP + 扩散" | 单个 transformer 在同一个梯度步里同时优化文本 token 上的交叉熵和连续图像 patch 上的 MSE |
| flow matching | "rectified flow" | 预测从噪声到干净数据速度场的扩散变体；数学比 DDPM 简单 |
| MMDiT | "多模态 DiT" | Stable Diffusion 3 的架构：联合注意力、模态专属 MLP 和 norm |
| 块三角掩码 | "因果文本 + 双向图像" | 跨文本因果但在图像区域内部双向的注意力掩码 |
| 连续图像表示 | "无 VQ" | 图像 patch 作为实值向量，而非整数码本索引 |
| 速度预测 | "v 参数化" | 网络输出是噪声与数据之间的速度场，而非噪声本身 |

## 延伸阅读

- [Zhou et al. — Transfusion (arXiv:2408.11039)](https://arxiv.org/abs/2408.11039)
- [Esser et al. — Stable Diffusion 3 / MMDiT (arXiv:2403.03206)](https://arxiv.org/abs/2403.03206)
- [Peebles & Xie — DiT (arXiv:2212.09748)](https://arxiv.org/abs/2212.09748)
- [Zhao et al. — MonoFormer (arXiv:2409.16280)](https://arxiv.org/abs/2409.16280)
- [Xie et al. — Show-o (arXiv:2408.12528)](https://arxiv.org/abs/2408.12528)
