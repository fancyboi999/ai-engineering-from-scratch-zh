# 处理不平衡数据

> 当你 99% 的数据都是"正常"时，准确率就是个谎言。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 2 第 01-09 课（尤其是评估指标）
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 SMOTE，并解释合成过采样和随机复制有什么不同
- 用 F1、AUPRC 和马修斯相关系数代替准确率来评估不平衡分类器
- 对比类别加权、阈值调节和重采样策略，为给定的不平衡比例选对方法
- 构建一条完整的不平衡数据流水线，结合 SMOTE、类别权重和阈值优化

## 问题背景

你做了一个欺诈检测模型。它拿到 99.9% 准确率。你庆祝。然后你意识到它对每一笔交易都预测"非欺诈"。

这不是 bug。当只有 0.1% 的交易是欺诈时，这是理性的做法。模型学到永远猜多数类能让总体误差最小。它技术上正确、却完全没用。

这在每一个真实分类重要的地方都会发生。疾病诊断：1% 阳性率。网络入侵：0.01% 攻击。制造缺陷：0.5% 次品。垃圾邮件过滤：20% 垃圾。流失预测：5% 流失者。少数类越重要，它往往越稀少。

准确率失败是因为它平等对待所有正确预测。正确标注一笔合法交易和正确抓住一笔欺诈都算一分准确率。但抓住欺诈才是这个模型存在的全部理由。我们需要能强迫模型关注那个稀少但重要的类的指标、技术和训练策略。

## 核心概念

### 为什么准确率失败

考虑一个有 1000 个样本的数据集：990 负、10 正。一个永远预测负的模型：

|  | 预测为正 | 预测为负 |
|--|---|---|
| 实际为正 | 0 (TP) | 10 (FN) |
| 实际为负 | 0 (FP) | 990 (TN) |

准确率 = (0 + 990) / 1000 = 99.0%

这个模型抓住的欺诈、疾病、缺陷都是零。但准确率说 99%。这就是为什么准确率对不平衡问题危险。

### 更好的指标

**精确率** = TP / (TP + FP)。在所有被标为正的里，有多少真的是？高精确率意味着少误报。

**召回率** = TP / (TP + FN)。在所有真正为正的里，我们抓到了多少？高召回率意味着少漏掉的正例。

**F1 分数** = 2 * precision * recall / (precision + recall)。调和平均。比算术平均更狠地惩罚精确率和召回率之间的极端失衡。

**F-beta 分数** = (1 + beta^2) * precision * recall / (beta^2 * precision + recall)。beta > 1 时召回率更重要。beta < 1 时精确率更重要。F2 在欺诈检测里常见（漏掉欺诈比误报更糟）。

**AUPRC**（精确率-召回率曲线下面积）。像 AUC-ROC 但对不平衡数据更有信息量。随机分类器的 AUPRC 等于正类率（不像 ROC 那样是 0.5）。这让改进更容易看出来。

**马修斯相关系数** = (TP * TN - FP * FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))。从 -1 到 +1。只有模型在两个类上都做得好时才给高分。即使类别大小差异很大也保持平衡。

对上面那个"永远预测负"的模型：精确率 = 0/0（无定义，常设为 0）、召回率 = 0/10 = 0、F1 = 0、MCC = 0。这些指标正确地把模型识别为一文不值。

### 不平衡数据流水线

```mermaid
flowchart TD
    A[不平衡数据集] --> B{不平衡比例？}
    B -->|轻度：80/20| C[类别权重]
    B -->|中度：95/5| D[SMOTE + 阈值调节]
    B -->|重度：99/1| E[SMOTE + 类别权重 + 阈值]
    C --> F[训练模型]
    D --> F
    E --> F
    F --> G[用 F1 / AUPRC / MCC 评估]
    G --> H{够好了吗？}
    H -->|否| I[试不同策略]
    H -->|是| J[带监控部署]
    I --> B
```

### SMOTE：合成少数类过采样技术

随机过采样复制已有的少数类样本。这能用，但有过拟合风险，因为模型反复看到相同的点。

SMOTE 创建新的合成少数类样本，它们合理但不是副本。算法：

1. 对每个少数类样本 x，在其他少数类样本里找它的 k 个最近邻
2. 随机挑一个邻居
3. 在 x 和那个邻居之间的线段上创建一个新样本

公式：`new_sample = x + random(0, 1) * (neighbor - x)`

