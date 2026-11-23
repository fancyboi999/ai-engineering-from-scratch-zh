---
name: skill-prompt-injection-detector
description: 分层的检测流水线，对任意 prompt 返回类别和置信度，精确率与召回率可量化
version: 1.0.0
phase: 19
lesson: 83
tags: [safety, detector, prompt-injection]
---

# Prompt 注入检测器

这里的检测器是一个从 prompt 映射到判定结果的函数。判定结果包含一个来自第 82 课分类法的类别，以及一个 [0, 1] 内的置信度。

## 流水线

1. 规范化 - 去掉零宽字符，还原同形字，解码 base64/hex，把 leet-speak 数字折回字母，尝试 rot13 并用常见词做合理性检查。
2. 子串规则 - 手写的匹配串，例如 `ignore previous`、`from now on you are`、`decode this base64`。
3. 正则规则 - token 级的模式，例如 `\bignor\w*\s+(all|prior|previous|earlier)\b`。

聚合时每个类别保留最高分，返回分数最大的类别；如果什么都没触发，返回 `benign`。

## 添加规则

编辑 `code/rules.py`。一条规则是一个字典，包含 `name`、`category`（六个分类法类别之一）、`score`（0 到 1 的 float），以及 `substring` 或 `regex` 二选一。重新运行 `main.py`，查看对各类别精确率和召回率的影响。

## 产物

`outputs/detector_report.json` 是各类别的指标文件。第 87 课的端到端安全门读取它来设定置信度阈值。
