# 生产环境中的模型监控 —— 数据漂移与概念漂移

> 部署上线的模型往往在没有任何报错信息的情况下悄然失效。当外部现实世界与训练集分布渐行渐远时，模型依然在正常返回预测分数，唯有建立完备的监控体系才能捕捉这种落差。

**类型：** 构建
**语言：** Python
**前置要求：** 阶段 2，第 09 课（模型评估）、第 16 课（异常检测）与第 19 课（ML 系统设计）
**预计时间：** ~110 分钟

## 学习目标

- 建立四个层级的监控信号：系统健康度、输入特征、预测输出与真实结果。
- 依据联合概率分布中发生变动的因子，准确区分协变量漂移、先验漂移与概念漂移。
- 纯 Python 从零实现群体稳定性指标（PSI）、双样本 Kolmogorov-Smirnov 检验统计量以及卡方独立性检验。
- 掌握固定基准窗口与滑动当前窗口的设计权衡，理解窗口大小对噪声灵敏度与报警延迟的影响。
- 设计兼顾效应量门槛、多重假设检验校正与持续性规则的告警策略，有效压制误报。
- 针对不同类型的漂移做出合理的工程决策：何时需要模型重训、何时需要重新收集标签，以及何时无需采取行动。

## 问题背景

一个支付风控模型以 95% 的准确率正式上线。两个月后，一场市场营销活动为平台吸引了大量偏好大额购物车消费的应用新用户；四个月后，黑产诈骗团伙改变了洗钱手法，此前一贯被判定为安全的支付行为开始频繁出现信用卡拒付（Chargeback）。

在整个过程中，模型推理服务对每一个到来的请求都正常返回 HTTP 200，服务延迟一切平稳，日志中没有产生任何报错异常。业务团队遭遇问题的第一道信号，竟然是数周后财务部门送来的巨额欺诈拒付损失报告。

传统软件工程监控只验证服务是否可达，而机器学习模型监控必须核验服务给出的答案是否依然正确，以及当前承接的数据分布是否依然与当初训练模型的数据一致。本课将从数学原理出发手写相关统计检验算法、设计时间窗口切分机制与防误报告警策略，并在一组注入了两类分布突变的人工合成数据流上实跑验证，观察各个监控器对不同漂移的响应表现。

## 核心概念

### 应该监控什么

在四个层级上建立指标监控。前三个层级提供早期预警，唯有第四个层级能真正度量模型的预测正确性，但其反馈往往存在不可忽视的时间延迟。

| 层级 | 关键信号指标 | 数据可得性 | 解答的核心问题 |
|---|---|---|---|
| 系统健康度 | p50 与 p99 延迟、错误率、吞吐量（QPS/RPM）、内存占用 | 实时即得 | 推理服务是否活着并正常响应？ |
| 输入特征 | 单特征边缘分布、缺失值比例、Schema 合规性、未知新类别 | 实时即得 | 线上实时数据与当初的训练集还像吗？ |
| 预测输出 | 分数分布、正类预测占比、触发默认兜底规则的比例 | 实时即得 | 模型的打分行为是否保持一贯水准？ |
| 真实业务结果 | 准确率、精准率、模型概率校准度、业务 KPI | 标签延迟回流后 | 模型的预测判断在现实中是否依然正确？ |

输入特征监控是本课探讨的核心重点，因为在真实标签回流之前，它是我们唯一能够依赖的抓手。但正如稍后的演示所揭示的，输入监控存在其天然的理论上限：某些严重故障根本不会改变输入特征分布。

### 三类数据漂移

将输入特征 $x$ 与真实标签 $y$ 的联合概率分布展开写为两种条件概率形式：

```math
P(x, y) = P(x) \cdot P(y \mid x) = P(y) \cdot P(x \mid y)
```

每种漂移类型对应着不同因子的变动：

| 漂移类型 | 改变的部分 | 保持不变的部分 | 支付风控示例 | 哪层监控能捕捉 |
|---|---|---|---|---|
| 协变量漂移（Covariate drift） | $P(x)$ | $P(y \mid x)$ | 营销活动带来了更多高客单价的用户 | 输入特征监控 |
| 先验漂移（Prior drift / Label shift） | $P(y)$ | $P(x \mid y)$ | 黑产集中发起攻击，欺诈率翻倍，但单笔欺诈行为模式不变 | 预测输出与结果监控 |
| 概念漂移（Concept drift） | $P(y \mid x)$ | $P(x)$ 可保持不变 | 同样的消费金额与类目现在面临完全不同的被盗刷概率 | 仅真实结果监控能看见 |

