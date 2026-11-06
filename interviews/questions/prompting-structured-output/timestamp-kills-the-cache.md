---
id: timestamp-kills-the-cache
title: 每次请求的缓存读取都是零
card: prompting-structured-output
kind: debug
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, screen]
tags: [prompt-caching, prefix, cache-control, cost]
minutes: 8
lessons: [phases/11-llm-engineering/15-prompt-caching]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [prompting-structured-output/cache-break-even, prompting-structured-output/lost-in-the-middle-order, inference-serving/prefix-cache-order]
updated: 2026-11-03
---

你给一个 15,000 token 的 system prompt 开了 prompt 缓存。usage 里的缓存读取字段每次请求都是零，而缓存创建 token 每次都在计费。你找什么？按什么顺序找？

## Short answer

缓存断点上方有东西每次请求都在变。先找 system prompt 顶部的时间戳或请求 id，再找以变化的顺序序列化的工具定义，然后找不同代码路径之间只差一个字节的近似重复文本，最后找低于最小可缓存大小的块。缓存只匹配前缀，所以第一个不同的 token 之后全部未命中。

## Full answer

### 不变式

所有服务商都按前缀缓存。一次请求的前缀与最近的某次匹配时，服务商直接用存好的 KV cache，不再重新编码这些 token，并按输入费率的一小部分收读取费。只要有任何 token 不同，它之后的全部未命中。usage 字段说明了一切：每次都有创建计数、读取计数为零，就说明前缀从未匹配。

### 检查清单，按顺序

1. **顶部的动态字段。** system prompt 头几行里的当前时间、请求 id 或会话 id，每次请求都会导致未命中。把它和其他按请求变化的字段一起移到断点下方。
2. **工具顺序变化。** 从字典序列化出来的工具，在不同部署或不同进程之间顺序可能不同；按稳定的顺序序列化。
3. **近似重复的文本。** 两条代码路径构建出的 prompt 只差一个字节，就会产生两个前缀，没有命中。
4. **块太小。** 显式缓存的下限是 1,024 个 token，小模型是 2,048 个；更小的块会静默地不缓存。
5. **在自动缓存的服务商上**，变化的 user 字段属于缓存键的一部分，前缀也仍须保持稳定并超过 1,024 个 token。

### 能命中的布局

system prompt，然后是工具定义，然后是少样本示例，然后是会被复用的检索文档，然后是到上一轮为止的历史，最后是当前消息；当前消息从不缓存，因为它每次都不同。

### 把它变成测试

在 CI 里，用生产环境的 prompt 构建器以相同的用户输入构造两个请求，比较它们的可缓存前缀，把两个都发出去，断言第二个的缓存读取 token 数大于零。手写两个相同的请求体会绕过构建器添加的时间戳或请求 id。把成本看板拆成已缓存和未缓存的输入 token，否则流量下降看起来就像缓存的功劳。

## Follow-ups

- **Level 2:** 怎样把它变成测试？ Expected: 用生产 prompt 构建器以相同的用户输入构造两个请求，断言第二个的缓存读取 token 大于零；如果一直是零，说明键在漂移。
- **Level 2:** 时间戳应该放在哪里？ Expected: 断点下方，和 user 消息等其他按请求变化的字段放在一起。
- **Level 3:** 块低于最小大小时会发生什么？ Expected: 什么都不缓存，也什么都不报告；下限是 1,024 个 token，小模型是 2,048 个。
- **Level 3:** 你改动之后输入 token 下降了。这能证明它生效了吗？ Expected: 不能；把输入 token 拆成已缓存和未缓存，否则流量下降看起来就像缓存的功劳。

## Wrong answers

- "缓存是自动的，没什么要配置。" 在显式缓存的服务商上要标记块；在自动缓存的服务商上，前缀仍须稳定并超过 1,024 个 token，user 字段变化或工具顺序变化都会破坏它。
- "把 user 消息放最前面，模型能早点读到。" 这会把唯一会变的部分放到所有内容上方，缓存永远不会命中。
- "缓存过期了，把 TTL 延长到一小时。" 过期表现为空闲时段之后的写入，而不是每次请求都写入；一小时 TTL 的写入还要收 2 倍费用。

## Taught in

[prompt 缓存](../../../phases/11-llm-engineering/15-prompt-caching/)一课给出了前缀不变式、对缓存友好的布局、常见坑和 CI 检查。
