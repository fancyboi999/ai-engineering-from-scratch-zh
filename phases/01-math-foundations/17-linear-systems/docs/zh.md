# 线性方程组

> 求解 Ax = b 是数学里最古老的问题，至今仍在驱动你的神经网络。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1，第 01 课（线性代数直觉）、02 课（向量与矩阵）、03 课（矩阵变换）
**预计时间：** ~120 分钟

## 学习目标

- 用带部分主元的高斯消元和回代求解 Ax = b
- 用 LU、QR 和 Cholesky 分解来分解矩阵，并解释各自何时合适
- 推导最小二乘的正规方程，把它和线性回归及岭回归联系起来
- 用条件数诊断病态系统，并应用正则化来稳定它们

## 问题背景

你每训练一次线性回归，就解一次线性方程组。你每算一次最小二乘拟合，就解一次线性方程组。神经网络层每算一次 `y = Wx + b`，它就在求值一个线性方程组的一边。当你加正则化时，你修改了这个方程组。当你用高斯过程时，你分解一个矩阵。当你为马氏距离求一个协方差矩阵的逆时，你解一个线性方程组。

方程 Ax = b 无处不在。A 是已知系数的矩阵。b 是已知输出的向量。x 是你想求的未知向量。在线性回归里，A 是你的数据矩阵，b 是你的目标向量，x 是权重向量。整个模型归结为：找出 x，使 Ax 尽可能接近 b。

本节课从零构建求解那个方程的每个主要方法。你将理解为什么有些方法快、另一些稳，为什么有些只对方阵有效、另一些能处理超定的，以及为什么你矩阵的条件数决定了你的答案究竟有没有意义。

## 核心概念

### Ax = b 在几何上意味着什么

线性方程组有一个几何解释。每个方程定义一个超平面。解是所有超平面相交的那个点（或点集）。

```
2x + y = 5          Two lines in 2D.
x - y  = 1          They intersect at x=2, y=1.
```

```mermaid
graph LR
    A["2x + y = 5"] --- S["解: (2, 1)"]
    B["x - y = 1"] --- S
```

可能发生三件事：

```mermaid
graph TD
    subgraph "唯一解"
        A1["两条线相交于一点"]
    end
    subgraph "无解"
        A2["两条线平行 —— 没有交点"]
    end
    subgraph "无穷多解"
        A3["两条线重合 —— 每一点都是解"]
    end
```

在矩阵形式里，"一个解"意味着 A 可逆。"无解"意味着方程组不相容。"无穷多解"意味着 A 有零空间。大多数 ML 问题落在"无精确解"这一类，因为你的方程（数据点）比未知数（参数）多。最小二乘就从这里登场。

### 列视角 vs 行视角

读 Ax = b 有两种方式。

**行视角。** A 的每一行定义一个方程。每个方程是一个超平面。解是它们全都相交之处。

**列视角。** A 的每一列是一个向量。问题变成：A 的列的什么线性组合能产出 b？

```
A = | 2  1 |    b = | 5 |
    | 1 -1 |        | 1 |

Row picture: solve 2x + y = 5 and x - y = 1 simultaneously.

Column picture: find x1, x2 such that:
  x1 * [2, 1] + x2 * [1, -1] = [5, 1]
  2 * [2, 1] + 1 * [1, -1] = [4+1, 2-1] = [5, 1]   check.
```

列视角更根本。如果 b 落在 A 的列空间里，方程组有解。如果不在，你就找列空间里最近的点。那个最近的点就是最小二乘解。

### 高斯消元

高斯消元把 Ax = b 变换成一个上三角系统 Ux = c，你用回代来解它。它是最直接的方法。

算法：

```
1. For each column k (the pivot column):
   a. Find the largest entry in column k at or below row k (partial pivoting).
   b. Swap that row with row k.
   c. For each row i below k:
      - Compute multiplier m = A[i][k] / A[k][k]
      - Subtract m times row k from row i.
2. Back substitute: solve from the last equation upward.
```

例子：

