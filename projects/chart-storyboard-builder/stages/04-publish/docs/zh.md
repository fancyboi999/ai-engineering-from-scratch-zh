# 导出无障碍可视化故事板和数据回执

第 4 阶段，共 4 阶段。生成可移植 SVG 图表和机器可读回执。

## 构建机制

折线在第 2、3 周附近断开。SVG 和导出的 null 值都保留这段缺口。

```figure
pj-chart-storyboard-builder-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

输入 JSON 含 csv、roles、可选 periods 和 charts [{grammar,reducer,annotations}]。输出 chart-N.svg、chart-specs.json、storyboard.html。下游使用方加载 chart-specs.json，逐一选择 charts 条目并调用 render_svg(spec)，无需输入 CSV 即可重现可移植图表。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py chart-storyboard-builder --stage 4 --path learning-artifacts/chart-storyboard-builder --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

工具支持分类柱状图和显式指定时段顺序的折线图。不推断日期、因果关系或置信区间；这些需另做统计分析。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
