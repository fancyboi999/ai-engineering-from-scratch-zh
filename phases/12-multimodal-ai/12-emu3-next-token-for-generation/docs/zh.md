# Emu3：用下一 token 预测做图像和视频生成

> BAAI 的 Emu3（Wang 等人，2024 年 9 月）是那个本该终结扩散 vs 自回归之争的 2024 年成果。单个 Llama 式的纯解码器 transformer，只用下一 token 预测目标训练，跨一个统一词表（文本 + VQ 图像 token + 3D VQ 视频 token），在图像生成上击败 SDXL，在感知上击败 LLaVA-1.6。没有 CLIP 损失。没有扩散调度。推理时为质量用了 classifier-free guidance，但核心训练目标是带 teacher forcing 的下一 token 预测。发表在 Nature 上。本节课通读 Emu3 论点——为什么更好的分词器加规模就是你需要的全部——并与扩散路线作对比。

**类型：** Learn
**语言：** Python（标准库，3D 视频分词器数学 + 自回归采样器骨架）
**前置要求：** Phase 12 · 11（Chameleon）
**预计时间：** ~120 分钟

## 学习目标

- 解释为什么 Emu3 的单损失下一 token 目标能work，尽管长期以来都假设图像质量需要扩散。
- 描述 3D 视频分词器：一个时空 VQ 码本长什么样，patch 为什么要跨时间。
- 在（训练算力、推理成本、质量天花板）上把 Emu3 与 Stable Diffusion XL 作比较。
- 说出同一个 Emu3 模型扮演的三种角色：Emu3-Gen（图像生成）、Emu3-Chat（感知）、Emu3-Stage2（视频生成）。

## 问题背景

一直到 2024 年的传统智慧是：图像生成需要扩散。论点是：离散图像 token 丢失太多信息以致无法重建细节，而自回归采样会跨数千个 token 累积误差。Stable Diffusion、DALL-E 3、Imagen、Midjourney 全用某种形式的扩散。Chameleon（第 12.11 课）在小规模上部分推翻了这个说法，但在质量上没追平 SDXL。

Emu3 正面攻击了这个论点。它的断言是：更好的视觉分词器 + 足够的规模 + 下一 token 损失 = 在同一个还做感知的模型里击败扩散的图像生成。

这个赌注在发表时有争议。两年过去，开源的统一生成家族（Emu3、Show-o、Janus-Pro、Transfusion）成了研究的默认路径；生产前沿模型似乎也用了某个变体。

## 核心概念

### Emu3 分词器

关键配料是视觉分词器。Emu3 训了一个定制的 IBQ 类分词器（Inverse Bottleneck Quantizer，SBER-MoVQGAN 家族），每个 token 做 8x8 的分辨率缩减。一张 512x512 的图在码本大小 32768 下变成 64x64 = 4096 个 token。

这比 Chameleon 在 K=8192 下每张 512x512 图的 1024 个 token 更多，但每个 token 更便宜（码本查找更小、编解码更简单）。关键指标是：重建 PSNR 30.5 dB，与 Stable Diffusion 在 32 dB 的连续潜空间旗鼓相当。

对视频：一个 3D VQ 分词器把一个时空 patch（4x4x4 像素）编码成一个整数。一段 4 秒、8 FPS 的片段有 32 帧；在 256x256、4x 空间和 4x 时间缩减下，token 数是 (256/4) * (256/4) * (32/4) = 64 * 64 * 8 = 32,768 个 token。

分词器质量是天花板。Emu3 的贡献有一部分是"我们训了一个非常好的分词器"。

### 单损失训练

Emu3 用一个目标：在跨文本 token、2D 图像 token 和 3D 视频 token 的共享词表上做下一 token 预测。训练中权重乘以模态专属系数来平衡贡献，但损失函数完全相同。

在以下混合数据上训练：
- 图像生成：`<text caption> <image> image_tokens </image>`
- 图像感知：`<image> image_tokens </image> <question> text_tokens`
- 视频生成：`<text caption> <video> video_tokens </video>`
- 视频感知：类似。
- 纯文本：标准 NTP。

模型从数据分布里学会什么时候吐图像 token、什么时候吐文本 token。生成从模型在 `<image>` 标签后预测图像 token 中涌现出来。

### classifier-free guidance 与温度

自回归图像生成在推理时用 classifier-free guidance（CFG）会好得多。Emu3 用了它：生成两次，一次带完整 caption，一次带空 caption，用一个 guidance 权重混合 logit（典型 3.0-7.0）。这就是扩散用的那个 CFG 戏法，借到了自回归场景。

温度很要紧：太高出伪影；太低出模式塌缩。Emu3 推荐的温度是感知 1.0、图像生成 0.8。

### 三种角色，一个模型

Emu3 以三个功能上不同的 API 出货，但底层是一套权重：

- Emu3-Gen。图像生成。输入文本，输出图像 token。
- Emu3-Chat。VQA 和看图说话。输入图像（token），输出文本。
- Emu3-Stage2。视频生成和视频 VQA。输入文本或视频，输出文本或视频。

