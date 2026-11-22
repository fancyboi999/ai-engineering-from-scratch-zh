---
name: checkpoint-save-resume
description: 原子化、分片的 checkpoint，完整保存 RNG 状态，被杀掉的训练能在 epoch 中途恢复，并保持相同的损失曲线。
version: 1.0.0
phase: 19
lesson: 47
tags: [training, durability, resume, sharded-state]
---

## 适用场景

训练时长超过集群墙钟上限的任何运行、必须扛过节点重启的任何运行，以及大到无法装进单个文件的任何模型。

## 载荷结构

```python
{
  "schema": "ckpt.v1",
  "model": model.state_dict(),
  "optimizer": opt.state_dict(),
  "scheduler": sched.state_dict(),
  "state": {"step": int, "epoch": int, "batch_in_epoch": int, "losses": [float, ...]},
  "rng": {"python": ..., "numpy": ..., "torch_cpu": ..., "torch_cuda": ...},
  "wall_saved_at": time.time(),
}
```

## 原子保存

1. 把载荷写到目标文件所在目录下一个唯一的临时文件里。
2. 用 `os.replace(tmp, target)` 原子替换。
3. 永远不要直接写目标文件名。

## 分片布局

- 每个分片一个 `model.shard-NNN.pt`，按 key 轮询分配，或按参数组切分。
- `meta.pt` 存放优化器、调度器、训练状态、RNG 和分片清单。
- `index.json` 记录每个分片以及 `meta.pt` 的 `sha256`。
- 加载器在合并前校验每个哈希，并拒绝 checkpoint 目录之外的分片路径。
- 每个文件都用 `torch.load(path, map_location="cpu", weights_only=True)` 加载。RNG 状态存成普通 list，这样 weights-only 加载器也能读。

## epoch 中途恢复

- 在 `step` 旁边同时保存 `(epoch, batch_in_epoch)`。
- 在恢复后的 epoch 的第一个 batch 之前还原 RNG 状态。
- 让数据生成器快进，跳过已经消费掉的 batch。

## 失败模式

- 跨设备重命名：不是原子操作，会丢掉上一个文件。临时文件要放在同一目录。
- 忘了保存 RNG：恢复后的损失偏离基线。运行 demo 里的断言来检查。
- 忘了保存优化器状态：下一步会猛地一跳。同样的 diff 会直接炸掉。
- 删错 checkpoint：保留最近 K 个外加最好的那个。
- 用 `weights_only=False` 加载：`.pt` 文件本质是 pickle，不可信的 checkpoint 在加载时就会执行代码。
