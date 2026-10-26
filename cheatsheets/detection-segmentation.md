---
id: detection-segmentation
title: 检测与分割对比
code: DC
subtitle: 比较边界框、像素掩码、实例掩码、关键点与文本提示掩码的输出、损失、指标和修正方法。
hue: 355
sources: phases/04-computer-vision/06-object-detection-yolo, phases/04-computer-vision/07-semantic-segmentation-unet, phases/04-computer-vision/08-instance-segmentation-mask-rcnn, phases/04-computer-vision/21-keypoint-pose, phases/04-computer-vision/24-sam3-open-vocab-segmentation
source_hash: fffbbb6f6a8c59c8
---

## 任务对比
type: comparison
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/21-keypoint-pose/docs/zh.md, phases/04-computer-vision/24-sam3-open-vocab-segmentation/docs/zh.md

| 任务 | 输出 | 指标 |
|---|---|---|
| 检测（YOLO） | `(N, H, W, num_anchors, 5 + C)` | mAP@0.5:0.95、AP@0.5 |
| 语义分割（U-Net） | `(N, C, H, W)` | 每类 IoU、mIoU、Dice |
| 实例分割（Mask R-CNN） | `(N, 1, H, W)` | 掩码 AP 与框 mAP |
| 姿态估计（热图） | `(N, K, H, W)` | OKS、PCK |
| 开放词汇（SAM 3） | 框、标签、分数、掩码、ID | 掩码 IoU |

## 按场景选择
type: concepts
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/21-keypoint-pose/docs/zh.md, phases/04-computer-vision/24-sam3-open-vocab-segmentation/docs/zh.md

- **YOLO 类检测器**：一次前向传播实时输出框与类别。
- **U-Net 语义分割**：每个像素一个类别。相接的两辆车会成为一片区域。
- **Mask R-CNN 实例分割**：每个对象一个掩码，即使对象属于同一类别。
- **全景分割**：每个像素分配类别，每个实例分配唯一 ID。
- **自顶向下姿态估计**：准确率最高。成本随人数增长。
- **自底向上姿态估计**：适合人群场景，耗时不随人数改变。
- **SAM 3**：一次前向传播为名词短语生成掩码与实例 ID。
- **Grounded SAM 2 或 YOLO-World**：需要替换检测器或使用其他许可时；高帧率边界框检测选 YOLO-World。

## Mask R-CNN
type: architecture
from: phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

```arch
node | img | 1,1 | 输入 | 图像张量 | client
node | bb | 2,1 | ResNet 骨干 | 步幅 4、8、16、32 | model
node | fpn | 3,1 | FPN | 自顶向下与横向连接
node | rpn | 4,1 | RPN | 约 1000 个候选框，NMS 0.7
node | ra | 4,2 | RoIAlign | 双线性插值，不取整
node | bh | 3,2 | 框预测头 | 分类与细化
node | mh | 2,2 | 掩码预测头 | 每类 28x28
node | out | 1,2 | 输出 | 框、类别、掩码
edge | img | bb |
edge | bb | fpn |
edge | fpn | rpn |
edge | rpn | ra | 前 K 个候选框
edge | ra | bh | 7x7
edge | ra | mh | 14x14
edge | bh | out | NMS
edge | mh | out |
```

## YOLO 推理：后处理
type: flow
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/code/main.py

1. **预测头**：一个 1x1 卷积得到 `(N, H, W, num_anchors, 5 + C)`。
2. **拆解**：每个锚框包含 `tx, ty, tw, th, obj` 和 C 个类别 logit。
3. **评分**：`sigmoid(obj)` 乘以最高类别 sigmoid 值。
4. **阈值**：分数低于 `conf_threshold` 时丢弃框。
5. **解码**：中心为 sigmoid 偏移加网格坐标，再乘 `stride`；尺寸为锚框乘 `np.exp`。
6. **NMS**：`nms(boxes, scores, iou_threshold)` 为每个对象保留一个框。
7. **返回**：`boxes[keep], scores[keep], classes[keep]`。

## 公式
type: concepts
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/21-keypoint-pose/docs/zh.md

- **YOLO 输出**：$S \times S \times B(5 + C)$。VOC 中 S=13、B=2、C=20，每格输出 50 个值。
- **解码**：$c_x = (\sigma(t_x) + \mathrm{cell}_x) \cdot \mathrm{stride}$，$w = a_w e^{t_w}$
- **IoU**：交集面积除以并集面积。命中要求 IoU >= 0.5。
- **mAP@0.5:0.95**：IoU 为 0.5、0.55、...、0.95 时 AP 的均值，即 COCO 指标。
- **Dice**：$2 \sum p y / (\sum p + \sum y + \epsilon)$。损失为 1 - Dice。
- **由 IoU 求 Dice**：$\mathrm{Dice} = 2 \cdot \mathrm{IoU} / (1 + \mathrm{IoU})$
- **Mask R-CNN 损失**：rpn_cls + rpn_box + box_cls + box_reg + mask。
- **热图目标**：$\exp(-((x - c_x)^2 + (y - c_y)^2) / 2\sigma^2)$

## 非极大值抑制
type: annotated-code
lang: python
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/code/main.py

```python
def nms(boxes, scores, iou_threshold=0.45):
    order = np.argsort(-scores)                  # 最高分优先
    keep = []
    while len(order) > 0:
        i = order[0]
        keep.append(i)
        if len(order) == 1:
            break
        rest = order[1:]
        ious = box_iou(boxes[[i]], boxes[rest])[0]
        order = rest[ious <= iou_threshold]      # 丢弃重叠框
    return np.array(keep, dtype=np.int64)
```

