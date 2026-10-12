# 规范化笔记并保留标识

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

搜索索引是你写下的笔记与以后输入的查询之间的契约。对 Unicode 单词做大小写折叠后分词，但保留每个原始文档 id。重复词项携带频率信息，集合会破坏它。

用一个小型显式同义词映射把 deploy 和 release 映射为相同规范词项。这展示受控语义扩展，不是嵌入模型，无法推断任意改写。

```figure
pj-semantic-notes-search-1
```

主要参考：[主要技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

Orchard 操作人员用不同 Unicode 编码输入 café。对文本和别名键同时做大小写折叠与 NFC 规范化，让等价拼写得到相同 token。别名是一次明确的词法替换。

```text
"CAFE\u0301" -> ["café"]
alias release -> deploy
"release café" -> ["deploy","café"]
```

## 构建与检查

在 Unicode 单词正则之前规范化，否则组合标记可能消失。不要递归扩展别名导致循环。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py semantic-notes-search --init learning-artifacts/semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path learning-artifacts/semantic-notes-search
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

什么时候把 release 映射成 deploy 会损害而非帮助检索？
