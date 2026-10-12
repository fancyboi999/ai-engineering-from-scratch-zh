# 对翻译提案应用词表

第 2 阶段，共 4 阶段。对提供的翻译提案应用经审核词表。

## 构建机制

独立编写的西班牙语提案为 "Abre el map"。词表 map→mapa 把残留词改为 "Abre el mapa"。

```figure
pj-subtitle-localization-desk-2
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 propose(cues,translations,glossary)。不需要 provider；translations 是提供的目标语言文本，不是虚构机器输出。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py subtitle-localization-desk --stage 2 --path learning-artifacts/subtitle-localization-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

词表不能翻译语法或含义。缺失提案保留源文本和 translation_missing 标记。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
