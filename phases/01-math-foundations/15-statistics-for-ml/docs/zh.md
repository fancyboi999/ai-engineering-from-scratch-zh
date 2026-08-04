# 机器学习中的统计学

> 统计学是你判断模型究竟是真有效、还是只是走运的方式。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1，第 06 课（概率与分布）、07 课（贝叶斯定理）
**预计时间：** ~120 分钟

## 学习目标

- 从零计算描述性统计量、Pearson/Spearman 相关和协方差矩阵
- 做假设检验（t 检验、卡方检验），并正确解读 p 值和置信区间
- 用 bootstrap 重采样为任意指标构造置信区间，无需分布假设
- 用效应量度量区分统计显著性和实际显著性

## 问题背景

你训练了两个模型。模型 A 在你的测试集上拿 0.87。模型 B 拿 0.89。你部署了模型 B。三周后，生产指标比之前还差。怎么回事？

模型 B 其实并没有超过模型 A。那 0.02 的差异是噪声。你的测试集太小，或者方差太高，或者两者都有。你把随机性包装成改进上线了。

这种事一直在发生。Kaggle 排行榜的剧变。复现不出来的论文。基于几百个样本就宣布赢家的 A/B 测试。根源总是同一个：有人跳过了统计。

统计学给你区分信号和噪声的工具。它告诉你一个差异什么时候是真的、你应该有多自信、以及在你能信任一个结果之前需要多少数据。每条 ML 流水线、每次模型比较、每个实验都需要统计。没有它，你就是在猜。

## 核心概念

### 描述性统计：总结你的数据

在你建模任何东西之前，你得知道数据长什么样。描述性统计把一个数据集压缩成几个捕捉它形状的数字。

**集中趋势的度量**回答"中间在哪？"

```
Mean:   sum of all values / count
        mu = (1/n) * sum(x_i)

Median: middle value when sorted
        Robust to outliers. If you have [1, 2, 3, 4, 1000], the mean is 202
        but the median is 3.

Mode:   most frequent value
        Useful for categorical data. For continuous data, rarely informative.
```

均值是平衡点。中位数是过半的标记。当它们分道扬镳时，你的分布就是偏斜的。收入分布的均值 >> 中位数（亿万富翁带来的右偏）。训练中的损失分布常常是均值 << 中位数（简单样本带来的左偏）。

**离散程度的度量**回答"数据有多分散？"

```
Variance:   average squared deviation from the mean
            sigma^2 = (1/n) * sum((x_i - mu)^2)

Standard deviation:  square root of variance
                     sigma = sqrt(sigma^2)
                     Same units as the data, so more interpretable.

Range:      max - min
            Sensitive to outliers. Almost never useful alone.

IQR:        Q3 - Q1 (interquartile range)
            The range of the middle 50% of the data.
            Robust to outliers. Used for box plots and outlier detection.
```

**百分位数**把排序后的数据分成 100 等份。第 25 百分位（Q1）意味着 25% 的值落在这个点以下。第 50 百分位是中位数。第 75 百分位是 Q3。

```
For latency monitoring:
  P50 = median latency        (typical user experience)
  P95 = 95th percentile       (bad but not worst case)
  P99 = 99th percentile       (tail latency, often 10x the median)
```

在 ML 里，你关心推理延迟、预测置信度分布和理解误差分布的百分位数。一个平均误差低、但 P99 误差糟糕的模型，对安全攸关的应用可能毫无用处。

**样本统计 vs 总体统计。** 从样本计算方差时，除以 (n-1) 而不是 n。这是贝塞尔校正。它弥补了你的样本均值不是真正的总体均值这一事实。分母用 n，你会系统性地低估真正的方差。用 (n-1)，估计就是无偏的。

```
Population variance: sigma^2 = (1/N) * sum((x_i - mu)^2)
Sample variance:     s^2     = (1/(n-1)) * sum((x_i - x_bar)^2)
```

