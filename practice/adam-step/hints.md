## 提示 1

从旧状态中读取 `m`、`v` 和 `t`。用数组表达式计算新值，并放进新字典返回。

## 提示 2

计算偏差修正前，先给 `t` 加 1。第一步中 $1 - \beta_1^1 = 0.1$，所以 $\hat m$ 恰好等于梯度。

## 提示 3

把 `epsilon` 放在平方根外：`np.sqrt(v_hat) + epsilon`。如果放在根号内，当 $\hat v$ 很小时，`epsilon` 会占主导，导致步长过小。

## 提示 4

AdamW 不要把 `weight_decay * params` 加到梯度上。先用 `1 - weight_decay * lr` 乘旧参数，再减去 Adam 更新量。
