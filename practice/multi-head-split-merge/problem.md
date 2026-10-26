多头 attention 会并行运行多个小型 attention。每个 head 处理一段特征切片，之后再拼接并通过输出投影混合。难点在 reshape：轴顺序错误时形状仍然正确，但数值会错。

## 任务

编写三个函数。

1. `split_heads(x, n_heads)` 将形状为 `(B, T, D)` 的 `x` 转成形状为 `(B, H, T, d_head)` 的数组，其中 `H = n_heads`，`d_head = D / H`。头 `h` 按原顺序保存 `x` 中第 `h * d_head` 列到第 `(h + 1) * d_head - 1` 列。因此，`split_heads(x, H)[b, h, t, j]` 等于 `x[b, t, h * d_head + j]`。
2. `merge_heads(x)` 执行逆变换，将 `(B, H, T, d_head)` 转成 `(B, T, H * d_head)`，使 `merge_heads(split_heads(x, H))` 等于 `x`。
3. `multi_head_attention(x, w_q, w_k, w_v, w_o, n_heads)` 返回多头自注意力的输出和注意力权重。

`multi_head_attention` 的步骤如下：

1. $Q = x W_q$, $K = x W_k$, $V = x W_v$. 不使用偏置项。
2. 将 $Q$、$K$ 和 $V$ 拆分为多个 head。
3. 在每个头中计算 $\mathrm{softmax}(Q_h K_h^T / \sqrt{d_{head}})\, V_h$。softmax 沿 key 轴计算，不使用掩码。
4. 合并各 head 的输出，再乘以 $W_o$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | float 数组 | `(B, T, D)` | 一个批次包含 `B` 条序列，每条有 `T` 个 token 和 `D` 个特征 |
| `n_heads` | int | | head 数量 `H` |
| `w_q`, `w_k`, `w_v` | float 数组 | `(D, D)` | query、key 和 value 投影矩阵 |
| `w_o` | float 数组 | `(D, D)` | 输出投影矩阵 |

- `split_heads` 返回形状为 `(B, H, T, D / H)` 的浮点数组。
- `merge_heads` 接收形状为 `(B, H, T, d_head)` 的数组，返回形状为 `(B, T, H * d_head)` 的 float 数组。
- `multi_head_attention` 返回元组 `(output, weights)`。`output` 的形状为 `(B, T, D)`。`weights` 的形状为 `(B, H, T, T)`，其中 `weights[b, h, i, j]` 表示头 `h` 中 query `i` 分配给 key `j` 的权重。

## 约束

- `1 <= B, T <= 16`，且 `1 <= H <= D <= 64`。
- `D` 不能被 `n_heads` 整除时，`split_heads` 会抛出 `ValueError`。
- 激活值可能很大。输出必须保持有限。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
x = np.arange(8.0).reshape(1, 2, 4)
split_heads(x, 2)
```

```text
[[[[0. 1.]
   [4. 5.]]

  [[2. 3.]
   [6. 7.]]]]
```

对该结果调用 `merge_heads` 会还原 `x`。

```python
x = np.array([[[1.0, 0.0, 0.0, 1.0], [0.0, 2.0, 1.0, 0.0], [1.0, 1.0, 1.0, 1.0]]])
eye = np.eye(4)
output, weights = multi_head_attention(x, eye, eye, eye, eye, 2)
```

```text
output
[[[0.80222419 0.79666372 0.59888791 0.80222419]
  [0.23208206 1.72252957 0.80222419 0.59888791]
  [0.59888791 1.20333628 0.75174492 0.75174492]]]
weights
[[[[0.40111209 0.19777581 0.40111209]
   [0.04538836 0.76791794 0.1866937 ]
   [0.19777581 0.40111209 0.40111209]]

  [[0.40111209 0.19777581 0.40111209]
   [0.19777581 0.40111209 0.40111209]
   [0.24825508 0.24825508 0.50348984]]]]
```
