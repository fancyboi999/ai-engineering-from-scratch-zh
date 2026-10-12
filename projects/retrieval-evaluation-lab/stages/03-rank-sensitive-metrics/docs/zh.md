# 奖励靠前的有用证据

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

倒数排名仅使用首个相关结果。归一化折扣累积增益使用每个分级命中，增益为 2^grade-1，折扣为 log2(rank+1)。把强结果往后移，即使召回率不变，NDCG 也应降低。

理想排序来自所有判断按等级排序后截断到 k。理想增益为零时，NDCG 返回零，避免除零。

```figure
pj-retrieval-evaluation-lab-3
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 2 阶段](../../02-precision-and-recall/docs/zh.md)。

将更强证据排前。增益为 3 和 1 时，较弱来源排首会降低折扣增益，即使检索文档集合不变。

```text
ranking [release,restore]: DCG=1 + 7/log2(3)=5.4165
ideal [restore,release]: DCG=7 + 1/log2(3)=7.6309
NDCG=0.7098
```

## 构建与检查

使用增益 2^relevance-1 和折扣 log2(rank+1)。相对于相同截断值下最佳有标签排序归一化。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 3 --path learning-artifacts/retrieval-evaluation-lab
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

所有有标签增益为零时，NDCG 应返回什么？
