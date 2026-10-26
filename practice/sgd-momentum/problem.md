普通梯度下降只沿当前梯度更新。在狭长的谷底中，它会左右摆动，进展缓慢。Momentum 会累积过去的梯度作为速度，让方向一致的更新越来越大，让左右摆动的更新相互抵消。你要实现优化器课程中的 momentum 更新，并用它最小化二次函数。

## 任务

编写两个函数。

1. `momentum_step(params, grads, velocity, lr, beta)` 执行一次更新并返回 `(new_params, new_velocity)`。
2. `minimize_quadratic(A, b, x0, lr, beta, steps, nesterov)` 对 $f(x) = \frac{1}{2} x^T A x - b^T x$ 执行 `steps` 次 momentum 更新，并返回每一步的位置。

遵循课程中的速度定义。梯度不乘 $1 - \beta$：

$$v \leftarrow \beta v + g, \qquad \theta \leftarrow \theta - \eta v$$

参数使用更新后的速度移动，不使用旧速度。

二次函数的梯度为 $\nabla f(x) = A x - b$。速度从 0 开始。`nesterov=False` 时，在当前位置 $x$ 计算梯度；`nesterov=True` 时，在前瞻位置 $x - \eta \beta v$ 计算梯度，其中 $v$ 是更新前的速度。随后仍按同一 momentum 规则更新 $v$ 和 $x$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `params` | float 数组 | 任意形状 | 当前参数 |
| `grads` | float 数组 | 与 `params` 相同 | 当前参数处的梯度 |
| `velocity` | float 数组 | 与 `params` 相同 | 本步更新前的速度 |
| `lr` | float | 标量 | 学习率 $\eta$ |
| `beta` | float | 标量 | momentum 系数 $\beta$，范围为 0 到小于 1 |
| `A` | float 数组 | `(D, D)` | 对称正定矩阵 |
| `b` | float 数组 | `(D,)` | 线性项 |
| `x0` | float 数组 | `(D,)` | 起点 |
| `steps` | int | 标量 | 更新次数，可为 0 |
| `nesterov` | bool | 标量 | 是否使用前瞻梯度 |

- `momentum_step` 返回两个与 `params` 同形状的浮点数组：新参数和新速度。
- `minimize_quadratic` 返回形状为 `(steps + 1, D)` 的浮点数组。第 0 行是 `x0`，第 `k` 行是更新 `k` 次后的位置。

## 约束

- `1 <= D <= 10`，且 `0 <= steps <= 1000`。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
momentum_step(np.array([1.0, -2.0]), np.array([0.5, 0.5]), np.array([1.0, 0.0]), lr=0.1, beta=0.9)
```

```text
(array([ 0.86, -2.05]), array([1.4, 0.5]))
```

```python
A = np.array([[3.0, 0.0], [0.0, 1.0]])
b = np.array([3.0, -1.0])
minimize_quadratic(A, b, np.array([0.0, 0.0]), lr=0.1, beta=0.9, steps=3)
```

```text
[[ 0.     0.   ]
 [ 0.3   -0.1  ]
 [ 0.78  -0.28 ]
 [ 1.278 -0.514]]
```

```python
minimize_quadratic(A, b, np.array([0.0, 0.0]), lr=0.1, beta=0.9, steps=3, nesterov=True)
```

```text
[[ 0.       0.     ]
 [ 0.3     -0.1    ]
 [ 0.699   -0.271  ]
 [ 1.04067 -0.48241]]
```

这个二次函数的最小值位于 $x = (1, -1)$。
