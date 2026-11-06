---
id: perplexity-padding-and-shift
title: 批大小一变大，困惑度就变好
card: evaluation
kind: code-reading
level: 3
roles: [ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [perplexity, padding, off-by-one, language-modeling]
minutes: 10
lessons: [phases/19-capstone-projects/41-eval-pipeline, phases/19-capstone-projects/73-perplexity-calibration]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/perplexity-health-check]
updated: 2026-11-03
---

同事写的困惑度评测是这样算的：在每个带 padding 的批次的每个位置上计算交叉熵，在批次内取平均，取指数，再对各批次的结果取平均。报告出来的困惑度好得出奇，而且批大小一调大就更好。读这段描述，指出 bug，并给出正确的算法。

## Short answer

有三个 bug：pad 位置进了分母，损失被稀释，padding 越多数字越好看，而更大的批次恰恰带来更多 padding。按批次取平均，会让短批次里的每个 token 比长批次里的每个 token 权重更大。目标还必须错开一位，因为某个位置的 logits 预测的是下一个 token。正确做法是：在整个语料上把真实目标位置的损失加起来，数出这些位置的个数，只除一次，再取指数。

## Full answer

### 正确的计数

```python
pred = logits[:, :-1, :]
target = ids[:, 1:]
target_mask = attn[:, 1:]
loss_per_pos = cross_entropy(pred, target, reduction="none") * target_mask
total_nll += loss_per_pos.sum()
total_tokens += target_mask.sum()
ppl = exp(total_nll / total_tokens)
```

错位让每个预测对齐到它后面的那个 token。mask 把 pad 目标从分子和分母里同时去掉。除法只做一次，在最后，针对整个语料。校准综合项目把同一条规则封装成一个函数：输入每个序列的负对数似然和 token 数，用两个总和相除。

### 每个 bug 为什么要紧

- **padding 进了分母。** mask 之后，pad 目标贡献的损失是零，但仍被算作一个位置。padding 越多，均值越低，所以 padding 更多的大批次会报告出一个"更好"的模型。
- **对各批次的值取平均。** 短序列的批次和长序列的批次权重相同，于是短序列的每个 token 比长序列的分量更重。先求和再相除，每个真实 token 的权重才一样。
- **没有错位。** 目标没对齐时，训练损失照样下降，所以这个 bug 在训练里不出声。放在指标里，它意味着这个数字不再是下一个 token 的似然。

### 契约检查

困惑度不可能低于 1；出现这种值说明总损失是负的，最常见的原因是适配器返回了 log p，而不是负的 log p。真实 token 为零时不能做除法；综合项目在这种情况下返回非数值（NaN），交给运行器决定。

## Follow-ups

- **Level 3:** 为什么差一位的错误在训练中不出声，在指标里却是致命的？ Expected: 模型照样能从错位的目标里学东西，损失一直下降，但指标不再衡量下一个 token 的似然。
- **Level 3:** 适配器返回的是每个序列的均值。harness 能把它们合起来吗？ Expected: 只有带上 token 数才行；对均值再取均值，是给每个序列等权，而不是给每个 token 等权。
- **Level 4:** 留出集上的困惑度比生产文本上低得多。你怀疑什么？ Expected: 分词器不匹配，或者留出文本泄漏进了训练数据；在宣称质量之前把两者都查一遍。

## Wrong answers

- "给损失加上 mask 就够了。" mask 还得作用到分母；把 pad 位置算进去会稀释均值。
- "对各批次的困惑度取平均，差不太多。" 它让短序列的每个 token 权重更大，还取决于批次怎么组成；先求和再相除才是定义。
- "数字越低，模型一定越好。" 它只说明对这段文本拟合得更好，对任务什么也没说。

## Taught in

[评测流水线综合项目](../../../phases/19-capstone-projects/41-eval-pipeline/)点出了这两个陷阱和正确的计数方法，[困惑度与校准综合项目](../../../phases/19-capstone-projects/73-perplexity-calibration/)给出了语料级的函数及其契约。
