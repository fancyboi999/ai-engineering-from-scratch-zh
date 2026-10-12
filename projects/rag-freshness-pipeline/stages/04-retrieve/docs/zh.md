# 查询时排除过期证据

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

新鲜度既是摄取问题，也是查询时契约。后台作业可能失败，因此排序前每个候选都必须满足年龄限制。注入时钟，不在测试内部调用系统时钟；拒绝未来时间戳，不把它当作格外新鲜。

```figure
pj-rag-freshness-pipeline-4
```

## 实现边界

```python
def retrieve(documents,query,now,max_age=3600,k=3):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 3 阶段](../../03-snapshot/docs/zh.md)。

编辑后查询必须返回 15 分钟政策，绝不返回退役的 60 分钟文本。回答时执行新鲜度检查，即使上次快照后没有摄取作业运行。

```text
updated=200; now=210; max_age=60 -> age 10, eligible
updated=200; now=500; max_age=60 -> age 300, excluded
```

## 构建与检查

查询读取一个已提交快照。每次命中返回其版本和来源哈希，供调用方检测过时引用。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 4 --path learning-artifacts/rag-freshness-pipeline
```

累积阶段通过后，从仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/before.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/after.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py query orchard-index.json tokens --now 210 --max-age 60
```

导入器要求完整语料，不是局部变更流。POSIX flock 协调本地写入者，不是分布式数据库锁。检索基于词汇，来源时间戳由调用方提供。

## 接下来探查

未来日期文档是否应得到负年龄，成为最佳结果？
