---
id: loss-drops-to-zero-no-mask
title: 损失骤降，采样却是乱码
card: transformers
kind: debug
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [debugging, coding]
tags: [causal-mask, shift-by-one, training-loss, decoder, testing]
minutes: 8
lessons: [phases/19-capstone-projects/33-multihead-self-attention, phases/19-capstone-projects/34-transformer-block, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling]
manuals: []
practice: [train-char-bigram]
cheatsheet: [gpt-from-scratch-training, nn-debugging]
related: [transformers/causal-mask-minus-infinity]
updated: 2026-11-03
---

一个新的 decoder-only 语言模型，词表有 64 个 token，只训练了几百步，训练损失就接近零，而采样出的文本是乱码。说出两个最可能的原因，以及区分它们的检查方法。

## Short answer

在真实文本上，这么早就远低于词表大小的对数，采样又是乱码，最可能的原因是模型能看到自己的目标。要么因果 mask 缺失，位置 i 通过注意力读到了 i 加 1 处的 token；要么目标从来没有错开一位，输入和目标是同一个序列。检查注意力权重：只要对角线上方有任何权重，mask 就不在了；如果权重是三角形的，就打印一个批次，比较输入列和目标列。

## Full answer

### 健康的训练是什么样

第一步的损失应该在词表大小的对数附近，64 个 token 时约为 4.16。在课程的重复任务上，因为下一个 token 等于前一个，损失在三个 epoch 内降到远低于 1.0。在真实文本上降到零，不是在学习，而是在抄答案。

### 原因一：mask

mask 在 softmax 之前把分数矩阵对角线上方的每一项换成负无穷。忘了它，每个位置都会关注整个序列，包括答案。课程的说法是：忘了 mask，你训练出来的模型就会作弊。常见的丢失方式有：mask buffer 按最大上下文构建，却没有切到当前长度；mask 加在了 softmax 之后；或者注意力调用有一个参数，默认是非因果的。

### 原因二：错位

给定 token `[t1, t2, t3, t4]`，输入是 `[t1, t2, t3]`，目标是 `[t2, t3, t4]`。如果数据加载器把同一个窗口返回两次，模型学到的就是恒等映射。即使 mask 完全正确，损失也会崩掉。

### 检查

1. **因果性测试。** 扰动位置 j 的 token，断言 j 之前位置的输出不变。课程的测试集固定检查了这一性质。
2. **三角测试。** 取出一个头的注意力权重，确认 softmax 之后上三角正好为零。
3. **查看批次。** 打印一对输入和目标，确认目标是输入左移一位的结果。
4. **留出集检查。** 用同一条流水线在留出文本上算损失。一个背下了小语料的模型，留出集损失很高，采样会照抄训练文本；而泄漏会产出乱码采样。

### 采样为什么能暴露问题

训练时答案通过输入泄漏，所以损失很低。采样时模型无处可抄，只能输出噪声。真正学会任务的模型，两边都表现好。

## Follow-ups

- **Level 2:** 第 0 步你预期损失是多少，为什么？ Expected: 约等于词表大小的对数，64 时约为 4.16，因为随机模型把概率均匀分配。
- **Level 2:** 怎样让加载器里根本不可能出错位的错误？ Expected: 切出一个长度为 T 加 1 的窗口，从同一个切片返回 `window[:-1]` 和 `window[1:]`，并用一个例子做测试。
- **Level 3:** 用一句话写出因果性单元测试。 Expected: 改动位置 j 的 token，再跑一遍 block，断言 j 之前的每个输出都不变。
- **Level 3:** mask 和错位都没问题，损失还是低得可疑。还有什么会泄漏？ Expected: 验证窗口和训练数据流重叠，或者把 padding token 当作容易的目标计入了损失；检查数据切分和损失 mask。

## Wrong answers

- "模型只是学得快。" 不看到目标，自然文本上的损失不可能接近零。
- "加 dropout 做正则化。" dropout 堵不住泄漏，只会让抄答案稍微多点噪声。
- "调低学习率。" 优化没问题；坏的是目标。

## Taught in

[注意力综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)和 [block 综合项目](../../../phases/19-capstone-projects/34-transformer-block/)实现并测试了 mask，[因果语言建模一课](../../../phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/)定义了错开一位的损失。
