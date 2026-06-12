# 范数与距离

> 你的距离函数定义了"相似"是什么意思。选错了，下游一切都崩。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1，第 01 课（线性代数直觉）、02 课（向量、矩阵与运算）
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 L1、L2、余弦、马氏、Jaccard 和编辑距离函数
- 为给定的 ML 任务选对距离度量，并解释为什么别的会失败
- 把 L1 和 L2 范数与 LASSO 和 Ridge 正则化及其几何约束区域联系起来
- 演示同一个数据集在不同度量下产生不同的最近邻

## 问题背景

你有两个向量。可能是词嵌入。可能是用户画像。可能是像素数组。你需要知道：它们有多近？

答案完全取决于你选哪个距离函数。两个数据点在一种度量下可能是最近邻，在另一种下却相隔甚远。你的 KNN 分类器、推荐引擎、向量数据库、聚类算法、损失函数——它们全都依赖这个选择。选错了，你的模型就在为错的东西做优化。

不存在普适的最佳距离。L2 适合空间数据。余弦相似度统治 NLP。Jaccard 处理集合。编辑距离处理字符串。马氏距离考虑相关性。Wasserstein 搬运概率质量。每一个都编码了对"相似"含义的不同假设。

本节课从零构建每个主要的距离函数，告诉你每个何时是对的工具，并演示同一份数据如何因你用哪个度量而产生完全不同的最近邻。

## 核心概念

### 范数：度量向量的大小

范数度量一个向量的"大小"。两个向量之间的每个距离函数都能写成它们差的范数：d(a, b) = ||a - b||。所以理解范数就是理解距离。

### L1 范数（曼哈顿距离）

L1 范数把所有分量的绝对值加起来。

```
||x||_1 = |x_1| + |x_2| + ... + |x_n|
```

它叫曼哈顿距离，因为它度量你在一个只能沿轴移动、不能走对角线的城市网格上要走多远。

```
Point A = (1, 1)
Point B = (4, 5)

L1 distance = |4-1| + |5-1| = 3 + 4 = 7

On a grid, you walk 3 blocks east and 4 blocks north.
```

何时用 L1：
- 高维稀疏数据（文本特征、one-hot 编码）
- 当你想对离群点鲁棒时（单个巨大差异不会主导）
- 特征选择问题（L1 正则化促进稀疏性）

与 L1 正则化（Lasso）的联系：把 ||w||_1 加到损失函数里，惩罚权重绝对值之和。这把小权重推到恰好为零，实现自动特征选择。L1 惩罚在权重空间里造出菱形约束区域，而菱形的角落落在某些权重为零的轴上。

与损失函数的联系：平均绝对误差（MAE）是预测和目标之间的平均 L1 距离。它线性地惩罚所有误差，相比 MSE 对离群点更鲁棒。

### L2 范数（欧氏距离）

L2 范数是直线距离。各分量平方和的平方根。

```
||x||_2 = sqrt(x_1^2 + x_2^2 + ... + x_n^2)
```

这是你在几何课上学的距离。n 维里的勾股定理。

```
Point A = (1, 1)
Point B = (4, 5)

L2 distance = sqrt((4-1)^2 + (5-1)^2) = sqrt(9 + 16) = sqrt(25) = 5.0

The straight line, cutting diagonally through the grid.
```

何时用 L2：
- 低到中维的连续数据
- 当特征尺度可比时
- 物理距离（空间数据、传感器读数）
- 像素级的图像相似度

与 L2 正则化（Ridge）的联系：把 ||w||_2^2 加到损失函数里，惩罚大权重。和 L1 不同，它不把权重推到零。它按比例把所有权重往零收缩。L2 惩罚造出圆形约束区域，轴上没有角落。权重变小，但很少恰好为零。

与损失函数的联系：均方误差（MSE）是 L2 距离平方的平均。平方对大误差的惩罚比小误差重得多。

```
MAE (L1 loss):  |y - y_hat|         Linear penalty. Robust to outliers.
MSE (L2 loss):  (y - y_hat)^2       Quadratic penalty. Sensitive to outliers.
```

### Lp 范数：通用族

L1 和 L2 是 Lp 范数的特例：

```
||x||_p = (|x_1|^p + |x_2|^p + ... + |x_n|^p)^(1/p)
```

不同的 p 值产生不同形状的"单位球"（离原点距离为 1 的所有点的集合）：

```
p=1:    Diamond shape      (corners on axes)
p=2:    Circle/sphere      (the usual round ball)
p=3:    Superellipse       (rounded square)
p=inf:  Square/hypercube   (flat sides along axes)
```

