---
id: ml-model-comparison
title: 经典模型对比
code: CC
subtitle: 对比线性与逻辑回归、树与森林、SVM、KNN 和朴素贝叶斯，并说明各自适用场景。
hue: 30
sources: phases/02-ml-fundamentals/02-linear-regression, phases/02-ml-fundamentals/03-logistic-regression, phases/02-ml-fundamentals/04-decision-trees, phases/02-ml-fundamentals/05-support-vector-machines, phases/02-ml-fundamentals/06-knn-and-distances, phases/02-ml-fundamentals/14-naive-bayes
source_hash: 619182d9492657cf
---

## 模型对比
type: comparison
span: 2
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

| 模型 | 训练方式 | 边界、预测成本与内存 |
|---|---|---|
| 线性回归 | 梯度下降 | 超平面。正规方程按特征数计算为 $O(n^3)$ |
| 逻辑回归 | 二元交叉熵 | 始终线性。边界为 p = 0.5 |
| 决策树 | Gini 不纯度 | 贪心划分形成矩形区域。方差高 |
| 随机森林 | Bagging | 多棵树多数投票或求平均 |
| SVM | 合页损失 | 最大间隔。只存储支持向量 |
| KNN | 惰性学习 | 无训练。每次查询 $O(n \cdot d)$，存储全部数据 |
| 朴素贝叶斯 | 统计频率 | 线性。预测为一次矩阵乘法 |

## 缩放与最适合的数据
type: comparison
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

| 模型 | 缩放特征 | 优势场景 |
|---|---|---|
| 线性回归 | 是 | 所有回归任务的基线 |
| 树与森林 | 否 | 表格数据、混合类型、少于 10k 行 |
| SVM | 是 | 小数据或高维稀疏数据 |
| KNN | 是 | 小数据，最多约 20-50 个特征 |
| 多项式 NB | 否 | 训练样本少的文本 |
| 高斯 NB | 否 | 接近钟形分布的连续特征 |

## 各模型的使用条件
type: tips
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

- 所有回归任务先用线性回归作基线。
- 需要概率和线性边界的是非判断任务使用逻辑回归。
- 扁平表格使用随机森林。几乎无需调超参数。
- 小数据或 TF-IDF 稀疏文本使用 SVM。
- 数据经常变化且希望训练耗时为零时，使用 KNN。
- 文本训练样本少于 10,000 时，使用 TF-IDF 加 MultinomialNB。
- 短文本使用 BernoulliNB。在 CountVectorizer 中设置 `binary=True`。

## 损失与公式
type: concepts
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

- **MSE**：$\frac{1}{n} \sum (\hat{y} - y)^2$。w 的梯度为 $\frac{2}{n} \sum (\hat{y} - y) x$。
- **R 平方**：$1 - SS_{\text{res}} / SS_{\text{tot}}$。1.0 为完美，0.0 等同于预测均值。
- **Sigmoid**：$\sigma(z) = 1 / (1 + e^{-z})$。$z = 0$ 时为 0.5。
- **二元交叉熵**：$-\frac{1}{n} \sum (y \log p + (1-y) \log(1-p))$。梯度为 $\frac{1}{n} \sum (p - y) x$。
- **Gini**：$1 - \sum_k p_k^2$。6 只猫与 4 只狗得到 0.48。
- **合页损失**：$\max(0, 1 - y f(x))$。超过间隔后为零。
- **RBF 核**：$\exp(-\gamma \lVert x - z \rVert^2)$。点接近时接近 1。
- **多项式 NB**：$(\text{count} + \alpha) / (\text{total} + \alpha \cdot V)$，在对数空间求和。

## 先缩放，再拟合
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

```python
clf = Pipeline([
    ("scaler", StandardScaler()),                       # SVM 与 KNN 需要缩放
    ("svm", SVC(kernel="rbf", C=1.0, gamma="scale")),   # 对偶形式，支持核
])
clf.fit(X_train, y_train)
clf.score(X_test, y_test)                               # 准确率
clf['svm'].n_support_                                   # 支持向量数
("svm", LinearSVC(C=1.0, max_iter=10000))               # 大数据，原始形式
("knn", KNeighborsClassifier(n_neighbors=5, metric="euclidean"))
mnb = MultinomialNB(alpha=1.0)                          # 计数，无需缩放
mnb.fit(X_train_counts, y_train)
```

## 构建随机森林
type: flow
from: phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/code/trees.py

