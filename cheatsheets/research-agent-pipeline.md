---
id: research-agent-pipeline
title: 从零构建研究 Agent 流水线
code: RP
subtitle: 生成假设、检索论文、在沙箱运行实验、评判结果，并发布带引用的报告。
hue: 165
sources: phases/19-capstone-projects/05-autonomous-research-agent, phases/19-capstone-projects/50-hypothesis-generator, phases/19-capstone-projects/51-literature-retrieval, phases/19-capstone-projects/52-experiment-runner, phases/19-capstone-projects/53-result-evaluator, projects/research-report-agent
source_hash: 6a58026aff580591
---

## 研究循环
type: architecture
from: phases/19-capstone-projects/50-hypothesis-generator/docs/zh.md, phases/19-capstone-projects/51-literature-retrieval/docs/zh.md, phases/19-capstone-projects/52-experiment-runner/docs/zh.md, phases/19-capstone-projects/53-result-evaluator/docs/zh.md, phases/19-capstone-projects/05-autonomous-research-agent/docs/zh.md

```arch
node | gen | 1,1 | HypothesisGenerator | 第 50 课，排序队列 | model
node | ret | 2,1 | RetrievalClient | 第 51 课，BM25 与引用图 | store
node | run | 3,1 | ExperimentRunner | 第 52 课，子进程限制 | process
node | eval | 4,1 | Evaluator | 第 53 课，配对 t 检验 | process
node | seed | 1,2 | 初始 prompt | 温度渐升 | client
node | tree | 2,2 | 树搜索 | 新颖性、质量、预算 | process
node | write | 3,2 | LaTeX 写作者 | 视觉评议 | model
node | rev | 4,2 | 评审集成 | 5 名评委 | model
edge | seed | gen |
edge | gen | ret | 队首
edge | ret | run | 尚无定论
edge | run | eval | ExperimentResult
edge | eval | gen | 结论
edge | tree | write | 最佳分支
edge | write | rev | 草稿
```

## 运行
type: command-table
span: 2
from: phases/19-capstone-projects/50-hypothesis-generator/code/main.py, phases/19-capstone-projects/51-literature-retrieval/code/main.py, phases/19-capstone-projects/52-experiment-runner/code/main.py, phases/19-capstone-projects/53-result-evaluator/code/main.py, phases/19-capstone-projects/05-autonomous-research-agent/code/main.py, phases/19-capstone-projects/05-autonomous-research-agent/docs/zh.md, projects/research-report-agent/README.md, projects/research-report-agent/solution/run_report.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 第 50 至 53 课演示，打印 JSON |
| `python main.py` | 第 05 课树搜索，预算 $30 |
| `docker run --network=none --memory=8g --cpus=2 --pids-limit=256 --read-only` | 单个实验的沙箱 |
| `run_report.py "<question>" --out out/ --code <dir>` | 生成报告、轨迹与证据 JSON |
| `run_report.py --eval heldout/questions.json` | 评测公开夹具 |
| `run_report.py "<question>" --model replay --cassette <file>` | 根据录制回复规划 |
| `run_report.py "<question>" --corpus <dir> --compare <old>/report.json` | 写入 `changes.json` |
| `project_test.py research-report-agent --stage <n> --path <dir>` | 评测指定阶段及之前全部阶段 |

## 循环调用代码
type: task-table
span: 2
from: phases/19-capstone-projects/50-hypothesis-generator/code/main.py, phases/19-capstone-projects/51-literature-retrieval/code/main.py, phases/19-capstone-projects/52-experiment-runner/code/main.py, phases/19-capstone-projects/53-result-evaluator/code/main.py

