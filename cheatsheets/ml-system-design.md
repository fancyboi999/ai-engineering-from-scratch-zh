---
id: ml-system-design
title: ML 系统设计、漂移与特征存储
code: MS
subtitle: 明确任务，估算服务成本，超越基线，安全发布，检测漂移和训练与服务偏差。
hue: 220
sources: phases/02-ml-fundamentals/01-what-is-machine-learning, phases/02-ml-fundamentals/19-ml-system-design, phases/02-ml-fundamentals/20-model-monitoring-and-drift, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew
source_hash: 023b788954c55581
---

## 一份定义，两个读取端
type: architecture
from: phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/docs/zh.md

```arch
node | raw | 1,1 | 原始事件 |
node | reg | 2,1 | 注册表 | 特征定义
node | off | 3,1 | 离线存储 | 带时间戳的历史
node | pit | 4,1 | 时间点关联 | 标签到训练集
node | on | 3,2 | 在线存储 | 每个实体的最新值
node | serve | 2,2 | 服务请求 | 几毫秒
node | log | 2,3 | 已记录特征 | 服务时刻
node | skew | 4,3 | 偏差检查 | 各特征不匹配率
edge | raw | reg |
edge | reg | off | 回填
edge | off | pit |
edge | off | on | 物化
edge | on | serve |
edge | serve | log |
edge | log | skew |
edge | pit | skew |
```

## 从目标到安全上线
type: flow
from: phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md

1. **任务**：明确预测内容、实体、时间跨度及使用预测的决策。
2. **指标**：选模型前确定离线、在线、业务与护栏指标。
3. **基线**：简单基线、启发式基线和当前系统。先设定最低提升要求。
4. **数据**：检查标签来源、标签延迟及每个特征在预测时是否已存在。
5. **预算**：设定 p99 延迟、峰值 QPS、每日成本和陈旧度。
6. **影子运行**：新模型对线上流量副本评分。没有人使用它的输出。
7. **金丝雀**：对 1 至 5% 流量作真实决策。违反护栏就回滚。
8. **A/B 测试**：随机划分用户，通过统计检验衡量业务指标。

## 工具包调用
type: task-table
from: phases/02-ml-fundamentals/19-ml-system-design/code/main.py, phases/02-ml-fundamentals/20-model-monitoring-and-drift/code/main.py, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/code/main.py

| 任务 | 代码 |
|---|---|
| 预算内最便宜的方案 | `choose_serving(workload, costs)` |
| 相对最强基线的提升 | `compare_to_baselines(..., min_lift=0.02)` |
| 给设计文档评分 | `review_design_doc(doc, ready_score=0.85)` |
| 数值漂移，十分位分箱 | `psi(reference, current, bins=10)` |
| 最大 CDF 差距 | `ks_statistic(sample_a, sample_b)` |
| 分类漂移 | `chi_square_test(reference_counts, current_counts)` |
| 带 TTL 的时间点关联 | `point_in_time_join(labels, rows, ttl_days)` |
| 比较已记录特征 | `detect_skew(training, serving, features)` |

## 估算批量与在线服务成本
type: annotated-code
lang: python
from: phases/02-ml-fundamentals/19-ml-system-design/code/main.py

```python
refresh_hours = workload.max_staleness_hours - costs.batch_job_hours
if refresh_hours <= 0:                       # 任务时长超过限制
    return ServingPlan("batch", False, ...)
runs_per_day = 24.0 / refresh_hours
predictions = workload.entities * runs_per_day
dollars = (predictions / 1e6 * costs.batch_dollars_per_million
    + workload.requests_per_day / 1e6 * costs.lookup_dollars_per_million)
replicas = max(costs.min_replicas, math.ceil(workload.peak_qps / costs.replica_qps))
dollars = replicas * costs.replica_dollars_per_hour * 24.0   # 在线服务为空闲付费
feasible = costs.online_latency_ms <= workload.latency_budget_ms
```

