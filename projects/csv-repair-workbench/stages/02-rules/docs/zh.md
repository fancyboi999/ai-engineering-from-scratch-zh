# 提出明确的规范化规则

第 2 阶段，共 4 阶段。根据提供的政策构建顺序明确的配方。

## 构建机制

先去空白再查别名，因此“ North Garden ”可以映射为标准的 North Garden。不应用猜测的同义词。

```figure
pj-csv-repair-workbench-2
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 propose(table, aliases=None, date_columns=None)。每条规则都是明确的 trim、alias 或 date 操作。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py csv-repair-workbench --stage 2 --path learning-artifacts/csv-repair-workbench --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

未知列是错误。缺失值仍为缺失；可扩展加入填补政策。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