### L 无穷范数（切比雪夫距离）

当 p 趋于无穷时，Lp 范数收敛到绝对值最大的分量。

```
||x||_inf = max(|x_1|, |x_2|, ..., |x_n|)
```

两点之间的距离由它们差异最大的那一个维度决定。其他所有维度被忽略。

```
Point A = (1, 1)
Point B = (4, 5)

L-inf distance = max(|4-1|, |5-1|) = max(3, 4) = 4
```

何时用 L 无穷：
- 当任意单一维度上最坏情况的偏差要紧时
- 棋盘（国际象棋里王走 L 无穷：任意方向走一步代价为 1）
- 制造公差（每个尺寸都必须在规格内）

### 余弦相似度与余弦距离

余弦相似度度量两个向量之间的夹角，忽略它们的大小。

```
cos_sim(a, b) = (a . b) / (||a||_2 * ||b||_2)
```

它的范围从 -1（方向相反）到 +1（方向相同）。垂直向量的余弦相似度为 0。

余弦距离把它转成距离：cosine_distance = 1 - cosine_similarity。范围从 0（方向相同）到 2（方向相反）。

```
a = (1, 0)    b = (1, 1)

cos_sim = (1*1 + 0*1) / (1 * sqrt(2)) = 1/sqrt(2) = 0.707
cos_dist = 1 - 0.707 = 0.293
```

为什么余弦统治 NLP 和 embedding：在文本里，文档长度不应影响相似度。一篇关于猫、比另一篇关于猫长一倍的文档仍应是"相似"的。余弦相似度忽略大小（长度），只关心方向。两篇词分布相同但长度不同的文档指向同一方向，得到余弦相似度 1.0。

何时用余弦相似度：
- 文本相似度（TF-IDF 向量、词嵌入、句子嵌入）
- 任何大小是噪声、方向是信号的领域
- 推荐系统（用户偏好向量）
- 嵌入检索（向量数据库几乎总是用余弦或点积）

### 点积相似度 vs 余弦相似度

两个向量的点积是：

```
a . b = a_1*b_1 + a_2*b_2 + ... + a_n*b_n
      = ||a|| * ||b|| * cos(angle)
```

余弦相似度是点积除以两个大小后的结果。当两个向量都已单位归一化（大小 = 1）时，点积和余弦相似度完全相同。

```
If ||a|| = 1 and ||b|| = 1:
    a . b = cos(angle between a and b)
```

它们何时不同：点积包含大小信息。大小更大的向量得到更高的点积分数。这在某些检索系统里要紧，那里你想让"热门"项排得更高。大小充当了隐含的质量或重要性信号。

```
a = (3, 0)    b = (1, 0)    c = (0, 1)

dot(a, b) = 3     dot(a, c) = 0
cos(a, b) = 1.0   cos(a, c) = 0.0

Both agree on direction, but dot product also reflects magnitude.
```

实践中：
- 想要纯方向相似度时用余弦相似度
- 大小携带有意义信息时用点积
- 许多向量数据库（Pinecone、Weaviate、Qdrant）让你在它们之间选
- 如果你的嵌入是 L2 归一化的，选哪个都无所谓

### 马氏距离

欧氏距离平等对待所有维度。但如果你的特征相关或尺度不同，L2 就给出误导性结果。

马氏距离考虑数据的协方差结构。

```
d_M(x, y) = sqrt((x - y)^T * S^(-1) * (x - y))
```

其中 S 是数据的协方差矩阵。

直觉上：马氏距离先把数据去相关并归一化（白化），然后在那个变换后的空间里算 L2 距离。如果 S 是单位矩阵（不相关、单位方差的特征），马氏距离就退化为欧氏距离。

```
Example: height and weight are correlated.
Someone 6'2" and 180 lbs is not unusual.
Someone 5'0" and 180 lbs is unusual.

Euclidean distance might say they are equally far from the mean.
Mahalanobis distance correctly identifies the second as an outlier
because it accounts for the height-weight correlation.
```

何时用马氏距离：
- 异常检测（离均值马氏距离大的点是离群点）
- 特征尺度和相关性不同时的分类
- 当你有足够数据估计一个可靠的协方差矩阵时
- 制造业的质量控制（多变量过程监控）

### Jaccard 相似度（用于集合）

Jaccard 相似度度量两个集合之间的重叠。

```
J(A, B) = |A intersect B| / |A union B|
```

它的范围从 0（无重叠）到 1（完全相同）。Jaccard 距离 = 1 - Jaccard 相似度。

