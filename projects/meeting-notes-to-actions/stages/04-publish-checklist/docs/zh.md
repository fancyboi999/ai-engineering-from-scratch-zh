# 发布经转义的 HTML 清单和摘要

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

清单在解析器之外可读、可审核才有用。渲染前校验源行引用，再将负责人、日期、任务和源行放入 HTML，转义每个渲染字段。仅根据显式提供的日期标记逾期项。

HTML 是静态审核产物，不发消息，也不在其他系统创建任务。计数器区分就绪、不完整和逾期行动，让读者优先安排审核。

## 推演一个具体案例

首次收件箱运行导出零行，因为就绪不等于批准。HTML 选择明确决策并下载 JSON 决策文件；下一次 CLI 运行只将已批准且完整的行导出到 CSV。

```figure
pj-meeting-notes-to-actions-4
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `publish`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

稳定 id 将审核选择绑定到负责人、截止日期、任务和源行。附带驱动程序先为每个当前项分配 id，再校验决策，在写输出前拒绝任何未知或过期 id。源行变化后，旧决策文件必须重新审核。下载决策时，选择器保留当前批准和拒绝选择。转义每个导入字段；HTML 中唯一可执行脚本是编写的决策文件下载器。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 4 --path learning-artifacts/meeting-notes-to-actions --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

在任务里粘贴 script 标签。它必须作为源文本渲染，下载的决策只能包含行动 id 和允许的决策值。

ACTION 行是权威候选；NAME will TASK by YYYY-MM-DD 是保守的提案语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审核不会发布任务或发送消息。


## 参考资料

[主要技术参考](https://docs.python.org/3/library/datetime.html)
