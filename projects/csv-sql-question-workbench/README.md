# CSV 问答工作台

向 CSV 提问，检查实际执行的 SQL，保留可复现的只读答案回执。

最终得到独立 HTML 结果表和包含精确 SQL 与源指纹的 JSON 回执。

## 运行完成的工具

从仓库根目录运行：

```bash
cd projects/csv-sql-question-workbench/solution
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

样本为本项目原创。通过相同 CLI 换成自己的输入。基线无需模型密钥。启用可选外部适配器前，先阅读命令帮助。

## 自己动手构建

先学习[开发环境设置](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。开始前应能读取 JSON 对象、调用函数、运行终端命令并理解失败测试。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 1 --path my-csv-sql-question-workbench --strict
python3 scripts/project_test.py csv-sql-question-workbench --all --path my-csv-sql-question-workbench --strict --report completion.json
```

新工作区在函数实现前会故意失败。CLI、输入文件和公共类型已提供，无需复制参考入口即可完成。按顺序学习各阶段：

1. [导入表格，不靠猜测掩盖错误](stages/01-import-table/docs/zh.md)
2. [将简单问题转换为可检查的计划](stages/02-plan-question/docs/zh.md)
3. [在只读边界内执行提案](stages/03-enforce-read-boundary/docs/zh.md)
4. [发布其他开发者能复现的答案](stages/04-publish-receipt/docs/zh.md)

## 复用产物

CLI 和可导入函数使用普通本地文件，返回结构化输出。与其他程序集成时保留输入身份及明确的失败元数据。HTML 输出不含第三方脚本；检查其中包含的源数据后即可分享。

## 验证与范围

```bash
python3 scripts/project_test.py csv-sql-question-workbench --all --solution --strict
```

离线规划器接受一套简单、明确的问题语法。可选真实模型只收到模式和问题，负责提出 SQL。执行仍由 SQLite 授权控制。源级来源追踪不意味着推断出每个结果行的血缘。

评分校验提供的确定性契约。学习者证书是自我声明的完成记录，不代表真实 provider 验证或专业认证。将工具视为已集成前，先阅读 JSON 回执并至少测试一份新输入。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。
