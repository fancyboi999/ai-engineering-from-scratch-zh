# 图像修补、扩展与编辑

> 文生图造新东西。Inpainting 修旧东西。生产里 70% 能计费的图像活儿是编辑——换背景、去 logo、扩画布、重画一只手。Inpainting 才是扩散赚钱的地方。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 8 · 07（潜空间扩散）、阶段 8 · 08（ControlNet 与 LoRA）
**预计时间：** ~75 分钟

## 问题背景

客户发来一张完美的产品照片，背景里有块碍眼的招牌。你想抹掉招牌，让别的地方逐像素一模一样。你不能从头跑文生图——结果会是不同的颜色、不同的光照、不同的产品角度。你想*只*重新生成被遮罩的区域，而且想让重新生成的部分尊重周围的上下文。

这就是 inpainting。变体有：

- **Inpainting（修补）。** 在遮罩内重新生成，遮罩外像素保留。
- **Outpainting（扩展）。** 在遮罩外（或画布之外）重新生成，遮罩内保留。
- **图像编辑。** 重新生成整张图，但对原图保持语义或结构上的忠实（SDEdit、InstructPix2Pix）。

2026 年每条扩散流水线都带一个 inpainting 模式。Flux.1-Fill、Stable Diffusion Inpaint、SDXL-Inpaint、DALL-E 3 Edit。它们都基于同一个原理工作。

## 核心概念

![Inpainting：遮罩感知的去噪 + 保上下文的重新注入](../assets/inpainting.svg)

### 朴素做法（以及它为什么是错的）

带一个遮罩跑标准文生图。每个采样步把带噪潜变量里非遮罩区域换成前向扩散后的干净图像。它能用……但很糟。边界伪影渗出来，因为模型对遮罩区域里有什么一无所知。

### 像样的 inpainting 模型

训一个改造过的 U-Net，输入是 9 个通道而不是 4 个：

```
input = concat([ noisy_latent (4ch), encoded_image (4ch), mask (1ch) ], dim=channel)
```

多出来的通道是 VAE 编码源图像的一份副本外加一个单通道遮罩。训练时你随机遮住图像的某些区域，训模型只给遮罩区域去噪，而非遮罩区域作为一个干净的条件信号给进去。推理时模型能「看见」遮罩区域周围有什么，产出连贯的补全。

SD-Inpaint、SDXL-Inpaint、Flux-Fill 都用这个 9 通道（或类似）输入。Diffusers 的 `StableDiffusionInpaintPipeline`、`FluxFillPipeline`。

### SDEdit（Meng et al., 2022）—— 免费编辑

给源图像加噪声加到某个中间的 `t`，再用一个新 prompt 把反向链从 `t` 跑到 0。不用重训。起点 `t` 的选择在忠实度和创作自由之间权衡：

- `t/T = 0.3` → 几乎与源图一致，小幅风格变化
- `t/T = 0.6` → 中等编辑，保住粗结构
- `t/T = 0.9` → 几乎从噪声生成，对源图保留极少

### InstructPix2Pix（Brooks et al., 2023）

在 `(输入图像, 指令, 输出图像)` 三元组上微调一个扩散模型。推理时同时以输入图像和一条文本指令为条件（「变成日落」「加一条龙」）。两个 CFG 强度：图像强度和文本强度。

### RePaint（Lugmayr et al., 2022）

保留一个标准的无条件扩散模型。每个反向步重新采样——偶尔跳回更噪的状态再重新生成。避免边界伪影。在你没有训好的 inpainting 模型时用。

```figure
inpaint-mask-reinject
```

## 动手构建

`code/main.py` 在 5 维数据上实现一个玩具一维 inpainting 方案。我们在 5 维混合数据上训一个 DDPM，每个样本是来自两个簇之一的 5 个浮点数。推理时我们「遮住」5 维里的 2 维，每步注入未遮住那 3 维的前向加噪版本，只重新生成被遮住的维度。

### 第 1 步：5 维 DDPM 数据

```python
def sample_data(rng):
    cluster = rng.choice([0, 1])
    center = [-1.0] * 5 if cluster == 0 else [1.0] * 5
    return [c + rng.gauss(0, 0.2) for c in center], cluster
```

### 第 2 步：在全部 5 维上训去噪器

标准 DDPM。网络对 5 维带噪输入输出 5 维噪声预测。

### 第 3 步：推理时，遮罩感知的反向

```python
def inpaint_step(x_t, mask, clean_image, alpha_bars, t, rng):
    # replace unmasked dims with a freshly noised version of the clean source
    a_bar = alpha_bars[t]
    for i in range(len(x_t)):
        if not mask[i]:
            x_t[i] = math.sqrt(a_bar) * clean_image[i] + math.sqrt(1 - a_bar) * rng.gauss(0, 1)
    # ...then run the normal reverse step on x_t
```

这是朴素做法，在玩具一维数据上能用。真实图像 inpainting 用 9 通道输入，因为纹理连贯性更要紧。

### 第 4 步：outpainting

Outpainting 就是把遮罩反过来的 inpainting：遮住新的（之前不存在的）画布，用原图填满其余部分。训练目标完全相同。

## 坑

- **接缝。** 朴素做法留下可见的边界，因为梯度信息不会跨遮罩流动。解法：把遮罩膨胀 8-16 像素，或者用一个像样的 inpainting 模型。
- **遮罩泄露。** 如果条件图像的非遮罩区域质量低或带噪，它会污染遮罩内的生成。稍微去噪或模糊一下。
- **CFG 与遮罩大小相互作用。** 小遮罩上用高 CFG = 饱和的块。小编辑就降低 CFG。
- **SDEdit 忠实度悬崖。** 从 `t/T = 0.5` 走到 `t/T = 0.6` 可能丢掉主体的身份。扫一遍并存检查点。
- **prompt 不匹配。** prompt 应描述*整张*图，而不只是新内容。「一只猫坐在椅子上」而不是「一只猫」。

