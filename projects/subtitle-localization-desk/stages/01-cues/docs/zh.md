# 解析字幕 cue 并保留时间

第 1 阶段，共 4 阶段。解析 cue 标识，保留精确时间字符串。

## 构建机制

cue map 从 00:00.000 开始，在 00:03.000 结束。三秒窗口在每次翻译中保持不变。

```figure
pj-subtitle-localization-desk-1
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 parse_vtt(text)。支持子集保留 cue ID、settings 和多行文本；跳过 NOTE 块，拒绝 STYLE/REGION。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py subtitle-localization-desk --stage 1 --path learning-artifacts/subtitle-localization-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

允许重叠 cue；不接受递减开始时间和零长度区间。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
