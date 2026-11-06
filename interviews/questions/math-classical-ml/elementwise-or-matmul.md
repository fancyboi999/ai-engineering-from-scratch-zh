---
id: elementwise-or-matmul
title: NumPy 中输出不同数值的两种乘法操作
card: math-classical-ml
kind: code-reading
level: 1
roles: [ai-data-engineer, applied-ai-engineer]
rounds: [screen, coding]
tags: [linear-algebra, matrix-multiply, element-wise, numpy]
minutes: 5
lessons: [phases/01-math-foundations/02-vectors-matrices-operations]
manuals: []
practice: []
cheatsheet: [linear-algebra]
related: [math-classical-ml/dense-layer-weight-shape]
updated: 2026-11-03
---

阅读以下代码并说明每次打印的输出内容。然后告诉我全连接层使用的是这两种操作中的哪一种，以及为什么。

```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
print(A * B)
print(A @ B)
```

## Short answer

星号运算符执行逐元素相乘，因此第一个 print 输出 5、12、21 和 32。@ 运算符计算行与列的点积，因此第二个 print 输出 19、22、43 和 50。全连接层使用 @ 运算符，因为每个输出都必须对所有输入求和。

## Full answer

### 逐元素乘积

两个数组形状相同，因此星号运算符将相同位置上的元素配对相乘：

```text
1*5 = 5    2*6 = 12
3*7 = 21   4*8 = 32
```

调换 A 和 B 的顺序不会改变计算结果。

### 矩阵乘积

@ 运算符调用 matmul 方法。结果矩阵中第 (i, j) 个元素是 A 的第 i 行与 B 的第 j 列的点积：

```text
1*5 + 2*7 = 19    1*6 + 2*8 = 22
3*5 + 4*7 = 43    3*6 + 4*8 = 50
```

操作数顺序至关重要。B 乘以 A 会得到不同的数值。内侧维度必须一致，计算结果的行数等于 A 的行数，列数等于 B 的列数。

### 全连接层使用哪一种

全连接层计算 W 乘以 x 加 b 的激活值。每个输出都用自身的权重行混合所有输入，这正是矩阵乘法中的点积操作。逐元素乘积出现在模型训练的其他环节，例如学习率缩放梯度、或者用掩码将特定数值归零。NumPy 使用 C 和 Fortran 编写的高度优化 BLAS 例程来执行矩阵乘法，课程实测其比遍历相同数值的 Python 循环快约 100 倍。

## Follow-ups

- **Level 1:** 在这两种操作中，A 和 B 的顺序是否影响结果？ Expected: 逐元素乘法不影响，矩阵乘法则会改变结果。
- **Level 2:** 学习率更新步骤使用这两种操作中的哪一种？ Expected: 标量乘以梯度，属于逐元素缩放。
- **Level 2:** 为什么 @ 运算符比 Python 原生循环快得多？ Expected: 它调用了 C 和 Fortran 编写的 BLAS 例程；课程给出的实测加速比约为 100 倍。
- **Level 3:** 有人在全连接层中误写了星号乘法，代码却正常运行未报错，这是怎么发生的？ Expected: 两个操作数形状恰好一致，逐元素乘法得以执行并静默输出了错误数值。

## Wrong answers

- "两者打印出相同的矩阵，星号只是 @ 运算符的另一种写法。" 这两种操作遵循完全不同的运算规则并产生不同的数值。
- "@ 运算符是逐元素乘积，星号是矩阵乘积。" @ 调用 matmul 计算行列点积，星号则作用于相匹配的对应位置。
- "全连接层将每个权重与对应输入相乘，因此是逐元素的。" 每个输出还需要对所有输入求和；该求和过程正是矩阵乘法内部的点积操作。

## Taught in

[向量与矩阵运算课程](../../../phases/01-math-foundations/02-vectors-matrices-operations/)手工推导了这两种乘法，随后用 NumPy 实现。
