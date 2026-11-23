---
name: gradient-accumulation
description: 通过缩放各 micro-batch 的损失、每个窗口只让优化器走一步，以超过显存容量的有效 batch 进行训练。
version: 1.0.0
phase: 19
lesson: 46
tags: [training, batch-size, distributed, scaling]
---

## 适用场景

有效 batch 是平滑梯度、匹配学习率调度的关键旋钮。单次前向传播撑不起这么大的 batch 时，就用这套做法。

## 做法

1. 把 `micro_batch` 设为显存放得下、又能把加速器跑满的最大值。
2. 根据学习率调度确定 `effective_batch`。
3. 设 `accum_steps = effective_batch // (micro_batch * world_size)`，并断言能整除。
4. 每个 micro batch：`loss = criterion(model(x), y) / accum_steps; loss.backward()`。
5. 对非最后一个 micro batch，进入 `model.no_sync()`，跳过 DDP 中的梯度 all-reduce。
6. 最后一个 micro batch 结束后，执行一次 `optimizer.step()`。进入下一个窗口前把梯度清零。
7. 优化器状态每个有效 batch 前进一次；学习率调度也是每个有效 batch 走一格。

## 日志

每个有效 step 输出一条小 JSON 记录，包含 `samples_per_sec`、`median_step_ms`、`sync_calls`、`accum_steps`、`effective_batch`。没有这些记录，成本上的取舍就看不见。

## 失败模式

- 忘了做 `/ accum_steps` 缩放：梯度放大 N 倍。
- 在窗口中途更新：参数逐渐漂移。
- 每个 micro batch 都同步：被网络拖慢，统计上却毫无收益。
- 和混合精度的反缩放混在一起：只缩放已经反缩放过的损失。