```
A = {cat, dog, fish}
B = {cat, bird, fish, snake}

Intersection = {cat, fish}         size = 2
Union = {cat, dog, fish, bird, snake}  size = 5

Jaccard similarity = 2/5 = 0.4
Jaccard distance = 0.6
```

何时用 Jaccard：
- 比较标签、类别或特征的集合
- 基于词出现（而非频率）的文档相似度
- 近重复检测（用 MinHash 近似 Jaccard）
- 比较二值特征向量（存在/不存在数据）
- 评估分割模型（交并比 = Jaccard）

### 编辑距离（Levenshtein 距离）

编辑距离计算把一个字符串变成另一个所需的最少单字符操作数。操作是：插入、删除或替换。

```
"kitten" -> "sitting"

kitten -> sitten  (substitute k -> s)
sitten -> sittin  (substitute e -> i)
sittin -> sitting (insert g)

Edit distance = 3
```

用动态规划计算。填一个矩阵，第 (i, j) 项是字符串 A 前 i 个字符和字符串 B 前 j 个字符之间的编辑距离。

```
        ""  s  i  t  t  i  n  g
    ""   0  1  2  3  4  5  6  7
    k    1  1  2  3  4  5  6  7
    i    2  2  1  2  3  4  5  6
    t    3  3  2  1  2  3  4  5
    t    4  4  3  2  1  2  3  4
    e    5  5  4  3  2  2  3  4
    n    6  6  5  4  3  3  2  3
```

何时用编辑距离：
- 拼写检查和纠正
- DNA 序列比对（带加权操作）
- 模糊字符串匹配
- 混乱文本数据的去重

### KL 散度（不是距离，却被当成距离用）

KL 散度度量一个概率分布和另一个有多不同。第 09 课讲过，但它属于这个讨论，因为人们尽管它不是距离却把它当"距离"用。

```
D_KL(P || Q) = sum(p(x) * log(p(x) / q(x)))
```

关键性质：KL 散度不对称。

```
D_KL(P || Q) != D_KL(Q || P)
```

这意味着它不满足距离度量的基本要求。它也不满足三角不等式。它是一个散度，不是距离。

前向 KL（D_KL(P || Q)）是"寻均值"的：Q 试图覆盖 P 的所有模态。
反向 KL（D_KL(Q || P)）是"寻模态"的：Q 聚焦于 P 的单个模态。

当你见到 KL 散度时：
- VAE（ELBO 里的 KL 项把隐分布推向先验）
- 知识蒸馏（学生试图匹配老师的分布）
- RLHF（KL 惩罚让微调后的模型靠近基础模型）
- 策略梯度方法（约束策略更新）

### Wasserstein 距离（推土机距离）

Wasserstein 距离度量把一个概率分布变成另一个所需的最小"功"。把它想成：如果一个分布是一堆土、另一个是一个坑，你得搬多少土、搬多远？

```
W(P, Q) = inf over all transport plans gamma of E[d(x, y)]
```

对一维分布，它简化为累积分布函数之差绝对值的积分：

```
W_1(P, Q) = integral |CDF_P(x) - CDF_Q(x)| dx
```

为什么 Wasserstein 重要：
- 它是真正的度量（对称、满足三角不等式）
- 即使分布不重叠它也提供梯度（KL 散度会趋于无穷）
- 这个性质让它成为 Wasserstein GAN（WGAN）的核心，后者解决了原始 GAN 的训练不稳定

```
Distributions with no overlap:

P: [1, 0, 0, 0, 0]    Q: [0, 0, 0, 0, 1]

KL divergence: infinity (log of zero)
Wasserstein: 4 (move all mass 4 bins)

Wasserstein gives a meaningful gradient. KL does not.
```

何时用 Wasserstein：
- GAN 训练（WGAN、WGAN-GP）
- 比较可能不重叠的分布
- 最优传输问题
- 图像检索（比较颜色直方图）

### 为什么不同任务需要不同距离

| 任务 | 最佳距离 | 为什么 |
|------|--------------|-----|
| 文本相似度 | 余弦 | 大小是噪声，方向是含义 |
| 图像像素比较 | L2 | 空间关系要紧，特征尺度可比 |
| 稀疏高维特征 | L1 | 鲁棒，不放大罕见的大差异 |
| 集合重叠（标签、类别） | Jaccard | 数据天然是集合值，不是向量 |
| 字符串匹配 | 编辑距离 | 操作对应人类编辑的直觉 |
| 异常检测 | 马氏 | 考虑特征相关性和尺度 |
| 比较分布 | KL 散度 | 度量用 Q 而非 P 损失的信息 |
| GAN 训练 | Wasserstein | 即使分布不重叠也提供梯度 |
| 嵌入（向量数据库） | 余弦或点积 | 嵌入被训练成在方向里编码含义 |
| 推荐 | 点积 | 大小可编码热门度或置信度 |
| DNA 序列 | 加权编辑距离 | 替换代价随核苷酸对而变 |
| 制造业质控 | L 无穷 | 任意维度上最坏情况的偏差要紧 |

