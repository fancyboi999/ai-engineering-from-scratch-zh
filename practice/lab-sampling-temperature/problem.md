解码器会将下一个 token 的 logit 转换为概率分布，并从中采样。温度决定分布的平坦程度，Top-p 会截掉概率分布的尾部。本实验会对固定 logits 扫描温度，并测量熵、最大概率和 Top-p 保留的 token 数量。

`support.py` 提供 GPT 课程示例中的 10 个 token 词表和 logits：`LOGITS = [3.2, 1.1, 2.8, 0.4, 0.9, 1.5, -0.2, 2.1, 0.7, 0.1]`。它还提供 `TEMPERATURES`，范围从 0.1 到 3.0、步长为 0.1；目标熵为 `TARGET_ENTROPY = 2.0` bit，`TOP_P = 0.9`。

## 任务

编写五个辅助函数和 `answers()`。

1. `softmax_t(logits, temperature)` 返回 $p_i = e^{z_i / T} / \sum_j e^{z_j / T}$。logit 很大或 $T$ 很小时也不能溢出。
2. `entropy_bits(probs)` 返回以 bit 为单位的熵 $H = -\sum_i p_i \log_2 p_i$。概率为 0 的项贡献 0。
3. `sweep_temperature(logits, temperatures)` 返回两个与 `temperatures` 等长的浮点数组，分别保存每个温度下的熵和最大概率 $\max_i p_i$。
4. `temperature_for_entropy(logits, target, lo=0.05, hi=10.0, iters=60)` 用二分法寻找熵等于 `target` 时的温度。执行 `iters` 轮。每轮令 $m$ 为 `lo` 和 `hi` 的中点。若 $m$ 对应的熵低于 `target`，将 `lo` 更新为 $m$；否则将 `hi` 更新为 $m$。最后返回 `lo` 和 `hi` 的中点。
5. `kept_count(probs, p)` 将概率从高到低排序，返回累积概率和首次达到或超过 `p` 的最短前缀长度。若因舍入误差而没有前缀达到 `p`，则返回 token 数量。

然后在 `answers()` 中执行实验。

1. 将温度设为 1.0，把熵写入 `entropy_t1`。
2. 将温度设为 0.7，把最大概率写入 `top1_t07`。
3. 遍历 `TEMPERATURES` 并测量每个温度下的熵。将熵首次大于或等于 `TARGET_ENTROPY` 的温度写入 `first_grid_temperature`。
4. 使用 `temperature_for_entropy(LOGITS, TARGET_ENTROPY)` 求出精确交点，并写入 `crossing_temperature`。
5. 在温度 0.7、1.0 和 1.5 下使用 `TOP_P` 执行 Top-p。保留数量分别写入 `kept_p09_t07`、`kept_p09_t10` 和 `kept_p09_t15`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logits` | float 数组 | `(V,)` | 每个 token 的分数 |
| `temperature` | float | 标量 | logits 的除数 $T$，且 $T > 0$ |
| `probs` | float 数组 | `(V,)` | 概率和为 1 的分布 |
| `temperatures` | float 列表 | `(k,)` | 扫描使用的温度 |
| `target` | float | 标量 | 要达到的熵，单位为 bit |
| `p` | float | 标量 | Top-p 累积概率，`0 < p <= 1` |

- `softmax_t` 返回形状为 `(V,)` 的浮点数组。
- `entropy_bits` 返回浮点数。
- `sweep_temperature` 返回由两个形状为 `(k,)` 的浮点数组组成的元组。
- `temperature_for_entropy` 返回浮点数。`kept_count` 返回整数。
- `answers()` 返回包含以上七个键的字典，每个值都是 Python `float`。

## 约束

- `2 <= V <= 1000`。logit 为有限值，可能大于 700。
- 不要修改输入数组。
- 不要对答案进行舍入。检查接受与参考运行结果之间不超过 `1e-6` 的相对误差。
- 仅使用 numpy 和标准库。

## 示例

```python
softmax_t(np.array([1.0, 2.0, 3.0]), 0.5)
```

```text
[0.01587624 0.11731043 0.86681333]
```

```python
entropy_bits(np.array([0.5, 0.25, 0.25]))
```

```text
1.5
```

```python
sweep_temperature(LOGITS, [0.5, 1.0, 2.0])
```

```text
(array([1.50271532, 2.52573217, 3.09650953]), array([0.61269561, 0.38024152, 0.22636197]))
```

```python
kept_count(np.array([0.1, 0.6, 0.3]), 0.8)
```

```text
2
```
