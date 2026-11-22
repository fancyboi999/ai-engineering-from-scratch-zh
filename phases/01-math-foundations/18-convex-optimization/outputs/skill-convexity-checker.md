---
name: skill-convexity-checker
description: 判断优化问题是否为凸问题，并选择合适的求解器
version: 1.0.0
phase: 1
lesson: 18
tags: [optimization, convexity, solvers]
---

# 凸性检查

如何验证一个优化问题是不是凸的，以及得出结论后该怎么做。

## 决策清单

1. 目标函数是凸的吗？（检查 Hessian 是否半正定，或使用复合规则。）
2. 所有不等式约束都是 g_i(x) <= 0 的形式，且每个 g_i 都是凸的吗？
3. 所有等式约束都是仿射（线性）的吗？
4. 三条都满足，问题就是凸的。使用有收敛保证的凸优化求解器。
5. 有任何一条不满足，问题就是非凸的。使用 SGD/Adam，并接受局部最优。

## 如何检验函数的凸性

| 检验 | 适用对象 | 方法 |
|---|---|---|
| 二阶导数 >= 0 | 一元函数 f(x) | 计算 f''(x)。如果对所有 x 都有 f''(x) >= 0，则为凸。 |
| Hessian 半正定 | 多元函数 f(x) | 计算 H(x)。如果处处所有特征值 >= 0，则为凸。 |
| 定义检验 | 任意函数 | 对采样的 x、y、t 检查 f(tx + (1-t)y) <= t*f(x) + (1-t)*f(y)。 |
| 复合规则 | 复合函数 | 见下方复合规则表。 |
| 限制到直线上 | 多元函数 f | f 为凸，当且仅当对所有 x、v，g(t) = f(x + tv) 关于 t 为凸。 |

## 复合规则（保持凸性）

| 运算 | 结果 |
|---|---|
| f + g（两者都是凸的） | 凸 |
| c * f（c > 0，f 为凸） | 凸 |
| max(f, g)（两者都是凸的） | 凸 |
| f(Ax + b)，其中 f 为凸 | 凸 |
| g(f(x))，其中 g 为凸且非减，f 为凸 | 凸 |
| g(f(x))，其中 g 为凸且非增，f 为凹 | 凸 |
| 凸函数之和 | 凸 |
| 凸函数的逐点上确界 | 凸 |

## 常见机器学习目标函数：凸还是非凸？

| 目标函数 | 凸？ | 原因 |
|---|---|---|
| MSE: (1/n) sum(y - Xw)^2 | 是 | 关于 w 是二次的，Hessian = (2/n) X^T X 半正定 |
| Logistic 损失：sum(log(1 + exp(-y_i * w^T x_i))) | 是 | 凸函数之和（log-sum-exp 族） |
| Hinge 损失：sum(max(0, 1 - y_i * w^T x_i)) | 是 | 凸（线性）函数的最大值 |
| L2 正则化：lambda * \|\|w\|\|^2 | 是 | 二次函数，Hessian = 2*lambda*I |
| L1 正则化：lambda * \|\|w\|\|_1 | 是 | 绝对值之和（凸但不可微） |
| 岭回归：MSE + L2 | 是 | 两个凸函数之和 |
| LASSO：MSE + L1 | 是 | 两个凸函数之和 |
| 弹性网：MSE + L1 + L2 | 是 | 凸函数之和 |
| SVM（原问题）：hinge + L2 | 是 | 凸函数之和 |
| 带 softmax 的交叉熵 | 是（关于 logits） | log-sum-exp 是凸的 |
| 神经网络（任意损失） | 否 | 非线性激活造成非凸的复合 |
| k-means 目标函数 | 否 | 存在离散的分配步骤 |
| 矩阵分解：\|\|X - UV^T\|\|^2 | 否 | 关于 U 和 V 是双线性的 |
| GAN 损失 | 否 | 极小极大问题，关于生成器非凸 |
| 对比损失（InfoNCE） | 否 | 含负样本的指数之比再取对数 |

## 根据凸性选择求解器

| 问题类型 | 求解器 | 收敛保证 |
|---|---|---|
| 凸、光滑、无约束 | 梯度下降 | 以 O(1/k) 收敛到全局最小值 |
| 凸、光滑、无约束 | L-BFGS | 超线性收敛到全局最小值 |
| 凸、光滑、无约束 | 牛顿法 | 在最小值附近二次收敛（Hessian 可算时） |
| 凸、光滑、有约束 | 内点法 | 多项式时间 |
| 凸、非光滑（L1） | 近端梯度 / ISTA | 以 O(1/k) 收敛到全局最小值 |
| 凸、非光滑（L1） | ADMM | 灵活，能处理约束 |
| 凸、二次 | 共轭梯度 | n 步内得到精确解 |
| 非凸、光滑 | SGD / Adam | 收敛到局部最小值 |
| 非凸、光滑 | SGD + 重启 | 平均而言能找到更好的局部最小值 |
| 非凸、光滑 | 过参数化 + SGD | 平坦极小值，泛化好 |

## 常见错误

- 因为损失函数是凸的，就认为问题是凸的。损失必须关于你要优化的参数是凸的。交叉熵关于 logits 是凸的，但从输入到 logits 的整个神经网络映射是非凸的。
- 在非凸问题上用牛顿法。Hessian 可能有负特征值，导致牛顿法走向鞍点或极大值，而不是极小值。
- 忘了 L1 正则化让目标函数在零点不可微。标准梯度下降效果不好。改用近端梯度下降或次梯度方法。
- 构造 A^T A 时把条件数平方了。如果要解最小二乘问题而 A 是病态的，用 QR 或 SVD 代替正规方程。
- 不加检查就断定问题非凸。许多机器学习问题（线性模型、SVM、逻辑回归）是凸的，能受益于更强的求解器。

## 快速检验：我的问题是凸的吗？

```
1. Write out the objective: minimize f(w) subject to constraints
2. For each term in f(w):
   - Is it quadratic with PSD matrix? -> Convex
   - Is it a norm? -> Convex
   - Is it log-sum-exp? -> Convex
   - Does it involve w nonlinearly (sigmoid(w), w1*w2)? -> Likely non-convex
3. Are all constraints linear or convex inequalities?
4. If ALL terms are convex and constraints are convex/linear -> problem is convex
5. If ANY term is non-convex -> problem is non-convex
```
