# 逐查询比较系统

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

宏平均给予每个查询相同权重，避免有数百判断的查询主导基准。在平均值旁保留逐查询指标，让回归仍可见。

要求每个系统都包含全部已判断查询，检索失败时也明确保留空排序。静默丢弃困难查询只会改善平均值，不改善检索。

```figure
pj-retrieval-evaluation-lab-4
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 3 阶段](../../03-rank-sensitive-metrics/docs/zh.md)。

提供的三查询 fixture 改善 release 和 café 检索，却使 restore 检索变差。对查询级差值排序，让丢失的恢复证据先于聚合值出现。

```text
release: improved
cafe: improved
restore: regressed
--fail-on-regression -> exit 1
```

## 构建与检查

按判断的查询 ID 对齐系统。为每个差值保存前后排序 ID；单独数字不能标识移动的来源。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 4 --path learning-artifacts/retrieval-evaluation-lab
```

累积阶段通过后，从仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/retrieval-evaluation-lab/cli.py projects/retrieval-evaluation-lab/examples/baseline.json projects/retrieval-evaluation-lab/examples/candidate.json projects/retrieval-evaluation-lab/examples/judgments.json --out retrieval-diff.json
```

指标适用于提供的标签。未判断文档增益为零，仍计为未判断。使用 --fail-on-regression，让任何查询 NDCG 降低时返回 exit 1。

## 接下来探查

平均 NDCG 上升时，应先审核哪个查询？
