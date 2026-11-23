---
name: skill-segmentation-mask-inspector
description: 报告类别分布、预测掩码统计，以及最可能预测不足或边界模糊的类别
version: 1.0.0
phase: 4
lesson: 7
tags: [computer-vision, segmentation, debugging, evaluation]
---

# 分割掩码检查器

"损失降下来了"和"掩码看起来真的对"之间有一道缝。这个诊断工具专门查这道缝。

## 何时使用

- 刚训练完，mIoU 看着不错，肉眼检查却不对劲。
- 部署前，对比预测与真实标注的类别分布。
- 大物体的逐类别 IoU 很高，小物体却很低。
- 排查边界伪影：它们像素数少，在 IoU 里体现不出来。

## 输入

- `preds`：(N, H, W) 的预测类别 ID 张量。
- `targets`：(N, H, W) 的真实类别 ID 张量。
- `num_classes`：整数。
- 可选 `class_names`：C 个字符串组成的列表。

## 步骤

1. **类别像素直方图。** 分别计算 `preds` 和 `targets` 中每个类别的像素占比。标记所有满足 `|pred% - gt%| / max(gt%, 1e-6) > 0.30`（相对偏差超过 30%）的类别。对于真实标注中不存在的类别（`gt% == 0`），只要预测占比超过 `0.3` 就直接标记。

2. **逐类别 IoU** 和 **逐类别边界 F1**。边界 F1 的算法是：把每个掩码膨胀 3 个像素，求交集，再打分。IoU > 0.7 但边界 F1 < 0.5 的类别，说明边缘被糊掉了。

3. **小目标 recall。** 把每个真实连通区域按尺寸分桶（tiny < 100 px，small < 1000 px，medium < 10000 px，large >= 10000 px）。按类别报告每个桶的 recall。如果小目标 recall 低于 0.3，而大目标 recall 高于 0.9，说明是分辨率 / 感受野的问题。

4. **混淆对。** 对每个类别，找出它最常被混淆成的类别（在其真实掩码内出现最多的错误预测类别）。报告排名前 3 的混淆对。

5. **饱和度检查（需要 `probs` 或 `logits`，仅有 `preds` 不够）。** 如果调用方传入了原始逐像素概率分布 `probs: (N, C, H, W)`，按类别计算 `probs.max(dim=1) > 0.99` 的像素比例。饱和度高（超过该类别像素的 0.9）说明模型过度自信，可以考虑标签平滑或校准。如果只有 argmax 后的 `preds`，跳过这一步，并在报告中注明。

## 报告格式

```
[mask-inspector]
  classes: C

[class distribution]
  name       gt %    pred %   delta
  ...

[metrics]
  class       IoU     bF1    recall_tiny  recall_small  recall_medium  recall_large
  ...

[confusion pairs]
  class A confused with class B: <N> pixels (most common)
  class B confused with class A: <N> pixels
  ...

[verdict]
  most impactful issue: <one sentence>
```

## 规则

- 类别行按真实像素占比降序排列，最常见的类别排在前面。
- IoU < 0.4 或边界 F1 < 0.3 的类别标记为 `critical`。
- 如果主要问题是小目标 recall，建议：提高训练分辨率、减小编码器最后一个 stage 的步长，或使用特征金字塔解码器。
- 如果主要问题是边界 F1，建议：使用边界感知损失（Lovasz 或 BoundaryLoss）、加水平翻转的 TTA，以及无步长解码器。
- 不要只用类别索引作为标识；如果提供了 `class_names`，每一行都要用上。
