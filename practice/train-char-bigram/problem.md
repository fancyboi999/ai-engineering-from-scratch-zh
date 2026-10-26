二元字符语言模型只根据当前字符预测下一个字符。它是使用上下文的最小模型，其损失与训练 GPT 所用的下一 token 交叉熵相同。本题用梯度下降训练一张下一字符 logit 表。检查器会在代码从未见过的留出文本上评估模型。

## 任务

编写两个函数。

1. `train(ids, vocab_size, rng)` 在一条长字符 ID 序列上训练模型，并返回模型。
2. `next_log_probs(model, prev_ids)` 为 `prev_ids` 中的每个上下文返回 $\log P(\text{next} \mid \text{prev})$。

模型是形状为 $(V, V)$ 的矩阵 $W$。第 $a$ 行保存字符 $a$ 后面各字符的 logit，因此 $P(\cdot \mid a) = \mathrm{softmax}(W_a)$。训练样本对为 $(x_t, x_{t+1})$，其中 $t = 0, \dots, T - 2$。用梯度下降训练 $W$，最小化平均负对数似然：

$$L = -\frac{1}{T - 1} \sum_{t=0}^{T-2} \log P(x_{t+1} \mid x_t).$$

训练文本是 `support.py` 中的 `TEXT`。它包含课程术语表 `glossary/terms.md` 前 26 个词条的“What it actually means”行，从“Activation Checkpointing”到“Benchmark Contamination”。文本已转成小写。所有不在 `VOCAB` 中的字符均替换为空格。`VOCAB` 有 29 个字符：空格、字母 a 到 z、句点和逗号。`encode(text)` 返回 ID，`decode(ids)` 将 ID 还原为文本。

训练时，每次更新都要调用一次 `practice_check` 中的 `report(step, loss)`。第一步为 0。页面用这些值实时绘制损失曲线，检查器会统计调用次数。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `ids` | 整数数组 | `(T,)` | 训练文本的字符 ID，范围为 0 到 `vocab_size - 1` |
| `vocab_size` | int | | 字符数，为 29 |
| `rng` | `np.random.Generator` | | 唯一的随机数来源 |
| `model` | 任意 | | `train` 返回的值 |
| `prev_ids` | 整数数组 | `(M,)` | 上下文字符 |

- `train` 返回模型。模型可以是任意 Python 值，例如矩阵 $W$。
- `next_log_probs` 返回形状为 `(M, 29)` 的浮点数组。第 $i$ 行保存 `prev_ids[i]` 后面 29 个字符的对数概率。

## 约束

- 预算：最多更新 300 步，即最多调用 `report` 300 次。
- 目标：在其他术语词条组成的留出文本上，平均负对数似然不超过每字符 2.55 nat。此页面不展示该文本。均匀模型得到 $\log 29 = 3.367$。忽略上下文的一元模型约为 2.9。
- 用梯度下降训练。训练文本中从未出现的字符对也必须保留有限的对数概率。
- 所有随机数均来自 `rng`。相同种子必须得到相同模型。
- 不得修改 `ids`。
- 只用 NumPy。一次完整提交限时 15 秒。

## 示例

```python
ids = encode(TEXT)
model = train(ids, len(VOCAB), np.random.default_rng(1))
np.exp(next_log_probs(model, encode("q"))[:, encode("u")])
```

```text
[[0.9663]]
```

输出保留 4 位小数。字符 `q` 后面，模型给字母 `u` 的概率为 0.9663。参考解从接近 0 的 logit 开始，因此首次报告的损失为 3.3666，接近 $\log 29$。300 步后，训练文本上的损失为 2.3148。一元模型在同一文本上得到 2.9110。
