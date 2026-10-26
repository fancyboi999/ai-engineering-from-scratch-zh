焦点损失在交叉熵上增加一个权重，降低简单样本的影响。检测器会遇到大量容易识别的背景区域，而目标很少。使用普通交叉熵时，简单样本贡献了大部分损失。焦点损失将每一项乘以 $(1 - p_t)^\gamma$，使模型更多地从困难样本中学习。

## 任务

编写三个函数。

1. `binary_focal_loss(logits, targets, gamma, alpha)` 返回平均二分类焦点损失。
2. `binary_focal_grad(logits, targets, gamma, alpha)` 返回该平均损失对 logits 的梯度。
3. `focal_loss(logits, targets, gamma, alpha)` 返回平均多分类焦点损失。

对于一个样本，$p_t$ 为真实类别的预测概率，且

$$\mathrm{FL}(p_t) = -\alpha_t \, (1 - p_t)^\gamma \log p_t.$$

二分类时，logit 为 $x$，目标为 $y \in \{0, 1\}$。当 $y = 1$ 时，$p_t = \sigma(x)$；当 $y = 0$ 时，$p_t = 1 - \sigma(x)$，其中 $\sigma(x) = 1 / (1 + e^{-x})$。当 `alpha` 为浮点数时，若 $y = 1$，则 $\alpha_t = \alpha$；若 $y = 0$，则 $\alpha_t = 1 - \alpha$。

多分类时，$p_t$ 是对一行 logits 计算 softmax 后，目标类别的概率。当 `alpha` 为大小为 $C$ 的数组时，$\alpha_t$ 为 `alpha[target]`。

当 `alpha` 为 `None` 时，$\alpha_t = 1$。每种损失都是批次中 $\mathrm{FL}$ 的平均值。当 $\gamma = 0$ 且不使用 alpha 时，两种损失都等于普通交叉熵。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logits`（二分类） | 浮点数组 | `(N,)` | 每个样本的一个 logit |
| `targets`（二分类） | 浮点数组 | `(N,)` | 每个样本的目标值，为 0 或 1 |
| `logits`（多分类） | 浮点数组 | `(N, C)` | 每个样本的一行 logits |
| `targets`（多分类） | 整数数组 | `(N,)` | 每个样本的类别索引，范围从 0 到 `C - 1` |
| `gamma` | 浮点数 | | 聚焦指数，大于或等于 0 |
| `alpha` | 浮点数、浮点数组或 `None` | `()` 或 `(C,)` | 类别权重：二分类时为浮点数，多分类时为大小为 `C` 的数组 |

- `binary_focal_loss` 和 `focal_loss` 返回 Python 浮点数。
- `binary_focal_grad` 返回形状为 `(N,)` 的浮点数组。

## 约束

- `1 <= N <= 1000`、`2 <= C <= 100`、`0 <= gamma <= 5`，且二分类时 `0 < alpha < 1`。
- logits 的绝对值可达 1000。损失和梯度必须保持有限。
- 不得修改输入数组。
- 仅使用 NumPy。

## 示例

```python
logits = np.array([2.0, -1.0, 0.5, -3.0])
targets = np.array([1.0, 1.0, 0.0, 0.0])
binary_focal_loss(logits, targets, 0.0)
binary_focal_loss(logits, targets, 2.0)
binary_focal_loss(logits, targets, 2.0, 0.25)
binary_focal_grad(logits, targets, 2.0, 0.25)
```

```text
0.6157135085787611
0.270298187607633
0.1147646574248966
[-3.04433762e-04 -4.80146702e-02  9.86534666e-02  5.90384712e-05]
```

```python
logits = np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]])
targets = np.array([0, 1])
focal_loss(logits, targets, 0.0)
focal_loss(logits, targets, 2.0)
focal_loss(logits, targets, 2.0, np.array([0.5, 1.0, 2.0]))
```

```text
0.31853976964918573
0.02853873533647399
0.016415649484550623
```
