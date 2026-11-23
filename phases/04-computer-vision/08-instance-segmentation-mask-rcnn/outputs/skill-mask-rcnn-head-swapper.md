---
name: skill-mask-rcnn-head-swapper
description: 为 torchvision Mask R-CNN 生成替换框头和掩码头的精确代码，适配自定义 num_classes
version: 1.0.0
phase: 4
lesson: 8
tags: [computer-vision, mask-rcnn, fine-tuning, torchvision]
---

# Mask R-CNN 头部替换器

专门为 Mask R-CNN 生成替换预测头的样板代码。下面的模板假定存在 `model.roi_heads.box_predictor` 和 `model.roi_heads.mask_predictor`，只有 `maskrcnn_resnet50_fpn` 和 `maskrcnn_resnet50_fpn_v2` 上才有这两个属性。Faster R-CNN 有框预测器但没有掩码预测器；RetinaNet 用的是 `RetinaNetHead`，根本没有 `roi_heads`。这两种模型都需要别的 skill。

## 何时使用

- 在自定义类别集上微调 `maskrcnn_resnet50_fpn` 或 `maskrcnn_resnet50_fpn_v2`。
- 把在 COCO 上训练的 Mask R-CNN checkpoint 迁移到非 COCO 的类别数。
- 排查因 `cls_score.out_features` 或 `mask_predictor` 不匹配而崩溃的 Mask R-CNN 训练。

## 不在范围内

- `fasterrcnn_*`：没有 mask_predictor。只替换 `box_predictor`；请使用单独的 Faster R-CNN 头部替换方案。
- `retinanet_*`：没有 `roi_heads`；分类头和回归头分别位于 `model.head.classification_head` 和 `model.head.regression_head`。请使用 RetinaNet 专用的 skill。
- `keypointrcnn_*`：用的是 `keypoint_predictor`，而不是 `mask_predictor`。

## 输入

- `model_name`：torchvision 检测模型构造函数，例如 `maskrcnn_resnet50_fpn_v2`。
- `num_classes`：包含背景类。数据集有 4 个物体类别，就是 `num_classes=5`。
- `freeze`：`backbone`、`backbone_fpn`、`none` 之一。

## 步骤

1. 导入模型构造函数和两个预测器类（`FastRCNNPredictor`、`MaskRCNNPredictor`）。
2. 加载带默认预训练权重的模型。
3. 用新的 `FastRCNNPredictor(in_features, num_classes)` 替换 `model.roi_heads.box_predictor`。
4. 用新的 `MaskRCNNPredictor(in_features_mask, hidden_layer=256, num_classes)` 替换 `model.roi_heads.mask_predictor`。
5. 应用指定的冻结策略。
6. 打印确认块，列出每个模块的可训练参数数量。

## 输出代码模板

```python
from torchvision.models.detection import {MODEL_NAME}, {MODEL_WEIGHTS}
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

def build_model(num_classes={NUM_CLASSES}):
    model = {MODEL_NAME}(weights={MODEL_WEIGHTS}.DEFAULT)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, 256, num_classes)

    {FREEZE_BLOCK}

    return model
```

其中 `{FREEZE_BLOCK}` 为：

- `none` -> 留空
- `backbone` ->
  ```python
  for p in model.backbone.parameters():
      p.requires_grad = False
  ```
- `backbone_fpn` ->
  ```python
  for p in model.backbone.parameters():
      p.requires_grad = False
  # FPN 参数位于 backbone.fpn 内
  ```

## 报告

```
[head-swap]
  model:         <MODEL_NAME>
  num_classes:   <N>  (includes background)
  freeze policy: <choice>
  trainable:     <N>
  total:         <N>
```

## 规则

- 给出的 `num_classes` 必须包含背景类；每次都要提醒用户。
- torchvision 检测模型有 `_v2` 版本时一律优先使用；它们的预训练权重比旧版更好。
- 不要在这个 skill 内部实例化模型，只生成代码块，由用户自己运行。
- 如果用户在超过 10,000 张图像的数据集上要求 `freeze backbone`，建议对方考虑把骨干网络也一起微调。
