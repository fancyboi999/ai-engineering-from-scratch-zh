---
id: cnn-architectures
title: CNN 架构与迁移学习
code: CA
subtitle: 计算卷积尺寸，从 LeNet 构建到 ResNet，训练分类器并微调预训练骨干。使用 PyTorch 与 NumPy。
hue: 15
sources: phases/04-computer-vision/02-convolutions-from-scratch, phases/04-computer-vision/03-cnns-lenet-to-resnet, phases/04-computer-vision/04-image-classification, phases/04-computer-vision/05-transfer-learning
source_hash: 79987d4bbc52afbd
---

## 公式
type: concepts
from: phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md

- **输出尺寸**：$H_{out} = \lfloor (H - K + 2P) / S \rfloor + 1$
- **同尺寸填充**：当 $K$ 为奇数且 $S = 1$ 时，$P = (K - 1) / 2$。
- **卷积参数量**：`C_out * C_in * K * K + C_out`，最后一项是偏置。
- **感受野**：$L$ 个步长为 1 的卷积堆叠后为 $1 + L (K - 1)$。
- **两个 3x3 或一个 5x5**：同样覆盖 5x5，参数量分别为 $18C^2$ 与 $25C^2$。
- **残差块**：$y = F(x) + x$。当 $F(x) = 0$ 时，块学到恒等映射。
- **交叉熵**：对原始 logits 计算 $-z_y + \log \sum_j \exp(z_j)$。
- **逐层学习率衰减**：$\mathrm{lr}_k = \mathrm{base} \cdot \mathrm{decay}^{L - k}$

## 四类架构
type: concepts
from: phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md

- **LeNet-5（1998）**：卷积、平均池化、全连接、tanh。60,000 个参数。
- **AlexNet（2012）**：ReLU、dropout，5 个卷积层与 3 个全连接层。60M 参数。
- **VGG（2014）**：只用 3x3 卷积，16 或 19 层。138M 参数。
- **Inception（2014）**：并行运行 1x1、3x3、5x5 卷积和池化，再拼接。
- **ResNet（2015）**：恒等跳连，可训练 100+ 层。
- **BasicBlock**：两个 3x3 卷积加跳连，用于 ResNet-18 与 ResNet-34。
- **Bottleneck**：1x1 降维、3x3、1x1 升维，用于 ResNet-50、-101、-152。
- **ResNet-18 或 VGG-16**：参数量为 11.7M 或 138M，Top-1 为 69.8% 或 71.6%。

## 接受 32x32 输入的 TinyResNet
type: architecture
from: phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/code/main.py

```arch
node | in | 1,1 | 输入 | (1, 3, 32, 32)
node | stem | 2,1 | stem | 3x3 卷积，32 通道，BN、ReLU
node | l1 | 3,1 | layer1 | 2 个 BasicBlock，32 通道
node | l2 | 4,1 | layer2 | 步长 2，64 通道
node | l3 | 4,2 | layer3 | 步长 2，128 通道
node | l4 | 3,2 | layer4 | 步长 2，256 通道
node | head | 2,2 | 输出头 | AdaptiveAvgPool2d、Linear
node | out | 1,2 | Logits | 10 个类别
edge | in | stem |
edge | stem | l1 |
edge | l1 | l2 |
edge | l2 | l3 |
edge | l3 | l4 |
edge | l4 | head |
edge | head | out |
```

## ResNet BasicBlock
type: annotated-code
lang: python
from: phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/code/main.py

```python
self.conv1 = nn.Conv2d(in_c, out_c, kernel_size=3, stride=stride, padding=1, bias=False)  # BN beta 承载偏置
self.conv2 = nn.Conv2d(out_c, out_c, kernel_size=3, stride=1, padding=1, bias=False)
if stride != 1 or in_c != out_c:
    self.shortcut = nn.Sequential(
        nn.Conv2d(in_c, out_c, kernel_size=1, stride=stride, bias=False),
        nn.BatchNorm2d(out_c))               # 1x1 卷积匹配形状
else:
    self.shortcut = nn.Identity()            # 无操作跳连
out = F.relu(self.bn1(self.conv1(x)))
out = self.bn2(self.conv2(out))              # 相加前不使用 ReLU
out = out + self.shortcut(x)                 # F(x) + x
return F.relu(out)
```

## 代码任务
type: task-table
from: phases/04-computer-vision/02-convolutions-from-scratch/code/main.py, phases/04-computer-vision/04-image-classification/code/main.py, phases/04-computer-vision/05-transfer-learning/code/main.py

| 任务 | 代码 |
|---|---|
| 单个卷积的输出尺寸 | `output_size(h_in, k, p, s)` |
| 堆叠层的感受野 | `receptive_field(layers)` |
| 用一次矩阵乘法实现卷积 | `conv2d_im2col(x, w, b, padding=1)` |
| 应用手工卷积核 | `apply_kernel(x[0], KERNELS["sobel_x"])` |
| 混合批次 | `mixup_batch(x, y, num_classes, alpha=0.2)` |
| 软标签损失 | `soft_cross_entropy(logits, soft_targets)` |
| 冻结骨干，使用新输出头 | `make_feature_extractor(num_classes=10)` |
| 保留 BN 滚动统计量 | `freeze_bn_stats(model)` |

## 一个训练轮次
type: flow
from: phases/04-computer-vision/04-image-classification/docs/zh.md

