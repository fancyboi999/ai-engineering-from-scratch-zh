---
id: extend-context-past-training
title: 把模型从 8K 扩展到 128K
card: transformers
kind: design
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, ml-depth]
tags: [long-context, rope, yarn, positional-encoding, fine-tuning]
minutes: 12
lessons: [phases/07-transformers-deep-dive/04-positional-encoding, phases/19-capstone-projects/32-token-positional-embeddings]
manuals: []
practice: [rope]
cheatsheet: [positional-encoding]
related: [transformers/rope-relative-from-absolute, transformers/permutation-blind-attention]
updated: 2026-11-03
---

一个模型训练时的上下文是 8K token。产品现在需要 128K。你有一笔不大的微调预算，没有重新预训练的预算。请按模型编码位置的方式列出可选方案，并给出你会执行的计划。

## Short answer

答案取决于位置方案，所以先读配置。可学习的绝对位置表在训练长度之外没有对应的行，不加新参数就无法扩展。用旋转编码时，可以缩放基数或对位置做插值，比如 NTK-aware 缩放、YaRN 或 LongRoPE，再在长序列上微调；课程的参考例子是一个模型家族用这种方式从 8K 扩展到 128K。线性偏置注意力天生就能外推，但已训练好的模型没法零成本换成它。

## Full answer

### 按方案分的选项

| 检查点里的方案 | 能到 128K 吗？ | 怎么做 |
|---|---|---|
| 可学习的绝对位置表 | 不加新行就不能 | 加行并训练，或者重新训练 |
| 固定正弦编码 | 公式能延伸，模型不能 | 模型从没见过那些相位；预计质量很差 |
| 旋转编码 | 能 | 缩放基数或对位置插值，然后微调 |
| 线性偏置 | 按设计就能 | 本来就能外推；但它是训练时的选择 |

### 旋转编码的工具箱

- **位置插值加微调。** 按扩展倍数缩小位置，让角度留在训练过的范围内，然后微调 1 到 5B token。简单有效。
- **NTK-aware 缩放。** 从 4K 扩到 16K 及以上时，把基数改成 `base * scale_factor ** (d / (d - 2))`，避免高频的坐标对被挤压。
- **YaRN。** 按维度混合插值和外推，在长上下文中保持注意力的熵；它需要一个微调阶段。
- **LongRoPE。** 搜索每个维度的缩放因子；用于非常长的上下文。

### 计划

1. 从模型配置确认位置方案，读出当前的 rope scaling 配置块。
2. 选 YaRN 或位置插值，按 128K 设定倍数，并准备一份长序列微调数据。
3. 训练之前，在比训练长度更长的序列上测量用与不用缩放时的困惑度，做法和课程练习在 256 与 1024 长度上做的一样。
4. 微调，然后在目标长度和原始长度上再测一遍，避免长输入上的提升掩盖短输入上的退化。
5. 做显存预算。键值 cache 随上下文线性增长，而 128K 是 8K 的十六倍。

### 怎么跟产品团队说

位置方案决定能不能做。旋转编码的模型有一个干净的旋钮，只需要一次短的微调。用可学习位置表或正弦编码的模型，要么重新训练，要么换模型。

## Follow-ups

- **Level 3:** 旋转编码的模型什么都不改直接跑 128K，为什么会失败？ Expected: 转得快的坐标对达到了模型从没见过的角度，所以远距离上的分数是噪声。
- **Level 3:** 上线前你坚持要哪两项测量？ Expected: 新长度下的困惑度或任务质量，以及原始长度下的同一项指标，用来发现退化。
- **Level 4:** 团队提议把模型换成线性偏置注意力，因为它外推好。你怎么回答？ Expected: 那是训练时的选择；用旋转编码训练的检查点，不重新训练就换不成分数偏置。
- **Level 4:** 即使质量没问题，128K 在服务端会坏在哪里？ Expected: 每个 token 的键和值占用的显存，它随上下文增长；注意力栈需要分组查询注意力或潜在注意力，以及分块 kernel。

## Wrong answers

- "把配置里的最大位置调大就上线。" 可学习的位置表没有新位置对应的行，旋转编码的模型需要缩放基数并微调。
- "正弦编码能延伸到任意长度，所以模型能用。" 公式能延伸；模型从没被训练过去读那些相位，质量会下降。
- "位置插值不需要训练。" 课程的做法是先缩小位置，再微调 1 到 5B token。

## Taught in

[位置编码一课](../../../phases/07-transformers-deep-dive/04-positional-encoding/)列出了各种缩放技巧和扩展到 128K 的做法，[embedding 综合项目](../../../phases/19-capstone-projects/32-token-positional-embeddings/)解释了可学习的位置表为什么有上限。
