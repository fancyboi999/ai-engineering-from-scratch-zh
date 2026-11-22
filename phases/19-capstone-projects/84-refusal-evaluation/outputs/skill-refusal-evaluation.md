---
name: skill-refusal-evaluation
description: 在带标注的 prompt 语料上计算双向拒绝指标，含校准度和按类别拆分
version: 1.0.0
phase: 19
lesson: 84
tags: [safety, evaluation, calibration]
---

# 拒绝评估

一份标注了安全与不安全的 prompt 语料，交给一个或多个模型策略处理。输出被分为拒绝或回答。框架返回：

- 拒绝不足：被回答的不安全 prompt 数 / 不安全 prompt 总数
- 过度拒绝：被拒绝的安全 prompt 数 / 安全 prompt 总数
- 准确率：（正确拒绝数 + 正确回答数）/ 总数
- ECE：按声明置信度分箱计算的期望校准误差
- 各类别的拒绝不足：与第 82 课的分类法关联计算

## 接入真实模型

mock LLM 是一个可调用对象 `(prompt: str) -> str`。把它换成一个 HTTP 封装，返回模型输出并嵌入置信度标签（或者修改 `parse_confidence`，读取你的服务商提供的任何字段）。其余部分保持不变。

## 产物

`outputs/refusal_eval_report.json` 包含各策略的指标。第 87 课读取这份报告来设定阈值。
