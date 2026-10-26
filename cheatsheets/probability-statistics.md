---
id: probability-statistics
title: 机器学习概率与统计
code: PS
subtitle: 分布、贝叶斯、检验、bootstrap、从 logits 采样与马尔可夫链。含从头实现的 Python 和 SciPy。
hue: 160
sources: phases/01-math-foundations/06-probability-and-distributions, phases/01-math-foundations/07-bayes-theorem, phases/01-math-foundations/15-statistics-for-ml, phases/01-math-foundations/16-sampling-methods, phases/01-math-foundations/22-stochastic-processes
source_hash: 90a43103099d6273
---

## 从 logits 到 token
type: architecture
from: phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/16-sampling-methods/code/sampling.py

```arch
node | logits | 1,1 | Logits | 每个 token 一个
node | temp | 2,1 | 温度 | 除以 T
node | soft | 3,1 | Softmax | 先减去最大值
node | topk | 1,2 | Top-k | 保留 k 个，重新归一化
node | topp | 2,2 | Top-p | 累积和 >= p 的最小集合
node | pick | 3,2 | 采样 | sample_from_probs
edge | logits | temp |
edge | temp | soft |
edge | soft | topk | 概率
edge | topk | topp | 然后
edge | topp | pick |
```

## 贝叶斯 A/B 测试
type: flow
from: phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/code/bayes.py

1. **先验**：每个方案从 Beta(1, 1) 开始，即均匀分布。
2. **数据**：A 的 1000 次展示有 50 次点击，B 的 1000 次展示有 65 次点击。
3. **更新**：`beta_update(alpha, beta_param, successes, failures)` 累加计数。
4. **后验**：A 为 Beta(51, 951)，均值 0.051；B 为 Beta(66, 936)，均值 0.066。
5. **蒙特卡洛**：各抽取 100,000 个样本，P(B > A) 为 B 获胜的比例。
6. **决策**：高于 0.95 发布 B，低于 0.05 发布 A，否则继续收集数据。

## 代码任务
type: task-table
span: 2
from: phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/code/bayes.py, phases/01-math-foundations/15-statistics-for-ml/code/statistics.py, phases/01-math-foundations/06-probability-and-distributions/code/probability.py

| 任务 | 代码 |
|---|---|
| 一次检测后的后验 | `bayes(prior=0.0001, likelihood=0.99, false_positive_rate=0.01)` |
| 重复检测 | `sequential_bayes(prior, likelihood, false_positive_rate, num_tests)` |
| 加一平滑的垃圾邮件过滤 | `NaiveBayes(smoothing=1.0)`，然后 `classifier.train(train_docs, train_labels)` |
| 从 logits 计算损失 | `cross_entropy_loss(logits, target_index)` |
| bootstrap 置信区间 | `bootstrap_statistic(data, stat_func, n_bootstrap=5000, ci=95)` |
| Welch t 检验、配对 t 检验 | `two_sample_ttest(data1, data2)`、`paired_ttest(data1, data2)` |
| 效应量 | `cohens_d(data1, data2)`，然后 `interpret_cohens_d(d)` |
| 多重检验校正 | `bonferroni_correction(p_values, alpha=0.05)` |

## 从头实现采样
type: annotated-code
lang: python
from: phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/16-sampling-methods/code/sampling.py

```python
x = sample_exponential_inverse_cdf(lam)  # -log(u) / lam
x = rejection_sample(target_pdf, proposal_sample, proposal_pdf, M)  # 接受率 1/M
est = importance_sampling_estimate(f, target_pdf, proposal_pdf, proposal_sample, n)
idx = temperature_sample(logits, temperature)  # z / T，然后 softmax
idx = top_k_sample(logits, k)  # 保留最大的 k 个 logits
idx = top_p_sample(logits, p)  # 累积和 >= p 时停止
z = reparam_sample(mu, sigma)  # mu + sigma * epsilon
y = gumbel_softmax_sample(log_probs, temperature)  # 软 one-hot
```

## 库调用
type: annotated-code
lang: python
from: phases/01-math-foundations/06-probability-and-distributions/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

```python
normal = stats.norm(loc=0, scale=1)
normal.cdf(1.96)  # P(X < 1.96)
normal.ppf(0.975)  # 逆 CDF
samples = normal.rvs(size=10000)
probs = softmax(logits)  # 来自 scipy.special
rng = np.random.default_rng(42)
token = rng.choice(len(logits), p=probs)
distribution = distribution @ P  # 幂法，重复 100 次
eigenvalues = np.linalg.eigvals(P)
spectral_gap = 1 - sorted(np.abs(eigenvalues))[-2]  # 混合时间约为 1/gap
```

## 关键公式
type: concepts
from: phases/01-math-foundations/06-probability-and-distributions/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/15-statistics-for-ml/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

