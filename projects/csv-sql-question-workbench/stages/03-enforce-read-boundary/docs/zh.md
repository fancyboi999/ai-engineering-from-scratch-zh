# 在只读边界内执行提案

**类型：** Build
**语言：** Python
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是 CSV 问答工作台的一部分：向 CSV 提问，检查实际执行的 SQL，保留可复现的只读答案回执。

公共契约为 `run_query(data, sql, max_rows=100, max_steps=100000)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

检查字符串是否以 SELECT 开头并不够：SQL 能调用函数、检查内部表或将昂贵操作藏进查询。构建隔离的内存表，在编译不受信任语句前安装 SQLite 授权器。允许读取该表和少量函数，拒绝其他动作。

两种预算回答不同问题。最多获取限制加一行能发现截断。指令回调则在巨大结果产生前中断过量计算。原始 CSV 绝不以写入方式打开。这为教学数据库设定边界，不是多租户数据库服务。

| 提案 | 结果 |
|---|---|
| SELECT SUM(units) FROM data | 返回 40 |
| DELETE FROM data | 生效前拒绝 |
| SELECT * FROM data with limit 2 | 两行及 truncated=true |

## 运行前预测

解释为何仅限制行数，不能阻止在返回首行前就进行计算的昂贵连接。

```figure
pj-csv-sql-question-workbench-3
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 3 --path my-csv-sql-question-workbench --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 安装授权器前创建并填充数据库。
2. 执行和获取结果期间保持回调生效。
3. 用元数据报告截断，不静默声称结果完整。

## 预期结果

本阶段评分器报告第 1 到第 3 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终产物是独立 HTML 结果表和含精确 SQL 与源指纹的 JSON 回执。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

使用刻意昂贵的读取，证明指令预算能中断它。

范围：离线规划器接受一套简单、明确的问题语法。可选真实模型只收到模式和问题，负责提出 SQL。执行仍由 SQLite 授权控制。源级来源追踪不意味着推断出每个结果行的血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
