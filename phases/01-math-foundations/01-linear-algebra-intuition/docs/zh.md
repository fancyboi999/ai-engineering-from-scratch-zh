# 线性代数直觉

> 每一个 AI 模型，本质上都是戴着花哨帽子的矩阵运算。

**类型：** Learn
**语言：** Python、Julia
**前置要求：** 阶段 0
**预计时间：** ~60 分钟

## 学习目标

- 用 Python 从零实现向量和矩阵运算（加法、点积、矩阵乘法）
- 从几何角度讲清楚点积、投影和 Gram-Schmidt 过程到底在做什么
- 用行化简判断一组向量的线性无关性、秩和基
- 把线性代数概念和它们的 AI 应用对上号：embedding、注意力分数、LoRA

## 问题背景

随便翻开一篇 ML 论文。第一页之内，你就会看到向量、矩阵、点积和各种变换。没有线性代数的直觉，这些只是一堆符号。有了它，你就能看清神经网络到底在干什么——在空间里搬动那些点。

你不需要成为数学家。你需要的是看懂这些运算在几何上意味着什么，然后亲手把它们写出来。

## 核心概念

### 向量就是点（也是方向）

向量不过是一串数字。但这些数字是有意义的——它们是空间里的坐标。

**二维向量 [3, 2]：**

| x | y | 点 |
|---|---|-------|
| 3 | 2 | 这个向量从原点 (0,0) 指向平面上的 (3, 2) |

这个向量的模长是 sqrt(3^2 + 2^2) = sqrt(13)，方向朝右上方。

在 AI 里，向量代表一切：
- 一个词 → 一个 768 维的数字向量（它在 embedding 空间里的"含义"）
- 一张图 → 一个由数百万像素值构成的向量
- 一个用户 → 一个偏好向量

### 矩阵就是变换

矩阵把一个向量变成另一个向量。它可以旋转、缩放、拉伸或投影。

```mermaid
graph LR
    subgraph Before["变换前"]
        A["点 A"]
        B["点 B"]
    end
    subgraph Matrix["矩阵乘法"]
        M["M (变换)"]
    end
    subgraph After["变换后"]
        A2["点 A'"]
        B2["点 B'"]
    end
    A --> M
    B --> M
    M --> A2
    M --> B2
```

在 AI 里，矩阵就是模型本身：
- 神经网络权重 → 把输入变换成输出的矩阵
- 注意力分数 → 决定关注什么的矩阵
- embedding → 把词映射成向量的矩阵

### 点积衡量相似度

两个向量的点积告诉你它们有多相似。

```
a · b = a₁×b₁ + a₂×b₂ + ... + aₙ×bₙ

方向相同：    a · b > 0  （相似）
互相垂直：    a · b = 0  （无关）
方向相反：    a · b < 0  （不相似）
```

搜索引擎、推荐系统和 RAG 的工作原理就是这个——找出点积高的向量。

### 线性无关

如果一组向量里没有任何一个能被其他向量的组合表示出来，那它们就是线性无关的。如果 v1、v2、v3 互相无关，它们就张成一个三维空间。如果其中一个是其余向量的组合，那它们就只能张成一个平面。

它对 AI 为什么重要：你的特征矩阵应该有线性无关的列。如果两个特征完全相关（线性相关），模型就无法区分它们各自的作用。这会在回归里引发多重共线性——权重矩阵变得不稳定，输入的微小变化会让输出剧烈波动。

**具体例子：**

```
v1 = [1, 0, 0]
v2 = [0, 1, 0]
v3 = [2, 1, 0]   # v3 = 2*v1 + v2
```

v1 和 v2 线性无关——谁都不是另一个的标量倍数或组合。但 v3 = 2*v1 + v2，所以 {v1, v2, v3} 是一组线性相关的向量。这三个向量都躺在 xy 平面上。不管你怎么组合它们，都到不了 [0, 0, 1]。你有三个向量，却只有两个维度的自由度。

放到数据集里：如果 feature_3 = 2*feature_1 + feature_2，那加进 feature_3 给模型带来的信息量是零。更糟的是，它会让正规方程奇异——权重没有唯一解。

### 基与秩

基是一组最小的、能张成整个空间的线性无关向量。基向量的个数就是空间的维数。

三维空间的标准基是 {[1,0,0], [0,1,0], [0,0,1]}。但三维空间里任意三个无关向量都构成一组合法的基。选哪组基，就是选哪套坐标系。

