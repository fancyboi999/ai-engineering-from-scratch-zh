---
id: optimizers-schedules
title: 优化器与学习率调度
code: OL
subtitle: 选择 SGD、Adam 或 AdamW，设置学习率曲线，再安全地裁剪、缩放和累积梯度。
hue: 28
sources: phases/03-deep-learning-core/06-optimizers, phases/03-deep-learning-core/09-learning-rate-schedules, phases/19-capstone-projects/44-cosine-lr-warmup, phases/19-capstone-projects/45-gradient-clipping-amp, phases/19-capstone-projects/46-gradient-accumulation
source_hash: 725c899653ede8da
---

## 优化器对比
type: comparison
span: 2
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/06-optimizers/code/main.py

| 优化器 | 默认值 | 行为 |
|---|---|---|
| `SGD` | `lr=0.01` | 所有权重共用一个学习率，在谷地两侧振荡 |
| `SGDMomentum` | `lr=0.01, beta=0.9` | 保留约最近 10 次梯度，需 3,000-5,000 步而非 10,000 步 |
| RMSProp | `epsilon=1e-8` | 每个梯度除以运行均方根 |
| `Adam` | `lr=0.001, beta1=0.9, beta2=0.999` | 动量加 RMSProp 加偏差校正 |
| `AdamW` | `weight_decay=0.01` | 与 Adam 相同，但衰减不受自适应因子缩放 |

## 更新规则
type: concepts
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md

- **SGD**：$w = w - \text{lr} \cdot g$
- **动量**：$m_t = \beta m_{t-1} + g$，然后 $w = w - \text{lr} \cdot m_t$
- **RMSProp**：$s_t = \beta s_{t-1} + (1 - \beta) g^2$，步长为 $\text{lr} \cdot g / (\sqrt{s_t} + \epsilon)$
- **Adam 的矩**：$m_t = \beta_1 m_{t-1} + (1 - \beta_1) g$，$v_t = \beta_2 v_{t-1} + (1 - \beta_2) g^2$
- **偏差校正**：$\hat{m} = m_t / (1 - \beta_1^t)$，对最初约 10 步很重要。
- **Adam 更新**：$w = w - \text{lr} \cdot \hat{m} / (\sqrt{\hat{v}} + \epsilon)$
- **AdamW 更新**：先做 Adam 更新，再对权重应用 $- \text{lr} \cdot \lambda w$。

## 各优化器的适用条件
type: tips
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md

- transformer 或 LLM 使用 AdamW：lr=1e-4、wd=0.01-0.1。
- CNN 或 ResNet 使用 SGD + Momentum：lr=0.1、momentum=0.9、weight_decay=1e-4。
- GAN 使用 Adam：lr=2e-4、beta1=0.5。
- 微调使用 AdamW：lr=2e-5、wd=0.01。
- 暂时无法确定时，使用 AdamW，lr=3e-4、wd=0.01。
- 默认值无效时，先改 lr，再改 $\beta_2$，几乎不用改 $\beta_1$ 或 $\epsilon$。

## 调度方法对比
type: command-table
span: 2
from: phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/code/main.py, phases/19-capstone-projects/44-cosine-lr-warmup/code/main.py

| 命令 | 作用 |
|---|---|
| `constant_schedule(step, lr=0.01)` | 每步学习率相同，用于小模型和调试 |
| `step_decay_schedule(step, lr=0.1, step_size=100, gamma=0.1)` | 每隔固定步数将 lr 乘 gamma，突降可能使损失尖峰 |
| `cosine_schedule(step, lr=0.01, total_steps=1000, lr_min=1e-5)` | 从 lr 余弦衰减到 lr_min，中等预算的稳妥默认值 |
| `warmup_cosine_schedule(step, lr=0.01, total_steps=1000, warmup_steps=100, lr_min=1e-5)` | 先线性上升，再余弦衰减，用于大预算 |
| `one_cycle_schedule(step, lr=0.01, total_steps=1000)` | 从 lr/25 上升，再降到 lr/10000，用于小预算 |
| `CosineWithWarmup(warmup_steps, total_steps, lr_max, lr_min)` | 预热加余弦，检查边界，并固定在 `lr_min` |
| `InverseSqrtWarmup(warmup_steps, lr_max)` | 线性预热，再按 `lr_max * sqrt(warmup_steps / step)` 衰减 |
| `LinearWarmupConstant(warmup_steps, lr_max)` | 线性预热后保持 `lr_max`，用作消融基线 |

## 选择调度方法
type: flow
from: phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md

1. **总步数未知**：使用恒定学习率并手动衰减。
2. **大预算，数天或数周**：使用预热加余弦衰减，预热占总步数的 1-5%。
3. **中等预算**：使用余弦退火，设置 lr_min = lr_max / 10。
4. **小预算，数小时**：使用 1cycle，通过学习率范围测试找到 lr_max。
5. **微调 Llama 或 GPT 模型**：使用 `get_cosine_schedule_with_warmup`，预热占总步数的 3-5%。

