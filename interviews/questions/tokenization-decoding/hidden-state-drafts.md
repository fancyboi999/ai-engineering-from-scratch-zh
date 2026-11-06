---
id: hidden-state-drafts
title: 读取隐藏状态的草稿为什么接受率更高
card: tokenization-decoding
kind: concept
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, design-review]
tags: [speculative-decoding, eagle, draft-model, tree-attention, exposure-bias]
minutes: 10
lessons: [phases/10-llms-from-scratch/15-speculative-decoding-eagle3, phases/10-llms-from-scratch/25-speculative-decoding, phases/07-transformers-deep-dive/16-speculative-decoding, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding]
manuals: []
practice: []
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/speedup-from-alpha]
updated: 2026-11-03
---

从独立的小草稿模型，一路讲到当前这一代基于隐藏状态的草稿。每一步去掉了什么限制？为什么把验证器的内部特征喂给草稿会帮助这么大？

## Short answer

同家族的独立小模型，token 接受率在 0.6 左右，因为它的分布和验证器有偏差。第一代隐藏状态草稿换成一个一到两层的网络，读取验证器最后一层的特征，草稿从验证器自己的表示出发，接受率升到 0.7 到 0.8。第二代提出一棵候选树，用树形注意力掩码在一次前向里验证所有分支，把被接受路径上每个 token 的接受率提到 0.85 以上。第三代去掉特征匹配损失，直接训练 token 预测，并在训练时把草稿自己之前的输出喂回去，消除了暴露偏差（exposure bias），接受率达到 0.88 到 0.92。

## Full answer

### 演进过程

| 世代 | 草稿 | 接受率 | 训练成本 |
|---|---|---|---|
| 独立小模型 | 一个独立训练的较小模型 | 0.55 到 0.70 | 无 |
| 验证器上的额外头 | 几个预测后续位置的输出头 | 0.65 到 0.75 | 约 1B 有监督 token |
| 第一代隐藏状态草稿 | 在验证器最后一层隐藏状态上加一层 transformer | 0.70 到 0.80 | 约 60B token |
| 动态草稿树 | 同上，再加一棵候选树 | 0.80 到 0.88 | 约 60B token |
| 多层特征加训练时测试 | 融合验证器的多个层；在自己的输出上训练 | 0.88 到 0.92 | 约 60 到 200B token |

### 隐藏状态为什么有用

独立草稿要从原始 token 重新推出验证器已经算好的东西。验证器在位置 t 的最后一层隐藏状态，是对前缀的丰富概括；一个读它的小网络，预测验证器下一个 token 的能力远强于只读 token ID 的小模型。草稿从模仿验证器，变成了读取验证器。

### 树带来了什么

线性的草稿链在第一次猜错时就断了。树在每个深度提出多个候选，在草稿不确定的地方增加分支，有把握的地方保持较少分支；验证器在一次前向里给每个节点打分，掩码只让每个节点关注它的祖先。最长的被接受路径胜出。验证成本几乎不变，因为仍然只是一次前向。

### 第三代修好了什么

早期的隐藏状态草稿训练目标是匹配验证器的特征，这限制了额外数据能带来的收益。第三代直接训练 token 预测，训练时连续几步把草稿自己之前的预测作为输入，和推理时的跑法一样。这让训练输入和推理输入对齐，误差不再累积，与 scheduled sampling 给序列模型的修正是同一个思路。论文报告：对话场景端到端最高 6.5 倍，在一个生产引擎上 batch 为 64 时吞吐提升 38%。

### 草稿的好坏取决于流量

在对话数据上训练的通用草稿头，在代码、医疗或法律流量上接受率降到 0.4 到 0.6。领域专用的草稿头能把它拉回来，而且训练它比微调验证器轻得多。

## Follow-ups

- **Level 3:** 为什么匹配验证器特征限制了前几代？ Expected: 特征损失要求草稿复现隐藏状态，而不是预测 token，所以再多的训练数据也不再有帮助；第三代改为在 token 上训练。
- **Level 3:** 在这里，暴露偏差指什么？ Expected: 草稿训练时用的是 teacher forcing 下验证器给的输入，运行时却吃自己的输出；这种不一致会在草稿的多个步骤里叠加。
- **Level 4:** 树的代价是什么？ Expected: 一个按树拓扑构造的非因果注意力掩码、为树节点额外存的 key 和 value，以及调度器的复杂度；验证器仍然只跑一次。
- **Level 4:** 额外头方案和隐藏状态草稿怎么比较？ Expected: 额外头不用部署第二个模型，服务更简单；代价是接受率稍低，还要在验证器上做一轮有监督微调。

## Wrong answers

- "最主要的手段是用更大的独立草稿模型。" 与验证器对齐比大小更重要；读隐藏状态的一层草稿，胜过大得多的独立模型。
- "隐藏状态草稿改变验证器的输出分布以提高接受率。" 拒绝规则保证输出精确不变；草稿改变的只是猜对的频率。
- "树的每个分支都需要一次验证器前向。" 在树形掩码下，所有分支一次前向就验证完。

## Taught in

[EAGLE-3 课程](../../../phases/10-llms-from-scratch/15-speculative-decoding-eagle3/)讲了演进过程和训练时测试，[阶段 10 推测解码课程](../../../phases/10-llms-from-scratch/25-speculative-decoding/)解释了特征复用和树形验证，[阶段 7 课程](../../../phases/07-transformers-deep-dive/16-speculative-decoding/)介绍了几类草稿，[生产环境 EAGLE-3 课程](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/)讲了领域漂移。
