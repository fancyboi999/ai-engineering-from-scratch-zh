---
id: classical-ml
title: 经典机器学习
subtitle: 使用 scikit-learn 拟合、验证、调优并排查回归、分类与聚类模型。
hue: 120
sources: phases/02-ml-fundamentals/02-linear-regression, phases/02-ml-fundamentals/03-logistic-regression, phases/02-ml-fundamentals/04-decision-trees, phases/02-ml-fundamentals/05-support-vector-machines, phases/02-ml-fundamentals/06-knn-and-distances, phases/02-ml-fundamentals/07-unsupervised-learning, phases/02-ml-fundamentals/08-feature-engineering, phases/02-ml-fundamentals/09-model-evaluation, phases/02-ml-fundamentals/10-bias-variance, phases/02-ml-fundamentals/11-ensemble-methods, phases/02-ml-fundamentals/12-hyperparameter-tuning, phases/02-ml-fundamentals/13-ml-pipelines, phases/02-ml-fundamentals/14-naive-bayes, phases/02-ml-fundamentals/17-imbalanced-data, phases/02-ml-fundamentals/18-feature-selection
code: CM
source_hash: 1ca95d60238aa67e
---

## 拟合模型
type: task-table
col: 1
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md, phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md

| 任务 | 代码 |
|---|---|
| L2 正则化回归 | `Ridge(alpha=1.0)` |
| 正样本稀少时的分类器 | `LogisticRegression(class_weight="balanced")` |
| 随机森林 | `RandomForestClassifier(n_estimators=100, random_state=42)` |
| 核 SVM | `SVC(kernel="rbf", C=1.0, gamma="scale")` |
| 大数据线性 SVM | `LinearSVC(C=1.0, max_iter=10000)` |
| k 近邻 | `KNeighborsClassifier(n_neighbors=5, metric="euclidean")` |
| K-Means 聚类 | `KMeans(n_clusters=3, random_state=42).fit(data)` |
| 密度聚类与噪声 | `DBSCAN(eps=1.5, min_samples=5).fit(data)` |

## 指标
type: command-table
col: 2
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

| 指标 | 公式与用途 |
|---|---|
| 准确率 | $(TP + TN) / (TP + TN + FP + FN)$。类别不平衡时会误导 |
| 精确率 | $TP / (TP + FP)$。假阳性代价高时使用 |
| 召回率 | $TP / (TP + FN)$。假阴性代价高时使用 |
| F1 | $2 \cdot P \cdot R / (P + R)$。两者的调和平均 |
| AUC-ROC | 0.5 为随机，1.0 为完美。与阈值无关 |
| R 平方 | $1 - SS_{\text{res}} / SS_{\text{tot}}$。低于 0 表示不如均值预测 |

## 关键公式
type: concepts
col: 3
from: phases/02-ml-fundamentals/02-linear-regression/docs/zh.md, phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/10-bias-variance/docs/zh.md

- **MSE**: $\text{MSE} = \frac{1}{n} \sum (y_{\text{predicted}} - y_{\text{actual}})^2$
- **正规方程**：$w = (X^T X)^{-1} X^T y$。相对特征数的成本为 $O(n^3)$。
- **岭回归**：$\text{Cost} = \text{MSE} + \lambda \sum w_i^2$
- **对数损失**：$-\frac{1}{n} \sum \left( y \log(p) + (1-y) \log(1-p) \right)$，$p = \sigma(wx + b)$
- **基尼不纯度**：$\text{Gini}(S) = 1 - \sum_k p_k^2$。0 表示纯节点。
- **软间隔 SVM**：$\min \frac{1}{2} \lVert w \rVert^2 + C \sum_i \max(0, 1 - y_i (w^T x_i + b))$
- **RBF 核**：$K(x, z) = \exp(-\gamma \lVert x - z \rVert^2)$
- **误差分解**：$\text{Bias}^2 + \text{Variance} + \text{Irreducible Noise}$

## 无泄漏预处理
type: annotated-code
col: 2
lang: python
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/code/pipeline.py

```python
# 错误：缩放器看到了测试集行
X_scaled = scaler.fit_transform(X)
# 正确：在训练集拟合，在测试集复用
X_train_scaled = scaler.fit_transform(X_train)   # 学习均值与标准差
X_test_scaled = scaler.transform(X_test)         # 仅使用训练集统计量
# 更好：训练与服务共用一个 Pipeline 对象
pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)                       # 先 fit_transform，再 fit
predictions = pipe.predict(X_test)               # 先 transform，再 predict
scores = cross_val_score(full_pipe, df, y, cv=5, scoring="accuracy")  # 每折重新拟合
```

## 无泄漏验证
type: flow
col: 4
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md

1. **划分**：保留测试集，只在最后使用一次。
2. **分折**：将其余数据分为 $K$ 折，按类别比例分层。
3. **拟合缩放器**：在 $K-1$ 个训练折上调用 `fit_transform`。
4. **训练**：模型在缩放后的训练折上调用 `fit`。
5. **评分**：缩放器对验证折调用 `transform`，再由模型预测。
6. **求平均**：遍历各折，计算 $K$ 个分数的均值。
7. **报告**：在测试集上评估最终模型。

