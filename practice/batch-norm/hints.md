## 提示 1

所有统计量都沿批次轴计算，使用 `axis=0`。均值和方差的形状都是 `(D,)`，可广播到 `(N, D)`。

## 提示 2

在缓存中保存 $\hat{x}$、$1 / \sqrt{\sigma^2 + \epsilon}$ 和 `gamma`。反向传播需要这三项。

## 提示 3

`dbeta` 是 `grad_output` 沿批次轴求和。`dgamma` 是 `grad_output * x_hat` 沿批次轴求和。损失对 $\hat{x}$ 的梯度为 `grad_output * gamma`。

## 提示 4

每个 $x_{ij}$ 会直接改变 $\hat{x}_{ij}$，也会改变 $\mu_j$ 和 $\sigma^2_j$。设 $g = \partial L / \partial \hat{x}$、$s = 1 / \sqrt{\sigma^2 + \epsilon}$，则完整结果为 $dx = \frac{s}{N} \left( N g - \sum_i g - \hat{x} \sum_i g \hat{x} \right)$。其中求和都沿批次轴进行。
