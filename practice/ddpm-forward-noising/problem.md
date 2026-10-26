扩散模型学习如何去除噪声。训练时，需要向干净数据加入已知量的高斯噪声。DDPM 用一系列小幅加噪步骤的调度来定义这个前向过程。你可以用闭式公式直接跳到任意一步；已知干净数据时，还能计算一个反向步骤的精确后验分布。

## 任务

编写三个函数。时间步从 0 开始：$t = 0, 1, \ldots, T - 1$。

1. `make_schedule(T, beta_start=1e-4, beta_end=0.02)` 返回 `(betas, alphas, alpha_bars)`。
2. `q_sample(x0, t, alpha_bars, noise)` 根据 $x_0$ 返回 $x_t$ 的一个样本。
3. `posterior_mean_variance(x0, x_t, t, betas, alpha_bars)` 返回 $q(x_{t-1} \mid x_t, x_0)$ 的均值和方差。

**调度。** beta 线性变化：$\beta_t = \beta_{start} + (\beta_{end} - \beta_{start}) \cdot t / (T - 1)$。因此 $\beta_0 = \beta_{start}$，$\beta_{T-1} = \beta_{end}$。然后计算 $\alpha_t = 1 - \beta_t$ 和 $\bar{\alpha}_t = \prod_{s=0}^{t} \alpha_s$。

**闭式采样。** 使用给定的噪声 $\epsilon$：

$$x_t = \sqrt{\bar{\alpha}_t}\, x_0 + \sqrt{1 - \bar{\alpha}_t}\, \epsilon$$

**后验。** 当 $t = 0$ 时，定义 $\bar{\alpha}_{t-1} = 1$。则

$$\tilde{\mu}_t = \frac{\sqrt{\bar{\alpha}_{t-1}}\, \beta_t}{1 - \bar{\alpha}_t}\, x_0 + \frac{\sqrt{\alpha_t}\, (1 - \bar{\alpha}_{t-1})}{1 - \bar{\alpha}_t}\, x_t, \qquad \tilde{\beta}_t = \frac{1 - \bar{\alpha}_{t-1}}{1 - \bar{\alpha}_t}\, \beta_t$$

**时间步。** `t` 是整数或形状为 `(B,)` 的整数数组。当 `t` 为数组时，批次的第 `b` 个样本为 `x0[b]`，使用时间步 `t[b]`。此时系数要沿第一轴之后的所有轴广播。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `T` | 整数 | | 步数 |
| `beta_start`, `beta_end` | 浮点数 | | 第一个和最后一个 beta |
| `x0` | 浮点数组 | `(B, ...)`；`t` 为整数时可为任意形状 | 干净数据 |
| `x_t` | 浮点数组 | 与 `x0` 相同 | 时间步 `t` 的带噪数据 |
| `noise` | 浮点数组 | 与 `x0` 相同 | 高斯噪声 $\epsilon$ |
| `t` | 整数或整数数组 | 标量或 `(B,)` | 每个样本的时间步 |
| `betas`, `alpha_bars` | 浮点数组 | `(T,)` | `make_schedule` 生成的调度 |

- `make_schedule` 返回三个形状为 `(T,)` 的浮点数组。
- `q_sample` 返回与 `x0` 形状相同的浮点数组。
- `posterior_mean_variance` 返回元组 `(mean, variance)`。`mean` 的形状与 `x0` 相同。当 `t` 为整数时，`variance` 为浮点数。当 `t` 为数组时，`variance` 的形状为 `(B, 1, ...)`，可与 `x0` 广播。

## 约束

- `2 <= T <= 1000`，且 `0 < beta_start < beta_end < 1`。
- `0 <= t <= T - 1`。
- 不得修改输入数组。
- 仅使用 NumPy。

## 示例

```python
betas, alphas, alpha_bars = make_schedule(5, 0.1, 0.5)
```

```text
betas      [0.1 0.2 0.3 0.4 0.5]
alphas     [0.9 0.8 0.7 0.6 0.5]
alpha_bars [0.9    0.72   0.504  0.3024 0.1512]
```

```python
x0 = np.array([1.0, -2.0])
noise = np.array([0.5, 0.5])
x_t = q_sample(x0, 2, alpha_bars, noise)
mean, variance = posterior_mean_variance(x0, x_t, 2, betas, alpha_bars)
```

```text
x_t      [ 1.06206591 -1.06772281]
mean     [ 1.01484497 -1.53073944]
variance 0.1693548387096774
```
