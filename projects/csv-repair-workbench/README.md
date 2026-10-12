# CSV 修复工作台

通过明确的转换序列，帮助表格所有者修复不一致标签、日期和缺失值。预览每个变化单元格，将有歧义的情况留待审核，导出清理后的 CSV、可复用转换配方和 HTML 对比。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py csv-repair-workbench --init learning-artifacts/csv-repair-workbench
python3 scripts/project_test.py csv-repair-workbench --stage 1 --path learning-artifacts/csv-repair-workbench --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py csv-repair-workbench --all --path learning-artifacts/csv-repair-workbench --strict
cd learning-artifacts/csv-repair-workbench
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py csv-repair-workbench --all --solution --strict
cd projects/csv-repair-workbench/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

JSON 输入含 csv 文本、aliases 和 date_columns。输出 cleaned.csv、recipe.json、receipt.json 和 review.html。从 HTML 下载 decisions.json，在 cells 中添加 {row,column,value} 条目，用 --decisions decisions.json 重跑同一命令。通过 --recipe recipe.json 在另一份兼容表格上重放导出的配方。下游使用方用 csv.DictReader 读取 cleaned.csv。

## 示例推演与限制

样本含 North Garden、north garden 和 N. Garden。修改前先保留原始拼写和行号。

只识别斜杠日期和 ISO 日期。审核解决待处理日期单元格，不声称能推断区域格式或语义。

## 阶段

1. [分析列并保留原始单元格](stages/01-profile/docs/zh.md)
2. [提出明确的规范化规则](stages/02-rules/docs/zh.md)
3. [预览变化并审核有歧义的值](stages/03-preview/docs/zh.md)
4. [导出可复用修复配方和清理后的表格](stages/04-export/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
