## 提示 1

用 numpy 按整行运算。`np.max(logits, axis=1, keepdims=True)` 会得到形状为 `(N, 1)` 的行最大值，可广播到 `(N, C)`。

## 提示 2

一行中的所有 logit 减去相同值不会改变 softmax。调用 `np.exp` 前减去行最大值，这样最大指数为 0，避免溢出。

## 提示 3

计算损失时，直接求 softmax 的对数：平移后的 logit 减去指数和的对数。然后用 `log_probs[np.arange(N), targets]` 选出每行正确类别的值。

## 提示 4

单个样本的梯度为 `softmax(z) - one_hot(y)`。批次损失是均值，因此梯度要除以 `N`。
