Batch normalization（批归一化）会按小批次中的样本对每个特征做归一化，再用两个可学习向量缩放和平移各特征。训练时，它使用当前批次的统计量并更新运行均值；推理时，只使用运行统计量。你要实现两种模式的前向传播，以及训练模式的反向传播。

## 任务

编写两个函数。

1. `batchnorm_forward(x, gamma, beta, running_mean, running_var, momentum=0.1, eps=1e-5, training=True)` 返回 `(out, cache, new_running_mean, new_running_var)`。
2. `batchnorm_backward(grad_output, cache)` 返回 `(dx, dgamma, dbeta)`。

训练模式下，对包含 $N$ 行的小批次，按每个特征列 $j$ 计算：

$$\mu_j = \frac{1}{N} \sum_i x_{ij}, \quad \sigma^2_j = \frac{1}{N} \sum_i (x_{ij} - \mu_j)^2$$

$$\hat{x}_{ij} = \frac{x_{ij} - \mu_j}{\sqrt{\sigma^2_j + \epsilon}}, \quad \text{out}_{ij} = \gamma_j \hat{x}_{ij} + \beta_j$$

这里使用有偏方差，除数是 $N$，不是 $N - 1$。运行统计量也使用这种有偏方差：

$$\text{new mean} = (1 - m) \cdot \text{running mean} + m \cdot \mu, \quad \text{new var} = (1 - m) \cdot \text{running var} + m \cdot \sigma^2$$

其中 $m$ 是 `momentum`。

推理模式（`training=False`）下，用 `running_mean` 和 `running_var` 替代 $\mu$ 和 $\sigma^2$。返回未改变的运行统计量副本。推理模式的缓存可以是 `None`。

`batchnorm_backward` 接收损失对 `out` 的梯度，以及训练模式前向传播得到的缓存。它返回损失分别对 `x`、`gamma` 和 `beta` 的梯度。`dx` 必须包括 `x` 对 $\mu$ 和 $\sigma^2$ 的影响。

缓存格式由你决定。检查会把前向传播返回的缓存传给反向传播，但不会读取缓存内容。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | float 数组 | `(N, D)` | 一个批次，每行是一个样本，每列是一个特征 |
| `gamma` | float 数组 | `(D,)` | 每个特征的缩放系数 |
| `beta` | float 数组 | `(D,)` | 每个特征的平移量 |
| `running_mean` | float 数组 | `(D,)` | 本次调用前的运行均值 |
| `running_var` | float 数组 | `(D,)` | 本次调用前的运行方差 |
| `momentum` | float | | 当前批次统计量的权重，范围为 0 到 1 |
| `eps` | float | | 加到根号内方差上的小常数 |
| `training` | bool | | `True` 表示训练模式，`False` 表示推理模式 |
| `grad_output` | float 数组 | `(N, D)` | 损失对 `out` 的梯度 |

- `batchnorm_forward` 返回元组 `(out, cache, new_running_mean, new_running_var)`。`out` 的形状是 `(N, D)`，两个运行统计数组的形状都是 `(D,)`。
- `batchnorm_backward` 返回元组 `(dx, dgamma, dbeta)`，形状依次为 `(N, D)`、`(D,)` 和 `(D,)`。

## 约束

- `1 <= N <= 64`，且 `1 <= D <= 32`。
- 某个特征列可以是常量，此时方差为 0。
- 不要修改任何输入数组。运行统计量必须以新数组返回。
- 仅使用 numpy。

## 示例

```python
x = np.array([[1.0, 2.0], [3.0, 6.0], [5.0, 10.0]])
gamma = np.array([1.0, 0.5])
beta = np.array([0.0, 1.0])
out, cache, mean, var = batchnorm_forward(x, gamma, beta, np.zeros(2), np.ones(2))
dx, dgamma, dbeta = batchnorm_backward(np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]), cache)
```

```text
out
[[-1.22474258  0.38762785]
 [ 0.          1.        ]
 [ 1.22474258  1.61237215]]
mean
[0.3 0.6]
var
[1.16666667 1.96666667]
dx
[[ 0.20412376 -0.02551558]
 [-0.40824753  0.05103101]
 [ 0.20412376 -0.02551543]]
dgamma
[0.        1.2247443]
dbeta
[2. 2.]
```

```python
out, cache, mean, var = batchnorm_forward(np.array([[2.0, 4.0]]), gamma, beta, np.array([0.3, 0.6]), np.array([1.16666667, 1.96666667]), training=False)
```

```text
out
[[1.57388742 2.21222277]]
cache
None
```