实践中：如果 n 很大（数千个样本），差别可忽略。如果 n 很小（几十个样本），它就要紧了。

### 相关：变量如何一起移动

相关度量两个变量之间线性关系的强度和方向。

**Pearson 相关系数**度量线性关联：

```
r = sum((x_i - x_bar)(y_i - y_bar)) / (n * s_x * s_y)

r = +1:  perfect positive linear relationship
r = -1:  perfect negative linear relationship
r =  0:  no linear relationship (but there might be a nonlinear one!)

Range: [-1, 1]
```

Pearson 假设关系是线性的、且两个变量大致正态分布。它对离群点敏感。单个极端点就能把 r 从 0.1 拽到 0.9。

**Spearman 秩相关**度量单调关联：

```
1. Replace each value with its rank (1, 2, 3, ...)
2. Compute Pearson correlation on the ranks

Spearman catches any monotonic relationship, not just linear.
If y = x^3, Pearson gives r < 1 but Spearman gives rho = 1.
```

**各自何时用：**

```
Pearson:    Both variables are continuous and roughly normal.
            You care about the linear relationship specifically.
            No extreme outliers.

Spearman:   Ordinal data (rankings, ratings).
            Data is not normally distributed.
            You suspect a monotonic but not linear relationship.
            Outliers are present.
```

**黄金法则：** 相关不蕴含因果。冰淇淋销量和溺水死亡相关，因为两者都在夏天上升。你模型的准确率和参数数量相关，但加参数不会自动提高准确率（参见：过拟合）。

### 协方差矩阵

两个变量之间的协方差度量它们如何一起变化：

```
Cov(X, Y) = (1/n) * sum((x_i - x_bar)(y_i - y_bar))

Cov(X, Y) > 0:  X and Y tend to increase together
Cov(X, Y) < 0:  when X increases, Y tends to decrease
Cov(X, Y) = 0:  no linear co-movement
```

对 d 个特征，协方差矩阵 C 是一个 d x d 矩阵，其中 C[i][j] = Cov(feature_i, feature_j)。对角元 C[i][i] 是每个特征的方差。

```
C = | Var(x1)      Cov(x1,x2)  Cov(x1,x3) |
    | Cov(x2,x1)  Var(x2)      Cov(x2,x3) |
    | Cov(x3,x1)  Cov(x3,x2)  Var(x3)     |

Properties:
  - Symmetric: C[i][j] = C[j][i]
  - Positive semi-definite: all eigenvalues >= 0
  - Diagonal = variances
  - Off-diagonal = covariances
```

**与 PCA 的联系。** PCA 对协方差矩阵做特征分解。特征向量是主成分（方差最大的方向）。特征值告诉你每个成分捕获多少方差。这正是第 10 课讲的，但现在你看清了为什么协方差矩阵是该被分解的对象：它编码了你数据中所有成对的线性关系。

**与相关的联系。** 相关矩阵是标准化变量（各除以自己的标准差）的协方差矩阵。相关把协方差归一化，使所有值落在 [-1, 1] 里。

### 假设检验

假设检验是在不确定性下做决策的框架。你从一个断言出发，收集数据，判断数据是否和这个断言一致。

**设定：**

```
Null hypothesis (H0):        the default assumption, usually "no effect"
Alternative hypothesis (H1): what you are trying to show

Example:
  H0: Model A and Model B have the same accuracy
  H1: Model B has higher accuracy than Model A
```

**p 值**是在假定 H0 为真的前提下、看到和你观测到的一样极端的数据的概率。它不是 H0 为真的概率。这是统计学里最常见的单一误解。

```
p-value = P(data this extreme | H0 is true)

If p-value < alpha (typically 0.05):
    Reject H0. The result is "statistically significant."
If p-value >= alpha:
    Fail to reject H0. You do not have enough evidence.
    This does NOT mean H0 is true.
```

**置信区间**给出一个参数的合理取值范围：

