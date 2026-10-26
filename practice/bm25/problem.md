BM25 是关键词检索中常用的排序函数。文档多次包含查询中的稀有词时得分较高，同时会按文档长度校正分数。混合检索会把 BM25 与稠密向量检索并行使用。

## 任务

编写三个函数。文档和查询都是已完成分词的 token 列表。

1. `idf(corpus, term)` 返回一个词的逆文档频率。
2. `bm25_scores(corpus, query, k1=1.5, b=0.75)` 返回每份文档对该查询的 BM25 得分。
3. `rank(corpus, query, top_k, k1=1.5, b=0.75)` 返回得分最高的 `top_k` 份文档的索引。

设 $N$ 为文档总数，$n(t)$ 为至少包含一次词 $t$ 的文档数。逆文档频率按以下公式计算：

$$\mathrm{idf}(t) = \ln\left(1 + \frac{N - n(t) + 0.5}{n(t) + 0.5}\right)$$

设 $f(t, d)$ 为词 $t$ 在文档 $d$ 中的出现次数，$|d|$ 为文档 $d$ 的 token 数，$\mathrm{avgdl}$ 为所有文档长度的均值。文档 $d$ 的得分为：

$$\mathrm{score}(d) = \sum_{t \in \text{query}} \mathrm{idf}(t) \cdot \frac{f(t, d)\,(k_1 + 1)}{f(t, d) + k_1 \left(1 - b + b \frac{|d|}{\mathrm{avgdl}}\right)}$$

求和遍历查询列表。一个词在查询中出现两次，其权重也累加两次。若 $f(t, d) = 0$，该词不增加得分。

并列规则：`rank` 按得分从高到低排序。得分相同时，索引较小的文档排在前面。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `corpus` | 由 str 列表组成的列表 | `N` 份文档 | 每份文档包含的 token |
| `query` | str 列表 | 任意长度 | 查询 token，可重复 |
| `term` | str | 标量 | 一个 token |
| `k1` | float | 标量 | 词频饱和参数，默认值为 `1.5` |
| `b` | float | 标量 | 文档长度归一化权重，范围为 0 到 1，默认值为 `0.75` |
| `top_k` | int | 标量 | 要返回的文档索引数 |

- `idf` 返回 Python `float`。
- `bm25_scores` 返回形状为 `(N,)` 的浮点数组。第 `i` 项是第 `i` 份文档的得分。
- `rank` 返回由 `top_k` 个文档索引组成的列表，按得分从高到低排列。

## 约束

- `1 <= N <= 200`，每份文档最多包含 200 个 token。
- 文档可以为空，但至少有一份文档包含 token。
- `0 <= b <= 1`、`k1 > 0`，且 `1 <= top_k <= N`。
- 不要修改语料或查询。
- 仅使用 Python 和 numpy。

## 示例

```python
corpus = [
    ["the", "cat", "sat"],
    ["the", "dog", "sat", "on", "the", "mat"],
    ["cat", "cat", "food"],
    ["dogs", "and", "cats"],
]
idf(corpus, "cat"), idf(corpus, "zebra")
```

```text
(0.6931471805599453, 2.302585092994046)
```

```python
bm25_scores(corpus, ["cat", "sat"])
```

```text
[1.5234004  0.54578518 1.05823997 0.        ]
```

```python
rank(corpus, ["cat", "sat"], 3)
```

```text
[0, 2, 1]
```

第 3 份文档包含 `cats`，而不是 `cat`。token 必须完全匹配，因此它的得分为 0。
