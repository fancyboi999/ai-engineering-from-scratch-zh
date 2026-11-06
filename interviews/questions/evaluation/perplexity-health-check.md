---
id: perplexity-health-check
title: 困惑度 10 能告诉你什么
card: evaluation
kind: concept
level: 1
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [perplexity, language-modeling, sanity-check]
minutes: 5
lessons: [phases/10-llms-from-scratch/10-evaluation, phases/19-capstone-projects/73-perplexity-calibration]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/perplexity-padding-and-shift]
updated: 2026-11-03
---

同事报告说，新 checkpoint 在留出文本上的困惑度降到了 10，比上周好，想把它当作更强的模型上线。这个数字是什么意思？它不能告诉你什么？

## Short answer

困惑度是每个 token 平均负对数似然的指数。值为 10 表示，模型在每个位置上的不确定程度，相当于在 10 个选项里均匀地挑一个。只有测试集和分词器都不变时，越低才越好。它完全不反映指令遵循、推理或事实准确性，所以只把它当作健全性检查，上线前要跑任务评测。

## Full answer

### 定义

```text
PPL = exp( -(1/N) * sum_i log P(token_i | context) )
```

困惑度为 1，表示模型给每个真实 token 的概率都是 1。困惑度等于词表大小，表示模型的预测是均匀分布，什么也没学到。一个强的基座模型在标准语料上大约在 8 到 12；一个差的模型在同样的文本上会到 50 以上。

### 它漏掉了什么

模型可以把常见模式预测得很好，从而拿到低困惑度，同时在罕见但重要的模式上表现很差。这个数字还忽略了对话模型存在的全部意义：遵循指令、推理、答对。用它来发现坏掉的 checkpoint 或分词器不匹配，不要用它挑冠军。

### 相信它之前的两项检查

1. **同样的文本，同样的分词器。** 这个数字取决于两者。在不同留出集上测的两个模型无法比较。
2. **诚实地计数。** 在真实 token 位置上累加损失，最后只除一次。pad 位置不能进分母，而且某个位置的 logits 预测的是下一个 token。低于 1 的值是不可能的。它说明累加的负对数似然成了负数，常见原因是适配器返回了 log p，而不是负的 log p。

## Follow-ups

- **Level 1:** 困惑度为多少，表示模型从不意外？ Expected: 1，因为这时每个真实 token 的概率都是 1。
- **Level 2:** 两个模型是在不同测试集上测的。它们的困惑度能比吗？ Expected: 不能；这个数字取决于文本和分词器，要在同一个集合上测两者。
- **Level 2:** 适配器报告困惑度为 0.8。发生了什么？ Expected: 累加的损失是负的，很可能是适配器返回了 log p 而不是负的 log p；困惑度不可能低于 1，所以契约被违反了。
- **Level 3:** 为什么评测在非 pad 位置上累加损失、最后再除，而不是对每个批次的困惑度取平均？ Expected: 按批次平均会让短批次里的每个 token 比长批次里的每个 token 权重更大，而 pad 位置会把损失压小；在真实 token 上求和才符合定义。

## Wrong answers

- "困惑度越低，助手越好。" 它衡量的是对文本分布的拟合，不是指令遵循或正确性。
- "两篇论文里的困惑度可以比较。" 它取决于测试集和分词器，只有同一集合上的比较才成立。
- "目标是让困惑度接近 1。" 留出文本不是模型自己的输出；接近 1 的值反而说明测试文本可能在训练数据里。

## Taught in

[评测课](../../../phases/10-llms-from-scratch/10-evaluation/)把困惑度作为快速健康检查来介绍，[困惑度与校准综合项目](../../../phases/19-capstone-projects/73-perplexity-calibration/)给出了语料级的计算方法及其契约。