矩阵的秩 = 线性无关的列数 = 线性无关的行数。如果秩 < min(行数, 列数)，矩阵就是秩亏的。这意味着：
- 方程组有无穷多解（或者无解）
- 变换过程中丢失了信息
- 矩阵不可逆

| 情形 | 秩 | 对 ML 意味着什么 |
|-----------|------|---------------------|
| 满秩（秩 = min(m, n)） | 可能的最大值 | 存在唯一的最小二乘解。模型条件良好。 |
| 秩亏（秩 < min(m, n)） | 低于最大值 | 特征冗余。权重有无穷多解。需要正则化。 |
| 秩为 1 | 1 | 每一列都是同一个向量的缩放副本。所有数据落在一条直线上。 |
| 接近秩亏（奇异值很小） | 数值上偏低 | 矩阵病态。微小的输入噪声会引起巨大的输出变化。用 SVD 截断或岭回归。 |

### 投影

把向量 **a** 投影到向量 **b** 上，得到的是 **a** 在 **b** 方向上的分量：

```
proj_b(a) = (a dot b / b dot b) * b
```

残差 (a - proj_b(a)) 与 b 垂直。这种正交分解是最小二乘拟合的根基。

投影在 ML 里无处不在：
- 线性回归最小化的是观测值到列空间的距离——它的解本身就是一次投影
- PCA 把数据投影到方差最大的方向上
- transformer 里的注意力计算的是 query 在 key 上的投影

```mermaid
graph LR
    subgraph Projection["a 在 b 上的投影"]
        direction TB
        O["原点"] --> |"b (方向)"| B["b"]
        O --> |"a (原始)"| A["a"]
        O --> |"proj_b(a)"| P["投影"]
        A -.-> |"残差 (垂直)"| P
    end
```

**例子：** a = [3, 4], b = [1, 0]

proj_b(a) = (3*1 + 4*0) / (1*1 + 0*0) * [1, 0] = 3 * [1, 0] = [3, 0]

投影把 y 分量丢掉了。这就是降维最简单的形式——把你不关心的方向扔掉。

### Gram-Schmidt 过程

把任意一组无关向量转换成一组标准正交基。标准正交的意思是：每个向量长度为 1，且任意两个互相垂直。

算法：
1. 取第一个向量，归一化
2. 取第二个向量，减去它在第一个向量上的投影，再归一化
3. 取第三个向量，减去它在前面所有向量上的投影，再归一化
4. 对剩下的向量重复

```
Input:  v1, v2, v3, ... (linearly independent)

u1 = v1 / |v1|

w2 = v2 - (v2 dot u1) * u1
u2 = w2 / |w2|

w3 = v3 - (v3 dot u1) * u1 - (v3 dot u2) * u2
u3 = w3 / |w3|

Output: u1, u2, u3, ... (orthonormal basis)
```

QR 分解内部就是这么干的。Q 是那组标准正交基，R 记录投影系数。QR 分解用在：
- 解线性方程组（比高斯消元更稳定）
- 计算特征值（QR 算法）
- 最小二乘回归（标准的数值方法）

```figure
eigen-directions
```

## 动手构建

### 第 1 步：从零写向量（Python）

```python
class Vector:
    def __init__(self, components):
        self.components = list(components)
        self.dim = len(self.components)

    def __add__(self, other):
        return Vector([a + b for a, b in zip(self.components, other.components)])

    def __sub__(self, other):
        return Vector([a - b for a, b in zip(self.components, other.components)])

    def dot(self, other):
        return sum(a * b for a, b in zip(self.components, other.components))

    def magnitude(self):
        return sum(x**2 for x in self.components) ** 0.5

    def normalize(self):
        mag = self.magnitude()
        return Vector([x / mag for x in self.components])

    def cosine_similarity(self, other):
        return self.dot(other) / (self.magnitude() * other.magnitude())

    def __repr__(self):
        return f"Vector({self.components})"


a = Vector([1, 2, 3])
b = Vector([4, 5, 6])

print(f"a + b = {a + b}")
print(f"a · b = {a.dot(b)}")
print(f"|a| = {a.magnitude():.4f}")
print(f"cosine similarity = {a.cosine_similarity(b):.4f}")
```

### 第 2 步：从零写矩阵（Python）

