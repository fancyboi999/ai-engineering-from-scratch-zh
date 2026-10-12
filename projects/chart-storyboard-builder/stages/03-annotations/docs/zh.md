# 将注释绑定到实际绘制的数值

第 3 阶段，共 4 阶段。将每条注释锚定到计算所得的数据点。

## 构建机制

第 1 周的注释“Opening event”在求和图上变成“Opening event (18 people)”。

```figure
pj-chart-storyboard-builder-3
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 annotate(spec,requests)。只能注释唯一且非缺失的数据点。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py chart-storyboard-builder --stage 3 --path learning-artifacts/chart-storyboard-builder --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

注释是标签，不是统计显著性声明。因果措辞需要独立证据。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
