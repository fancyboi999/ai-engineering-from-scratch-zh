# 视频生成

> 图像是一个二维张量。视频是一个三维张量。理论是一样的；算力难 10-100 倍。OpenAI 的 Sora（2024 年 2 月）证明了这事可行。到 2026 年，Veo 2、Kling 1.5、Runway Gen-3、Pika 2.0、WAN 2.2 都能从文本生产 1080p 视频——而开源权重那一栈（CogVideoX、HunyuanVideo、Mochi-1、WAN 2.2）落后 12 个月。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 8 · 07（潜空间扩散）、阶段 7 · 09（ViT）、阶段 8 · 06（DDPM）
**预计时间：** ~45 分钟

## 问题背景

一段 24fps、10 秒的 1080p 视频是 240 帧 1920×1080×3 像素。每个片段约 1.5 GB 原始数据。像素空间扩散行不通。你需要：

1. **时空压缩。** 一个 VAE，编码的是视频而不是帧，编成一串时空 patch。
2. **时间连贯性。** 帧之间在数秒内需要共享内容、光照和物体身份。网络得给运动建模。
3. **算力预算。** 同样的模型大小下，视频训练比图像贵 10-100 倍。
4. **条件化。** 文本、图像（首帧）、音频，或另一段视频。大多数生产模型这四个全接受。

解决这个问题的架构是把 **Diffusion Transformer（DiT）** 应用到时空 patch 上，在巨大的（prompt，caption，视频）数据集上训练。损失和第 06 课的扩散损失一样。

## 核心概念

![视频扩散：切 patch、DiT、解码](../assets/video-generation.svg)

### 切 patch

用一个 3D VAE（学出来的时空压缩）编码视频。潜变量形状为 `[T_latent, H_latent, W_latent, C_latent]`。切成大小 `[t_p, h_p, w_p]` 的 patch。对 Sora 风格的模型，`t_p = 1`（逐帧 patch）或 `t_p = 2`（每两帧）。一段 10 秒的 1080p 视频压成约 2 万到 10 万个 patch。

### 时空 DiT

一个 transformer 处理这串拉平的 patch 序列。每个 patch 有一个 3D 位置嵌入（时间 + y + x）。注意力通常是因式分解的：

- **空间注意力** 在每一帧的 patch 内部。
- **时间注意力** 跨帧、在相同空间位置上。
- **完整 3D 注意力** 贵 16-100 倍；只在低分辨率或研究中用。

### 文本条件化

用一个大文本编码器做交叉注意力（Sora 用 T5-XXL，CogVideoX-5B 也用 T5-XXL）。长 prompt 很关键——Sora 的训练集有 GPT 生成的密集重新描述，平均每片段 200 个 token。

### 训练

在时空潜变量上做标准扩散损失（ε 或 v 预测）。数据：网络视频 + 约 1 亿个精选片段 + 合成文本描述。算力：哪怕一次小的研究运行也要 1 万+ GPU 小时；Sora 级别是 10 万+。

## 2026 年的生产格局

| 模型 | 日期 | 最长时长 | 最高分辨率 | 开源权重？ | 亮点 |
|-------|------|--------------|---------|---------------|--------|
| Sora（OpenAI） | 2024-02 | 60s | 1080p | 否 | 第一个在规模上展现世界模拟器特性的模型 |
| Sora Turbo | 2024-12 | 20s | 1080p | 否 | 推理快 5 倍的生产版 Sora |
| Veo 2（Google） | 2024-12 | 8s | 4K | 否 | 2025 年最高质量 + 物理 |
| Veo 3 | 2025 Q3 | 15s | 4K | 否 | 原生音频和更强的镜头控制 |
| Kling 1.5 / 2.1（快手） | 2024-2025 | 10s | 1080p | 否 | 2025 Q1 最佳人体运动 |
| Runway Gen-3 Alpha | 2024-06 | 10s | 768p | 否 | 上层有专业视频工具 |
| Pika 2.0 | 2024-10 | 5s | 1080p | 否 | 最强角色一致性 |
| CogVideoX（THUDM） | 2024 | 10s | 720p | 是（2B、5B） | 第一个开源的 5B 级视频 |
| HunyuanVideo（腾讯） | 2024-12 | 5s | 720p | 是（13B） | 2024 年底开源 SOTA |
| Mochi-1（Genmo） | 2024-10 | 5.4s | 480p | 是（10B） | 许可最宽松 |
| WAN 2.2（阿里巴巴） | 2025-07 | 5s | 720p | 是 | 2025 年中最强开源模型 |

