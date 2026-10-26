Speculative decoding 可以在不改变输出分布的前提下加快大模型生成。小型 draft 模型先提出若干 token，大型 target 模型在一次前向传播中检查它们。拒绝规则会保证最终输出分布与 target 模型完全一致。

## 任务

编写四个函数。本题中，$p$ 表示 **target** 模型在 $V$ 个 token 词表上的概率分布，$q$ 表示 **draft** 模型的概率分布。

1. `acceptance_rate(target, draft)` 返回 $\alpha = \sum_x \min(p(x), q(x))$，即规则接受一个 draft token 的概率。
2. `residual_distribution(target, draft)` 返回归一化后的 $\max(0, p - q)$：逐元素取 0 与 $p - q$ 的最大值，再除以总和。总和为 0 时，返回 `target` 的浮点数组副本。
3. `speculative_step(target_probs, draft_probs, draft_tokens, rng)` 对 $\gamma$ 个 draft token 执行验证步骤，并返回输出 token。
4. `expected_tokens(alpha, gamma)` 返回一步期望生成的 token 数，公式为 $(1 - \alpha^{\gamma + 1}) / (1 - \alpha)$。$\alpha = 1$ 时返回 $\gamma + 1$。

`speculative_step` 按以下步骤执行。随机数抽取顺序也是题目要求的一部分。

1. 对每个 draft token $x_i$（$i$ 从 0 到 $\gamma - 1$），令 $p_i$ 为 `target_probs` 第 $i$ 行，$q_i$ 为 `draft_probs` 第 $i$ 行。
2. 抽取 $u$ = `rng.random()`。若 $u < \min(1, p_i(x_i) / q_i(x_i))$，则接受 $x_i$，将其加入输出，并继续处理下一个 draft token。
3. 否则根据 `rng.choice(V, p=r)` 抽取一个 token，其中 $r$ 是 $p_i$ 和 $q_i$ 的残差分布。将它加入输出并立即返回。
4. $\gamma$ 个 draft token 全部被接受时，从 `target_probs` 最后一行的分布中用 `rng.choice(V, p=p_gamma)` 抽取一个 bonus token。将其加入输出并返回。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `target` | float 数组 | `(V,)` | target 概率分布 $p$ |
| `draft` | float 数组 | `(V,)` | draft 概率分布 $q$ |
| `target_probs` | float 数组 | `(gamma + 1, V)` | 每个 draft 位置对应的 target 分布，以及一行 bonus 分布 |
| `draft_probs` | float 数组 | `(gamma, V)` | 每个 draft 位置对应的 draft 分布 |
| `draft_tokens` | int 列表 | 长度为 `gamma` | draft 模型采样的 token |
| `rng` | `np.random.Generator` | | 所有随机抽样的来源 |
| `alpha` | float | | 接受率，范围为 0 到 1 |
| `gamma` | int | | draft token 数量 |

- `acceptance_rate` 返回 Python 浮点数。
- `residual_distribution` 返回形状为 `(V,)`、元素之和为 1 的浮点数组。
- `speculative_step` 返回长度为 1 到 `gamma + 1` 的 Python 整数列表。
- `expected_tokens` 返回 Python 浮点数。

## 约束

- `2 <= V <= 64` 且 `0 <= gamma <= 8`。每行概率之和为 1。
- 每个 draft token 都满足 $q_i(x_i) > 0$，因为它由 draft 模型采样得到。target 概率 $p_i(x_i)$ 可以为 0。
- 仅按上述顺序使用 `rng.random()` 和 `rng.choice(V, p=...)`。不要进行其他随机抽取。
- 不要修改输入数组或 draft token 列表。
- 仅使用 numpy。

## 示例

```python
target = np.array([0.5, 0.3, 0.2, 0.0])
draft = np.array([0.25, 0.25, 0.25, 0.25])
acceptance_rate(target, draft)
residual_distribution(target, draft)
```

```text
0.7
[0.83333333 0.16666667 0.         0.        ]
```

```python
target_probs = np.array([[0.5, 0.3, 0.2, 0.0], [0.1, 0.6, 0.2, 0.1], [0.25, 0.25, 0.25, 0.25]])
draft_probs = np.array([[0.25, 0.25, 0.25, 0.25], [0.4, 0.2, 0.2, 0.2]])
speculative_step(target_probs, draft_probs, [0, 1], np.random.default_rng(0))
speculative_step(target_probs, draft_probs, [3, 0], np.random.default_rng(0))
speculative_step(target_probs, draft_probs, [0, 0], np.random.default_rng(3))
```

```text
[0, 1, 0]
[0]
[0, 0, 3]
```

```python
expected_tokens(0.8, 4), expected_tokens(1.0, 4), expected_tokens(0.0, 4)
```

```text
(3.3616, 5.0, 1.0)
```
