量化会用小整数和一个浮点缩放系数存储每个权重。位数越少，节省的内存越多，但每减少一位，舍入步长就会加倍。极端离群值会决定缩放系数，让量化效果变差。本实验会对含离群值的权重矩阵扫描 2 至 8 bit，并比较全矩阵共用一个缩放系数与每行单独使用缩放系数时的误差。

`support.py` 提供 `make_weights(seed)`。它返回形状为 `(64, 128)` 的权重矩阵，权重服从标准差为 0.02 的正态分布，并在不同的六行中插入接近 $\pm 0.25$ 的离群值。它还提供位宽列表 `BITS` 和误差阈值 `THRESHOLD = 0.05`。starter 提供 `qrange(num_bits)`，返回有符号范围 $(q_{min}, q_{max}) = (-2^{b-1}, 2^{b-1} - 1)$。

## 任务

编写六个辅助函数和 `answers()`。

1. `quantize_symmetric(tensor, num_bits)` 返回 `(quantized, scale)`。缩放系数为 $s = \max \lvert W \rvert / q_{max}$。若 $\max \lvert W \rvert = 0$，则使用 $s = 1.0$。整数编码为 `round(W / s)`，并截断到 $[q_{min}, q_{max}]$。使用 `np.round`，它会将中间值舍入到最近的偶数。
2. `quantize_per_row(tensor, num_bits)` 执行相同的量化，但每行使用各自的缩放系数。它返回编码及形状为 `(rows,)` 的浮点数组。零行的缩放系数为 1.0。
3. `dequantize(quantized, scale)` 返回浮点数组 `quantized * scale`。若 `scale` 是一维数组，第 $i$ 行使用 `scale[i]`。
4. `relative_error(original, reconstructed)` 返回相对误差 $\lVert W - \hat W \rVert_F / \lVert W \rVert_F$。
5. `bit_sweep(tensor, bits, per_row)` 为 `bits` 中的每个位宽返回一个相对误差。`per_row` 为 `True` 时使用 `quantize_per_row`，否则使用 `quantize_symmetric`。
6. `smallest_bits(bits, errors, threshold)` 返回误差小于或等于 `threshold` 的最小位宽。没有位宽符合条件时，返回 `None`。

然后在 `answers()` 中执行实验。

1. 用 `make_weights(seed=0)` 生成权重。
2. 遍历 `BITS` 中的位宽，测量整个矩阵共用一个缩放系数时的相对误差。
3. 每行使用独立缩放系数，再执行一次步骤 2。
4. 将两种方法在 `THRESHOLD` 下所需的最小位宽分别写入 `smallest_bits_per_tensor` 和 `smallest_bits_per_row`。
5. 将 4 bit 误差写入 `error_4bit_per_tensor` 和 `error_4bit_per_row`。两者相除（逐张量误差除以逐行误差）后写入 `per_row_gain_4bit`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `tensor` | float 数组 | `(rows, cols)` | 权重矩阵 |
| `num_bits` | int | 标量 | 位宽 $b$，范围为 2 到 8 |
| `quantized` | int 数组 | `(rows, cols)` | 整数编码 |
| `scale` | float 或 float 数组 | 标量或 `(rows,)` | 一个缩放系数，或每行一个缩放系数 |
| `bits` | int 列表 | `(k,)` | 扫描的位宽，按升序排列 |
| `errors` | 列表或 float 数组 | `(k,)` | 每个位宽对应的误差 |

- `quantize_symmetric` 返回整数数组和 Python `float`。
- `quantize_per_row` 返回整数数组和形状为 `(rows,)` 的浮点数组。
- `dequantize` 返回形状为 `(rows, cols)` 的浮点数组。
- `relative_error` 返回浮点数。`bit_sweep` 返回形状为 `(k,)` 的浮点数组。
- `answers()` 返回包含以上五个键的字典，每个值都是 Python `float`。

## 约束

- `1 <= rows, cols <= 256`。 `relative_error` 的原始矩阵不能全为零。
- 不要修改输入数组。
- 不要对答案进行舍入。检查接受与参考运行结果之间不超过 `1e-6` 的相对误差。
- 仅使用 numpy 和标准库。

## 示例

```python
W = np.array([[0.5, -1.0, 0.25], [0.0, 0.0, 0.0]])
quantize_symmetric(W, 4)
```

```text
(array([[ 4, -7,  2],
       [ 0,  0,  0]], dtype=int32), 0.14285714285714285)
```

$0.5 / s = 3.5$ 正好位于两个整数中间，因此会舍入到偶数 4。

```python
quantize_per_row(W, 4)[1]
```

```text
[0.14285714 1.        ]
```

```python
relative_error(np.array([3.0, 4.0]), np.array([3.0, 3.0]))
```

```text
0.2
```

```python
bit_sweep(make_weights(0), [4, 8], per_row=True)
```

```text
[0.18284473 0.0099937 ]
```