开源权重追赶差距的速度比图像领域快：到 2026 年中，HunyuanVideo + WAN 2.2 的 LoRA 已经驱动了大多数开源工作流。

```figure
video-diffusion-denoise
```

## 动手构建

`code/main.py` 模拟时空 DiT 的核心想法：把一段小的合成视频切 patch，加上逐 patch 的位置嵌入，用一个 transformer 风格的、跨 patch 的注意力给整个序列去噪。不用 numpy；纯 Python。我们表明即便在一维下，当相邻帧的 patch 共享一个去噪器和位置嵌入时，时间连贯性也会涌现。

### 第 1 步：把一段合成的一维「视频」切 patch

```python
def make_video(T_frames=8, rng=None):
    # a "video" is a sequence of 1-D values following a smooth trajectory
    base = rng.gauss(0, 1)
    return [base + 0.3 * t + rng.gauss(0, 0.1) for t in range(T_frames)]
```

### 第 2 步：逐帧的位置嵌入

```python
def pos_embed(t, dim):
    return sinusoidal(t, dim)
```

### 第 3 步：去噪器看到整个序列

我们的迷你网络不是逐帧独立去噪，而是把所有帧值 + 它们的位置嵌入拼起来，联合预测所有帧的噪声。

### 第 4 步：时间连贯性测试

训练后，采一段视频。测量逐帧的差量。如果模型学到了时间结构，这些差量会比逐帧独立采样时更小。

## 坑

- **逐帧独立采样 = 闪烁。** 如果你对每一帧分别跑图像扩散，输出会闪烁，因为每帧的噪声是独立的。视频扩散通过注意力或共享噪声把帧耦合起来来修这个问题。
- **朴素 3D 注意力 = 显存爆。** 在 10 秒 1080p 潜变量上做完整 3D 注意力是几千亿次操作。因式分解成空间 + 时间。
- **数据描述比规模更重要。** Sora 相对先前工作的主要升级是训练在详细约 10 倍的描述上（GPT-4 重新标注的片段）。OpenAI 的技术报告对此说得很明确。
- **首帧条件化。** 大多数生产模型也接受一张图像作首帧。这是「图生视频」模式；训练包含这个变体。
- **物理漂移。** 长片段（>10s）会累积细微的不一致。滑动窗口生成 + 关键帧锚定有帮助。

## 实际使用

| 使用场景 | 2026 年的选择 |
|----------|-----------|
| 最高质量文生视频、托管 | Veo 3 或 Sora |
| 带镜头控制的电影感 | 带运动笔刷的 Runway Gen-3 |
| 跨片段的角色一致性 | Pika 2.0 或 Kling 2.1 |
| 开源权重、快速微调 | WAN 2.2 + LoRA |
| 图生视频 | WAN 2.2-I2V、Kling 2.1 I2V，或 Runway |
| 音频到视频的口型同步 | Veo 3（原生音频）或一个专用口型同步模型 |
| 视频编辑 | Runway Act-Two、Kling Motion Brush、Flux-Kontext（静帧） |

在质量持平的前提下，每秒视频的成本在 2024 到 2026 年间降了 20 倍。

## 拿去用

存为 `outputs/skill-video-brief.md`。技能接受一份视频需求（时长、宽高比、风格、镜头方案、主体一致性、音频），输出：模型 + 托管、prompt 脚手架（镜头语言、主体描述、运动描述符）、种子 + 可复现流程，以及一份帧级 QA 清单。