1. **增强**：使用 `random_hflip()` 和反射填充的 `random_crop(pad=4)`，仅用于训练集。
2. **标准化**：用训练集均值与标准差调用 `standardize(mean, std)`。
3. **DataLoader**：训练用 `shuffle=True`，验证用 `shuffle=False`。
4. **模型**：先调用 `model.train()`。模型输出原始 logits，形状为 (N, C)。
5. **损失**：mixup 使用 `soft_cross_entropy`，否则使用带 `label_smoothing=0.1` 的 `cross_entropy`。
6. **更新**：`optimizer.zero_grad()`、`loss.backward()`、`optimizer.step()`。
7. **指标**：累加 `loss.item()`，避免保留计算图。
8. **轮次结束**：调用 `scheduler.step()`，再 `model.eval()`，在 `torch.no_grad` 下评估。

## 使用差异化学习率微调
type: annotated-code
lang: python
from: phases/04-computer-vision/05-transfer-learning/docs/zh.md, phases/04-computer-vision/05-transfer-learning/code/main.py

```python
model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
model.fc = nn.Linear(model.fc.in_features, 10)   # 新输出头
groups = discriminative_param_groups(model, base_lr=1e-3, decay=0.3)
optimizer = SGD(groups, momentum=0.9, weight_decay=1e-4, nesterov=True)
scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
for epoch in range(epochs):
    model.train()
    if freeze_bn:
        freeze_bn_stats(model)                    # 在 model.train() 之后调用
start, unfreeze = progressive_unfreeze_schedule(model)
start()                                           # 只训练 fc
unfreeze(epoch)                                   # 先 layer4，再 layer3
```

## 选择迁移方案
type: concepts
from: phases/04-computer-vision/05-transfer-learning/docs/zh.md

- **少于 1k 张图，与 ImageNet 接近**：冻结骨干，只训练输出头。
- **1k-10k 张图，领域接近**：冻结前 2-3 个阶段，微调其余部分。
- **10k-100k 张图，任意领域**：使用差异化学习率端到端微调。
- **100k+ 张图，领域差异大**：微调全部参数，也可考虑从头训练。
- **BN，至少 5k 个样本**：保持 BN 训练模式，更新滚动统计量。
- **BN，小数据集**：将 BN 冻结在评估模式，保留 ImageNet 统计量。
- **每个 GPU 的批次很小**：用 GroupNorm 替换 BN。
- **需要替换的输出头**：`backbone.fc`（ResNet），`backbone.classifier[1]`（EfficientNet、MobileNet）。

## 训练默认值
type: defaults
span: 1
from: phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| SGD `lr` | 0.1 | 从头训练 TinyResNet，10 轮余弦调度 |
| `momentum` | 0.9 | 配合 `nesterov=True` |
| `weight_decay` | 5e-4 | 微调使用 1e-4 |
| `label_smoothing` | 0.1 | 真实类别目标值为 1-eps |
| Mixup `alpha` | 0.2 | lambda 来自 Beta(a, a) |
| `base_lr` | 1e-3 | fc 参数组，更早阶段的学习率更低 |
| `decay` | 0.3 | conv1 约为 `base_lr` 的 0.00243 倍 |
| `batch_size` | 128 | 验证加载器使用 256 |

## 常见问题排查
type: troubleshooting
from: phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 梯度错误、曲线平坦 | 损失前做了 softmax | 将原始 logits 传给 `CrossEntropyLoss` |
| 看起来像学习率不稳 | 梯度累积 | 每步调用 `optimizer.zero_grad()` |
| 准确率损失约 1% | CIFAR-10 使用 ImageNet 均值和标准差 | 在训练集上计算统计量 |
| “6” 变成 “9” | 增强改变了标签 | 缩小旋转范围 |
| 微调结果低于仅预训练 | 学习率或 BN 有误 | 使用差异化学习率，检查 BN 模式 |
| 准确率悄悄下降 5-15% | BN 统计量来自另一分布 | 冻结 BN 统计量或使用 GroupNorm |
| 所有图像都预测为同一类 | 学习率破坏了预训练特征 | 降低骨干学习率 |
| 深层普通网络训练更差 | 超过约 20 层后退化 | 添加残差连接 |

## 问答
type: qa
from: phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md, phases/04-computer-vision/03-cnns-lenet-to-resnet/docs/zh.md, phases/04-computer-vision/04-image-classification/docs/zh.md, phases/04-computer-vision/05-transfer-learning/docs/zh.md

- **为何用 3x3 卷积核？** 它是具有中心的最小奇数卷积核。
- **不池化如何下采样？** 使用 `stride=2` 的卷积，使 H 与 W 减半。
- **mixup 为何提高训练损失？** 目标是软标签，测试准确率会提高。
- **迁移实验要比较哪两个数字？** 仅预训练是下限，微调是上限。
- **为何早期层学习率更小？** 它们保存通用的边缘和纹理特征。
- **何时重建优化器？** 每次可训练参数集合变化时。

## 卷积层形状
type: annotated-code
lang: python
from: phases/04-computer-vision/02-convolutions-from-scratch/docs/zh.md

```python
conv = nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1)
tuple(conv.weight.shape)                    # (C_out, C_in, K, K)
sum(p.numel() for p in conv.parameters())   # 64 * 3 * 3 * 3 + 64 = 1,792
y = conv(torch.randn(8, 3, 224, 224))       # padding=0 时得到 222x222
```
