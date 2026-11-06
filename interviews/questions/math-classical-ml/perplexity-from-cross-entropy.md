---
id: perplexity-from-cross-entropy
title: 从平均交叉熵估算困惑度
card: math-classical-ml
kind: estimate
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, ml-breadth]
tags: [information-theory, perplexity, cross-entropy, language-model]
minutes: 6
lessons: [phases/01-math-foundations/09-information-theory]
manuals: []
practice: []
cheatsheet: [information-numerics]
related: [math-classical-ml/cross-entropy-is-kl-plus-entropy, math-classical-ml/log-probs-instead-of-products]
updated: 2026-11-03
---

一个语言模型的词表规模为 V 个 token。在一段留出测试文本上，其以奈特（nats）为单位计算的单 token 平均交叉熵等于 V 的自然对数 ln V。请估算其困惑度（Perplexity），并说明该数值反映了模型的什么状态。

## Short answer

困惑度是平均交叉熵的自然指数，因此此处困惑度恰好等于 V。这表明模型在平均意义上的不确定性等同于在全词表上的均匀随机猜测。正常训练完成的模型困惑度应当远低于 V。仅凭平均值尚不能彻底断定模型什么都没学到，因为不同 token 上的预测差异也可能得出相同的平均值，因此还需进一步核查每个 token 的具体预测与数据分布。

## Full answer

### 数学定义

```text
perplexity = e ^ H(P, Q)    when the loss is in nats
perplexity = 2 ^ H(P, Q)    when the loss is in bits
```

两种计算方式得到完全相同的数值，因为 1 nat 等于 1.4427 bits，指数底数与对数底数保持同步变换。困惑度的直观含义是模型在每一步预测时，等价于在多少个等可能选项之间举棋不定。困惑度为 50 意味着模型平均而言就像在 50 个候选 token 中随机盲选一样感到困惑。

### 数值估算

损失为 ln V。ln V 的指数值为 V。在 V 个 token 上输出完全均匀的 logits 正好得到该损失与该困惑度。但其他非均匀的逐 token 预测组合也可能碰巧算出该平均值，因此单个均值不能直接断定模型什么都没学到。在下结论前应先检查逐 token 预测细节与数据分布。课程提供了一个参考量级：GPT-2 在常见基准上的困惑度约为 30，而现代大模型在数据覆盖充分的领域已降至个位数。

### 归咎模型前需排查的工程问题

- 测试文本与分词器必须与训练配置严格一致。更换分词器会改变 token 数量和词表结构，此时单 token 交叉熵指标不再具备可比性。
- 在领域内文本上测出接近 V 的困惑度通常意味着工程流水线 bug：例如标签序列错位打乱、词表映射索引错乱、或者模型权重根本未成功加载。

## Follow-ups

- **Level 2:** 如果损失以比特（bits）为单位汇报，计算会有什么变化？ Expected: 取 2 的损失次方而非自然常数 e 的次方；算出的困惑度数值完全相同。
- **Level 2:** 用通俗语言解释困惑度为 50 意味着什么？ Expected: 模型平均意义上的不确定性等同于在 50 个 token 中均匀盲选。
- **Level 3:** 两个模型使用了不同的分词器，可以直接对比它们的困惑度吗？ Expected: 不能直接对比；token 数量和词表结构不同，导致逐 token 指标衡量的尺度不一致。
- **Level 3:** 模型训练完成后在领域内文本上测得困惑度恰好等于 V，你首先怀疑什么？ Expected: 怀疑数据或工程流水线存在 bug，例如标签与输入未对齐、或权重未正确加载，导致模型表现等同于纯粹随机猜测。

## Wrong answers

- "困惑度等于 V 说明模型表现完美。" 完美模型的困惑度为 1；V 仅相当于毫无先验的均匀盲猜。
- "将损失除以 V 即可得到困惑度。" 困惑度是损失的指数值，不是简单的比例除法。
- "在任意文本上困惑度越低，说明模型性能越好。" 只有在完全相同的测试文本和相同分词器下对比才有意义；即使模型不变，更换文本或词表也会改变该数值。

## Taught in

[信息论课程](../../../phases/01-math-foundations/09-information-theory/)将困惑度定义为交叉熵的指数，并给出了均匀分布下的边界校验案例。
