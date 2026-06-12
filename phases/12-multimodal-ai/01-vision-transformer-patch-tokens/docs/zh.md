# Vision Transformer 与 patch-token 原语

> 在一切多模态之前，图像必须先变成一串 transformer 吃得下的 token。2020 年的 ViT 论文给出的答案是：16x16 像素的 patch、一次线性投影、一个位置嵌入。五年过去，每一个 2026 年的前沿模型（原生 2576px 的 Claude Opus 4.7、Gemini 3.1 Pro、Qwen3.5-Omni）仍然从这里起步——编码器从 ViT 换成 DINOv2 再换成 SigLIP 2，加进了 register token，位置方案变成了 2D-RoPE，但这个原语始终没变。本节课从头到尾通读 patch-token 流水线，并用纯标准库 Python 把它搭出来，好让 Phase 12 剩下的内容对"视觉 token"有一个具体的心智模型。

**类型：** Learn
**语言：** Python（标准库，patch 分词器 + 几何计算器）
**前置要求：** Phase 7（Transformers）、Phase 4（计算机视觉）
**预计时间：** ~120 分钟

## 学习目标

- 把一张 HxWx3 的图像转成一串带正确位置编码的 patch token。
- 给定一个 ViT 的 (patch 大小、分辨率、隐藏维度、深度)，算出它的序列长度、参数量和 FLOPs。
- 说出让 ViT 从 2020 年的研究走到 2026 年生产的三项升级：自监督预训练（DINO / MAE）、register token、原生分辨率打包。
- 为某个下游任务在 CLS pooling、mean pooling 和 register token 之间做选择。

## 问题背景

Transformer 处理的是向量序列。文本本来就是序列（字节或 token）。而图像是一个带三个颜色通道的二维像素网格——不是序列。如果你把每个像素都摊平，一张 224x224 的 RGB 图就成了 150,528 个 token，在这种长度上做自注意力根本没法玩（序列长度的平方复杂度）。

2020 年之前的做法是在前面接一个 CNN 特征提取器：ResNet 产出一张 7x7、每格 2048 维向量的特征图，把这 49 个 token 喂给 transformer。这能用，但它继承了 CNN 的归纳偏置（平移等变、局部感受野），也丢掉了 transformer 对规模的胃口。

Dosovitskiy 等人（2020）提了个直白的问题：如果我们干脆跳过 CNN 呢？把图像切成固定大小的 patch（比如 16x16 像素），把每个 patch 线性投影成一个向量，加上位置嵌入，再把这串序列喂给一个原味 transformer。在当时这是异端——不用卷积的视觉。数据量够大（先是 JFT-300M，后来是 LAION）时，它在 ImageNet 上打败了 ResNet，而且还在持续变好。

到 2026 年，ViT 这个原语已是不容置疑的地基。每个开放权重 VLM 的视觉塔都是它的某个后代（DINOv2、SigLIP 2、CLIP、EVA、InternViT）。问题不再是"该不该用 patch？"，而是"用多大 patch、用什么分辨率方案、用什么预训练目标、用什么位置编码"。

## 核心概念

### patch 即 token

给定一张形状为 `(H, W, 3)` 的图像 `x` 和 patch 大小 `P`，你把图像切成一个 `(H/P) x (W/P)` 的网格，patch 之间不重叠。每个 patch 是一个 `P x P x 3` 的像素方块。把每个方块摊平成一个 `3 P^2` 维向量。再用一个形状为 `(3 P^2, D)` 的共享线性投影 `W_E`，把每个 patch 映射到模型的隐藏维度 `D`。

以 ViT-B/16 这个经典配置为例：
- 分辨率 224，patch 大小 16 → 网格 14x14 → 196 个 patch token。
- 每个 patch 是 `16 x 16 x 3 = 768` 个像素值，投影到 `D = 768`。
- 加一个可学习的 `[CLS]` token → 序列长度 197。

patch 投影在数学上与一个核大小为 `P`、步长为 `P`、输出通道为 `D` 的二维卷积完全等价。生产代码就是这么实现的——`nn.Conv2d(3, D, kernel_size=P, stride=P)`。"线性投影"是概念上的说法；"卷积核"是高效的实现。

### 位置嵌入

patch 本身没有顺序——transformer 把它们看成一袋东西。早期 ViT 加的是可学习的一维位置嵌入（每个位置一个 768 维向量，一共 197 个）。能用，但把模型绑死在训练分辨率上：推理时如果改了网格大小，你得对位置表做插值。

