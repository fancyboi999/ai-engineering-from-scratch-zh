# 任意分辨率视觉：Patch-n'-Pack 与 NaFlex

> 真实图像不是 224x224 的方块。一张收据是 9:16，一张图表是 16:9，一张医学扫描可能是 4096x4096，一张手机截图是 9:19.5。2024 年之前的 VLM 答案——把一切都缩成固定方块——丢掉了让 OCR、文档理解和高分辨率场景解析得以运作的信号。NaViT（Google，2023）证明了你可以用块对角掩码把可变分辨率的 patch 打包进单个 transformer batch。Qwen2-VL 的 M-RoPE（2024）彻底扔掉了绝对位置表。LLaVA-NeXT 的 AnyRes 把高分辨率图切成基础图 + 子图。SigLIP 2 的 NaFlex 变体（2025）如今是那些想用单个 checkpoint 服务所有长宽比的开放 VLM 的默认编码器。本节课从头到尾实现 patch-n'-pack。

**类型：** Build
**语言：** Python（标准库，patch 打包器 + 块对角掩码）
**前置要求：** Phase 12 · 01（ViT patch）、Phase 12 · 05（LLaVA）
**预计时间：** ~120 分钟

## 学习目标

- 把一批可变分辨率图像的 patch 打包进一条序列，并构建块对角注意力掩码。
- 为给定任务在 AnyRes 切块（LLaVA-NeXT）、NaFlex（SigLIP 2）、M-RoPE（Qwen2-VL）之间做选择。
- 在不缩放的前提下计算 OCR、图表和摄影图的 token 预算。
- 说出方块缩放的三种失败模式：被挤扁的文字、被裁掉的内容、浪费在填充上的 token。

## 问题背景

Transformer 期望一条序列。一个 batch 是一摞相同长度的序列。如果你的图都是 224x224，那每次都得到 196 个 patch token，不用填充，搞定。在 224 上训，在 224 上推，从此再不用想分辨率的事。

可世界不配合。文档是竖版（8.5x11 英寸，约 2:3）。图表截图是横版（16:9）。收据又高又窄（1:3）。医学影像出货时是 2048x2048 或更大。手机设备截图是 1170x2532（0.46:1）。

2024 年之前的三个选项，以及它们各自为什么失败：

1. 缩成固定方块（224x224 或 336x336）。挤压会扭曲文字和人脸。降采样会毁掉图表标签和 OCR 内容。这是 LLaVA-1.5 之前的标准做法。
2. 裁成固定长宽比。你扔掉了图像大部分，而选裁剪位置本身又是个视觉问题。
3. 填充到最长边。修好了扭曲，但竖版图有 50%+ 的 token 浪费在填充上。所有这些填充 token 还要付平方级的注意力成本。

2024-2025 的答案是：让 transformer 在图像原生分辨率下吃 patch，并想清楚怎么把一个异质 batch 打包进一条序列而不浪费算力。

## 核心概念

### NaViT 与 patch-n'-pack

NaViT（Dehghani 等人，2023）是证明这套能大规模运作的论文。想法很机械：

1. 对 batch 里每张图，在选定的 patch 大小（比如 14）下算出它的原生 patch 网格。
2. 把每张图的 patch 摊平成它自己的变长序列。
3. 把所有图的 patch 拼成 batch 的一条长序列。
4. 构建块对角注意力掩码，让图 A 的 patch 只在图 A 内部相互关注。
5. 携带每个 patch 的位置信息（2D RoPE 或分数位置嵌入）。

三张图——336x336（576 token）、224x224（256 token）、448x336（768 token）——的一个 batch 变成一条 1600-token 序列，配一个 1600x1600 的块对角掩码。没有填充。没有浪费算力。transformer 处理任意长宽比。

NaViT 还引入了训练时的分数 patch 丢弃——在整个 batch 上随机丢 50% 的 patch——既正则化又加速训练。SigLIP 2 继承了这个。

### AnyRes（LLaVA-NeXT）

