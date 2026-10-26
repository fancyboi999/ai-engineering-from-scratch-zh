## 提示 1

当 $y = 1$ 时令 $s = x$，当 $y = 0$ 时令 $s = -x$。这样两种情况都满足 $p_t = \sigma(s)$，同一个公式就能覆盖所有样本。

## 提示 2

$\log \sigma(s) = -\log(1 + e^{-s})$，对应代码为 `-np.logaddexp(0.0, -s)`。同理，$1 - \sigma(s) = \sigma(-s)$。当 logits 为 1000 时，这些形式仍能保持有限。

## 提示 3

计算梯度时，使用 $dp_t / ds = p_t (1 - p_t)$。因子 $(1 - p_t)^\gamma$ 也依赖 $s$，因此乘积法则给出两项：$\frac{d \mathrm{FL}}{ds} = \alpha_t (1 - p_t)^\gamma \left(\gamma \, p_t \log p_t - (1 - p_t)\right)$。

## 提示 4

再乘以 $ds/dx$：$y = 1$ 时为 $+1$，$y = 0$ 时为 $-1$。损失取平均值，因此还要除以 $N$。
