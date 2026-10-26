学习率决定梯度下降是收敛、进展缓慢还是发散。对新模型进行的第一项实验通常是扫描多个学习率，记录最终损失并选出合适的学习率。本实验会在小型线性回归上运行扫描，并将结果与理论界限比较。

`support.py` 提供数据、学习率列表和训练器。`make_regression(seed)` 返回形状为 `(64, 4)` 的 `X` 和形状为 `(64,)` 的 `y`。`train(X, y, lr, steps)` 从 $w = 0$ 开始，以全批次梯度下降最小化均方误差，并返回每步之前及最后一步之后的损失，共有 `steps + 1` 项。损失超过 `1e10` 时，训练器会停止，并用 `inf` 填满曲线剩余部分。

## 任务

编写五个辅助函数和 `answers()`。

1. `run_sweep(X, y, lrs, steps=STEPS)` 返回形状为 `(len(lrs), steps + 1)` 的浮点数组。第 $i$ 行是 `train(X, y, lrs[i], steps)` 的结果。
2. 若最终损失不是有限值，或高于初始损失，`is_diverged(losses)` 返回 `True`；否则返回 `False`。
3. `best_lr(lrs, curves)` 返回未发散运行中最终损失最低的学习率。损失并列时返回较小的学习率。所有运行都发散时返回 `None`。
4. `smallest_diverging_lr(lrs, curves)` 返回已发散运行中数值最小的学习率。没有运行发散时返回 `None`。
5. `stability_bound(X)` 返回 $2 / \lambda_{max}$，其中 $\lambda_{max}$ 是均方误差 Hessian 矩阵 $H = \frac{2}{n} X^T X$ 的最大特征值。

然后在 `answers()` 中执行实验。

1. 用 `make_regression(seed=0)` 生成数据。
2. 遍历 `LEARNING_RATES`，每个学习率训练 `STEPS` 步。
3. 记录每次运行的最终损失。最佳学习率写入 `best_lr`，其最终损失写入 `best_final_loss`。
4. 将最小的发散学习率写入 `smallest_diverging_lr`。
5. 用同一个 `X` 计算理论界限，并写入 `stability_bound`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `X` | float 数组 | `(n, d)` | 模型输入，每行对应一个样本 |
| `y` | float 数组 | `(n,)` | 目标值 |
| `lrs` | float 列表 | `(k,)` | 学习率，顺序任意 |
| `steps` | int | 标量 | 梯度更新次数 |
| `losses` | float 数组 | `(steps + 1,)` | 一条损失曲线 |
| `curves` | float 数组 | `(k, steps + 1)` | 每个学习率对应一条损失曲线，顺序与 `lrs` 相同 |

- `run_sweep` 返回形状为 `(k, steps + 1)` 的浮点数组。
- `is_diverged` 返回布尔值。
- `best_lr` 和 `smallest_diverging_lr` 返回 `lrs` 中的一个学习率，或返回 `None`。
- `stability_bound` 返回浮点数。
- `answers()` 返回包含以上四个键的字典，每个值都是 Python `float`。

## 约束

- 损失曲线中可以包含 `inf` 或 `nan`。
- 不要修改输入数组。
- 不要对答案进行舍入。检查接受与参考运行结果之间不超过 `1e-6` 的相对误差。
- 仅使用 numpy 和标准库。

## 示例

```python
is_diverged(np.array([1.0, 2.0, 3.0]))
```

```text
True
```

```python
best_lr([0.1, 0.2, 0.3], np.array([[1.0, 0.5], [1.0, 0.2], [1.0, np.inf]]))
```

```text
0.2
```

```python
stability_bound(np.array([[1.0, 0.0], [0.0, 2.0]]))
```

```text
0.5
```

```python
X, y = make_regression(0)
train(X, y, 0.1, 3)
```

```text
[3.95117454 0.8025197  0.6543398  0.57749216]
```
