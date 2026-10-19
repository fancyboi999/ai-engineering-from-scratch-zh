# 证据对照：计算机视觉

中文主题：[计算机视觉](../computer-vision.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## Mask R-CNN 流水线

对应主题区块：**Mask R-CNN 流水线**（`architecture`）。

来源文件：

- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 预训练模型的预处理

对应主题区块：**预训练模型的预处理**（`flow`）。

来源文件：

- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 关键公式

对应主题区块：**关键公式**（`concepts`）。

来源文件：

- [`phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md`](../../phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md)
- [`phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md`](../../phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/04-image-classification/docs/zh.md`](../../phases/04-computer-vision/04-image-classification/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 代码任务

对应主题区块：**代码任务**（`task-table`）。

来源文件：

- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)
- [`phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md`](../../phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md)
- [`phases/04-computer-vision/04-image-classification/docs/zh.md`](../../phases/04-computer-vision/04-image-classification/docs/zh.md)
- [`phases/04-computer-vision/05-transfer-learning/docs/zh.md`](../../phases/04-computer-vision/05-transfer-learning/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)

构建器核对的标识与数值：

- `img_hwc.permute`
- `img_hwc`
- `permute`
- `nn.Conv2d`
- `in_channels`
- `out_channels`
- `kernel_size`
- `Conv2d`
- `nn.CrossEntropyLoss`
- `label_smoothing`
- `CrossEntropyLoss`
- `model.fc`
- `nn.Linear`
- `model.fc.in_features`
- `in_features`
- `num_classes`
- `Linear`
- `timm.create_model`
- `create_model`
- `iou_threshold`
- `nms`
- `smp.Unet`
- `encoder_name`
- `encoder_weights`
- `Unet`
- `vit_base_patch16_224`

## ViT 前向传播

对应主题区块：**ViT 前向传播**（`annotated-code`）。

来源文件：

- [`phases/04-computer-vision/14-vision-transformers/code/main.py`](../../phases/04-computer-vision/14-vision-transformers/code/main.py)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)

构建器核对的标识与数值：

- `self.proj`
- `nn.Conv2d`
- `in_channels`
- `kernel_size`
- `patch_size`
- `Conv2d`
- `self.cls_token`
- `nn.Parameter`
- `torch.zeros`
- `cls_token`
- `Parameter`
- `zeros`
- `self.pos_embed`
- `pos_embed`
- `num_patches`
- `proj`
- `x.flatten`
- `flatten`
- `transpose`
- `self.cls_token.expand`
- `x.size`
- `expand`
- `size`
- `torch.cat`
- `cat`
- `self.ln1`
- `ln1`
- `self.attn`
- `need_weights`
- `attn`
- `self.mlp`
- `self.ln2`
- `mlp`
- `ln2`
- `self.head`
- `self.ln`
- `head`

## 张量形状

对应主题区块：**张量形状**（`command-table`）。

来源文件：

- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)
- [`phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md`](../../phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)

构建器核对的标识与数值：

- `C_out`
- `C_in`
- `num_anchors`

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/04-image-classification/docs/zh.md`](../../phases/04-computer-vision/04-image-classification/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)

构建器核对的标识与数值：

- `0.485, 0.456, 0.406`
- `0.229, 0.224, 0.225`
- `0.45`
- `0.25`
- `0.5`
- `0.2`
- `16`
- `75%`

## 主干网络

对应主题区块：**主干网络**（`command-table`）。

来源文件：

- [`phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md`](../../phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)
- [`phases/04-computer-vision/04-image-classification/docs/zh.md`](../../phases/04-computer-vision/04-image-classification/docs/zh.md)
- [`phases/04-computer-vision/05-transfer-learning/docs/zh.md`](../../phases/04-computer-vision/05-transfer-learning/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)

构建器核对的标识与数值：

- `permute`
- `zero_grad`
- `backward`
- `freeze_bn_stats`
- `num_classes`

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md`](../../phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md)
- [`phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md`](../../phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md)
- [`phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md`](../../phases/04-computer-vision/08-instance-segmentation-mask-rcnn/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/14-vision-transformers/docs/zh.md`](../../phases/04-computer-vision/14-vision-transformers/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/04-computer-vision/04-image-classification/docs/zh.md`](../../phases/04-computer-vision/04-image-classification/docs/zh.md)
- [`phases/04-computer-vision/05-transfer-learning/docs/zh.md`](../../phases/04-computer-vision/05-transfer-learning/docs/zh.md)
- [`phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md`](../../phases/04-computer-vision/07-semantic-segmentation-unet/docs/zh.md)
- [`phases/04-computer-vision/06-object-detection-yolo/docs/zh.md`](../../phases/04-computer-vision/06-object-detection-yolo/docs/zh.md)
- [`phases/04-computer-vision/01-image-fundamentals/docs/zh.md`](../../phases/04-computer-vision/01-image-fundamentals/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: computer-vision

Abbreviations: P04 = phases/04-computer-vision. L01 = P04/01-image-fundamentals, L02 = P04/02-convolutions-from-scratch, L03 = P04/03-cnns-lenet-to-resnet, L04 = P04/04-image-classification, L05 = P04/05-transfer-learning, L06 = P04/06-object-detection-yolo, L07 = P04/07-semantic-segmentation-unet, L08 = P04/08-instance-segmentation-mask-rcnn, L14 = P04/14-vision-transformers. All docs paths are docs/en.md unless code/main.py is named.

## Architecture: Mask R-CNN pipeline (8 nodes)
- img "Input image, list of (3, H, W)": L08:31, 191-192 (model([x]) with x = torch.randn(3, 400, 600))
- bb "ResNet backbone, strides 4, 8, 16, 32": L08:32, 50
- fpn "FPN, top down + lateral": L08:32, 51
- rpn "RPN, about 1000 proposals": L08:33, 52
- roi "RoIAlign, bilinear, no rounding": L08:34, 53, 67-70
- box "Box head, class + refine": L08:36, 54
- mask "Mask head, 28x28 per class": L08:37, 54, 81
- nms "NMS, boxes, labels, masks": L08:38-40, 104-110
- edges: L08:31-40 (edge "top K" L08:35, "features" L08:34)

## Flow: Preprocess for a pretrained model (7 steps)
1. decode uint8 HWC [0, 255]: L01:33, 231
2. RGB, BGR costs ten points: L01:19, 34
3. divide by 255, HWC to NCHW: L01:37, 39-40, 385, 413
4. resize shorter side 256, bilinear: L01:388, 394, 413
5. center crop 224x224: L01:399-401, 413
6. standardize ImageNet mean and std: L01:147, 403-405, 413
7. input matches training input: L01:29, 413

## Key formulas (concepts, 8)
- output size: L02:77-79
- same padding P = (K - 1) / 2: L02:91
- conv params C_out * C_in * K * K + C_out: L02:146
- receptive field 1 + L * (K - 1): L02:176
- residual y = F(x) + x: L03:123-127
- IoU: L06:92-94
- Dice and Dice = 2 IoU / (1 + IoU): L07:104-108, 125
- YOLO decode: L06:77-84

## Tasks in code (task-table, 8)
- img_hwc.permute(2, 0, 1): L01:116
- nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1): L02:349
- nn.CrossEntropyLoss(label_smoothing=0.1): L04:103
- model.fc = nn.Linear(model.fc.in_features, num_classes): L05:294
- timm.create_model("resnet50", pretrained=True, num_classes=10): L05:300
- nms(boxes, scores, iou_threshold=0.45): L06:179
- smp.Unet(encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=3): L07:359-364 (joined to one line)
- timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10): L14:237

## Annotated code: ViT forward (13 lines)
- self.proj conv k=s=patch_size: L14/code/main.py:9
- cls_token, pos_embed: L14/code/main.py:45-46
- proj, flatten(2).transpose(1, 2): L14/code/main.py:13-14. Shape (768, 14, 14), (196, 768): L14:50-55
- cls expand, torch.cat, + pos_embed: L14/code/main.py:55-57. (197, 768): L14:64
- normed = self.ln1(x), attn, x + a, mlp: L14/code/main.py:32-35. Pre-LN: L14:84-85. MLP d to 4d to d with GELU: L14:87
- return self.head(self.ln(x[:, 0])): L14/code/main.py:60. [CLS] output: L14:67
- Note: lines from PatchEmbedding, Block and ViT are joined into one forward listing.

## Shapes (command-table, 7)
- decoded (H, W, 3) uint8: L01:231
- model input (N, 3, 224, 224) float32: L01:401, 407-408, 413
- conv weight (C_out, C_in, K, K): L02:143
- YOLO head (N, H, W, num_anchors, 5 + C): L06:251
- segmentation logits (N, C, H, W), target (N, H, W): L07:90
- Mask R-CNN masks (N, 1, H, W) in [0, 1]: L08:109
- ViT tokens (197, 768): L14:64

## Defaults and numbers (defaults, 8)
- ImageNet mean 0.485, 0.456, 0.406 on [0, 1]: L01:147
- ImageNet std 0.229, 0.224, 0.225: L01:147
- NMS iou_threshold 0.45: L06:112, 179. RPN NMS 0.7: L08:77
- conf_threshold 0.25, objectness times class score: L06:329, 339
- lambda_noobj 0.5, lambda_coord 5.0: L06:291, 322
- mixup alpha 0.2, Beta(alpha, alpha): L04:90, 218
- patch size 16, 196 tokens: L14:48, 98
- MAE mask 75%, encoder sees 25%: L14:124

## Backbones (command-table, 6)
- LeNet-5 61,706: L03:195
- AlexNet 60M, ReLU, dropout, depth: L03:60-62
- VGG-16 138M, 3x3 only: L03:68, 77, 352
- ResNet-18 11.7M, 69.8%: L03:352
- ViT-B/16 86M, 12 blocks, 12 heads, 768: L14:90, 266
- Mask R-CNN 46M, 91 classes: L08:185

## Troubleshooting (8)
- raw uint8 into model: L01:19, 147
- channels-last makes first conv treat height as channel: L01:19, fix L01:116
- softmax before CE: L04:49, 68
- missing zero_grad: L04:49, 295
- fine-tuned below linear probe, LR or BN bug: L05:116. freeze_bn_stats: L05:199
- 99% accuracy useless, Dice: L07:100-102, 113-119
- checkerboard artifacts, bilinear + 3x3 conv: L07:83-84
- num_classes includes background: L08:227

## Abbreviations (glossary, 8)
- IoU: L06:400
- NMS: L06:401
- mAP@0.5:0.95: L06:138, 406
- mIoU: L07:124, 397
- FPN: L08:51, 286
- RPN: L08:52, 287
- ViT: L14:1, 266
- MAE: L14:124, 268

## Questions (qa, 5)
- 3x3 vs 5x5 parameters: L02:181, L03:75
- residual identity: L03:130
- RoIAlign 3 to 4 mask AP: L08:58, 73
- anchors predict deltas: L06:59
- pre-LN without warmup: L14:94

## Tips (6)
- dataset-specific mean and std: L04:394
- nearest for masks and labels: L01:191, 197
- print pretrained-only and fine-tuned: L05:111-116
- rebuild optimizer when trainable set changes: L05:284
- IoU per class: L07:128
- report the four detection numbers: L06:135-140

## Dropped facts
- Lessons 12, 13 and 15 to 28 (video, 3D, edge, CLIP, OCR, tracking and others): not covered, kept out to fit two pages.
- Diffusion, GAN and Stable Diffusion lessons (L09 to L11, L23): left to the diffusion-models topic.
````