## 问答
type: qa
col: 4
from: phases/02-ml-fundamentals/03-logistic-regression/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/10-bias-variance/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md

- **逻辑回归为何不用 MSE？** 加上 sigmoid 后目标非凸，对数损失则是凸的。
- **SVM 前为何要缩放？** 间隔取决于 $\lVert w \rVert$。
- **L1 为何能选择特征？** 它将部分权重精确推到零。
- **更多数据能修复高偏差吗？** 不能，需要改变模型。
- **为何优先类别权重而非过采样？** 期望效果相同，且不重复数据行。

## 提示
type: tips
col: 1
from: phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/08-feature-engineering/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

- 先扫描学习率，其余参数保持默认值。
- 在对数尺度上搜索学习率与正则化参数。
- 将 n_estimators 设高，让早停决定何时结束。
- 使用嵌套交叉验证做最终估计。
- 填补缺失值前添加 was_this_missing 列。
- 在验证集上选择阈值，不要用测试集。

## ColumnTransformer 流水线
type: architecture
col: 1
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/code/pipeline.py

```arch
node | raw | 1,1 | DataFrame | 数值与类别特征
node | num | 1,2 | 数值列 | age, income, score
node | cat | 2,2 | 类别列 | city, plan
node | nimp | 1,3 | SimpleImputer | median，再 StandardScaler
node | cimp | 2,3 | SimpleImputer | most_frequent，再 OneHotEncoder
node | ct | 1,4 | ColumnTransformer | 合并两路输出
node | model | 2,4 | 模型 | GradientBoostingClassifier, predict
edge | raw | num | 选择
edge | raw | cat | 选择
edge | num | nimp |
edge | cat | cimp |
edge | nimp | ct |
edge | cimp | ct |
edge | ct | model |
```

## 超参数调优
type: annotated-code
col: 1
lang: python
from: phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md

```python
param_dist = {
    "learning_rate": loguniform(1e-4, 0.5),      # 学习率用对数尺度
    "max_depth": randint(2, 10),                 # 整数范围
    "n_estimators": randint(50, 500),
}
search = RandomizedSearchCV(
    GradientBoostingRegressor(), param_dist,
    n_iter=100, cv=5,                            # 100 次采样，每次 5 折
    scoring="neg_mean_squared_error",            # 取负值，越高越好
    random_state=42, n_jobs=-1,                  # 使用全部 CPU 核心
)
search.fit(X_train, y_train)
print(search.best_params_, -search.best_score_)  # 取负还原 MSE
```

## 故障排查
type: troubleshooting
col: 3
from: phases/02-ml-fundamentals/10-bias-variance/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/05-support-vector-machines/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 训练与测试误差都高 | 高偏差 | 更多特征、更复杂模型、减少正则化 |
| 训练误差低、测试误差高 | 高方差 | 更多数据、正则化、更简单模型 |
| 测试误差上升、训练误差下降 | 正在过拟合 | 早停 |
| CV 分数高于生产效果 | 缩放器在全量数据上拟合 | Pipeline 配合 cross_val_score |
| 新类别导致崩溃 | 编码器未见过该值 | `OneHotEncoder(handle_unknown="ignore")` |
| 准确率 99% 却找不到正样本 | 类别不平衡 | 类别权重与阈值调优 |
| SVM 或 KNN 分数低 | 特征未缩放 | 先使用 `StandardScaler()` |
| 最佳值位于搜索边界 | 范围过窄 | 扩大搜索空间 |

## 起始值
type: defaults
col: 3
from: phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md, phases/02-ml-fundamentals/04-decision-trees/docs/zh.md, phases/02-ml-fundamentals/14-naive-bayes/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 决策阈值 | 0.5 | 正样本稀少时降低 |
| CV 折数 K | 5 | 10 也很常用 |
| 森林每次分裂的特征数 | sqrt(n_features) | 回归使用 n_features / 3 |
| 森林中的树数 | 100 | 课程代码中的 n_estimators |
| Boosting learning_rate | 0.1 | 常见范围为 0.01 至 0.3 |
| Boosting max_depth | 3 | 课程的 GradientBoosting 类 |
| 朴素贝叶斯 alpha | 1.0 | 拉普拉斯平滑 |
| 袋外样本比例 | 36.8% | 免费的验证集 |

## 缩略语
type: glossary
col: 3
span: 2
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/07-unsupervised-learning/docs/zh.md, phases/02-ml-fundamentals/18-feature-selection/docs/zh.md

- **AUC-ROC**：受试者工作特征曲线下面积。
- **SMOTE**：通过 k-NN 插值合成少数类样本。
- **GMM**：高斯混合模型，通过期望最大化进行软聚类。
- **RFE**：递归特征消除，反复训练、排序和裁剪。
