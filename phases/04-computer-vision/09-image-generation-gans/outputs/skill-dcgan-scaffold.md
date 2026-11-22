---
name: skill-dcgan-scaffold
description: 根据 z_dim、image_size 和 num_channels 生成完整的 DCGAN 脚手架，包含训练循环和样本保存
version: 1.0.0
phase: 4
lesson: 9
tags: [computer-vision, gan, dcgan, scaffolding]
---

# DCGAN 脚手架

给定三个参数，生成一个可运行的 DCGAN 项目骨架，架构规模按目标图像分辨率正确配置。

## 何时使用

- 在小数据集上开始新的生成实验。
- 用一个能跑的最小示例讲解 DCGAN 基础。
- 快速搭建条件 GAN 原型（标签注入在同一个脚手架里完成）。

## 输入

- `image_size`：32、64、128 之一（必须是 2 的幂）。
- `num_channels`：1（灰度）或 3（RGB）。
- `z_dim`：通常为 64 或 128。
- `with_spectral_norm`：yes | no；默认 yes。

## 架构规模

G 中转置卷积块的数量和 D 中带步长卷积块的数量取决于 `image_size`：

| image_size | G 块数 | D 块数 |
|------------|----------|----------|
| 32         | 4        | 4        |
| 64         | 5        | 5        |
| 128        | 6        | 6        |

每多一个块，空间尺寸翻倍（G）或减半（D）。特征通道数从 32 起步，按 `feat_base * 2^block_index` 增长。

## 输出文件

- `model.py`：Generator 和 Discriminator 类
- `train.py`：训练循环、损失、优化器配置
- `sample.py`：样本网格保存
- `config.json`：超参数
- `README.md`：10 行快速上手说明

## 报告

```
[scaffold]
  image_size:       <int>
  num_channels:     <int>
  z_dim:            <int>
  spectral_norm:    yes | no

[arch]
  G blocks:         <N>, channels: [list]
  D blocks:         <N>, channels: [list]
  G params (est):   <N>
  D params (est):   <N>

[training defaults]
  optimizer:   Adam(lr=2e-4, betas=(0.5, 0.999))
  batch_size:  64
  epochs:      50
  sample_every: 1 epoch

[files written]
  - model.py
  - train.py
  - sample.py
  - config.json
  - README.md
```

## 规则

- G 的输出一律用 `nn.Tanh()`，训练时把数据缩放到 [-1, 1]。
- D 中一律用 `LeakyReLU(0.2)`。
- 当 `with_spectral_norm == yes` 时，把 D 中每个卷积都用 `spectral_norm()` 包起来，并去掉 D 中的 BatchNorm。G 中保留 BatchNorm。
- image_size > 128 时不要生成脚手架：超过这个尺寸 DCGAN 会变得不稳定，引导用户改用 StyleGAN 或扩散模型。
