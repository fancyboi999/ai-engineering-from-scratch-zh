---
name: skill-rectified-flow-trainer
description: 编写完整的 rectified-flow 训练循环，使用 AdaLN DiT 和 Euler 采样
version: 1.0.0
phase: 4
lesson: 23
tags: [diffusion, rectified-flow, DiT, training]
---

# Rectified Flow 训练器

生成一个干净、最小化的训练循环，能在任意图像张量数据集上用 rectified flow 成功训练一个小型 DiT。

## 何时使用

- 在小规模上复现 SD3 / FLUX 的训练目标。
- 在同一份数据上对比 rectified flow 和 DDPM。
- 为非标准领域（医学、卫星）构建自定义的 rectified-flow 模型。

## 输入

- `model`：一个接收 `(x, t)`、返回预测速度的 `nn.Module`。
- `dataset`：模型所在领域的干净图像可迭代对象。
- `optimizer`：AdamW，`lr=1e-4`、`weight_decay=0.01`、`betas=(0.9, 0.99)`。
- `scheduler`：带 warmup 的余弦调度，默认 warmup 1000 步。

## 训练步

```python
def rectified_flow_train_step(model, x0, optimizer, device):
    model.train()
    x0 = x0.to(device)
    n = x0.size(0)
    t = torch.rand(n, device=device)                     # [0, 1] 上均匀分布
    epsilon = torch.randn_like(x0)
    x_t = (1 - t[:, None, None, None]) * x0 + t[:, None, None, None] * epsilon
    target_v = epsilon - x0                              # 速度目标
    pred_v = model(x_t, t)
    loss = F.mse_loss(pred_v, target_v)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    return loss.item()
```

## 采样（Euler）

```python
@torch.no_grad()
def sample(model, shape, steps=20, device="cpu"):
    model.eval()
    x = torch.randn(shape, device=device)
    dt = 1.0 / steps
    t = torch.ones(shape[0], device=device)
    for _ in range(steps):
        v = model(x, t)
        x = x - dt * v
        t = t - dt
    return x
```

## 技巧

- 用 `torch.rand` 均匀采样 `t`；对 `t` 做 logit-normal 或 Sd3 式的加权采样略有帮助，但入门时不是必需的。
- 对模型权重做 EMA 是标准做法；维护一个衰减率为 0.9999 的 `ema_model`。
- 条件模型的 classifier-free guidance：训练时以 10% 的概率把条件替换成空/null 嵌入；推理时按 `v_uncond + w * (v_cond - v_uncond)` 混合，`w` 取 3-5 左右。
- 对 LDM 式训练（FLUX、SD3），整个循环都在 VAE 潜空间里运行；上面的干净 `x0` 实际上是 `VAE.encode(image)`。
- 在 32x32 的玩具数据集上，通常 2000-5000 步收敛。真实的 SD3 潜空间训练则要几十万步。

## 报告

```
[rectified flow training]
  steps:        <int>
  final loss:   <float>
  ema decay:    <float>
  vae?:         yes | no
  cfg dropout:  <fraction>

[sampling]
  default steps: 20
  schnell / turbo target: 4
  full quality reference: 50+ (for comparison only)
```

## 规则

- 绝不在 RGB `uint8` 数据上直接用图像空间的速度目标训练 rectified flow；先归一化到零均值、单位方差。
- 一律按时间步分桶记录训练损失；如果早期时间步（接近 0）的损失高于后期时间步（接近 1），速度参数化很可能接错了。
- 不要在同一个训练循环里混用 rectified-flow 的速度目标和 DDPM 的噪声目标；二选一。
- 在 Ampere 及更新的 GPU 上用 bfloat16 训练；由于速度的量级，float16 在 rectified flow 中有时会产生 NaN 梯度。
