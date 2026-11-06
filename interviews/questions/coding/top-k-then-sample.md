---
id: top-k-then-sample
title: 写出生成循环的采样步骤
card: coding
kind: take-home
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-developer-relations-engineer]
rounds: [coding, take-home]
tags: [sampling, top-k, temperature, generation]
minutes: 20
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [top-k-top-p-sampling]
cheatsheet: [bert-gpt-t5, gpt-from-scratch-training]
related: [coding/temperature-knob, coding/top-p-crossing-token]
updated: 2026-11-03
---

给定最后一个位置的 logits、一个温度、一个 k 值和一个带种子的随机数生成器，写出抽取下一个 token 的函数。说明操作顺序、平局怎么决出，以及抽样怎样恰好只用一个随机数。

## Short answer

用 logits 除以温度，保留最大的 k 个，其余设为负无穷，做 softmax，再从结果里抽一个下标。平局时保留较小的下标。抽样只调用一次生成器，按词表顺序对概率求累积和，返回累积值第一个超过这个随机数的下标。

## Full answer

### 代码

```python
def top_k_filter(logits, k):
    if k >= logits.shape[0]:
        return logits.copy()
    order = np.argsort(-logits, kind="stable")
    keep = order[:k]
    out = np.full_like(logits, -np.inf)
    out[keep] = logits[keep]
    return out


def sample(logits, rng, temperature=1, top_k=None):
    z = logits / temperature
    if top_k is not None:
        z = top_k_filter(z, top_k)
    probs = softmax(z)
    u = rng.random()
    c = np.cumsum(probs)
    hits = np.nonzero(u < c)[0]
    if hits.size:
        return int(hits[0])
    return int(np.nonzero(probs > 0)[0][-1])
```

### 顺序

先温度，再过滤，最后 softmax。过滤必须看到缩放后的 logits，因为之后加上 top-p 截断时，缩放会改变哪些 token 拥有概率质量。softmax 放在最后，被移除的 token 概率正好为零，保留的 token 会重新归一化。

### 平局

对取负后的 logits 做稳定排序，相等的值里较小的下标排在前面。升序排序再反转会把顺序翻过来，较大的下标胜出，每遇到平局，输出都和参考实现不同。

### 一个随机数

带种子的生成器只有在每次调用消耗相同数量的随机数时，才能给出可复现的样本。函数读取一个均匀随机数，和累积和比较，返回第一个越过它的位置。舍入可能让最后一个累积值比一略小，所以兜底分支返回最后一个概率为正的 token，而不是报错。

### 不要修改输入

过滤结果写进一个新数组。把负无穷写进调用方的 logits，会毁掉下一步或日志还需要的值。

## Follow-ups

- **Level 2:** k 为一时得到什么？ Expected: 贪心解码，每次都是 argmax。
- **Level 2:** 为什么过滤必须在 softmax 之前，而不是之后？ Expected: 在 softmax 之后把概率置零，分布之和不再是一，除非重新归一化；遮住 logits 能顺带完成这件事。
- **Level 3:** 组装课在生成时把上下文保持在固定长度内。怎么做的？ Expected: prompt 加上已生成的 token 超过上下文长度时，丢掉最旧的 token，让活动窗口放得下。
- **Level 3:** 怎样让同一个种子的两次运行生成相同的文本？ Expected: 同一个生成器，每步取一个随机数，同样的平局规则，同样的温度；多取一个随机数，后面的每个 token 都会变。

## Wrong answers

- "用生成器的 choice 函数直接传入概率。" 能用，但不同版本消耗随机数的方式不同，会破坏测试固定的单次抽取契约。
- "在过滤之后再应用温度。" 过滤就是在温度为一时选 token，这个设置的作用会比预期小。
- "把升序排序的结果反转，得到降序。" 这样相等的 logits 保留的是较大的下标，违反平局规则。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)把生成步骤描述为温度、top-k 掩码、softmax 和多项分布抽样，[采样练习](../../../practice/top-k-top-p-sampling/)固定了顺序、平局规则和单次抽取。
