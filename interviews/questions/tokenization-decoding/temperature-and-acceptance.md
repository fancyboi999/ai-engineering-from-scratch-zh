---
id: temperature-and-acceptance
title: 推测解码在代码上飞快，在创意写作上停滞
card: tokenization-decoding
kind: tradeoff
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, screen]
tags: [speculative-decoding, temperature, sampling, acceptance-rate, greedy]
minutes: 8
lessons: [phases/07-transformers-deep-dive/16-speculative-decoding, phases/10-llms-from-scratch/25-speculative-decoding, phases/10-llms-from-scratch/15-speculative-decoding-eagle3, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding]
manuals: []
practice: [lab-sampling-temperature]
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/speedup-from-alpha]
updated: 2026-11-03
---

你们的创意写作产品用较高的温度采样，推测解码完全没有带来加速；同样的配置在代码补全上却快得飞起。解释这个差别，并说明温度为零时接受检验变成什么。

## Short answer

接受率取决于验证器有多常认同草稿采出的 token。温度高时，目标分布很平，草稿的采样分散在许多 token 上，验证器概率与草稿概率之比降向词表大小分之一，几乎每个草稿都被拒，草稿的成本白付了。代码和结构化输出可预测性强，接受率能升到 0.9 以上。温度为零时，规则变成一次比较：草稿 token 等于验证器最可能的 token 就接受，否则输出那个 token 并停止。

## Full answer

### 为什么温度是关键

接受检验是 `u < min(1, q(d) / p(d))`。两个分布都尖锐地集中在同一个 token 上时，比值接近 1，草稿被接受。升高温度，两个分布都变平：草稿开始采出验证器只给很小概率的 token，比值变小，拒绝越积越多。课程的练习在温度 1.5 下跑这个循环来展示崩溃：草稿的开销还在，被接受的 token 却没了，算法比普通解码还慢。

### 为什么任务很重要

| 负载 | 课程里实测的加速 |
|---|---|
| 对话 | 2 到 3 倍 |
| 代码生成 | 3 到 5 倍 |
| 创意写作 | 接近零 |

代码和结构化输出的下一个 token 高度可预测，即使草稿不完美，大多数时候也与验证器一致；EAGLE-3 课程给出这类输出的接受率在 0.9 以上。高温度下的开放式文本有许多可接受的续写，草稿很少恰好选中验证器会选的那一个。

### 贪心情形

温度为零时，两个模型都是确定的。检验退化为 `argmax(q) == d`：一致就接受，否则输出 `argmax(q)` 并停止。不需要残差分布，因为验证器的选择只有一个 token。

### 怎么处理

- 温度高时按请求关掉推测解码，或者把这类请求路由到普通解码池；EAGLE-3 课程把按温度切换列为一个调优开关。
- 也不要给 1 到 5 个 token 的极短输出用草稿；开销会占大头。
- 按产品场景分别测接受率，只在划算的地方保留推测解码；生产课程给出的高并发底线约为 0.55。

## Follow-ups

- **Level 2:** 草稿和验证器完全一致时，接受比值是多少？ Expected: 1，所以每个草稿都被接受，每次前向产出全部草稿加一个额外 token。
- **Level 3:** 草稿可以用和验证器不同的温度采样吗？ Expected: 可以，只要 p 是草稿实际采样所用的分布；输出仍然服从验证器的分布，但不一致会降低接受率。
- **Level 3:** 在服务层怎样实现这个开关？ Expected: 读取请求的温度和输出长度，温度高于阈值或长度低于阈值时禁用推测解码，阈值根据实测接受率设定。
- **Level 4:** 为什么高并发下的损失比公式预测的更糟？ Expected: 被拒的草稿要付出一次验证和一次重抽，满批时它们串行排队；而推测解码原本利用的内存带宽已经被 batch 占满，长尾延迟因此变差。

## Wrong answers

- "调低温度，让推测解码起作用。" 产品选这个温度是有原因的；该改的是这些请求的解码路径，不是产品。
- "草稿太小了，换个大的。" 目标分布很平时，问题不在大小；更大的草稿也猜不出验证器会从众多可接受的 token 里采到哪一个。
- "高温度下推测解码会改变输出。" 拒绝规则在任何温度下都让输出分布保持精确；变的只是速度。

## Taught in

[阶段 7 推测解码课程](../../../phases/07-transformers-deep-dive/16-speculative-decoding/)把接受率和解码策略联系起来，[阶段 10 推测解码课程](../../../phases/10-llms-from-scratch/25-speculative-decoding/)给出了贪心情形和负载表，[EAGLE-3 课程](../../../phases/10-llms-from-scratch/15-speculative-decoding-eagle3/)提到了切换开关，[生产环境 EAGLE-3 课程](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/)给出了接受率底线。
