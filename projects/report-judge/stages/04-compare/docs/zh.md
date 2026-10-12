# 用 bootstrap 区间比较配对修订

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

按问题 ID 配对分数，再对差值重采样。配对控制部分问题更难这一事实。区间仅描述所提供划分；小数据集不会因为抽很多 bootstrap 样本就变可靠。升级判断还拒绝任何逐问题回归。

```figure
pj-report-judge-4
```

## 实现边界

```python
def compare(baseline,candidate,seed=7,samples=2000):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 3 阶段](../../03-metrics/docs/zh.md)。

比较报告变化前后的相同问题。简单问题的收益可能掩盖一个有害回归；在 bootstrap 区间旁保留逐问题差值。

```text
baseline: q1=80,q2=70,q3=90
candidate: q1=85,q2=75,q3=60
deltas: +5,+5,-30; q3 remains a regression
```

## 构建与检查

用确定性 seed 重采样配对差值。区间描述这份有标签样本，不代表所有未来报告的事实准确率。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py report-judge --stage 4 --path learning-artifacts/report-judge
```

累积阶段通过后，从仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/report-judge/cli.py projects/report-judge/examples/claims.json --out evidence-audit.json --html evidence-audit.html
```

评审器提供保守的词汇证据检查。顺序、数字和否定暴露部分错误匹配；改写仍可能被拒绝，其他错误匹配仍存在。缺少召回/覆盖标签时为 null。任何自动分数都不证明真实。

## 接下来探查

再添加一份 q1 能产生独立证据吗？
