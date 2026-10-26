## 提示 1

先写一个在 `np.exp` 前减去最大值的 softmax。`np.exp(-np.inf)` 为 0，因此同一个 softmax 也适用于过滤后的 logit。

## 提示 2

`np.argsort(-logits, kind="stable")` 按 logit 从大到小返回索引。稳定排序保持相同值的索引顺序，因此较小索引在前。

## 提示 3

对于 top-p，计算排序后概率的累计和。找到累计和首次至少为 `p` 的位置。保留该位置及之前的所有 token。

## 提示 4

新建一个填满 `-np.inf` 的结果数组，再复制保留的 logit。这样不会修改输入数组。抽样时，将一个 `u = rng.random()` 与按词表顺序累加的最终概率比较。
