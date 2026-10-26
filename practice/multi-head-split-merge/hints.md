## 提示 1

先将 `(B, T, D)` reshape 为 `(B, T, H, d_head)`，把最后一个轴切成 H 个连续列块。

## 提示 2

head 轴必须位于 token 轴之前。用 `transpose(0, 2, 1, 3)` 交换轴 1 和轴 2。直接 reshape 为 `(B, H, T, d_head)` 虽然形状正确，但会将错误数值放入各 head。

## 提示 3

`merge_heads` 按相反顺序执行这两步：先将 head 轴移回特征轴旁边，再 reshape。

## 提示 4

拆分后，attention 等价于带两个 batch 轴的单头 attention。使用 `np.swapaxes(k, -1, -2)` 转置，并除以 `sqrt(d_head)`，而非 `sqrt(D)`。
