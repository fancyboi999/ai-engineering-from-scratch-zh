# 将简单问题转换为可检查的计划

**类型：** Build
**语言：** Python
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是 CSV 问答工作台的一部分：向 CSV 提问，检查实际执行的 SQL，保留可复现的只读答案回执。

公共契约为 `plan_question(question, data)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

问题规划器只提出查询，不执行查询。基线有意只支持 count rows、show rows 及 sum units by region 这类分组聚合。不支持的问题会返回示例并失败，而非编造看似合理的答案。

根据导入的模式解析字段名，并为解析后的标识符加引号。不要把任意用户子串插入 SQL。可选模型也遵循提案与执行分离：下一阶段授权前，模型响应只是未受信任的文本。

| 问题部分 | 解析含义 |
|---|---|
| sum | SQL 聚合 SUM |
| units | 已存在的数值列 |
| by region | 对已存在的 region 列执行 GROUP BY |

## 运行前预测

预测 count by product 对应的 SQL。然后尝试 sum region by product，在执行前解释类型拒绝。

```figure
pj-csv-sql-question-workbench-2
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 2 --path my-csv-sql-question-workbench --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 仅规范化问题语法。
2. 将接受的字段 token 映射回实际列名。
3. 保持查询生成纯粹，让测试不需要数据库。

## 预期结果

本阶段评分器报告第 1 到第 2 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终产物是独立 HTML 结果表和含精确 SQL 与源指纹的 JSON 回执。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

添加一种新问题形式，明确歧义规则并编写测试。

范围：离线规划器接受一套简单、明确的问题语法。可选真实模型只收到模式和问题，负责提出 SQL。执行仍由 SQLite 授权控制。源级来源追踪不意味着推断出每个结果行的血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
