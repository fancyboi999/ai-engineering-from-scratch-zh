---
name: skill-gradient-computation
description: 计算常见机器学习损失函数的梯度，并选择合适的求导方法
version: 1.0.0
phase: 1
lesson: 4
tags: [calculus, gradients, backpropagation]
---

# 机器学习中的梯度计算

一份实用参考，涵盖神经网络中损失函数、激活函数和层运算的梯度计算。

## 决策清单

1. 函数是否由简单基本函数（幂、指数、对数、三角函数）组合而成？用解析导数加链式法则。
2. 函数是自定义的还是黑盒运算？用数值微分：`(f(x+h) - f(x-h)) / (2h)`，取 h = 1e-7。
3. 函数由 PyTorch/JAX 的张量运算构成？交给 autograd，再用数值检验核对。
4. 需要标量损失对权重矩阵的梯度？沿计算图逐个节点应用链式法则。
5. 存在不可微运算（argmax、取整、采样）？用直通估计器（straight-through estimator）或重参数化技巧。

## 各方法的适用场景

| 方法 | 适用场景 | 开销 |
|---|---|---|
| 解析法（手工推导） | 简单函数，核对 autograd 输出 | 运行时零开销 |
| 数值法（有限差分） | 调试、梯度检验、黑盒函数 | n 个参数需要 2n 次前向传播 |
| 自动微分 | 任何可微计算图（默认选择） | 一次反向传播 |
| 符号法（SymPy、Mathematica） | 为论文推导闭式梯度 | 只在编译期 |

## 速查：常见导数

| 函数 | f(x) | f'(x) | 机器学习场景 |
|---|---|---|---|
| MSE 损失 | (1/n) sum(y_hat - y)^2 | (2/n)(y_hat - y) | 回归 |
| 交叉熵（二分类） | -(y log(p) + (1-y) log(1-p)) | p - y（经过 sigmoid 后） | 二分类 |
| 交叉熵（多分类） | -log(p_true_class) | p - one_hot(y)（经过 softmax 后） | 多分类 |
| Sigmoid | 1 / (1 + e^(-x)) | sigma(x) * (1 - sigma(x)) | 输出门、二值输出 |
| Tanh | (e^x - e^(-x)) / (e^x + e^(-x)) | 1 - tanh(x)^2 | 隐藏层激活（旧式） |
| ReLU | max(0, x) | x > 0 时为 1，x < 0 时为 0 | 默认隐藏层激活 |
| Leaky ReLU | max(0.01x, x) | x > 0 时为 1，x < 0 时为 0.01 | 避免神经元死亡 |
| GELU | x * Phi(x) | Phi(x) + x * phi(x) | Transformer |
| Softmax_i | e^(x_i) / sum(e^(x_j)) | i=j 时为 s_i(1 - s_i)，i!=j 时为 -s_i*s_j | 输出层（雅可比矩阵） |
| Log-softmax | x_i - log(sum(e^(x_j))) | 第 i 项为 1 - softmax(x_i) | 数值稳定的交叉熵 |
| 线性层 | y = Wx + b | dL/dW = dL/dy * x^T, dL/db = dL/dy | 每一层 |
| L2 正则化 | lambda * sum(w^2) | 2 * lambda * w | 权重衰减 |
| L1 正则化 | lambda * sum(\|w\|) | lambda * sign(w) | 稀疏性 |

## 常见错误

- 在按 batch 取平均的损失（MSE、交叉熵）里忘了 1/n 因子。梯度会被 batch size 缩放。
- 把 softmax 梯度当成向量来算，实际上它是雅可比矩阵。交叉熵和 softmax 合在一起时，梯度化简为 (p - y)，不必计算完整的雅可比矩阵。
- 链式法则的应用顺序弄反。要从损失往回推：dL/dW = dL/dy * dy/dW。
- 数值求导时 h 取得太大（h = 0.1）或太小（h = 1e-15）。float64 下就用 h = 1e-7。
- 忘了 ReLU 在 x = 0 处梯度没有定义。实践中把它设为 0 或 0.5。

## 梯度检验做法

```
For each parameter w:
  numeric_grad = (loss(w + h) - loss(w - h)) / (2h)
  auto_grad = backward pass value
  relative_error = |numeric - auto| / max(|numeric|, |auto|, 1e-8)
  assert relative_error < 1e-5
```

相对误差高于 1e-3 说明有地方错了。介于 1e-5 和 1e-3 之间，需要排查。