Gama 等人在经典综述中将 $P(y | x)$ 的变动称为真实概念漂移（Real concept drift），而将仅改变 $P(x)$ 却不影响 $P(y | x)$ 的变动称为虚拟漂移（Virtual drift）。该综述还根据时间演进维度将漂移划分为突发型（Sudden）、增量型（Incremental）、渐变型（Gradual）以及周期重现型（Reoccurring）。

协变量漂移并不一定会削弱模型性能。如果模型在全局范围内对条件概率 $P(y | x)$ 的拟合足够精准，那么对于任何输入它依然能够做出正确判断。但如果线上流量滑入了原本训练样本极度稀缺的空白区间，或者大量聚集在决策分类边界附近，模型的综合准确率依然可能出现下滑。

### 延迟回流的标签（Delayed Labels）

真实业务结果总是晚于预测动作发生。标签的延迟时间高度取决于具体的业务场景：

| 业务场景 | 真实标签回流所需时间 |
|---|---|
| 广告点击预估（CTR） | 数秒到数分钟 |
| 30 天内客户流失预测 | 30 天 |
| 信用卡盗刷欺诈检测 | 等待持卡人向银行发起拒付申诉，通常需要数周甚至数月 |
| 银行信贷违约预测 | 数月到数年 |

在标签回流前的这扇时间窗口内，你手中只有输入特征和预测分数，没有任何真实答案。因此必须全程对输入与输出保持高敏监控，待标签回流后，再针对这部分带标签的样本追溯评估结果指标。本课的演示代码设置了 500 个事件的标签延迟，意味着真实结果监控永远是在观察 500 个事件之前的历史表现。

### 基准窗口与当前窗口

任何统计漂移检验都是在比对两组样本切片：

- **基准窗口（Reference window）。** 训练集数据，或者人工抽检确认正常的某段生产历史区间。在重新训练模型之前保持固定不变。
- **当前窗口（Current window）。** 线上最近期的实时切片，既可以固定为最近的 $N$ 个事件，也可以设定为最近的 $T$ 小时。

滑动窗口（Sliding window）以小于窗口尺寸的步长逐步向前滑动，相邻窗口之间存在样本重叠；滚动窗口（Tumbling window）每次跳跃步长等于窗口大小，前后互不重叠。窗口大小是一场经典的工程权衡：较小的窗口反应灵敏，但容易把随机统计噪声误判为漂移；较大的窗口统计特性稳定，但会不可避免地带来报警滞后。

周期性波动会轻易破坏朴素的窗口统计。周一的访问行为与周六存在显著差异，因此基准窗口必须覆盖完整的 7 天周期，或者始终将当前窗口与上一周期的同等时间段进行纵向比对。

### 群体稳定性指标（PSI）

PSI（Population Stability Index）源于银行信贷评分风控体系。它将基准数据切分为若干分箱（通常为 10 个等频分箱，即按基准十分位数切分），确保每个分箱在基准中各占 10% 的样本量。随后统计当前窗口的数据在各分箱中的实际占比，并计算加权和：

```math
\text{PSI} = \sum_{\text{bins}} (\text{current\_share} - \text{reference\_share}) \cdot \ln\left(\frac{\text{current\_share}}{\text{reference\_share}}\right)
```

某个分箱占比为零会导致对数项发散到负无穷，因此必须对所有占比做极小值平滑截断（如截断为 0.0001）。PSI 在形式上具备对称性，数学上等价于当前分布相对基准分布的 KL 散度与基准分布相对当前分布的 KL 散度之和。

业界约定俗成的判定区间为：PSI 小于 0.1 说明分布稳定；0.1 到 0.25 提示发生轻度到中度偏移；大于 0.25 则表明发生了显著漂移。应将这些区间视为经验法则而非严格的假设检验。PSI 的数值大小受分箱数量影响，且随样本量增加略有变化。在演示中，样本量为 500 且无漂移的正常窗口得分普遍稳定在 0.01 到 0.04 之间。

### Kolmogorov-Smirnov 检验统计量

双样本 KS 检验统计量 $D$ 定义为两个经验累积分布函数（ECDF）之间的最大垂直绝对距离：

