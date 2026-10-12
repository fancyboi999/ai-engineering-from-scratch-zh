# 发布其他开发者能复现的答案

**类型：** Build
**语言：** Python
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是 CSV 问答工作台的一部分：向 CSV 提问，检查实际执行的 SQL，保留可复现的只读答案回执。

公共契约为 `render_report(report)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

有用的数据答案带有查询和输入身份。在表格上方展示已执行 SQL，在 HTML 旁保留机器可读回执。报告必须说明截断和来源追踪范围。数据库结果只证明该文件在该查询下的结果，不证明文件准确。

生成 HTML 时将每个单元格和列标题视为不受信任文本。浏览器应显示含 script 标签的单元格，而非执行它。同一 JSON 回执让 notebook、CI 检查或其他 agent 无需抓取可视报告即可使用答案。

| 地区 | SUM(units) |
|---|---|
| East | 10 |
| South | 9 |
| West | 21 |

## 运行前预测

把一个 West 输入从 4 改为 6。预测聚合值和指纹的变化，再比较两份回执。

```figure
pj-csv-sql-question-workbench-4
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 4 --path my-csv-sql-question-workbench --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 对插入标记的数据使用 html.escape。
2. 展示实际运行的 SQL，而不只是原问题。
3. 从同一报告对象生成 JSON 和 HTML。

## 预期结果

本阶段评分器报告第 1 到第 4 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终产物是独立 HTML 结果表和含精确 SQL 与源指纹的 JSON 回执。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

将 JSON 回执集成到一个简单回归检查中，比较已知聚合值。

范围：离线规划器接受一套简单、明确的问题语法。可选真实模型只收到模式和问题，负责提出 SQL。执行仍由 SQLite 授权控制。源级来源追踪不意味着推断出每个结果行的血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