| 任务 | 代码 |
|---|---|
| 配置温度渐升 | `GeneratorConfig(n_passes=4, t_min=0.2, t_max=1.1)` |
| 起草与排序 | `queue, logs = generator.run(seed_prompt)` |
| 构建检索器 | `build_client(RetrievalConfig(top_k_lexical=5, max_hops=2))` |
| 搜索论文 | `result = client.search(query)` |
| 运行一份规格 | `ExperimentRunner().run(spec)` |
| 扫描一个参数 | `AblationRunner(runner).sweep(base, "k", [4, 8, 16, 32])` |
| 选择指标 | `MetricSpec(name="perplexity", direction=LOWER, scale=LOG)` |
| 评判各次运行 | `evaluator.evaluate(1, metric_spec, candidates, baselines)` |

## 定义沙箱实验规格
type: annotated-code
lang: python
from: phases/19-capstone-projects/52-experiment-runner/code/main.py, phases/19-capstone-projects/52-experiment-runner/docs/zh.md

```python
base = ExperimentSpec(
    spec_id="demo_base", hypothesis_id=1,
    script_path=script,                       # 打印一行 json
    config={"k": 16, "steps": 4, "sleep_s": 0.0},
    seed=7,                                   # 作为 config["__seed"] 传入
    wall_timeout_s=15.0,                      # 硬限制，超时终止
    memory_cap_mb=256,                        # 软限制，轮询 RSS
    metric_keys=["perplexity", "final_loss"],
)
runner = ExperimentRunner()
base_result = runner.run(base)                # 终态：ok、timeout、oom、crash
base_result.to_dict()                         # metrics、peak_rss_mb、stderr_tail
ablate(base, "k", [4, 8])                     # spec_id 为 demo_base_k_4
```

## 报告 agent 运行流程
type: flow
from: projects/research-report-agent/solution/report_agent/pipeline.py, projects/research-report-agent/solution/report_agent/critic.py, projects/research-report-agent/solution/report_agent/writer.py, projects/research-report-agent/solution/report_agent/planner.py, projects/research-report-agent/README.md

1. **index**：`BM25Index(documents)` 在 Rust 中对 Markdown 语料排序。
2. **plan**：`plan_research` 将问题拆成最多 4 个方面。
3. **gather**：`gather_snippets` 为每个方面保留 3 段带偏移量的片段。
4. **write**：`write_report` 编写带 `[S1]` 标记的句子。
5. **verify**：`review` 为每句评分。`apply_verdicts` 丢弃其余句子。
6. **state**：`decide_state` 给出 completed、needs_review 或 failed。
7. **publish**：`write_outputs` 写入 report.html、report.json 和 trace.json。

## 分数与公式
type: concepts
from: phases/19-capstone-projects/50-hypothesis-generator/docs/zh.md, phases/19-capstone-projects/51-literature-retrieval/docs/zh.md, phases/19-capstone-projects/53-result-evaluator/docs/zh.md, phases/19-capstone-projects/05-autonomous-research-agent/code/main.py, projects/research-report-agent/solution/report_agent/evaluate.py

- **余弦距离**：单位向量上为 `1 - dot(a, b)`。
- **rank_score**：0.4 新颖性 + 0.3 具体性 + 0.3 可测试性。
- **final_score**：0.5 归一化 BM25 + 0.3 图分数 + 0.2 新近性。
- **graph_score**：词汇命中为 1，一跳为 0.6，两跳为 0.3。
- **节点分数**：新颖性 0.4 + 质量 0.5 + 预算权重 0.1。
- **改进幅度**：越低越好时为 (baseline - candidate) / abs(baseline)。
- **配对 t 检验**：`t_stat = mean / sqrt(variance / n)`，自由度为 n - 1。
- **报告分数**：100 x (0.4 精确率 + 0.3 召回率 + 0.3 事实分数)。

