# 规划插入、更新、删除和刷新

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

改变索引前计算整个计划。缺失 ID 是删除，哈希变化是更新，内容不变但元数据变更是刷新。重复 ID 应作为错误，因为静默保留其中一个会让摄取依赖输入顺序。

```figure
pj-rag-freshness-pipeline-2
```

## 实现边界

```python
def diff(previous,incoming):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 1 阶段](../../01-fingerprint/docs/zh.md)。

摄取接收完整语料快照。after fixture 替换退役备份笔记，并编辑 token 有效期。缺失 ID 必须删除，防止过时证据继续可搜索。

```text
before ids: orchard-auth, retired-backup
after ids: orchard-auth, restore-runbook
update: orchard-auth; delete: retired-backup; insert: restore-runbook
```

## 构建与检查

决定任何操作前先构建传入 ID 映射。重复传入 ID 是错误，不采用最后写入胜出。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 2 --path learning-artifacts/rag-freshness-pipeline
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

若导入器只收到局部变更流，契约应如何变化？
