# 分析列并保留原始单元格

第 1 阶段，共 4 阶段。保留精确的源单元格，同时统计缺失值与不同值。

## 构建机制

样本含 North Garden、north garden 和 N. Garden。修改前先保留原始拼写和行号。

```figure
pj-csv-repair-workbench-1
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 profile(text)：rows 保留字符串，profile 将仅含空白的单元格计为缺失。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py csv-repair-workbench --stage 1 --path learning-artifacts/csv-repair-workbench --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

引号内的逗号属于同一单元格。拒绝重复表头和宽度不同的行。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
