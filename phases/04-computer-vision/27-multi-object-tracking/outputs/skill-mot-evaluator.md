---
name: skill-mot-evaluator
description: 编写一套完整的评测工具，基于真值轨迹计算 MOTA / IDF1 / HOTA
version: 1.0.0
phase: 4
lesson: 27
tags: [mot, evaluation, tracking, metrics]
---

# MOT 评测器

把跟踪器的输出接入标准的 MOTA/IDF1/HOTA 流程，这样才能和文献公平对比。

## 适用场景

- 在 MOT17 / MOT20 / DanceTrack / SportsMOT 上给新跟踪器跑基准。
- 在自己的视频素材上对比 ByteTrack、BoT-SORT 和 SAM 2。
- 为论文或 PR 描述产出可复现的数字。

## 输入

- `predictions`：每帧一个列表，元素是 `(track_id, x, y, w, h, confidence)` 元组。
- `ground_truth`：每帧一个列表，元素是 `(gt_id, x, y, w, h)` 元组。
- `iou_threshold`：MOTA 通常取 0.5；HOTA 用一组阈值扫描。
- `evaluator`：`py-motmetrics`（MOTA、IDF1）或 `TrackEval`（HOTA）。

## 输出格式约定

`py-motmetrics` 和 `TrackEval` 都要求特定的磁盘文件格式：

```
# predictions.txt
<frame>,<track_id>,<x>,<y>,<w>,<h>,<confidence>,-1,-1,-1

# ground_truth.txt
<frame>,<gt_id>,<x>,<y>,<w>,<h>,1,-1,-1,-1
```

帧号从 1 开始，框是 (x, y, w, h)，不是 (x1, y1, x2, y2)。大多数集成 bug 都出在这一步转换上。

## 步骤

1. 把跟踪器输出转成 MOT Challenge 文本格式。
2. 对两个文件分别运行 `py-motmetrics.io.loadtxt`。
3. 用 `mm.metrics.create().compute()` 计算 MOTA + IDF1。
4. HOTA 用同样的文件调用 `TrackEval`，并设置 `Metrics: HOTA`。
5. 把结果存成 JSON 供看板使用。

## 实现草图

```python
import motmetrics as mm

def evaluate_mota_idf1(pred_path, gt_path):
    gt = mm.io.loadtxt(gt_path, fmt="mot15-2D")
    pred = mm.io.loadtxt(pred_path, fmt="mot15-2D")
    acc = mm.utils.compare_to_groundtruth(gt, pred, dist="iou", distth=0.5)
    metrics = mm.metrics.create().compute(
        acc, metrics=["num_frames", "mota", "motp", "idf1", "idp", "idr", "num_switches"]
    )
    return metrics


def write_mot_txt(predictions, path):
    with open(path, "w") as f:
        for frame_idx, detections in enumerate(predictions, start=1):
            for tid, x, y, w, h, conf in detections:
                f.write(f"{frame_idx},{tid},{x:.2f},{y:.2f},{w:.2f},{h:.2f},{conf:.3f},-1,-1,-1\n")
```

## 报告

```
[mot evaluation]
  frames:     <int>
  gt tracks:  <int>
  pred tracks: <int>

[metrics]
  MOTA:       <float>
  MOTP:       <float>
  IDF1:       <float>
  IDP/IDR:    <float/float>
  ID switches: <int>
  HOTA:       <float>  (from TrackEval)
```

## 规则

- 输出文本文件中的帧号始终从 1 开始；MOT 工具默认如此。
- 写文件前把 (x1, y1, x2, y2) 转成 (x, y, w, h)。
- 做现代方法对比时，不要只报 MOTA；同时给出 IDF1 和 HOTA。
- 注意 MOT17 上的私有检测和公开检测：两者分开评测，混在一起会虚高分数。
- 记录每个序列的分数；只看汇总会掩盖在个别困难序列上的失败。
