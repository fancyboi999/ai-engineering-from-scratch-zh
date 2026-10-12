# 计算聚合值并选择图表语法

第 2 阶段，共 4 阶段。计算绘图数据并展示缺失时段。

## 构建机制

第 1 周总计 18 人，平均 9 人。提供第 1 到第 4 周后，第 3 周会被明确标为缺失时段。

```figure
pj-chart-storyboard-builder-2
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 aggregate(table,reducer="sum",periods=None,grammar="bar")。空分组返回 null，绝不凭空补零。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py chart-storyboard-builder --stage 2 --path learning-artifacts/chart-storyboard-builder --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

不接受丢弃已观察数据的时段列表。柱状图和折线图的坐标轴都包含零。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
