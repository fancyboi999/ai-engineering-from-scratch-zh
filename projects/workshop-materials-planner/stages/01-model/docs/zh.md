# 建模参与者、材料和库存单位

第 1 阶段，共 4 阶段。校验数量、单位和显式共享规则。

## 构建机制

八位参与者每人需要纸张，每三人共享剪刀。除非提供换算，一瓶胶水有多少毫升是未知的。

```figure
pj-workshop-materials-planner-1
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 validate(document)。转换因子描述一个源单位相当于多少目标单位。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py workshop-materials-planner --stage 1 --path learning-artifacts/workshop-materials-planner --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

拒绝负数量、重复材料 ID、零共享组人数和不一致转换环。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
