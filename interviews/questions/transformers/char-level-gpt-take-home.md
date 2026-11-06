---
id: char-level-gpt-take-home
title: 课后作业：在笔记本上训练字符级解码器
card: transformers
kind: take-home
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [take-home, coding]
tags: [take-home, decoder-only, training-loop, validation-loss, sampling]
minutes: 15
lessons: [phases/07-transformers-deep-dive/14-build-a-transformer-capstone, phases/19-capstone-projects/34-transformer-block]
manuals: []
practice: [train-char-bigram]
cheatsheet: [gpt-from-scratch-training]
related: [transformers/loss-drops-to-zero-no-mask, transformers/modernize-a-2017-block]
updated: 2026-11-03
---

这是我们发出的课后作业：在笔记本电脑上，用约 1 MB 的字符级文本语料训练一个小型 decoder-only transformer，交回代码、损失曲线和几段采样。请讲讲你会怎么做，评审会检查提交物里的哪些东西，以及哪些结果能证明模型确实有效。

## Short answer

搭一个小的参考结构：覆盖语料中 65 个符号的字符分词器，token 嵌入加可学习的位置嵌入，一组带 RMSNorm、因果多头注意力和 SwiGLU 网络的 pre-norm block，最后一个 norm 和一个与嵌入共享权重的输出头，在随机截取的 256 字符窗口上用错开一位的交叉熵训练。用 AdamW、带 warmup 的余弦学习率调度和 1.0 的梯度裁剪，留出文本最后 10% 做验证。课程给出的标准是：4 层、4 头、宽度 128、约 800K 参数的模型，2,000 步内训练损失从约 4.2 降到约 1.5，笔记本上约 6 分钟，验证损失低于 2.0 并紧跟训练损失，采样看起来像语料。

## Full answer

### 要搭什么

```text
tokens (B, N) -> embedding + position -> [norm, causal attention, residual, norm, SwiGLU, residual] x L
            -> final norm -> head tied to the embedding -> logits (B, N, V) -> shift-by-one loss
```

字节级的字符分词器不需要训练。数据按文本位置 90 比 10 切分，这样验证文本在训练中从未出现。

### 训练循环

```python
for step in range(max_steps):
    x, y = get_batch("train")
    logits = model(x)
    loss = F.cross_entropy(logits.view(-1, vocab_size), y.view(-1))
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    opt.zero_grad()
```

把训练损失和验证损失记在同一坐标轴上。训练结束后用 top-p 采样，500 个字符后停止。

### 评审检查什么

1. **目标是否正确。** 因果 mask 在 softmax 之前施加，目标是输入错开一位。有一个单元测试改动后面的 token、检查前面的输出不变，是很强的信号。
2. **第一个损失。** 第 0 步约为 4.2，即均匀分布的基线，65 的对数。起点明显低于它，就要查有没有泄漏。
3. **验证纪律。** 有留出集，按间隔记录，并且跟着训练损失走；课程记录了在这个规模和预算下没有过拟合。验证损失远低于训练损失时，要检查切分和损失代码，因为文本最后 10% 也可能本身更容易。
4. **训练规范。** 梯度裁剪、学习率调度、固定随机种子，并且结果可复现。
5. **读采样。** 会出现换行、古旧的词和大写的说话人名字；文本有语料的样子，但不是语料本身。

### 什么能证明它有效

损失曲线从约 4.2 降到约 1.5，验证损失低于 2.0 并紧随其后，读者能从采样中认出语料的风格。报告里写清候选人遇到并修好了哪个问题，比更低的损失更有分量。

### 能拉开差距的加分项

把可学习的位置换成对查询和键做旋转，并证明验证损失至少一样低。在采样循环里加上 KV cache，证明 500 字符的采样快 5 到 20 倍。训练到 5,000 步，报告验证损失是否继续改善。

## Follow-ups

- **Level 2:** 第 0 步的训练损失是多少？你怎么知道它对不对？ Expected: 约等于词表大小的对数，65 个符号时约为 4.2，因为随机模型的输出是均匀的。
- **Level 3:** 评审不读代码，怎么知道你的因果 mask 起作用？ Expected: 有测试改动后面的一个字符并断言前面的 logits 不变，而且损失从随机基线起步。
- **Level 3:** 在这个规模下为什么让输出头和嵌入共享权重？ Expected: 它节省参数，课程也记录了质量提升；输出头的权重是嵌入的转置。
- **Level 4:** 候选人把字符分词器换成约 50,000 的子词词表。还有什么必须跟着变？ Expected: 嵌入和输出头从 65 行增长到约 50,000 行，模型需要更多容量来用好它们，而且每个窗口按 token 算覆盖的文本更多了。

## Wrong answers

- "在时间预算内用更大的模型拿到更低的损失。" 更大的模型在笔记本上训练更慢，而课程的标准在 800K 参数、约 6 分钟时就达到了。
- "语料很小，不用切验证集。" 验证集是唯一能发现泄漏的检查，评审第一个就看它。
- "报告采样质量，不报告损失。" 采样是证据，不是指标；评审在候选人之间比较的是曲线和留出集损失。

## Taught in

[transformer 综合项目一课](../../../phases/07-transformers-deep-dive/14-build-a-transformer-capstone/)定下了架构和目标数字，[block 综合项目](../../../phases/19-capstone-projects/34-transformer-block/)实现了它堆叠的 block。
