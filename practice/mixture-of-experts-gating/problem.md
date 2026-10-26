Mixture of Experts 层会将每个 token 路由到多个专家中的少数几个。Router 为每个专家生成一个 logit，层会保留得分最高的 k 个专家，并用 gate 权重混合它们的输出。Switch Transformer 论文加入辅助损失，让 router 将 token 分散到所有专家。

## 任务

编写两个函数。

1. `route(logits, top_k)` 返回每个 token 选中的专家及其 gate 权重。
2. `load_balancing_loss(logits, top_k)` 返回浮点型负载均衡辅助损失。

**路由。** 对每个 token 按 logit 从高到低排序，并保留前 $k$ 个专家。logit 并列时，索引较小的专家优先。gate 权重只对选中的 $k$ 个 logit 计算 softmax：

$$g_{t,j} = \frac{\exp(z_{t,j})}{\sum_{i \in \text{top-}k(t)} \exp(z_{t,i})}$$

这等价于先对全部 $E$ 个专家计算 softmax，再在选中的 $k$ 个专家上重新归一化。每个 token 的 gate 权重和为 1。Gate 的第 $j$ 列对应 `top_idx` 第 $j$ 列中的专家。

**负载均衡损失。** 设 $T$ 为 token 数，$E$ 为专家数。

- $f_i$ 是 $T k$ 次分配中进入专家 $i$ 的比例：top-k 中包含 $i$ 的 token 数除以 $T k$。
- $P_i = \frac{1}{T} \sum_t p_{t,i}$，其中 $p_t$ 是 token $t$ 的 logit 在全部 $E$ 个专家上计算得到的完整 softmax。
- 损失为 $\mathcal{L} = E \sum_{i=1}^{E} f_i P_i$。

$k = 1$ 时，这就是论文中的损失。Router 均匀时，损失为 1。所有 token 都路由到同一个专家时，损失会趋近 $E$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logits` | float 数组 | `(T, E)` | 每个 token 对每个专家的 router logit |
| `top_k` | int | | 每个 token 选中的专家数 |

- `route` 返回元组 `(top_idx, gates)`。
- `top_idx` 是形状为 `(T, top_k)` 的整数数组。第 `t` 行存放选中专家的索引，按 logit 从高到低排列。
- `gates` 是形状为 `(T, top_k)` 的浮点数组。
- `load_balancing_loss` 返回 Python 浮点数。

## 约束

- `1 <= T <= 256`、`1 <= E <= 64`，且 `1 <= top_k <= E`。
- Logit 的绝对值可以达到 1000。Gate 权重必须保持有限。
- $f_i$ 必须由分配计数计算。不要用概率代替 $f_i$。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
logits = np.array([[2.0, 1.0, 0.5, -1.0], [0.0, 3.0, 3.0, 1.0], [1.0, 1.0, 1.0, 1.0]])
top_idx, gates = route(logits, 2)
```

```text
top_idx
[[0 1]
 [1 2]
 [0 1]]
gates
[[0.73105858 0.26894142]
 [0.5        0.5       ]
 [0.5        0.5       ]]
```

```python
load_balancing_loss(logits, 2)
load_balancing_loss(logits, 1)
load_balancing_loss(np.zeros((5, 4)), 2)
```

```text
1.2008139315343698
1.1983721362825372
1.0
```
