---
id: computer-vision
title: 计算机视觉
subtitle: 图像预处理、卷积、分类、微调、检测、分割与分块。使用课程中的 PyTorch 和 NumPy 实现。
hue: 5
sources: phases/04-computer-vision/01-image-fundamentals, phases/04-computer-vision/02-convolutions-from-scratch, phases/04-computer-vision/03-cnns-lenet-to-resnet, phases/04-computer-vision/04-image-classification, phases/04-computer-vision/05-transfer-learning, phases/04-computer-vision/06-object-detection-yolo, phases/04-computer-vision/07-semantic-segmentation-unet, phases/04-computer-vision/08-instance-segmentation-mask-rcnn, phases/04-computer-vision/14-vision-transformers
code: CV
source_hash: c73b7742d49dd134
---

## Mask R-CNN 流水线
type: architecture
from: phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

```arch
node | img | 1,1 | 输入图像 | (3, H, W) 列表
node | bb | 2,1 | ResNet 主干 | 步幅 4、8、16、32
node | fpn | 3,1 | FPN | 自顶向下与横向连接
node | rpn | 4,1 | RPN | 约 1000 个候选框
node | roi | 3,2 | RoIAlign | 双线性，无取整
node | box | 2,2 | 边框头 | 分类与精修
node | mask | 4,2 | 掩码头 | 每类 28x28
node | nms | 1,2 | NMS | 边框、标签、掩码
edge | img | bb |
edge | bb | fpn |
edge | fpn | rpn |
edge | fpn | roi | 特征
edge | rpn | roi | 前 K 个
edge | roi | box |
edge | roi | mask |
edge | box | nms |
```

## 预训练模型的预处理
type: flow
from: phases/04-computer-vision/01-image-fundamentals/docs/zh.md

1. **解码**：文件转为 `[0, 255]` 范围的 `uint8` HWC。
2. **颜色**：转为 RGB，误用 BGR 会损失约十个百分点。
3. **浮点与布局**：除以 255，将 HWC 转为 NCHW。
4. **缩放**：用双线性插值将短边缩放至 256。
5. **裁剪**：中心裁剪为 224x224。
6. **标准化**：减去 ImageNet 均值，再除以标准差。
7. **模型**：此时输入与训练时一致。

## 关键公式
type: concepts
from: phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md

- **输出尺寸**：$H_{\text{out}} = \left\lfloor \frac{H - K + 2P}{S} \right\rfloor + 1$
- **同尺寸填充**：奇数 $K$ 且 $S = 1$ 时，$P = (K - 1) / 2$
- **卷积参数量**：$C_{\text{out}} \cdot C_{\text{in}} \cdot K \cdot K + C_{\text{out}}$
- **感受野**：$L$ 层步幅为 1 的卷积堆叠时为 $1 + L \cdot (K - 1)$
- **残差**：$y = F(x) + x$
- **IoU**: $\mathrm{IoU}(A, B) = \frac{\mathop{\mathrm{area}}(A \cap B)}{\mathop{\mathrm{area}}(A \cup B)}$
- **Dice**：$\frac{2 \sum (p \cdot y)}{\sum p + \sum y + \epsilon}$，且 $\text{Dice} = 2 \cdot \text{IoU} / (1 + \text{IoU})$
- **YOLO 解码**：$x = (\sigma(t_x) + \text{cell}_x) \cdot \text{stride}$，$w = \text{anchor}_w \cdot \exp(t_w)$

## 代码任务
type: task-table
from: phases/04-computer-vision/01-image-fundamentals/docs/zh.md, phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md

| 任务 | 代码 |
|---|---|
| HWC 转 CHW | `img_hwc.permute(2, 0, 1)` |
| 同尺寸 3x3 卷积 | `nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1)` |
| 带标签平滑的损失 | `nn.CrossEntropyLoss(label_smoothing=0.1)` |
| 替换 ResNet 输出头 | `model.fc = nn.Linear(model.fc.in_features, num_classes)` |
| 任意架构的预训练主干 | `timm.create_model("resnet50", pretrained=True, num_classes=10)` |
| 边框去重 | `nms(boxes, scores, iou_threshold=0.45)` |
| 带预训练编码器的 U-Net | `smp.Unet(encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=3)` |
| 预训练 ViT | `timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10)` |

## ViT 前向传播
type: annotated-code
lang: python
from: phases/04-computer-vision/14-vision-transformers/code/main.py, phases/04-computer-vision/14-vision-transformers/docs/zh.md

```python
self.proj = nn.Conv2d(in_channels, dim, kernel_size=patch_size, stride=patch_size)
self.cls_token = nn.Parameter(torch.zeros(1, 1, dim))  # 一个可学习 token
self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, dim))  # 可学习参数
x = self.proj(x)                                 # 224 像素时为 (N, dim, 14, 14)
x = x.flatten(2).transpose(1, 2)                 # (N, 196, dim) 个 token
cls = self.cls_token.expand(x.size(0), -1, -1)
x = torch.cat([cls, x], dim=1)                   # (N, 197, dim)
x = x + self.pos_embed                           # 加入位置信息
normed = self.ln1(x)                             # pre-LN
a, _ = self.attn(normed, normed, normed, need_weights=False)
x = x + a                                        # 残差
x = x + self.mlp(self.ln2(x))                    # D 到 4D 再到 D，GELU
return self.head(self.ln(x[:, 0]))               # 用 [CLS] 分类
```

