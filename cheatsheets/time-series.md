---
id: time-series
title: 时间序列基础
code: TS
subtitle: 检查平稳性，构造滞后特征，用前向滚动验证，超越朴素基线。包含随机游走和马尔可夫链。
hue: 170
sources: phases/02-ml-fundamentals/15-time-series, phases/01-math-foundations/22-stochastic-processes, phases/02-ml-fundamentals/16-anomaly-detection
source_hash: 731ac2614dc43fc7
---

## 从序列到可信预测
type: architecture
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md, phases/02-ml-fundamentals/15-time-series/code/time_series.py

```arch
node | raw | 1,1 | 原始序列 | 先画图
node | stat | 2,1 | 平稳性检查 | 滚动均值与标准差
node | diff | 3,1 | 差分 | 最多两轮
node | lags | 4,1 | 滞后特征 | t-1 或更早的值
node | wf | 4,2 | walk_forward_split | 训练早于测试
node | model | 3,2 | 模型 | Ridge、SimpleAR、ARIMA
node | base | 2,2 | 基线 | 持续性、季节朴素法
node | score | 1,2 | 评分 | MAE、RMSE、MAPE
edge | raw | stat |
edge | stat | diff | 漂移
edge | diff | lags |
edge | lags | wf |
edge | wf | model | 各折
edge | model | base | 必须超越
edge | base | score |
```

## 前向滚动验证
type: flow
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md

1. **训练**：使用截至 t 时刻的数据拟合。
2. **预测**：预测 t+1，多步时预测 t+1 至 t+k。
3. **滑动**：窗口向前移动。
4. **重复**：每个测试折都晚于它的全部训练数据。
5. **扩展窗口**：训练集增长。旧数据仍相关时使用。
6. **滑动窗口**：固定大小。世界变化、旧数据有害时使用。

## 代码任务
type: task-table
from: phases/02-ml-fundamentals/15-time-series/code/time_series.py

| 任务 | 代码 |
|---|---|
| 去除趋势 | `difference(series, order=1)` |
| 滚动统计与判定 | `check_stationarity(series, window=50)` |
| 指定滞后范围内的 ACF | `autocorrelation(series, max_lag=20)` |
| 序列转为 X 与 y | `make_lag_features(series, n_lags)` |
| 按时间排序的各折 | `walk_forward_split(n_samples, n_splits=5, min_train=50)` |
| 基于滞后特征的 AR | `SimpleAR(n_lags=5).fit_series(series)` |
| 递归多步预测 | `forecast(last_values, n_steps)` |
| 百分比误差，跳过零 | `mape(y_true, y_pred)` |

## 库实现
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md

```python
X, y = make_lag_features(series, n_lags=10)
for train_idx, test_idx in walk_forward_split(len(X)):
    model = Ridge(alpha=1.0)
    model.fit(X[train_idx], y[train_idx])
    predictions = model.predict(X[test_idx])
model = ARIMA(train_series, order=(5, 1, 2))      # p, d, q
fitted = model.fit()
forecast = fitted.forecast(steps=30)            # 向前预测 30 步
tscv = TimeSeriesSplit(n_splits=5)                # sklearn 前向滚动验证
scores = cross_val_score(model, X, y, cv=TimeSeriesSplit(n_splits=5))
```

## 核心定义
type: concepts
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md

- **组成**：趋势、季节性和残差。残差为白噪声，说明分解有效。
- **平稳**：均值、方差与自相关不随时间改变。
- **差分**：$\text{diff}[t] = \text{value}[t] - \text{value}[t-1]$
- **ACF**：序列与滞后副本的相关性。使用到相关性可忽略为止的滞后。
- **PACF**：去除更短滞后影响后，滞后 k 处的自相关。
- **ARIMA(p, d, q)**：p 个历史值，d 轮差分，q 个历史误差。
- **MAE / RMSE / MAPE**：平均绝对误差、均方根误差、百分比误差。
- **目标对齐**：目标在 t，所有特征使用 t-1 或更早数据。

## 选择方法
type: command-table
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md

| 命令 | 作用 |
|---|---|
| 滞后特征 + ML | 外部特征多。Boosting 是强起点 |
| ARIMA | 单个单变量序列、短期。季节性使用 SARIMA |
| 指数平滑 | 用 Holt-Winters 处理简单趋势与季节性 |
| 神经网络 | 长序列、大量序列 |
| 递归预测 | 将预测反馈为输入，适合 1-5 步 |
| 直接预测 | 每个预测跨度一个模型，适合长跨度 |
| 多输出 | 一个模型输出全部预测跨度 |

