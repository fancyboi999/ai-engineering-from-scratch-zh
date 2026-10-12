# 导出本地化字幕和审核决策

第 4 阶段，共 4 阶段。输出本地化 WebVTT 前要求明确审核。

## 构建机制

审核者缩短一个较长西班牙语 cue，批准每个 cue 并下载决策。导出时间戳和 cue 标识与原文一致。

```figure
pj-subtitle-localization-desk-4
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

输入 JSON 含 vtt、translations、glossary 和可选 cps。输出 review.html 和 translation-decisions.json。下载 decisions.json，编辑 cue 文本和 approved 标记，再用 --decisions decisions.json 重跑。只有全部 cue 获批才创建 reviewed.vtt；超预算 cue 还需 override_budget=true。用 parse_vtt 或视频播放器的 WebVTT 轨道消费 reviewed.vtt。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py subtitle-localization-desk --stage 4 --path learning-artifacts/subtitle-localization-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

离线核心使用提供的翻译，不调用翻译 provider。可选 provider 适配器可填充同一 translations 映射；每个结果仍需审核。语义质量取决于双语审核者。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
