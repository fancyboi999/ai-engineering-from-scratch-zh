反向传播会计算损失对网络中每个权重的梯度。先运行一次前向传播并缓存反向传播所需的值，再从损失开始向输入方向应用链式法则。本题要为包含两层 sigmoid 和均方误差损失的网络实现前向与反向传播。

## 任务

编写三个函数。

1. `mlp_forward(x, params)` 对一个批次运行网络，并返回 `(output, cache)`。
2. `mse_loss(predicted, target)` 返回均方误差。
3. `mlp_backward(params, cache, target)` 返回损失对每个参数的梯度。

对于形状为 `(N, n_in)` 的批次 `x`，前向传播计算如下：

$$z_1 = x W_1 + b_1, \quad a_1 = \sigma(z_1), \quad z_2 = a_1 W_2 + b_2, \quad a_2 = \sigma(z_2)$$

这里 $\sigma(z) = 1 / (1 + e^{-z})$ 是 sigmoid 函数。输出为 $a_2$。偏置向量会加到每一行。

损失是全部 $N \cdot n_{out}$ 个元素的均值：

$$L = \frac{1}{N \, n_{out}} \sum_{i,j} (a_{2,ij} - y_{ij})^2$$

缓存结构由你决定，可以是任意 Python 对象。检查会将 `mlp_forward` 返回的缓存传给 `mlp_backward`，但不会读取其内容。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | float 数组 | `(N, n_in)` | 每行对应一条样本 |
| `params` | 由 float 数组组成的字典 | 见下文 | 网络参数 |
| `params["W1"]` | float 数组 | `(n_in, n_hidden)` | 隐藏层权重 |
| `params["b1"]` | float 数组 | `(n_hidden,)` | 隐藏层偏置 |
| `params["W2"]` | float 数组 | `(n_hidden, n_out)` | 输出层权重 |
| `params["b2"]` | float 数组 | `(n_out,)` | 输出层偏置 |
| `predicted` | float 数组 | `(N, n_out)` | `mlp_forward` 的输出 |
| `target` | float 数组 | `(N, n_out)` | 目标值，范围为 0 到 1 |
| `cache` | 任意 | | `mlp_forward` 返回的第二个值 |

- `mlp_forward` 返回元组 `(output, cache)`。`output` 是形状为 `(N, n_out)` 的浮点数组。
- `mse_loss` 返回 Python `float`。
- `mlp_backward` 返回包含键 `"W1"`、`"b1"`、`"W2"` 和 `"b2"` 的字典。每个值都是与对应参数同形状的浮点数组，表示损失 $L$ 对该参数的偏导数。

## 约束

- `1 <= N <= 64`、`1 <= n_in, n_hidden, n_out <= 16`。
- 权重和输入可以很大，激活前的数值可能达到 1000 或更高。输出和梯度都不能出现 NaN 或无穷大。
- 不要修改 `x`、`target` 或 `params` 中的数组。
- 仅使用 numpy。

## 示例

```python
x = np.array([[0.0, 1.0], [1.0, 0.0]])
params = {
    "W1": np.array([[0.5, -0.5, 1.0], [0.25, 0.75, -1.0]]),
    "b1": np.array([0.0, 0.1, -0.1]),
    "W2": np.array([[1.0], [-1.0], [0.5]]),
    "b2": np.array([0.2]),
}
target = np.array([[1.0], [0.0]])
output, cache = mlp_forward(x, params)
loss = mse_loss(output, target)
grads = mlp_backward(params, cache, target)
```

```text
output
[[0.5464852 ]
 [0.68495157]]
loss
0.33741716
grads["W2"]
[[ 0.02881637]
 [-0.01942579]
 [ 0.07701337]]
grads["b2"]
[0.03540898]
grads["W1"]
[[ 0.03473536 -0.03551239  0.01518726]
 [-0.02766515  0.0235782  -0.01053007]]
grads["b1"]
[ 0.0070702  -0.01193419  0.0046572 ]
```