## 实际使用

| 任务 | 流水线 |
|------|----------|
| 去掉物体、小遮罩 | SD-Inpaint 或 Flux-Fill，标准 prompt |
| 换天空 | SD-Inpaint + 「日落时的蓝天」 |
| 扩画布 | SDXL outpaint 模式（8px 羽化）或带 outpaint 遮罩的 Flux-Fill |
| 重画手 / 脸 | SD-Inpaint，prompt 重新描述主体 + ControlNet-Openpose |
| 改变某一区域的风格 | 在遮罩区域上 `t/T=0.5` 的 SDEdit |
| 「变成日落」 | InstructPix2Pix 或 Flux-Kontext |
| 替换背景 | SAM 遮罩 → SD-Inpaint |
| 超高保真 | 最难的情况用 Flux-Fill 或 GPT-Image（托管） |

SAM（Meta 的 Segment Anything，2023）+ 扩散 inpaint 是 2026 年的抠图流水线。SAM 2（2024）能用在视频上。

## 拿去用

存为 `outputs/skill-editing-pipeline.md`。技能接受一张原图 + 编辑描述 + 可选遮罩（或 SAM prompt），输出：遮罩生成做法、基模型、CFG 强度（图像 + 文本）、SDEdit-t 或 inpainting 模式，以及 QA 清单。

## 练习

1. **简单。** 在 `code/main.py` 里把被遮维度的比例从 0.2 变到 0.8。比例到多少时 inpaint 质量（遮罩维度上的残差）等于无条件生成？
2. **中等。** 实现 RePaint：每第 10 个反向步往回跳 5 步（加噪）再重新去噪。测量它是否减少了遮罩边缘的边界残差。
3. **困难。** 用 Hugging Face diffusers 在 20 个人脸重画任务上比较：SD 1.5 Inpaint + ControlNet-Openpose vs Flux.1-Fill。分别给姿态遵循和身份保留打分。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| Inpainting | 「填洞」 | 在遮罩内重新生成；遮罩外像素保留。 |
| Outpainting | 「扩画布」 | 在画布外重新生成；画布内保留。 |
| 9 通道 U-Net | 「像样的 inpainting 模型」 | 以 `noisy | encoded-source | mask` 为输入的 U-Net。 |
| SDEdit | 「带噪声级别的 img2img」 | 加噪到时间 `t`，用新 prompt 去噪。 |
| InstructPix2Pix | 「纯文本编辑」 | 在（图像，指令，输出）三元组上微调的扩散。 |
| RePaint | 「不用重训」 | 反向过程中周期性重新加噪以减少接缝。 |
| SAM | 「Segment Anything」 | 按点击或框生成遮罩；与 inpaint 配合。 |
| Flux-Kontext | 「带上下文编辑」 | 接受参考图像 + 指令做编辑的 Flux 变体。 |

## 生产笔记：编辑流水线对延迟敏感

编辑图像的用户期待 5 秒以内的往返。L4 上 1024² 的 30 步 SDXL-Inpaint 是 3-4 秒，再加 SAM 遮罩生成（约 200 ms）和 VAE 编码/解码（合计约 500 ms）。用生产的框架讲，这是 TTFT 受限而非吞吐受限——批 1、低并发、把每个阶段都压到最小：

- **SAM-H 是慢的那个。** SAM-H 在 1024² 约 200 ms；SAM-ViT-B 约 40 ms，质量略降。SAM 2（视频）增加时间维开销；别拿它做单图编辑。
- **能跳过编码就跳过。** `pipe.image_processor.preprocess(img)` 编码成潜变量。如果你手上有上一次生成的潜变量（迭代编辑 UI 里很典型），直接通过 `latents=...` 传进去，省一次 VAE 编码。
- **遮罩膨胀对吞吐也重要。** 小遮罩意味着 U-Net 前向大部分是浪费的（非遮罩像素反正会被钳住）。`diffusers` 的 `StableDiffusionInpaintPipeline` 无论如何都跑完整 U-Net；只有 9 通道的像样 inpaint 变体才利用遮罩省算力。
- **Flux-Kontext 是 2025 年的答案。** 对 `(源图像, 指令)` 单次前向——没有单独的遮罩，没有 SDEdit 噪声扫描。在 H100 上约 1.5 秒出一次编辑。架构上的教训：把这些阶段合并掉。

## 延伸阅读

- [Lugmayr et al. (2022). RePaint: Inpainting using Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2201.09865) —— 免训练 inpainting。
- [Meng et al. (2022). SDEdit: Guided Image Synthesis and Editing with Stochastic Differential Equations](https://arxiv.org/abs/2108.01073) —— SDEdit。
- [Brooks, Holynski, Efros (2023). InstructPix2Pix](https://arxiv.org/abs/2211.09800) —— 文本指令编辑。
- [Kirillov et al. (2023). Segment Anything](https://arxiv.org/abs/2304.02643) —— SAM，遮罩来源。
- [Ravi et al. (2024). SAM 2: Segment Anything in Images and Videos](https://arxiv.org/abs/2408.00714) —— 视频版 SAM。
- [Hertz et al. (2022). Prompt-to-Prompt Image Editing with Cross-Attention Control](https://arxiv.org/abs/2208.01626) —— 注意力层级的编辑。
- [Black Forest Labs (2024). Flux.1-Fill and Flux.1-Kontext](https://blackforestlabs.ai/flux-1-tools/) —— 2024 年的工具。
