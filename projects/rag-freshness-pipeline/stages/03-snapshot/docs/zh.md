# 以原子替换持久化索引

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

在目标旁写入完整下一快照，刷盘，再原子替换目标。版本前置条件拒绝过时写入者。持久化同级锁使用 POSIX flock，将本地写入进程的版本检查与替换串行化。原子替换保护读者不读到部分文件，不防范所有分布式竞争。

```figure
pj-rag-freshness-pipeline-3
```

## 实现边界

```python
def read_snapshot(path):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 2 阶段](../../02-changes/docs/zh.md)。

两个摄取进程可同时读到版本 1。持久化同级锁串行化版本检查与替换写入。只有一个能以 expected_version=1 提交；下个写入者必须重新读取。

```text
writer A expects 1 -> commits version 2
writer B expects 1 -> stale index version
index.json.lock remains as the stable lock inode
```

## 构建与检查

在 POSIX 上，读取、比较、fsync 和 rename 全程持有 flock。释放后绝不删除锁文件，否则等待进程可能锁住不同文件。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 3 --path learning-artifacts/rag-freshness-pipeline
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

若进程写完临时文件、rename 前退出，会怎样？
