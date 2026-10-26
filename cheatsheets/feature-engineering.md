---
id: feature-engineering
title: 特征工程与流水线
code: FE
subtitle: 在不泄漏数据的同一条流水线内完成填补、缩放、编码、选择和集成。包含课程 Python 实现。
hue: 30
sources: phases/02-ml-fundamentals/08-feature-engineering, phases/02-ml-fundamentals/11-ensemble-methods, phases/02-ml-fundamentals/13-ml-pipelines, phases/02-ml-fundamentals/18-feature-selection
source_hash: a187fd1eb18ce92c
---

## 混合列共用一条流水线
type: architecture
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md

```arch
node | raw | 1,1 | 训练数据 | 仅 X_train
node | num | 2,1 | numeric_pipe | 中位数填补、缩放
node | cat | 2,2 | categorical_pipe | most_frequent、独热编码
node | pre | 3,1 | ColumnTransformer | 预处理步骤
node | model | 4,1 | 模型 | GradientBoostingClassifier
node | pred | 4,2 | 预测 | 先 transform，再 predict
edge | raw | num | 数值列
edge | raw | cat | 分类列
edge | num | pre |
edge | cat | pre |
edge | pre | model | fit
edge | model | pred |
```

## 使用 sklearn 构建
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md

```python
numeric_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="median")),
    ("scale", StandardScaler()),
])
categorical_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="most_frequent")),
    ("encode", OneHotEncoder(handle_unknown="ignore")),  # 未见过的城市编码为全零
])
preprocessor = ColumnTransformer([
    ("num", numeric_pipe, ["age", "income", "score"]),
    ("cat", categorical_pipe, ["city", "gender", "plan"]),
])
full_pipeline = Pipeline([("preprocess", preprocessor),
                          ("model", GradientBoostingClassifier())])
```

## fit 与 predict 的行为
type: flow
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/code/pipeline.py

1. **先划分**：任何拟合之前执行 `X_train, X_test = X[:800], X[800:]`。
2. **pipe.fit**：每个转换器在 X_train 上调用 `fit_transform`。
3. **pipe.fit**：最后一步在转换后的 X_train 上调用 `fit`。
4. **pipe.predict**：每个转换器调用 `transform`，而非 `fit_transform`。
5. **pipe.predict**：模型在转换后的 X_test 上调用 `predict`。
6. **交叉验证**：每一折只在自己的训练划分上拟合预处理器。

## 转换与编码任务
type: task-table
from: phases/02-ml-fundamentals/08-feature-engineering/code/features.py

| 任务 | 代码 |
|---|---|
| 缩放至 [0, 1] | `min_max_scale(values)` |
| 均值 0、标准差 1 | `standardize(values)` |
| 压缩右偏分布 | `log_transform(values)` 使用 log(v + 1) |
| 等宽分箱 | `bin_values(values, n_bins=5)` |
| 平方与两两组合 | `polynomial_features(row, degree=2)` |
| 平滑目标均值 | `target_encode(feature_values, target_values, smoothing=10)` |
| 先标记缺失 | `add_missing_indicator(values)` |
| 文本权重 | `tfidf(documents)` 返回向量和词表 |

## 特征选择任务
type: task-table
from: phases/02-ml-fundamentals/18-feature-selection/code/feature_selection.py, phases/02-ml-fundamentals/18-feature-selection/docs/zh.md

| 任务 | 代码 |
|---|---|
| 删除近似常量列 | `variance_threshold(X, threshold=0.01)` |
| 按互信息排序 | `mutual_information(X, y, n_bins=10)` |
| 按权重裁剪 | `rfe(X, y, n_features_to_select=5)` |
| 使用 L1 将权重归零 | `l1_feature_selection(X, y, alpha=0.1)` |
| 分裂增益重要性 | `tree_importance(X, y, n_trees=50)` |
| sklearn RFE | `RFE(LogisticRegression(), n_features_to_select=10)` |
| sklearn L1 | `SelectFromModel(Lasso(alpha=0.01))` |
| sklearn 树模型 | `rf.feature_importances_` |

## 集成方法的选择条件
type: command-table
from: phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md

| 命令 | 作用 |
|---|---|
| Bagging / Random Forest | 降低方差。适合噪声数据、特征多的情况 |
| AdaBoost | 降低偏差。适合干净数据，易受异常值影响 |
| Gradient Boosting | 降低偏差。适合表格数据，容易过拟合 |
| XGBoost / LightGBM | 两者都降低。生产表格 ML 可从这里开始 |
| Stacking | 两者都降低。争取最后 1-2% 准确率，使用交叉验证元特征 |
| 软投票 | 对不同模型的概率取均值 |