这在真实少数类点之间插值，在特征空间的同一区域里创建样本，而不只是复制已有数据。

```mermaid
flowchart LR
    subgraph Original["原始少数类点"]
        P1["x1 (1.0, 2.0)"]
        P2["x2 (1.5, 2.5)"]
        P3["x3 (2.0, 1.5)"]
    end
    subgraph SMOTE["SMOTE 生成"]
        direction TB
        S1["挑 x1，邻居 x2"]
        S2["随机 t = 0.4"]
        S3["new = x1 + 0.4*(x2-x1)"]
        S4["new = (1.2, 2.2)"]
        S1 --> S2 --> S3 --> S4
    end
    Original --> SMOTE
    subgraph Result["增广后的集合"]
        R1["x1 (1.0, 2.0)"]
        R2["x2 (1.5, 2.5)"]
        R3["x3 (2.0, 1.5)"]
        R4["合成 (1.2, 2.2)"]
    end
    SMOTE --> Result
```

### 采样策略对比

**随机过采样**：复制少数类样本以匹配多数类数量。
- 优点：简单，无信息损失
- 缺点：完全相同的副本导致过拟合，增加训练时间

**随机欠采样**：移除多数类样本以匹配少数类数量。
- 优点：训练快，简单
- 缺点：丢掉了可能有用的多数类数据，方差更高

**SMOTE**：通过插值创建合成少数类样本。
- 优点：生成新数据点，比随机过采样更少过拟合
- 缺点：可能在决策边界附近造出有噪声的样本，不考虑多数类分布

| 策略 | 改动的数据 | 风险 | 何时用 |
|----------|-------------|------|-------------|
| 过采样 | 复制少数类 | 过拟合 | 小数据集、中度不平衡 |
| 欠采样 | 移除多数类 | 信息损失 | 大数据集、想训练快 |
| SMOTE | 加入合成少数类 | 边界噪声 | 中度不平衡、少数类样本够做 k-NN |

### 类别权重

不改数据，而是改模型对待错误的方式。给错分少数类更高的权重。

对一个 950 负、50 正的二元问题：
- 负类权重 = n_samples / (2 * n_negative) = 1000 / (2 * 950) = 0.526
- 正类权重 = n_samples / (2 * n_positive) = 1000 / (2 * 50) = 10.0

正类拿到 19 倍的权重。错分一个正样本的代价等于错分 19 个负样本。模型被强迫关注少数类。

在逻辑回归里，这修改损失函数：

```
weighted_loss = -sum(w_i * [y_i * log(p_i) + (1-y_i) * log(1-p_i)])
```

其中 w_i 取决于样本 i 的类别。

类别权重在期望意义上和过采样数学等价，但不创建新数据点。这让它更快、并避免了复制样本的过拟合风险。

### 阈值调节

大多数分类器输出一个概率。默认阈值是 0.5：如果 P(positive) >= 0.5，预测正。但 0.5 是任意的。类别不平衡时，最优阈值通常低得多。

过程：
1. 训练一个模型
2. 在验证集上拿预测概率
3. 把阈值从 0.0 扫到 1.0
4. 在每个阈值上计算 F1（或你选的指标）
5. 挑让你的指标最大化的阈值

```mermaid
flowchart LR
    A[模型] --> B[预测概率]
    B --> C[扫阈值 0.0 到 1.0]
    C --> D[在每个上算 F1]
    D --> E[挑最佳阈值]
    E --> F[在生产里用]
```

一个模型可能对一笔欺诈交易输出 P(fraud) = 0.15。在阈值 0.5，这被分为非欺诈。在阈值 0.10，它被正确抓住。概率校准没有排序重要 —— 只要欺诈拿到比非欺诈更高的概率，就存在一个能把它们分开的阈值。

### 代价敏感学习

类别权重的推广。不用统一代价，而是赋予具体的错分代价：

| | 预测正 | 预测负 |
|--|---|---|
| 实际为正 | 0（正确） | C_FN = 100 |
| 实际为负 | C_FP = 1 | 0（正确） |

漏掉一笔欺诈交易（FN）的代价是误报（FP）的 100 倍。模型为总代价优化，而非总错误数。

当你能估计真实世界代价时，这是最有原则的方法。漏诊癌症和导致一次额外活检的误报，代价天差地别。把这些代价显式化，强迫做出正确的权衡。

