向量检索会找出 embedding 方向与查询 embedding 相同的文档。余弦相似度只衡量向量方向，不考虑向量长度。RAG 系统通常从这一步开始检索。

## 任务

编写三个函数。

1. `normalize_rows(X)` 返回 `X` 的副本，其中每行都除以自身的 L2 范数。
2. `cosine_similarity_matrix(Q, D)` 返回每条查询向量与每条文档向量之间的余弦相似度。
3. `top_k(Q, D, k)` 为每条查询返回余弦相似度最高的 `k` 个文档索引。

向量 $q$ 和 $d$ 的余弦相似度为 $\frac{q \cdot d}{\lVert q \rVert \, \lVert d \rVert}$。

零向量规则：范数为 0 的行没有方向。`normalize_rows` 会保留该零行，它与任何向量的余弦相似度都是 `0.0`。

并列规则：`top_k` 按分数从高到低排序。两个文档分数相同时，索引较小的文档排在前面。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `X` | float 数组 | `(n, dim)` | 任意行向量矩阵 |
| `Q` | float 数组 | `(n_queries, dim)` | 每行对应一个查询 embedding |
| `D` | float 数组 | `(n_docs, dim)` | 每行对应一个文档 embedding |
| `k` | int | 标量 | 每条查询要返回的文档数 |

- `normalize_rows` 返回形状为 `(n, dim)` 的新浮点数组。
- `cosine_similarity_matrix` 返回形状为 `(n_queries, n_docs)` 的浮点数组。`(i, j)` 项是查询 `i` 与文档 `j` 的分数。
- `top_k` 返回形状为 `(n_queries, k)` 的整数数组。第 `i` 行存储文档索引，按分数从高到低排列。

## 约束

- `1 <= n_queries <= 64`、`1 <= n_docs <= 1000`，且 `1 <= dim <= 1024`。
- `1 <= k <= n_docs`.
- `Q` 和 `D` 的行可以是零向量。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
normalize_rows(np.array([[3.0, 4.0], [0.0, 0.0], [0.0, -2.0]]))
```

```text
[[ 0.6  0.8]
 [ 0.   0. ]
 [ 0.  -1. ]]
```

```python
Q = np.array([[1.0, 0.0], [1.0, 1.0]])
D = np.array([[2.0, 0.0], [0.0, 3.0], [1.0, 1.0], [-1.0, 0.0]])
cosine_similarity_matrix(Q, D)
```

```text
[[ 1.          0.          0.70710678 -1.        ]
 [ 0.70710678  0.70710678  1.         -0.70710678]]
```

```python
top_k(Q, D, 2)
```

```text
[[0 2]
 [2 0]]
```

第二条查询中，文档 0 和 1 的分数相同。按并列规则，文档 0 排在前面。
