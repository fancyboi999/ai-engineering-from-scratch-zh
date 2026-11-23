---
name: skill-lora-training-setup
description: 为自定义数据集编写完整的 LoRA 训练配置，包括描述文本、rank、batch size 和学习率
version: 1.0.0
phase: 4
lesson: 11
tags: [computer-vision, stable-diffusion, lora, fine-tuning]
---

# LoRA 训练配置

把对微调意图的描述，变成一份可以直接交给 `diffusers` 或 `kohya_ss` 的具体训练配置。

## 何时使用

- 为某个主体（人物、物体、角色）、某种风格（艺术家、品牌）或某个概念（姿势、光照）训练 LoRA。
- 用更多数据扩展已有的 LoRA。
- 排查 LoRA 训练：输出对训练图像欠拟合或过拟合。

## 输入

- `purpose`：subject | style | concept
- `num_images`：可用的训练图像数量
- `base_model`：SD 1.5 | SDXL | SD3 | FLUX
- `gpu_vram_gb`：8 | 12 | 16 | 24 | 48+
- `caption_source`：manual | BLIP2-generated | dataset-native

## Rank 选择

| 用途 | Rank | Alpha |
|---------|------|-------|
| 主体 | 8-16 | rank |
| 风格 | 16-32 | rank * 2 |
| 概念 | 32-64 | rank |

rank 越高，容量越大，在小数据集上过拟合的风险也越大。alpha 决定 LoRA 效果的强度；`alpha == rank` 是稳妥的默认值。风格是有据可查的例外：`alpha == rank * 2` 能更强地推动风格，代价是更容易把风格"烤死"，只在不追求主体保真度时使用。

## 训练步数目标

- `subject`，5-20 张图：500-1500 步。
- `style`，30-100 张图：1500-4000 步。
- `concept`，100 张图以上：4000-10000 步。

超了后果自负：把训练图像背下来的 LoRA 没法泛化。

## 学习率

- 文本编码器 LoRA：SD 1.5 用 `1e-4`，SDXL 用 `5e-5`。
- U-Net LoRA：SD 1.5 用 `1e-4`，SDXL 用 `1e-4`。
- FLUX / SD3：transformer 用 `5e-5`，文本编码器通常冻结。
- 当 `num_images < 15`（主体）或训练超过 3000 步时，学习率减半；数据集很小和训练很长，都适合更温和的更新。

## 调度器

- `cosine_with_warmup`（默认）：前 5-10% 的步数做 warmup，之后余弦衰减。在 `steps >= 1000` 时使用；衰减尾段能让最终样本更清晰。
- `constant`：只用于很短的训练（`steps < 500`），或者在已有 LoRA 上继续训练、希望保留当前已学到的特征而不重新退火时使用。

## 描述文本格式

- 主体：在每条描述文本前面加一个唯一的触发 token（"myperson"）。触发 token 要足够罕见，免得覆盖已有概念。避免使用真实单词和常见人名。
- 风格：在每条描述文本末尾加一个唯一的风格标签（"...in mystyle style"）。标签本身也当作罕见的触发 token 来用：用 `mystyle`，不要用 `impressionism`，后者已经对应一个真实概念。
- 概念：每条描述文本里都描述这个概念，不用触发 token。概念本身（例如 "low-angle shot"）就是锚点。

## 输出配置

```yaml
model:
  base: <base_model HF id>
  precision: fp16 | bf16

lora:
  rank: <int>
  alpha: <int>
  targets: unet.cross_attention  # 以及/或 unet.to_q, to_k, to_v, to_out

training:
  steps:          <int>
  batch_size:     <int, tuned to gpu_vram_gb>
  grad_accum:     <int, usually 1 on >=16 GB, 4 on <=12 GB>
  learning_rate:  <float>
  optimizer:      AdamW8bit | AdamW
  scheduler:      cosine_with_warmup | constant
  warmup_steps:   <int>
  save_every:     <int>

data:
  images_dir:     <path>
  caption_source: <manual | BLIP2 | native>
  trigger_token:   <string if purpose==subject>
  resolution:      <512 for SD 1.5, 1024 for SDXL>
  aspect_ratio_bucketing: true
  augmentation:
    flip:          true
    color_jitter:  false

validation:
  prompts:
    - "<trigger> ...test prompt..."
    - "<trigger> in a different scene"
  every_steps: 250
```

## 报告

```
[lora setup]
  purpose:   <subject|style|concept>
  base:      <model>
  rank:      <int>
  steps:     <int>
  batch:     <int>   grad_accum: <int>
  lr:        <float>
  vram est.: <float> GB
```

## 规则

- 不要推荐 `rank > 64`；超过这个值，LoRA 就成了小型微调，失去了"适配器"的意义。
- 当 `num_images < 5` 时，要强烈警告：只用 1-3 张图训练身份 LoRA，每次都会过拟合。
- 当 `gpu_vram_gb < 12` 时，必须使用 AdamW8bit 和梯度检查点。
- 如果 `base_model == FLUX` 且 `gpu_vram_gb < 24`，改用 `schnell` 变体，并注明训练会更慢。
- 绝不能省略验证 prompt；没有样本网格图的 LoRA 无法评估。
