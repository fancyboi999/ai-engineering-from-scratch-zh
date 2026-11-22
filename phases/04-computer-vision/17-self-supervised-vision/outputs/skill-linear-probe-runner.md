---
name: skill-linear-probe-runner
description: 为任意冻结编码器和带标签数据集编写完整的线性探测评估流程。
version: 1.0.0
phase: 4
lesson: 17
tags: [self-supervised, evaluation, linear-probe, pytorch]
---

# 线性探测运行器

在冻结编码器之上只训练一个线性分类器，以此评估它的特征质量。每篇自监督论文都用这种标准评估。

## 何时使用

- 比较不同的自监督 checkpoint。
- 在预训练过程中跟踪各 epoch 的特征质量。
- 判断一个预训练编码器不经微调是否足以胜任下游任务。

## 输入

- `encoder`：冻结的 `nn.Module`，每张图像返回一个固定维度的特征。
- `feature_dim`：编码器输出的维度。
- `train_dataset`：带标签的数据集（image, class_id）。
- `val_dataset`：留出的验证集。
- `num_classes`：任务的类别数。
- `epochs`：ImageNet 规模通常为 100，小数据集为 50。

## 步骤

1. 把编码器设为 eval 模式，并对每个参数设置 `requires_grad=False`。
2. 对训练集和验证集各做一次特征提取。保存为 numpy 数组或内存映射文件。
3. 在缓存的特征上，用 SGD + 余弦调度训练一个 `nn.Linear(feature_dim, num_classes)`。
4. 标准超参数：`lr=0.1`、`momentum=0.9`、`weight_decay=0`、`batch_size=1024`。线性探测对 `lr` 出奇地敏感，准确率差时就做一次扫描。
5. 训练结束时报告验证集上的 top-1 准确率。

## 输出模板

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torch.optim import SGD
from torch.optim.lr_scheduler import CosineAnnealingLR

def extract(encoder, loader, device="cpu"):
    encoder.eval()
    feats, labels = [], []
    with torch.no_grad():
        for x, y in loader:
            f = encoder(x.to(device)).cpu()
            feats.append(f)
            labels.append(y)
    return torch.cat(feats), torch.cat(labels)


def linear_probe(encoder, feature_dim, train_loader, val_loader,
                 num_classes, epochs=50, lr=0.1, device="cpu"):
    for p in encoder.parameters():
        p.requires_grad = False

    f_train, y_train = extract(encoder, train_loader, device)
    f_val, y_val = extract(encoder, val_loader, device)

    head = nn.Linear(feature_dim, num_classes).to(device)
    opt = SGD(head.parameters(), lr=lr, momentum=0.9, weight_decay=0)
    sched = CosineAnnealingLR(opt, T_max=epochs)

    ds = torch.utils.data.TensorDataset(f_train, y_train)
    train_iter = DataLoader(ds, batch_size=1024, shuffle=True)

    best_val = 0.0
    for ep in range(epochs):
        head.train()
        for x, y in train_iter:
            x, y = x.to(device), y.to(device)
            loss = F.cross_entropy(head(x), y)
            opt.zero_grad(); loss.backward(); opt.step()
        sched.step()

        head.eval()
        with torch.no_grad():
            acc = (head(f_val.to(device)).argmax(-1).cpu() == y_val).float().mean().item()
        best_val = max(best_val, acc)
    return best_val
```

## 报告

```
[linear probe]
  encoder:     <name + pretrain checkpoint>
  feature_dim: <int>
  epochs:      <int>
  best_val_top1: <float>
```

## 规则

- 线性探测期间绝不更新编码器权重；那就成了微调，不是探测。
- 特征只预先算一次；每个 epoch 都重新跑编码器，会浪费 100 倍算力。
- 用 SGD 加余弦调度，不加权重衰减；Adam 在这里有时表现更差。
- 每个编码器家族至少做一次学习率扫描；不同 SSL 方法的最优值差别很大。
