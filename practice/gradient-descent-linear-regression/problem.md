线性回归将特征加权求和，再加上偏置，以此预测一个数值。梯度下降用于寻找权重。它计算均方误差的梯度，并反复沿梯度反方向迈出一小步。课程后续的每个模型都会用到同样的训练循环。

## 任务

编写四个函数。

1. `predict(X, w, b)` 返回 `X` 每一行的预测值 $\hat{y} = Xw + b$。
2. `compute_cost(X, y, w, b)` 返回均方误差 $J = \frac{1}{n} \sum_i (\hat{y}_i - y_i)^2$。
3. `compute_gradients(X, y, w, b)` 返回 `(dw, db)`。其中 $dw = \frac{2}{n} X^\top (\hat{y} - y)$，$db = \frac{2}{n} \sum_i (\hat{y}_i - y_i)$。
4. `fit(X, y, learning_rate, epochs)` 执行批量梯度下降，返回 `(w, b, cost_history)`。

`fit` 遵循以下规则：

- 将 `w` 初始化为全零向量，并令 `b = 0.0`。
- 每轮训练使用当前的 `w` 和 `b` 计算 `dw` 和 `db`，然后同时更新两个参数：$w \leftarrow w - \eta \, dw$，$b \leftarrow b - \eta \, db$，其中 $\eta$ 是 `learning_rate`。
- 更新后，将新 `w` 和 `b` 对应的损失添加到 `cost_history`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `X` | 浮点数组 | `(n, d)` | `n` 个样本，每行包含一个样本的 `d` 个特征 |
| `y` | 浮点数组 | `(n,)` | 每个样本的目标值 |
| `w` | 浮点数组 | `(d,)` | 权重 |
| `b` | 浮点数 | 标量 | 偏置 |
| `learning_rate` | 浮点数 | 标量 | 步长 $\eta$，大于或等于 0 |
| `epochs` | 整数 | 标量 | 更新次数，大于或等于 0 |

- `predict` 返回形状为 `(n,)` 的浮点数组。
- `compute_cost` 返回 Python `float`。
- `compute_gradients` 返回元组，包含形状为 `(d,)` 的浮点数组 `dw` 和浮点数 `db`。
- `fit` 返回元组，包含形状为 `(d,)` 的浮点数组 `w`、浮点数 `b`，以及包含 `epochs` 个浮点数的列表。

## 约束

- `1 <= n <= 1000` 且 `1 <= d <= 50`。
- `0 <= epochs <= 5000`。
- 不要修改输入数组。
- 只使用 NumPy。不要在 `fit` 中使用 `np.linalg.lstsq` 等闭式解。

## 示例

```python
X = np.array([[1.0], [2.0], [3.0], [4.0]])
y = np.array([3.0, 5.0, 7.0, 9.0])
compute_cost(X, y, np.zeros(1), 0.0)
compute_gradients(X, y, np.zeros(1), 0.0)
```

```text
41.0
(array([-35.]), -12.0)
```

```python
w, b, cost_history = fit(X, y, 0.05, 500)
w, b, len(cost_history), cost_history[0]
```

```text
(array([2.00005173]), 0.9998479052895004, 500, 1.1287500000000006)
```

数据位于直线 $y = 2x + 1$ 上，因此 `w` 会接近 2，`b` 会接近 1。
