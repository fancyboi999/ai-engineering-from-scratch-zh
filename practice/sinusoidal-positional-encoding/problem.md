Attention 本身无法感知 token 的顺序。原始 Transformer 会把固定的正弦、余弦表加到 token embedding 上。表中每行编码一个位置，每对列使用各自的频率旋转。

## 任务

编写两个函数。

1. `sinusoidal_pe(max_len, d_model, base=10000.0)` 返回形状为 `(max_len, d_model)` 的位置编码表。
2. `add_positional_encoding(x, base=10000.0)` 返回 `x` 加上对应序列长度的位置编码表。

对于位置 $p = 0, 1, \dots, \text{max\_len} - 1$ 和坐标对 $i = 0, 1, \dots, \lfloor d/2 \rfloor - 1$，令 $d$ = `d_model`：

$$PE[p, 2i] = \sin\left(p / \text{base}^{2i/d}\right), \qquad PE[p, 2i+1] = \cos\left(p / \text{base}^{2i/d}\right)$$

一对正弦和余弦位于相邻列。`d_model` 为奇数时，最后一列没有配对列，保持为 0。指数仍然除以 `d_model`。

`add_positional_encoding` 会把表中的第 `t` 行加到第 `t` 个 token 的向量上。token 位于 `x` 的倒数第二个轴。所有前置轴都共用同一张位置编码表。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `max_len` | int | | 位置数量 |
| `d_model` | int | | 列数 |
| `base` | float | | 频率的底数 |
| `x` | float 数组 | `(..., T, d_model)` | `T` 个 token 的 embedding，可带零个或多个前置 batch 轴 |

- `sinusoidal_pe` 返回形状为 `(max_len, d_model)` 的浮点数组。
- `add_positional_encoding` 返回与 `x` 同形状的新浮点数组。

## 约束

- `1 <= max_len <= 8192`，且 `1 <= d_model <= 1024`。
- 位置索引从 0 开始。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
sinusoidal_pe(3, 4)
```

```text
[[ 0.          1.          0.          1.        ]
 [ 0.84147098  0.54030231  0.00999983  0.99995   ]
 [ 0.90929743 -0.41614684  0.01999867  0.99980001]]
```

```python
sinusoidal_pe(2, 5)
```

```text
[[0.         1.         0.         1.         0.        ]
 [0.84147098 0.54030231 0.02511622 0.99968454 0.        ]]
```

```python
add_positional_encoding(np.ones((2, 2)))
```

```text
[[1.         2.        ]
 [1.84147098 1.54030231]]
```
