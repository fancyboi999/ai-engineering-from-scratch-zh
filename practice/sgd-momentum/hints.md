## 提示 1

对整个数组执行更新。先计算新速度，再用新速度更新参数。

## 提示 2

不要对 `params` 或 `velocity` 使用 `+=` 或 `*=`，这会修改调用方数组。用 `beta * velocity + grads` 构造新数组。

## 提示 3

在 `minimize_quadratic` 中保存所有位置。循环前先将 `x0` 副本加入列表，每次更新后也追加位置副本。最后用 `np.array` 转换列表。

## 提示 4

使用更新前的速度，在 `x - lr * beta * velocity` 处计算 Nesterov 梯度。然后把该梯度、当前 `x` 和当前速度传给 `momentum_step`。