```python
class Matrix:
    def __init__(self, rows):
        self.rows = [list(row) for row in rows]
        self.shape = (len(self.rows), len(self.rows[0]))

    def __matmul__(self, other):
        if isinstance(other, Vector):
            return Vector([
                sum(self.rows[i][j] * other.components[j] for j in range(self.shape[1]))
                for i in range(self.shape[0])
            ])
        rows = []
        for i in range(self.shape[0]):
            row = []
            for j in range(other.shape[1]):
                row.append(sum(
                    self.rows[i][k] * other.rows[k][j]
                    for k in range(self.shape[1])
                ))
            rows.append(row)
        return Matrix(rows)

    def transpose(self):
        return Matrix([
            [self.rows[j][i] for j in range(self.shape[0])]
            for i in range(self.shape[1])
        ])

    def __repr__(self):
        return f"Matrix({self.rows})"


rotation_90 = Matrix([[0, -1], [1, 0]])
point = Vector([3, 1])

rotated = rotation_90 @ point
print(f"Original: {point}")
print(f"Rotated 90°: {rotated}")
```

### 第 3 步：这对 AI 为什么重要

```python
import random

random.seed(42)
weights = Matrix([[random.gauss(0, 0.1) for _ in range(3)] for _ in range(2)])
input_vector = Vector([1.0, 0.5, -0.3])

output = weights @ input_vector
print(f"Input (3D): {input_vector}")
print(f"Output (2D): {output}")
print("This is what a neural network layer does -- matrix multiplication.")
```

### 第 4 步：Julia 版本

```julia
a = [1.0, 2.0, 3.0]
b = [4.0, 5.0, 6.0]

println("a + b = ", a + b)
println("a · b = ", a ⋅ b)       # Julia 支持 unicode 运算符
println("|a| = ", √(a ⋅ a))
println("cosine = ", (a ⋅ b) / (√(a ⋅ a) * √(b ⋅ b)))

# 矩阵-向量乘法
W = [0.1 -0.2 0.3; 0.4 0.5 -0.1]
x = [1.0, 0.5, -0.3]
println("Wx = ", W * x)
println("This is a neural network layer.")
```

### 第 5 步：从零写线性无关判断和投影（Python）

```python
def is_linearly_independent(vectors):
    n = len(vectors)
    dim = len(vectors[0].components)
    mat = Matrix([v.components[:] for v in vectors])
    rows = [row[:] for row in mat.rows]
    rank = 0
    for col in range(dim):
        pivot = None
        for row in range(rank, len(rows)):
            if abs(rows[row][col]) > 1e-10:
                pivot = row
                break
        if pivot is None:
            continue
        rows[rank], rows[pivot] = rows[pivot], rows[rank]
        scale = rows[rank][col]
        rows[rank] = [x / scale for x in rows[rank]]
        for row in range(len(rows)):
            if row != rank and abs(rows[row][col]) > 1e-10:
                factor = rows[row][col]
                rows[row] = [rows[row][j] - factor * rows[rank][j] for j in range(dim)]
        rank += 1
    return rank == n


def project(a, b):
    scalar = a.dot(b) / b.dot(b)
    return Vector([scalar * x for x in b.components])


def gram_schmidt(vectors):
    orthonormal = []
    for v in vectors:
        w = v
        for u in orthonormal:
            proj = project(w, u)
            w = w - proj
        if w.magnitude() < 1e-10:
            continue
        orthonormal.append(w.normalize())
    return orthonormal


v1 = Vector([1, 0, 0])
v2 = Vector([1, 1, 0])
v3 = Vector([1, 1, 1])
basis = gram_schmidt([v1, v2, v3])
for i, u in enumerate(basis):
    print(f"u{i+1} = {u}")
    print(f"  |u{i+1}| = {u.magnitude():.6f}")

print(f"u1 · u2 = {basis[0].dot(basis[1]):.6f}")
print(f"u1 · u3 = {basis[0].dot(basis[2]):.6f}")
print(f"u2 · u3 = {basis[1].dot(basis[2]):.6f}")
```

## 实际使用

现在用 NumPy 做同样的事——这才是你实际工作中会用的：

```python
import numpy as np

a = np.array([1, 2, 3], dtype=float)
b = np.array([4, 5, 6], dtype=float)

print(f"a + b = {a + b}")
print(f"a · b = {np.dot(a, b)}")
print(f"|a| = {np.linalg.norm(a):.4f}")
print(f"cosine = {np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)):.4f}")

W = np.random.randn(2, 3) * 0.1
x = np.array([1.0, 0.5, -0.3])
print(f"Wx = {W @ x}")
```