## 默认值与数值
type: defaults
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md, phases/02-ml-fundamentals/15-time-series/code/time_series.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `check_stationarity` 窗口 | 50 | 滚动窗口大小 |
| 均值偏移限制 | 0.5 | 序列标准差的倍数，比较前后两半 |
| 方差比限制 | 2.0 | 高于此值标为非平稳 |
| ADF p 值 | 0.05 | 低于此值拒绝非平稳假设 |
| `max_lag` | 20 | 自相关默认值 |
| `n_splits`、`min_train` | 5 | 首次测试前 min_train=50 行 |
| 滚动窗口 | 7 和 14 | 按天计算均值、标准差、最小和最大值 |
| 周季节性 | 滞后 7 | 也可能使用 14 |

## 错误与修正
type: troubleshooting
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md, phases/02-ml-fundamentals/15-time-series/code/time_series.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 随机划分 MSE 更低 | 未来数据泄漏 | 使用前向滚动或时间划分 |
| 回测近乎完美 | 纳入了 t 时刻特征 | 审核全部特征对齐 |
| 漏掉季节模式 | 测试集短于一个周期 | 留出完整季节周期 |
| 收入翻倍，模型滞后 | 绝对尺度改变 | 建模百分比变化 |
| 滞后过多导致过拟合 | 认为历史越多越好 | 根据 ACF 选滞后 |
| 线性模型漂移 | 未去除趋势 | 先差分，再建模 |
| 输给季节朴素法 | 泄漏、评估错误或随机序列 | 调参前先修 bug |
| 生产误差增加 | 世界变化 | 用近期数据重训 |

## 代码中的随机过程
type: annotated-code
lang: python
from: phases/01-math-foundations/22-stochastic-processes/code/stochastic.py, phases/01-math-foundations/22-stochastic-processes/docs/zh.md

```python
positions = random_walk_1d(n_steps, seed=None)    # 标准差按 sqrt(n) 增长
mc = MarkovChain(P, state_names=names)            # P 每行之和为 1
pi = mc.stationary_distribution()                 # 左特征向量，特征值为 1
states = mc.simulate(start_state=0, n_steps=100000, seed=42)
traj = langevin_dynamics(grad_U, x0, dt, temperature, n_steps)
samples, acc_rate = metropolis_hastings(
    target_log_prob=bimodal_log_prob,
    proposal_std=2.0, x0=np.array([0.0]), n_samples=100000, seed=42)
samples_flat = samples[10000:, 0]                 # 丢弃预热样本
```

## 随机游走与马尔可夫链
type: concepts
from: phases/01-math-foundations/22-stochastic-processes/docs/zh.md

- **随机游走**：均值 0，标准差 $\sqrt{n}$。10000 步约为 100。
- **马尔可夫性**：下一状态只依赖当前状态。
- **平稳分布**：$\pi P = \pi$。天气链得到 [0.55, 0.18, 0.27]。
- **收敛**：需要不可约、非周期链。
- **谱隙**：1 减第二特征值。间隙为 0.2 时约 5 步混合。
- **布朗运动一步**：$B(t + dt) = B(t) + \sqrt{dt} \, z$
- **Langevin**：$x_{t+1} = x_t - dt \, \nabla U(x_t) + \sqrt{2 T \, dt} \, z_t$
- **Metropolis-Hastings**：以 $\min(1, a)$ 接受，目标接受率约 23%。

## 时间中的异常
type: tips
from: phases/02-ml-fundamentals/16-anomaly-detection/docs/zh.md

- 90 度在夏季正常、冬季异常。上下文异常需要时间特征。
- 集体异常需要感知序列的方法。连续五十次登录失败属于攻击。
- 添加滚动统计、比率和距上次事件时间等特征。
- 30 天滚动统计要求评分时缓冲 30 天历史。
- 跟踪异常分数分布。固定阈值会逐渐过时。

## 问答
type: qa
from: phases/02-ml-fundamentals/15-time-series/docs/zh.md

- **为何不用 k 折？** 样本不独立，随机折会把未来泄漏到训练中。
- **差分多少次？** 多数真实序列最多需要两轮。
- **使用多少滞后？** 看 ACF。月度数据滞后 12 处有峰值表示年度季节性。
- **树模型需要差分吗？** 树模型可处理趋势，线性模型需要平稳性。
- **收入偏斜？** 在对数空间预测，再取指数。
- **先用哪个基线？** 最后值，然后季节朴素法，再移动平均。
