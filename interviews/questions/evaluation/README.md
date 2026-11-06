# 评估

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

指标、评估框架、judge、校准，以及怎样判断一个分数是否可信。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [饱和基准上的两分差距](benchmarks-stop-discriminating.md) | 概念 | 1 基础 | 6 |
| [精确匹配给正确答案打了零分](exact-match-vs-token-f1.md) | 概念 | 1 基础 | 5 |
| [困惑度 10 能告诉你什么](perplexity-health-check.md) | 概念 | 1 基础 | 5 |
| [重合度指标、judge 模型，还是人工评审](pick-the-eval-method.md) | 权衡 | 1 基础 | 6 |
| [两名工程师用同一个 judge，均值却不同](anchored-rubric.md) | 设计 | 2 应用 | 8 |
| [50 个用例上的 4 分领先](fifty-cases-is-not-enough.md) | 估算 | 2 应用 | 8 |
| [judge 分数用来拦截发布之前](judge-calibration-before-trust.md) | 概念 | 2 应用 | 8 |
| [所有指标都变了，产品却没变](judge-upgrade-moved-every-score.md) | 排障 | 2 应用 | 7 |
| [均值是绿的，用户却看到了失败](mean-hides-the-tail.md) | 排障 | 2 应用 | 8 |
| [needle 测试满分，面对的却是一份长合同](niah-is-not-enough.md) | 概念 | 2 应用 | 8 |
| [调换顺序后，赢家变了](pairwise-position-bias.md) | 排障 | 2 应用 | 8 |
| [pass@1 是 0.6，pass@5 是 0.95](pass-at-k-reading.md) | 权衡 | 2 应用 | 8 |
| [写答案的模型也给答案打分](same-model-judges-itself.md) | 权衡 | 2 应用 | 8 |
| [一篇论文的 BLEU 是 28.3，另一篇是 0.283](tokenizer-is-the-benchmark.md) | 排障 | 2 应用 | 8 |
| [给生成的代码打分，但不在评测进程里 exec](code-exec-sandbox-contract.md) | 设计 | 3 高级 | 10 |
| [预测太少时得到的 ECE 0.02](ece-or-brier.md) | 概念 | 3 高级 | 9 |
| [judge 解析失败，均值反而上涨](nan-scores-raise-the-mean.md) | 排障 | 3 高级 | 8 |
| [三个模型、五十个任务、一个排行榜](paired-difference-interval.md) | 设计 | 3 高级 | 10 |
| [批大小一变大，困惑度就变好](perplexity-padding-and-shift.md) | 代码阅读 | 3 高级 | 10 |
| [每个 pull request 都要过的评测门禁](regression-gate-ci.md) | 设计 | 3 高级 | 12 |
| [两个 harness，两个 pass@k 公式](two-pass-at-k-formulas.md) | 代码阅读 | 3 高级 | 10 |
| [通过率与平均分的误差线](wilson-or-bootstrap.md) | 概念 | 3 高级 | 8 |
| [排行榜第一名在代码任务上最差](aggregate-hides-tradeoffs.md) | 权衡 | 4 架构与规模 | 10 |
| [加入新训练语料后，基准分涨了 8 分](benchmark-jump-capability-or-leak.md) | 设计 | 4 架构与规模 | 12 |
| [每次升级模型都要重跑的长上下文测试组](effective-context-spec-sheet.md) | 设计 | 4 架构与规模 | 12 |
| [为小模型搭一条离线评测流水线](eval-pipeline-take-home.md) | 课后任务 | 4 架构与规模 | 60 |

[全部主题](../../README.md)
