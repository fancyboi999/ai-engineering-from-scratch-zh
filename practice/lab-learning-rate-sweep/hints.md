## 提示 1

用 `losses[-1]` 读取最终损失，用 `losses[0]` 读取初始损失。对 `inf` 和 `nan`，`np.isfinite` 都会返回 `False`。

## 提示 2

不要直接对最终损失调用 `np.argmin`。数组中的 `nan` 可能导致 `np.argmin` 返回它的索引。先过滤发散的运行。

## 提示 3

均方误差为 $\frac{1}{n} \lVert Xw - y \rVert^2$，其 Hessian 为 $\frac{2}{n} X^T X$。`np.linalg.eigvalsh` 会返回对称矩阵的特征值。

## 提示 4

对于二次损失，每一步都会将各特征向量方向上的误差乘以 $1 - \eta \lambda$。只有 $\lvert 1 - \eta \lambda_{max} \rvert < 1$ 时，运行才稳定，因此需要 $\eta < 2 / \lambda_{max}$。
