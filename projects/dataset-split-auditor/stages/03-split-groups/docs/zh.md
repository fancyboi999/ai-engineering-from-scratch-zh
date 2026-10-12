# 用稳定哈希划分分组

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

划分分组，不划分行。将 seed 和 group ID 哈希为稳定比例，与所请求 test 比例比较。一个组中的每行都遵循同一决定，与输入顺序无关。

哈希划分给出预期比例，而非精确行数。小数据集可能有空分区。诚实报告，不要移动一行来破坏分组隔离。

## 推演一个具体案例

若 incident-A 含九条消息，incident-B 含一条，50% 分组划分可能得到九条 train 行和一条 test 行。移动一条消息以平衡行数，会重新引入事件泄漏。

```figure
pj-dataset-split-auditor-3
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `split_groups`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

根据 seed 加 group 得出分区决定，绝不依据输入行顺序。反转输入列表可以改变行顺序，但必须保留每个 ID 的分区归属。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 3 --path learning-artifacts/dataset-split-auditor --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 探查失败边界

生成 20 个大小不同的分组，改变 seed，分别比较分组隔离和行数平衡。




## 参考资料

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
