---
id: a-benchmark-that-counted-empty-answers
title: 把空回答也算进去的拆分服务基准测试
card: inference-serving
kind: code-reading
level: 4
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [disaggregation, benchmark, kv-transfer, retokenized-tokens, false-success]
minutes: 10
lessons: []
manuals: [sglang-101#s-prefill-decode-disaggregation]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

一个团队在两张 L4 上把 Qwen/Qwen3-8B 拆成一个 prefill 服务器和一个 decode 服务器，两者之间走 TCP。他们经由路由器以每秒 8 个请求跑开环基准测试，然后把结果当作胜利发了出来：每秒输出 751.85 个 token，同样速率下单个 FP8 服务器是 728.61。下面是 prefill 日志、decode 日志和基准测试汇总里的几行。读一读，说说你看到了什么。

```text
… Decode batch, #running-req: 2, #token: 1206, token usage: 0.41, pre-allocated usage: 0.00, #prealloc-req: 19, #transfer-req: 0, #retracted-req: 0
… TCP lane queue-full rejection count: 4096
… Session 151.242.195.41:15367 failed.
Prefill transfer failed lines: 2902
Successful requests:                     240
Total generated tokens (retokenized):    0
Mean TTFT (ms):                          0.00
```

## Short answer

这次运行没有产出任何文本。经过路由器的每个请求都算作成功，但客户端对输出重新分词后得到 0 个 token，平均首 token 时间 0.00 ms 也不是真实的测量值。decode 日志说明了原因：decode 副本只能运行 2 个请求，另有 19 个在等显存，prefill 继续为它们生成 KV，通往 decode 的 TCP 传输队列被填满并拒绝了 4096 次，会话随即失败，之后 2902 次传输也跟着失败，所以 751.85 只是路由器返回空回答的速度。

## Full answer

### 按顺序读日志

1. `#running-req: 2`，`#prealloc-req: 19`，token usage 为 0.41。decode 端在运行 2 个请求，另有 19 个在等 decode 显存。这个池很小：decode 服务器放在共享卡上，只有 2,925 个 token，而 prefill 卡上有 24,094 个。
2. `TCP lane queue-full rejection count: 4096`。prefill 不断为 decode 接不下的请求生成 KV cache，通往 decode 的传输队列被填满。
3. `Session ... failed.` 压测进行到第三分钟，传输会话失败，之后再没有恢复。
4. `Prefill transfer failed lines: 2902`。之后的每个请求都传输失败。
5. `Successful requests: 240`，同时 `Total generated tokens (retokenized): 0`，`Mean TTFT (ms): 0.00`。每个失败的请求仍经路由器返回了 HTTP 200，只是没有文本。

### 汇总为什么会骗人

客户端按状态码记成功。吞吐量那一行统计的是客户端请求的 token 数，每个请求 128 个，并忽略结束 token，而不是实际收到的 token 数。只有两个数字暴露了问题：重新分词后的输出 token 数，它统计的是真正返回的内容；还有为零的首 token 时间，真实请求不可能是这个值。手册没有发布这个吞吐量数字，它的工具包现在会拒绝所有请求 TTFT 都为 0 的运行。

### 对调后的拆分

团队随后把 decode 放到拥有完整 24,094 token 池的卡上，把 prefill 放到只有 2,925 token 的共享卡上。1 到 8 个用户时，每个请求都返回了文本。16 个用户时，8,192 个生成 token 中只有 2,048 个以文本形式返回。32 个用户时，每个请求都返回空内容，工具包停止了压测。原来的方向失败得更早：2 个用户时，2,048 个生成 token 只返回了 512 个；4 个用户时一个也没有返回。手册的结论是，它没有这对卡上拆分方案在负载下的实测结果，也不声称有。

### 规则

在每个拆分部署的基准测试里，读吞吐量之前先对比 `Total generated tokens (retokenized)` 和 `Total generated tokens`，再看 TTFT 分布里有没有不可能出现的值。在生产环境中，监控 bootstrap 失败和传输失败计数器、传输延迟和速度，以及 decode 预分配队列和传输队列的瞬时值。

## Follow-ups

- **Level 3:** 这类汇总里，读吞吐量之前必须先看哪两个数字？ Expected: 重新分词后的输出 token 数与生成 token 数的对比，以及 TTFT 分布；两个 token 数之间有差距，或者首 token 时间为零，都说明请求返回时没有文本。
- **Level 4:** prefill 一直在工作，为什么 decode 池先满了？ Expected: decode 副本放在共享卡上，池只有 2,925 个 token，所以只能运行 2 个请求，19 个在等显存；prefill 有 24,094 个 token，继续为这些请求生成 KV，于是通往 decode 的传输队列被填满，会话失败。
- **Level 4:** 对调后的拆分在 8 个用户以内能返回文本，到 16 和 32 个用户时丢了文本。这说明这对卡有什么问题？ Expected: 小的一侧不论承担哪个角色都会限制整对卡；prefill 放在小卡上时，16 个用户下 8,192 个生成 token 只返回了 2,048 个，32 个用户下一个也没有，所以这对卡在负载下没有实测结果，诚实的报告会直接写明这一点。

## Wrong answers

- "240 个请求全部成功，所以系统是健康的。" 每个失败的请求，路由器都返回了没有文本的 HTTP 200；重新分词后 token 数为零、首 token 时间为 0.00 ms，说明什么都没有生成。
- "751.85 高于 728.61，所以拆分部署赢了。" 这个数字统计的是客户端请求的 token，不是收到的 token；手册没有发布它，工具包现在会拒绝所有请求 TTFT 都为 0 的运行。
- "问题出在 TCP 后端，换成 RDMA 就行。" 队列满是因为 decode 接不下 KV：它在 2,925 token 的池上运行 2 个请求，19 个在等显存；更快的链路不会给 decode 端增加显存。
- "加上重试就能救回失败的传输。" 会话在第三分钟失败后没有恢复，所以之后的每次传输都会失败；修复办法是让 decode 池装得下这些请求，并检查输出确实存在。

## Taught in

[SGLang 拆分部署一节](../../../manuals/sglang-101/sections/6-3-prefill-decode-disaggregation.md)给出了队列满的日志、对调后的拆分，以及检查重新分词 token 数的规则。
