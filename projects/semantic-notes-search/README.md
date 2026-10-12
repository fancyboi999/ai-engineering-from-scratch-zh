# 语义笔记搜索

本地笔记搜索，解释每次匹配，并展示别名何时有益、何时有害。

Orchard 操作人员用不同 Unicode 编码输入 café。对文本和别名键同时做大小写折叠与 NFC 规范化，让等价拼写得到相同 token。别名是一次明确的词法替换。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)、[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组监管的地方需要 POSIX。

```bash
python3 scripts/project_test.py semantic-notes-search --init learning-artifacts/semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path learning-artifacts/semantic-notes-search
```

## 构建路线

1. [规范化笔记并保留标识](stages/01-normalize-notes/docs/zh.md)
2. [按文档稀有度加权词项](stages/02-weight-the-index/docs/zh.md)
3. [用稳定同分规则排序查询](stages/03-rank-queries/docs/zh.md)
4. [添加嵌入前测量检索效果](stages/04-measure-recall/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令用原创 Orchard 示例运行你的工作区代码。将样本路径替换成自己的文件。

```bash
python3 learning-artifacts/semantic-notes-search/cli.py projects/semantic-notes-search/examples/notes "release replicas" --aliases projects/semantic-notes-search/examples/aliases.json --out matches.json
```

若想先检查完整参考方案，在同一命令中把 `learning-artifacts/semantic-notes-search` 替换为 `projects/semantic-notes-search/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确列出，便于其他工具消费。

## 集成边界

这是有显式别名、可解释的词法 TF-IDF 基线，不是学习得到的嵌入模型。标题保留项目路线；每次匹配展示词法词项。文件夹读取器接受有大小限制的 UTF-8 markdown，拒绝符号链接文件。

```bash
python3 scripts/project_test.py semantic-notes-search --all --solution --strict
python3 scripts/project_test.py semantic-notes-search --all --path learning-artifacts/semantic-notes-search --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见过的基准测试。

## 主要参考资料

- [机制与 API 参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)
