---
name: skill-point-cloud-loader
description: 为 .ply / .pcd / .xyz 文件编写 PyTorch Dataset，正确完成归一化、中心化和点采样
version: 1.0.0
phase: 4
lesson: 13
tags: [3d-vision, point-cloud, data-loading, pytorch]
---

# 点云加载器

把一个装满 3D 扫描文件的文件夹，变成可以直接训练的 PyTorch `Dataset`。

## 何时使用

- 开始新的点云分类 / 分割项目。
- 在 `.ply`、`.pcd` 和 `.xyz` 格式之间切换。
- 排查模型训练不报错却收敛很差的问题；通常是数据加载器的归一化写错了。

## 输入

- `data_root`：点云文件所在的文件夹，以及一个可选的标签 CSV。
- `file_format`：ply | pcd | xyz | npy。
- `num_points`：固定的采样点数，通常为 1024 或 2048。
- `augmentation`：none | rotate | jitter | mixup。

## 归一化策略

每条生产级点云管线都按以下顺序处理：

1. **中心化**：减去质心。
2. **缩放**到单位球：除以离中心的最大距离。
3. **采样** `num_points` 个点。点数更多时，要忠实保留形状就用**最远点采样**（FPS），要速度就用随机采样。点数更少时，重复已有的点。
4. **打乱**点的顺序（模型本来就不该依赖顺序，但打乱能消除意外的顺序依赖）。

## 输出模板

```python
import numpy as np
import torch
from torch.utils.data import Dataset

try:
    import open3d as o3d
    HAS_O3D = True
except ImportError:
    HAS_O3D = False

def _read_ply(path):
    if HAS_O3D:
        pc = o3d.io.read_point_cloud(path)
        return np.asarray(pc.points, dtype=np.float32)
    # 兜底：最简 ascii-ply 读取器
    ...

def _fps(points, k):
    idx = np.zeros(k, dtype=np.int64)
    dist = np.full(len(points), np.inf)
    seed = np.random.randint(len(points))
    idx[0] = seed
    for i in range(1, k):
        dist = np.minimum(dist, ((points - points[idx[i-1]]) ** 2).sum(axis=1))
        idx[i] = int(np.argmax(dist))
    return idx

def normalise(points):
    centre = points.mean(axis=0)
    points = points - centre
    scale = np.max(np.linalg.norm(points, axis=1))
    return points / max(scale, 1e-8)

class PointCloudDataset(Dataset):
    def __init__(self, files, labels, num_points=1024, augment=False):
        self.files = files
        self.labels = labels
        self.num_points = num_points
        self.augment = augment

    def __len__(self):
        return len(self.files)

    def __getitem__(self, i):
        pts = _read_ply(self.files[i])
        pts = normalise(pts)
        if len(pts) >= self.num_points:
            idx = _fps(pts, self.num_points)
            pts = pts[idx]
        else:
            reps = int(np.ceil(self.num_points / len(pts)))
            pts = np.tile(pts, (reps, 1))[:self.num_points]
        # 打乱点的顺序，消除意外的顺序依赖（tile 会按确定顺序重复点，
        # 这时尤其重要）。
        np.random.shuffle(pts)
        if self.augment:
            theta = np.random.uniform(0, 2 * np.pi)
            R = np.array([[np.cos(theta), 0, np.sin(theta)],
                          [0, 1, 0],
                          [-np.sin(theta), 0, np.cos(theta)]], dtype=np.float32)
            pts = pts @ R
            pts = pts + np.random.normal(0, 0.02, pts.shape).astype(np.float32)
        pts = np.ascontiguousarray(pts, dtype=np.float32)
        return torch.from_numpy(pts).transpose(0, 1), int(self.labels[i])
```

## 报告

```
[dataset]
  files:          <N>
  format:         <ply|pcd|xyz|npy>
  points_per_sample: <int>
  normalise:      centre + unit sphere
  sampling:       FPS | random
  augmentation:   <list>
```

## 规则

- 一律先中心化再缩放；顺序反了，"单位球"的含义就变了。
- 形状类任务优先用 FPS 而不是随机采样；分割任务每个点都要预测，用随机采样没问题。
- 评估时绝不做数据增强，只在训练时做。
- 如果点云文件带有颜色或法向量作为额外通道，就扩展 Dataset，让它返回 `(3 + C, num_points)` 张量，而不只是 xyz。