### 决策流程图

```mermaid
flowchart TD
    A[开始：不平衡数据集] --> B{有多不平衡？}
    B -->|"< 70/30"| C["轻度：先试类别权重"]
    B -->|"70/30 到 95/5"| D["中度：SMOTE + 类别权重"]
    B -->|"> 95/5"| E["重度：组合多种策略"]
    C --> F{数据够吗？}
    D --> F
    E --> F
    F -->|"< 1000 个样本"| G["过采样或 SMOTE，避免欠采样"]
    F -->|"1000-10000"| H["SMOTE + 阈值调节"]
    F -->|"> 10000"| I["欠采样可以，或类别权重"]
    G --> J[训练 + 用 F1/AUPRC 评估]
    H --> J
    I --> J
    J --> K{召回率够高吗？}
    K -->|否| L[降低阈值]
    K -->|是| M{精确率可接受吗？}
    M -->|否| N[提高阈值或加特征]
    M -->|是| O[交付]
```

```figure
class-imbalance
```

## 动手构建

### 第 1 步：生成一个不平衡数据集

```python
import numpy as np


def make_imbalanced_data(n_majority=950, n_minority=50, seed=42):
    rng = np.random.RandomState(seed)

    X_maj = rng.randn(n_majority, 2) * 1.0 + np.array([0.0, 0.0])
    X_min = rng.randn(n_minority, 2) * 0.8 + np.array([2.5, 2.5])

    X = np.vstack([X_maj, X_min])
    y = np.concatenate([np.zeros(n_majority), np.ones(n_minority)])

    shuffle_idx = rng.permutation(len(y))
    return X[shuffle_idx], y[shuffle_idx]
```

### 第 2 步：从零实现 SMOTE

```python
def euclidean_distance(a, b):
    return np.sqrt(np.sum((a - b) ** 2))


def find_k_neighbors(X, idx, k):
    distances = []
    for i in range(len(X)):
        if i == idx:
            continue
        d = euclidean_distance(X[idx], X[i])
        distances.append((i, d))
    distances.sort(key=lambda x: x[1])
    return [d[0] for d in distances[:k]]


def smote(X_minority, k=5, n_synthetic=100, seed=42):
    rng = np.random.RandomState(seed)
    n_samples = len(X_minority)
    k = min(k, n_samples - 1)
    synthetic = []

    for _ in range(n_synthetic):
        idx = rng.randint(0, n_samples)
        neighbors = find_k_neighbors(X_minority, idx, k)
        neighbor_idx = neighbors[rng.randint(0, len(neighbors))]
        t = rng.random()
        new_point = X_minority[idx] + t * (X_minority[neighbor_idx] - X_minority[idx])
        synthetic.append(new_point)

    return np.array(synthetic)
```

### 第 3 步：随机过采样和欠采样

```python
def random_oversample(X, y, seed=42):
    rng = np.random.RandomState(seed)
    classes, counts = np.unique(y, return_counts=True)
    max_count = counts.max()

    X_resampled = list(X)
    y_resampled = list(y)

    for cls, count in zip(classes, counts):
        if count < max_count:
            cls_indices = np.where(y == cls)[0]
            n_needed = max_count - count
            chosen = rng.choice(cls_indices, size=n_needed, replace=True)
            X_resampled.extend(X[chosen])
            y_resampled.extend(y[chosen])

    X_out = np.array(X_resampled)
    y_out = np.array(y_resampled)
    shuffle = rng.permutation(len(y_out))
    return X_out[shuffle], y_out[shuffle]


def random_undersample(X, y, seed=42):
    rng = np.random.RandomState(seed)
    classes, counts = np.unique(y, return_counts=True)
    min_count = counts.min()

    X_resampled = []
    y_resampled = []

    for cls in classes:
        cls_indices = np.where(y == cls)[0]
        chosen = rng.choice(cls_indices, size=min_count, replace=False)
        X_resampled.extend(X[chosen])
        y_resampled.extend(y[chosen])

    X_out = np.array(X_resampled)
    y_out = np.array(y_resampled)
    shuffle = rng.permutation(len(y_out))
    return X_out[shuffle], y_out[shuffle]
```

### 第 4 步：带类别权重的逻辑回归

