# 划分标注案例，防止身份泄漏

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

对每个稳定案例 id 计算哈希，选择与文件顺序无关的分区。评估前拒绝重复身份。划分是确定性的，但不保证标签数量完全平衡；检查两个分区，在提出规则前预留评估分区。

```figure
pj-self-improving-skill-loop-1
```

## 实现边界

```python
def split_cases(cases,holdout_fraction=.25):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。

留出隔离必须依据内容和分组，不能只依据 id。不同 id 的工单可能重复同一客户消息。先规范化内容并合并关联记录，再把连通分量分配到分区。

```text
id d1: "Invoice wrong"
id h1: "INVOICE   wrong"
fingerprint equal -> one partition, or reject explicit split
```

## 构建与检查

对分量计算哈希前，合并重复内容边和分组边。规范化后内容相同而标签冲突时拒绝。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py self-improving-skill-loop --init learning-artifacts/self-improving-skill-loop
python3 scripts/project_test.py self-improving-skill-loop --stage 1 --path learning-artifacts/self-improving-skill-loop
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

同一客户会话中的两条不同消息，能安全地当作独立示例吗？
