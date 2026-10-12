# 只从开发集错误提出规则

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

只从开发集的错误生成候选。一个 token 需要重复支持且标签无歧义；这防止一次性人名和矛盾示例立刻变成政策。候选生成绝不接收留出案例。它提出变更，而非发布变更。

```figure
pj-self-improving-skill-loop-3
```

## 实现边界

```python
def propose(development,rules,min_support=2):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。先完成[第 2 阶段](../../02-skill/docs/zh.md)。

只从开发集错误提出规则。Invoice 在两个 billing 示例中出现，可成为规则；同时用于 billing 和 access 的词项有歧义。不要把留出文本传入这个函数。

```text
development: invoice wrong; invoice late -> billing
min_support=2 -> candidate terms=[invoice]
holdout: invoice missing -> used only after proposal
```

## 构建与检查

每个案例中各词项只计一次，收集全部关联标签。提出规则前要求唯一标签和足够独立支持。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 3 --path learning-artifacts/self-improving-skill-loop
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

若不去重，同一开发消息的重复副本会造成什么失败？