## 线性预热加余弦
type: annotated-code
lang: python
from: phases/19-capstone-projects/44-cosine-lr-warmup/code/main.py

```python
def lr(self, step: int) -> float:
    if step < 0:
        raise ValueError(f"step must be non-negative, got {step}")
    if self.warmup_steps > 0 and step <= self.warmup_steps:
        return self.lr_max * (step / self.warmup_steps)   # 第 0 步为 0
    if step >= self.total_steps:
        return self.lr_min                                 # 下限，不做外推
    decay_span = max(1, self.total_steps - self.warmup_steps)
    progress = (step - self.warmup_steps) / decay_span
    cosine = 0.5 * (1.0 + math.cos(math.pi * progress))
    return self.lr_min + (self.lr_max - self.lr_min) * cosine
```

## 单步中的裁剪与缩放
type: annotated-code
lang: python
from: phases/19-capstone-projects/45-gradient-clipping-amp/code/main.py, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md

```python
self.optimizer.zero_grad(set_to_none=True)
with torch.amp.autocast(device_type=self.device_type, dtype=self.amp_dtype):
    predictions = self.model(inputs)
    loss = self._loss_fn(predictions, targets)
if not torch.isfinite(loss).all().item():   # 跳过，不调用 update()
    return self._record_skip(...)
self.scaler.scale(loss).backward()
self.scaler.unscale_(self.optimizer)        # 取消缩放后再裁剪
if has_non_finite_grad(self.model.parameters()):
    self.scaler.update()                     # 跳过，缩放器将因子减半
pre_clip, post_clip = clip_global_l2_norm(list(self.model.parameters()), self.max_norm)
self.scaler.step(self.optimizer)
self.scaler.update()                         # 将因子翻倍或减半
```

## 梯度累积
type: annotated-code
lang: python
from: phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/code/main.py

```python
accumulation_steps = effective_batch // (micro_batch * world_size)
for x, y in chunks(x_full, y_full, n):    # n 个微批次
    scaled = criterion(model(x), y) / n     # 反向传播前先除以 n
    scaled.backward()                       # 梯度累加在 param.grad 中
opt.step()                                  # 每个有效批次执行一次
with no_sync_context(model):                # 除最后一个外的所有微批次
    loss.backward()
```

## 关键数字
type: defaults
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Adam/AdamW 学习率 | 1e-4 至 3e-4 | 微调使用 1e-5 至 5e-5 |
| 预热 | 1-5% | 第 44 课建议占总步数的 1-3% |
| `lr_min` | 10% | 相对于 `lr_max`，设为零会使训练不充分 |
| 阶梯衰减 | $\gamma = 0.1$ | step_size = 30 时，每 30 个 epoch 将 lr 降低 10 倍 |
| `max_norm` | 1.0 | 语言模型训练默认值 |
| 缩放因子 | `2^17` | 健康运行通常稳定在 `2^17` 或 `2^18` 附近 |
| 跳步率警报 | 5% | 在 1,000 步滚动窗口中统计 |
| 累积检查 | `max_abs_diff < 1e-4` | 比较完整批次与微批次 |

## 故障排查
type: troubleshooting
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失爆炸、权重为 NaN | lr 过高（lr > 0.01） | 降低 lr，加入预热 |
| 损失缓慢下降 | lr 过低（lr < 0.00001） | 提高 lr，先扫描 `lr_max` |
| 最小值附近损失振荡 | 后期恒定 lr 太大 | 使用余弦或阶梯衰减 |
| 某一批次损失陡升 | 梯度范数尖峰 | 将全局 L2 范数裁剪到 1.0 |
| 缩放因子始终不变 | 跳步路径没有调用 `update()` | 每步都调用 `scaler.update()` |
| 优化器更新大了 16 倍 | 微批次损失直接求和 | 每份损失除以 `accum_steps` |
| 隐蔽的调度错误 | 先调用 `scheduler.step()` | 先调用 `optimizer.step()` |
| 长预热无法随规模调整 | 预热设为固定步数 | 按总步数比例设置预热 |

## 问答
type: qa
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md

- **Adam 为什么需要预热？** 矩估计从零开始，早期步骤使用的统计量不准确。
- **为什么用 AdamW 而非 Adam 加 L2？** 每个参数得到相同的比例收缩。
- **CNN 为什么用 SGD？** SGD 找到更平坦的极小值，通常泛化更好。
- **1cycle 需要什么？** 预先知道总步数。
- **梯度累积省时间吗？** 不省。`accum_steps` 翻倍时，每次优化器更新的实际耗时也翻倍。
- **CPU autocast 需要损失缩放吗？** 不需要。CPU autocast 默认使用 BF16。
