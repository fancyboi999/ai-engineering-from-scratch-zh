# 校验排序与分级判断

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

评估假设文档在排序中只出现一次。重复同一相关文档时，朴素精确率和增益可能多次计数。任何测量前先校验排序 ID 和相关性等级。

等级使用零到三的整数。缺失文档视为未判断，增益为零；最终报告也计数它们，让不完整标注保持可见。

```figure
pj-retrieval-evaluation-lab-1
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。

排序是唯一文档 ID 的有序列表。Orchard restore 查询有分级证据：恢复流程比发布说明中的顺带提及更有用。

```text
judgments: restore=3, release=1, cafe=0
ranking: [release, restore, restore] -> duplicate error
```

## 构建与检查

评分前校验排序与判断。保留未判断文档可见，不假设它们已审核且无关。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --init learning-artifacts/retrieval-evaluation-lab
python3 scripts/project_test.py retrieval-evaluation-lab --stage 1 --path learning-artifacts/retrieval-evaluation-lab
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

语料刚新增一条笔记时，缺失判断意味着什么？
