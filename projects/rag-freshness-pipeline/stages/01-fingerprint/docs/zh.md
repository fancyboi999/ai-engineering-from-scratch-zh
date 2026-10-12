# 规范化文档并生成内容指纹

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

身份与内容是不同的键。保留调用方 ID，同时哈希规范化 Unicode 内容，让等价编码不触发无必要索引。时间戳仍为元数据：改变时间戳不能假装文档内容已变。

```figure
pj-rag-freshness-pipeline-1
```

## 实现边界

```python
def normalize(doc):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

Orchard 政策在 timeout 改变后仍保留同一文档 ID。哈希正文前规范化 Unicode 和换行，单独保留更新时间。之后观察到内容不变，是刷新而非重写。

```text
id=orchard-auth
text: tokens expire after 60 minutes
updated: 100 -> 200
content hash: unchanged
```

## 构建与检查

哈希规范化 UTF-8 字节。不要把时间戳哈希进内容身份。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --init learning-artifacts/rag-freshness-pipeline
python3 scripts/project_test.py rag-freshness-pipeline --stage 1 --path learning-artifacts/rag-freshness-pipeline
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

为何 café 的两种不同编码版本应产生相同指纹？
