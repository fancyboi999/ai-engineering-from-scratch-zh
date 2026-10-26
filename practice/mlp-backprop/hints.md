## 提示 1

在缓存中保存隐藏层激活 $a_1$ 和输出 $a_2$。反向传播需要这些值。Sigmoid 导数只需其输出：$\sigma'(z) = \sigma(z)(1 - \sigma(z))$。

## 提示 2

从损失开始计算。均值覆盖输出中的每个元素，因此 $\partial L / \partial a_2 = 2 (a_2 - y) / (N \cdot n_{out})$。用 `a2.size` 获取元素总数。

## 提示 3

从 $a_2$ 传到 $z_2$ 时乘以局部导数。接着 $\partial L / \partial W_2 = a_1^T \, \partial L / \partial z_2$。偏置会加到每一行，因此偏置梯度是 $\partial L / \partial z_2$ 沿批次轴求和。

## 提示 4

通过权重将梯度传回：$\partial L / \partial a_1 = (\partial L / \partial z_2) W_2^T$。然后对隐藏层重复同样步骤，将 $a_1$ 换成 $x$。

## 提示 5

很大的负数输入 sigmoid 时，内部会对很大的数调用 `np.exp`。在计算前将激活值截断到 $[-500, 500]$ 等范围，避免溢出警告。
