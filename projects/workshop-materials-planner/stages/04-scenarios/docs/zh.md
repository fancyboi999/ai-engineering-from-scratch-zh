# 导出装箱清单和参与人数情景

第 4 阶段，共 4 阶段。比较参与人数并导出装箱回执。

## 构建机制

把 HTML 人数滑块从 8 移到 12。各人数的需求和缺口都从同一材料模型计算。

```figure
pj-workshop-materials-planner-4
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

输入 JSON 含 participants、materials、inventory、conversions 和可选 compare counts。输出 packing-list.csv、shortages.json、planner.html。滑块支持 0 到 100 人；CLI 支持任意非负整数。下载 decisions.json 保存选定人数，用 --decisions decisions.json 重跑，再通过 csv.DictReader 把 packing-list.csv 导入电子表格。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py workshop-materials-planner --stage 4 --path learning-artifacts/workshop-materials-planner --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

共享假定一次并发活动，组内无限复用。它不安排连续工作坊、采购提前期或材料替代。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
