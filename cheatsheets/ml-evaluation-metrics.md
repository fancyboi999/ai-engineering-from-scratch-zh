---
id: ml-evaluation-metrics
title: 模型评估、偏差方差与调优
code: ME
subtitle: 数据划分与交叉验证、指标公式、偏差方差诊断、搜索策略及类别不平衡。
hue: 210
sources: phases/02-ml-fundamentals/09-model-evaluation, phases/02-ml-fundamentals/10-bias-variance, phases/02-ml-fundamentals/12-hyperparameter-tuning, phases/02-ml-fundamentals/17-imbalanced-data
source_hash: ba91120babd02fa0
---

## 诊断训练与测试误差
type: troubleshooting
from: phases/02-ml-fundamentals/10-bias-variance/docs/zh.md, phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 训练误差高、测试误差高 | 高偏差 | 增加特征、使用复杂模型、减少正则化 |
| 训练误差低、测试误差高 | 高方差 | 增加数据、正则化、简化模型 |
| 训练误差下降、测试误差上升 | 正在过拟合 | 提前停止 |
| 两条曲线都平且高 | 偏差；更多数据无济于事 | 更换模型 |
| 间隙大，验证误差仍下降 | 数据可改善的方差 | 收集更多数据 |
| 准确率 99%，未捕获任何正例 | 类别不平衡 | 使用 F1、AUPRC 或 MCC |
| 验证分数过于乐观 | 划分前已拟合缩放器 | 在 `Pipeline` 中预处理 |
| 最佳值在搜索边缘 | 范围太窄 | 扩大搜索空间 |

## 划分、调优、报告
type: architecture
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md

```arch
node | data | 1,2 | 完整数据集 |
node | train | 2,1 | 训练集 | 60-70%
node | val | 2,2 | 验证集 | 15-20%
node | test | 2,3 | 测试集 | 15-20%，仅使用一次
node | fit | 3,1 | 拟合模型 |
node | tune | 3,2 | 调优超参数 | 选择模型
node | final | 4,2 | 最终模型 |
node | report | 4,3 | 报告性能 |
edge | data | train |
edge | data | val |
edge | data | test |
edge | train | fit |
edge | fit | tune | 验证
edge | tune | final |
edge | final | report |
edge | test | report |
```

## 指标公式
type: concepts
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/10-bias-variance/docs/zh.md

- **准确率**：$(TP + TN) / (TP + TN + FP + FN)$。类别不平衡时会误导。
- **精确率**：$TP / (TP + FP)$。假阳性代价高时使用。
- **召回率**：$TP / (TP + FN)$。假阴性代价高时使用。
- **F1**：$2PR / (P + R)$，精确率与召回率的调和平均。
- **F-beta**：$(1+\beta^2) P R / (\beta^2 P + R)$。$\beta > 1$ 加重召回率权重。欺诈检测常用 F2。
- **MCC**：$(TP \cdot TN - FP \cdot FN) / \sqrt{\ldots}$。取值为 -1 至 +1。
- **AUC-ROC**：0.5 为随机猜测，1.0 为完全区分。
- **AUPRC**：随机模型的分数等于正类比例。
- **RMSE 与 MAE**：RMSE 是 $\sqrt{\text{MSE}}$，单位与目标相同。MAE 对离群值更稳健。
- **误差分解**：期望误差 $= \text{Bias}^2 + \text{Variance} + \sigma^2$。

## 逐步修正模型
type: flow
from: phases/02-ml-fundamentals/10-bias-variance/docs/zh.md

1. **训练**：计算训练误差与测试误差。
2. **两者都高**：偏差问题。转到第 4 步。
3. **训练低、测试高**：方差问题。画学习曲线。数据无效时使用正则化。
4. **验证曲线**：扫描主要复杂度参数，寻找合适值。
5. **学习曲线**：在合适值上绘制。大间隙需要更多数据或正则化。
6. **扫描 alpha**：用 `cross_val_score` 尝试 Ridge 或 Lasso 的 alpha，保留最低交叉验证误差。

## 交叉验证与调优
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md

```python
scores = cross_val_score(model, X, y, cv=StratifiedKFold(5), scoring="f1")
param_dist = {
    "learning_rate": loguniform(1e-4, 0.5),      # 对数尺度
    "max_depth": randint(2, 10),
    "n_estimators": randint(50, 500),
}
search = RandomizedSearchCV(GradientBoostingRegressor(), param_dist,
    n_iter=100, cv=5, scoring="neg_mean_squared_error", n_jobs=-1)
search.fit(X_train, y_train)
search.best_params_                               # 最佳设置
outer_scores = cross_val_score(inner_cv, X, y, cv=5, scoring="neg_mean_squared_error")
```