没有任务专属头。只是不同的 prompt 模板。同一个 checkpoint。

### 基准

出自 Emu3 论文（2024 年 9 月）：

- 图像生成：在 MJHQ-30K FID 上击败 SDXL（5.4 vs 5.6），GenEval 总分（0.54 vs 0.55——统计意义上打平），Deep-Eval 的综合分持平。
- 图像感知：在 VQAv2 上击败 LLaVA-1.6（75.1 vs 72.4），在 MMMU 上大致持平。
- 视频生成：4 秒片段质量在 FVD 上与 Sora 时代公开基准的模型有竞争力。

数字不总是赢——Emu3 这里让一分、那里让一分——但"下一 token 预测就是你需要的全部"这个断言在各模态上站得住脚。

### 算力成本

Emu3 用一个 7B 参数模型在约 3000 亿个多模态 token 上训练。GPU 小时大致与 Llama-2-7B 预训练相当（A100 级硅上 2k-4k GPU-年）。Stable Diffusion 3 这类扩散模型在相近预算内训练，但需要独立的文本编码器和更复杂的流水线。

推理时，Emu3 每张图比 SDXL 慢：4096 个图像 token 以 30 tok/s 算，每张 512x512 图约 2 分钟，而 SDXL 是 2-5 秒。投机解码和 KV-cache 优化能缩小差距但关不上。自回归图像生成算力很重；这是长期存在的取舍。

### 为什么它重要

Emu3 的深层贡献是概念性的。如果下一 token 预测能扩展到在图像生成上追平扩散，那么统一模型路径（一个损失、一个骨干、任意模态）就是可行的。未来模型不需要独立的文本编码器、独立的扩散调度器、独立的 VAE。一个 transformer，每种模态一个分词器，加规模。

Show-o、Janus-Pro 和 InternVL-U 都建立在这个论点之上或对其发起挑战。一直到 2025 年，中国实验室（BAAI、DeepSeek）在这个方向上比美国实验室发表得更激进。

```figure
l5-emu3-next-token
```

## 实际使用

`code/main.py` 搭了两个玩具件：

- 一个 2D vs 3D VQ 分词器计数器：给定 (分辨率, patch, 片段长度, FPS)，算图像 vs 视频的 token 数。
- 一个带温度下 classifier-free guidance 的自回归图像 token 采样器。

CFG 实现与 Emu3 的配方一致——用一个 guidance 权重混合有条件和无条件 logit。

## 拿去用

本节课产出 `outputs/skill-token-gen-cost-analyzer.md`。给定一个生成产品规格（图像或视频、目标分辨率、质量档、延迟预算），它算出 token 数、推理成本，并在 Emu3 家族 vs 扩散之间挑选。

## 练习

1. Emu3 在 8x8 缩减下每张 512x512 图产出 4096 个 token。算出 1024x1024 和 2048x2048 的等价值。推理延迟会怎样？

2. 读 Emu3 第 3.3 节关于视频分词器的内容。描述 3D VQ 的 patch 形状，以及为什么是 4x4x4 而非 8x8x1。

3. classifier-free guidance 权重 5.0 vs 3.0：视觉效果有什么区别？在 `code/main.py` 里追一遍数学。

4. 算一下 Emu3-7B 在 300B token 上的训练 FLOPs，与 Stable Diffusion 3 作比较。哪个训练更贵？

5. Emu3 在 FID 上击败 SDXL，但在 VQAv2 上不及专用 VLM。解释为什么统一损失路线在不同基准上相对专家显示出不同的强项。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 下一 token 预测 | "NTP" | 标准自回归损失：给定 token[0..i] 预测 token[i+1]；分词后对每种模态都管用 |
| IBQ 分词器 | "逆瓶颈量化器" | 一类码本更大（32768+）、重建比 Chameleon 更好的 VQ-VAE |
| 3D VQ | "时空量化器" | 按 (时间, 行, 列) 索引的码本；一个 token 覆盖一个 4x4x4 像素方块 |
| classifier-free guidance | "CFG" | 用权重 gamma 混合有条件和无条件 logit；推理时提升图像质量 |
| 统一词表 | "共享 token" | 文本 + 图像 + 视频全从同一个整数空间取；模型预测接下来是哪种模态 |
| MJHQ-30K | "图像生成基准" | Midjourney 质量基准，含 3 万个 prompt；Emu3 在此报告 FID |

## 延伸阅读

- [Wang et al. — Emu3: Next-Token Prediction is All You Need (arXiv:2409.18869)](https://arxiv.org/abs/2409.18869)
- [Sun et al. — Emu: Generative Pretraining in Multimodality (arXiv:2307.05222)](https://arxiv.org/abs/2307.05222)
- [Liu et al. — LWM (arXiv:2402.08268)](https://arxiv.org/abs/2402.08268)
- [Yu et al. — MAGVIT-v2 (arXiv:2310.05737)](https://arxiv.org/abs/2310.05737)
- [Tian et al. — VAR (arXiv:2404.02905)](https://arxiv.org/abs/2404.02905)