## 练习

1. **简单。** 在 `code/main.py` 里比较 (a) 逐帧独立采样、(b) 联合序列采样 的逐帧差量。报告差量的均值和方差。
2. **中等。** 加一个首帧条件：把第 0 帧钉到一个给定值，采样其余帧。测量钉住的值如何传播。
3. **困难。** 用 HuggingFace diffusers 在本地 GPU 上跑 CogVideoX-2B。为一段 6 秒片段在 720p 下计时 20 个推理步。剖析时空注意力以定位瓶颈。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| 视频 VAE | 「3D VAE」 | 把 `(T, H, W, C)` 压成时空潜变量的编码器。 |
| Patch | 「那些 token」 | 潜变量的固定大小 3D 块；DiT 的输入。 |
| 因式分解注意力 | 「空间 + 时间」 | 先对空间再对时间做注意力；跳过完整 3D 注意力。 |
| 图生视频（I2V） | 「让这张照片动起来」 | 模型接受一张图像 + 文本，输出一段从它开始的视频。 |
| 关键帧条件化 | 「锚定帧」 | 钉住特定帧来控制视频的走向。 |
| 运动笔刷 | 「方向提示」 | 一种 UI 输入，用户在图像上画出运动向量。 |
| 重新描述 | 「密集描述」 | 用一个 LLM 给训练片段重新打上详细的 prompt 标注。 |
| 闪烁 | 「时间伪影」 | 逐帧的不一致；用耦合去噪修复。 |

## 生产笔记：视频潜变量是一个内存带宽问题

一段 24 fps、10 秒的 1080p 片段是 240 帧 × 1920 × 1080 × 3 ≈ 1.5 GB 原始像素。经过一个 4 倍的视频 VAE 压缩（`2 × 空间 × 2 × 时间`），每个请求的潜变量约 100 MB。在批 1 下把它过一个时空 DiT 跑 30 步，你每步要在 HBM 里搬约 3 GB——瓶颈是内存带宽，不是 FLOPs。

三个生产旋钮，全都直接来自生产推理文献的推理章节：

- **DiT 上做 TP。** 文生视频模型动辄 ≥10B 参数。跨 4 块 H100 做 TP=4 是标准；405B 级的模型用 PP=2 × TP=2。每步延迟随 TP 大致线性下降，直到撞上 all-reduce 墙。
- **帧批处理 = 连续批处理。** 生成时，视频在概念上是一批由注意力连起来的帧。连续批处理（in-flight 调度）适用：如果模型架构允许滑动窗口生成，就在返回帧 `t-1` 的同时开始渲染帧 `t+1`。
- **片段级 prefill 缓存。** 对图生视频，首帧条件化类似于 LLM 的 prompt prefill：算一次，在时间解码器的各趟里复用。这实际上是视频版的 KV-cache。

## 延伸阅读

- [Brooks et al. (2024). Video generation models as world simulators](https://openai.com/index/video-generation-models-as-world-simulators/) —— Sora 技术报告。
- [Yang et al. (2024). CogVideoX: Text-to-Video Diffusion Models with An Expert Transformer](https://arxiv.org/abs/2408.06072) —— CogVideoX。
- [Kong et al. (2024). HunyuanVideo: A Systematic Framework for Large Video Generative Models](https://arxiv.org/abs/2412.03603) —— HunyuanVideo。
- [Genmo (2024). Mochi-1 Technical Report](https://www.genmo.ai/blog/mochi) —— Mochi-1。
- [Alibaba (2025). WAN 2.2](https://wanvideo.io/) —— 2025 年中开源 SOTA。
- [Ho, Salimans, Gritsenko et al. (2022). Video Diffusion Models](https://arxiv.org/abs/2204.03458) —— 视频扩散的奠基论文。
- [Blattmann et al. (2023). Align your Latents (Video LDM)](https://arxiv.org/abs/2304.08818) —— Stable Video Diffusion 的前身。
