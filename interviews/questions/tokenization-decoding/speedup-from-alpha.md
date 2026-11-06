---
id: speedup-from-alpha
title: 从接受率算出每次前向产出几个 token
card: tokenization-decoding
kind: estimate
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, system-design]
tags: [speculative-decoding, acceptance-rate, draft-length, speedup, estimation]
minutes: 10
lessons: [phases/10-llms-from-scratch/25-speculative-decoding, phases/10-llms-from-scratch/15-speculative-decoding-eagle3, phases/07-transformers-deep-dive/16-speculative-decoding, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding]
manuals: []
practice: [speculative-decoding-acceptance]
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/read-the-speculative-step]
updated: 2026-11-03
---

一个草稿的逐 token 接受率是 80%，每一步提议四个 token。大模型跑一次前向，平均产出几个 token？草稿自己的成本怎么算进来？草稿多长时就不再划算？

## Short answer

每次验证器前向产出的 token 期望是 `(1 - alpha^(K + 1)) / (1 - alpha)`；接受率 0.8、K 为 4 时是 3.36，即大模型调用次数约减少到 1/3.36。每个 token 的实际耗时是 `(K c + 1)` 除以这个期望，其中 c 是草稿相对验证器的成本，所以草稿越长成本线性增加，而几何级数会饱和；接受率 0.8、c 为 0.05 时，最优点在 5 到 7 个草稿，加速约 3.2 倍。真正起作用的是接受率：K 固定时，接受率从 0.6 升到 0.9，每次前向的期望 token 数大约翻倍。

## Full answer

### 公式

每个草稿 token 以概率 alpha 独立被接受，这一步在第一个被拒 token 处结束，所以被接受的草稿数是一个截断的几何变量。再加上全部接受时的额外 token，期望是

```text
E[tokens per verifier pass] = (1 - alpha^(K + 1)) / (1 - alpha)
```

| alpha | K | 每次前向的 token 数 |
|---|---|---|
| 0.8 | 4 | 3.36 |

K 固定时，alpha 越高，级数的每一项都越大，所以 alpha 接近 1 时期望陡然上升。

### 草稿成本在哪里进来

一步的成本是 K 次草稿前向加一次验证器前向，以验证器为单位是 `K c + 1`。除以期望 token 数，就是每个 token 的时间。验证器约 30 ms、草稿约 3 ms 时，五个草稿加一次验证约 45 ms 一步。一步产出 1 到 6 个 token，所以用 45 ms 除以每次前向的期望 token 数，再和普通解码一个 token 的 30 ms 比较。K 增大时，分子线性增长，期望却趋平到 `1 / (1 - alpha)`，所以存在一个最优点。

| alpha | c | 最优 K | 加速 |
|---|---|---|---|
| 0.8 | 0.05 | 约 5 到 7 | 约 3.2 倍 |
| 0.95 | 0.02 | 约 8 到 10 | 接近 5 倍 |

### 什么在影响 alpha

草稿的分布和验证器有多接近，这取决于草稿是怎么构建的；采样温度，贪心对贪心时接受最多；任务，代码和结构化输出比自由文本接受得多。

### 公式在哪里不再是全部

高并发下，验证前向不再是免费的：解码 batch 已经占满了内存带宽，一次被拒的草稿要付出一次验证和一次重抽。生产课程的规则是：高并发下接受率低于约 0.55 时，推测解码是净亏的，所以先在真实流量上测出 alpha，再定 K。

## Follow-ups

- **Level 3:** 接受率 0.95、草稿成本 0.02 时，最优点在哪？ Expected: 大约 8 到 10 个草稿，加速接近 5 倍。
- **Level 3:** K 增大时，期望为什么会饱和？ Expected: 这是几何级数；前 K 个草稿全部被接受的概率按 alpha 的 K 次方下降，靠后的位置几乎不再贡献。
- **Level 4:** batch 大小怎样改变这笔账？ Expected: 验证器为每个草稿多做的工作不再藏在闲置带宽后面，验证和拒绝的实际成本上升，盈亏平衡的接受率升到 0.45 到 0.55。
- **Level 4:** 你会在看板上加哪一个指标？ Expected: 按流量切片统计被接受的草稿 token 数除以提议的草稿 token 数，让 alpha 在公式需要的地方可见。

## Wrong answers

- "加速比等于草稿长度。" 只有每个草稿都被接受时才成立；几何级数和草稿成本会让它远低于 K。
- "K 翻倍，吞吐量就翻倍。" 超过最优点后，多出来的草稿大多被拒，成本却照付。
- "草稿便宜十倍，就能加速十倍。" 草稿成本决定的是 c；接受率决定期望，一个便宜却经常猜错的草稿收益很小。

## Taught in

[阶段 10 推测解码课程](../../../phases/10-llms-from-scratch/25-speculative-decoding/)推导了期望，[EAGLE-3 课程](../../../phases/10-llms-from-scratch/15-speculative-decoding-eagle3/)加入了草稿成本和最优点，[阶段 7 推测解码课程](../../../phases/07-transformers-deep-dive/16-speculative-decoding/)给出了毫秒级的例子，[生产环境 EAGLE-3 课程](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/)给出了盈亏平衡线。
