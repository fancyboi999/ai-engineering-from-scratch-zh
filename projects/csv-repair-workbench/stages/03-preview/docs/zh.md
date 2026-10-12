# 预览变化并审核有歧义的值

第 3 阶段，共 4 阶段。展示每个变化单元格并隔离不确定日期。

## 构建机制

14/03/2026 变为 2026-03-14。03/04/2026 和 04/03/2026 都保持待处理，因为两种顺序均合理。

```figure
pj-csv-repair-workbench-3
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 preview(table, recipe)，返回 rows、changes、pending 和 SHA-256 审核指纹。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py csv-repair-workbench --stage 3 --path learning-artifacts/csv-repair-workbench --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

31/02/2026 这样的日期是无效，而非仅有歧义。保留它让人看到，不要强制转换。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
