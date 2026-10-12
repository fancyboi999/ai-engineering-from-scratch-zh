# 计算前 k 项精确率和召回率

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

精确率回答展示列表中多少内容有用。召回率回答所有已知相关证据中检索出多少。两者分母不同。

即使系统返回少于 k 个结果，也用 k 作精确率分母，统一惩罚未填满结果列表。将空相关集合的召回率定义为零，并报告判断数。

```figure
pj-retrieval-evaluation-lab-2
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 1 阶段](../../01-validate-rankings/docs/zh.md)。

k=2 时，检索到一条相关笔记和一条无关笔记，精确率为 1/2。若标签含两条相关笔记，召回率也为 1/2。各指标分母来自不同地方。

```text
ranking[:2]=[restore,cafe]
relevant labels={restore,release}
precision=1/2; recall=1/2
```

## 构建与检查

将正相关标签计为相关，而非只要是判断映射的键就计入。即使返回结果更少，也保留提供的截断值。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 2 --path learning-artifacts/retrieval-evaluation-lab
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

为何增大 k 会提高召回率却降低精确率？
