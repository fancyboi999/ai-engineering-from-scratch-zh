# 证据对照：LLM 评估

中文主题：[LLM 评估](../llm-evaluation.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 端到端评估运行器

对应主题区块：**端到端评估运行器**（`architecture`）。

来源文件：

- [`phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md`](../../phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md)
- [`phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py`](../../phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py)
- [`phases/19-capstone-projects/72-code-exec-metric/code/main.py`](../../phases/19-capstone-projects/72-code-exec-metric/code/main.py)

构建器核对的标识与数值：

- `tasks.jsonl`
- `validate_file`
- `generate`
- `post_process`
- `metric_name`
- `run_candidate`

## 为一个任务评分

对应主题区块：**为一个任务评分**（`flow`）。

来源文件：

- [`phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md`](../../phases/19-capstone-projects/75-end-to-end-eval-runner/docs/zh.md)
- [`phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py`](../../phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py)
- [`phases/19-capstone-projects/70-task-spec-format/docs/zh.md`](../../phases/19-capstone-projects/70-task-spec-format/docs/zh.md)

构建器核对的标识与数值：

- `generate`
- `code_exec`
- `run_candidate`

## 选择并运行指标

对应主题区块：**选择并运行指标**（`task-table`）。

来源文件：

- [`phases/19-capstone-projects/70-task-spec-format/code/main.py`](../../phases/19-capstone-projects/70-task-spec-format/code/main.py)
- [`phases/19-capstone-projects/71-classical-metrics/code/main.py`](../../phases/19-capstone-projects/71-classical-metrics/code/main.py)
- [`phases/11-llm-engineering/10-evaluation/code/eval_framework.py`](../../phases/11-llm-engineering/10-evaluation/code/eval_framework.py)
- [`phases/10-llms-from-scratch/10-evaluation/docs/zh.md`](../../phases/10-llms-from-scratch/10-evaluation/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md)

构建器核对的标识与数值：

- `exact_match`
- `strip_whitespace`
- `extract_letter`
- `code_exec`
- `extract_code_block`
- `rouge_l`
- `bleu_4`
- `wilson_confidence_interval`
- `initial_rating`
- `ELOTracker`
- `build_haystack`
- `filler_text`
- `depth_ratio`
- `total_tokens`
- `--model`
- `--tasks`
- `lm_eval`
- `model_args`

## 评估框架 API

对应主题区块：**评估框架 API**（`annotated-code`）。

来源文件：

- [`phases/19-capstone-projects/70-task-spec-format/code/main.py`](../../phases/19-capstone-projects/70-task-spec-format/code/main.py)
- [`phases/19-capstone-projects/70-task-spec-format/docs/zh.md`](../../phases/19-capstone-projects/70-task-spec-format/docs/zh.md)
- [`phases/19-capstone-projects/71-classical-metrics/code/main.py`](../../phases/19-capstone-projects/71-classical-metrics/code/main.py)
- [`phases/19-capstone-projects/72-code-exec-metric/code/main.py`](../../phases/19-capstone-projects/72-code-exec-metric/code/main.py)
- [`phases/19-capstone-projects/73-perplexity-calibration/code/main.py`](../../phases/19-capstone-projects/73-perplexity-calibration/code/main.py)
- [`phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py`](../../phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py)

构建器核对的标识与数值：

- `tasks.jsonl`
- `validate_file`
- `score`
- `score_code_exec`
- `pass_at_k`
- `CalibrationReport.from_predictions`
- `from_predictions`
- `report.ece`
- `report.brier`
- `report.populated_bins`
- `populated_bins`
- `neg_log_probs`
- `token_counts`
- `perplexity`
- `aggregate`
- `render_markdown`
- `print`

## 后处理规则

对应主题区块：**后处理规则**（`command-table`）。

来源文件：

- [`phases/19-capstone-projects/70-task-spec-format/docs/zh.md`](../../phases/19-capstone-projects/70-task-spec-format/docs/zh.md)
- [`phases/19-capstone-projects/70-task-spec-format/code/main.py`](../../phases/19-capstone-projects/70-task-spec-format/code/main.py)

构建器核对的标识与数值：

- `strip_whitespace`
- `extract_letter`
- `extract_code_block`
- `extract_first_line`

## 关键公式

对应主题区块：**关键公式**（`concepts`）。

来源文件：

- [`phases/10-llms-from-scratch/10-evaluation/docs/zh.md`](../../phases/10-llms-from-scratch/10-evaluation/docs/zh.md)
- [`phases/19-capstone-projects/71-classical-metrics/docs/zh.md`](../../phases/19-capstone-projects/71-classical-metrics/docs/zh.md)
- [`phases/19-capstone-projects/72-code-exec-metric/docs/zh.md`](../../phases/19-capstone-projects/72-code-exec-metric/docs/zh.md)
- [`phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md`](../../phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 样本量与置信度

对应主题区块：**样本量与置信度**（`command-table`）。

来源文件：

- [`phases/11-llm-engineering/10-evaluation/docs/zh.md`](../../phases/11-llm-engineering/10-evaluation/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 代码默认值

对应主题区块：**代码默认值**（`defaults`）。

来源文件：

- [`phases/19-capstone-projects/72-code-exec-metric/code/main.py`](../../phases/19-capstone-projects/72-code-exec-metric/code/main.py)
- [`phases/19-capstone-projects/70-task-spec-format/code/main.py`](../../phases/19-capstone-projects/70-task-spec-format/code/main.py)
- [`phases/19-capstone-projects/73-perplexity-calibration/code/main.py`](../../phases/19-capstone-projects/73-perplexity-calibration/code/main.py)
- [`phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md`](../../phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md)
- [`phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py`](../../phases/19-capstone-projects/74-leaderboard-aggregation/code/main.py)
- [`phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py`](../../phases/19-capstone-projects/75-end-to-end-eval-runner/code/main.py)
- [`phases/10-llms-from-scratch/10-evaluation/docs/zh.md`](../../phases/10-llms-from-scratch/10-evaluation/docs/zh.md)

构建器核对的标识与数值：

- `DEFAULT_TIMEOUT_S`
- `MAX_TIMEOUT_S`
- `3.0`
- `OUTPUT_CAP_BYTES`
- `256 * 1024`
- `FEW_SHOT_MAX`
- `8`
- `10`
- `500`
- `0.05`
- `max_workers`
- `run_eval`
- `32`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md`](../../phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md)
- [`phases/19-capstone-projects/41-eval-pipeline/docs/zh.md`](../../phases/19-capstone-projects/41-eval-pipeline/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md)
- [`phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md`](../../phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md)
- [`phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md`](../../phases/19-capstone-projects/73-perplexity-calibration/docs/zh.md)
- [`phases/10-llms-from-scratch/10-evaluation/docs/zh.md`](../../phases/10-llms-from-scratch/10-evaluation/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/11-llm-engineering/10-evaluation/docs/zh.md`](../../phases/11-llm-engineering/10-evaluation/docs/zh.md)
- [`phases/19-capstone-projects/27-eval-harness-fixture-tasks/docs/zh.md`](../../phases/19-capstone-projects/27-eval-harness-fixture-tasks/docs/zh.md)
- [`phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md`](../../phases/19-capstone-projects/74-leaderboard-aggregation/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/11-llm-engineering/10-evaluation/docs/zh.md`](../../phases/11-llm-engineering/10-evaluation/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/zh.md)
- [`phases/19-capstone-projects/49-lm-eval-harness/docs/zh.md`](../../phases/19-capstone-projects/49-lm-eval-harness/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/zh.md)

构建器核对的标识与数值：

- `--include-per-example`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/llm-evaluation.md

Abbreviations: P10 = phases/10-llms-from-scratch/10-evaluation, P11 = phases/11-llm-engineering/10-evaluation, P05E = phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, P05L = phases/05-nlp-foundations-to-advanced/28-long-context-evaluation, P19 = phases/19-capstone-projects. L27, L41, L49, L70..L75 = the P19 lesson directories. d = docs/en.md, c = code/main.py.

## Architecture: End-to-end eval runner (8 nodes, 9 edges)
- tasks.jsonl, validate: L75/d:26, L70/c:192
- ModelAdapter generate(prompt, task): L75/d:50-53, L75/c:56-59
- post_process: L75/d:29, L70/c:241
- score, metric_name dispatch: L75/d:30-31, L71/c:146
- run_candidate subprocess, 3 s: L75/d:32, L72/c:30, 151
- EvalRun per (model, task): L75/d:33, L74/d:36
- CalibrationReport ece, brier: L75/d:35-36, L73/c:189-199
- aggregate, JSON + markdown: L75/d:37-39, L74/c:169, 241, 254
- adapter confidence edge: L75/d:35, L75/c:49-53

## Flow: Score one task (7 steps)
1. render few-shot then prompt, blank line: L75/d:75, L70/d:90-99
2. adapter call, timed, text and confidence: L75/d:76, 58-59
3. post_process per task rule: L75/d:77, L70/d:63
4. dispatch, score or run_candidate: L75/d:78, 30-32
5. EvalRun record: L75/d:79
6. (confidence, correct) to calibration buffer: L75/d:80, L75/c:171-172
7. correct = score >= 1.0 for exact_match, accuracy, code_exec, >= 0.5 graded: L75/d:82, L75/c:99-102

## Pick and run a metric (task-table, 8)
- arithmetic exact_match, strip_whitespace: L70/c:25-35, L70/d:42
- mcq exact_match, extract_letter: L70/c:36, L70/d:53, 108
- code_exec, extract_code_block: L70/c:37, L70/d:109
- summary rouge_l or bleu_4: L70/c:39
- wilson_confidence_interval(successes, total, z=1.96): P11/code/eval_framework.py:183
- ELOTracker(k=32, initial_rating=1500): P10/d:215-216
- build_haystack(filler_text, needle, depth_ratio, total_tokens): P05L/d:60
- lm_eval --model hf --model_args pretrained=... --tasks mmlu: P10/d:426

## Harness API (annotated-code, 9 lines)
- validate_file returns validated, errors. Runner refuses with errors: L70/c:192-194, L70/d:86
- score(metric_name, prediction, targets), best F1 over targets: L71/c:146, L71/d:65, 123
- score_code_exec(prediction, assertions, timeout_s=DEFAULT_TIMEOUT_S), passed / total: L72/c:246, L72/d:41
- pass_at_k(n, c, k), unbiased estimator: L72/c:253, L72/d:80
- CalibrationReport.from_predictions(confidences, correct, bins=10), ece, brier, populated_bins: L73/c:189-199
- perplexity(neg_log_probs, token_counts), exp(total nll / tokens): L73/c:53, L73/d:29-32
- aggregate(runs, b=500, alpha=0.05): L74/c:169-173. Mean, CI, win rate: L74/d:54
- render_markdown(rows), paste into a PR: L74/c:241, L75/d:104

## Post-process rules (command-table, 6)
- none, strip_whitespace, lower, extract_letter [A-E], extract_code_block, extract_first_line: L70/d:105-110, L70/c:25-32

## Key formulas (concepts, 8)
- Perplexity: P10/d:71
- Token F1: L71/d:51, 59-61
- BLEU-4 geometric mean of p_1..p_4 with BP: L71/d:71, 85
- Brevity penalty: L71/d:82
- ROUGE-L recall and precision from LCS, F1: L71/d:93
- pass@k formula: L72/d:83
- ECE weighted gaps: L73/d:39-47
- Brier mean((p_i - y_i)^2), penalizes spread: L73/d:56-58

## Sample size and confidence (command-table, 5)
- 50 / 100 / 200 / 500 / 1000 cases at 90%, 19 / 12 / 9 / 5 / 3 points: P11/d:160-166

## Defaults in the code (defaults, 8)
- DEFAULT_TIMEOUT_S 3.0, MAX_TIMEOUT_S 30.0: L72/c:30-31
- OUTPUT_CAP_BYTES 256 * 1024, "output overflow": L72/c:32, L72/d:76
- FEW_SHOT_MAX 8: L70/c:42, L70/d:61
- ECE bins 10, 15 comparison convention: L73/c:189, L73/d:50
- bootstrap b 500, helpers 1000: L74/c:102, 171, L74/d:102
- alpha 0.05: L74/c:172, L74/d:102
- max_workers 8: L75/c:141, L75/d:67
- ELO k 32, initial 1500: P10/d:216

## Troubleshooting (troubleshooting, 8)
- perplexity below 1, log p vs -log p: L73/d:35
- padding in denominator: L41/d:47
- bad JSON NaN dropped: P05E/d:37
- self-evaluation inflates 10-20%: P05E/d:173
- positional bias, randomize and run both: P05E/d:174
- mean 0.85 hides 5% catastrophic, bottom quantile: P05E/d:175
- NIAH-only, add RULER or multi-hop: P05L/d:133
- score in [0, 100] dominates mean: L74/d:58

## Abbreviations (glossary, 8)
- EM 1.0 or 0.0 per task: L71/d:47, P05E/d:14
- ECE: L73/d:39
- MMLU 15,908 questions, 57 subjects: P10/d:503
- HumanEval 164 problems: P10/d:504
- SWE-bench 2,294 issues, 12 repos: P10/d:505
- NIAH: P05L/d:26, 189
- MRCR 8, 24, 100 needles: P05L/d:32
- RAGAS four metrics: P05E/d:20

## Questions (qa, 5)
- 200 cases for decisions, 500+ for close systems: P11/d:168
- pass@k hides once-in-twenty: L27/d:90-92
- paired bootstrap interval excludes zero: L74/d:100
- Spearman rho 0.7: P05E/d:51
- reasoning-effective 25-50% of advertised: P05L/d:47

## Tips (tips, 6)
- anchored rubric cuts variance 30-40%: P11/d:104
- freeze judge model and version: P05E/d:38
- pin task files by hash: L49/d:166
- diff predictions, --include-per-example: L49/d:132, 167, L49/c:478
- keep eval data separate from prompt and training: P11/d:199
- depths 0, 0.25, 0.5, 0.75, 1.0: P05L/d:134
````