## 张量形状
type: command-table
from: phases/04-computer-vision/01-image-fundamentals/docs/zh.md, phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md

| 张量 | 形状 |
|---|---|
| 解码图像 | `(H, W, 3)`，uint8 |
| 模型输入 | `(N, 3, 224, 224)`，float32 |
| 卷积权重 | `(C_out, C_in, K, K)` |
| YOLO 头输出 | `(N, H, W, num_anchors, 5 + C)` |
| 分割 logits | `(N, C, H, W)`，目标为 `(N, H, W)` |
| Mask R-CNN 掩码 | `(N, 1, H, W)`，范围 [0, 1] |
| 224 像素时的 ViT token | `(197, 768)`，包含 [CLS] |

## 默认值与数值
type: defaults
from: phases/04-computer-vision/01-image-fundamentals/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| ImageNet 均值 | 0.485, 0.456, 0.406 | 对应 [0, 1] 范围的像素 |
| ImageNet 标准差 | 0.229, 0.224, 0.225 | 按通道计算 |
| NMS iou_threshold | 0.45 | RPN 使用 0.7 |
| conf_threshold | 0.25 | 目标存在概率乘以类别分数 |
| lambda_noobj | 0.5 | lambda_coord 为 5.0，YOLOv1 权重比 |
| Mixup alpha | 0.2 | lam 采样自 Beta(alpha, alpha) |
| ViT 分块大小 | 16 | 224 像素时为 196 个 token |
| MAE 掩码比例 | 75% | 编码器仅看到 25% |

## 主干网络
type: command-table
from: phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

| 模型 | 规模与思路 |
|---|---|
| LeNet-5 | 61,706 个参数，卷积、池化、全连接 |
| AlexNet | 60M，ReLU、dropout、深度 |
| VGG-16 | 138M，只用 3x3 卷积 |
| ResNet-18 | 11.7M，恒等跳跃连接，top-1 为 69.8% |
| ViT-B/16 | 86M，12 个区块、12 个头，维度 768 |
| Mask R-CNN R50 FPN | 46M，91 个 COCO 类别 |

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/01-image-fundamentals/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 输出无意义却不报错 | 原始 uint8 直接输入模型 | 除以 255 后标准化 |
| 首层卷积将高度当作通道 | 输入为 HWC | 用 `permute(2, 0, 1)` 转为 CHW |
| 梯度错误却不报错 | 交叉熵前使用 softmax | 直接传入原始 logits |
| 损失不稳定 | 每步未调用 `zero_grad()` | 在 `backward()` 前调用 |
| 微调不如线性探测 | LR 或 BN 问题 | 分层学习率、`freeze_bn_stats` |
| 像素准确率 99% 但掩码无用 | 类别不平衡 | 在损失中加入 Dice |
| 棋盘状伪影 | 转置卷积 | 双线性上采样加 3x3 卷积 |
| 输出头少一个类别 | 未计入背景 | `num_classes` = 类别数 + 1 |

## 缩略语
type: glossary
from: phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md

- **IoU**：交并比，衡量两个框或掩码的重叠。
- **NMS**：非极大值抑制，保留最高分框并移除重叠框。
- **mAP@0.5:0.95**：COCO AP，对 IoU 从 0.5 至 0.95、步长 0.05 求平均。
- **mIoU**：各类别 IoU 的均值，用于分割评估。
- **FPN**：特征金字塔网络，在每种步幅提供语义特征。
- **RPN**：区域建议网络，判断每个锚框是否存在目标。
- **ViT**：视觉 transformer，将图像分块视为 token。
- **MAE**：掩码自编码器，遮蔽 75% 图像块后重建。

## 问答
type: qa
from: phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md

- **为何大量使用 3x3？** 两层 3x3 覆盖 5x5，参数量为 $18C^2$，而非 $25C^2$。
- **为何使用残差？** 区块可以学习恒等映射，增加深度不再必然降低效果。
- **为何选 RoIAlign 而非 RoIPool？** 不取整，可在 COCO 上提高 3 至 4 个掩码 AP。
- **为何使用锚框？** 输出头只需预测相对于先验框的小幅偏移。
- **ViT 为何使用 pre-LN？** 它能在无需预热时训练深层堆叠。

## 提示
type: tips
from: phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md, phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md, phases/04-computer-vision/06-object-detection-yolo/docs/zh.md, phases/04-computer-vision/01-image-fundamentals/docs/zh.md

- 在自己的训练集上计算均值与标准差。
- 掩码与标签图使用最近邻缩放。
- 每次迁移训练同时报告线性探测与微调准确率。
- 可训练参数集合变化时，重新构建优化器。
- 报告各类别 IoU，不只报告 mIoU。
- 同时报告精确率、召回率、AP@0.5 和 mAP@0.5:0.95。
