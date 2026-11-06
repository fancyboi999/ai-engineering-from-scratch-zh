---
id: top-p-crossing-token
title: 丢掉了让累积和达到 p 的 token 的核采样
card: coding
kind: debug
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-developer-relations-engineer]
rounds: [coding, debugging]
tags: [sampling, top-p, nucleus, generation]
minutes: 10
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [top-k-top-p-sampling]
cheatsheet: [bert-gpt-t5]
related: [coding/top-k-then-sample, coding/temperature-knob]
updated: 2026-11-03
---

一个核采样过滤器正在接受审查，因为产品团队说，在某些 prompt 上，p 较小时分布会变空：

```python
def top_p_filter(logits, p):
    probs = softmax(logits)
    c = np.cumsum(probs)
    out = np.where(c <= p, logits, -np.inf)
    return out
```

找出两个 bug，并解释在完整的采样器里，这个过滤器必须怎样和温度配合。

## Short answer

累积和按词表顺序计算，而不是按概率从高到低，所以保留下来的集合根本不是概率最高的前缀。比较还丢掉了让累积和达到 p 的那个 token，p 较小时什么也留不下，分布就空了。先按概率排序，保留累积和达到 p 的最短前缀，包括越过 p 的那个 token，并在温度缩放后的 logits 上运行过滤。

## Full answer

### bug 一：顺序

核采样保留概率最高、总质量达到 p 的最小 token 集合。这要求在求累积和之前，先按概率从高到低排序。按词表顺序时，累积和会在任意位置越过 p，保留的集合是词表的前缀，而不是排名的前缀。

### bug 二：越过 p 的 token

加上它之后累积和达到 p 的那个 token 属于核心集合。严格比较会把它排除。当排第一的 token 自己的质量就超过 p 时，没有任何 token 能通过，全是负无穷的 softmax 就是 NaN。保留到第一个累积和不小于 p 的下标为止（含该下标）；如果舍入让累积和始终达不到 p，就保留所有 token。

### 修复

```python
def top_p_filter(logits, p):
    probs = softmax(logits)
    order = np.argsort(-probs, kind="stable")
    c = np.cumsum(probs[order])
    cut = np.searchsorted(c, p, side="left")
    keep = order[: min(cut + 1, logits.shape[0])]
    out = np.full_like(logits, -np.inf)
    out[keep] = logits[keep]
    return out
```

对取负后的概率做稳定排序，平局时较小的下标排在前面。

### 温度先行

完整的采样器先除以温度，再应用 top-k，然后对结果应用 top-p，最后做 softmax。如果在过滤之后才应用温度，核心集合是在温度为一时选出的，调高或调低温度的作用都比用户要求的小。组装课把核采样列为它的 top-k 生成循环的扩展，并检查保留的概率之和至少为 p。

## Follow-ups

- **Level 3:** 过滤器为什么返回带负无穷的 logits，而不是概率？ Expected: 这样最后的 softmax 会对保留的 token 重新归一化，并让被移除的 token 正好为零，top-k 和 top-p 也能组合使用。
- **Level 3:** p 等于一时保留什么？ Expected: 所有 token；除非舍入让累积和差一点，这时适用保留全部 token 的规则。
- **Level 4:** 同时设置了 top-k 和 top-p。哪个先执行？为什么重要？ Expected: 先 top-k，再对剩下的候选做 top-p；反过来的顺序可能保留不同的集合，因为核心质量是在不同的候选上计算的。

## Wrong answers

- "用严格比较，这样永远不会超过 p。" 定义是达到 p 的最小前缀；排除越过 p 的 token 违背了定义，还可能留下空集。
- "按下标顺序求累积和，词表本来就按频率排好了。" 对给定上下文来说，token id 并不是按概率排序的。
- "在过滤之后应用温度，让核心集合保持稳定。" 这样核心集合是在错误的温度下选出的，这个旋钮会失去大部分效果。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)在练习里把核采样加在 top-k 旁边，[采样练习](../../../practice/top-k-top-p-sampling/)固定了越过 p 的 token 和操作顺序。
