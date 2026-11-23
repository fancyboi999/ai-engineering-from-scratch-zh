---
name: mt-evaluator
description: 评估机器翻译输出能否上线。
version: 1.0.0
phase: 5
lesson: 11
tags: [nlp, translation, evaluation]
---

拿到源文本和候选译文后，输出：

1. 自动评分估计。给出预期的 BLEU 和 chrF 范围。说明是否有参考译文。
2. 五项可人工核验的清单：内容保真（无幻觉）、目标语言正确、语域 / 正式程度匹配、术语与给定词表一致（如有）、没有截断或长度暴涨。
3. 一个需要重点探查的领域问题。法律：命名实体、法条引用。医疗：药名、剂量。UI：`{name}` 这类占位变量。
4. 置信标记。"Ship" / "Ship with review" / "Do not ship"。与发现问题的严重程度挂钩。

输出没做语种识别检查，拒绝上线。没有参考译文时拒绝评估，除非用户明确选择无参考评分（COMET-QE、BLEURT-QE）。任何超过 1000 token 的内容，标记为很可能需要分块翻译。
