Rectified Flow 会沿直线将样本从源分布变换到目标分布。网络会学习 $t$ 从 0 到 1 之间的速度场 $v(x, t)$。ODE 求解器随后沿速度场将源样本 $x_0$ 推进到目标样本。直线路径只需很少的求解步骤，因此采样速度快。

## 任务

编写四个函数。$x_0$ 是 $t = 0$ 时的源样本，$x_1$ 是 $t = 1$ 时的目标样本。

1. `interpolate(x0, x1, t)` 返回直线路径上的点：$x_t = (1 - t)\, x_0 + t\, x_1$。
2. `target_velocity(x0, x1)` 返回该路径的速度：$x_1 - x_0$。
3. `flow_matching_loss(velocity_fn, x0, x1, t)` 返回浮点型损失：

$$\mathcal{L} = \frac{1}{B} \sum_{b=1}^{B} \left\lVert (x_1^{(b)} - x_0^{(b)}) - v\big(x_t^{(b)}, t^{(b)}\big) \right\rVert^2$$

平方范数会对第一个轴之后的所有轴求和。整个批次只需调用一次 `velocity_fn`：`velocity_fn(x_t, t)`。

4. `euler_sample(velocity_fn, x0, num_steps)` 使用 $n$ = `num_steps` 个等长 Euler 步，在 $t = 0$ 到 $t = 1$ 之间积分 $dx/dt = v(x, t)$。令 $\Delta t = 1 / n$。对 $k = 0, 1, \ldots, n - 1$：

$$x \leftarrow x + \Delta t \cdot v(x, k \Delta t)$$

第 $k$ 步中，将每个元素都等于 $k \Delta t$、形状为 `(B,)` 的浮点数组作为 `t` 传入。返回最后一步后的 $x$。

**时间参数。** 在 `interpolate` 中，`t` 可以是浮点数，也可以是形状为 `(B,)` 的浮点数组。数组会为每行指定一个时间，并沿其他轴广播。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x0` | float 数组 | `(B, ...)` | 源样本 |
| `x1` | float 数组 | 与 `x0` 相同 | 目标样本，第 $b$ 行与 `x0` 第 $b$ 行配对 |
| `t` | float 或 float 数组 | 标量或 `(B,)` | 每行对应的时间，范围为 0 到 1 |
| `velocity_fn` | 函数 | | `velocity_fn(x, t)` 接收形状为 `(B, ...)` 的 `x` 和形状为 `(B,)` 的 `t`，并返回与 `x` 同形状的数组 |
| `num_steps` | int | | Euler 步数 |

- `interpolate` 和 `target_velocity` 返回与 `x0` 同形状的浮点数组。
- `flow_matching_loss` 返回 Python 浮点数。在此函数中，`t` 始终是形状为 `(B,)` 的数组。
- `euler_sample` 返回与 `x0` 同形状的浮点数组。

## 约束

- `1 <= B <= 256` 且 `1 <= num_steps <= 1000`。
- `x0` 可能包含整数。请用浮点数进行计算。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
x0 = np.array([[0.0, 1.0], [2.0, -1.0]])
x1 = np.array([[1.0, 1.0], [0.0, 3.0]])
t = np.array([0.25, 0.5])
interpolate(x0, x1, t)
target_velocity(x0, x1)
flow_matching_loss(lambda x, t: 0.5 * x, x0, x1, t)
```

```text
[[0.25 1.  ]
 [1.   1.  ]]
[[ 1.  0.]
 [-2.  4.]]
9.7578125
```

```python
euler_sample(lambda x, t: x, np.array([[1.0]]), 4)
euler_sample(lambda x, t: np.ones_like(x) * t[:, None], np.array([[0.0]]), 4)
```

```text
[[2.44140625]]
[[0.375]]
```