```
95% confidence interval for the mean:
    x_bar +/- z * (s / sqrt(n))

where z = 1.96 for 95% confidence

Interpretation: if you repeated this experiment many times, 95% of the
computed intervals would contain the true mean. It does NOT mean there
is a 95% probability the true mean is in this specific interval.
```

置信区间的宽度告诉你精度。区间宽意味着不确定性高。区间窄意味着你的估计精确（但若你的数据有偏，未必准确）。

### t 检验

t 检验比较均值。它有好几种类型。

**单样本 t 检验：** 总体均值是否不同于一个假设值？

```
t = (x_bar - mu_0) / (s / sqrt(n))

degrees of freedom = n - 1
```

**双样本 t 检验（独立）：** 两组的均值是否不同？

```
t = (x_bar_1 - x_bar_2) / sqrt(s1^2/n1 + s2^2/n2)

This is Welch's t-test, which does not assume equal variances.
Always use Welch's unless you have a specific reason for equal variances.
```

**配对 t 检验：** 当测量成对出现时（同一模型在同样的数据划分上评估）：

```
Compute d_i = x_i - y_i for each pair
Then run a one-sample t-test on the d_i values against mu_0 = 0
```

在 ML 里，配对 t 检验很常见：你在同样的 10 个交叉验证折上跑两个模型，逐对比较它们的分数。

### 卡方检验

卡方检验检查观测频数是否匹配期望频数。对类别数据有用。

```
chi^2 = sum((observed - expected)^2 / expected)

Example: does a language model's output distribution match the
training distribution across categories?

Category    Observed   Expected
Positive       120        100
Negative        80        100
chi^2 = (120-100)^2/100 + (80-100)^2/100 = 4 + 4 = 8

With 1 degree of freedom, chi^2 = 8 gives p < 0.005.
The difference is significant.
```

### ML 模型的 A/B 测试

ML 里的 A/B 测试和网页 A/B 测试不是一回事。模型比较有它特有的挑战：

```
1. Same test set:    Both models must be evaluated on identical data.
                     Different test sets make comparison meaningless.

2. Multiple metrics: Accuracy alone is not enough. You need precision,
                     recall, F1, latency, and fairness metrics.

3. Variance:         Use cross-validation or bootstrap to estimate
                     the variance of each metric, not just point estimates.

4. Data leakage:     If the test set was used during model selection,
                     your comparison is biased. Hold out a final test set.
```

**流程：**

```
1. Define your metric and significance level (alpha = 0.05)
2. Run both models on the same k-fold cross-validation splits
3. Collect paired scores: [(a1, b1), (a2, b2), ..., (ak, bk)]
4. Compute differences: d_i = b_i - a_i
5. Run a paired t-test on the differences
6. Check: is the mean difference significantly different from 0?
7. Compute a confidence interval for the mean difference
8. Compute effect size (Cohen's d) to judge practical significance
```

### 统计显著性 vs 实际显著性

一个结果可以统计显著、却毫无实际意义。数据足够多时，连微不足道的差异都会变得统计显著。

```
Example:
  Model A accuracy: 0.9234
  Model B accuracy: 0.9237
  n = 1,000,000 test samples
  p-value = 0.001

Statistically significant? Yes.
Practically significant? A 0.03% improvement is not worth the
engineering cost of deploying a new model.
```

**效应量**量化差异有多大，与样本量无关：

```
Cohen's d = (mean_1 - mean_2) / pooled_std

d = 0.2:  small effect
d = 0.5:  medium effect
d = 0.8:  large effect
```

总是同时报告 p 值和效应量。p 值告诉你差异是不是真的。效应量告诉你它是否要紧。

### 多重比较问题

当你检验许多假设时，有些会因偶然而"显著"。如果你在 alpha = 0.05 下检验 20 件事，即便什么都不是真的，你也预期会有 1 个假阳性。

```
P(at least one false positive) = 1 - (1 - alpha)^m

m = 20 tests, alpha = 0.05:
P(false positive) = 1 - 0.95^20 = 0.64

You have a 64% chance of at least one false positive.
```

