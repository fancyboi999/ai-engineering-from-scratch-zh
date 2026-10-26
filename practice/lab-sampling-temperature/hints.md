## 提示 1

先用温度除 logits，再在调用 `np.exp` 前减去缩放后 logits 的最大值。温度较小时，缩放后的 logits 会很大。

## 提示 2

在 `entropy_bits` 中用 `probs[probs > 0]` 只保留正概率，这样 `np.log2` 不会遇到 0。

## 提示 3

熵随温度升高而增大。因此 `mid` 的熵过低时，目标温度在 `mid` 以上，应提高 `lo`。

## 提示 4

计算 `kept_count` 时，使用 `np.sort(probs)[::-1]` 和 `np.cumsum`。累积和首次达到 `p` 的索引加 1，就是保留数量。