```python
def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))


def logistic_regression_weighted(X, y, weights, lr=0.01, epochs=200):
    n_samples, n_features = X.shape
    w = np.zeros(n_features)
    b = 0.0

    for _ in range(epochs):
        z = X @ w + b
        pred = sigmoid(z)
        error = pred - y
        weighted_error = error * weights

        gradient_w = (X.T @ weighted_error) / n_samples
        gradient_b = np.mean(weighted_error)

        w -= lr * gradient_w
        b -= lr * gradient_b

    return w, b


def compute_class_weights(y):
    classes, counts = np.unique(y, return_counts=True)
    n_samples = len(y)
    n_classes = len(classes)
    weight_map = {}
    for cls, count in zip(classes, counts):
        weight_map[cls] = n_samples / (n_classes * count)
    return np.array([weight_map[yi] for yi in y])
```

### 第 5 步：阈值调节

```python
def find_optimal_threshold(y_true, y_probs, metric="f1"):
    best_threshold = 0.5
    best_score = -1.0

    for threshold in np.arange(0.05, 0.96, 0.01):
        y_pred = (y_probs >= threshold).astype(int)
        tp = np.sum((y_pred == 1) & (y_true == 1))
        fp = np.sum((y_pred == 1) & (y_true == 0))
        fn = np.sum((y_pred == 0) & (y_true == 1))

        if metric == "f1":
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            score = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        elif metric == "recall":
            score = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        elif metric == "precision":
            score = tp / (tp + fp) if (tp + fp) > 0 else 0.0

        if score > best_score:
            best_score = score
            best_threshold = threshold

    return best_threshold, best_score
```

### 第 6 步：评估函数

```python
def confusion_matrix_values(y_true, y_pred):
    tp = np.sum((y_pred == 1) & (y_true == 1))
    tn = np.sum((y_pred == 0) & (y_true == 0))
    fp = np.sum((y_pred == 1) & (y_true == 0))
    fn = np.sum((y_pred == 0) & (y_true == 1))
    return tp, tn, fp, fn


def compute_metrics(y_true, y_pred):
    tp, tn, fp, fn = confusion_matrix_values(y_true, y_pred)
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    denom = np.sqrt(float((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)))
    mcc = (tp * tn - fp * fn) / denom if denom > 0 else 0.0

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "mcc": mcc,
    }
```

### 第 7 步：对比所有方法

```python
X, y = make_imbalanced_data(950, 50, seed=42)
split = int(0.8 * len(y))
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# 基线：不做任何处理
w_base, b_base = logistic_regression_weighted(
    X_train, y_train, np.ones(len(y_train)), lr=0.1, epochs=300
)
probs_base = sigmoid(X_test @ w_base + b_base)
preds_base = (probs_base >= 0.5).astype(int)

# 过采样
X_over, y_over = random_oversample(X_train, y_train)
w_over, b_over = logistic_regression_weighted(
    X_over, y_over, np.ones(len(y_over)), lr=0.1, epochs=300
)
preds_over = (sigmoid(X_test @ w_over + b_over) >= 0.5).astype(int)

# SMOTE
minority_mask = y_train == 1
X_minority = X_train[minority_mask]
synthetic = smote(X_minority, k=5, n_synthetic=len(y_train) - 2 * int(minority_mask.sum()))
X_smote = np.vstack([X_train, synthetic])
y_smote = np.concatenate([y_train, np.ones(len(synthetic))])
w_sm, b_sm = logistic_regression_weighted(
    X_smote, y_smote, np.ones(len(y_smote)), lr=0.1, epochs=300
)
preds_smote = (sigmoid(X_test @ w_sm + b_sm) >= 0.5).astype(int)

# 类别权重
sample_weights = compute_class_weights(y_train)
w_cw, b_cw = logistic_regression_weighted(
    X_train, y_train, sample_weights, lr=0.1, epochs=300
)
probs_cw = sigmoid(X_test @ w_cw + b_cw)
preds_cw = (probs_cw >= 0.5).astype(int)

# 阈值调节（在留出的验证集上调，不在测试集上调）
probs_val = sigmoid(X_val @ w_cw + b_cw)
best_thresh, best_f1 = find_optimal_threshold(y_val, probs_val, metric="f1")
preds_thresh = (probs_cw >= best_thresh).astype(int)
```

代码文件在一个脚本里跑完这一切并打印结果。

## 实际使用

用 scikit-learn 和 imbalanced-learn，这些技术都是一行：

