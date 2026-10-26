## 提示 1

先编写单步更新，并手工测试。每行都从 $m = -\infty$、$l = 0$ 和全零累加器开始。

## 提示 2

旧的累计和与累加器都是相对于旧最大值计算的。最大值增大时，将两者都乘以 $e^{m - m'}$，转换到新最大值对应的尺度。任意一项漏乘这个因子，输出都会出错。

## 提示 3

`np.exp(-np.inf)` 恰好为 0，但 `-np.inf - (-np.inf)` 会得到 NaN。在指数表达式中，用 `np.where(np.isneginf(m_new), 0.0, m_new)` 作为最大值。

## 提示 4

使用 `range(0, Tk, block_size)` 循环，以 `stop = min(start + block_size, Tk)` 确定终点，再切片 `K[start:stop]`。构造因果掩码时，将 `np.arange(start, stop)` 与查询索引 `np.arange(Tq)` 比较。