**Bonferroni 校正：** 把 alpha 除以检验数量。

```
Adjusted alpha = alpha / m = 0.05 / 20 = 0.0025

Only reject H0 if p-value < 0.0025.
Conservative but simple. Works when tests are independent.
```

在 ML 里，当你跨多个指标比较模型、检验许多超参数配置、或在多个数据集上评估时，这就要紧了。

### Bootstrap 方法

Bootstrap 通过对你的数据有放回地重采样来估计一个统计量的抽样分布。不需要关于底层分布的任何假设。

**算法：**

```
1. You have n data points
2. Draw n samples WITH replacement (some points appear multiple times,
   some not at all)
3. Compute your statistic on this bootstrap sample
4. Repeat B times (typically B = 1000 to 10000)
5. The distribution of bootstrap statistics approximates the
   sampling distribution
```

**Bootstrap 置信区间（百分位法）：**

```
Sort the B bootstrap statistics
95% CI = [2.5th percentile, 97.5th percentile]
```

**Bootstrap 为什么对 ML 重要：**

```
- Test set accuracy is a point estimate. Bootstrap gives you
  confidence intervals.
- You cannot assume metric distributions are normal (especially
  for AUC, F1, precision at k).
- Bootstrap works for ANY statistic: median, ratio of two means,
  difference in AUC between two models.
- No closed-form formula needed.
```

**Bootstrap 用于模型比较：**

```
1. You have predictions from Model A and Model B on the same test set
2. For each bootstrap iteration:
   a. Resample test indices with replacement
   b. Compute metric_A and metric_B on the resampled set
   c. Store diff = metric_B - metric_A
3. 95% CI for the difference:
   [2.5th percentile of diffs, 97.5th percentile of diffs]
4. If the CI does not contain 0, the difference is significant
```

这比配对 t 检验更鲁棒，因为它不做任何分布假设。

### 参数检验 vs 非参数检验

**参数检验**假设一个特定分布（通常是正态）：

```
t-test:         assumes normally distributed data (or large n by CLT)
ANOVA:          assumes normality and equal variances
Pearson r:      assumes bivariate normality
```

**非参数检验**不做分布假设：

```
Mann-Whitney U:     compares two groups (replaces independent t-test)
Wilcoxon signed-rank: compares paired data (replaces paired t-test)
Spearman rho:       correlation on ranks (replaces Pearson)
Kruskal-Wallis:     compares multiple groups (replaces ANOVA)
```

**何时用非参数：**

```
- Small sample size (n < 30) and data is clearly non-normal
- Ordinal data (ratings, rankings)
- Heavy outliers you cannot remove
- Skewed distributions
```

**何时用参数：**

```
- Large sample size (CLT makes the test statistic approximately normal)
- Data is roughly symmetric without extreme outliers
- More statistical power (better at detecting real differences)
```

在 ML 实验里，你通常 n 很小（5 或 10 个交叉验证折），所以像 Wilcoxon 符号秩这样的非参数检验往往比 t 检验更合适。

### 中心极限定理：实践含义

CLT 说样本均值的分布随 n 增长趋近正态分布，不管底层总体分布如何。

```
If X_1, X_2, ..., X_n are iid with mean mu and variance sigma^2:

    X_bar ~ Normal(mu, sigma^2 / n)    as n -> infinity

Works for n >= 30 in most cases.
For highly skewed distributions, you might need n >= 100.
```

**它为什么对 ML 重要：**

```
1. Justifies confidence intervals and t-tests on aggregated metrics
2. Explains why averaging over cross-validation folds gives stable
   estimates even when individual folds vary wildly
3. Mini-batch gradient descent works because the average gradient
   over a batch approximates the true gradient (CLT in action)
4. Ensemble methods: averaging predictions from many models gives
   more stable output than any single model
```

**CLT 不做什么：**

