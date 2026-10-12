# RAG 新鲜度流水线

过时答案事件实验，证明编辑或删除后的政策不能继续被引用。

Orchard 政策在 timeout 改变后仍保留同一文档 ID。哈希正文前规范化 Unicode 和换行，单独保留更新时间。之后观察到内容不变，是刷新而非重写。

## 从学习工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)、[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及标准库。项目使用文件锁或进程组监督的地方需要 POSIX。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --init learning-artifacts/rag-freshness-pipeline
python3 scripts/project_test.py rag-freshness-pipeline --stage 1 --path learning-artifacts/rag-freshness-pipeline
```

## 构建路线

1. [规范化文档并生成内容指纹](stages/01-fingerprint/docs/zh.md)
2. [规划插入、更新、删除和刷新](stages/02-changes/docs/zh.md)
3. [以原子替换持久化索引](stages/03-snapshot/docs/zh.md)
4. [查询时排除过期证据](stages/04-retrieve/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令在你的工作区代码上运行原创 Orchard 示例。将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/before.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/after.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py query orchard-index.json tokens --now 210 --max-age 60
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/rag-freshness-pipeline` 替换为 `projects/rag-freshness-pipeline/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具使用。

## 集成边界

导入器要求完整语料，不是局部变更流。POSIX flock 协调本地写入者，不是分布式数据库锁。检索基于词汇，来源时间戳由调用方提供。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --all --solution --strict
python3 scripts/project_test.py rag-freshness-pipeline --all --path learning-artifacts/rag-freshness-pipeline --strict
```

第一条命令检查参考实现，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准。
