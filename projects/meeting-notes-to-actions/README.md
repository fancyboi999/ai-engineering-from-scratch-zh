# 会议笔记转行动项

关联来源的承诺收件箱，只有明确审核决策后才可导出。

Python 3.10+；逐行解析、字典、ISO 日期、转义和 JSON 文件。核心使用标准库。评分器检查你选择的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

在仓库根目录执行一次初始化。全新的起始实现会故意失败。

```bash
python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions
python3 scripts/project_test.py meeting-notes-to-actions --stage 1 --path learning-artifacts/meeting-notes-to-actions --strict
```

实现每个阶段，然后运行累积评分器和附带的输入驱动程序：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --all --path learning-artifacts/meeting-notes-to-actions --strict
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

驱动程序和离线样本是附带的脚手架，其导入指向你的实现。公开输入类型和函数签名见起始实现和 [API 契约](API.md)。

## 单独检查参考实现

在仓库根目录执行：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --all --solution --strict
cd projects/meeting-notes-to-actions/solution
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 观察变化

首次运行提出三个承诺，导出零条获批记录。审核 actions.html，选择决策并下载 decisions.json；用 --decisions decisions.json 重跑，仅导出已批准且完整的行动。

编辑样本的副本并重新运行命令。将输入与输出放在一起，让他人能够复现结果；附带样本是专门编写的教学数据。

## 集成与限制

使用 schema_version1 的 actions.json 回执，带稳定的行动 id 和原始源行。CSV 列为 id、owner、due 和 task，只包含已批准行动。

ACTION 行是权威候选；NAME will TASK by YYYY-MM-DD 是保守的提案语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审核不会发布任务或发送消息。

## 阶段

1. [解析显式行动记录并保留行来源](stages/01-parse-lines/docs/zh.md)
2. [校验负责人和日历日期](stages/02-validate-commitments/docs/zh.md)
3. [对完全相同的承诺去重并保留引用](stages/03-deduplicate-actions/docs/zh.md)
4. [发布经转义的 HTML 清单和摘要](stages/04-publish-checklist/docs/zh.md)


## 主要参考资料

[机制与 API 参考](https://docs.python.org/3/library/datetime.html)
