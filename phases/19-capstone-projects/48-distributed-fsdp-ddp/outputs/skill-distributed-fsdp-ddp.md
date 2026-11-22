---
name: distributed-fsdp-ddp
description: 在 gloo 或 nccl 后端上启动多 rank 训练，包含一个从零实现的 DDP 封装和一个 FSDP 参数分片示意。
version: 1.0.0
phase: 19
lesson: 48
tags: [distributed, ddp, fsdp, collectives]
---

## 适用场景

模型能装进单个设备，但需要更高吞吐（DDP）。模型装不进单个设备（FSDP）。无论哪种情况，都是同一条代码路径的多 rank 训练配置。

## 建立进程组

```python
os.environ["MASTER_ADDR"] = "127.0.0.1"
os.environ["MASTER_PORT"] = str(port)
dist.init_process_group(backend="gloo", rank=rank, world_size=world_size)
```

`gloo` 是 CPU 后端；`nccl` 是 GPU 后端。两者实现的集合通信接口相同。

## 封装模型

1. 在 rank 0 上用你的随机种子构建模型。
2. 用 DDP 外壳把它包起来。
3. 外壳的 `__init__` 对每个参数和 buffer 调用 `dist.broadcast(p.data, src=0)`。
4. 每次 `loss.backward()` 之后，训练器调用 `sync_grads()`。
5. `sync_grads()` 调用 `dist.all_reduce(p.grad, op=SUM)` 和 `p.grad.div_(world_size)`。
6. 每个 rank 都用相同的平均梯度执行优化器 step。

## 参数分片（FSDP 示意）

1. 把每个参数展平，填充到 `world_size` 的整数倍。
2. 本地只保留自己的分片，其余释放。
3. 前向传播之前，用 `dist.all_gather(...)` 在每个 rank 上重建完整张量。
4. 前向传播之后，丢掉完整张量。

## 失败模式

- 跳过 broadcast：各 rank 从不同的初始化出发，悄无声息地分叉。
- 求和后忘了除：梯度被放大 world_size 倍，优化器步子太大。
- 保存 checkpoint 时用跨设备重命名：不是原子操作；和第 47 课是同一个坑。
- 在同一次集合通信里混用 CPU 和 CUDA 张量：后端不匹配，运行卡死。
