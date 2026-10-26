贪心解码每一步都选择概率最高的 token，之后不能回退。Beam search 会在每一步保留 `beam_width` 条最优的未完成序列，最后从完成的序列中选出最佳结果。机器翻译和摘要模型会使用 beam search。

## 任务

编写 `beam_search(step_fn, bos_id, eos_id, beam_width, max_len, length_penalty=0.0)`。

候选序列由 token ID 元组和原始分数组成。搜索从一条未完成候选开始：元组为 `(bos_id,)`，分数为 0。原始分数是生成序列中各 token 的 $\log p(t_i \mid t_{<i})$ 之和。

最多重复 `max_len` 次：

1. 对每条未完成候选调用一次 `step_fn(tokens)`。它返回下一个 token 的对数概率，数组长度为 $V$。
2. 对每条未完成候选和每个 token ID（从 0 到 $V - 1$）生成一条候选。新分数等于父候选分数加上该 token 的对数概率。
3. 按原始分数从高到低对所有候选排序。分数相同时，按 Python 元组顺序让 token 元组较小者优先。保留前 `beam_width` 条。
4. 保留的候选若以 `eos_id` 结尾，就算完成；其余候选成为下一轮的未完成序列。
5. 没有未完成候选时停止。

循环结束后，仍未完成的候选也要纳入结果。每条候选的最终分数为 $s / L^{\alpha}$，其中 $s$ 是原始分数，$L$ 是生成的 token 数（BOS 不计入，EOS 计入），$\alpha$ 是 `length_penalty`。$\alpha = 0$ 时，最终分数等于原始分数。长度惩罚不影响第 3 步的剪枝。

将每条已完成候选作为 `(tokens, final_score)` 放入列表返回。按最终分数从高到低排序；分数相同时，token 元组较小的排在前面。列表第一项就是搜索结果。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `step_fn` | 函数 | 输入为 int 元组，输出为形状 `(V,)` 的 float 数组 | 给定前缀后，下一个 token 的对数概率 |
| `bos_id` | int | 标量 | 每条序列的起始 token |
| `eos_id` | int | 标量 | 结束序列的 token，取值范围是 0 到 `V - 1` |
| `beam_width` | int | 标量 | 每步保留的候选数，至少为 1 |
| `max_len` | int | 标量 | 最多生成的 token 数，至少为 1 |
| `length_penalty` | float | 标量 | 最终分数中长度项的指数 $\alpha$ |

- 返回由 `(tokens, score)` 组成的列表。`tokens` 是以 `bos_id` 开头的整数元组，`score` 是浮点数。

## 约束

- `2 <= V <= 50`，且 `max_len <= 20`。
- 不要对以 `eos_id` 结尾的前缀调用 `step_fn`。
- `step_fn` 每次调用都可能返回新数组。不要修改它返回的数组。
- 仅使用 Python 和 numpy。

## 示例

下面的简化模型有 $V = 4$、BOS 4 和 EOS 0。它给出以下下一个 token 概率：

```python
TABLE = {
    (4,): [0.05, 0.5, 0.4, 0.05],
    (4, 1): [0.25, 0.25, 0.25, 0.25],
    (4, 2): [0.9, 0.04, 0.03, 0.03],
}

def toy(prefix):
    return np.log(np.array(TABLE.get(tuple(prefix), [0.6, 0.2, 0.1, 0.1])))
```

```python
beam_search(toy, 4, 0, 1, 3)
```

```text
[((4, 1, 0), -2.0794415416798357)]
```

```python
beam_search(toy, 4, 0, 2, 3)
```

```text
[((4, 2, 0), -1.0216512475319812), ((4, 1, 0), -2.0794415416798357)]
```

```python
beam_search(toy, 4, 0, 2, 3, length_penalty=1.0)
```

```text
[((4, 2, 0), -0.5108256237659906), ((4, 1, 0), -1.0397207708399179)]
```
