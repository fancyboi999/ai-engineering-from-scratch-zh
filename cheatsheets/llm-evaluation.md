---
id: llm-evaluation
title: LLM 评估
subtitle: 定义任务、评分、按量规评判、校准、带区间排名，并测试长上下文。
hue: 80
sources: phases/10-llms-from-scratch/10-evaluation, phases/11-llm-engineering/10-evaluation, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation, phases/19-capstone-projects/27-eval-harness-fixture-tasks, phases/19-capstone-projects/41-eval-pipeline, phases/19-capstone-projects/49-lm-eval-harness, phases/19-capstone-projects/70-task-spec-format, phases/19-capstone-projects/71-classical-metrics, phases/19-capstone-projects/72-code-exec-metric, phases/19-capstone-projects/73-perplexity-calibration, phases/19-capstone-projects/74-leaderboard-aggregation, phases/19-capstone-projects/75-end-to-end-eval-runner
code: EL
---

## 端到端评估运行器
type: architecture
from: phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md, phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py, phases/19-capstone-projects/72-code-exec-metric/code/main.py

```arch
node | tasks | 1,1 | tasks.jsonl | validate_file
node | adapter | 2,1 | ModelAdapter | generate(prompt, task)
node | post | 3,1 | post_process | 每个任务一条规则
node | metric | 4,1 | score | 按 metric_name 分发
node | calib | 1,2 | CalibrationReport | ece, brier
node | board | 2,2 | aggregate | JSON 与 Markdown
node | runs | 3,2 | EvalRun | 每模型、每任务一条
node | exec | 4,2 | run_candidate | 子进程，3 秒
edge | tasks | adapter | 渲染
edge | adapter | post | 文本
edge | post | metric |
edge | post | exec | code_exec
edge | metric | runs | 分数
edge | exec | runs | 分数
edge | adapter | calib | 置信度
edge | runs | board |
edge | calib | board | 报告
```

## 为一个任务评分
type: flow
from: phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md, phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py, phases/19-capstone-projects/70-task-spec-format/docs/zh.md

1. **渲染**：先放少样例，再放 prompt，中间以空行分隔。
2. **适配器**：`generate(prompt, task)` 返回文本与置信度，运行器记录耗时。
3. **post_process**：应用任务规定的单条规则。
4. **分发**：文本指标用 `score`，`code_exec` 用 `run_candidate`。
5. **EvalRun**：创建一条包含分数和指标名称的记录。
6. **校准缓冲区**：追加置信度与正确性二元组。
7. **正确标准**：exact_match、accuracy、code_exec 得 1 分，分级指标至少 0.5 分。

## 选择并运行指标
type: task-table
span: 2
from: phases/19-capstone-projects/70-task-spec-format/code/main.py, phases/19-capstone-projects/71-classical-metrics/code/main.py, phases/11-llm-engineering/10-evaluation/code/eval_framework.py, phases/10-llms-from-scratch/10-evaluation/docs/zh.md, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md

| 任务 | 代码 |
|---|---|
| 算术评分 | `"exact_match"` 配合 `"strip_whitespace"` |
| 选择题评分 | `"exact_match"` 配合 `"extract_letter"` |
| 生成代码评分 | `"code_exec"` 配合 `"extract_code_block"` |
| 摘要评分 | `"rouge_l"` 或 `"bleu_4"` |
| 通过率区间 | `wilson_confidence_interval(successes, total, z=1.96)` |
| 按成对胜率排名 | `ELOTracker(k=32, initial_rating=1500)` |
| 插入针尖信息 | `build_haystack(filler_text, needle, depth_ratio, total_tokens)` |
| 运行公开基准 | `lm_eval --model hf --model_args pretrained=<model> --tasks mmlu` |

## 评估框架 API
type: annotated-code
lang: python
from: phases/19-capstone-projects/70-task-spec-format/code/main.py, phases/19-capstone-projects/70-task-spec-format/docs/zh.md, phases/19-capstone-projects/71-classical-metrics/code/main.py, phases/19-capstone-projects/72-code-exec-metric/code/main.py, phases/19-capstone-projects/73-perplexity-calibration/code/main.py, phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py

```python
tasks, errors = validate_file("tasks.jsonl")     # 有错误时不要运行
s = score("f1", prediction, targets)             # 所有目标中的最佳 F1
s = score_code_exec(prediction, assertions)      # 通过数 / 总数，限制 3 秒
p = pass_at_k(n=10, c=3, k=5)                    # 无偏估计
report = CalibrationReport.from_predictions(confidences, correct)
report.ece, report.brier, report.populated_bins  # 默认 bins=10
ppl = perplexity(neg_log_probs, token_counts)    # exp(总 nll / token 数)
rows = aggregate(runs, b=500, alpha=0.05)        # 均值、bootstrap CI、胜率
print(render_markdown(rows))                     # 供 PR 评论使用的表格
```

## 后处理规则
type: command-table
from: phases/19-capstone-projects/70-task-spec-format/docs/zh.md, phases/19-capstone-projects/70-task-spec-format/code/main.py

| 命令 | 作用 |
|---|---|
| `none` | 原样返回字符串 |
| `strip_whitespace` | 移除首尾空白 |
| `lower` | 转为小写 |
| `extract_letter` | 提取 `[A-E]` 中第一个字符，用于选择题 |
| `extract_code_block` | 提取第一个代码围栏的内容 |
| `extract_first_line` | 提取首个非空行，用于摘要类别 |

