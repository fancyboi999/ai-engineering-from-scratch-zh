# 在明确的时间预算内排序备选方案

第 3 阶段，共 4 阶段。在声明的时间预算内最大化目标覆盖。

## 构建机制

同样覆盖声明的制图目标时，45 分钟的快速制图可能优于 90 分钟的完整路线。覆盖不同目标的数量优先于节省时间。

```figure
pj-community-learning-path-finder-3
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 rank_paths(index,goals,budget,completed=None)。组合包含完整依赖的路线，对共享前置资源的并集去重，再按覆盖、分钟和 ID 排序。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py community-learning-path-finder --stage 3 --path learning-artifacts/community-learning-path-finder --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

排序反映明确目标和预计分钟数，不代表教学质量，也不保证掌握知识。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
