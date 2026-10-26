分类器为每个样本输出一行 logit。Softmax 将每行转换为概率。交叉熵衡量模型分配给正确类别的概率。损失对 logit 的梯度是本课程中所有分类器的训练信号。

## 任务

编写三个函数。

1. `softmax(logits)` 返回每行的 softmax。
2. `cross_entropy(logits, targets)` 返回批次的平均交叉熵损失。
3. `cross_entropy_grad(logits, targets)` 返回平均损失对 `logits` 的梯度。

一行 logit $z$ 的 softmax 为 $p_i = e^{z_i} / \sum_j e^{z_j}$。正确类别为 $y$ 的单个样本损失是 $-\log p_y$。批次损失是所有样本损失的均值。

logit 较大时 `np.exp` 会溢出。即使 logit 为 `1000.0`，softmax 也必须返回正确概率。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logits` | float 数组 | `(N, C)` | `N` 个样本各有一行分数，共 `C` 个类别 |
| `targets` | int 数组 | `(N,)` | 每个样本的正确类别，范围为 `0` 到 `C - 1` |

- `softmax` 返回形状为 `(N, C)` 的浮点数组。
- `cross_entropy` 返回 Python `float`。
- `cross_entropy_grad` 返回形状为 `(N, C)` 的浮点数组。

## 约束

- `1 <= N <= 512`，且 `2 <= C <= 1000`。
- logit 可以是任意有限浮点数，包括大于 700 的值。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
logits = np.array([[1.0, 2.0, 3.0]])
softmax(logits)
```

```text
[[0.09003057 0.24472847 0.66524096]]
```

```python
logits = np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]])
targets = np.array([0, 1])
cross_entropy(logits, targets)
```

```text
0.31853977
```

同一批次的梯度也为每个样本保留一行。每行梯度之和为 0。
