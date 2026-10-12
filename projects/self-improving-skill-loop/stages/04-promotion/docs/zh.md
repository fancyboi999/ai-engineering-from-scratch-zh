# 晋升前要求独立门禁

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

在同一预留案例上比较基线和候选。要求最低汇总增益，且此前正确案例零退步，然后用摘要标识精确候选。门禁评估产物，绝不重写或部署用户技能。反复在同一留出集调参会泄漏信息，因此后续轮次应换成真正全新的评估集。

```figure
pj-self-improving-skill-loop-4
```

## 实现边界

```python
def gate(holdout,baseline,candidate,min_gain=.05):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。先完成[第 3 阶段](../../03-propose/docs/zh.md)。

通过的留出门禁生成候选摘要供人工审核。晋升要求精确摘要，写出带版本规则文件，并保留旧文件供回滚。发布的样本工单是示例，不是未见过的基准测试。

```text
baseline accuracy=0; candidate accuracy=1; no regression -> eligible
wrong digest -> no write
exact digest -> promote and retain .previous
```

## 构建与检查

批准绑定到序列化规则内容，写入前重算摘要。绝不根据好分数推断批准。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 4 --path learning-artifacts/self-improving-skill-loop
```

累积阶段通过后，在仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/self-improving-skill-loop/cli.py projects/self-improving-skill-loop/examples/support-cases.json --out experiment.json
```

实验从开发数据提出确定性路由规则。显式 development/holdout 输入接受内容和分组泄漏审计。晋升需要 --promote-to 和通过门禁打印的精确 --approve-digest。旧规则保存在 <destination>.previous 供手动回滚；这是单写入者文件流程。

## 下一步探究

再次编辑技能前，你会怎样冻结下一个留出集？

`--dataset-audit audit.json` 消费数据集划分审计器带版本的 `partitions.train` 和 `partitions.test` 记录，保留标签与来源，并在本地重新检查泄漏。`--export-skill orchard-routing` 写出新草稿 `SKILL.md` 和 `references/rules.json`；不会安装或激活候选。
