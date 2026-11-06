---
id: exact-cache-temperature
title: 上线前读懂这个精确匹配缓存
card: cost-capacity
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, debugging]
tags: [exact-cache, hashing, eviction, temperature]
minutes: 10
lessons: [phases/11-llm-engineering/11-caching-cost]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/two-cache-layers]
updated: 2026-11-03
---

读一读缓存课程里的这个精确匹配缓存。它为什么拒绝所有温度大于零的请求？key 里放了什么，为什么？在它上线到生产之前，你会改什么？

```python
class ExactCache:
    def __init__(self, max_size=1000, ttl_seconds=3600):
        self.cache = {}
        self.max_size = max_size
        self.ttl = ttl_seconds
        self.hits = 0
        self.misses = 0

    def _hash(self, model, messages, temperature):
        key_data = json.dumps({"model": model, "messages": messages, "temperature": temperature}, sort_keys=True)
        return hashlib.sha256(key_data.encode()).hexdigest()

    def get(self, model, messages, temperature=0.0):
        if temperature > 0:
            self.misses += 1
            return None
        key = self._hash(model, messages, temperature)
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry["timestamp"] < self.ttl:
                self.hits += 1
                entry["access_count"] += 1
                return entry["response"]
            del self.cache[key]
        self.misses += 1
        return None

    def put(self, model, messages, temperature, response):
        if temperature > 0:
            return
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache, key=lambda k: self.cache[k]["timestamp"])
            del self.cache[oldest_key]
        key = self._hash(model, messages, temperature)
        self.cache[key] = {"response": response, "timestamp": time.time(), "access_count": 1}
```

## Short answer

这个缓存只服务确定性调用。温度大于零表示调用方要的是采样带来的变化，回放一个旧回答会在不告诉调用方的情况下抹掉这种变化，所以缓存把这类调用当作未命中，也从不存储它们。key 是模型、完整消息列表和温度的哈希，序列化时按键排序，保证同一个请求总是产生相同的字节。上线前，key 要补上其他所有会改变回答的字段，淘汰策略要改成 LRU，不再全量扫描找最旧的条目，过期还需要一个定期清理，因为现在过期条目只有在被读到时才会删除。

## Full answer

### 温度守卫

`get` 和 `put` 在温度大于零时都会提前返回。课程的规则是：精确缓存适用于确定性调用，即同一个模型、同一个 prompt、温度为零。调用方要的是变化，你却给他一个存下来的样本，这会悄悄改变行为，比一次未命中更糟。

### key 里有什么，漏了什么

key 包含模型，因为同一个 prompt 换个模型就是另一个回答；包含完整的消息列表，因为系统 prompt 和上下文都是请求的一部分；还包含温度。`sort_keys=True` 让序列化结果稳定，两个调用方即使以不同顺序构建同一个字典，哈希也相同。key 没有包含其他会改变回答的字段：温度以外的采样参数、输出上限、工具定义和响应格式。要把它们加进去，否则缓存会返回在另一组设置下生成的回答。

### 过期是惰性的

有效期只在读取时检查。超过有效期的条目会一直留在内存里，直到某次读取碰到它，或者被淘汰掉。加一个定期清理，或者在 `put` 时检查过期，内存占用才是真实的。

### 淘汰靠全量扫描，最旧的先走

容量满了以后，`put` 会扫描所有条目，找出时间戳最早的那个。缓存一满，每次插入都是线性开销；而且它按插入时间淘汰，一个早早插入的热门条目会最先被踢掉。课程的第一道练习要求按最后访问时间做 LRU 淘汰，`access_count` 字段暗示了这个方向，但并没有实现。

### 证明它划算

这个缓存统计了命中和未命中次数。课程的成本追踪器在每次调用时记录缓存状态，并用价格表根据命中次数算出省下的成本。先把这部分接进来，再讨论命中率。

## Follow-ups

- **Level 2:** 为什么序列化时要按键排序？ Expected: 不同调用方构建的字典顺序可能不同，字节顺序一变，同一个请求就会得到不同的哈希。
- **Level 3:** key 里漏了哪些请求字段？ Expected: 其他任何会改变回答的字段，例如其余采样参数、输出上限、工具定义和响应格式。
- **Level 3:** 容量满时淘汰逻辑做了什么？练习要求改成什么？ Expected: 它扫描所有条目，找出时间戳最早的那个并删掉。练习要求按最后访问时间做 LRU 淘汰。
- **Level 4:** 你怎么证明这个缓存能收回成本？ Expected: 在每次调用时记录缓存状态，用价格表根据命中次数算出省下的成本，就像课程里的成本追踪器那样。

## Wrong answers

- "温度检查没有意义，缓存的回答就是好回答。" 温度大于零说明调用方想要变化。回放会抹掉变化，而且谁都不知道。
- "只对用户消息做哈希。" 同一个问题，换了系统 prompt、模型或工具集，正确答案就不同。
- "有效期会删掉过期条目。" 它只在读取时把过期条目藏起来。条目会一直留在内存里，直到被读取或被淘汰。

## Taught in

[缓存与成本课程](../../../phases/11-llm-engineering/11-caching-cost/)构建了这个精确缓存，课程的第一道练习替换了它的淘汰策略。
