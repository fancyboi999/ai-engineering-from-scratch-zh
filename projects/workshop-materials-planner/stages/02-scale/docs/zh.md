# 分别缩放耗材与共享设备

第 2 阶段，共 4 阶段。用不同方程缩放耗材与可复用工具。

## 构建机制

八人每人两张纸需 16 张。每三人一把剪刀需 ceil(8/3)=3 把。

```figure
pj-workshop-materials-planner-2
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 scale(model,participants=None)；用字符串保留精确十进制数量。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py workshop-materials-planner --stage 2 --path learning-artifacts/workshop-materials-planner --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

九人仍需三把，十人却需四把。测试这个跳变，不要线性缩放每种材料。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