```
Original:
| 2  1  1 | 8 |       R2 = R2 - (2)R1     | 2  1   1 |  8 |
| 4  3  3 |20 |  -->  R3 = R3 - (1)R1 --> | 0  1   1 |  4 |
| 2  3  1 |12 |                            | 0  2   0 |  4 |

                       R3 = R3 - (2)R2     | 2  1   1 |  8 |
                                       --> | 0  1   1 |  4 |
                                           | 0  0  -2 | -4 |

Back substitute:
  -2 * x3 = -4    -->  x3 = 2
  x2 + 2  = 4     -->  x2 = 2
  2*x1 + 2 + 2 = 8 --> x1 = 2
```

高斯消元的代价是 O(n^3) 次操作。对一个 1000x1000 的系统，这大约是十亿次浮点运算。快，但如果你要用同一个 A 解多个系统，你可以做得更好。

### 部分主元：它为什么重要

不用主元，高斯消元可能失败或产出垃圾。如果一个主元元素是零，你就除以零。如果它很小，你就放大舍入误差。

```
Bad pivot:                       With partial pivoting:
| 0.001  1 | 1.001 |            Swap rows first:
| 1      1 | 2     |            | 1      1 | 2     |
                                 | 0.001  1 | 1.001 |
m = 1/0.001 = 1000              m = 0.001/1 = 0.001
R2 = R2 - 1000*R1               R2 = R2 - 0.001*R1
| 0.001  1     | 1.001   |      | 1      1     | 2     |
| 0     -999   | -999.0  |      | 0      0.999 | 0.999 |

x2 = 1.000 (correct)            x2 = 1.000 (correct)
x1 = (1.001 - 1)/0.001          x1 = (2 - 1)/1 = 1.000 (correct)
   = 0.001/0.001 = 1.000        Stable because the multiplier is small.
```

在精度有限的浮点算术里，不用主元的版本会损失有效数字。部分主元总是选取可用的最大主元，以最小化误差放大。

### LU 分解

LU 分解把 A 分解成一个下三角矩阵 L 和一个上三角矩阵 U：A = LU。L 矩阵存高斯消元里的乘子。U 矩阵是消元的结果。

```
A = L @ U

| 2  1  1 |   | 1  0  0 |   | 2  1   1 |
| 4  3  3 | = | 2  1  0 | @ | 0  1   1 |
| 2  3  1 |   | 1  2  1 |   | 0  0  -2 |
```

为什么要分解而不只是消元？因为一旦你有了 L 和 U，对任何新的 b 解 Ax = b 只需 O(n^2)：

```
Ax = b
LUx = b
Let y = Ux:
  Ly = b    (forward substitution, O(n^2))
  Ux = y    (back substitution, O(n^2))
```

O(n^3) 的代价在分解时付一次。之后每次求解都是 O(n^2)。如果你要用同一个 A、不同的 b 向量解 1000 个系统，LU 在总工作量上省下 1000/3 倍。

带部分主元时，你得到 PA = LU，其中 P 是记录行交换的置换矩阵。

### QR 分解

QR 分解把 A 分解成一个正交矩阵 Q 和一个上三角矩阵 R：A = QR。

正交矩阵有性质 Q^T Q = I。它的列是标准正交向量。乘以 Q 保持长度和夹角。

```
A = Q @ R

Q has orthonormal columns: Q^T Q = I
R is upper triangular

To solve Ax = b:
  QRx = b
  Rx = Q^T b    (just multiply by Q^T, no inversion needed)
  Back substitute to get x.
```

对求解最小二乘问题，QR 在数值上比 LU 更稳定。Gram-Schmidt 过程逐列构建 Q：

```
Given columns a1, a2, ... of A:

q1 = a1 / ||a1||

q2 = a2 - (a2 . q1) * q1        (subtract projection onto q1)
q2 = q2 / ||q2||                (normalize)

q3 = a3 - (a3 . q1) * q1 - (a3 . q2) * q2
q3 = q3 / ||q3||

R[i][j] = qi . aj    for i <= j
```

每一步移除沿所有先前 q 向量的分量，只留下新的正交方向。

### Cholesky 分解

当 A 对称（A = A^T）且正定（所有特征值为正）时，你可以把它分解为 A = L L^T，其中 L 是下三角的。这就是 Cholesky 分解。

```
A = L @ L^T

| 4  2 |   | 2  0 |   | 2  1 |
| 2  5 | = | 1  2 | @ | 0  2 |

L[i][i] = sqrt(A[i][i] - sum(L[i][k]^2 for k < i))
L[i][j] = (A[i][j] - sum(L[i][k]*L[j][k] for k < j)) / L[j][j]    for i > j
```