## 搜索策略
type: command-table
from: phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md

| 命令 | 作用 |
|---|---|
| 网格搜索 | 遍历全部组合，成本指数增长 |
| 随机搜索 | 从分布采样；同预算探索更多不同取值 |
| 贝叶斯优化 | 代理模型加采集函数，评估次数减少 2-5 倍 |
| Hyperband | 对大量配置使用小预算，速度提高 10-50 倍 |
| `MedianPruner` | 停止表现低于同一步骤中位数的试验 |
| `GridSearchCV` | 带交叉验证的穷举网格 |
| `RandomizedSearchCV` | 带交叉验证的随机搜索；`n_jobs=-1` 使用全部核心 |
| `trial.suggest_float` | Optuna 采样；学习率加 `log=True` |

## 选择不平衡处理方法
type: defaults
from: phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 轻度，低于 70/30 | 类别权重 | 优先尝试 |
| 中度，70/30 至 95/5 | SMOTE 加类别权重 | 或 SMOTE 加阈值调优 |
| 严重，超过 95/5 | 组合多种策略 | SMOTE、类别权重与阈值 |
| 少于 1000 个样本 | 过采样或 SMOTE，避免欠采样 | 小数据量 |
| 1000-10000 个样本 | SMOTE 加阈值调优 | 中数据量 |
| 超过 10000 个样本 | 可欠采样，或用类别权重 | 大数据量 |

## 关键数值
type: defaults
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md, phases/02-ml-fundamentals/10-bias-variance/code/bias_variance.py, phases/02-ml-fundamentals/17-imbalanced-data/code/imbalanced.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| K 折 | 5 | 或 10 |
| 决策阈值 | 0.5 | 稀有正类时降低 |
| 随机搜索试验数 | 60 | 有 95% 概率落在距最优值 5% 以内 |
| Hyperband 起点 | 81 | 每配置 1 轮，保留前三分之一 |
| 嵌套交叉验证拟合数 | 675 | 外层 5 x 内层 5 x 27 个网格点 |
| Bootstrap 拟合数 | 200 | 分解中 `n_bootstrap=200` |
| SMOTE `k` | 5 | `n_synthetic=100` |
| 正类权重 | 10.0 | 1000 个样本，其中 50 个正例 |

## 问答
type: qa
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/10-bias-variance/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

- **为何分层划分？** 每折保留完整数据集的类别比例。
- **测试集为何只用一次？** 每次查看再调整，都会把它变成第二个验证集。
- **为何随机搜索胜过网格？** 6 个超参数中通常只有 1-2 个重要。
- **Bagging 还是 boosting？** 高方差用 bagging，高偏差用 boosting。
- **类别权重还是过采样？** 权重在期望上等价于过采样，但不产生重复样本。
- **何时容量表现最差？** 在插值阈值处，即参数数接近样本数时。
- **如何报告最终分数？** 使用嵌套交叉验证，或调优时从未接触的测试集。

## 提示
type: tips
from: phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md, phases/02-ml-fundamentals/12-hyperparameter-tuning/docs/zh.md, phases/02-ml-fundamentals/17-imbalanced-data/docs/zh.md

- 先划分，再预处理。
- 先调学习率，按对数尺度搜索。
- 用提前停止代替调优 `n_estimators`。
- 将调优预算的 60% 用于最重要的 2 个超参数。
- 从库默认值开始。先粗搜 20-50 次，再细搜 50-100 次。
- 在验证数据上扫描 0.0 至 1.0 的阈值，保留最佳 F1。

## 从零实现的函数
type: task-table
from: phases/02-ml-fundamentals/09-model-evaluation/code/evaluation.py, phases/02-ml-fundamentals/17-imbalanced-data/code/imbalanced.py

| 任务 | 代码 |
|---|---|
| 分层折划分 | `stratified_kfold_split(y, k=5, seed=42)` |
| ROC 面积 | `auc_roc(y_true, y_scores)` |
| 合成少数类样本行 | `smote(X_minority, k=5, n_synthetic=100)` |
| 平衡类别权重 | `compute_class_weights(y)` |
| 按 F1 选择最佳阈值 | `find_optimal_threshold(y_true, y_probs)` |
