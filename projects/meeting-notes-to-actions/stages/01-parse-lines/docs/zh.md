# 解析显式行动记录并保留行来源

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

自然会议文字包含建议、决策和承诺。从显式格式开始：ACTION owner | YYYY-MM-DD | task。这个保守解析器避免根据附近的人名虚构负责人。

每条解析记录都保留原始行号和文本。后续审核者必须能将行动追溯到某人写下的确切内容。非行动行不进入输出。

## 推演一个具体案例

第 1 行是决策，第 2 行是 ACTION Mira |2026-10-01|Update guide，第 3 行写着 Maybe ask Ravi。只有第 2 行成为显式候选。另设的提案语法可以识别 "Priya will test login by2026-10-02"，前提是正常补上空格。

```figure
pj-meeting-notes-to-actions-1
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `parse_notes`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

过滤前先枚举原始行。ACTION 只按前两个分隔符切分，使任务正文中的另一个竖线不会挤偏负责人和日期。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 1 --path learning-artifacts/meeting-notes-to-actions --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

将一个行动下移两行并重跑。保存的引用也须移动，不相关文字仍保持未分配。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/datetime.html)
