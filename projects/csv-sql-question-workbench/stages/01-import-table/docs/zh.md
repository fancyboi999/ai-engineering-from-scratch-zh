# 导入表格，不靠猜测掩盖错误

**类型：** Build
**语言：** Python
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是 CSV 问答工作台的一部分：向 CSV 提问，检查实际执行的 SQL，保留可复现的只读答案回执。

公共契约为 `load_csv(text, max_rows=10000)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

从文件边界开始。CSV 读取器能处理引号内的逗号和换行；按逗号拆分每行做不到。将原始字节指纹与解析后的行分开保存，让答案能标识实际提供的文件。

仅当每个非空单元格都是 binary64 安全整数幅度内的有限十进制数，且不会下溢为零时，列才视为数值列。保留带前导零的整数字面值为 TEXT。大于 9007199254740991 的值也保持 TEXT，避免不同标识符折叠为同一个浮点数。REAL 列的十进制运算仍是近似的；如需扩展精确数值，使用明确的精确数值模式。空单元格之后转换为 SQL NULL。这个保守规则让混合标识符列保持文本。拒绝大小写不敏感的重复表头，因为 SQLite 认为这些名称等价。创建数据库前拒绝列数不齐的记录。

| 输入列 | 非空值 | 推断类型 |
|---|---|---|
| region | West, East | TEXT |
| units | 12, 7 | REAL |
| ticket | 001, 002 | TEXT |
| item_id | 9007199254740992, 9007199254740993 | TEXT |

## 运行前预测

跟踪一个包含逗号的带引号单元格。解释为何只改一个源字符就会改变指纹，即使下游聚合值不变。

```figure
pj-csv-sql-question-workbench-1
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 1 --path my-csv-sql-question-workbench --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 用 csv.reader 严格解析。
2. 根据所有非空值而非第一条记录推断每列。
3. 转换前对输入文本求哈希。

## 预期结果

本阶段评分器报告第 1 到第 1 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终产物是独立 HTML 结果表和含精确 SQL 与源指纹的 JSON 回执。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

添加混合数值/文本列，预测是否应允许 SUM。

范围：离线规划器接受一套简单、明确的问题语法。可选真实模型只收到模式和问题，负责提出 SQL。执行仍由 SQLite 授权控制。源级来源追踪不意味着推断出每个结果行的血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