### 用 NumPy 算秩、投影和 QR

```python
import numpy as np

A = np.array([[1, 2], [2, 4]])
print(f"Rank: {np.linalg.matrix_rank(A)}")

a = np.array([3, 4])
b = np.array([1, 0])
proj = (np.dot(a, b) / np.dot(b, b)) * b
print(f"Projection of {a} onto {b}: {proj}")

Q, R = np.linalg.qr(np.random.randn(3, 3))
print(f"Q is orthogonal: {np.allclose(Q @ Q.T, np.eye(3))}")
print(f"R is upper triangular: {np.allclose(R, np.triu(R))}")
```

### PyTorch——张量就是带自动微分的向量

```python
import torch

x = torch.randn(3, requires_grad=True)
y = torch.tensor([1.0, 0.0, 0.0])

similarity = torch.dot(x, y)
similarity.backward()

print(f"x = {x.data}")
print(f"y = {y.data}")
print(f"dot product = {similarity.item():.4f}")
print(f"d(dot)/dx = {x.grad}")
```

点积对 x 的梯度恰好就是 y。PyTorch 自动算出了这个结果。神经网络里的每一个操作都由这类运算搭起来——矩阵乘法、点积、投影——而自动微分会贯穿所有这些操作追踪梯度。

你刚刚从零实现了 NumPy 一行就能搞定的事。现在你知道引擎盖下发生了什么。

## 拿去用

本节课产出：
- `outputs/prompt-linear-algebra-tutor.md` —— 一个让 AI 助手通过几何直觉来教线性代数的提示词

## 关联

本节课的每个概念都对应现代 AI 的某个具体部分：

| 概念 | 它出现在哪 |
|---------|------------------|
| 点积 | transformer 里的注意力分数，RAG 里的余弦相似度 |
| 矩阵乘法 | 每一个神经网络层，每一次线性变换 |
| 线性无关 | 特征选择，避免多重共线性 |
| 秩 | 判断方程组是否可解，LoRA（低秩适配） |
| 投影 | 线性回归（投影到列空间），PCA |
| Gram-Schmidt / QR | 数值求解器，特征值计算 |
| 标准正交基 | 稳定的数值计算，白化变换 |

LoRA 值得特别一提。它通过把权重更新分解成低秩矩阵来微调大语言模型。与其更新一个 4096x4096 的权重矩阵（1600 万参数），LoRA 只更新两个矩阵，尺寸分别为 4096x16 和 16x4096（13.1 万参数）。秩 16 的约束意味着 LoRA 假设权重更新落在完整 4096 维空间的一个 16 维子空间里。这就是线性代数在干实事。

## 练习

1. 实现 `Vector.angle_between(other)`，返回两个向量之间的夹角（以度为单位）
2. 构造一个二维缩放矩阵，把 x 坐标翻倍、y 坐标变三倍，然后把它作用到向量 [1, 1] 上
3. 给定 5 个随机的类词向量（维度 50），用余弦相似度找出最相似的两个
4. 验证 Gram-Schmidt 的输出确实是标准正交的：检查每一对的点积是否为 0、每个向量的模长是否为 1
5. 构造一个秩为 2 的 3x3 矩阵。用 `rank()` 方法验证。然后说明它的列张成的是什么几何对象。
6. 把向量 [1, 2, 3] 投影到 [1, 1, 1] 上。结果在几何上代表什么？

## 关键术语

| 术语 | 人们常说 | 它实际指什么 |
|------|----------------|----------------------|
| 向量 | "一个箭头" | 一串数字，表示 n 维空间里的一个点或方向 |
| 矩阵 | "一张数字表" | 把向量从一个空间映射到另一个空间的变换 |
| 点积 | "相乘再求和" | 衡量两个向量对齐程度的指标——相似度检索的核心 |
| Embedding | "某种 AI 魔法" | 一个表示某事物（词、图像、用户）含义的向量 |
| 线性无关 | "它们不重叠" | 集合中没有任何一个向量能写成其他向量的组合 |
| 秩 | "有多少维度" | 矩阵中线性无关的列数（或行数） |
| 投影 | "影子" | 一个向量在另一个向量方向上的分量 |
| 基 | "坐标轴" | 一组最小的、能张成空间的无关向量 |
| 标准正交 | "互相垂直的单位向量" | 互相垂直、且每个长度都为 1 的向量 |
