# 数据库迁移演练

让开发者或编码 agent 在可丢弃的数据库副本上提出 SQLite 迁移。记录前后的模式和行数不变量，测试声明的回滚步骤，展示不可逆变化。导出机器可读演练回执和审核页面，不触碰源数据库。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py database-migration-rehearsal --init learning-artifacts/database-migration-rehearsal
python3 scripts/project_test.py database-migration-rehearsal --stage 1 --path learning-artifacts/database-migration-rehearsal --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py database-migration-rehearsal --all --path learning-artifacts/database-migration-rehearsal --strict
cd learning-artifacts/database-migration-rehearsal
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py database-migration-rehearsal --all --solution --strict
cd projects/database-migration-rehearsal/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 含 database（相对于 JSON 的路径）、migration SQL、rollback SQL 和 invariants。未提供 database 时，演示在输出目录创建原创 SQLite fixture。输出 rehearsal.json、schema-diff.json、review.html。发布门禁读取 rehearsal.json，要求 release_ready=true，同时保留各项不变量和回滚证据供人工审核。

## 示例推演与限制

源表有两名参与者。快照记录 CREATE TABLE 语句、计数 2 和排序后行表示的哈希。

工具不在原数据库上应用迁移，也不批准部署。大型表的演练可能占用大量内存；使用小型本地快照。两秒 SQL 进度期限限制语句，不限制所有备份或哈希工作。

## 阶段

1. [快照本地数据库并定义不变量](stages/01-snapshot/docs/zh.md)
2. [仅在可丢弃副本上应用迁移](stages/02-migration/docs/zh.md)
3. [执行回滚并检测数据丢失](stages/03-rollback/docs/zh.md)
4. [导出证据供明确的发布决策使用](stages/04-receipt/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