## Boosting 循环
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/code/ensembles.py

```python
weights = np.full(n, 1 / n)                  # AdaBoost 从均匀权重开始
err = np.clip(err, 1e-10, 1 - 1e-10)         # 加权决策树桩误差
alpha = 0.5 * np.log((1 - err) / err)        # 误差低，票重高
weights *= np.exp(-alpha * y * pred)         # 错分样本增加权重
weights /= weights.sum()
self.initial_pred = np.mean(y)               # 梯度提升的起点
residuals = y - current_pred                 # 平方误差梯度
current_pred += self.lr * update             # 缩小每棵树的贡献
```

## 默认值与数值
type: defaults
from: phases/02-ml-fundamentals/08-feature-engineering/code/features.py, phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/code/ensembles.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 目标编码 `smoothing` | 10 | 将稀有类别拉向全局均值 |
| `remove_correlated` 阈值 | 0.9 | 删除一对列中的第二列 |
| `AdaBoostScratch` `n_estimators` | 50 | 决策树桩 |
| `GradientBoostingScratch` | 100 | learning_rate=0.1, max_depth=3 |
| `BaggingClassifier` | 20 | n_estimators=20, max_depth=5 |
| 学习率范围 | 0.01 至 0.3 | 越小需要的树越多 |
| Bootstrap 中的不重复行 | 63.2% | 36.8% 为袋外样本，可用于验证 |
| 森林分裂特征数 | `sqrt(n_features)` | 回归使用 `n_features / 3` |

## 流水线故障
type: troubleshooting
from: phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/08-feature-engineering/docs/zh.md, phases/02-ml-fundamentals/18-feature-selection/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 测试分数过高 | 划分前拟合了缩放器 | 使用 Pipeline 配合 `cross_val_score` |
| 训练与服务输出不同 | 转换位于流水线之外 | 两者共用一个 Pipeline 对象 |
| 遇到新城市崩溃 | 编码器未见过该值 | 使用 `OneHotEncoder(handle_unknown="ignore")` |
| schema 变化后失效 | 硬编码列名 | 从配置读取列名列表 |
| 随机 ID 排名很高 | 树重要性存在基数偏差 | 使用排列重要性检查 |
| 目标编码过拟合 | 在测试行上进行了编码拟合 | 仅在训练数据上拟合，并平滑 |
| Stacking 数据泄漏 | 元特征来自已拟合的数据 | 用交叉验证生成元特征 |

## 公式
type: concepts
from: phases/02-ml-fundamentals/08-feature-engineering/docs/zh.md, phases/02-ml-fundamentals/18-feature-selection/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md

- **TF-IDF**：$\frac{\text{count in doc}}{\text{words in doc}} \cdot \log \frac{\text{docs}}{\text{docs with word}}$
- **互信息**：$I(X; Y) = \sum_x \sum_y p(x, y) \log \frac{p(x, y)}{p(x) p(y)}$，独立时为零。
- **L1 损失**：预测误差加 $\alpha \sum \lvert w_i \rvert$。alpha 越大，归零的权重越多。
- **多数投票**：21 个准确率 60% 的分类器约得 74%。101 个约得 84%。
- **RFE 成本**：$N - \text{target}$ 次训练。从 500 个特征减到 10 个需运行 490 次。
- **互信息分箱**：$\sqrt{n}$ 个箱，或按 Sturges 规则 $1 + \log_2 n$。

## 问答
type: qa
from: phases/02-ml-fundamentals/08-feature-engineering/docs/zh.md, phases/02-ml-fundamentals/13-ml-pipelines/docs/zh.md, phases/02-ml-fundamentals/18-feature-selection/docs/zh.md, phases/02-ml-fundamentals/11-ensemble-methods/docs/zh.md

- **为什么缩放特征？** K-Means、KNN 和 SVM 使用距离。缩放让所有特征的贡献相当。
- **为什么添加缺失标记？** 数据缺失本身也可能包含信息。
- **为什么使用互信息而非相关系数？** 互信息能捕捉二次或周期关系，相关系数可能为零。
- **为什么软投票？** 它使用置信度信息，通常优于硬投票。
- **怎样让运行可复现？** 固定种子、锁定依赖、对数据和配置文件做版本管理。
- **表格数据先选什么模型？** 使用默认参数的 LightGBM 或 XGBoost。