Cholesky 比 LU 快一倍，且只需一半的存储。它只对对称正定矩阵有效，但那种矩阵不断出现：

- 协方差矩阵是对称半正定的（加正则化后是正定的）。
- 高斯过程里的核矩阵是对称正定的。
- 凸函数在最小值处的 Hessian 是对称正定的。
- A^T A 总是对称半正定的。

在高斯过程里，你用 Cholesky 分解核矩阵 K，然后解 K alpha = y 得到预测均值。Cholesky 因子还给你边际似然所需的对数行列式：log det(K) = 2 * sum(log(diag(L)))。

### 最小二乘：当 Ax = b 没有精确解时

如果 A 是 m x n 的且 m > n（方程比未知数多），系统就是超定的。没有精确解。取而代之，你最小化平方误差：

```
minimize ||Ax - b||^2

This is the sum of squared residuals:
  sum((A[i,:] @ x - b[i])^2 for i in range(m))
```

最小化者满足正规方程：

```
A^T A x = A^T b
```

推导：展开 ||Ax - b||^2 = (Ax - b)^T (Ax - b) = x^T A^T A x - 2 x^T A^T b + b^T b。对 x 取梯度，令其为零：2 A^T A x - 2 A^T b = 0。

```
Original system (overdetermined, 4 equations, 2 unknowns):
| 1  1 |         | 3 |
| 1  2 | x     = | 5 |       No exact x satisfies all 4 equations.
| 1  3 |         | 6 |
| 1  4 |         | 8 |

Normal equations:
A^T A = | 4  10 |    A^T b = | 22 |
        | 10 30 |            | 63 |

Solve: x = [1.5, 1.7]

This is linear regression. x[0] is the intercept, x[1] is the slope.
```

### 正规方程 = 线性回归

这个联系是精确的。在线性回归里，你的数据矩阵 X 每个样本一行、每个特征一列。你的目标向量 y 每个样本一个元素。权重向量 w 满足：

```
X^T X w = X^T y
w = (X^T X)^(-1) X^T y
```

这是线性回归的闭式解。每次调用 `sklearn.linear_model.LinearRegression.fit()` 算的就是这个（或通过 QR 或 SVD 的等价物）。

给矩阵加一个正则化项 lambda * I，你就得到岭回归：

```
(X^T X + lambda * I) w = X^T y
w = (X^T X + lambda * I)^(-1) X^T y
```

正则化让矩阵的条件更好（更易准确地求逆），并通过把权重往零收缩来防止过拟合。当 lambda > 0 时矩阵 X^T X + lambda * I 总是对称正定的，所以你可以用 Cholesky 来解它。

### 伪逆（Moore-Penrose）

伪逆 A+ 把矩阵求逆推广到非方阵和奇异矩阵。对任意矩阵 A：

```
x = A+ b

where A+ = V Sigma+ U^T    (computed via SVD)
```

Sigma+ 通过取每个非零奇异值的倒数再转置结果而得。如果 A = U Sigma V^T，那么 A+ = V Sigma+ U^T。

```
A = U Sigma V^T        (SVD)

Sigma = | 5  0 |       Sigma+ = | 1/5  0  0 |
        | 0  2 |                | 0  1/2  0 |
        | 0  0 |

A+ = V Sigma+ U^T
```

伪逆给出最小范数的最小二乘解。如果系统：
- 有一个解：A+ b 给出它。
- 无解：A+ b 给出最小二乘解。
- 无穷多解：A+ b 给出 ||x|| 最小的那个。

NumPy 的 `np.linalg.lstsq` 和 `np.linalg.pinv` 内部都用 SVD。

### 条件数

条件数度量解对输入微小变化的敏感程度。对一个矩阵 A，条件数是：

```
kappa(A) = ||A|| * ||A^(-1)|| = sigma_max / sigma_min
```

其中 sigma_max 和 sigma_min 是最大和最小的奇异值。

```
Well-conditioned (kappa ~ 1):        Ill-conditioned (kappa ~ 10^15):
Small change in b -->                Small change in b -->
small change in x                    huge change in x

| 2  0 |   kappa = 2/1 = 2          | 1   1          |   kappa ~ 10^15
| 0  1 |   safe to solve            | 1   1+10^(-15) |   solution is garbage
```

