# 为公开 fixture 评分

> 不量化，就不知道下一次修改是否有帮助。

**类型：** Build
**语言：** Python
**阶段：** 7 / 7（stretch）
**预计时间：** 约 2 小时

## 构建内容

`report_agent/evaluate.py`：

- `citation_precision(report)`：已发布句子中通过词法引用支持检查的比例。
- `source_recall(report, expected_docs)`：每题所附预期文档中被引用的比例。
- `fact_coverage(report, key_facts)`：关键事实在某个句子中出现的比例。
- `evaluate(questions_path, corpus_dir)` 返回 `Scorecard`，`format_scorecard` 打印它，并给出满分 100 的最终分数。

```text
id      precision   recall   facts  state
----------------------------------------------
h1           1.00     1.00    1.00  completed
h2           1.00     1.00    1.00  completed
h3           1.00     1.00    1.00  completed
h4           1.00     1.00    0.50  completed
h5           1.00     1.00    0.50  completed
h6           1.00     0.50    0.00  completed
----------------------------------------------
mean         1.00     0.92    0.67
score 87.5 / 100
```

## 为什么重要

只看精确率很容易满分：发布一个安全句子，每条引用都正确。只看召回率和覆盖率也容易：复制语料库每句。实用报告需要三者，因此分数权重为 0.4、0.3 和 0.3。

指标回答不同问题。精确率测试已发布内容的支持，召回率测试来源选择，事实覆盖率测试有用内容。与加权分数一起报告各分项，避免一处改善掩盖别处回归。

## 公开 fixture 让基线可复现

`heldout/questions.json` 包含六个已提交的公开评估问题，每个都有预期文档和关键事实。目录名是历史遗留：学习者可见这些问题，参考实现也是在可访问它们的条件下开发的。secrets-proxy 演示就是问题 h4，因此分数不是盲评或未见评估。

学习指标时同时检查此文件和 `fixtures/questions.json`。比较变化时固定公开评估输入，记录三个指标，将提升视为这些示例上的回归证据。反复针对它们调优不能证明泛化。

参考基线在六个公开 fixture 上得分 87.5 / 100。每个已发布句子通过词法精确率检查，但几个问题遗漏预期事实。此分数不能证明任意语料库或模型撰写正文上的性能。

```figure
pj-rra-scorecard
```

## 沿机制推演

宏平均给予每题相同权重。微平均则偏向句子更多的问题。本项目采用前者，避免长而容易的报告淹没短而困难的问题。比较变化时保持评估问题不变。

## 你的任务

```python
class Scorecard:
    def mean(self, metric) -> float: ...
    def score(self) -> float: ...
def citation_precision(report, threshold=0.8) -> float: ...
def source_recall(report, expected_docs) -> float: ...
def fact_coverage(report, key_facts) -> float: ...
def evaluate(questions_path, corpus_dir, model=None) -> Scorecard: ...
def format_scorecard(card) -> str: ...
```

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 7 --path my-report-agent
python3 projects/research-report-agent/solution/run_report.py \
  --eval projects/research-report-agent/heldout/questions.json --code my-report-agent
```

测试要求精确率至少 0.9、来源召回率至少 0.6、事实覆盖率至少 0.4、分数至少 70。

## 预期结果

第 7 阶段通过 8 个 Python 测试，之前所有阶段仍通过。已提交公开 fixture 的参考基线打印上方评分卡：精确率 1.00、来源召回率 0.92、事实覆盖率 0.67、得分 87.5 / 100。这是实测 fixture 结果，不保证其他输入。

## 自测

1. 为什么这里的精确率阈值（0.8）比审查器阈值（0.6）更严格？
2. 修改后得分提升 5 分。相信它之前你会检查什么？
3. 只写 “Containers are containers [S1].” 的报告会在哪个指标满分？

## 进一步探索

- 在不降低精确率的情况下提升公开 fixture 分数，记录哪些示例改善、哪些回归。
- 添加可读性模型评判器，将其结果与有据指标分开报告。
- 要测泛化，请别人为新语料库准备独立私有问题和标签。评估前冻结实现和阈值，再披露何时查看或针对结果调优。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 6 阶段](../../06-publish-the-report/docs/zh.md)。

已提交问题是公开回归 fixture。将其分数与独立准备的语料库评估分开。新的 Orchard 场景在不改变公开隔离问题的情况下测试策略更新。

```text
相同问题 + 更新前语料库 -> 60 分钟主张
相同问题 + 更新后语料库 -> 15 分钟主张
比较问题不匹配 -> 拒绝
```

## 构建并检查

调优检索前冻结评估问题。保存分项指标和问题级失败，以及汇总结果。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 7 --path learning-artifacts/research-report-agent
```

累积阶段通过后，从仓库根目录用原始样本输入运行你的产物：

```bash
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code learning-artifacts/research-report-agent --corpus projects/research-report-agent/examples/orchard/before --out orchard-before
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code learning-artifacts/research-report-agent --corpus projects/research-report-agent/examples/orchard/after --compare orchard-before/report.json --out orchard-after
```

默认采用确定性规划和抽取式写作。--model replay 需要 --cassette。--model live 使用 RRA_LLM_BASE_URL、RRA_LLM_MODEL 和可选的 RRA_LLM_API_KEY，只用于规划。实时服务行为需用调用者凭据单独运行。公开 fixture 分数不衡量未见数据上的泛化。

## 下一步探查

什么才能支持 agent 泛化到已发布 fixture 之外的主张？
