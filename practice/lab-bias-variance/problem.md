模型可能以两种方式偏离真实规律。模型过于简单时，会在每个训练集上都拟合不足，这就是偏差。模型过于灵活时，会随训练集的变化而大幅改变，这就是方差。本实验会在多次重采样的训练集上拟合 1 到 12 阶多项式，并测量这两部分误差。

`support.py` 提供真实函数 $f(x) = \sin(1.5x) + 0.5x$、数据生成器、最小二乘多项式拟合函数，以及测试点 `X_TEST`：从 $-2.5$ 到 $2.5$ 的 100 个点。`generate_data(n_samples, noise_std, seed)` 在 $[-3, 3]$ 上均匀采样 $x$，并生成 $y = f(x) + \epsilon$，其中 $\epsilon \sim N(0, \sigma^2)$。

## 任务

编写五个辅助函数和 `answers()`。`predictions` 的每一行对应一轮训练 $b = 1 \dots B$，每一列对应一个测试点 $t = 1 \dots T$。令 $\bar p_t$ 为第 $t$ 列的均值。

1. `decompose(predictions, y_true)` 返回元组 `(bias_sq, variance)`。
   - $\text{bias}^2 = \frac{1}{T} \sum_t (\bar p_t - f_t)^2$。
   - $\text{variance} = \frac{1}{T} \sum_t \frac{1}{B} \sum_b (p_{bt} - \bar p_t)^2$。除以 $B$，而不是 $B - 1$。
2. `expected_test_error(predictions, y_true, noise_std)` 返回 $\frac{1}{BT} \sum_{b,t} (p_{bt} - f_t)^2 + \sigma^2$。
3. `sweep_degrees(degrees, n_rounds, n_train, noise_std, seed=0)` 返回字典。每个键是一个阶数，每个值是包含 `"bias_sq"`、`"variance"` 和 `"test_error"` 三个键的字典。对于每个阶数以及从 `0` 到 `n_rounds - 1` 的每轮 `b`：
   1. 用 `generate_data(n_train, noise_std, seed=seed + b)` 生成训练集。所有阶数使用相同的训练集。
   2. 用 `fit_polynomial` 拟合，再用 `predict_polynomial` 在 `X_TEST` 上预测。
   3. 将预测值与 `true_function(X_TEST)` 比较。
4. `best_degree(results)` 返回 `test_error` 最低的阶数。如果两个阶数并列，返回较低阶数。
5. `crossover_degree(results)` 返回 `variance` 大于或等于 `bias_sq` 的最低阶数。如果没有阶数满足条件，返回 `None`。

然后在 `answers()` 中完成实验。

1. 遍历 `DEGREES` 中从 1 到 12 的阶数。使用 `N_ROUNDS`、`N_TRAIN`、`NOISE_STD` 和 `seed=0`。
2. 测量每个阶数的偏差平方、方差和测试误差。
3. 返回 `best_degree`，并将其测试误差记为 `best_test_error`。
4. 返回 `crossover_degree`。
5. 将 1 阶的偏差平方记为 `bias_sq_degree_1`，将 12 阶的方差记为 `variance_degree_12`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `predictions` | 浮点数组 | `(B, T)` | 每一行是一轮训练在测试点上的预测值 |
| `y_true` | 浮点数组 | `(T,)` | 测试点上的真实函数值，不含噪声 |
| `noise_std` | 浮点数 | 标量 | 噪声标准差 $\sigma$ |
| `degrees` | 整数列表 | `(k,)` | 待拟合的多项式阶数 |
| `n_rounds` | 整数 | 标量 | 训练集数量 $B$ |
| `n_train` | 整数 | 标量 | 每个训练集的数据点数量 |
| `results` | 字典 | `k` 个键 | `sweep_degrees` 的输出 |

- `decompose` 返回由两个浮点数构成的元组。
- `expected_test_error` 返回浮点数。
- `best_degree` 和 `crossover_degree` 返回 `results` 中作为键的整数阶数。`crossover_degree` 也可能返回 `None`。
- `answers()` 返回包含上述五个键的字典。每个值都是 Python `float`。

## 约束

- `1 <= B <= 200` 且 `1 <= T <= 200`。
- 不要修改输入数组。
- 不要对答案舍入。检查允许答案与参考运行结果的相对差异不超过 `1e-6`。
- 只使用 NumPy 和标准库。

## 示例

```python
P = np.array([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
Y = np.array([1.5, 2.0, 2.0])
decompose(P, Y)
```

```text
(0.08333333333333333, 0.6666666666666666)
```

```python
expected_test_error(P, Y, 0.5)
```

```text
1.0
```

误差是 $0.0833 + 0.6667 + 0.25$ 之和。

```python
result = sweep_degrees([1, 3], n_rounds=5, n_train=20)
result[3]
```

```text
{'bias_sq': 0.06179704932177359, 'variance': 0.052499400227697696, 'test_error': 0.3642964495494713}
```
