## 提示 1

所有均值都使用 `axis=-1` 和 `keepdims=True`。这样统计量的形状为 `(..., 1)`，可广播到任意前置轴的 `x`。

## 提示 2

`gamma`、`beta` 和 `weight` 的形状为 `(D,)`。numpy 会将它们广播到前置轴，可直接执行乘法和加法。

## 提示 3

LayerNorm 先计算均值，再计算与均值差的平方的均值。最后除以 `np.sqrt(var + eps)`。

## 提示 4

RMSNorm 不减均值。分母是 `x * x` 的均值加 eps 后再开平方。全零行因此得到 $0 / \sqrt{\epsilon} = 0$。
