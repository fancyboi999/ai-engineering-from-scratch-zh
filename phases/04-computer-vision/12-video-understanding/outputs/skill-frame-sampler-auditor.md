---
name: skill-frame-sampler-auditor
description: 审计视频管线的帧采样器，检查差一错误、短片段处理和裁剪一致性
version: 1.0.0
phase: 4
lesson: 12
tags: [computer-vision, video, sampling, debugging]
---

# 帧采样器审计

视频管线最容易坏在帧采样上。这里的 bug 会传导到下游的每一个指标。

## 何时使用

- 编写新的视频数据加载器。
- 复现论文数字时，训练准确率比论文报告的低。
- 排查视频模型：评估准确率在多次运行之间不稳定。

## 输入

- `sampler_code`：接收 (num_frames_total, T)、返回 T 个索引的 Python 函数。
- `T`：目标片段长度。
- 可选测试用例：要测试的 `num_frames_total` 取值（例如 `[3, T-1, T, T+1, 30, 300, 3000]`）。

## 检查项

### 1. 短片段处理
传入 `num_frames_total < T`。返回的每个索引都必须在 `[0, num_frames_total - 1]` 内。标准的填充策略是用最后一帧重复填满剩余位置。

### 2. 边界索引
传入 `num_frames_total == T`。返回的索引应该恰好是 `[0, 1, ..., T-1]`。

### 3. 均匀分布
传入 `num_frames_total == 10 * T`。返回的索引应该单调递增，间隔大致均匀。

### 4. 密集窗口边界
对密集采样，传入 `num_frames_total == 3 * T`。返回的索引应该构成一个连续窗口，且绝不越过片段末尾。

### 5. 确定性
用相同的输入和（对确定性采样器而言）相同的 RNG 调用采样器两次，索引应当一致。

### 6. 裁剪一致性
如果管线还会为每帧返回一个空间裁剪框，就用同一个片段和同一个种子跑两次采样器，确认每一帧用的是同一个裁剪框（相同的 `(x, y, w, h)`）。同一片段内各帧裁剪不同，会破坏时间连贯性，这是经典的静默 bug。可以接受的变化是：数据增强*按片段*施加，片段内保持一致。

## 报告

```
[sampler audit]
  name: <function name>
  T:    <int>

[short-clip handling]
  passed | failed (<details>)

[boundary]
  passed | failed

[uniform spacing]
  passed | failed (<stddev of gaps>)

[dense window]
  passed | failed (<details>)

[determinism]
  passed | failed

[crop consistency]
  passed | failed (<per-frame crop varies: yes/no>)

[verdict]
  ok | fix required
```

## 规则

- 如果短片段处理会返回越界索引，绝不能把采样器标为 "ok"。
- 密集采样器返回的窗口绝不能越过 `num_frames_total - 1`。
- 如果采样器是随机的（密集采样），只能在显式设置种子的 RNG 下测试确定性。
- 可以建议标准策略，但不要悄悄替用户修复：用最后一帧填充、把窗口截断到末尾、对半开区间取整。
