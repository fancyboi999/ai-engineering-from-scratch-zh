---
id: data-quality-workbenches
title: 数据质量与数据集门禁
code: DQ
subtitle: 用固定种子加载与拆分数据、修复 CSV 单元格、按契约筛选记录、审计泄漏并演练迁移。
hue: 30
sources: phases/00-setup-and-tooling/09-data-management, projects/csv-repair-workbench, projects/csv-sql-question-workbench, projects/dataset-contract-gate, projects/dataset-split-auditor, projects/database-migration-rehearsal
source_hash: c8c29680de38f7d4
---

## 各类门禁的产物
type: comparison
span: 2
from: projects/csv-repair-workbench/README.md, projects/csv-repair-workbench/API.md, projects/dataset-contract-gate/README.md, projects/dataset-contract-gate/API.md, projects/dataset-split-auditor/README.md, projects/database-migration-rehearsal/README.md, projects/database-migration-rehearsal/API.md

| 因素 | CSV 修复 | 契约门禁 | 拆分审计器 | 迁移演练 |
|---|---|---|---|---|
| 产物 | 清理后的表与配方 | 接受记录与隔离记录 | 逐记录泄漏报告 | 演练回执 |
| 输入 | csv 文本、aliases、date_columns | JSONL 与 contract.json | {train,test} 或 {records} | 数据库、迁移、回滚、不变量 |
| 输出 | cleaned.csv, recipe.json | accepted.jsonl, quarantine.jsonl | split-audit.json | rehearsal.json, schema-diff.json |
| 通过信号 | 没有待处理单元格 | `passed` 为 true | `usable` 为 true | `release_ready` 为 true |
| 门禁退出码 | 失败时非零 | 规则错误为 1，输入错误为 2 | 不可用时为 2 | 失败时非零 |
| 局限 | 仅斜杠和 ISO 日期 | 不判断语义真实性 | 仅精确副本，不含改写 | SQLite 策略，不是操作系统隔离 |

## 运行与评测
type: command-table
span: 2
from: projects/csv-repair-workbench/README.md, projects/csv-sql-question-workbench/README.md, projects/dataset-contract-gate/README.md, projects/dataset-split-auditor/README.md, projects/database-migration-rehearsal/README.md, phases/00-setup-and-tooling/09-data-management/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init <workspace>` | 创建工作区。首次运行会失败 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考解答 |
| `python3 cli.py samples/input.json --output demo-output` | 运行 CSV 修复或迁移演练 |
| `python3 cli.py sample.csv --question "sum units by region" --output output/report.html` | 回答 CSV 问题并提供回执 |
| `python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output` | 将记录分为接受与隔离两组 |
| `python3 cli.py samples/input.json --output split-audit.json --html split-audit.html` | 审计训练集与测试集拆分 |
| `python3 cli.py --train train.jsonl --test test.jsonl --check --output split-audit.json` | 在 CI 中审计 JSONL 分区 |
| `python code/data_utils.py` | 加载、转换、拆分数据集并计算指纹 |

## 只读 CSV 问答
type: architecture
from: projects/csv-sql-question-workbench/solution/main.py, projects/csv-sql-question-workbench/solution/cli.py, projects/csv-sql-question-workbench/README.md

```arch
node | csv | 1,1 | sample.csv | UTF-8，小于 2 MB | store
node | load | 2,1 | load_csv | 每列为 REAL 或 TEXT | process
node | plan | 3,1 | plan_question | 小型问题语法 | process
node | model | 3,2 | --model | 根据 schema 提出 SQL | model
node | run | 4,1 | run_query | 授权器、query_only、预算 | process
node | out | 4,2 | report.html | 附带 .json 回执 | client
edge | csv | load |
edge | load | plan | 问题
edge | load | model | schema
edge | plan | run | SQL
edge | model | run | SQL
edge | run | out | sha256 与 SQL
```

## 迁移演练
type: flow
from: projects/database-migration-rehearsal/API.md, projects/database-migration-rehearsal/solution/main.py, projects/database-migration-rehearsal/README.md

1. **snapshot**：以只读方式打开源数据库，将其备份到内存。
2. **snapshot**：记录 schema、行数、行内容 SHA-256 与序列。
3. **rehearse**：仅对内存副本应用迁移。
4. **rehearse**：禁止 ATTACH、DETACH、PRAGMA、虚拟表及文件函数。
5. **test_rollback**：在一次性备份中运行迁移与回滚。
6. **reversible**：没有错误，恢复后的快照与迁移前相同。
7. **receipt**：检查每个不变量。`release_ready` 要求全部不变量及回滚通过。

## 使用种子拆分
type: annotated-code
lang: python
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md

```python
dataset = load_dataset("stanfordnlp/imdb", split="train")
split = dataset.train_test_split(test_size=0.2, seed=42)
train_val = split["train"].train_test_split(test_size=0.125, seed=42)
train_ds = train_val["train"]                # 全部记录的 70%
val_ds = train_val["test"]                   # 10%
test_ds = split["test"]                      # 20%
dataset.to_parquet("imdb_train.parquet")     # 最佳存储格式
load_dataset("wikimedia/wikipedia", "20231101.en", split="train", streaming=True)
```

## 项目函数
type: task-table
from: projects/csv-repair-workbench/API.md, projects/dataset-contract-gate/API.md, projects/dataset-split-auditor/API.md, projects/database-migration-rehearsal/API.md, projects/csv-sql-question-workbench/solution/main.py

| 任务 | 代码 |
|---|---|
| 分析 CSV 列 | `profile(text)` |
| 预览单元格变更 | `preview(table, recipe)` |
| 应用已审核修复 | `repair(table, recipe, decisions=None)` |
| 检查一条记录 | `row_issues(row, contract)` |
| 查找重复组 | `duplicate_rows(rows, contract)` |
| 审计两个分区 | `audit(train, test)` |
| 按组哈希拆分 | `split_groups(records, test_fraction=0.2, seed='course')` |
| 运行有预算限制的读取 | `run_query(data, sql, max_rows=100, max_steps=100000)` |

## 大文件版本管理
type: command-table
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md

| 命令 | 作用 |
|---|---|
| `git lfs track "*.safetensors"` | 将文件存储在 git 外，用指针引用 |
| `dvc add data/training_set.parquet` | 创建小型 `.dvc` 指针文件 |
| `dvc remote add -d myremote s3://my-bucket/dvc-store` | 设置 DVC 远端 |
| `dvc push` | 将跟踪数据上传至远端 |
| `snapshot_download("sentence-transformers/all-MiniLM-L6-v2")` | 缓存完整模型仓库 |