```math
D = \max_x \left\lvert F_{\text{reference}}(x) - F_{\text{current}}(x) \right\rvert
```

若两组样本完全相同，则 $D = 0$；若两组样本的取值区间完全无交集，则 $D = 1$。它完全无需手动分箱。其 p-value 可以通过有效样本量 $n \cdot m / (n + m)$ 下的极限 Kolmogorov 分布计算得出。

然而在超大数据量下，微不足道的微小差异也会导致 p-value 坍缩为 0。当每组窗口包含 100 万条数据时，仅偏移 0.02 个标准差就能取得极其“显著”的 p-value。因此必须将统计量 $D$ 本身视作效应量（Effect size），唯有当 $D$ 的绝对数值与 p-value 均突破预设阈值时才允许触发告警。

### 类别特征的卡方独立性检验

针对支付渠道等离散类别特征，可以构建一个两行（第一行为基准频数，第二行为当前窗口频数）、$k$ 列（对应各个离散类别）的列联表。每个单元格的期望频数根据行合计与列合计计算：

```math
\begin{aligned}
\text{expected}[r][c] &= \text{row\_total}[r] \cdot \text{column\_total}[c] / \text{grand\_total} \\
\text{chi2} &= \sum_{\text{cells}} (\text{observed} - \text{expected})^2 / \text{expected}
\end{aligned}
```

该检验具有 $k - 1$ 个自由度。如果在当前窗口中出现了从未见过的全新类别，该单元格会贡献极大的卡方值，因此卡方检验对未知枚举值的出现极其敏锐。Cramér's V 用于度量其效应量大小，对于两行列表，它直接等于 $\sqrt{\chi^2 / \text{总样本数}}$。

### 告警阈值与防误报策略

任何统计检验在原假设成立（毫无变化）的情况下都存在预设的假阳性误报率 $\alpha$。如果线上对 50 个特征每小时执行一次 $\alpha = 0.05$ 的检验，在数据完全正常的静默期，系统每天预计也会产生约 60 次虚假告警。工程师早就对这类狼来了式的报警麻木疲劳。

四条核心准则能让告警重新具备可信度：

1. **多重假设检验校正。** 使用 Bonferroni 校正，将总显著性水平 $\alpha$ 除以检验的特征总数。演示中使用全局族 $\alpha = 0.01$，平分到 2 个检验特征后，单项特征检验的阈值为 0.005。
2. **强制校验效应量下限。** 唯有当 PSI、$D$ 或 Cramér's V 同样突破预设的绝对距离下限时才允许告警。
3. **引入持续性确认机制（Persistence）。** 必须连续 $k$ 个窗口均确认触发漂移后才向外发送告警（演示中采用 $k = 2$）。
4. **严格隔离警告与告警。** 警告（Warning）只汇总上报到监控仪表盘供大盘巡检；真正的告警（Alert）才触发值班人员寻呼。

演示中直观展现了准则 2 的价值：某个完全正常的干净窗口算出了 0.0009 的卡方 p-value（低于单项 $\alpha$），但其 Cramér's V 不足 0.1，因此系统仅记为 Warning，并未盲目发出 Alert。

### 模型重训练触发时机

重训练通常由三种机制触发：

- **定时周期调度。** 每周或每月定时全量重训。操作简单，但无漂移时白白浪费算力，真正发生突变时又反应迟钝。
- **特征漂移触发。** 当核心特征的输入漂移持续突破阈值时自动触发。
- **业务效果劣变触发。** 当真实业务指标跌破基准水平超过一定容差时触发。

漂移的具体类型决定了重训练是否有效：

| 漂移类型 | 有效应对措施 |
|---|---|
| 协变量漂移，但准确率保持平稳 | 通常无需干预。持续盯紧业务指标即可。 |
| 协变量漂移进入低样本密度盲区 | 在包含该盲区分布的近期新样本上启动重训。 |
| 先验漂移 | 重新校准预测概率分数，或调整下游分类决策阈值。 |
| 概念漂移 | **必须优先收集最新标注数据**。在旧标签上重训只会让模型再次死记硬背已经失效的旧规律。 |

模型重新训练完成后，必须在最近期的标注数据上重新做完备离线评估，走影子部署与金丝雀灰度，并将监控的基准窗口同步重置为最新训练集。

```figure
mlprod-drift-psi
```

## 动手构建

`code/main.py` 中的代码仅依赖 Python 标准库。

