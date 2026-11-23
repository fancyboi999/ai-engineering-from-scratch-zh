---
name: skill-content-classifier-integration
description: 三个输出端分类器（毒性、PII、指令泄漏）接在同一个严重度路由器后面，动作分为 block、redact、warn、log
version: 1.0.0
phase: 19
lesson: 85
tags: [safety, classifier, output-filter]
---

# 内容分类器集成

三个分类器，一个路由器，四种动作。

## 判定结构

```text
ClassifierVerdict
  name: str
  severity: none | low | medium | high
  score: float in [0, 1]
  findings: list[str]
```

## 动作表

| 严重度 | 动作 | 效果 |
|---|---|---|
| high | block | 输出替换为策略性拒绝 |
| medium | redact | 按顺序应用各分类器的脱敏器 |
| low | warn | 输出照常发出，末尾附一条温和提示 |
| none | log | 输出原样发出，记录判定结果 |

## 各分类器行为

- toxicity - 骚扰类词汇，按空白边界匹配，并在左侧小窗口内做否定检查；脱敏为 `[redacted-language]`
- pii - 邮箱、电话、SSN、通过 Luhn 校验的卡号、IPv4；SSN 和卡号的严重度会升级；每种形态都脱敏为一个标签
- instruction-leakage - 与已知 system prompt 计算三元组余弦相似度；严重度随重合度上升；脱敏 system prompt 的第一行

## 产物

`outputs/classifier_report.json` 记录每个用例的动作、严重度、脱敏后的输出和完整的判定列表。