```python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.pipeline import Pipeline

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y)

model_weighted = LogisticRegression(class_weight="balanced")
model_weighted.fit(X_train, y_train)
print(classification_report(y_test, model_weighted.predict(X_test)))

smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
model_smote = LogisticRegression()
model_smote.fit(X_resampled, y_resampled)
print(classification_report(y_test, model_smote.predict(X_test)))

pipeline = Pipeline([
    ("smote", SMOTE()),
    ("model", LogisticRegression(class_weight="balanced")),
])
pipeline.fit(X_train, y_train)
print(classification_report(y_test, pipeline.predict(X_test)))
```

从零实现让你看清每种技术到底做什么。SMOTE 就是对少数类做 k-NN 插值。类别权重乘损失。阈值调节是对截断点做 for 循环。没魔法。

## 拿去用

本节课产出：
- `outputs/skill-imbalanced-data.md` -- 处理不平衡分类问题的决策清单

## 练习

1. **Borderline-SMOTE**：修改 SMOTE 实现，只为靠近决策边界的少数类点（那些 k 近邻里包含多数类样本的点）生成合成样本。在类别重叠的数据集上和标准 SMOTE 对比结果。

2. **代价矩阵优化**：实现代价敏感学习，把代价矩阵当参数。写一个函数，接收一个代价矩阵，返回最小化期望代价的最优预测。用不同代价比（1:10、1:100、1:1000）测试，画出精确率-召回率权衡如何变化。

3. **阈值校准**：实现 Platt 缩放（在模型原始输出上拟合一个逻辑回归来产生校准概率）。对比校准前后的精确率-召回率曲线。说明校准不改变排序（AUC 不变）但让概率更有意义。

4. **平衡 bagging 集成**：训练多个模型，每个在一个平衡的自助样本上（全部少数类 + 随机一部分多数类）。平均它们的预测。把这个方法和单个 SMOTE 模型对比。测量性能和跨运行的方差。

5. **不平衡比例实验**：拿一个平衡数据集，逐步增加不平衡比例（50/50、70/30、90/10、95/5、99/1）。对每个比例，分别在有和没有 SMOTE 下训练。把两种方法的 F1 对不平衡比例画出来。SMOTE 在哪个比例开始带来有意义的差别？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 类别不平衡 | "一个类的样本多得多" | 数据集里类别分布显著偏斜，导致模型偏向多数类 |
| SMOTE | "合成过采样" | 通过在已有少数类样本和它们的 k 近邻少数类之间插值，创建新的少数类样本 |
| 类别权重 | "让稀有类上的错误更贵" | 把损失函数乘以类别特定的权重，让模型更狠地惩罚少数类错分 |
| 阈值调节 | "移动决策边界" | 把分类的概率截断点从默认 0.5 改成优化目标指标的值 |
| 精确率-召回率权衡 | "你没法两者兼得" | 降低阈值抓更多正例（召回率更高）但也标出更多假正例（精确率更低），反之亦然 |
| AUPRC | "PR 曲线下面积" | 把精确率-召回率曲线汇总成一个数字；类别严重不平衡时比 AUC-ROC 更有信息量 |
| 马修斯相关系数 | "平衡的指标" | 预测和真实标签之间的相关性，只有模型在两个类上都表现好时才给高分 |
| 代价敏感学习 | "不同错误代价不同" | 把真实世界的错分代价纳入训练目标，让模型为总代价而非错误数优化 |
| 随机过采样 | "复制少数类" | 重复少数类样本来平衡类别数量；简单但有过拟合到复制点的风险 |

## 延伸阅读

- [SMOTE: Synthetic Minority Over-sampling Technique (Chawla et al., 2002)](https://arxiv.org/abs/1106.1813) -- 原始的 SMOTE 论文，至今仍是不平衡学习被引用最多的工作
- [Learning from Imbalanced Data (He & Garcia, 2009)](https://ieeexplore.ieee.org/document/5128907) -- 涵盖采样、代价敏感和算法方法的综合综述
- [imbalanced-learn documentation](https://imbalanced-learn.org/stable/) -- 带 SMOTE 变体、欠采样策略和流水线集成的 Python 库
- [The Precision-Recall Plot Is More Informative than the ROC Plot (Saito & Rehmsmeier, 2015)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0118432) -- 对不平衡问题何时及为何更应选 PR 曲线而非 ROC 曲线
