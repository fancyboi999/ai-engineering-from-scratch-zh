---
id: progressive-delivery
title: LLM 的影子、金丝雀与 A/B 测试
code: SC
subtitle: 影子运行、金丝雀门禁、快速回滚、序贯 A/B 测试、混沌保护与配置漂移报告。
hue: 28
sources: phases/17-infrastructure-and-production/20-shadow-canary-progressive, phases/17-infrastructure-and-production/21-ab-testing-llm-features, phases/17-infrastructure-and-production/24-chaos-engineering-llm, projects/configuration-drift-explainer
source_hash: 329b493a69a2e8cb
---

## 发布顺序
type: flow
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md

1. **影子运行**：候选模型接收生产请求副本。输出进入日志，不发送给用户。
2. **影子日志**：比较输出差异。记录 token 数、延迟、拒绝与错误。
3. **金丝雀发布**：流量依次切至 1%、10%、25%、50%、75%、100%。
4. **门禁**：每步每 5 至 15 分钟检查五项指标。
5. **A/B**：可选。新模型差异明显时，在 50% 流量阶段执行。
6. **晋级**：所有金丝雀门禁通过后升至 100%。
7. **回滚**：恢复开关，将固定摘要设回上一模型。

## 模拟器中的金丝雀门禁
type: defaults
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/code/main.py, phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `STAGES` | 0.01, 0.10, 0.25, 0.50, 0.75, 1.00 | 六档流量比例 |
| `latency_p99_ms` | 1.5 | 基线 900 ms |
| `cost_per_req` | 1.2 | 基线 0.02。高于基线 20% 即越界 |
| `error_rate` | 2.0 | 5xx 加显式拒绝 |
| `output_len_p99` | 1.4 | 基线 450 token |
| `thumbs_down_rate` | 1.5 | 基线 0.03 |
| `rng.uniform` 噪声 | 0.92, 1.08 | 每项测量指标的噪声 |

## 运行实验
type: task-table
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/code/main.py, phases/17-infrastructure-and-production/21-ab-testing-llm-features/code/main.py, phases/17-infrastructure-and-production/24-chaos-engineering-llm/code/main.py

| 任务 | 代码 |
|---|---|
| 第 20 课金丝雀模拟器 | `code/main.py` |
| 注入 25% 成本回归 | `Regression(cost_mult=1.25)` |
| 注入 80% 延迟回归 | `Regression(latency_mult=1.80)` |
| 对一个阶段检查门禁 | `check_gates(metrics)` |
| 第 21 课序贯 A/B 模拟器 | `code/main.py` |
| 80% 统计功效的样本量 | `fixed_sample_size(baseline, lift)` |
| 模拟 5% 提升 | `simulate(0.03, 0.0315)` |
| 第 24 课混沌运行器 | `run_experiment(e)` |

## 发布与 A/B 术语
type: concepts
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md, phases/17-infrastructure-and-production/21-ab-testing-llm-features/docs/zh.md

- **影子模式**：不影响用户。属于冒烟测试，不是质量测试。
- **金丝雀**：带指标门禁、逐步面向真实用户发布。
- **非确定性**：相同输入各次运行的准确率波动可达 15%。
- **策略开关**：通过配置回滚。耗时几秒，而非几小时。
- **模型固定**：使用不可变注册表摘要，不会自动升级。
- **评估与 A/B**：评估问“模型能完成工作吗？”A/B 问“用户在意吗？”
- **CUPED**：回归消除实验前方差，通常减少 30-70%。
- **SRM**：样本比例不匹配。50/50 分流得到 47/53，说明分配有问题。

## 序贯停止规则
type: annotated-code
lang: python
from: phases/17-infrastructure-and-production/21-ab-testing-llm-features/code/main.py

```python
required = fixed_sample_size(baseline, lift)  # 功效 80%，alpha 0.05
adjusted = int(required * 1.4)  # LLM 非确定性缓冲
if n_a > 100 and n_b > 100 and sequential_stopped_at is None:
    z = z_statistic(success_a, n_a, success_b, n_b)
    n_total = n_a + n_b
    threshold = math.sqrt(2 * math.log(1 / 0.05) + math.log(n_total))  # 随 log(n) 增长
    if abs(z) > threshold:
        sequential_stopped_at = n_total  # 胜出者明确时提前停止
```

## 混沌平面
type: architecture
from: phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/zh.md

```arch
node | control | 1,1 | 控制平面 | 实验调度器 | process
node | target | 2,1 | 目标平面 | 服务、pod、数据存储 | process
node | obs | 2,2 | 可观测性平面 | trace-ID 关联 | store
node | safety | 1,2 | 安全平面 | 紧急开关、预算门禁 | process
node | feedback | 3,2 | 反馈循环 | SLO、运行手册、代码修正 | store
edge | control | target | 注入故障
edge | target | obs | 指标、轨迹、日志
edge | obs | safety | 消耗速率
edge | safety | control | 中止
edge | obs | feedback | 发现
```