### 与损失函数的联系

损失函数就是作用在预测 vs 目标上的距离函数。

```
Loss function       Distance it uses       Behavior
MSE                 L2 squared             Penalizes large errors heavily
MAE                 L1                     Penalizes all errors equally
Huber loss          L1 for large errors,   Best of both: robust to outliers,
                    L2 for small errors    smooth gradient near zero
Cross-entropy       KL divergence          Measures distribution mismatch
Hinge loss          max(0, margin - d)     Only penalizes below margin
Triplet loss        L2 (typically)         Pulls positives close, pushes
                                           negatives away
Contrastive loss    L2                     Similar pairs close, dissimilar
                                           pairs beyond margin
```

### 与正则化的联系

正则化给损失函数加上一个权重的范数惩罚。

```
L1 regularization (Lasso):   loss + lambda * ||w||_1
  -> Sparse weights. Some weights become exactly zero.
  -> Automatic feature selection.
  -> Solution has corners (non-differentiable at zero).

L2 regularization (Ridge):   loss + lambda * ||w||_2^2
  -> Small weights. All weights shrink toward zero.
  -> No feature selection (nothing goes to exactly zero).
  -> Smooth solution everywhere.

Elastic Net:                  loss + lambda_1 * ||w||_1 + lambda_2 * ||w||_2^2
  -> Combines sparsity of L1 with stability of L2.
  -> Groups of correlated features are kept or dropped together.
```

为什么 L1 产生稀疏而 L2 不：想象二维权重空间里的约束区域。L1 是菱形，L2 是圆。损失函数的等高线（椭圆）最可能在菱形的某个角触到它，那里有一个权重为零。它们在圆上触到一个光滑点，那里两个权重都非零。

### 最近邻搜索

每个距离函数都蕴含一个最近邻搜索问题：给定一个查询点，在数据集里找最近的点。

精确最近邻搜索在 n 个点、d 维的数据集里每次查询是 O(n * d)。对大数据集，这太慢。

近似最近邻（ANN）算法用一点点精度换取巨大的速度提升：

```
Algorithm         Approach                      Used by
KD-trees          Axis-aligned space partition   scikit-learn (low-dim)
Ball trees        Nested hyperspheres            scikit-learn (medium-dim)
LSH               Random hash projections        Near-duplicate detection
HNSW              Hierarchical navigable         FAISS, Qdrant, Weaviate
                  small-world graph
IVF               Inverted file index with       FAISS (billion-scale)
                  cluster-based search
Product quant.    Compress vectors, search       FAISS (memory-constrained)
                  in compressed space
```

HNSW（分层可导航小世界）是现代向量数据库里占主导的算法。它构建一个多层图，每个节点连到它的近似最近邻。搜索从顶层（稀疏、长跳）开始，下降到底层（密集、短跳）。

```figure
norm-unit-balls
```

## 动手构建

### 第 1 步：所有范数和距离函数

完整实现见 `code/distances.py`。每个函数都只用基础 Python 数学从零构建。

### 第 2 步：同样的数据，不同的距离，不同的邻居

`distances.py` 里的演示创建一个数据集，挑一个查询点，展示最近邻如何因距离度量而变。在 L1 下"最近"的点，在 L2 或余弦下可能不是最近。

### 第 3 步：嵌入相似度检索

代码包含一个模拟的嵌入相似度检索，用余弦相似度 vs L2 距离找出与查询最相似的"文档"，展示排名可能不同。

## 实际使用

最常见的实际用途：在向量数据库里找相似项。

```python
import numpy as np

def cosine_similarity_matrix(X):
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    X_normalized = X / norms
    return X_normalized @ X_normalized.T

embeddings = np.random.randn(1000, 768)

sim_matrix = cosine_similarity_matrix(embeddings)

query_idx = 0
similarities = sim_matrix[query_idx]
top_k = np.argsort(similarities)[::-1][1:6]
print(f"Top 5 most similar to item 0: {top_k}")
print(f"Similarities: {similarities[top_k]}")
```

当你调用 `model.encode(text)` 然后搜索一个向量数据库时，引擎盖下发生的就是这个。嵌入模型把文本映射成向量。向量数据库计算你的查询向量和每个存储向量之间的余弦相似度（或点积），用 ANN 算法来避免检查全部。