经验法则：
- kappa < 100：安全，解准确。
- kappa ~ 10^k：你从浮点算术中损失约 k 位精度。
- kappa ~ 10^16（对 float64）：解毫无意义。矩阵实际上是奇异的。

在 ML 里，病态发生在特征近乎共线时。正则化（加 lambda * I）把条件数从 sigma_max / sigma_min 改善到 (sigma_max + lambda) / (sigma_min + lambda)。

### 迭代方法：共轭梯度

对非常大的稀疏系统（上百万个未知数），像 LU 或 Cholesky 这样的直接方法太昂贵。迭代方法通过在许多次迭代里改进一个猜测来近似解。

共轭梯度（CG）在 A 对称正定时求解 Ax = b。它（在精确算术下）最多 n 次迭代找到精确解，但如果 A 的特征值聚集，通常收敛得快得多。

```
Algorithm sketch:
  x0 = initial guess (often zero)
  r0 = b - A x0           (residual)
  p0 = r0                 (search direction)

  For k = 0, 1, 2, ...:
    alpha = (rk . rk) / (pk . A pk)
    x_{k+1} = xk + alpha * pk
    r_{k+1} = rk - alpha * A pk
    beta = (r_{k+1} . r_{k+1}) / (rk . rk)
    p_{k+1} = r_{k+1} + beta * pk
    if ||r_{k+1}|| < tolerance: stop
```

CG 用于：
- 大规模优化（Newton-CG 方法）
- 求解 PDE 离散化
- 核矩阵大到无法分解的核方法
- 给其他迭代求解器做预条件

收敛速度取决于条件数。条件更好的系统收敛更快，这是正则化有帮助的又一个原因。

### 全景图：什么时候用哪个方法

| 方法 | 要求 | 代价 | 适用场景 |
|--------|-------------|------|----------|
| 高斯消元 | 方阵、非奇异 A | O(n^3) | 一次性求解方阵系统 |
| LU 分解 | 方阵、非奇异 A | O(n^3) 分解 + O(n^2) 求解 | 用同一个 A 多次求解 |
| QR 分解 | 任意 A（m >= n） | O(mn^2) | 最小二乘，数值稳定 |
| Cholesky | 对称正定 A | O(n^3/3) | 协方差矩阵、高斯过程、岭回归 |
| 正规方程 | 超定（m > n） | O(mn^2 + n^3) | 线性回归（n 小） |
| SVD / 伪逆 | 任意 A | O(mn^2) | 秩亏系统、最小范数解 |
| 共轭梯度 | 对称正定、稀疏 A | O(n * k * nnz) | 大稀疏系统，k = 迭代次数 |

### 与 ML 的联系

本节课里的每个方法都出现在生产 ML 中：

**线性回归。** 闭式解求解正规方程 X^T X w = X^T y。这通过 Cholesky（若 n 小）或 QR（若数值稳定要紧）或 SVD（若矩阵可能秩亏）来做。

**岭回归。** 给 X^T X 加 lambda * I。正则化系统 (X^T X + lambda * I) w = X^T y 总能用 Cholesky 求解，因为 lambda > 0 时 X^T X + lambda * I 是对称正定的。

**高斯过程。** 预测均值需要解 K alpha = y，其中 K 是核矩阵。对 K 做 Cholesky 分解是标准做法。对数边际似然用 log det(K) = 2 sum(log(diag(L)))。

**神经网络初始化。** 正交初始化用 QR 分解来创建列为标准正交的权重矩阵。这防止深层网络里的信号坍缩。

**预条件。** 大规模优化器用不完全 Cholesky 或不完全 LU 作为共轭梯度求解器的预条件子。

**特征工程。** X^T X 的条件数告诉你特征是否共线。如果 kappa 大，就丢特征或加正则化。

```figure
linear-system-conditioning
```

## 动手构建

### 第 1 步：带部分主元的高斯消元