## 关键公式
type: concepts
from: phases/10-llms-from-scratch/10-evaluation/docs/zh.md, phases/19-capstone-projects/71-classical-metrics/docs/zh.md, phases/19-capstone-projects/72-code-exec-metric/docs/zh.md, phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md

- **困惑度**：$\mathrm{PPL} = \exp\left(-\frac{1}{N} \sum_i \log P(\text{token}_i \mid \text{context})\right)$
- **Token F1**：$\frac{2 P R}{P + R}$。P、R 基于预测与目标的 token 重叠计算。
- **BLEU-4**：长度惩罚乘以 $p_1$ 至 $p_4$ 的几何平均。
- **长度惩罚**：$c \ge r$ 时为 1，否则为 $\exp(1 - r / c)$。
- **ROUGE-L**：分别用 LCS 除以参考长度、候选长度，再求 F1。
- **pass@k**：$n$ 次采样有 $c$ 次通过时，$1 - \binom{n - c}{k} / \binom{n}{k}$。
- **ECE**：每箱置信度与准确率之差，按箱大小加权后求和。
- **Brier**：$\mathrm{mean}((p_i - y_i)^2)$，惩罚 ECE 漏掉的分散误差。

## 样本量与置信度
type: command-table
from: phases/11-llm-engineering/10-evaluation/docs/zh.md

| 90% 通过率时的测试数 | 95% CI 宽度 |
|---|---|
| 50 | 19 个百分点，无法检测 5% 回归 |
| 100 | 12 个百分点，勉强可用 |
| 200 | 9 个百分点，可以检测 |
| 500 | 5 个百分点，较有把握 |
| 1000 | 3 个百分点，更精确 |

## 代码默认值
type: defaults
from: phases/19-capstone-projects/72-code-exec-metric/code/main.py, phases/19-capstone-projects/70-task-spec-format/code/main.py, phases/19-capstone-projects/73-perplexity-calibration/code/main.py, phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md, phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py, phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py, phases/10-llms-from-scratch/10-evaluation/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `DEFAULT_TIMEOUT_S` | 3.0 | 每任务限制，`MAX_TIMEOUT_S` 为 30.0 |
| `OUTPUT_CAP_BYTES` | 256 * 1024 | 超限结果为 "output overflow" |
| `FEW_SHOT_MAX` | 8 | 每任务少样例数量 |
| ECE `bins` | 10 | 对比惯例使用 15 |
| Bootstrap `b` | 500 | 底层辅助函数使用 1000 |
| `alpha` | 0.05 | 95% 百分位区间 |
| `max_workers` | 8 | `run_eval` 中的线程池 |
| ELO `k` | 32 | 初始评分 1500 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md, phases/19-capstone-projects/41-eval-pipeline/docs/zh.md, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md, phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 困惑度小于 1 | 适配器返回 log p 而非 -log p | 取负，函数会拒绝错误输入 |
| 困惑度好得异常 | 分母计入填充 token | 仅统计非填充 token |
| 裁判分数丢失 | 错误 JSON 产生 NaN，求均值时丢弃 | 明确记录为失败 |
| 裁判偏爱自家模型 | 自评可增加 10-20% | 换用不同模型家族评判 |
| 成对裁判偏选第一个 | 位置偏差 | 随机顺序，并交换顺序再运行 |
| 均值 0.85，用户仍抱怨 | 均值掩盖 5% 灾难性失败 | 检查底部分位 |
| 通过 NIAH，真实文档失败 | NIAH 仅测试检索 | 增加 RULER 或多跳测试 |
| 一个任务支配均值 | 分数范围是 [0, 100] | 返回 [0, 1] 比例 |

## 缩略语
type: glossary
from: phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md, phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md, phases/10-llms-from-scratch/10-evaluation/docs/zh.md, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md

- **EM**：精确匹配，归一化后每任务为 1 或 0。
- **ECE**：期望校准误差，置信度与准确率的差距。
- **MMLU**：大规模多任务语言理解，57 个学科、15,908 道题。
- **HumanEval**：164 道 Python 函数补全题。
- **SWE-bench**：来自 12 个 Python 仓库的 2,294 个 GitHub issue。
- **NIAH**：大海捞针，在填充文本中插入事实并提问。
- **MRCR**：多轮共指消解，包含 8、24 或 100 根针。
- **RAGAS**：检索增强生成评估，包含四项 RAG 指标。

## 问答
type: qa
from: phases/11-llm-engineering/10-evaluation/docs/zh.md, phases/19-capstone-projects/27-eval-harness-fixture-tasks/docs/zh.md, phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md

- **需要多少测试？** 部署决策至少 200 项，系统差距小时至少 500 项。
- **为何也报告 pass@1？** pass@k 会掩盖模型二十次才答对一次的情况。
- **何时差异可信？** 成对差值的 bootstrap 区间不包含零时。
- **何时能信任裁判？** 与人工标签的 Spearman rho 至少为 0.7。
- **真实上下文有多长？** 有效推理范围通常只有宣称窗口的 25-50%。

## 提示
type: tips
from: phases/11-llm-engineering/10-evaluation/docs/zh.md, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md, phases/19-capstone-projects/49-lm-eval-harness/docs/zh.md, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md

- 将量规各档分数锚定到可观察行为，可降低 30-40% 裁判方差。
- 冻结裁判模型与版本。
- 在排行榜中以 hash 固定任务文件。
- 比较预测内容，不只比较分数。使用 `--include-per-example`。
- 评估用例与 prompt、训练样例分开保存。
- 测试针深度 0、0.25、0.5、0.75、1.0。