### 第 1 步：分位数分箱与 PSI 计算

分箱边界基于基准数据的十分位数生成，使用 `bisect_right` 快速确定当前数值落入的分箱编号。

```python
def quantile_edges(reference: list[float], bins: int = 10) -> list[float]:
    ordered = sorted(reference)
    n = len(ordered)
    edges = [ordered[min(n - 1, (n * i) // bins)] for i in range(1, bins)]
    return sorted(set(edges))


def psi_from_fractions(expected: list[float], actual: list[float], eps: float = 1e-4) -> float:
    total = 0.0
    for e, a in zip(expected, actual):
        e, a = max(e, eps), max(a, eps)
        total += (a - e) * math.log(a / e)
    return total
```

### 第 2 步：KS 统计量与其 p-value

同时双指针遍历两个排序后的样本。在每个不同数值处越过该数值在两组样本中的所有重复副本，随后比对二者的经验累积分布之差，正确处理重复值绑定（ties）。

```python
def ks_statistic(sample_a: list[float], sample_b: list[float]) -> float:
    a, b = sorted(sample_a), sorted(sample_b)
    n, m = len(a), len(b)
    i = j = 0
    d = 0.0
    while i < n and j < m:
        x = min(a[i], b[j])
        while i < n and a[i] <= x:
            i += 1
        while j < m and b[j] <= x:
            j += 1
        d = max(d, abs(i / n - j / m))
    return d
```

p-value 依据 Kolmogorov 分布的展开级数计算：$2 \sum_{k=1}^\infty (-1)^{k-1} e^{-2 k^2 \lambda^2}$，其中 $\lambda = \sqrt{n \cdot m / (n + m)} \cdot D$。

### 第 3 步：卡方独立性检验

`chi2_sf` 通过正则化不完全伽马函数计算卡方生存函数，在小参数下采用级数展开，在大参数下采用连分数逼近。`chi_square_test` 构建双行列表，计算卡方值并产出 p-value 与 Cramér's V。

```python
def chi_square_test(reference_counts: dict[str, int], current_counts: dict[str, int]) -> ChiSquareResult:
    categories = [c for c in sorted(set(reference_counts) | set(current_counts))
                  if reference_counts.get(c, 0) + current_counts.get(c, 0) > 0]
    rows = [[reference_counts.get(c, 0) for c in categories], [current_counts.get(c, 0) for c in categories]]
    row_totals = [sum(r) for r in rows]
    grand = sum(row_totals)
    if len(categories) < 2 or 0 in row_totals:
        return ChiSquareResult(0.0, 0, 1.0, 0.0)
    statistic = 0.0
    for col, _ in enumerate(categories):
        col_total = rows[0][col] + rows[1][col]
        for r in range(2):
            expected = row_totals[r] * col_total / grand
            statistic += (rows[r][col] - expected) ** 2 / expected
    dof = len(categories) - 1
    return ChiSquareResult(statistic, dof, chi2_sf(statistic, dof), math.sqrt(statistic / grand))
```

### 第 4 步：窗口切分与漂移监控器

`SlidingWindow` 基于 `deque` 维护固定容量的滑动历史数据。`DriftMonitor` 负责在启动时拟合基准分箱与频数分布，其 `check` 方法为每个数值特征输出 PSI、$D$ 和 KS p-value，为每个离散特征输出卡方检验结果。

### 第 5 步：告警状态机策略

告警策略将每组指标映射为状态级别，并维护各信号连续出现漂移的计数：

```python
def level(self, metrics: dict[str, float]) -> str:
    if "psi" in metrics:
        if metrics["psi"] >= self.psi_drift or (metrics["ks"] >= self.ks_drift and metrics["ks_p"] < self.alpha):
            return "drift"
        return "warn" if metrics["psi"] >= self.psi_warn else "ok"
    if metrics["p"] < self.alpha and metrics["v"] >= self.min_cramers_v:
        return "drift"
    return "warn" if metrics["p"] < self.alpha else "ok"
```

当连续漂移达到持续性阈值时输出 `ALERT`，并在报警后的首个恢复正常的窗口触发 `resolved` 状态。

### 第 6 步：注入漂移的数据流

流中包含 9000 条支付事件，包含交易金额 `amount`、支付渠道 `channel` 以及欺诈标签 `label`。由四个阶段合成构造：