现代视觉骨干用的是 2D-RoPE（Qwen2-VL 的 M-RoPE、SigLIP 2 的默认方案）或因子化的二维位置。2D-RoPE 根据 patch 的 (行, 列) 索引去旋转 query 和 key 向量，于是模型从旋转角度里推断出相对的二维位置。没有位置表。推理时模型能处理任意网格大小。

### CLS token、池化输出与 register token

图像级别的表示该取哪个？三种选择并存：

1. `[CLS]` token。在 patch 序列前面拼一个可学习向量。过完所有 transformer 块后，CLS token 的隐藏状态就是图像表示。继承自 BERT。原版 ViT、CLIP 用的是这个。
2. mean pool。把 patch token 的输出隐藏状态取平均。SigLIP、DINOv2、绝大多数现代 VLM 用的是这个。
3. register token。Darcet 等人（2023）发现，训练时没有显式 sink token 的 ViT 会长出高范数的"伪影"patch，劫持自注意力。加 4–16 个可学习的 register token 能吸收这部分负载，提升密集预测（分割、深度）的质量。DINOv2 和 SigLIP 2 都自带 register。

这个选择对下游任务很要紧。CLS 用于分类没问题。对那些把 patch token 喂给 LLM 的 VLM，你完全跳过池化——每个 patch 都成为 LLM 的一个输入 token。register 在交接前会被丢掉（它们是脚手架，不是内容）。

### 预训练：监督、对比、掩码、自蒸馏

2020 年的 ViT 是在 JFT-300M 上用监督分类预训练的。很快就被取代：

- CLIP（2021）：在 4 亿对图文上做对比学习。见第 12.02 课。
- MAE（2021，He 等人）：掩掉 75% 的 patch，重建像素。自监督，纯图像就能跑。
- DINO（2021）/ DINOv2（2023）：师生自蒸馏，无标签、无 caption。2023 年的 DINOv2 ViT-g/14 是最强的纯视觉骨干，也是"密集特征"场景的默认选择。
- SigLIP / SigLIP 2（2023、2025）：用 sigmoid 损失的 CLIP，外加支持原生长宽比的 NaFlex。它是 2026 年开放 VLM（Qwen、Idefics2、LLaVA-OneVision）里占主导的视觉塔。

你选什么预训练，决定了这个骨干擅长什么：CLIP/SigLIP 适合与文本做语义匹配，DINOv2 适合密集视觉特征，MAE 适合作为下游微调的起点。

### 缩放定律

ViT 缩放（Zhai 等人 2022）确立了：ViT 的质量在模型规模、数据规模、算力上遵循可预测的规律。在固定算力下：
- 模型更大 + 数据更多 → 质量更好。
- patch 大小是在序列长度和保真度之间的一根杠杆。patch 14（DINOv2/SigLIP SO400m 的典型值）比 patch 16 每张图产出更多 token；OCR 和密集任务更好，速度更差。
- 分辨率是另一根大杠杆。从 224 升到 384 再到 512 几乎总是有帮助，代价是 FLOPs 的平方级增长。

ViT-g/14（10 亿参数，patch 14，分辨率 224 → 256 个 token）和 SigLIP SO400m/14（4 亿参数，patch 14）是 2026 年开放 VLM 的两个主力编码器。

### ViT 的参数量

完整计算在 `code/main.py` 里。以 224 分辨率的 ViT-B/16 为例：

```
patch_embed = 3 * 16 * 16 * 768 + 768  =  591k
cls + pos    = 768 + 197 * 768          =  152k
block        = 4 * 768^2 (QKVO) + 2 * 4 * 768^2 (MLP) + 2 * 2*768 (LN)
             = 12 * 768^2 + 3k          =  7.1M
12 blocks    = 85M
final LN    = 1.5k
total       ≈ 86M
```

在加载 checkpoint 之前，每个 ViT 都这么估一下。骨干的大小决定了任何下游 VLM 的显存下限。

### 2026 年的生产配置

2026 年大多数开放 VLM 出货时带的编码器是原生分辨率（NaFlex）下的 SigLIP 2 SO400m/14。它有：
- 4 亿参数。
- patch 大小 14，默认分辨率 384 → 每张图 729 个 patch token。
- 图像级任务用 mean pool；做 VQA 时全部 729 个 patch 都流进 LLM。
- 4 个 register token，交给 LLM 之前丢掉。
- 带图像级缩放的 2D-RoPE，支持原生长宽比。

这套配置里的每个决定，都能追溯到一篇你读得到的论文。

```figure
image-patch-tokens
```

## 实际使用