1. **自助采样**：有放回地采样记录。约 63% 的记录会出现。
2. **袋外样本**：其余记录可用于验证该树。
3. **特征子集**：分类时每次划分只看 $\sqrt{n_{\text{features}}}$ 个特征。
4. **贪心划分**：选择信息增益最大的特征与阈值。
5. **停止**：纯节点或预剪枝限制终止分支。
6. **重复**：构建 `n_trees` 棵树，默认为 100。
7. **聚合**：分类用多数投票，回归取平均。

## 权衡偏差与方差的参数
type: command-table
from: phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md, phases/02-ml-fundamentals/02-linear-regression/docs/zh.md

| 命令 | 作用 |
|---|---|
| 较大 `C` | 窄间隔，误分类少。容易过拟合 |
| 较小 `C` | 宽间隔，违反间隔的点更多。容易欠拟合 |
| `K = 1` | 训练误差为零。方差高 |
| `K = N` | 预测多数类。偏差最大 |
| 最大深度 | 提前停止树生长。预剪枝 |
| NB `alpha` | alpha 越高，平滑越强 |
| Ridge $\lambda$ | 越高，权重越小 |
| SVR $\epsilon$ | 管道越宽，支持向量越少 |

## 课程代码默认值
type: defaults
from: phases/02-ml-fundamentals/04-decision-trees/code/trees.py, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/code/knn.py, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/code/svm.py, phases/02-ml-fundamentals/14-naive-bayes/code/naive_bayes.py, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 树 `max_depth` | None | 生长至每个叶子均为纯节点 |
| 树 `min_samples_split` | 2 | 预剪枝控制项 |
| 树 `criterion` | "gini" | Gini 与熵的划分几乎相同 |
| 森林 `n_trees` | 100 | scikit-learn 使用 `n_estimators=100` |
| 森林 `max_features` | "sqrt" | 回归使用 n_features/3 |
| KNN `k` | 5 | 从 sqrt(N) 附近开始。二分类用奇数 K |
| SVM `rbf_kernel` gamma | 0.5 | `polynomial_kernel` 次数为 3 |
| GaussianNB `var_smoothing` | 1e-9 | 防止方差为零导致除零 |

## 失败与修正
type: troubleshooting
from: phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 逻辑回归无法区分圆形数据 | 边界始终线性 | 加入多项式特征 |
| SVM 准确率差 | 未缩放特征扭曲了间隔 | 在 `Pipeline` 中使用 `StandardScaler` |
| `SVC` 太慢 | 对偶形式为 $O(n^2)$ 至 $O(n^3)$ | 使用原始形式的 `LinearSVC` |
| KNN 随特征增多退化 | 维度灾难 | 先用 PCA 或 UMAP |
| 数据一变，树就变 | 单棵树方差高 | 使用随机森林 |
| MDI 将噪声特征排得很高 | 偏向高基数特征 | 使用置换重要性 |
| NB 给出概率 0 | 某类别中未见过该词 | 拉普拉斯平滑，alpha 为 1 |
| MultinomialNB 拒绝特征 | 特征值为负 | 使用 GaussianNB 或平移数值 |

## 问答
type: qa
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

- **逻辑回归为何不用 MSE？** 加上 sigmoid 后 MSE 非凸，二元交叉熵为凸。
- **假设错误为何 NB 仍有效？** 分类需要正确排序，不要求概率正确。
- **森林为何胜过单棵树？** 平均低相关的树可降低方差，且不增加偏差。
- **为何只计算支持向量？** 间隔之外的点合页损失为零。
- **NB 还是逻辑回归？** 从 NB 开始。数据变大且 NB 效果停滞时切换。
- **正规方程还是梯度下降？** 小数据用正规方程，大数据用梯度下降。
- **NB 概率可信吗？** 不可信。使用 `CalibratedClassifierCV`，设置 `cv=5`。

## 从零实现的类
type: task-table
from: phases/02-ml-fundamentals/02-linear-regression/code/linear_regression.py, phases/02-ml-fundamentals/03-logistic-regression/code/logistic_regression.py, phases/02-ml-fundamentals/04-decision-trees/code/trees.py, phases/02-ml-fundamentals/05-support-vector-machines/code/svm.py, phases/02-ml-fundamentals/14-naive-bayes/code/naive_bayes.py

| 任务 | 代码 |
|---|---|
| 闭式线性解 | `LinearRegressionNormal()` |
| 节点不纯度 | `gini_impurity(labels)` |
| 核值 | `rbf_kernel(x, z, gamma=0.5)` |
| 批量合页损失 | `hinge_loss(X, y, w, b)` |
| 文本分类器 | `MultinomialNB(alpha=1.0)` |
