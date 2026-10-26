LoRA 在不修改大模型权重的情况下进行微调。它冻结线性层权重 $W$，并通过两个低秩矩阵 $A$ 和 $B$ 添加一条较小的可训练路径。训练后可以将这条路径合并进 $W$，推理开销就与基础模型相同。

## 任务

编写三个函数。

1. `lora_forward(x, W, b, A, B, alpha)` 返回带 adapter 的层输出。
2. `merge_lora(W, A, B, alpha)` 返回合并后的权重。
3. `count_trainable(in_features, out_features, rank)` 返回 $A$ 和 $B$ 中可训练参数的数量。

秩 $r$ 是 $A$ 的行数。该层的输出为：

$$y = x W^T + b + \frac{\alpha}{r} \, x A^T B^T.$$

合并后的权重为 $W' = W + \frac{\alpha}{r} B A$。使用合并权重计算 $x W'^T + b$，结果应与 `lora_forward` 相同。

只有 $A$ 和 $B$ 参与训练。$W$ 和 $b$ 是冻结参数，不计入可训练参数数目。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `x` | float 数组 | `(N, in_features)` | 每个样本对应一行输入 |
| `W` | float 数组 | `(out_features, in_features)` | 冻结权重 |
| `b` | float 数组 | `(out_features,)` | 冻结偏置 |
| `A` | float 数组 | `(r, in_features)` | adapter 的下投影矩阵 |
| `B` | float 数组 | `(out_features, r)` | adapter 的上投影矩阵 |
| `alpha` | float | 标量 | LoRA 缩放系数的分子 |
| `in_features`, `out_features`, `rank` | int | 标量 | 层维度和秩 |

- `lora_forward` 返回形状为 `(N, out_features)` 的浮点数组。
- `merge_lora` 返回形状为 `(out_features, in_features)` 的新浮点数组。
- `count_trainable` 返回 Python `int`。

## 约束

- `1 <= N <= 64`、`1 <= in_features, out_features <= 4096`，且 `1 <= r <= 64`。
- rank 可以大于 `in_features` 或 `out_features`。
- `alpha > 0`.
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
x = np.array([[1.0, 2.0, 0.0], [0.0, -1.0, 1.0]])
W = np.array([[0.5, -0.5, 1.0], [1.0, 0.0, 0.0]])
b = np.array([0.1, -0.2])
A = np.array([[1.0, 0.0, 1.0], [0.0, 1.0, 0.0]])
B = np.array([[1.0, 0.5], [-1.0, 0.0]])
lora_forward(x, W, b, A, B, 4.0)
```

```text
[[ 3.6 -1.2]
 [ 2.6 -2.2]]
```

令 `B = np.zeros((2, 2))` 时，相同调用会返回基础模型输出 `[[-0.4, 0.8], [1.6, -0.2]]`。

```python
merge_lora(W, A, B, 4.0)
```

```text
[[ 2.5  0.5  3. ]
 [-1.   0.  -2. ]]
```

```python
count_trainable(4096, 4096, 8)
```

```text
65536
```
