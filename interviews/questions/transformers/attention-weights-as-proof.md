---
id: attention-weights-as-proof
title: 热力图不是解释
card: transformers
kind: concept
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, inference-engineer]
rounds: [ml-depth, design-review]
tags: [interpretability, attention-weights, ablation, induction-heads, probing]
minutes: 10
lessons: [phases/05-nlp-foundations-to-advanced/10-attention-mechanism, phases/07-transformers-deep-dive/03-multi-head-attention, phases/19-capstone-projects/33-multihead-self-attention]
manuals: []
practice: []
cheatsheet: [transformers-attention]
related: [transformers/heads-are-nearly-free]
updated: 2026-11-03
---

一份论文草稿用注意力热力图证明模型「在正确的 token 上推理」。你是审稿人。你对这些热力图怎么评价？什么证据能让你相信某个头确实在做某件特定的事？

## Short answer

注意力权重是位置上的一个分布，单靠它本身算不上解释：在一些任务上，把权重打乱或换成任意的其他分布，预测都不变，所以热力图只说明权重落在哪里，不说明这些权重起了作用。要求作者做消融或反事实检验，把这个头置零或打乱，证明预测随之改变。经得起探测检验的头角色都具体、可测：关注前一个 token 的头、复制头，以及归纳头，后者找到当前 token 之前出现的位置，并复制当时紧跟其后的 token。

## Full answer

### 文献中的告诫

2019 年的一项研究表明，在一些任务上，注意力分布可以被打乱，或换成对抗构造的分布，而输出保持不变。课程的规则由此而来：没有消融或反事实检验，绝不把注意力权重当作推理的证据。审稿人喜欢热力图，因为它好读；这是要小心的理由，不是接受它的理由。

### 一个头能告诉你什么

课程里那个 block 的检查钩子会返回每个头的权重，形状是 `(B, H, T, T)`。在训练好的模型里，不同头的模式不同：有的关注紧邻的前一个 token，有的关注序列开头，有的几乎均匀铺开。这些都是描述。要把描述变成论断，需要干预。

### 有说服力的证据

1. **消融。** 把这个头的输出置零，或者把它的权重换成均匀的一行，测量损失或具体预测的变化。起作用的头会让这个数字变化。
2. **反事实输入。** 改掉热力图指向的那个 token，证明输出朝论文所说的方向变化。
3. **针对所称角色的行为测试。** 对归纳头，输入一段重复两遍的随机 token 序列，证明这个头会从每个 token 关注到它第一次出现时后面跟着的 token，并且消融这个头后复制行为消失。
4. **在多个随机种子和 prompt 上复现。** 一个例子上的一张热力图只是个案。

### 审稿意见写什么

请作者把热力图保留为示意，并补上干预实验的结果作为证据。如果消融后预测不变，热力图就只是装饰。

## Follow-ups

- **Level 3:** 某个头在各个位置上的关注几乎均匀。这说明什么？ Expected: 单独看说明不了多少；它可能在传递一个平均值，也可能什么都不传，只有消融能分辨。
- **Level 3:** 用一句话描述针对归纳头的测试。 Expected: 把一段随机 token 序列重复一遍，检查这个头是否从每个 token 关注到其前一次出现之后的 token，并确认消融它会去掉复制行为。
- **Level 4:** 为什么打乱权重后输出可以不变？ Expected: 被关注位置上的值可能携带几乎相同的信息，其他头可能是冗余的，后面的层也能补偿。
- **Level 4:** 用什么替代热力图作为主图？ Expected: 在消融和反事实修改下，损失或目标概率的变化，并给出跨随机种子的波动范围。

## Wrong answers

- "权重高就说明这个 token 导致了输出。" 权重只说明查找去了哪里；因果关系需要干预来证明。
- "把各个头平均一下，就得到模型的注意力。" 不同的头做不同的事；平均会掩盖各自的角色，而且平均值仍然不是证据。
- "热力图符合人的直觉，就说明模型像人一样推理。" 符合直觉不是检验；打乱实验表明，符合直觉的图可能和输出毫无关系。

## Taught in

[注意力机制一课](../../../phases/05-nlp-foundations-to-advanced/10-attention-mechanism/)指出把权重当解释的陷阱，[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)列出经过探测验证的头角色，[注意力综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)把权重暴露出来供检查。
