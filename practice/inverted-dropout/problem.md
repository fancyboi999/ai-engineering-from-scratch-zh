Dropout 会在训练时随机将一部分激活值设为 0。反向缩放 dropout（inverted dropout）还会将保留的激活值除以 $1 - p$，使每个激活值的期望不变。推理时该层不做任何处理。本题实现两种模式的前向传播和反向传播。

## 任务

编写两个函数。

1. `dropout_forward(x, p, rng, training=True)` 返回 `(out, mask)`。
2. `dropout_backward(grad_output, mask, p)` 返回损失对 `x` 的梯度。

训练模式下，只调用一次下式生成掩码：

$$\text{mask} = (\texttt{rng.random(x.shape)} \geq p)$$

掩码中的 `True` 表示**保留**。每个元素以概率 $p$ 被丢弃。输出为：

$$\text{out} = x \cdot \text{mask} / (1 - p)$$

推理模式（`training=False`）下，返回 `x` 的副本和一个全为 `True` 的掩码。推理时不要从 `rng` 抽取随机数。

反向传播使用前向传播生成的掩码： $\partial L / \partial x = \text{grad\_output} \cdot \text{mask} / (1 - p)$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | 浮点数组 | 任意形状 | 激活值 |
| `p` | 浮点数 | | 元素的丢弃概率，范围为 `0 <= p < 1` |
| `rng` | `np.random.Generator` | | 用来生成掩码的随机数生成器 |
| `training` | 布尔值 | | `True` 表示训练模式，`False` 表示推理模式 |
| `grad_output` | 浮点数组 | 与 `x` 相同 | 损失对 `out` 的梯度 |
| `mask` | 布尔数组 | 与 `x` 相同 | `dropout_forward` 返回的掩码 |

- `dropout_forward` 返回元组 `(out, mask)`。`out` 是浮点数组，`mask` 是布尔数组，两者的形状都与 `x` 相同。
- `dropout_backward` 返回形状与 `x` 相同的浮点数组。

## 约束

- `x` 有 1 到 4 个轴，元素总数不超过 40000。
- `0 <= p < 1`。
- 不要修改输入数组。
- 只使用 NumPy。

## 示例

```python
x = np.array([[1.0, 2.0, 3.0, 4.0], [5.0, 6.0, 7.0, 8.0]])
out, mask = dropout_forward(x, 0.5, np.random.default_rng(0))
grad = dropout_backward(np.ones((2, 4)), mask, 0.5)
```

```text
out
[[ 2.  0.  0.  0.]
 [10. 12. 14. 16.]]
mask
[[ True False False False]
 [ True  True  True  True]]
grad
[[2. 0. 0. 0.]
 [2. 2. 2. 2.]]
```

```python
out, mask = dropout_forward(x, 0.5, np.random.default_rng(0), training=False)
```

```text
out
[[1. 2. 3. 4.]
 [5. 6. 7. 8.]]
mask
[[ True  True  True  True]
 [ True  True  True  True]]
```
