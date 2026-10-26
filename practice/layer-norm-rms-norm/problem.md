Transformer 会在 attention 和前馈模块之前分别对每个 token 向量做归一化。LayerNorm 会减去每个向量的均值，再除以标准差。RMSNorm 不做中心化，而是除以均方根。现代 LLM 常用 RMSNorm，因为它更省计算且效果相当。

## 任务

编写两个函数。

1. `layer_norm(x, gamma, beta, eps=1e-5)` 沿 `x` 的最后一个轴计算 LayerNorm。
2. `rms_norm(x, weight, eps=1e-6)` 沿 `x` 的最后一个轴计算 RMSNorm。

对于沿最后一个轴、长度为 $D$ 的每个向量 $x$：

$$\mu = \frac{1}{D} \sum_j x_j, \quad \sigma^2 = \frac{1}{D} \sum_j (x_j - \mu)^2, \quad \text{LayerNorm}(x)_j = \gamma_j \frac{x_j - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta_j$$

$$\text{RMSNorm}(x)_j = w_j \frac{x_j}{\sqrt{\frac{1}{D} \sum_k x_k^2 + \epsilon}}$$

这里使用有偏方差，除数为 $D$，而不是 $D - 1$。两个函数的 `eps` 都放在平方根内。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | float 数组 | `(..., D)` | 待归一化的向量，可带零个或多个前置轴 |
| `gamma` | float 数组 | `(D,)` | LayerNorm 中每个特征的缩放系数 |
| `beta` | float 数组 | `(D,)` | LayerNorm 中每个特征的平移量 |
| `weight` | float 数组 | `(D,)` | RMSNorm 中每个特征的缩放系数 |
| `eps` | float | | 加到平方根内的小常数 |

- 两个函数都返回与 `x` 同形状的浮点数组。

## 约束

- `x` 有 1 到 4 个轴。`1 <= D <= 1024`。
- 向量可以为常量或全零。输出中不能包含 NaN。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
x = np.array([[1.0, 2.0, 3.0, 4.0], [2.0, -2.0, 0.0, 4.0]])
gamma = np.array([1.0, 1.0, 2.0, 0.5])
beta = np.array([0.0, 0.5, 0.0, -1.0])
layer_norm(x, gamma, beta)
```

```text
[[-1.34163542  0.05278819  0.89442361 -0.32918229]
 [ 0.44721315 -0.84163944 -0.8944263  -0.32918028]]
```

```python
rms_norm(x, gamma)
```

```text
[[ 0.36514835  0.73029669  2.19089008  0.73029669]
 [ 0.81649651 -0.81649651  0.          0.81649651]]
```
