---
id: choose-the-draft-for-a-new-model
title: 草稿是预训练内置、事后训练，还是借用小模型
card: tokenization-decoding
kind: design
level: 4
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [speculative-decoding, multi-token-prediction, eagle, draft-model, acceptance-rate]
minutes: 15
lessons: [phases/10-llms-from-scratch/18-multi-token-prediction, phases/10-llms-from-scratch/15-speculative-decoding-eagle3, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding, phases/19-capstone-projects/14-speculative-decoding-server]
manuals: []
practice: []
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/mtp-sequential-vs-parallel, tokenization-decoding/hidden-state-drafts]
updated: 2026-11-03
---

你准备预训练一个模型，它以后要用推测解码承载大流量服务。获得草稿有三条路：在预训练里内置串行多 token 预测模块；预训练之后训练一个基于隐藏状态的草稿头；复用同家族的小模型。给出你的决策和对应成本，并说出打开开关之前要测量的门槛。

## Short answer

如果预训练由我掌控，且隐藏维度至少 4096，我会内置串行模块：训练慢约 10%，换来更密的监督信号，以及在深度 1 上接受率达到 80% 或更高的草稿。如果权重已经存在，我会在验证器的特征上事后训练一个草稿头，用约 60 到 200B token；它向后兼容，在通用对话上接受率达到 0.88 到 0.92。同家族小模型不需要训练，接受率在 0.55 到 0.70 左右。无论选哪条路，门槛都是在生产并发下、在自己的流量构成上实测接受率，低于约 0.55 就关掉开关，并且盯长尾延迟，不盯均值。

## Full answer

### 三个选项

| 选项 | 何时训练 | 能否用于已有权重 | 草稿参数 | 接受率 | 额外收益 |
|---|---|---|---|---|---|
| 预训练内置串行模块 | 预训练期间 | 否 | 每个深度一个模块加一层投影 | 深度 1 上 0.80 及以上 | 更密的训练信号 |
| 基于验证器特征的事后草稿头 | 预训练之后 | 是 | 一到两层，用约 60 到 200B token 训练 | 对话上 0.88 到 0.92 | 除了速度没有别的 |
| 同家族小模型 | 不训练 | 是 | 一整个小模型 | 0.55 到 0.70 | 没有，还要占显存 |

### 决策树

1. **预训练归你管吗？** 如果是，而且模型足够大，内置模块是唯一能同时改善模型和服务的选项；提出它的那份报告测得，仅草稿一项就带来约 1.8 倍的生成吞吐。在 1B 规模上，这部分开销弊大于利。
2. **权重已经存在？** 那就选事后草稿头。和训练验证器相比，这是个轻量的训练任务，也不会改动验证器的输出。
3. **完全没有训练预算？** 用小模型做原型，同时清楚它的接受率上限低，第二个模型还要占显存。

### 门槛

在生产引擎上，推测解码需要显式开启。生产课程的规则是：不在真实流量上测接受率就打开开关，是反模式。做法如下：

1. 先用普通解码服务目标模型，在目标并发下记录首 token 时间、token 间延迟和吞吐量。
2. 打开草稿，重跑同一个基准。
3. 从引擎读出每个请求被接受的草稿 token 数和提议的草稿 token 数，前者除以后者，得到接受率。
4. 生产并发下低于约 0.55 时，关掉开关，或者训练一个领域专用的草稿头。
5. 确认长尾的 token 间延迟没有变差，因为一次被拒的草稿要付出一次验证和一次重抽。

### 流量构成

在通用对话上训练的草稿头，在对话上接受率是 0.6 到 0.8，在代码、医疗或法律流量上降到 0.4 到 0.6。决策前按流量占比给接受率加权，并且每个切片单独测；混在一起的数字可能掩盖某个推测解码净亏的切片。综合项目的练习问的正是这个：70% 对话、30% 代码，接受率分别是 0.7 和 0.4。

### 运维

目标模型换了版本而草稿没跟上时，接受率会漂移，所以要按切片告警；对草稿头不再划算的切片，保留不用草稿的方案或 n-gram 回退。

## Follow-ups

- **Level 3:** 流量是 70% 对话（接受率 0.7）和 30% 代码（接受率 0.4）。你怎么决策？ Expected: 按流量占比加权，再逐个切片对照底线；代码单独看已经低于底线，所以把代码路由到普通解码，或训练一个代码草稿头。
- **Level 4:** 目标模型下个季度出新版本。三个选项分别会怎样？ Expected: 内置模块随模型一起更新；事后草稿头必须对着新目标重训；小模型漂移得更远；按版本对接受率告警。
- **Level 4:** 当前这一代基于隐藏状态的草稿头读取的是什么？ Expected: 目标模型多个层的特征，而不只是最后一层，这是接受率提高的原因之一。
- **Level 4:** 小模型这条路在哪些场景仍然占优？ Expected: 没有训练预算的原型，或者引擎只提供普通草稿路径的 CPU 部署。

## Wrong answers

- "永远用最新的隐藏状态草稿头，它严格最优。" 它需要对着你的目标模型训练，在领域流量上接受率可能跌到 0.4；如果预训练归你管，内置模块能同时给你草稿和一个更好的模型。
- "以后用一次微调把模块加进去。" 这是预训练阶段的选择；已有的稠密模型应该加一个事后草稿头。
- "按公开基准上的加速比来选。" 接受率取决于你的流量；门槛要在你自己的流量构成和并发下测。

## Taught in

[多 token 预测课程](../../../phases/10-llms-from-scratch/18-multi-token-prediction/)和 [EAGLE-3 课程](../../../phases/10-llms-from-scratch/15-speculative-decoding-eagle3/)给出了两种需要训练的选项及其成本，[生产环境 EAGLE-3 课程](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/)规定了测量门槛，[推测解码服务端综合项目](../../../phases/19-capstone-projects/14-speculative-decoding-server/)讲了漂移和回退。
