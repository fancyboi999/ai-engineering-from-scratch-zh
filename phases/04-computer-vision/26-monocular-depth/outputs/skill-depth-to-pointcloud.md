---
name: skill-depth-to-pointcloud
description: 用深度图构建点云，正确处理相机内参，并导出为 .ply
version: 1.0.0
phase: 4
lesson: 26
tags: [depth, point-cloud, 3d, intrinsics]
---

# 深度图转点云

把深度图加一张彩色图变成带颜色的点云，可导出用于可视化或后续 3D 处理。

## 适用场景

- 把深度预测可视化成真正的 3D 场景。
- 从单张图像起步做稀疏 3D 重建。
- SfM 失败时，为 3DGS 训练准备输入。
- 拿预测深度和 LiDAR 真值做对比。

## 输入

- `depth`：`(H, W)` 的 numpy 数组，深度单位与你希望输出的单位一致（推荐米）。
- `rgb`：`(H, W, 3)` 的 numpy 颜色数组（uint8 或 float32 [0, 1]）。
- `intrinsics`：以像素为单位的 `(fx, fy, cx, cy)`。
- 可选 `depth_scale`：把预测深度单位换算成米的乘数。

## 流程

1. **校验**：凡是要纳入的位置，深度都必须为正且有限。把无效像素屏蔽掉。
2. **抬升**：对每个像素计算 `X = (u - cx) * d / fx`、`Y = (v - cy) * d / fy`、`Z = d`。
3. **配色**：每个 3D 点从对应像素取一组 `(r, g, b)`。
4. **导出**：PLY（通用）、`.xyz`（轻量）、`.pcd`（Open3D 原生）、`.las`/`.laz`（地理空间）。

## 实现模板

```python
import numpy as np

def depth_to_point_cloud(depth, intrinsics, depth_scale=1.0, min_depth=0.1, max_depth=100.0):
    H, W = depth.shape
    fx, fy, cx, cy = intrinsics
    v, u = np.meshgrid(np.arange(H), np.arange(W), indexing="ij")
    z = depth.astype(np.float32) * depth_scale
    valid = (z > min_depth) & (z < max_depth) & np.isfinite(z)
    x = (u - cx) * z / fx
    y = (v - cy) * z / fy
    points = np.stack([x, y, z], axis=-1)
    return points, valid


def write_ply(path, points, colors=None, valid_mask=None):
    p = points.reshape(-1, 3)
    if valid_mask is not None:
        p = p[valid_mask.flatten()]
    lines = [
        "ply",
        "format ascii 1.0",
        f"element vertex {p.shape[0]}",
        "property float x", "property float y", "property float z",
    ]
    if colors is not None:
        c = colors.reshape(-1, 3).astype(np.uint8)
        if valid_mask is not None:
            c = c[valid_mask.flatten()]
        lines += ["property uchar red", "property uchar green", "property uchar blue"]
    lines.append("end_header")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")
        if colors is not None:
            for pt, col in zip(p, c):
                f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f} {col[0]} {col[1]} {col[2]}\n")
        else:
            for pt in p:
                f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f}\n")
```

## 报告

```
[export]
  input depth shape:  (H, W)
  valid points:       <N> of <H*W>
  output format:      ply | xyz | pcd | las
  coordinate system:  camera (+X right, +Y down, +Z forward)
  scale:              metres | millimetres | normalised
```

## 规则

- 始终屏蔽无效深度（零、NaN、inf、饱和值）；把它们算进去，会在原点堆出一团垃圾点。
- 来自相对深度模型的预测不要按度量单位导出；在输出文件名前加 `relative_`，标明这一约定。
- 保持相机坐标约定一致（OpenCV：+X 向右，+Y 向下，+Z 向前）。下游工具要求 OpenGL（+Y 向上）时，翻转对应符号。
- 稠密场景（> 1M 个点）要提供下采样参数；超过 500 MB 的 PLY 文件在哪儿加载都费劲。
- 绝不悄悄裁剪深度来凑出"合理"的输出；要显式裁剪并对阈值给出警告，让用户知道丢掉了什么。
