---
name: skill-heatmap-to-coords
description: 编写每个生产级姿态模型都在用的亚像素热图转坐标例程
version: 1.0.0
phase: 4
lesson: 21
tags: [keypoint, pose, subpixel, inference]
---

# 热图转坐标

把原始的关键点热图转成亚像素精度的坐标。这是每条姿态管线里成本最低的精度提升。

## 何时使用

- 部署基于热图的关键点模型。
- 对姿态指标做基准测试：OKS 对亚像素精度极其敏感。
- 把姿态代码从一个框架移植到另一个框架。

## 输入

- `heatmaps`：`(N, K, H, W)` 张量，模型输出的逐关键点热图。
- `confidence_threshold`：峰值低于该值的关键点会被丢弃。

## 步骤

1. 对每张热图做 **argmax**，找到整数峰值位置。
2. **一阶差分偏移**：根据相邻像素估计亚像素偏移。系数 `0.25` 是针对 `sigma >= 1` 的高斯热图校准的经验值；如果要有理论依据的亚像素恢复，用完整的二次拟合（DARK）或高斯拟合。

```
dx = 0.25 * sign(heatmap[y, x+1] - heatmap[y, x-1])
dy = 0.25 * sign(heatmap[y+1, x] - heatmap[y-1, x])
```

DARK / 二次拟合版本用局部二次函数近似：

```
dx = -0.5 * (heatmap[y, x+1] - heatmap[y, x-1])
        / (heatmap[y, x+1] - 2 * heatmap[y, x] + heatmap[y, x-1] + eps)
```

在峰值尖锐的热图上，二次拟合更准；热图噪声大时，基于符号的偏移是更稳妥的默认选择。

3. 把偏移**加到**整数峰值上。
4. **置信度**：返回每个关键点的峰值；调用方用它屏蔽低置信度的预测。
5. **边界情况**：峰值落在某个轴的第一个或最后一个像素上时，有一个邻居会被截断；偏移退化为零，这是最安全的兜底方式。

## 输出模板

```python
import torch

def heatmap_to_coords_subpixel(heatmaps, threshold=0.2):
    N, K, H, W = heatmaps.shape
    flat = heatmaps.reshape(N, K, -1)
    conf, idx = flat.max(dim=-1)
    ys = (idx // W).float()
    xs = (idx % W).float()

    ys_int = ys.long()
    xs_int = xs.long()

    x_minus = (xs_int - 1).clamp(min=0)
    x_plus = (xs_int + 1).clamp(max=W - 1)
    y_minus = (ys_int - 1).clamp(min=0)
    y_plus = (ys_int + 1).clamp(max=H - 1)

    batch_idx = torch.arange(N).view(-1, 1).expand(-1, K)
    kp_idx = torch.arange(K).view(1, -1).expand(N, -1)

    dx_raw = (heatmaps[batch_idx, kp_idx, ys_int, x_plus]
              - heatmaps[batch_idx, kp_idx, ys_int, x_minus])
    dy_raw = (heatmaps[batch_idx, kp_idx, y_plus, xs_int]
              - heatmaps[batch_idx, kp_idx, y_minus, xs_int])
    dx = 0.25 * torch.sign(dx_raw)
    dy = 0.25 * torch.sign(dy_raw)

    at_left = xs_int == 0
    at_right = xs_int == (W - 1)
    at_top = ys_int == 0
    at_bottom = ys_int == (H - 1)
    dx = torch.where(at_left | at_right, torch.zeros_like(dx), dx)
    dy = torch.where(at_top | at_bottom, torch.zeros_like(dy), dy)

    refined_x = xs + dx
    refined_y = ys + dy
    coords = torch.stack([refined_x, refined_y], dim=-1)
    mask = conf >= threshold
    return coords, conf, mask
```

## 报告

```
[subpixel decode]
  keypoints:   K
  threshold:   <float>
  valid_rate:  fraction of keypoints above threshold
```

## 规则

- 一律把邻居索引截断到有效范围；越界的关键点偏移差分为零，但不会崩溃。
- 坐标和置信度一起返回，方便调用方屏蔽低置信度的点。
- 亚像素细化只在峰值附近热图平滑时才有用；检查训练时是否用了 sigma >= 1 的高斯目标。
- 热图分辨率很小时（< 48x48），考虑先把热图上采样到完整图像尺寸再提取坐标；亚像素偏移会随步长放大。
