---
id: linear-algebra
title: 机器学习线性代数
code: LA
subtitle: 向量、变换、特征值、SVD 与 Ax = b 求解器。采用课程中从零实现的 Python 与 NumPy 代码。
hue: 230
sources: phases/01-math-foundations/01-linear-algebra-intuition, phases/01-math-foundations/02-vectors-matrices-operations, phases/01-math-foundations/03-matrix-transformations, phases/01-math-foundations/11-singular-value-decomposition, phases/01-math-foundations/17-linear-systems
source_hash: cab426c73f50f5d8
---

## SVD：旋转、缩放、旋转
type: architecture
from: phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md

```arch
node | x | 1,1 | 输入空间 | n 维
node | vt | 2,1 | V^T | 旋转
node | sig | 3,1 | Sigma | 按 sigma_i 缩放
node | u | 4,1 | U | 旋转
node | ata | 2,2 | A^T A | 特征向量为 V
node | aat | 3,2 | A A^T | 特征向量为 U
node | y | 4,2 | 输出空间 | m 维
edge | x | vt |
edge | vt | sig |
edge | sig | u |
edge | u | y |
edge | ata | vt | V
edge | aat | u | U
```

## 部分选主元的高斯消元
type: flow
from: phases/01-math-foundations/17-linear-systems/docs/zh.md, phases/01-math-foundations/17-linear-systems/code/linear_systems.py

1. **主元**：在第 k 列、第 k 行及以下寻找绝对值最大的元素。
2. **交换**：将该行与第 k 行交换。小主元会放大舍入误差。
3. **检查**：主元低于 `1e-12` 时抛出 `ValueError`。
4. **消元**：对 k 以下每行 i，计算 m = A[i][k] / A[k][k]，减去第 k 行的 m 倍。
5. **回代**：先解最后一个方程，再向上求解。
6. **复用**：L 存储乘数，U 是消元后的矩阵。PA = LU。

## NumPy 任务
type: task-table
from: phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md, phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md, phases/01-math-foundations/03-matrix-transformations/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md

| 任务 | 代码 |
|---|---|
| 点积与长度 | `np.dot(a, b)`, `np.linalg.norm(a)` |
| 矩阵乘法 | `A @ B` |
| 逐元素乘法 | `A * B` |
| 秩 | `np.linalg.matrix_rank(A)` |
| 特征值与特征向量 | `np.linalg.eig(A)` |
| 薄 SVD | `np.linalg.svd(A, full_matrices=False)` |
| 最小二乘 | `np.linalg.lstsq(A, b, rcond=None)[0]` |
| QR，检查 Q | `np.allclose(Q @ Q.T, np.eye(3))` |

## 用 SVD 截断、压缩与求逆
type: annotated-code
lang: python
from: phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/code/svd.py

```python
U, S, Vt = np.linalg.svd(A, full_matrices=False)  # S 按降序排列
A_k = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]  # 最佳秩 k 近似
compressed_size = k * (rows + cols + 1)  # 秩 k 的存储量
A_pinv = Vt.T @ np.diag(1.0 / S) @ U.T  # 伪逆，仅使用非零 S
x_svd = A_pinv @ b  # 最小二乘解
x_pinv = np.linalg.pinv(A) @ b  # NumPy 给出相同结果
U, S, V = svd_from_scratch(A)  # 幂迭代与消去
A_pinv = pseudoinverse_via_svd(A, tol=1e-10)  # 仅对高于 tol 的 s 取 1/s
```

## 从零求解 Ax = b
type: annotated-code
lang: python
from: phases/01-math-foundations/17-linear-systems/docs/zh.md, phases/01-math-foundations/17-linear-systems/code/linear_systems.py

```python
x = gaussian_elimination(A, b)  # 部分选主元，O(n^3)
P, L, U = lu_decompose(A)  # PA = LU，一次承担 O(n^3) 成本
x = lu_solve(P, L, U, b)  # 每个新 b 的成本为 O(n^2)
L = cholesky(A)  # A = L L^T，仅适用于对称正定矩阵
x = cholesky_solve(L, b)  # 先前代，再回代
w_ols = least_squares_normal(X, y)  # 求解 A^T A x = A^T b
w_ridge = ridge_regression(X, y, lam=1.0)  # 加上 lam * np.eye(n)
x, iters = conjugate_gradient(A, b)  # SPD，最多 n 次迭代
kappa = condition_number(A)  # S[0] / S[-1]，奇异时为 inf
```

## 变换矩阵
type: command-table
from: phases/01-math-foundations/03-matrix-transformations/docs/zh.md, phases/01-math-foundations/03-matrix-transformations/code/transformations.py

| 命令 | 作用 |
|---|---|
| `rotation_2d(theta)` | [[c, -s], [s, c]]。保持距离，行列式为 1 |
| `scaling_2d(sx, sy)` | [[sx, 0], [0, sy]]。行列式为 sx * sy |
| `shearing_2d(kx, ky)` | [[1, kx], [ky, 1]]。矩形变为平行四边形 |
| `reflection_y()` | [[-1, 0], [0, 1]]。翻转方向，行列式为 -1 |
| `reflection_x()` | [[1, 0], [0, -1]]。行列式为 -1 |
| `mat_mul(S, R)` | 先旋转再缩放。顺序有影响 |
| `eigenvalues_2x2(matrix)` | 特征方程的根。判别式 < 0 时为复数 |
| `eigenvector_2x2(matrix, eigenvalue)` | 某特征值对应的单位特征向量 |