| 事件区间 | 交易金额分布 | 渠道比例（App, 门店, 网页） | 打标决策边界 | 注入的漂移类型 |
|---|---|---|---|---|
| 0 到 2999 | 均值 100, 标准差 20 | 35%, 15%, 50% | 120 | 正常基准阶段 |
| 3000 到 4999 | 均值 118, 标准差 24 | 60%, 10%, 30% | 120 | 协变量漂移 |
| 5000 到 6499 | 均值 100, 标准差 20 | 35%, 15%, 50% | 120 | 恢复正常分布 |
| 6500 到 8999 | 均值 100, 标准差 20 | 35%, 15%, 50% | 105 | 概念漂移 |

模型是在前 2000 个事件上拟合的金额阈值模型。窗口大小为 500，滑动步长为 250，真实标签延迟 500 个事件回流。

```bash
python3 phases/02-ml-fundamentals/20-model-monitoring-and-drift/code/main.py
```

```console
  end    PSI   KS D   chi2 p    acc  levels (amount/channel/accuracy)  events
 3000  0.010  0.041  3.0e-01  0.932  ok/ok/ok
 3250  0.152  0.163  7.6e-06  0.924  drift/warn/ok
 3500  0.463  0.298  2.8e-26  0.936  drift/drift/ok                     ALERT amount
 3750  0.609  0.343  3.5e-35  0.942  drift/drift/ok                     ALERT channel
 ...
 5500  0.026  0.044  2.6e-01  0.898  ok/ok/ok                           resolved amount, resolved channel
 ...
 7250  0.040  0.048  7.1e-01  0.848  ok/ok/drift
 7500  0.022  0.039  6.1e-01  0.778  ok/ok/drift                        ALERT accuracy
```

我们可以将运行结果清晰地分为三部分解读：

- **协变量漂移阶段。** 漂移在事件 3000 注入，金额 `amount` 告警随后在 3500 触发。但由于底层真实打标规则未变，模型准确率依然稳定维持在 0.89 到 0.95 之间。
- **恢复阶段。** 输入分布在事件 5000 回归正常，两个输入特征的告警在 5500 顺畅解除。
- **概念漂移阶段。** 漂移在 6500 注入，此时输入监控静默无声，因为特征自身毫无变化。模型准确率从 0.946 暴跌至 0.76~0.79 之间。系统最终在 7500 触发了准确率告警（距突变滞后 1000 个事件，其中 500 个事件源于真实的标签到达延迟）。

## 实际使用

**scipy 生态对照。** `scipy.stats` 内置了上述两项检验，其计算结果与我们手写的算法一致（本课不依赖 scipy 运行）：

```python
from scipy import stats

result = stats.ks_2samp(reference_amounts, current_amounts)
print(result.statistic, result.pvalue)

table = [[1000, 700, 300], [140, 290, 70]]
chi2 = stats.chi2_contingency(table)
print(chi2.statistic, chi2.pvalue, chi2.dof)
```

我们将手写实现的 `ks_statistic` 与 `chi_square_test` 在随机样本上与 scipy 1.18.1 进行了严格数值对齐验证。在双精度浮点精度下，卡方统计量、卡方 p-value 与 KS 统计量完全一致。

差异主要源于有限样本的处理方式：我们的轻量实现基于极限 Kolmogorov 分布，而 `ks_2samp` 在样本量小于等于 10,000 时默认采用精确组合算法；且在两类别情况下，scipy 的 `chi2_contingency` 默认启用了 Yates 连续性校正。

**工业级开源监控库。** 业界若干成熟库将这些测试算法包装为开箱即用的报表与仪表盘系统：

- **Evidently** 针对不同数据类型自动选择检验方法：在样本量较小时使用 KS 与卡方检验，在超大数据集上切换至 Wasserstein 距离（推土机距离）和 JS 散度（阈值设为 0.1），同时支持手动配置 PSI。
- **NannyML** 支持在标签回流前估算模型性能。其基于置信度的性能估算（CBPE）依赖校准良好的预测概率。NannyML 官方文档明确指出：CBPE 能够应对协变量漂移，但对概念漂移无能为力。本课演示流直观印证了这一点：概念漂移唯有依靠标签才能发现。
- **TensorFlow Data Validation（TFDV）** 比对连续时间跨度的数据切片，采用切比雪夫距离（L-infinity）评估类别特征，采用近似 JS 散度评估数值特征，并支持训练集与线上服务特征之间的一致性校验（即下节特征工程课的内容）。

