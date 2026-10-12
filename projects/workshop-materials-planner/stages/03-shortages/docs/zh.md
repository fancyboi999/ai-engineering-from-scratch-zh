# 计算缺口并审核不确定换算

第 3 阶段，共 4 阶段。核对库存，不猜未知换算。

## 构建机制

十二人需 24 张纸，现有 20 张则缺 4 张。胶水的 0.1 升通过显式因子 1000 换成 100 毫升。

```figure
pj-workshop-materials-planner-3
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 shortages(model,participants=None)。无法换算库存项让 available 和 shortage 为 null。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py workshop-materials-planner --stage 3 --path learning-artifacts/workshop-materials-planner --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

瓶不是标准体积单位。将其声明容量加入 conversions，或把不确定行留待审核。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
