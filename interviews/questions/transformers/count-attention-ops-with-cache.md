---
id: count-attention-ops-with-cache
title: 数一数生成 100 个 token 的注意力工作量
card: transformers
kind: estimate
level: 1
roles: [inference-engineer, applied-ai-engineer]
rounds: [screen, ml-depth]
tags: [kv-cache, autoregressive, complexity, decoding]
minutes: 6
lessons: [phases/07-transformers-deep-dive/12-kv-cache-flash-attention, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling]
manuals: []
practice: [kv-cache-append]
cheatsheet: [inference-optimization]
related: [transformers/causal-mask-minus-infinity, inference-serving/kv-pool-users-fit]
updated: 2026-11-03
---

一个解码器从空 prompt 开始，一次一个地生成 100 个 token。分别数一数两种循环为前缀计算的 token 状态数：朴素循环，以及缓存了之前 token 的键和值向量的循环。再数一数有了这份存储之后剩下的查询与键的比较次数，并说出这份存储有意不存什么。

## Short answer

朴素循环每一步都把前缀里的每个 token 重新过一遍层，所以计算 1 加 2 加 3 一直加到 100 个 token 状态，共 5050 个，随长度的平方增长。存下键和值之后，每一步只计算新 token 的状态，共 100 个。新的查询仍要和每个已存的键比较，所以缓存循环仍然做 5050 次查询与键的比较：存储省掉的是重复计算的键和值向量，不是比较。存储里没有查询，因为过去的 token 不会再发问；只有最新的 token 会。

## Full answer

### 前缀为什么能复用

前缀 token 的每个隐藏状态一旦算出就是确定的，而因果 mask 保证它从不依赖后面的 token。所以 token t 的键和值在第 t 加 1 步与在第 t 步时完全一样。重新计算它们纯属浪费。

### 两种循环

```text
naive:   step t recomputes t token states       -> 1 + 2 + ... + N = N (N + 1) / 2
cached:  step t computes one new token state    -> N
cached:  its one query meets t stored keys      -> N (N + 1) / 2 comparisons
```

N 等于 100 时，朴素循环算 5050 个 token 状态，缓存循环算 100 个。课程的代码跑的是一个十个 token 的例子，数的是查询与键的比较次数：两种循环打印出同样的次数，并确认输出一致。生成 100 个 token 时，两种循环的比较次数都是 5050，所以注意力这一步本身在每一步仍随长度增长。对几千 token 的回复，朴素循环的 token 状态数是几百万量级，大部分是冗余的。

### 存的是什么

每层、每个头各有两个不断增长的列表：到目前为止每个 token 的键和值。

```python
class KVCache:
    def append(self, layer, head, k, v):
        self.K[layer][head].append(k)
        self.V[layer][head].append(v)
```

显存随生成长度线性增长；这是不重新计算前缀的代价。

### 为什么不存查询

一个 token 的查询只用一次，就在它是最新 token 的那一步。之后这个 token 只会被查，不会再去查别人。存查询要花显存，却换不来任何东西。

### 去不掉的东西

生成仍然是串行的：第 t 步需要第 t 减 1 步产出的 token。课程把这叫作自回归税。训练用一次带 mask 的前向处理整个序列，从而避开它；推理做不到。

## Follow-ups

- **Level 1:** 生成过程中，显存里什么在增长？ Expected: 已存的键和值，每层每个头都有，每生成一个 token 多一条。
- **Level 2:** 新 token 到来后，前缀 token 的键为什么仍然有效？ Expected: 因果 mask 让它的隐藏状态只依赖更早的 token，后面的 token 改变不了它。
- **Level 2:** 你改了 prompt 中间的一个词。存储会怎样？ Expected: 从那个位置往后的内容全部失效，必须重新计算；它之前的部分仍然有效。
- **Level 3:** 注意力什么时候从受算力限制变成受内存流量限制？ Expected: 当 N 乘 N 的分数矩阵大到搬运它的时间占主导时；课程认为大约从 2K token 开始。

## Wrong answers

- "存储里存的是注意力权重。" 它存的是键和值；权重每一步都由新的查询重新计算。
- "这份存储能省显存。" 它花显存、省计算；用显存换掉重复计算的键和值向量。
- "查询也必须存下来。" 过去 token 的查询再也不会被用到。

## Taught in

[KV cache 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)数了两种循环的计算量，[因果语言建模一课](../../../phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/)解释了生成为什么是串行的。
