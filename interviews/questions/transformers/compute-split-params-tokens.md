---
id: compute-split-params-tokens
title: 在模型规模和 token 数之间分配固定算力
card: transformers
kind: tradeoff
level: 4
roles: [inference-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [system-design, ml-depth]
tags: [scaling-laws, compute-optimal, over-training, pretraining, inference-cost]
minutes: 15
lessons: [phases/07-transformers-deep-dive/13-scaling-laws]
manuals: []
practice: []
cheatsheet: [scaling-laws-pretraining]
related: [transformers/block-parameter-count]
updated: 2026-11-03
---

你负责一次算力预算固定的预训练。一个方案在 300B token 上训练 175B 参数的模型。另一个方案训练一个小得多的模型，但用多得多的 token。你选哪个，怎么向管理层论证？什么情况下你会故意训练到超过 scaling law 给出的最优点？

## Short answer

算力约等于 6 乘参数量乘训练 token 数，所以预算定下的是乘积，分配方式仍然可选。算力最优的配比约为每个参数 20 个 token；第一个方案每个参数只有约 1.7 个 token，课程称之为训练不足十倍，而一个在 1.4T token 上训练的 70B 模型在所有基准上都胜过那个 175B 模型，推理成本仅为其 1/2.5。如果模型要服务很大的量，就故意越过最优点：训练更小的模型、训练更久，因为训练只付一次钱，推理一直在付。

## Full answer

### 定律

```text
L(N, D) = A / N^alpha + B / D^beta + E
alpha about 0.34, beta about 0.28, E about 1.69, A about 406, B about 411
```

N 是不含嵌入的参数量，D 是训练 token 数，E 是数据本身不可约的损失。在 `C = 6 N D` 的约束下最小化 L，两个最优量大约随预算的平方根增长：

```text
N_opt about 0.22 * (C / 6)^0.5
D_opt about 4.5  * (C / 6)^0.5
D_opt / N_opt about 20
```

拟合出的指数会缓慢漂移，按上面的常数，N 约为 0.45，D 约为 0.55，所以最优比例随预算变化；课程的代码用网格搜索找最优点。

### 两个方案是什么样子

| 方案 | N | D | 每参数 token 数 |
|---|---|---|---|
| 大而短 | 175B | 300B | 约 1.7 |
| 算力最优 | 70B | 1.4T | 20 |
| 为推理优化 | 8B | 15T | 1,875 |

这几行用的不是同一份预算：第二行和第三行用的算力约是第一行的两倍，所以它们比较的是比例，而不是同等成本下的备选方案。最后一行是一个生产模型家族，它把一个小模型训练到了算力最优比例的 94 倍。对每月要回答一万亿 token 的服务来说，推理占总成本的大头；一个能放进消费级硬件、延迟只有几分之一的模型会胜出，即使它每个训练 FLOP 换来的训练损失更差。课程给出的推理主导场景区间是每参数 100 到 500 个 token，具体取决于服务量。

### 怎么论证

1. 用 `6 N D` 展示预算，并画出 N 和 D 上的损失等高线；第一个方案离谷底很远。
2. 按预期服务量，展示每种 N 的推理账单；小模型省下的钱每个月都会重复出现。
3. 从定律中读出所选 N 和 D 下的损失差距，说明过度训练时你接受的代价。

### 改变常数、不改变形状的因素

数据筛选可使曲线的改善相当于有效算力提高到原来的 2 倍以上。混合专家模型把总参数量和激活的 FLOPs 分开，所以定律按激活参数算。2024 年的一项结果里，更好的优化器让常数移动了约 2 倍。这些都不改变幂律的形状。

### 对微调的推论

课程的经验法则：如果你的任务数据相对基座模型每个参数不到 20 个 token，就预期损失会在某个下限处饱和。把它当作需要测量的警示，而不是决定基座大小的规则。

## Follow-ups

- **Level 3:** E 项是什么？为什么多少预算都去不掉它？ Expected: 它是不可约损失，即数据本身的熵；定律逼近它，但永远越不过它。
- **Level 4:** 稀疏专家架构怎么改变这个方案？ Expected: FLOPs 跟着激活参数走，所以最优 D 按激活的 N 来定，而总 N 决定显存。
- **Level 4:** 按你的预算，网上的高质量 token 不够用了。有哪些手段？ Expected: 课程估计过滤后的英文约有 5 到 10 万亿 token；手段是合成数据、多语言和多模态数据，以及更好的数据整理。
- **Level 4:** 在押上预算之前，你怎么在自己的技术栈上验证这个定律？ Expected: 在同一份数据上拟合五个从 100K 到 10M 参数的小模型，把得到的指数和公开的指数比较。

## Wrong answers

- "固定算力下，更大的模型总会赢。" 在 1.4T token 上训练的 70B 模型胜过了在 300B 上训练的 175B 模型。
- "算力最优的模型也是服务起来最便宜的模型。" 它最小化的是每个训练 FLOP 对应的训练损失；服务成本随 N 增长，所以生产模型会过度训练。
- "能力是突然出现的，所以损失预测没用。" 连续的损失平滑且可预测；基准分数的突然跳变大多是评分方式造成的假象。

## Taught in

[scaling law 一课](../../../phases/07-transformers-deep-dive/13-scaling-laws/)给出了定律、最优配比和过度训练的理由。
