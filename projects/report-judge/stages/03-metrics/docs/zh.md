# 报告精确率、覆盖率与来源召回率

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

组合指标前先保持它们独立。精确率衡量已发布支持，来源召回率衡量预期证据选择，事实覆盖率衡量关键短语是否出现。空报告精确率为零，避免拒答看起来完全准确。

```figure
pj-report-judge-3
```

## 实现边界

```python
def score_report(text,evidence,expected_sources=(),facts=()):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 2 阶段](../../02-support/docs/zh.md)。

空报告没有证据，分数为零。召回率和事实覆盖率需要标签；无标签时不可用，而非自动完美。只有被支持主张才能贡献来源召回率或覆盖率。

```text
empty claims -> score 0, state no_evidence
3 lexical matches, no reference labels -> recall null, coverage null
score is computed only from available metrics
```

## 构建与检查

只追踪一次被支持主张，从该集合推导全部受支持证据指标。不要让悬空引用抬高来源召回率。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py report-judge --stage 3 --path learning-artifacts/report-judge
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

为何词汇匹配分数 100 可以与不可用的召回率同时存在？
