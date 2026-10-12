# 添加嵌入前测量检索效果

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

检索演示需要与任务关联的分数。对每个标注查询，测量预期文档是否出现在前 k 个结果中。对这些独立命中取平均，得到 recall at k。

这个小型标注 fixture 是公开、确定性的。满分也不能证明对新笔记的质量。判断同义词扩展是否足够前，另留一组自己的改写。

```figure
pj-semantic-notes-search-4
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 3 阶段](../../03-rank-queries/docs/zh.md)。

添加不同检索后端前，先测量目标笔记是否排在靠前位置。附带笔记涵盖部署、恢复和访客 Wi-Fi，别名可能帮助一个主题却损害另一个。

```text
labels: restore -> backup.md; café -> café.md
hits=2,total=2,k=1 -> recall=1
add a misleading alias -> inspect changed hit ids
```

## 构建与检查

标注查询与调优示例分开。在评估中调用实际 search 函数，不要重新构造另一套评分器。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 4 --path learning-artifacts/semantic-notes-search
```

累积阶段通过后，在仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/semantic-notes-search/cli.py projects/semantic-notes-search/examples/notes "release replicas" --aliases projects/semantic-notes-search/examples/aliases.json --out matches.json
```

这是有显式别名、可解释的词法 TF-IDF 基线，不是学习得到的嵌入模型。标题保留项目路线；每次匹配展示词法词项。文件夹读取器接受有大小限制的 UTF-8 markdown，拒绝符号链接文件。

## 下一步探究

声称改善初学者检索效果前，你会收集多少新标签？