```python
import numpy as np

def gaussian_elimination(A, b):
    n = len(b)
    Ab = np.hstack([A.astype(float), b.reshape(-1, 1).astype(float)])

    for k in range(n):
        max_row = k + np.argmax(np.abs(Ab[k:, k]))
        Ab[[k, max_row]] = Ab[[max_row, k]]

        if abs(Ab[k, k]) < 1e-12:
            raise ValueError(f"Matrix is singular or nearly singular at pivot {k}")

        for i in range(k + 1, n):
            m = Ab[i, k] / Ab[k, k]
            Ab[i, k:] -= m * Ab[k, k:]

    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (Ab[i, -1] - Ab[i, i+1:n] @ x[i+1:n]) / Ab[i, i]

    return x
```

### 第 2 步：LU 分解

```python
def lu_decompose(A):
    n = A.shape[0]
    L = np.eye(n)
    U = A.astype(float).copy()
    P = np.eye(n)

    for k in range(n):
        max_row = k + np.argmax(np.abs(U[k:, k]))
        if max_row != k:
            U[[k, max_row]] = U[[max_row, k]]
            P[[k, max_row]] = P[[max_row, k]]
            if k > 0:
                L[[k, max_row], :k] = L[[max_row, k], :k]

        for i in range(k + 1, n):
            L[i, k] = U[i, k] / U[k, k]
            U[i, k:] -= L[i, k] * U[k, k:]

    return P, L, U

def lu_solve(P, L, U, b):
    n = len(b)
    Pb = P @ b.astype(float)

    y = np.zeros(n)
    for i in range(n):
        y[i] = Pb[i] - L[i, :i] @ y[:i]

    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - U[i, i+1:] @ x[i+1:]) / U[i, i]

    return x
```

### 第 3 步：Cholesky 分解

```python
def cholesky(A):
    n = A.shape[0]
    L = np.zeros_like(A, dtype=float)

    for i in range(n):
        for j in range(i + 1):
            s = A[i, j] - L[i, :j] @ L[j, :j]
            if i == j:
                if s <= 0:
                    raise ValueError("Matrix is not positive definite")
                L[i, j] = np.sqrt(s)
            else:
                L[i, j] = s / L[j, j]

    return L
```

### 第 4 步：用正规方程做最小二乘

```python
def least_squares_normal(A, b):
    AtA = A.T @ A
    Atb = A.T @ b
    return gaussian_elimination(AtA, Atb)

def ridge_regression(A, b, lam):
    n = A.shape[1]
    AtA = A.T @ A + lam * np.eye(n)
    Atb = A.T @ b
    L = cholesky(AtA)
    y = np.zeros(n)
    for i in range(n):
        y[i] = (Atb[i] - L[i, :i] @ y[:i]) / L[i, i]
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - L.T[i, i+1:] @ x[i+1:]) / L.T[i, i]
    return x
```

### 第 5 步：条件数

```python
def condition_number(A):
    U, S, Vt = np.linalg.svd(A)
    return S[0] / S[-1]
```

## 实际使用

把这些拼起来，在真实数据上做线性回归和岭回归：

```python
np.random.seed(42)
X_raw = np.random.randn(100, 3)
w_true = np.array([2.0, -1.0, 0.5])
y = X_raw @ w_true + np.random.randn(100) * 0.1

X = np.column_stack([np.ones(100), X_raw])

w_ols = least_squares_normal(X, y)
print(f"OLS weights (ours):    {w_ols}")

w_np = np.linalg.lstsq(X, y, rcond=None)[0]
print(f"OLS weights (numpy):   {w_np}")
print(f"Max difference: {np.max(np.abs(w_ols - w_np)):.2e}")

w_ridge = ridge_regression(X, y, lam=1.0)
print(f"Ridge weights (ours):  {w_ridge}")

from sklearn.linear_model import Ridge
ridge_sk = Ridge(alpha=1.0, fit_intercept=False)
ridge_sk.fit(X, y)
print(f"Ridge weights (sklearn): {ridge_sk.coef_}")
```

## 拿去用

本节课产出：
- `code/linear_systems.py`，含高斯消元、LU 分解、Cholesky 分解、最小二乘和岭回归的从零实现
- 一个可运行的演示，表明正规方程和 sklearn 的 LinearRegression 产出相同的权重

## 练习

1. 用你的高斯消元、你的 LU 求解器和 `np.linalg.solve` 求解系统 `[[1,2,3],[4,5,6],[7,8,10]] x = [6, 15, 27]`。验证三者在浮点容差内给出相同答案。

