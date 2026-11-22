---
name: skill-anchor-designer
description: 基于真实框数据集对 (w, h) 做 k-means，返回每个 FPN 层级的 anchor 集合和覆盖率统计
version: 1.0.0
phase: 4
lesson: 6
tags: [computer-vision, detection, anchors, kmeans]
---

# Anchor 设计器

在基于 anchor 的检测器里，anchor 是最依赖数据集的超参数。默认的 COCO anchor 在细胞培养图像、卫星切片或小目标监控场景上表现都不好。这个 skill 推导出真正贴合目标数据的 anchor。

## 何时使用

- 在新数据集上第一次训练之前。
- 模型整体正常，但对极小或极大物体的 recall 偏弱。
- 数据集大幅扩充之后，框尺寸分布可能已经变化。

## 输入

- `boxes`：形状为 (N, 4) 的 numpy 数组，格式为 `(cx, cy, w, h)` 或 `(x1, y1, x2, y2)`；建议至少 1000 个正样本框。
- `num_anchors_per_level`：通常为 3。
- `num_fpn_levels`：通常为 3（P3、P4、P5）或 4。
- `input_size`：训练分辨率 HxW。
- 可选 `strides`：每个层级的步长；省略时取 `[8, 16, 32, 64]` 的前 `num_fpn_levels` 项。如果检测器的 FPN 步长不同，请显式传入更长或更短的数组。

## 步骤

1. **归一化框**：在 `input_size` 下转换成以像素为单位的 `(w, h)` 对。丢弃 w 或 h 小于 2 像素的框。

2. **对 `(w, h)` 对运行 k-means**，`k = num_anchors_per_level * num_fpn_levels`。距离函数用 `1 - IoU(box, cluster)`，不要用欧氏距离：在 `(w, h)` 上用欧氏距离，会把细高的框和方形框聚到一起。所有框贡献相同（不加权）；如果数据集类别不均衡、又想提高大框的 recall，就在输入数组中重复稀有类别的框，而不是传入权重向量。

3. **按面积升序排序聚类中心**，分成 `num_fpn_levels` 组，每组 `num_anchors_per_level` 个。面积最小的分给分辨率最高的层级（步长最小）。

4. **逐层级计算覆盖率统计**：
   - `median IoU`：每个真实框与该层级最佳 anchor 的 IoU 中位数。
   - `recall@IoU=0.5`：最佳 anchor 的 IoU >= 0.5 的框所占百分比。
   - `area coverage`：面积落在该层级 `[anchor_min_area / 4, anchor_max_area * 4]` 范围内的框所占比例。

5. **报告每个层级的 anchor**，并标记 `recall@IoU=0.5 < 0.9` 的层级：这一层的 anchor 与数据不够匹配，需要重新调整，或增加每层的 anchor 数量。

## 报告格式

```
[anchor-designer]
  total boxes:         <N>
  clusters:            <k>
  distance metric:     1 - IoU

[level P3  stride=8]
  anchors (w, h):      [(A, B), (C, D), (E, F)]
  median IoU:          <X>
  recall@IoU=0.5:      <X>
  coverage:            <X>
  flag:                ok | retune

[level P4  stride=16]
  ...

[summary]
  overall recall@IoU=0.5: <X>
  smallest anchor:        <w x h>
  largest anchor:         <w x h>
  recommendation:         <one sentence if any level flagged>
```

## 规则

- 始终使用基于 IoU 的距离；欧氏距离 k-means 得到的 anchor 看着合理，实测却更差。
- 先按面积排序聚类中心，再按升序分配到各层级。
- 当 `num_anchors_per_level = 1` 时，完全跳过 k-means：按面积分位数把框分成 `num_fpn_levels` 个区间（例如 3 个层级就用三分位数），每个层级的 anchor 取该区间 (w, h) 的中位数。在小数据集上，这比用 `k = num_fpn_levels` 跑 k-means 更稳健。
- 绝不输出负的 anchor 尺寸；下限截断为 1。
- 如果数据集的框少于 200 个，提醒用户 anchor 搜索不可靠，建议使用默认 COCO anchor 并补充训练数据。