LLaVA-NeXT 的 AnyRes 是务实的替代方案。给定一张高分辨率图和一个固定编码器（336 下的 CLIP 或 SigLIP），把图切块：

1. 从一组预定义布局——(1x1)、(1x2)、(2x1)、(1x3)、(3x1)、(2x2) 等——里挑一个最契合图像长宽比的网格布局。
2. 把整张图切进网格；每个 tile 成为一个 336x336 裁块。
3. 还产出一张缩略图：整张图缩到 336x336 作为全局上下文 token。
4. 让每个 tile 过那个冻结的 336 编码器。拼接 tile token + 缩略图 token。

一张 672x672 的图用 2x2 网格加缩略图：4 * 576 + 576 = 2880 个视觉 token。贵但有效——LLM 既看到局部细节又看到全局上下文。

当你的编码器被冻结且只支持一种分辨率时，AnyRes 是首选路线。它会让大图的 token 数爆炸（一张 1344x1344 的图用 4x4 网格是 9216 + 576 ≈ 9800 个 token，能塞满一个 8k LLM 上下文的大部分）。

### M-RoPE（Qwen2-VL）

Qwen2-VL 引入了多模态旋转位置嵌入。不用 NaViT 的分数位置或 AnyRes 的切块加缩略图，每个 patch 携带一个 3D 位置（时间、高、宽）。query/key 旋转处理任意 H、W 和时间长度。

M-RoPE 不用重训就自带原生动态分辨率。推理时你喂任意 HxW 图，patch 嵌入器产出 H/14 x W/14 个 token，每个 token 拿到它的 (t=0, r=行, c=列) 位置，RoPE 用正确的频率旋转注意力，搞定。Qwen2.5-VL 和 Qwen3-VL 延续这个。InternVL3 的 V2PE 是同样的想法，每种模态用可变编码。

与 AnyRes 不同，M-RoPE 在原生分辨率下是 O(H x W / P^2) 个 token——没有切块的乘性开销。与 NaViT 不同，它仍然期望每次前向一张图。跨分辨率批处理仍需在它之上叠 patch-n'-pack。

### NaFlex（SigLIP 2）

NaFlex 是 SigLIP 2 checkpoint 的原生灵活模式。单个模型在推理时服务多种序列长度（256、729、1024 token）。内部它在训练时用 NaViT 式的 patch-n'-pack，每个 patch 用绝对分数位置。卖点是：一个 checkpoint，推理时按任务挑你的 token 预算。

语义任务（分类、检索）用 256 token。OCR 或图表理解用 1024 token。不用重训。

### 打包掩码

块对角掩码是大多数实现栽跟头的地方。对一条长度为 `N_total`、覆盖图像 `i=0..B-1`（各自长度 `n_i`）的打包序列，形状为 `(N_total, N_total)` 的掩码 `M`：当两个索引都落在同一张图的块里时为 1，否则为 0。你可以从一个累计长度列表构建它：

```
offsets = [0, n_0, n_0+n_1, ..., N_total]
M[i, j] = 1 iff there exists b where offsets[b] <= i < offsets[b+1] and offsets[b] <= j < offsets[b+1]
```

在 PyTorch 里用 `torch.block_diag` 或一次显式 gather 就是一行。FlashAttention 的变长路径（`cu_seqlens`）完全跳过掩码，直接用累计长度张量在各序列内部做注意力——对典型 batch 比稠密掩码快约 10 倍。

### token 预算

按任务挑你的策略：

- OCR / 文档：1024-4096 token。1024 下的 SigLIP 2 NaFlex，或 AnyRes 3x3 + 缩略图。
- 图表与 UI：384-448 原生下 729-1024 token。带最大像素上限的 Qwen2.5-VL 动态分辨率。
- 自然照片：256-576 token 就够。下游 LLM 看得够多。把 token 花在内容密度高的地方。
- 视频：空间池化后每帧 64-128 token，2-8 FPS。第 12.17 课讲这个。

2026 年的生产法则：为每个任务挑一个最大像素上限，在该上限内以原生长宽比编码，打包 batch，跳过填充。Qwen2.5-VL 暴露了 `min_pixels` 和 `max_pixels`，正是这根旋钮。

