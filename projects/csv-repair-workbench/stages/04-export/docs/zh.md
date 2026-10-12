# 导出可复用修复配方和清理后的表格

第 4 阶段，共 4 阶段。重放配方并校验人工单元格决定。

## 构建机制

对第 2 行 date=2026-04-03 的决定，仅在输入和配方指纹匹配时接受。每项接受的编辑都进入变化账本。

```figure
pj-csv-repair-workbench-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

JSON 输入含 csv 文本、aliases 和 date_columns。输出 cleaned.csv、recipe.json、receipt.json 和 review.html。从 HTML 下载 decisions.json，在 cells 中添加 {row,column,value} 条目，用 --decisions decisions.json 重跑同一命令。通过 --recipe recipe.json 在另一份兼容表格上重放导出的配方。下游使用方用 csv.DictReader 读取 cleaned.csv。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py csv-repair-workbench --stage 4 --path learning-artifacts/csv-repair-workbench --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

只识别斜杠日期和 ISO 日期。审核解决待处理日期单元格，不声称能推断区域格式或语义。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