## 命令
type: command-table
from: phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md, phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 用标准库运行各课演示 |
| `python3 code/main.py my_design_doc.json` | 评审自己的设计文档 |
| `stats.ks_2samp(reference_amounts, current_amounts)` | scipy 中的 KS 统计量和 p 值 |
| `stats.chi2_contingency(table)` | 卡方统计量、p 值和自由度 |
| `DummyClassifier(strategy="most_frequent")` | 多数类别基线 |
| `feast apply` | 在 Feast 中注册特征定义 |
| `feast materialize-incremental <end time>` | 将最新值复制到在线存储 |
| `store.get_historical_features(entity_df=...)` | 时间点正确的训练特征 |

## 漂移与偏差公式
type: concepts
from: phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md, phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md

- **协变量漂移**：`P(x)` 变化。输入监控可以发现。
- **先验漂移**：`P(y)` 变化。预测与结果监控可以发现。
- **概念漂移**：`P(y | x)` 变化。只有结果监控能发现。
- **PSI**：对各箱求和 $\sum (\text{current} - \text{reference}) \cdot \ln(\text{current} / \text{reference})$。
- **KS D**：两个经验 CDF 的最大差距。相同时为 0，无重叠时为 1。
- **Cramér's V**：两行表中 chi2 / grand_total 的平方根。
- **Little 定律**：处理中数量 = 吞吐量乘延迟。400 rps、50 ms 对应 20。
- **提升**：模型分数减去最强基线分数。

## 默认值与数值
type: defaults
from: phases/02-ml-fundamentals/20-model-monitoring-and-drift/code/main.py, phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `family_alpha` | 0.01 | Bonferroni，两个检验各为 0.005 |
| `psi_warn` | 0.10 | PSI 低于 0.1 为稳定 |
| `psi_drift` | 0.25 | 高于 0.25 表示显著变化 |
| `ks_drift` | 0.10 | D 须超过阈值且 p 低于 alpha |
| `min_cramers_v` | 0.10 | 分类数据的效应量 |
| `patience` | 2 | 告警前连续漂移窗口数 |
| `window_size` | 500 | step=250, label_delay=500 |
| PSI 比例裁剪 | 0.0001 | 防止对数无穷大 |

## 故障与修正
type: troubleshooting
from: phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md, phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 模型服务超时 | 未规划失败处理 | 使用启发式基线 |
| 夜间批处理失败 | 分数缺失 | 先提供最后良好分数，再回退规则 |
| 分数分布突变 | 大规模错误决策 | 暂停操作并通知人员 |
| 输入漂移，准确率稳定 | 协变量漂移 | 通常无需动作。监测结果 |
| 准确率下降，输入稳定 | 概念漂移 | 收集新标签后重训 |
| 离线 0.948，线上更差 | 普通关联读取了未来行 | 使用时间点关联 |
| 服务默认 -1，训练默认 365 | 两条代码路径 | 使用同一注册表定义 |
| 每天 60 次误报 | 50 个特征每小时以 0.05 检验 | 使用 Bonferroni、效应量和持续性 |

## 缩写
type: glossary
from: phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md, phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/docs/zh.md

- **PSI**：总体稳定性指数，源自信用评分。
- **KS**：Kolmogorov-Smirnov。基于 CDF 的双样本检验，无需分箱。
- **TTL**：存活时间。更旧的值视为缺失。
- **QPS**：每秒查询数。按峰值而非平均值规划容量。
- **p99**：100 个请求中 99 个不超过的延迟。
- **CBPE**：基于置信度的性能估计，对概念漂移无效。

## 问答
type: qa
from: phases/02-ml-fundamentals/01-what-is-machine-learning/docs/zh.md, phases/02-ml-fundamentals/19-ml-system-design/docs/zh.md, phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew/docs/zh.md, phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/zh.md

- **何时不该使用 ML？** 简单规则已可行、无标签、无人采取行动，或一次错误也不能接受时。
- **为何不选 AUC？** 它对不会使用的阈值取平均。应匹配实际决策。
- **如何划分数据？** 训练 60-80%、验证 10-20%、测试 10-20%。留出最新时段。
- **如何打破反馈循环？** 保留永不接受干预的随机留出组。
- **如何找到偏差原因？** 比较在线读取、重新计算和第二条代码路径。
- **重训后做什么？** 在近期标签上测试，影子运行、金丝雀，再重置参考窗口。
