---
id: unsupervised-anomaly
title: 聚类、降维与异常检测
code: CD
subtitle: 不依赖标签进行聚类、降维和离群标记。涵盖 K-Means、DBSCAN、GMM、PCA、Isolation Forest 与 LOF。
hue: 280
sources: phases/02-ml-fundamentals/07-unsupervised-learning, phases/02-ml-fundamentals/16-anomaly-detection, phases/01-math-foundations/10-dimensionality-reduction
source_hash: becd0dc08c36d3c2
---

## 三种无标签任务
type: architecture
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

```arch
node | raw | 1,2 | 原始数据 | 无标签
node | pca | 2,1 | PCA | 保留 90-95% 方差
node | clu | 3,1 | 聚类 | K-Means、DBSCAN、GMM
node | det | 2,3 | 检测器 | Isolation Forest、LOF
node | rec | 3,2 | 重建误差 | 高误差表示离群点
node | score | 3,3 | 异常分数 | 先排序，再设阈值
node | flag | 4,2 | 标记点 | 人工评审
edge | raw | pca |
edge | pca | clu | 降维后
edge | pca | rec |
edge | raw | det |
edge | det | score |
edge | rec | flag |
edge | score | flag |
```

## 从零实现的调用
type: task-table
from: phases/02-ml-fundamentals/07-unsupervised-learning/code/clustering.py, phases/01-math-foundations/10-dimensionality-reduction/code/dim_reduction.py, phases/02-ml-fundamentals/16-anomaly-detection/code/anomaly_detection.py

| 任务 | 代码 |
|---|---|
| K 个簇，硬标签 | `kmeans(data, k=3)` |
| 每个 K 的惯性与轮廓系数 | `find_best_k(data, max_k=6)` |
| 稠密区域，噪声为 -1 | `dbscan(data, eps=1.5, min_samples=5)` |
| 使用 EM 的软标签 | `gmm(data, k=3)` |
| 投影至 2 个轴 | `PCA(n_components=2).fit_transform(X)` |
| 分离环形分布 | `kernel_pca(X, n_components, kernel="rbf", gamma=1.0)` |
| 按标准差标记 | `zscore_detect(X, threshold=3.0)` |
| 标记围栏外的点 | `iqr_detect(X, factor=1.5)` |

## sklearn 中的对应实现
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

```python
km = KMeans(n_clusters=3, random_state=42).fit(data)
db = DBSCAN(eps=1.5, min_samples=5).fit(data)
gmm_model = GaussianMixture(n_components=3, random_state=42).fit(data)
sklearn_pca = SklearnPCA(n_components=2)          # explained_variance_ratio_
tsne = TSNE(n_components=2, perplexity=30, random_state=42)
reducer = UMAP(n_components=2, n_neighbors=15, min_dist=0.1, random_state=42)
iso = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
iso.fit(X_train)                                  # 用正常数据拟合
lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05, novelty=True)
oc_svm = OneClassSVM(kernel="rbf", gamma="auto", nu=0.05)
```

## 公式
type: concepts
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

- **惯性**：每个点到簇中心的距离平方和。越低越紧凑。
- **轮廓系数**：$(b - a) / \max(a, b)$，从 -1（分错簇）到 +1。
- **Z-score**：$(x - \text{mean}) / \text{std}$。绝对值超过阈值时标记。
- **IQR 围栏**：$Q1 - \text{factor} \cdot IQR$ 和 $Q3 + \text{factor} \cdot IQR$，其中 $IQR = Q3 - Q1$。
- **隔离分数**：$2^{-\text{average\_path\_length}(x) / c(n)}$。接近 1 为异常，接近 0.5 为正常。
- **c(n)**：`2 * H(n-1) - 2*(n-1)/n`，查找失败的期望路径长度。
- **解释方差比**：$\text{eigenvalue}_k / \sum \text{all eigenvalues}$
- **PCA 损失比例**：丢弃特征值之和除以全部特征值之和。

## 聚类方法选择
type: command-table
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md

