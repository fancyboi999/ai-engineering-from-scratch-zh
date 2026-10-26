量化用较小的整数存储权重，并为每组数值保存一个浮点 scale。对称 INT8 量化将绝对值最大的元素映射到 127，将 0 映射到 0。逐张量 scale 为整个矩阵使用同一个数；逐行 scale 则为每行单独缩放，避免某一行的离群值降低其他行的精度。

## 任务

编写四个函数。

1. `quantize_symmetric(tensor)` 返回 `(quantized, scale)`，整个张量共用一个 scale。
2. `dequantize_symmetric(quantized, scale)` 返回浮点张量。
3. `quantize_per_channel(tensor)` 返回 `(quantized, scales)`，二维张量的每一行各有一个 scale。
4. `dequantize_per_channel(quantized, scales)` 返回浮点张量。

对于一组数值 $x$（整个张量或其中一行）：

$$\text{scale} = \max |x| / 127, \quad q = \text{clip}(\text{round}(x / \text{scale}), -127, 127)$$

使用 `np.round`。若数值恰好位于两个整数中间，它会舍入到最近的偶数，因此 2.5 会变成 2。反量化值为 $q \cdot \text{scale}$。

当 $\max |x| = 0$ 时，该组 scale 设为 `1.0`，量化后的值全部为 0。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `tensor` | 浮点数组 | `quantize_symmetric` 时形状不限；`quantize_per_channel` 时为 `(R, C)` | 待量化的数值 |
| `quantized` | int8 数组 | 与 `tensor` 相同 | 量化后的整数值 |
| `scale` | 浮点数 | | 整个张量使用的 scale |
| `scales` | 浮点数组 | `(R,)` | 每一行的 scale |

- `quantize_symmetric` 返回元组 `(quantized, scale)`。`quantized` 是形状与 `tensor` 相同的 `np.int8` 数组，`scale` 是 Python 浮点数。
- `quantize_per_channel` 返回元组 `(quantized, scales)`。`quantized` 是形状为 `(R, C)` 的 `np.int8` 数组。`scales` 的形状为 `(R,)`，即使 R 为 1 也保持一维。
- 两个反量化函数都会返回形状与 `quantized` 相同的 `float64` 数组。

## 约束

- `1 <= R, C <= 256`，所有输入值都必须有限。
- 不要修改输入数组。
- 只使用 NumPy。

## 示例

```python
tensor = np.array([[0.5, -1.0, 0.25], [2.0, 0.1, -0.04]])
q, scale = quantize_symmetric(tensor)
```

```text
q
[[ 32 -64  16]
 [127   6  -3]]
scale
0.015748031496062992
dequantize_symmetric(q, scale)
[[ 0.50393701 -1.00787402  0.2519685 ]
 [ 2.          0.09448819 -0.04724409]]
```

```python
q, scales = quantize_per_channel(tensor)
```

```text
q
[[  64 -127   32]
 [ 127    6   -3]]
scales
[0.00787402 0.01574803]
dequantize_per_channel(q, scales)
[[ 0.50393701 -1.          0.2519685 ]
 [ 2.          0.09448819 -0.04724409]]
```

```python
quantize_per_channel(np.array([[0.0, 0.0], [1.0, -3.0]]))
```

```text
q
[[   0    0]
 [  42 -127]]
scales
[1.         0.02362205]
```