`code/main.py` 是一个 patch 分词器加几何计算器。它接收 (图像 H, W, patch P, 隐藏维度 D, 深度 L)，报告：

- 切 patch 后的网格形状和序列长度。
- 一张合成的 8x8 像素玩具图的 token 序列（走一遍摊平 + 投影的路径）。
- 按 patch embed、位置 embed、transformer 块、头分解的参数量。
- 目标分辨率下每次前向的 FLOPs。
- 一张对比表，横跨 ViT-B/16 @ 224、ViT-L/14 @ 336、DINOv2 ViT-g/14 @ 224、SigLIP SO400m/14 @ 384。

跑一下。把参数量和论文里公布的数字对上。改改 patch 大小和分辨率，体会 token 数量的代价。

## 拿去用

本节课产出 `outputs/skill-patch-geometry-reader.md`。给定一个 ViT 配置（patch 大小、分辨率、隐藏维度、深度），它产出 token 数量、参数量和显存估计，并附上理由。每当你要为某个 VLM 挑选视觉骨干时就用这个 skill——它能帮你避免"token 爆炸、LLM 上下文被塞满"的意外。

## 练习

1. 算一下 Qwen2.5-VL 在原生 1280x720 输入、patch 大小 14 下的 patch-token 序列长度。它跟只用 CLS 的表示相比如何？

2. 一帧 1080p（1920x1080）在 patch 14 下产出多少 token？以 30 FPS 跑一段 5 分钟的视频，总共多少个视觉 token？哪种手段帮你省得最多：池化、帧采样，还是 token 合并？

3. 用纯 Python 实现对 patch token 的 mean pooling。验证一下：对 DINOv2 输出的 196 个 token 做 mean-pool，结果是否与你向模型的 `forward` 请求池化嵌入时返回的一致。

4. 读《Vision Transformers Need Registers》（arXiv:2309.16588）的第 3 节。用两句话描述 register 吸收的是什么伪影，以及为什么这对下游密集预测很重要。

5. 修改 `code/main.py` 以支持 patch-n'-pack：给定一组不同分辨率的图像，产出单条打包好的序列和块对角注意力掩码。等你学到第 12.06 课时，拿那一课来验证。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|----------------|------------------------|
| Patch | "16x16 像素方块" | 输入图像中一块固定大小、互不重叠的区域；成为一个 token |
| Patch embedding | "线性投影" | 一个共享的可学习矩阵（或步长为 P 的 Conv2d），把摊平的 patch 像素映射成 D 维向量 |
| CLS token | "类别 token" | 拼在前面的可学习向量，其最终隐藏状态代表整张图；2026 年可选 |
| Register token | "sink token" | 额外的可学习 token，吸收 ViT 在预训练中长出的高范数注意力伪影 |
| Position embedding | "位置信息" | 让序列感知顺序的每位置向量或旋转；2D-RoPE 是现代默认方案 |
| Grid | "patch 网格" | 给定分辨率和 patch 大小下，patch 构成的 (H/P) x (W/P) 二维数组 |
| NaFlex | "原生灵活分辨率" | SigLIP 2 的特性：单个模型无需重训即可服务多种长宽比和分辨率 |
| Backbone | "视觉塔" | 预训练好的图像编码器，其 patch-token 输出在 VLM 里喂给 LLM |
| Pooling | "图像级摘要" | 把 patch token 变成一个向量的策略：CLS、mean、注意力池化或基于 register |
| Patch 14 与 16 | "更细的网格还是更粗的网格" | patch 14 每张图产出更多 token，OCR 保真度更好但更慢；patch 16 是经典默认值 |

## 延伸阅读

- [Dosovitskiy et al. — An Image is Worth 16x16 Words (arXiv:2010.11929)](https://arxiv.org/abs/2010.11929) —— 原版 ViT。
- [He et al. — Masked Autoencoders Are Scalable Vision Learners (arXiv:2111.06377)](https://arxiv.org/abs/2111.06377) —— MAE，自监督预训练。
- [Oquab et al. — DINOv2 (arXiv:2304.07193)](https://arxiv.org/abs/2304.07193) —— 大规模自蒸馏，无标签。
- [Darcet et al. — Vision Transformers Need Registers (arXiv:2309.16588)](https://arxiv.org/abs/2309.16588) —— register token 与伪影分析。
- [Tschannen et al. — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786) —— 2026 年的默认视觉塔。
- [Zhai et al. — Scaling Vision Transformers (arXiv:2106.04560)](https://arxiv.org/abs/2106.04560) —— 经验缩放定律。
