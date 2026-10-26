Attention 会让每个 query token 从一组 key 和 value token 中收集信息。本课程中的每个 Transformer 层都使用该运算。Decoder 会添加因果掩码，阻止 token 读取其后的内容。

## 任务

编写两个函数。

1. `causal_mask(T)` 返回长度为 `T` 的序列所用的因果掩码。
2. `scaled_dot_product_attention(Q, K, V, mask=None)` 返回 attention 输出和权重。

分数为 $S = Q K^T / \sqrt{d_k}$，其中 $d_k$ 是 `Q` 最后一个轴的长度。权重是在 key 轴上对 $S$ 的每行计算 softmax。输出等于权重乘以 `V`。

mask 是布尔数组。**`True` 表示屏蔽。** 被屏蔽的 query-key 对权重恰好为 0。同一行中的其他权重只对允许访问的 key 计算 softmax，因此每行权重之和为 1。

因果掩码在 `j > i` 的第 `i` 行、第 `j` 列位置为 `True`。Token `i` 可以读取自身及之前的 token。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `T` | int | | token 数量 |
| `Q` | float 数组 | `(..., Tq, d_k)` | query，可带零个或多个前置 batch 轴 |
| `K` | float 数组 | `(..., Tk, d_k)` | key，前置轴与 `Q` 相同 |
| `V` | float 数组 | `(..., Tk, d_v)` | value，前置轴与 `Q` 相同 |
| `mask` | bool 数组或 `None` | 可广播到 `(..., Tq, Tk)` | `True` 会屏蔽 query-key 对 |

- `causal_mask` 返回形状为 `(T, T)` 的布尔数组。
- `scaled_dot_product_attention` 返回元组 `(output, weights)`。
- `output` 是形状为 `(..., Tq, d_v)` 的浮点数组。
- `weights` 是形状为 `(..., Tq, Tk)` 的浮点数组。

## 约束

- `1 <= T, Tq, Tk <= 64`，且 `1 <= d_k, d_v <= 64`。
- mask 的每一行都至少允许访问一个 key。
- 分数可能大于 1000。输出必须保持有限。
- 只转置 `K` 的最后两个轴。前置轴是 batch 轴。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
Q = np.array([[1.0, 0.0], [0.0, 1.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
V = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
output, weights = scaled_dot_product_attention(Q, K, V)
```

```text
output
[[3.         4.        ]
 [3.40667256 4.40667256]]
weights
[[0.40111209 0.19777581 0.40111209]
 [0.19777581 0.40111209 0.40111209]]
```

```python
causal_mask(3)
```

```text
[[False  True  True]
 [False False  True]
 [False False False]]
```

```python
X = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
output, weights = scaled_dot_product_attention(X, X, V, mask=causal_mask(3))
```

```text
output
[[1.         2.        ]
 [2.3395231  3.3395231 ]
 [3.51046953 4.51046953]]
weights
[[1.         0.         0.        ]
 [0.33023845 0.66976155 0.        ]
 [0.24825508 0.24825508 0.50348984]]
```