对于大模型工程应用，基础设施阶段的[大模型可观测性课程](../../../17-infrastructure-and-production/13-llm-observability/docs/zh.md)深入剖析了链路追踪与自动化评估平台。本课介绍的数学统计方法同样完全适用于监控大模型的输入 Prompt 特征与输出 Token 分布。

## 拿去用

本课交付的产物为 `outputs/skill-drift-monitoring.md`。该 Skill 能够指导团队为新上线的模型设计多层级监控策略，并在生产发生漂移报警时提供标准化的排查分诊指南，辅助决策当前应当观望、重新校准阈值、紧急收集新标签还是启动模型重训。

## 练习

1. 分别使用容量为 200 和 2000 的窗口重新运行演示数据流。记录事件 3000 之前的虚警次数以及漂移发生后的报警滞后量。
2. 将告警策略参数调整为 `n_tests=1`、`patience=1` 且 `min_cramers_v=0`。观察在 5000 到 6500 的干净恢复阶段产生了多少次误报。
3. 新增一个均值每 100 个事件线性增加 0.01 的平缓漂移特征。比较 PSI 与 KS 检验谁先触发警告。
4. 在相同的十分位分箱上实现 JS 散度（Jensen-Shannon distance），并在每个滑动窗口上与 PSI 的数值走势进行对比。
5. 为模型的正类预测占比新增一个监控器，并解释为何在事件 6500 发生概念漂移时该监控指标依旧完全保持静默。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 数据漂移（Data drift） | "数据变了" | 输入特征、预测输出或标签的统计分布相较于基准窗口发生显著改变 |
| 协变量漂移（Covariate drift） | "来了新用户" | 输入特征边缘分布 $P(x)$ 改变，但输入与真实标签的关系 $P(y \mid x)$ 保持不变 |
| 先验漂移（Prior drift） | "正样本比以前多" | 标签边缘分布 $P(y)$ 改变，但各类别下的特征模式 $P(x \mid y)$ 不变，亦称标签漂移 |
| 概念漂移（Concept drift） | "游戏规则变了" | 条件概率分布 $P(y \mid x)$ 发生改变，相同的输入在现实中对应着不同的正确答案 |
| 基准窗口（Reference window） | "对照样本" | 一段固定的纯净基线样本切片（通常取自训练集），所有当前窗口均与其做横向比对 |
| PSI | "稳定性评分" | 各分箱中 (当前占比 - 基准占比) 乘以对数比率的对称加权求和指标 |
| KS 统计量 | "KS 检验" | 两个经验累积分布函数（ECDF）之间的最大垂直绝对距离 $D$ |
| Cramér's V | "类别效应量" | 归一化到 0 到 1 之间的卡方独立性检验效应量度量指标 |
| 标签延迟（Label delay） | "真值很久以后才到" | 模型做出预测到业务端真正收集到该样本真实答案之间的时间差 |
| 告警疲劳（Alert fatigue） | "报警太多没人看" | 误报过多导致值班人员对所有告警产生麻木并最终忽视真实严重故障 |

## 延伸阅读

- [Gama et al., A Survey on Concept Drift Adaptation (ACM Computing Surveys, 2014)](https://research.tue.nl/en/publications/a-survey-on-concept-drift-adaptation)：真实漂移与虚拟漂移、各类时间演进形态与自适应算法
- [Rabanser, Günnemann, and Lipton, Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift (NeurIPS 2019)](https://arxiv.org/abs/1810.11953)：用于数据集偏移检测的双样本检验实证对比
- [Lu et al., Learning under Concept Drift: A Review (2020)](https://arxiv.org/abs/2004.05785)：概念漂移的检测、理解与模型自适应综述
- [Yurdakul, Statistical Properties of Population Stability Index (Western Michigan University, 2018)](https://scholarworks.wmich.edu/dissertations/3208/)：PSI 随样本量与分箱数量变化的统计特性数学推导
- [scipy.stats.ks_2samp 官方文档](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html)：双样本 KS 检验的精确与渐近 p-value 计算实现
- [Evidently, 数据漂移检测原理](https://docs.evidentlyai.com/metrics/explainer_drift)：依据列类型与数据规模自动化选择检验算法的工业界实践
- [NannyML, 性能预估原理](https://nannyml.readthedocs.io/en/stable/how_it_works/performance_estimation.html)：CBPE 算法推导及其适用边界假设
