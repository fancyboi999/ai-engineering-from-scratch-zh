---
name: skill-noise-schedule-designer
description: 根据 T 和目标破坏程度生成 linear、cosine 或 sigmoid 的 beta 调度，并给出 SNR 曲线
version: 1.0.0
phase: 4
lesson: 10
tags: [computer-vision, diffusion, noise-schedule, training]
---

# 噪声调度设计器

beta 调度决定了每个扩散步保留多少信号。调度设计得差，训练效率和样本质量的上限就被锁死，后面怎么调都救不回来。

## 何时使用

- 开始新的扩散训练，需要选定 T 和 beta。
- 排查扩散模型的问题：样本模糊（调度太激进），或学不到结构（调度太温和）。
- 比较不同论文中采用不同调度的设计。

## 输入

- `T`：时间步数，通常为 100-1000。
- `type`：linear | cosine | sigmoid。
- `target_alpha_bar_final`：在 t=T 时保留的信号比例，默认 0.001（99.9% 被破坏）。
- 可选 `image_resolution`：图像越大，越适合破坏得更慢的调度（cosine 或平移后的调度）。

## 调度公式

### Linear
```
beta_t = beta_start + (beta_end - beta_start) * (t - 1) / (T - 1)
```
默认值：beta_start=1e-4，beta_end=0.02（DDPM 论文）。

### Cosine（Nichol & Dhariwal, 2021）
```
alpha_bar_t = cos^2((t/T + s) / (1 + s) * pi/2)
beta_t = 1 - alpha_bar_t / alpha_bar_{t-1}
```
s = 0.008。信号保留得更久；步数少时效果更好。

### Sigmoid
```
alpha_bar_t = 1 / (1 + exp(k * (t/T - 0.5)))
```
k = 6 到 12。折中的选择；部分 SDXL 变体在用。

## 步骤

1. 按公式计算 beta。
2. 预先计算 `alphas`、`alphas_cumprod`、`sqrt_alphas_cumprod`、`sqrt_one_minus_alphas_cumprod`。
3. 计算 SNR_t = alpha_bar_t / (1 - alpha_bar_t)，生成 SNR 随时间变化的汇总。
4. 检查 `alphas_cumprod[T-1]` 是否在 `target_alpha_bar_final` 的 10% 以内；不在的话，调整 beta_end（linear）、s（cosine）或 k（sigmoid）后重试。
5. 报告三个检查点：
   - `t=T*0.25`：早期破坏
   - `t=T*0.5`：中段
   - `t=T*0.75`：接近末尾

## 报告

```
[schedule]
  type:   <name>
  T:      <int>
  beta_start: <float>   beta_end: <float>

[signal retention]
  t=0.25T:  alpha_bar=<X>  SNR=<X>
  t=0.5T:   alpha_bar=<X>  SNR=<X>
  t=0.75T:  alpha_bar=<X>  SNR=<X>
  t=T:      alpha_bar=<X>  SNR=<X>

[warnings]
  - <if alpha_bar collapses before 0.75T>
  - <if beta_end produces NaN in log-SNR>
```

## 规则

- 绝不输出任何 `alpha_bar_t <= 0` 的调度；把低于 1e-5 的值截断并发出警告。
- 少步数采样（< 30 步）默认推荐 cosine。
- `quality_target == research` 默认用 linear：DDPM 基线都是用 linear 调度报告的。
- 当 `image_resolution > 256` 时，建议平移调度（Chen, 2023），在高分辨率下保留更多信号。
