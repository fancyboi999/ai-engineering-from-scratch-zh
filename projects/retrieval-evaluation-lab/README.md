# 检索评估实验室

检索回归侦探，揭示哪些证据移动及聚合值为何变化。

排序是唯一文档 ID 的有序列表。Orchard restore 查询有分级证据：恢复流程比发布说明中的顺带提及更有用。

## 从学习工作区开始

[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/zh.md)、[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及标准库。项目使用文件锁或进程组监督的地方需要 POSIX。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --init learning-artifacts/retrieval-evaluation-lab
python3 scripts/project_test.py retrieval-evaluation-lab --stage 1 --path learning-artifacts/retrieval-evaluation-lab
```

## 构建路线

1. [校验排序与分级判断](stages/01-validate-rankings/docs/zh.md)
2. [计算前 k 项精确率和召回率](stages/02-precision-and-recall/docs/zh.md)
3. [奖励靠前的有用证据](stages/03-rank-sensitive-metrics/docs/zh.md)
4. [逐查询比较系统](stages/04-compare-systems/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令在你的工作区代码上运行原创 Orchard 示例。将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/retrieval-evaluation-lab/cli.py projects/retrieval-evaluation-lab/examples/baseline.json projects/retrieval-evaluation-lab/examples/candidate.json projects/retrieval-evaluation-lab/examples/judgments.json --out retrieval-diff.json
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/retrieval-evaluation-lab` 替换为 `projects/retrieval-evaluation-lab/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具使用。

## 集成边界

指标适用于提供的标签。未判断文档增益为零，仍计为未判断。使用 --fail-on-regression，让任何查询 NDCG 降低时返回 exit 1。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --all --solution --strict
python3 scripts/project_test.py retrieval-evaluation-lab --all --path learning-artifacts/retrieval-evaluation-lab --strict
```

第一条命令检查参考实现，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准。

## 主要参考资料

- [机制与 API 参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)
