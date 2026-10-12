# 用稳定同分规则排序查询

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

余弦相似度测量向量方向，长笔记不会只因重复所有词而获胜。忽略语料中从未出现的查询词，再在同一加权空间归一化。

按分数降序再按文档 id 排序。这个同分规则使回归测试和演示录制可复现。只返回正分匹配；空列表比不相关零分命中更诚实。

```figure
pj-semantic-notes-search-3
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 2 阶段](../../02-weight-the-index/docs/zh.md)。

CLI 为自己的 markdown 文件夹返回路径、预览和匹配 token。查询与笔记向量使用相同别名映射和 IDF 表；未知词项不贡献权重。

```text
query=release replicas
alias release=deploy
matching note: release.md; matched terms: deploy
```

附带笔记包含单数 `replica`，因此复数 `replicas` 不匹配。这个词法分词器不做词干提取。可编辑图表从含字面短语 `deploy replicas` 的较短笔记开始，因此其双词匹配对应不同输入。

## 构建与检查

用索引 IDF 计算查询向量，再与笔记向量做点积。同分按文档 id 决胜。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 3 --path learning-artifacts/semantic-notes-search
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

笔记使用别名映射中没有的同义词时，空结果意味着什么？
