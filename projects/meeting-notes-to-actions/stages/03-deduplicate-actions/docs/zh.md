# 对完全相同的承诺去重并保留引用

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

重复笔记可造成重复任务。按规范化负责人、截止日期和规范化任务文本分组，再合并全部源行号。分配给两个人的相同任务仍是两个承诺。

这是精确规范化，不是语义去重。避免自动合并改写，因为截止日期或范围可能不同。人工审核比悄悄删除独立义务更安全。

## 推演一个具体案例

第 2 和第 8 行的两个相同承诺合成一行，引用为 citations[2,8]。更改负责人或截止日期，就会产生第二个承诺，即使任务文本相同。

```figure
pj-meeting-notes-to-actions-3
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `deduplicate`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

从规范化的 owner、due 和 task 构建键，同时保留显示文本。按排序顺序合并引用集合，使重复导入输出确定。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 3 --path learning-artifacts/meeting-notes-to-actions --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

写一个截止日期更晚的改写。解释自动语义合并为什么可能删除实际义务。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/datetime.html)
