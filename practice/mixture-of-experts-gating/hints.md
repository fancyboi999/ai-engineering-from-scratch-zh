## 提示 1

将 logits 取负后使用 `np.argsort` 排序。设置 `kind="stable"`，使 logit 并列时保留索引顺序。

## 提示 2

`np.take_along_axis(logits, top_idx, axis=-1)` 会得到形状为 `(T, k)` 的选中专家 logits。沿该数组最后一个轴计算 softmax。

## 提示 3

调用 `np.exp` 前减去每行最大值。这不会改变 gate 权重，并可避免溢出。

## 提示 4

计算 $f$ 时，用 `np.bincount` 统计展平后的 `top_idx` 中各专家出现次数，并设置 `minlength=E`。计数除以 $T k$。计算 $P$ 时，先对完整 softmax 沿 token 轴求均值。最终损失为 $E$ 乘以 $f$ 与 $P$ 的点积。