## 默认值与限制
type: defaults
from: projects/csv-sql-question-workbench/solution/main.py, projects/csv-sql-question-workbench/solution/cli.py, projects/dataset-split-auditor/solution/cli.py, projects/dataset-contract-gate/solution/main.py, projects/database-migration-rehearsal/README.md, phases/00-setup-and-tooling/09-data-management/docs/zh.md, phases/00-setup-and-tooling/09-data-management/code/data_utils.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--limit` | 100 | 结果行数，最大 1000 |
| `max_steps` | 100000 | SQLite 指令预算 |
| `load_csv` 行数 | 10000 | 小于 2 MB，最多 50 列 |
| `--seed` | course | `--split` 的组哈希种子 |
| 契约记录数 | 100000 | API 输入上限 |
| SQL 截止时间 | 两秒 | 限制语句执行，不限制备份 |
| `make_splits` 种子 | 42 | 训练 0.8，验证 0.1 |
| 本地存储 | 10 GB | 超过此大小使用云存储 |

## 错误与修正
type: troubleshooting
from: projects/csv-repair-workbench/solution/main.py, projects/csv-sql-question-workbench/solution/main.py, projects/dataset-contract-gate/README.md, projects/dataset-split-auditor/README.md, projects/database-migration-rehearsal/API.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "ragged row" | 某行单元格数量不对 | 修正源记录 |
| 待处理的 "ambiguous date" | 两部分均不超过 12 且不同 | 在 decisions 中提供 ISO 日期 |
| "stale review" | 审核后表或配方已变 | 重新审核新预览 |
| "Query rejected: " | SQL 超出只读边界 | 对 `data` 编写一条 SELECT |
| "Aggregate column must contain finite numeric values" | 列为 TEXT | 对 REAL 列执行聚合 |
| 契约 `--check` 退出码为 1 | 有记录被隔离 | 阅读 review.html，逐项决定记录处理方式 |
| 拆分的 `usable` 为 false | 内容或分组泄漏 | 使用 `--split` 按组拆分 |
| `release_ready` 为 false | 回滚不精确 | 编写能恢复记录的回滚 SQL |

## 代码规则
type: concepts
from: projects/csv-repair-workbench/API.md, projects/dataset-contract-gate/API.md, projects/dataset-split-auditor/solution/main.py, phases/00-setup-and-tooling/09-data-management/docs/zh.md

- **配方顺序**：每列先去除首尾空白，再处理别名，最后处理日期。
- **变更**：每项变更标明行、列、变更前值和变更后值。
- **不强制转换**：布尔值 true 无法通过整数与数值字段校验。
- **重复项**：报告每条冲突记录，包括第一条。
- **门禁**：没有隔离记录且没有数据集问题时通过。
- **指纹**：先做 NFKC、大小写折叠和连续空格合并，再计算 SHA-256。
- **分组拆分**：种子与组的 SHA-256 除以 `2**256`，小于测试比例时归入测试集。
- **格式**：存储用 Parquet，内存用 Arrow，交换用 CSV 和 JSON。

## 问答
type: qa
from: projects/dataset-split-auditor/README.md, projects/database-migration-rehearsal/API.md, projects/dataset-contract-gate/API.md, projects/csv-sql-question-workbench/README.md, phases/00-setup-and-tooling/09-data-management/docs/zh.md

- **归一化能识别改写吗？** 不能。只能识别归一化后完全相同的副本。
- **演练会修改源数据库吗？** 不会。源数据库始终不以可写方式打开。
- **模型可以自由执行 SQL 吗？** 不可以。执行仍受 SQLite 授权控制。
- **可以直接丢弃隔离记录吗？** 不可以。分区是证据，不是丢弃许可。
- **为何设置种子？** 相同种子每次产生相同拆分。

## 提示
type: tips
from: projects/csv-repair-workbench/README.md, projects/dataset-contract-gate/API.md, projects/dataset-split-auditor/README.md, phases/00-setup-and-tooling/09-data-management/docs/zh.md

- 使用 `--recipe recipe.json` 在另一张表上重放配方。
- 下游使用 `csv.DictReader` 读取 cleaned.csv。
- 等门禁命令结束后再加载输出。
- 将输入保留在输出旁，便于他人复现。
- 用 `.gitignore` 将模型权重排除在 git 外。用 DVC 复现运行。
