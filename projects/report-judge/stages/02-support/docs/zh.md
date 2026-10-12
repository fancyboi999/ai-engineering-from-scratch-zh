# 先检查证据再平均分数

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

计算重叠前，将缺失证据作为类别性失败。数字与否定检查能捕获词语重叠可能奖励的矛盾主张。重叠分数是可检查的启发式方法，不是真实性检测器，可能拒绝好的改写。

```figure
pj-report-judge-2
```

## 实现边界

```python
def support(claim, source):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 1 阶段](../../01-claims/docs/zh.md)。

词语重叠会漏掉关系。“Bob defeated Alice”与“Alice defeated Bob”每个词都相同，却颠倒了谁做什么。拒绝顺序不匹配，留待人工审核；不要把该检查称为语义理解。

```text
source: Alice defeated Bob
claim: Bob defeated Alice
word overlap=1; order check=false
result: order_requires_review
```

## 构建与检查

在否定与数字保护之后才比较有序内容 token。这个保守规则可能拒绝有效改写，因此保留可见原因。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py report-judge --stage 2 --path learning-artifacts/report-judge
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

写一个被词汇规则拒绝的真实改写。人类需要哪些证据来裁决？
