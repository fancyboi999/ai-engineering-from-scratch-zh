# 审核 cue 长度、术语和含义

第 3 阶段，共 4 阶段。不移动时间戳，计算阅读压力。

## 构建机制

三秒 cue 在每秒 12 字符下有 36 个非空白字符的预算。更长字幕会被标记为需修订。

```figure
pj-subtitle-localization-desk-3
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 inspect(proposals,cps=17)，计数可见非空白码点前去掉 cue 标签。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py subtitle-localization-desk --stage 3 --path learning-artifacts/subtitle-localization-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

码点计数是透明近似，不是语言专属阅读速度。词表检查不能认证含义。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