## U-Net 损失
type: annotated-code
lang: python
from: phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/code/main.py

```python
def dice_loss(logits, targets, num_classes, eps=1e-6):
    probs = F.softmax(logits, dim=1)
    targets_one_hot = F.one_hot(targets, num_classes).permute(0, 3, 1, 2).float()
    dims = (0, 2, 3)                                    # 批次、H、W
    intersection = (probs * targets_one_hot).sum(dim=dims)
    denom = probs.sum(dim=dims) + targets_one_hot.sum(dim=dims)
    dice = (2 * intersection + eps) / (denom + eps)     # eps 处理缺失类别
    return 1 - dice.mean()                              # 宏平均 Dice
def combined_loss(logits, targets, num_classes, lam=1.0):
    ce = F.cross_entropy(logits, targets)               # (N, C, H, W) 与 (N, H, W)
    dc = dice_loss(logits, targets, num_classes)
    return ce + lam * dc, {"ce": ce.item(), "dice": dc.item()}
```

## 微调 Mask R-CNN
type: annotated-code
lang: python
from: phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/code/main.py

```python
model = maskrcnn_resnet50_fpn_v2(weights=MaskRCNN_ResNet50_FPN_V2_Weights.DEFAULT)
in_features = model.roi_heads.box_predictor.cls_score.in_features
model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)  # 包含背景类
in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, 256, num_classes)
for p in model.backbone.parameters():
    p.requires_grad = False                      # 同时冻结 FPN
loss_dict = model(images, targets)               # 训练模式：损失字典
losses = sum(loss for loss in loss_dict.values())
binary_masks = (p['masks'] > 0.5).squeeze(1)     # 评估模式：(N, H, W)
```

## 代码任务
type: task-table
from: phases/04-computer-vision/06-object-detection-yolo/code/main.py, phases/04-computer-vision/07-semantic-segmentation-unet/code/main.py, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/code/main.py, phases/04-computer-vision/21-keypoint-pose/code/main.py, phases/04-computer-vision/24-sam3-open-vocab-segmentation/code/main.py, phases/04-computer-vision/24-sam3-open-vocab-segmentation/docs/zh.md

| 任务 | 代码 |
|---|---|
| 成对框 IoU | `box_iou(boxes_a, boxes_b)` |
| 预测头输出转边界框 | `postprocess(pred_tensor, anchors, stride)` |
| 计算每类 IoU | `iou_per_class(logits, targets, num_classes)` |
| 从特征图裁剪一个框 | `roi_align_single(feature, box)` |
| 热图转 (x, y) | `heatmap_to_coords(heatmaps)` |
| 亚像素关键点 | `subpixel_refine(heatmaps)` |
| 将句子拆成概念 | `split_concepts(sentence)` |
| SAM 3 文本 prompt | `processor.set_text_prompt(inputs, "<concept>")` |

## 默认值
type: defaults
from: phases/04-computer-vision/06-object-detection-yolo/code/main.py, phases/04-computer-vision/07-semantic-segmentation-unet/code/main.py, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/21-keypoint-pose/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `iou_threshold` | 0.45 | 目标检测的 NMS |
| `conf_threshold` | 0.25 | 目标存在概率乘最高类别概率 |
| `lambda_coord` | 5.0 | 框损失权重，采用 YOLOv1 比例 |
| `lambda_noobj` | 0.5 | 否则空网格会主导损失 |
| RPN NMS IoU | 0.7 | 前约 1,000 个框之后 |
| 掩码阈值 | 0.5 | 浮点掩码转二值掩码 |
| 热图 `sigma` | 2.0 | 每个关键点的高斯区域 |
| Dice 权重 `lam` | 1.0 | 损失为 ce 加 lam 乘 dice |

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 仅 mAP@0.5:0.95 较弱 | 框定位粗糙 | 改进框损失，使用 CIoU 或 DIoU |
| 精确率高、召回率低 | 检测器过于保守 | 降低置信度阈值 |
| 一个对象有多个框 | 相邻锚框重叠 | 以 0.45 运行 NMS |
| 像素准确率 99%，掩码却为空 | 背景占主导 | 在交叉熵中加入 Dice |
| mIoU 看似正常 | 掩盖了某类仅 15% 的表现 | 报告每类 IoU |
| 棋盘格伪影 | 转置卷积 | 双线性上采样加 3x3 卷积 |
| 标签偏移一位 | `num_classes` 未包含背景 | 4 个类别需用 `num_classes=5` |
| 500 张图像上过拟合 | 骨干与 FPN 都在训练 | 冻结 `model.backbone` |

## 问答
type: qa
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/21-keypoint-pose/docs/zh.md, phases/04-computer-vision/24-sam3-open-vocab-segmentation/docs/zh.md

- **为何用 RoIAlign 而非 RoIPool？** RoIPool 会取整坐标。RoIAlign 将掩码 AP 提高 3-4 个百分点。
- **为何用热图而非直接预测 (x, y)？** 卷积特征图与空间输出对齐。
- **为何用锚框？** 预测头基于先验框形状预测小幅偏移。
- **U-Net 为何用跳跃连接？** 编码器会丢失边缘细节；跳跃连接补回高分辨率特征图。
- **U-Net 输入为何必须能被 16 整除？** 编码器将分辨率减半四次。
- **SAM 3 比 Grounded SAM 2 快吗？** 通常整体速度持平或略快。
