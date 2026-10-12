# 按文档稀有度加权词项

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

每份笔记都出现的词区分度很低。计算平滑 IDF：log((1+N)/(1+df))+1，乘词频，再把每个向量归一化到单位长度。

向量与 IDF 一起保存。查询必须使用索引的同一词汇表和权重；拟合查询专属 IDF 会改变坐标系，使余弦比较失效。

```figure
pj-semantic-notes-search-2
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 1 阶段](../../01-normalize-notes/docs/zh.md)。

稀有操作词比常见项目名称更能区分笔记。每份笔记只计一次文档频率，词频乘平滑稀有度，再归一化每个稀疏向量。

```text
N=3; df(orchard)=3 -> idf=1
df(restore)=1 -> idf=log(4/2)+1=1.6931
```

## 构建与检查

用每文档单词集合计算文档频率。在一份笔记中重复 orchard 十次，不等于出现在十份文档中。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 2 --path learning-artifacts/semantic-notes-search
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

比较短笔记和长操作手册前，为什么要归一化向量长度？