## 循环默认值
type: defaults
from: phases/19-capstone-projects/50-hypothesis-generator/code/main.py, phases/19-capstone-projects/51-literature-retrieval/code/main.py, phases/19-capstone-projects/52-experiment-runner/code/main.py, phases/19-capstone-projects/53-result-evaluator/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `n_passes` | 6 | 从 `t_min` 0.2 到 `t_max` 1.2 |
| `novelty_threshold` | 0.25 | 更小距离视为重复 |
| BM25 `k1`, `b` | 1.5 | `b` 为 0.75 |
| `top_k_lexical` | 10 | 图遍历的种子 |
| `max_hops` | 2 | 超过 2 的值截为 2 |
| `wall_timeout_s` | 30.0 | `memory_cap_mb` 为 512 |
| `improvement_threshold` | 0.02 | 更小变化视为噪声 |
| `significance_threshold` | 0.05 | 更大 p 值视为噪声 |

## 报告 agent 默认值
type: defaults
from: projects/research-report-agent/solution/report_agent/critic.py, projects/research-report-agent/solution/report_agent/evaluate.py, projects/research-report-agent/solution/report_agent/writer.py, projects/research-report-agent/solution/report_agent/planner.py, projects/research-report-agent/solution/run_report.py, projects/research-report-agent/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--model` | rules | 也支持 replay 或 live |
| 预算 `max_steps` | 50 | `BudgetExceeded` 导致 failed |
| 预算 `max_tokens` | 20000 | `estimate_tokens` 为长度 / 4 |
| `review` 阈值 | 0.6 | 保留句子所需的重叠程度 |
| `citation_precision` 阈值 | 0.8 | 比批评器更严格 |
| `max_facets` | 4 | 概览、方法、风险、适用时机 |
| `max_sentences` | 3 | 每节上限 |
| 参考分数 | 87.5 | 六个公开问题，满分 100 |

## 故障与修正
type: troubleshooting
from: phases/19-capstone-projects/50-hypothesis-generator/code/main.py, phases/19-capstone-projects/50-hypothesis-generator/docs/zh.md, phases/19-capstone-projects/52-experiment-runner/docs/zh.md, phases/19-capstone-projects/53-result-evaluator/docs/zh.md, phases/19-capstone-projects/53-result-evaluator/code/main.py, phases/19-capstone-projects/05-autonomous-research-agent/code/main.py, projects/research-report-agent/solution/report_agent/critic.py, projects/research-report-agent/solution/report_agent/planner.py, projects/research-report-agent/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 日志显示 `parse:no hypothesis block found` | 回复缺少带标签的块 | 温度保持在 1.2 或以下 |
| 每轮都记录 `duplicate` | 草稿大多使用相同名词 | 扩展初始 prompt 后重跑 |
| 有指标但 `terminal` 为 `crash` | 非零退出码 | 修复脚本；部分运行仍算失败 |
| `PairingError` | 两个列表的种子不同 | 用相同种子重跑两组 |
| 增益大但结论为 `noise` | 少于 2 对，没有 p 值 | 运行更多种子 |
| 节点因 `loss_diverged` 失败 | 损失超过 4.0 | 丢弃该分支，扩展其他分支 |
| 句子被删除：名称或数字不在来源中 | 替换了名称或数字 | 保持抽取式写作 |
| 计划 `source` 为 `rules-fallback` | 模型 JSON 无效或录制未命中 | 阅读计划注释，重新录制 |

## 问答
type: qa
from: phases/19-capstone-projects/50-hypothesis-generator/docs/zh.md, phases/19-capstone-projects/51-literature-retrieval/docs/zh.md, phases/19-capstone-projects/52-experiment-runner/docs/zh.md, phases/19-capstone-projects/53-result-evaluator/docs/zh.md, projects/research-report-agent/stages/05-verify-every-claim/docs/zh.md

- **为何逐步提高温度？** 后期草稿会探索更远。低于 0.2 时模型只复述种子。
- **为何遍历引用图？** 能找到使用了不同于查询措辞的论文。
- **为何只走两跳？** 三跳使结果膨胀并偏题。
- **为何使用子进程？** 不可信代码不能使编排器崩溃。
- **为何一次只改一个参数？** 全因子扫描会指数增长。
- **为何用配对检验？** 每个种子给出一个差值，噪声下限是这些差值的标准误。
- **needs_review 算失败吗？** 不算。它明确告诉人工该检查哪里。
