# 校验负责人和日历日期

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

行动清单是操作数据。拒绝不可能的日历日期，不能只接受看起来像日期的形状。缺少负责人或日期不是解析器崩溃，而是审核标记。

未知字段用字面标记 ?。这样在结构化输出中保留不确定性。日期解析使用 ISO 日历日期，不为全天承诺虚构时区。

要求来源引用是由正整数构成的非空列表。拒绝布尔值，尽管 Python 把它视作整数。无效或缺失引用不能成为发布清单中的可信证据。

## 推演一个具体案例

2026-02-30 数字模式正确，但不是日历日期。标记 ? 表示缺失承诺字段，生成 needs_date 或 needs_owner，而不是猜值。

```figure
pj-meeting-notes-to-actions-2
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `validate_action`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

先强制规定的 ISO 形状，再用 date.fromisoformat 解析。验证源行号是正整数，明确拒绝 bool、空列表和类似 HTML 的值。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 2 --path learning-artifacts/meeting-notes-to-actions --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

尝试批准 owner 为 ? 的行动。收件箱必须拒绝批准，把不完整承诺留待审核。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/datetime.html)
