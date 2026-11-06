---
id: kv-cache-capacity-slide
title: 丢掉最后一个槽位的 KV cache
card: coding
kind: code-reading
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [coding, debugging]
tags: [kv-cache, decode, capacity, sliding-window]
minutes: 10
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [kv-cache-append]
cheatsheet: [inference-optimization]
related: [coding/top-k-then-sample]
updated: 2026-11-03
---

一个解码循环把 key 和 value 存在预分配的缓存里，用一个 query 对已存的前缀做注意力。生成总是比配置的上下文长度少一个 token 就停下，长 prompt 的前几个 token 还会关注到多余的零行。缓存代码如下：

```python
class KVCache:
    def __init__(self, max_len, d_k, d_v):
        self.k = np.zeros((max_len, d_k))
        self.v = np.zeros((max_len, d_v))
        self.n = 0

    def append(self, k, v):
        k = np.atleast_2d(k)
        v = np.atleast_2d(v)
        self.n += k.shape[0]
        if self.n >= self.k.shape[0]:
            raise ValueError("cache full")
        self.k[self.n - k.shape[0]:self.n] = k
        self.v[self.n - k.shape[0]:self.n] = v

    def keys(self):
        return self.k
```

根据代码解释这两个症状，并修复它们。

## Short answer

容量检查拒绝了正好填满容量的追加，所以最后一个槽位永远用不上，生成提前一个 token 停止。计数器还在检查之前就更新了，被拒绝的追加会留下错误的长度。访问方法返回整个缓冲区而不是已填充的前缀，注意力因此看到了空的零行。在改动计数器之前，先检查长度加上新步数不超过容量，并返回前 `n` 行的视图。

## Full answer

### 缺陷一：边界

把缓存正好填到容量的追加是合法的。只有新长度会超过容量时，检查才该拒绝。用严格比较时最后一行就废了，按上下文长度设定缓存大小的生成循环会少一个 token 停下。

### 缺陷二：计数器

在检查之前增加长度，意味着失败的追加会让缓存声称存了它从未存下的步。下一次调用就会写到真实数据之后，或者拒绝一个合法的追加。练习规定的规则是：被拒绝的追加不改变任何东西。

### 缺陷三：视图

`keys()` 返回缓冲区的每一行，不管填没填。query 于是会对零行做注意力，这些行在 softmax 之后也有权重，短前缀的输出会被稀释。只返回前 `n` 行。

### 修正后的类

```python
    def append(self, k, v):
        k = np.atleast_2d(k)
        v = np.atleast_2d(v)
        if k.shape[0] != v.shape[0]:
            raise ValueError("keys and values differ in steps")
        if self.n + k.shape[0] > self.k.shape[0]:
            raise ValueError("cache full")
        self.k[self.n:self.n + k.shape[0]] = k
        self.v[self.n:self.n + k.shape[0]] = v
        self.n += k.shape[0]

    def keys(self):
        return self.k[:self.n]

    def values(self):
        return self.v[:self.n]
```

复制进缓冲区还能防止调用方之后修改自己的数组时影响缓存。

### 它和生成循环怎样配合

组装课的生成器在 prompt 加上已生成 token 会超过上下文长度时丢掉最旧的 token，让活动窗口保持在上下文长度内。固定容量的缓存在下一层需要同样的规则：要么拒绝追加，让循环滑动窗口；要么淘汰最旧的行。练习固定采用拒绝的版本，让边界清楚可见。

## Follow-ups

- **Level 3:** 解码步怎样使用已存的 key？ Expected: 用一个 query 对每个已存的 key 打分，除以 key 大小的平方根，做 softmax，再对已存的 value 加权。
- **Level 3:** 另一个 bug 把每次追加都写到第零行。症状是什么？ Expected: 新步覆盖旧步，注意力只能看到最近一次追加，模型失去上下文。
- **Level 4:** 分页缓存在哪里改变了这个设计？ Expected: 容量变成由多个请求共享的固定大小块池，需要新块的追加可以等待或抢占，而不是让请求失败。

## Wrong answers

- "用大于等于，缓存就永远不会溢出。" 它也会拒绝正好填满的情况，浪费最后一个槽位。
- "返回整个缓冲区，零行没有影响。" 零 key 仍然会得到 softmax 权重，把输出拉向零 value。
- "先更新计数，切片下标更简单。" 这样一次被拒绝的追加就会把长度弄错。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)用滑动窗口把生成限制在上下文长度内，[KV cache 练习](../../../practice/kv-cache-append/)固定了容量规则和已填充前缀的视图。
