---
name: skill-vit-patch-and-pos-embed-inspector
description: 检查 ViT 的 patch 嵌入和位置嵌入形状是否与模型预期的序列长度一致
version: 1.0.0
phase: 4
lesson: 14
tags: [vision-transformer, debugging, pytorch]
---

# ViT Patch 与位置嵌入检查器

移植 ViT 时最常见的 bug：把在 224x224 上预训练的 checkpoint 加载进配置为 384x384 的模型（或者反过来）。位置嵌入的序列长度不对，模型会悄无声息地输出垃圾。

## 何时使用

- 以非默认分辨率微调预训练 ViT。
- 排查 ViT-B/16 和 ViT-B/32 之间权重移植失败的原因；检查器会标出 patch 尺寸不匹配，让调用方知道应该换架构，而不是强行移植。
- 排查 ViT 加载不报错、训练效果却很差的问题。

## 输入

- `model`：已实例化的 ViT `nn.Module`。
- `expected_image_size`：模型在生产环境中看到的 H x W。
- `patch_size`：预期的 patch 尺寸。

## 步骤

1. 找到模型内部的 patch 嵌入卷积。报告它的 `kernel_size`、`stride`、`in_channels`、`out_channels`。
2. 计算预期的 patch 数量。方形图像：`(image_size / patch_size)^2`。矩形图像：`(H / patch_size) * (W / patch_size)`。要求 `H % patch_size == 0` 且 `W % patch_size == 0`；否则标记出来并拒绝继续。
3. 找到可学习的位置嵌入。报告它的形状 `(1, N, dim)`。
4. 把 `N` 与 `num_patches + 1`（有 CLS）或 `num_patches`（无 CLS）比较。不匹配说明 checkpoint 是在不同的分辨率或 patch 尺寸下预训练的。
5. 检查 patch 卷积的 `out_channels` 是否等于位置嵌入的 `dim`。
6. 如果模型需要为新分辨率插值位置嵌入，确认插值工具存在（大多数 `timm` ViT 会通过 `resize_pos_embed` 自动完成）。

## 报告

```
[vit-inspector]
  image_size:         HxW
  patch_size:         <int>
  num_patches (computed): <int>
  patch_conv:         k=<int>  s=<int>  in=<int>  out=<int>
  pos_embed shape:    (1, N, dim)
  has CLS token:      yes | no
  pos_embed N:        <int>    expected: <int>
  verdict:            ok | mismatch

[if mismatch]
  action:  reinitialise pos_embed for new sequence length
  tool:    timm.models.vision_transformer.resize_pos_embed
```

## 规则

- 绝不在没有警告的情况下悄悄插值；要把这个动作说出来，让用户知道预训练的位置结构可能已经偏移。
- 如果 patch_size 不匹配，拒绝推荐插值，改为换成正确的架构。
- 不要尝试原地修复模型；只报告并给出建议。