## 混沌运行器实验
type: command-table
from: phases/17-infrastructure-and-production/24-chaos-engineering-llm/code/main.py

| 命令 | 作用 |
|---|---|
| `ERROR_BUDGET_PER_DAY = 0.001` | 99.9% SLO |
| `EXPECTED_ERROR_RATE = 0.0005` | 基线错误率 |
| `burn_rate > 2.0` | 中止规则的前半部分 |
| `e.blast_radius_pct > 0.2` | 后半部分。两者必须同时成立 |
| `pod kill (1 decode replica)` | 5 min，影响范围 5%。完成 |
| `provider 429 fallback` | 5 min，影响范围 30%。中止 |
| `malformed prompt tokenizer stall` | 3 min，影响范围 10%。完成 |

## 漂移解释器命令
type: command-table
span: 2
from: projects/configuration-drift-explainer/README.md

| 命令 | 作用 |
|---|---|
| `go run . --input fixtures/config.json --out /tmp/drift.json` | 将漂移报告写入文件 |
| `go build -o /tmp/drift-explainer .` | 构建二进制文件 |
| `/tmp/drift-explainer --input fixtures/config.json --check` | 有漂移时返回 2 |
| `python3 scripts/project_test.py configuration-drift-explainer --init <work>` | 创建新起步项目 |
| `python3 scripts/project_test.py configuration-drift-explainer --stage 1 --path <work> --strict` | 评测一个阶段 |
| `python3 scripts/project_test.py configuration-drift-explainer --all --solution --strict` | 评测参考解答 |

## 漂移报告
type: concepts
from: projects/configuration-drift-explainer/solution/main.go, projects/configuration-drift-explainer/README.md

- **输入**：`layers`、`observed` 与可选 `sensitive`。后面的层优先。
- **equal**：生效值与观测值匹配。
- **changed**：用 `reflect.DeepEqual` 比较时值不同。
- **missing**：层中声明了键，观测配置没有该键。
- **unexpected**：观测配置中存在任何层都未声明的键。
- **历史**：按顺序列出所有设置过该键的层。被覆盖值仍保留。
- **脱敏**：password、secret、token、api-key 和 credential 名称对应值变为 `[REDACTED]`。
- **输出**：`schemaVersion` 为 1。文件权限 `0600`，仅所有者可访问。

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md, phases/17-infrastructure-and-production/21-ab-testing-llm-features/docs/zh.md, phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/zh.md, projects/configuration-drift-explainer/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 切换一天后成本上升 40% | 没有影子或金丝雀步骤 | 先影子运行。将成本门禁设为高于基线 20% |
| 回滚耗时 3 小时 | 回滚需要重新部署 | 切换策略开关，固定旧摘要 |
| 金丝雀门禁误报 | 门禁低于噪声底 | 将门禁设在噪声底之上 |
| 1% 流量时反馈门禁噪声大 | 每窗口仅 50-150 个数据点 | 每步停留更久 |
| 50/50 分流得到 47/53 | SRM，分配有问题 | 先修正分配哈希 |
| A/B 始终未达显著性 | 非确定性降低有效样本量 | 样本量乘以 1.3 至 1.5 |
| 服务商 429 后内存不足 | 网关重试放大并发 | 注入一次持续 5 分钟的服务商 429 |
| 漂移报告中出现秘密值 | 普通键名隐藏了秘密 | 将该键加入 `sensitive` |

## 问答
type: qa
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md, phases/17-infrastructure-and-production/21-ab-testing-llm-features/docs/zh.md, phases/17-infrastructure-and-production/24-chaos-engineering-llm/code/main.py, projects/configuration-drift-explainer/README.md

- **影子模式能证明质量吗？** 不能。它只发现成本、长度、拒绝与硬错误。
- **何时跳过 A/B？** 新模型仅是原模型的改进版时。
- **“稳定”等于基线吗？** 不等于。稳定表示在预期方差内。
- **20 次测试，95% 置信度？** 偶然会出现一次假阳性。使用 Bonferroni 或 Benjamini-Hochberg。
- **哪个混沌实验会中止？** 服务商 429。消耗速率超过 2.0，影响范围超过 20%。
- **漂移时 `--check` 返回什么？** 退出状态 2。

## 提示
type: tips
from: phases/17-infrastructure-and-production/20-shadow-canary-progressive/docs/zh.md, phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/zh.md, projects/configuration-drift-explainer/README.md

- 发布前修好回滚路径。回滚不能依赖重新部署。
- 跟踪每请求成本。好 20% 的模型单次调用可能贵 3x。
- 每日错误预算消耗超过预期 2x 时暂停混沌测试。
- 首个混沌测试：稳定流量下终止一个解码副本的 pod。
- 节奏：每周金丝雀、每月演练日、每季度审计。
- 层名使用明确的来源标识，绝不放秘密值。
