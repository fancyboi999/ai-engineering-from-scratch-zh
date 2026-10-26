标准注意力会构造大小为 $T_q \times T_k$ 的完整分数矩阵。FlashAttention 不构造这个矩阵，而是分块读取键和值，并为每个查询行维护在线更新的 softmax。结果是精确值，而非近似值。本题要求用 NumPy 实现这种在线 softmax。

## 任务

编写两个函数。

1. `online_softmax_step(m, l, acc, scores, v_block)` 将一个键块加入每个查询行的累计状态。
2. `flash_attention(Q, K, V, block_size, causal=False)` 遍历键块执行更新，返回注意力输出和每行的 log-sum-exp。

查询行 $i$ 的状态由三部分组成：累计最大值 $m_i$、累计和 $l_i$，以及大小为 $d_v$ 的向量累加器 $a_i$。初始状态为 $m_i = -\infty$、$l_i = 0$、$a_i = 0$。对于分数为 $s_{ij}$、值向量为 $v_j$ 的块，更新公式为：

$$m_i' = \max(m_i, \max_j s_{ij}), \qquad c_i = e^{m_i - m_i'}$$

$$l_i' = c_i \, l_i + \sum_j e^{s_{ij} - m_i'}, \qquad a_i' = c_i \, a_i + \sum_j e^{s_{ij} - m_i'} \, v_j$$

分数为 $-\infty$ 表示该键被屏蔽。当 $m_i'$ 为 $-\infty$ 时，该行尚无可用键。此时在两个指数表达式内部，用 0 替代 $m_i'$，使 $c_i = 0$ 且每个求和项都为 0。该步随后返回 $m_i' = -\infty$、$l_i' = 0$、$a_i' = 0$。

在 `flash_attention` 中，每个块的分数为 $Q K_b^T / \sqrt{d}$，其中 $K_b$ 包含从 `start` 到 `start + block_size` 的键行，$d$ 是 `Q` 最后一轴的大小。各块从 0、`block_size`、`2 * block_size` 等位置开始。最后一块可能较短。当 `causal=True` 时，若 $j > i$，则查询 $i$ 不得访问键 $j$。索引 $i$ 和 $j$ 是全局行索引，不是块内索引。处理完最后一块后，输出行为 $a_i / l_i$，log-sum-exp 为 $m_i + \log l_i$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `m` | 浮点数组 | `(Tq,)` | 每个查询行的累计最大值 |
| `l` | 浮点数组 | `(Tq,)` | 每个查询行的累计和 |
| `acc` | 浮点数组 | `(Tq, d_v)` | 每个查询行的累加器 |
| `scores` | 浮点数组 | `(Tq, b)` | 一个包含 `b` 个键的块的分数，被屏蔽的键取 `-inf` |
| `v_block` | 浮点数组 | `(b, d_v)` | 同一块中的值行 |
| `Q` | 浮点数组 | `(Tq, d)` | 查询 |
| `K` | 浮点数组 | `(Tk, d)` | 键 |
| `V` | 浮点数组 | `(Tk, d_v)` | 值 |
| `block_size` | 整数 | | 每块的键数 |
| `causal` | 布尔值 | | 为 `True` 时，若 `j > i`，则查询 `i` 不得访问键 `j` |

- `online_softmax_step` 返回元组 `(m_new, l_new, acc_new)`，各元素的形状分别与 `m`、`l`、`acc` 相同。
- `flash_attention` 返回元组 `(output, lse)`。`output` 的形状为 `(Tq, d_v)`，`lse` 的形状为 `(Tq,)`。

## 约束

- `1 <= Tq, Tk, d, d_v <= 64`，且 `1 <= block_size <= 128`。块大小可以大于 `Tk`。
- 逐块处理键，不得构造完整的 `(Tq, Tk)` 分数矩阵。
- 一个块的分数可能大于 1000，而下一个块的分数可能小于 -1000。输出必须保持有限且准确。
- 对任意块大小，结果都必须与标准注意力一致，误差约在 1e-9 以内。
- 不得修改输入数组。
- 仅使用 NumPy。

## 示例

```python
Q = np.array([[1.0, 0.0], [0.0, 1.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
V = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
output, lse = flash_attention(Q, K, V, 2)
```

```text
output
[[3.         4.        ]
 [3.40667256 4.40667256]]
lse
[1.62062114 1.62062114]
```

块大小为 1 和 3 时得到相同的值。

```python
output, lse = flash_attention(K, K, V, 2, causal=True)
```

```text
output
[[1.         2.        ]
 [2.3395231  3.3395231 ]
 [3.51046953 4.51046953]]
lse
[0.70710678 1.10794031 2.1004053 ]
```

```python
m = np.array([1.0, -np.inf])
l = np.array([2.0, 0.0])
acc = np.array([[1.0, 1.0], [0.0, 0.0]])
scores = np.array([[3.0, 0.0], [-np.inf, 0.5]])
v_block = np.array([[1.0, 0.0], [0.0, 1.0]])
m_new, l_new, acc_new = online_softmax_step(m, l, acc, scores, v_block)
```

```text
m_new
[3.  0.5]
l_new
[1.32045763 1.        ]
acc_new
[[1.13533528 0.18512235]
 [0.         1.        ]]
```
