---
id: cache-break-even
title: 一个缓存前缀要读几次才回本
card: cost-capacity
kind: estimate
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [screen, system-design]
tags: [prompt-caching, break-even, ttl, cost]
minutes: 8
lessons: [phases/11-llm-engineering/15-prompt-caching, phases/17-infrastructure-and-production/14-prompt-semantic-caching]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/two-cache-layers, cost-capacity/parallel-calls-miss-the-cache]
updated: 2026-11-03
---

你的提供商把前缀写入缓存时加收 25% 的溢价，缓存读取按正常输入价格的十分之一计费。缓存保留五分钟。另有一种保留一小时的版本，写入价格是正常输入价格的两倍。两种版本各要读几次才回本？你给团队定什么规则？

## Short answer

用五分钟缓存时，一次写入加一次读取，平均每个请求花正常成本的 0.675，约省 32%，所以第一次读取就回本了。一次写入加十次读取，平均为 0.205，约省 80%。一小时缓存的写入价格是 2 倍，所以这个块要读两次才划算。规则是：预计在缓存有效期内会复用至少三次的内容，就缓存它。

## Full answer

### 算账

写入价格是正常输入价格的 1.25 倍，读取价格是它的 0.1 倍。

- 一次写入加一次读取：两个请求平均花正常价格的 0.675。第一次读取就已经省了 32%。
- 一次写入加十次读取：所有请求平均花正常价格的 0.205，约省 80%。
- 一小时缓存的写入价格是正常价格的 2 倍。只读一次时，平均价格高于正常价格；读两次时降到正常价格以下。课程说，只要一个批任务复用这个前缀超过五次，一小时的缓存块很快就能回本。

在有效期内复用三次，两种版本都能越过盈亏平衡点，这就是课程给出的规则。

### 什么会让这笔账不成立

- 前缀每次请求都有一个 token 不同，原因可能是时间戳、请求 ID，或者顺序被打乱的工具列表。每个请求都在写，没有一个在读。
- 块小于最小可缓存长度，课程里那家提供商的下限是 1,024 个 token。更小的块不会被缓存，也不会报错。
- 第一次写入还没完成，并行请求就已经到达。每个请求都付写入溢价，没有一个读到缓存。

### 核验

读取每个响应的 usage 字段：写入缓存的 token 数，以及从缓存读出的 token 数。在 CI 里断言第二个完全相同的请求读出的 token 数大于零。在看板上把输入 token 拆成已缓存和未缓存两部分，否则流量下降也会看起来像缓存的功劳。

## Follow-ups

- **Level 2:** 为什么五分钟缓存第一次读取就回本？ Expected: 写入溢价是四分之一，读取省下十分之九，两次请求的平均价格已经低于正常价格。
- **Level 2:** 什么时候适合用一小时缓存？ Expected: 一个批任务在多次运行之间复用前缀，运行间隔超过五分钟，复用次数超过五次。
- **Level 3:** 输入 token 下降了，账单却没变。看板哪里出了问题？ Expected: 它没有把已缓存输入和未缓存输入分开，所以流量下降看起来像缓存的功劳。
- **Level 3:** 十个并行请求共用一个还没人缓存过的前缀。这笔账会怎样？ Expected: 十个请求都付了写入溢价，没有一个读到缓存，用缓存反而比不用更贵。先发一个请求，再发其余的。

## Wrong answers

- "缓存总能省钱。" 写入一次却从没被读过的前缀，比不缓存多花 25%。
- "选一小时缓存，因为它保留得更久。" 它的写入价格是正常输入价格的两倍，只读一次的块比不缓存还贵。
- "把整个 prompt 都标成可缓存。" 用户消息每次都变，匹配在第一个不同的 token 处就结束了；小于最小长度的块根本不会被缓存。

## Taught in

[prompt 缓存课程](../../../phases/11-llm-engineering/15-prompt-caching/)给出了盈亏平衡的算法和核验字段，[缓存经济学课程](../../../phases/17-infrastructure-and-production/14-prompt-semantic-caching/)指出了并行写入陷阱。
