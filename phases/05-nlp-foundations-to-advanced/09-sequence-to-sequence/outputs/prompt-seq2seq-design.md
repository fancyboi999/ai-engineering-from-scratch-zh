---
name: seq2seq-design
description: 为具体任务设计序列到序列流水线。
phase: 5
lesson: 09
---

拿到任务（翻译、摘要、复述、问题改写）后，输出：

1. 架构。默认用预训练的 transformer 编码器-解码器（BART、T5、mBART、NLLB）。只有在特定约束下（流式、边缘推理、教学）才用基于 RNN 的 seq2seq。
2. 起步 checkpoint。写出名字（`facebook/bart-base`、`google/flan-t5-base`、`facebook/nllb-200-distilled-600M`）。checkpoint 要和任务及语言覆盖范围匹配。
3. 解码策略。要确定性输出用贪心，要质量用束搜索（宽度 4-5），要多样性用带温度的采样。用一句话论证。
4. 上线前要验证的一个失败模式。曝光偏差会表现为长输出上的生成漂移；抽 20 条长度在 90 分位的输出，人工过一遍。

平行语料少于约 100 万条时，拒绝推荐从零训练 seq2seq。任何对面向用户的内容使用贪心解码的流水线，都标记为脆弱（贪心会重复、会打转）。