```figure
mm-patch-n-pack
```

## 实际使用

`code/main.py` 为一个异质图像 batch（整数像素坐标）实现了 patch-n'-pack。它：

- 接收一组 (H, W) 图像尺寸。
- 在 patch 大小 14 下算出每张图的 patch 序列长度。
- 把它们打包进一条总长 `sum(n_i)` 的序列。
- 构建块对角注意力掩码（为清晰起见用稠密版）。
- 把打包成本与方块缩放、AnyRes 切块作对比。
- 为一个混合 batch（收据、图表、截图、照片）打印 token 预算表。

跑一下。掉出来的那些数字，就是每个 2026 年开放 VLM 都用 patch-n'-pack 的原因。

## 拿去用

本节课产出 `outputs/skill-resolution-budget-planner.md`。给定一个混合长宽比的工作负载（OCR、图表、照片、视频帧）和一个总 token 预算，它挑出正确的策略（NaFlex、AnyRes、M-RoPE 或固定方块），并产出每请求的配置。当你为某个产品给 VLM 定规格时就用这个 skill——它能避免那种悄无声息、压垮延迟预算的 10 倍 token 暴涨。

## 练习

1. 一张收据是 600x1500（1:2.5）。在 patch 大小 14 下有多少原生分辨率 token？方块缩放到 336 后有多少？实践中哪个损失的 OCR 准确率更多？

2. 为一个长度分别为 256、576、729、1024 的四图 batch 构建块对角掩码。验证注意力矩阵是 2585x2585，且恰好有 `256^2 + 576^2 + 729^2 + 1024^2` 个非零项。

3. 对一张 1792x896、patch 14 的图，对比：(a) 缩成方块 336 再编码，(b) AnyRes 2x1 + 缩略图，(c) 原生下的 M-RoPE。哪个用的 token 最少？哪个保留的细节最多？

4. 实现分数 patch 丢弃：给定一条打包序列，均匀随机丢 50% 的 token，并相应更新块对角掩码。测一下掩码稀疏度的变化。

5. 读 Qwen2-VL 论文（arXiv:2409.12191）第 3.2 节。用两句话描述 `min_pixels` 和 `max_pixels` 控制什么，以及为什么两个边界都重要。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| Patch-n'-pack | "NaViT 式打包" | 把来自不同图像的变长 patch 序列拼进一个 batch 维度 |
| 块对角掩码 | "打包掩码" | 把每张图的 patch 限制为只关注自己、不关注打包里的邻居的注意力掩码 |
| AnyRes | "LLaVA-NeXT 切块" | 把高分辨率图切成固定大小 tile 的网格外加一张全局缩略图；用固定编码器编码每个 tile |
| NaFlex | "SigLIP 2 原生灵活" | 单个 SigLIP 2 checkpoint，推理时无需重训即可服务 256/729/1024-token 预算 |
| M-RoPE | "多模态 RoPE" | 3D 旋转位置编码（时间、行、列），无需位置表即可处理任意 H、W、T |
| cu_seqlens | "FlashAttention 打包" | FlashAttention 变长路径用的累计长度张量，替代稠密块对角掩码 |
| min_pixels / max_pixels | "分辨率边界" | Qwen2.5-VL 的每请求旋钮，对极小或极大输入封顶 token 数 |
| 视觉 token 预算 | "每张图多少 token" | 每张图产出的 patch token 粗略数；决定 LLM 的 prompt 预算和注意力成本 |

## 延伸阅读

- [Dehghani et al. — Patch n' Pack: NaViT (arXiv:2307.06304)](https://arxiv.org/abs/2307.06304)
- [Wang et al. — Qwen2-VL (arXiv:2409.12191)](https://arxiv.org/abs/2409.12191)
- [Laurençon et al. — What matters when building vision-language models? (Idefics2, arXiv:2405.02246)](https://arxiv.org/abs/2405.02246)
- [Tschannen et al. — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786)
- [Qwen Team — Qwen2.5-VL Technical Report (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
