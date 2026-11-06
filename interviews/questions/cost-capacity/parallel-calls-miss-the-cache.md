---
id: parallel-calls-miss-the-cache
title: 十个并行工具调用，十次缓存写入，零次读取
card: cost-capacity
kind: debug
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [debugging, ml-breadth]
tags: [prompt-caching, agents, fan-out, cost]
minutes: 8
lessons: [phases/17-infrastructure-and-production/14-prompt-semantic-caching, phases/11-llm-engineering/15-prompt-caching]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/cache-break-even, cost-capacity/two-cache-layers]
updated: 2026-11-03
---

一个 agent 对每个用户问题同时扇出十个工具调用。十个调用共用同一段很长的系统 prompt，prompt 缓存也开着。账单却是使用缓存后预期金额的好几倍，usage 字段显示几乎每个调用都在写缓存，几乎没有缓存读取。发生了什么？

## Short answer

第一个请求还没把前缀写进缓存，十个请求就都到了提供商那里。每个请求看到的都是未命中，每个都付了写入溢价，没有一个读到缓存。修法是先串行：先单独发一个请求，等它的缓存写入完成，再扇出另外九个。这会给第一个工具调用增加大约一次写入的延迟，但能消除费用膨胀。

## Full answer

### 机制

缓存写入按请求发生。课程给出的数字是，提供商看到 prompt 后大约 300 ms 完成第一次写入。在这个窗口内到达的请求都没有东西可读，于是每个都去写。每个遇到冷前缀的用户问题，都是十次写入、零次读取。如果一个问题到达时，之前的写入还在缓存有效期内，它就能读到；所以当问题之间的间隔长于有效期时，这个陷阱就会显现。课程报告说，单是这种模式就会让账单变成预期缓存成本的 5 到 10 倍。

### 读 usage 字段

每个响应都会报告写入缓存的 token 数和从缓存读出的 token 数。这次事故里，每个请求的写入数都很高，读取数接近零。这就是它的特征。之后一个带同样前缀的串行请求确实能读到缓存，这一点能把它和前缀永远匹配不上的情况区分开。

### 修法

先单独发第一个请求，等它返回。这时它的写入已经完成。再扇出剩下的九个，每个都能读到缓存。代价是第一个工具调用多了约 300 ms。课程的练习要求做同样的修复，但不增加端到端延迟：在会话开始、第一次扇出之前，用一次调用预热前缀，这样第一个工具调用就已经能读到缓存。

### 排除另一个原因

前缀里带有动态文本时，usage 字段看起来一模一样：每个请求都在写，从来没有读。课程的例子是系统 prompt 里有精确到分钟的时间、一个用户 ID，以及顺序被打乱的示例。一份现场报告把这些文本挪到缓存边界之后，命中率从 7% 升到了 74%。在怪罪扇出之前，先检查 prompt 模板。

## Follow-ups

- **Level 2:** 怎样区分扇出陷阱和前缀里的动态文本？ Expected: 两者都是只有写入、没有读取。扇出陷阱之后，一个带同样前缀的串行请求能读到缓存。有动态文本时，什么都读不到。
- **Level 3:** 怎样在不给用户增加延迟的前提下修好扇出？ Expected: 在会话开始时用一次调用预热前缀，这样第一次扇出就已经能读到缓存。
- **Level 3:** 自建的前缀缓存也有同样的陷阱吗？ Expected: 课程说，自建缓存遵循同样的前缀模式，只是用你自己的算力，所以在假设缓存被共享之前，先在一次扇出上测一测缓存的 token 数。

## Wrong answers

- "缓存开着，提供商应该会帮我们去重。" 写入按单个请求发生，第一次写入完成之后缓存才能被读取。
- "把系统 prompt 缩短。" 这会让每份账单都少一点，但十次写入、零次读取的问题还在。
- "关掉缓存，它反而更贵。" 它更贵只是因为请求到达的方式。先串行，就能把十次写入变成一次写入加九次读取。

## Taught in

[缓存经济学课程](../../../phases/17-infrastructure-and-production/14-prompt-semantic-caching/)指出了并行化反模式及其修法，[prompt 缓存课程](../../../phases/11-llm-engineering/15-prompt-caching/)展示了要读的 usage 字段。