2. 生成一个 50x5 的随机矩阵 X 和目标 y = X @ w_true + noise。用正规方程、QR（通过 `np.linalg.qr`）、SVD（通过 `np.linalg.svd`）和 `np.linalg.lstsq` 求 w。比较全部四个解。测量 X^T X 的条件数，解释它如何影响你信任哪个方法。

3. 让两列几乎相同（例如，列 2 = 列 1 + 1e-10 * noise），造一个近乎奇异的矩阵。算它的条件数。在有正则化和无正则化（加 0.01 * I）的情况下解 Ax = b。比较解和残差。解释为什么正则化有帮助。

4. 为一个 100x100 的随机对称正定矩阵实现共轭梯度算法。数它收敛到容差 1e-8 要多少次迭代。和理论上限 n 次迭代对比。

5. 在尺寸为 10、50、200、500 的对称正定矩阵上，给你的 Cholesky 求解器、你的 LU 求解器和 `np.linalg.solve` 计时。把结果画出来。验证 Cholesky 大约比 LU 快一倍。

## 关键术语

| 术语 | 人们常说 | 它实际指什么 |
|------|----------------|----------------------|
| 线性方程组 | "解出 x" | 一组线性方程 Ax = b。求 x 意味着找出在变换 A 下产出输出 b 的输入。 |
| 高斯消元 | "行化简" | 用行操作系统性地把对角线以下的元素清零，产出一个用回代可解的上三角系统。O(n^3)。 |
| 部分主元 | "交换行以求稳定" | 在第 k 列消元前，把该列绝对值最大的行换到主元位置。防止除以小数。 |
| LU 分解 | "分解成三角" | 把 A 写成 LU，L 是下三角（存乘子）、U 是上三角（消元后的矩阵）。把 O(n^3) 代价分摊到多次求解上。 |
| QR 分解 | "正交分解" | 把 A 写成 QR，Q 列标准正交、R 上三角。对最小二乘比 LU 更稳定。 |
| Cholesky 分解 | "矩阵的平方根" | 对对称正定 A，写成 A = LL^T。LU 一半的代价。用于协方差矩阵、核矩阵和岭回归。 |
| 最小二乘 | "无法精确时的最佳拟合" | 当系统超定（方程比未知数多）时最小化平方残差之和 ||Ax - b||^2。 |
| 正规方程 | "微积分捷径" | A^T A x = A^T b。令 ||Ax - b||^2 的梯度为零。这就是线性回归的闭式解。 |
| 伪逆 | "非方阵的求逆" | 通过 SVD 得 A+ = V Sigma+ U^T。给任意矩阵（方或矩形、奇异或否）最小范数的最小二乘解。 |
| 条件数 | "这个答案有多可信" | kappa = sigma_max / sigma_min。度量对输入扰动的敏感度。约损失 log10(kappa) 位精度。 |
| 岭回归 | "正则化的最小二乘" | 解 (X^T X + lambda I) w = X^T y。加 lambda I 改善条件、把权重往零收缩。防止过拟合。 |
| 共轭梯度 | "大矩阵的迭代 Ax=b" | 对称正定系统的迭代求解器。最多 n 步收敛。对分解太昂贵的大稀疏系统实用。 |
| 超定系统 | "数据比参数多" | m x n 系统里 m > n。不存在精确解。最小二乘找最佳近似。这就是每个回归问题。 |
| 回代 | "从下往上解" | 给定一个上三角系统，先解最后一个方程，再往回代入。O(n^2)。 |
| 前代 | "从上往下解" | 给定一个下三角系统，先解第一个方程，再往前代入。O(n^2)。用在 LU 求解的 L 步里。 |

## 延伸阅读

- [MIT 18.06: Linear Algebra](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)（Gilbert Strang）-- 关于线性方程组和矩阵分解的权威课程
- [Numerical Linear Algebra](https://people.maths.ox.ac.uk/trefethen/text.html)（Trefethen & Bau）-- 理解数值稳定、条件和算法为何失败的标准参考
- [Matrix Computations](https://www.cs.cornell.edu/cv/GolubVanLoan4/golubandvanloan.htm)（Golub & Van Loan）-- 每个矩阵算法的百科全书式参考
- [3Blue1Brown: Inverse Matrices](https://www.3blue1brown.com/lessons/inverse-matrices) -- 解 Ax = b 在几何上意味着什么的可视化直觉
