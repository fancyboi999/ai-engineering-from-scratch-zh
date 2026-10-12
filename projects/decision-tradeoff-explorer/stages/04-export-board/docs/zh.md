# 导出选定情景

> 让看板生成可复用的决策记录。

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的前面阶段。
**预计时间：** 约 2 小时

## 构建内容

导出 criteria.csv、decision-record.json 和交互 HTML 看板。滑块重新计算分数。用户选择合格方案，下载当前权重、来源笔记和评分行。默认选择排名第一的方案，但不是强制要求。

## 示例推演

提高 accessibility，直到 open gallery 获胜，选中并下载。JSON 权重必须与可见滑块值相同。用户有意选择另一个合格方案时，chosen 字段可能与 winner 不同。

```figure
pj-decision-tradeoff-explorer-4
```

## 实现契约

`record(data,weights={},chosen?):object`；`csv(data):string`；`html(data):string`。版本 1 记录保留 criteria、options、weights、scores、chosen、winner、dominated 和 assumptions。HTML 载荷转义关闭 script 的标签；CSV 单元格加引号，对以公式起始字符开头的文本加前缀。

生成部分产物前先拒绝格式错误的输入。测试包括独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --init /tmp/decision-tradeoff-explorer-work
python3 scripts/project_test.py decision-tradeoff-explorer --stage 4 --path /tmp/decision-tradeoff-explorer-work --strict
```

初始化复制累积脚手架，不替换你的工作。在第一阶段 starter 中实现 TODO 函数；后续阶段 starter 笔记描述新增行为。测试导入学习者工作区。阶段通过后，按 README 中的命令运行自己的输入。

## 检查与扩展

将下载记录的 options、criteria 和 weights 传回 score，逐项比较分数，再把它作为审核证据接受。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。全部 fixture 和实现均为原创。