```
- Does NOT make your data normal. It makes the MEAN of samples normal.
- Does NOT work for heavy-tailed distributions with infinite variance
  (Cauchy distribution).
- Does NOT apply to dependent data (time series without correction).
```

### ML 论文里常见的统计错误

1. **在训练集上测试。** 保证过拟合。总要留出模型训练期间从未见过的数据。

2. **没有置信区间。** 报告一个不带不确定性的单一准确率数字，让结果不可复现、不可验证。

3. **忽略多重比较。** 测 50 个配置、不做校正就报告最好的那个，抬高了假阳性率。

4. **混淆统计显著性和实际显著性。** 对 0.01% 的准确率提升给出 0.001 的 p 值没有意义。

5. **在不平衡数据上用准确率。** 在 99% 负类的数据集上 99% 的准确率意味着模型什么都没学到。用精确率、召回率、F1 或 AUC。

6. **挑选指标。** 只报告你模型获胜的那个指标。诚实的评估报告所有相关指标。

7. **跨训练/测试划分泄漏信息。** 在划分前归一化，或用未来数据预测过去。

8. **小测试集且不估计方差。** 在 100 个样本上评估、宣称 2% 提升，那是噪声，不是信号。

9. **数据不独立却假设独立。** 同一病人的医学影像、同一文档的多个句子。组内的观测是相关的。

10. **P 值篡改（p-hacking）。** 试不同的检验、子集或排除标准，直到拿到 p < 0.05。这个结果是搜索的产物。

## 动手构建

你将实现：

1. **从零写描述性统计**（均值、中位数、众数、标准差、百分位数、IQR）
2. **相关函数**（Pearson 和 Spearman，带协方差矩阵）
3. **假设检验**（单样本 t 检验、双样本 t 检验、卡方检验）
4. **Bootstrap 置信区间**（对任意统计量，不需要任何假设）
5. **A/B 测试模拟器**（生成数据、检验、检查第一类和第二类错误）
6. **统计显著性 vs 实际显著性演示**（展示大 n 让一切都"显著"）

全部从零写，只用 `math` 和 `random`。不用 numpy，不用 scipy。

```figure
f3-bootstrap-resample
```

## 关键术语

| 术语 | 定义 |
|---|---|
| 均值 | 值之和除以个数。对离群点敏感。 |
| 中位数 | 排序数据的中间值。对离群点鲁棒。 |
| 标准差 | 方差的平方根。用原始单位度量离散程度。 |
| 百分位数 | 给定百分比的数据落在其以下的值。 |
| IQR | 四分位距。Q3 减 Q1。中间 50% 的离散程度。 |
| Pearson 相关 | 度量两个变量之间的线性关联。范围 [-1, 1]。 |
| Spearman 相关 | 用秩度量单调关联。 |
| 协方差矩阵 | 所有特征两两之间协方差构成的矩阵。 |
| 原假设 | 无效应或无差异的默认假设。 |
| p 值 | 在原假设为真的前提下、数据这么极端的概率。 |
| 置信区间 | 在给定置信水平下参数的合理取值范围。 |
| t 检验 | 检验均值是否显著不同。用 t 分布。 |
| 卡方检验 | 检验观测频数是否不同于期望频数。 |
| 效应量 | 差异的大小，与样本量无关。Cohen's d 很常见。 |
| Bonferroni 校正 | 把显著性阈值除以检验数量，以控制假阳性。 |
| Bootstrap | 有放回重采样以估计抽样分布。 |
| 第一类错误 | 假阳性。H0 为真时拒绝它。 |
| 第二类错误 | 假阴性。H0 为假时未能拒绝它。 |
| 统计功效 | 正确拒绝一个假 H0 的概率。功效 = 1 减第二类错误率。 |
| 中心极限定理 | 样本均值随样本量增长收敛到正态分布。 |
| 参数检验 | 假设数据服从一个特定分布（通常正态）。 |
| 非参数检验 | 不做分布假设。在秩或符号上工作。 |
