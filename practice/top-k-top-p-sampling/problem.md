语言模型为词表中的每个 token 给出一个 logit。解码器必须根据这些 logit 选择下一个 token。温度、top-k 和 top-p 会在抽样前改变分布。课程中的每个聊天模型都会使用这一步采样。

## 任务

编写四个函数。每个 `logits` 参数都是长度为 $V$ 的一维浮点数组。

1. `top_k_filter(logits, k)` 保留最大的 `k` 个 logit，其余元素设为 `-np.inf`。按 logit 从高到低排序。两个 logit 相等时，索引较小者在前。若 `k >= V`，保留所有元素。
2. `top_p_filter(logits, p)` 计算 $\mathrm{softmax}(z)$，按概率从高到低对 token 排序，并使用相同的并列规则。保留排序后累计概率 $\ge p$ 的最短前缀。使累计和达到 $p$ 的 token 也要保留。若舍入误差导致所有前缀均未达到 $p$，保留所有 token。其余元素设为 `-np.inf`。
3. `sampling_probs(logits, temperature=1.0, top_k=None, top_p=None)` 返回最终分布。按以下顺序执行：
   1. 将 logit 除以 `temperature`。
   2. 若 `top_k` 不为 `None`，应用 `top_k_filter`。
   3. 若 `top_p` 不为 `None`，对第 2 步结果应用 `top_p_filter`。
   4. 计算 softmax。被移除 token 的概率必须恰好为 0。
4. `sample(logits, rng, temperature=1.0, top_k=None, top_p=None)` 抽取一个 token 索引。用 `sampling_probs` 计算概率。恰好调用一次 `u = rng.random()`。令 $c$ 为按词表顺序累加的概率。返回满足 $u < c_i$ 的最小索引 $i$。若舍入误差导致没有索引满足条件，返回概率大于 0 的最大索引。

$z$ 的 softmax 为 $e^{z_i} / \sum_j e^{z_j}$。等于 `-np.inf` 的元素概率为 0。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logits` | 浮点数组 | `(V,)` | 每个 token 的分数 |
| `k` | int | 标量 | 保留的 token 数，`k >= 1` |
| `p` | float | 标量 | 保留的概率质量，`0 < p <= 1` |
| `temperature` | float | 标量 | logit 的除数，`temperature > 0` |
| `rng` | `np.random.Generator` | 对象 | 随机数来源 |

- `top_k_filter` 和 `top_p_filter` 返回形状为 `(V,)` 的浮点数组。保留的元素维持输入值，被移除的元素为 `-np.inf`。
- `sampling_probs` 返回形状为 `(V,)`、总和为 1 的浮点数组。
- `sample` 返回 `int`。

## 约束

- `1 <= V <= 50000`。
- logit 是有限浮点数，可能大于 700。
- 不得修改输入数组。
- 只用 NumPy。

## 示例

```python
logits = np.array([2.0, 1.0, 0.5, 0.5, -1.0])
top_k_filter(logits, 3)
```

```text
[ 2.   1.   0.5 -inf -inf]
```

索引 2 和 3 的 logit 相同。保留较小的索引 2。

```python
top_p_filter(logits, 0.8)
```

```text
[ 2.   1.   0.5 -inf -inf]
```

排序后的累计概率为 0.5365、0.7339 和 0.8536。第三个 token 使累计和达到 0.8，因此要保留。

```python
sampling_probs(logits, temperature=0.5, top_k=3)
```

```text
[0.84379473 0.1141952  0.04201007 0.         0.        ]
```

```python
sample(logits, np.random.default_rng(0), top_k=3)
```

```text
1
```
