# 根据可见文件特征评分分类

第 2 阶段，共 4 阶段。根据扩展名和文件名证据解释分类。

## 构建机制

workshop-handout.csv 得到 tables=3 和 documents=2，因此 tables 获胜，两个分数都可见。

```figure
pj-download-folder-sort-desk-2
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 categorize(record)。文件名是弱证据；识别到的扩展名得三分。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py download-folder-sort-desk --stage 2 --path learning-artifacts/download-folder-sort-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

这是透明的归档启发式，不是 MIME 验证或恶意软件分析。格式探测应单独添加。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