| 命令 | 作用 |
|---|---|
| K-Means | 大数据、球形簇、已知 K。受离群值影响 |
| DBSCAN | 未知 K、任意形状、发现噪声。密度变化时失效 |
| 层次聚类 | 小数据，需要树状图。内存 $O(n^2)$ |
| GMM | 重叠的椭圆簇、软分配 |
| Ward 连接 | 合并使簇内方差增量最小的簇 |

## 降维与检测方法选择
type: command-table
from: phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md

| 命令 | 作用 |
|---|---|
| PCA | 预处理与压缩。快速，关注全局方差 |
| t-SNE | 局部邻域的二维图。少于 10k 样本 |
| UMAP | 大规模二维图。保留部分全局结构 |
| Kernel PCA | 非线性流形。核矩阵为 n 乘 n |
| Z-score / IQR | 每次一个特征，非常快 |
| Isolation Forest | 无分布假设，适用高维 |
| LOF | 局部异常、不同密度的簇。较慢 |
| One-Class SVM | 中小数据，核矩阵按平方增长 |

## 异常检测流水线
type: flow
from: phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md

1. **基线**：收集一段没有或很少异常的数据。
2. **特征**：添加滚动统计、时间特征与比率。
3. **训练**：在基线上拟合检测器，学习正常状态。
4. **评分**：为每个新观测计算异常分数。
5. **阈值**：按误报与漏报成本选择截点。
6. **告警**：将被标记点交给人工评审。
7. **反馈**：记录真实异常与误报，调优阈值。

## 默认值与数值
type: defaults
from: phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/code/anomaly_detection.py, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Z-score `threshold` | 3.0 | 包含 99.7% 的高斯数据 |
| IQR `factor` | 1.5 | 3.0 标记更少点 |
| `n_estimators` | 100 | 隔离树数量，通常足够 |
| `max_samples` | 256 | 每棵树的行数，来自原论文 |
| `predict` 阈值 | 0.5 | 高于此分数为异常 |
| `contamination` | 0.05 | 只设置截点，不改变分数 |
| t-SNE 困惑度 | 30 | 典型范围为 5-50 |
| 保留方差 | 0.95 | PCA 截点也可用 0.90 |

## 故障与修正
type: troubleshooting
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| K-Means 无法正确分割月牙形数据 | 簇不是球形 | 使用 eps=0.3 的 DBSCAN |
| K-Means 每次结果不同 | 惯性局部最小值 | 固定种子或用 K-Means++ |
| Z-score 漏掉点 | 多模态数据或训练含离群值 | 使用 IQR 或 Isolation Forest |
| 逐特征方法漏掉某点 | 仅在联合空间中异常 | 使用 Isolation Forest |
| 准确率 99.9%，没有捕获异常 | 异常占 0.1%，准确率无用 | 使用 Precision@k 与 AUPRC |
| 操作员忽略告警 | 误报过多 | 从高阈值开始 |
| 分数中位数上漂 | 数据变化或模型过时 | 用近期正常数据重训 |
| t-SNE 簇间距离不同 | 簇间距离没有含义 | 只解读簇本身 |

## 缩写
type: glossary
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

- **DBSCAN**：基于密度的聚类。包含核心点、边界点与噪声点。
- **GMM**：高斯混合模型。K 个高斯分布，使用软分配。
- **EM**：期望最大化。E 步求概率，M 步求参数。
- **PCA**：主成分分析。寻找最大方差轴。
- **t-SNE**：t 分布随机邻域嵌入。保留邻居关系。
- **UMAP**：统一流形近似与投影。更快，保留更多全局结构。
- **LOF**：局部离群因子。高于 1.0 表示密度低于邻居。
- **AUPRC**：精确率召回率曲线下面积。在此场景优于 AUROC。

## 问答
type: qa
from: phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

- **如何选择 K？** 寻找惯性肘部，检查轮廓系数。
- **为何建模正常数据？** 异常稀少且变化。偏离正常的样本也包括新类型。
- **最佳训练设置是什么？** 半监督：仅在干净的正常数据集上拟合。
- **只有少量已标注异常？** 用于评估，不用于训练。
- **Isolation Forest 为何快？** 每棵树只使用小子样本。
- **为何降维？** 高维空间中距离趋同，最近邻搜索失效。