## 练习

1. 计算 (1, 2, 3) 和 (4, 0, 6) 之间的 L1、L2 和 L 无穷距离。验证对任意一对点 L-inf <= L2 <= L1 恒成立。证明为什么这个顺序有保证。

2. 构造两个向量，使余弦相似度高（> 0.9）但 L2 距离大（> 10）。从几何上解释发生了什么。然后构造两个向量，使余弦相似度低（< 0.3）但 L2 距离小（< 0.5）。

3. 实现一个函数，接收一个数据集和一个查询点，返回 L1、L2、余弦和马氏距离下的最近邻。找一个四者对哪个点最近意见不一的数据集。

4. 用 CDF 方法手算 [0.5, 0.5, 0, 0] 和 [0, 0, 0.5, 0.5] 之间的 Wasserstein 距离。然后算 [0.25, 0.25, 0.25, 0.25] 和 [0, 0, 0.5, 0.5] 之间的。哪个更大，为什么？

5. 实现 MinHash 做近似 Jaccard 相似度。生成 100 个随机集合，计算所有对的精确 Jaccard，并用 50、100 和 200 个哈希函数和 MinHash 近似对比。画出近似误差。

## 关键术语

| 术语 | 人们常说 | 它实际指什么 |
|------|----------------|----------------------|
| 范数 | "向量的大小" | 把向量映射到非负标量的函数，满足三角不等式、绝对齐次性，且仅对零向量为零 |
| L1 范数 | "曼哈顿距离" | 分量绝对值之和。在优化中产生稀疏性。对离群点鲁棒 |
| L2 范数 | "欧氏距离" | 分量平方和的平方根。欧氏空间里的直线距离 |
| Lp 范数 | "广义范数" | 分量绝对值的 p 次方之和的 p 次根。L1 和 L2 是特例 |
| L 无穷范数 | "最大范数"或"切比雪夫距离" | 绝对值最大的分量。p 趋于无穷时 Lp 的极限 |
| 余弦相似度 | "向量间夹角" | 点积除以两个大小。范围 -1 到 +1。忽略向量长度 |
| 余弦距离 | "1 减余弦相似度" | 把余弦相似度转成距离。范围 0 到 2 |
| 点积 | "未归一化的余弦" | 逐分量乘积之和。等于余弦相似度乘以两个大小 |
| 马氏距离 | "相关性感知的距离" | 在用数据协方差矩阵白化（去相关并归一化）后的空间里算 L2 距离 |
| Jaccard 相似度 | "集合重叠" | 交集大小除以并集大小。用于集合，不是向量 |
| 编辑距离 | "Levenshtein 距离" | 把一个字符串变成另一个的最少插入、删除和替换数 |
| KL 散度 | "分布间距离" | 不是真正的距离（不对称）。度量用 Q 编码 P 多花的比特 |
| Wasserstein 距离 | "推土机距离" | 把质量从一个分布运到另一个的最小功。一个真正的度量 |
| 近似最近邻 | "ANN 搜索" | 比精确搜索快得多地找近似最近点的算法（HNSW、LSH、IVF） |
| HNSW | "那个向量数据库算法" | 分层可导航小世界图。用于快速近似最近邻搜索的多层图 |
| L1 正则化 | "Lasso" | 把权重的 L1 范数加到损失里。把权重逼到零（稀疏性） |
| L2 正则化 | "Ridge"或"权重衰减" | 把权重的 L2 范数平方加到损失里。把权重往零收缩但不产生稀疏 |
| Elastic Net | "L1 + L2" | 结合 L1 和 L2 正则化。比单用任一个更好地处理相关特征组 |

## 延伸阅读

- [FAISS: A Library for Efficient Similarity Search](https://github.com/facebookresearch/faiss) - Meta 的十亿级 ANN 搜索库
- [Wasserstein GAN (Arjovsky et al., 2017)](https://arxiv.org/abs/1701.07875) - 把推土机距离引入 GAN 的论文
- [Locality-Sensitive Hashing (Indyk & Motwani, 1998)](https://dl.acm.org/doi/10.1145/276698.276876) - 奠基性的 ANN 算法
- [Efficient Estimation of Word Representations (Mikolov et al., 2013)](https://arxiv.org/abs/1301.3781) - Word2Vec，余弦相似度成为嵌入默认选择之处
- [sklearn.neighbors documentation](https://scikit-learn.org/stable/modules/neighbors.html) - scikit-learn 里距离度量和邻居算法的实用指南