## 关键公式
type: concepts
from: phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md, phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md, phases/01-math-foundations/03-matrix-transformations/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md

- **形状**：(m x n) @ (n x p) = (m x p)。内侧维度必须匹配。
- **余弦**：$\cos\theta = \frac{a \cdot b}{\lvert a\rvert \lvert b\rvert}$。1 表示同向，0 表示正交。
- **投影**：$\text{proj}_b a = \frac{a \cdot b}{b \cdot b} b$。残差垂直于 $b$。
- **特征关系**：$Av = \lambda v$。特征值是 $\det(A - \lambda I) = 0$ 的根。
- **2x2 特征值**：$\lambda^2 - (a+d)\lambda + (ad - bc) = 0$。
- **SVD**：$A = U \Sigma V^T$，且 $A v_i = \sigma_i u_i$。秩等于非零 $\sigma_i$ 的个数。
- **正规方程**：$A^T A x = A^T b$。岭回归将 $\lambda I$ 加到 $A^T A$。
- **条件数**：$\kappa = \sigma_{\max} / \sigma_{\min}$。

## 选择求解器
type: command-table
from: phases/01-math-foundations/17-linear-systems/docs/zh.md

| 命令 | 作用 |
|---|---|
| 高斯消元 | 方阵、非奇异 A。O(n^3)。求解一次 |
| LU 分解 | 同一个 A 多次求解。每次 O(n^2) |
| QR 分解 | m >= n 的最小二乘。数值稳定 |
| Cholesky | 对称正定 A。比 LU 快一倍 |
| 正规方程 | 超定、小 n。线性回归 |
| SVD / 伪逆 | 秩亏 A。最小范数解 |
| 共轭梯度 | 大型稀疏 SPD 矩阵 A。迭代求解 |

## 数值与默认值
type: defaults
from: phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md, phases/01-math-foundations/01-linear-algebra-intuition/code/vectors.py, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/code/svd.py, phases/01-math-foundations/17-linear-systems/docs/zh.md, phases/01-math-foundations/17-linear-systems/code/linear_systems.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `rank()` 零值判断 | 1e-10 | 更小的元素视为零 |
| 消元主元检查 | 1e-12 | 更小的主元抛出 ValueError |
| `power_iteration` `num_iters` | 200 | 在 `tol=1e-10` 时提前停止 |
| `conjugate_gradient` `tol` | 1e-10 | `max_iter` 默认为 n |
| 安全条件数 | < 100 | 解准确 |
| float64 无有效精度 | 10^{16} | 矩阵实际上奇异 |
| 秩 k=50 的图像 | 14.6% | 相对于 800 x 600 个值 |
| LoRA 秩 | 16 | 131K 个参数，而非 16M |

## 故障排查
type: troubleshooting
from: phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md, phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md, phases/01-math-foundations/03-matrix-transformations/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 形状不匹配错误 | 内侧维度不同 | 乘法前写出每个形状 |
| `inverse_2x2` 抛出 ValueError | 行列式为 0 | 使用伪逆 |
| “Matrix is not positive definite” | A 不是 SPD | 加 lambda I，或使用 LU |
| 输入微变导致权重剧变 | 特征共线、秩亏 | 删除特征或增加正则化 |
| 答案丢失有效位 | kappa 约 10^k 时丢失 k 位 | 正则化，或使用 QR、SVD |
| `np.linalg.eig(A.T @ A)` 不准确 | 该运算使条件数平方 | 使用 `np.linalg.svd(A)` |
| 组合变换得到错误点 | B @ A 先应用 A | 按应用顺序的逆序相乘 |
| Gram-Schmidt 点积不精确为 0 | 浮点误差 | 按 1e-9 等容差比较 |

## 问答
type: qa
from: phases/01-math-foundations/03-matrix-transformations/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md

- **为何做 LU 分解？** O(n^3) 成本只付一次。每个新 b 花费 O(n^2)。
- **Cholesky 何时适用？** A 对称正定。$\lambda > 0$ 时，$X^T X + \lambda I$ 为 SPD。
- **行列式说明什么？** 面积缩放比例。0 压扁一个维度，-1 翻转方向。
- **截断 SVD 为何是最佳秩 k 近似？** 由 Eckart-Young 定理可知，谱误差为 $\sigma_{k+1}$。
- **特征值如何反映稳定性？** 模大于 1 时爆炸，小于 1 时衰减。

## 提示
type: tips
from: phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md

- PCA 是对中心化数据做 SVD。主成分是右奇异向量 V。
- 每个主成分的解释方差为 sigma_i^2 / (n-1)。
- 寻找奇异值中的明显间隙，保留间隙以上的值以去噪。
- 岭回归将条件数改善为 $(\sigma_{\max} + \lambda) / (\sigma_{\min} + \lambda)$。
- 存在多解时，伪逆给出范数最小的解。
- 正交初始化用 QR 生成正交归一的权重列。