- **贝叶斯**：$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$，$P(B)$ 是归一化因子。
- **方差**：$\mathrm{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2$，样本方差除以 $n-1$。
- **带温度 T 的 Softmax**：$p_i = \exp(z_i / T) / \sum_j \exp(z_j / T)$。
- **拉普拉斯平滑**：每项计数加 1，总数加上词表大小。
- **Beta 更新**：先验 Beta(a, b)，成功 s 次、失败 f 次，得到 Beta(a + s, b + f)。
- **重要性权重**：$w(x) = p(x) / q(x)$，对 $x_i \sim q$ 的 $f(x_i) \, w(x_i)$ 求均值。
- **Metropolis-Hastings**：以 $\min(1, a)$ 的概率接受，对称提议给出 $a = p(x') / p(x)$。
- **Langevin**：$x_{t+1} = x_t - dt \, \nabla U(x_t) + \sqrt{2 T \, dt} \, z_t$。

## 分布
type: command-table
from: phases/01-math-foundations/06-probability-and-distributions/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

| 名称 | 含义 |
|---|---|
| 伯努利分布 | 均值 p，方差 p(1-p)，用于二分类 |
| 分类分布 | 概率和为 1，是 softmax 的输出 |
| 泊松分布 | 均值与方差均为 lambda，用于事件计数 |
| Uniform(0, 1) | E[U] = 0.5，Var(U) = 1/12，是各类采样器的起点 |
| 正态分布 | 1、2、3 个 sigma 内分别有 68%、95%、99.7% |
| Beta(a, b) | 均值 a/(a+b)，伯努利分布的共轭先验 |
| 指数分布 | 逆 CDF 得到 x = -ln(u) / lambda |
| 布朗运动 | B(t) 服从均值 0、方差 t 的正态分布 |

## 选择检验
type: command-table
from: phases/01-math-foundations/15-statistics-for-ml/docs/zh.md

| 名称 | 含义 |
|---|---|
| 单样本 t 检验 | 均值与 mu_0 比较，自由度 n - 1 |
| Welch t 检验 | 两个独立组，不假设方差相等 |
| 配对 t 检验 | 两个模型使用相同折，检验 d_i 是否为 0 |
| 卡方检验 | 观测频数与期望频数比较 |
| Mann-Whitney U | 两组数据，不假设正态分布 |
| Wilcoxon 符号秩检验 | 配对数据，适合 5 或 10 折 |
| Spearman rho | 秩的单调关系，对离群值稳健 |
| Bootstrap | 任意指标，由第 2.5 与 97.5 百分位得到 95% CI |

## 数字与默认值
type: defaults
from: phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/15-statistics-for-ml/docs/zh.md, phases/01-math-foundations/15-statistics-for-ml/code/statistics.py, phases/01-math-foundations/16-sampling-methods/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 显著性水平 alpha | 0.05 | p 低于此值时拒绝 H0 |
| 95% 区间的 z | 1.96 | x_bar 加减 z 乘 s / sqrt(n) |
| `n_bootstrap` | 5000 | 课程范围为 1000 至 10000 |
| CLT 样本量 | n >= 30 | 偏态数据使用 n >= 100 |
| Cohen's d，大效应 | 0.8 | 0.2 为小效应，0.5 为中等效应 |
| 高斯提议的 MH 接受率 | 0.234 | 高维情况 |
| Top-k `k` | 40 | 常用设置 |
| 带 top-p 的温度 | 0.7 + top-p 0.9 | 通用配置 |

## 常见问题排查
type: troubleshooting
from: phases/01-math-foundations/06-probability-and-distributions/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/15-statistics-for-ml/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| softmax 中 exp(102) 溢出 | logits 过大 | 先减去最大 logit |
| 序列概率为 0.0 | 约 30 项后下溢 | 对数概率相加 |
| 朴素贝叶斯分数为 0 | 未见词的 MLE 计数为 0 | 加一拉普拉斯平滑 |
| 99% 准确的检测只得到约 1% 患病概率 | 稀有事件先验占主导 | 使用基础发生率，再做一次检测 |
| 20 个指标中一个显著 | 出现假阳性的概率为 64% | Bonferroni：alpha / m |
| 0.03% 提升却有极小 p 值 | n 非常大 | 同时报告效应量 |
| MH 链卡住或很慢 | 提议尺度过大或过小 | 将接受率调至约 23% |
| 少数样本主导估计 | 提议分布 q 远离 p | 对权重自归一化 |

## 问答
type: qa
from: phases/01-math-foundations/15-statistics-for-ml/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md

- **p 值是 H0 为真的概率吗？** 不是，是 H0 成立时出现如此极端数据的概率。
- **95% CI 是什么意思？** 重复实验得到的区间中，95% 包含真实均值。
- **为何使用重参数化技巧？** 采样阻断梯度，z = mu + sigma * epsilon 可微。
- **为何 top-p 优于 top-k？** top-p 根据模型置信度调整候选集合。
- **链混合有多快？** 谱间隙为 0.2 时约需 5 步，0.01 时约需 100 步。
- **MAP 与正则化有何关系？** 高斯先验对应 L2，拉普拉斯先验对应 L1。

## 提示
type: tips
from: phases/01-math-foundations/15-statistics-for-ml/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

- 在同一测试集和相同折上评估两个模型。
- 同时报告 p 值与效应量。
- 任意维度下，蒙特卡洛误差均为 O(1 / sqrt(N))。
- 丢弃预热样本，从不同起点运行多条链。
- 随机游走 n 步后，距原点的典型距离约为 sqrt(n)。
- 事实回答和确定性任务使用 T = 0.0（贪心）。
