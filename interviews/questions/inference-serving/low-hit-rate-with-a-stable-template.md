---
id: low-hit-rate-with-a-stable-template
title: 模板稳定，命中缓存的 token 却为零
card: inference-serving
kind: debug
level: 2
roles: [inference-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [debugging, screen]
tags: [prefix-cache, radix-cache, request-id, hit-rate, routing]
minutes: 8
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [sglang-101#s-prefix-friendly-prompts]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

一个团队在开启分层缓存的 SGLang 上运行很长的 agent 会话。重发长历史的请求在他们的看板上显示 `#cached-token: 0`。他们调过缓存层级和写入策略，命中率几乎没动。在他们看来，prompt 模板是稳定的。你先看哪里？预计会找到什么？

## Short answer

看服务器实际收到的请求开头那几个 token，而不是看模板。中继或 chat template 经常在靠近开头的地方加上每次请求都会变的东西，比如请求 ID、会话哈希或日期，而缓存树从第一个 token 开始匹配，遇到第一个不同之处就停。在手册记录的事故里，系统 prompt 中的一个随机哈希让命中率损失了 27.6 个百分点，去掉它之后，引擎命中率从 66.8% 升到 94.4%。

## Full answer

### 把一个标识符放在三个位置来复现

手册的采集工具包发送一段 2,999 token 的系统 prompt 加一个简短问题，三种形式各发五次，并开启 `--enable-cache-report`，让每个响应报告命中缓存的 token 数：

| 形式 | 命中缓存的 token | prompt token | 中位 TTFT |
|---|---|---|---|
| 稳定的系统 prompt | 2,998 | 2,999 | 45.1 ms |
| 随机 ID 放在开头 | 5 | 3,034 | 1,255.3 ms |
| 同一个 ID 放在末尾 | 2,985 | 3,028 | 88.2 ms |

ID 放在开头时，首 token 时间变为原来的 28 倍。放在末尾只多花 43 ms。三种形式的 token 几乎相同，只是顺序不同。开头的 ID 只匹配到随机十六进制字符之前的 5 个 token，之后一个都没匹配上。

### 为什么改动之后的内容都匹配不上

后面每个 token 的注意力值都取决于它前面的所有 token。缓存如果复用这些后面的 token，就会返回错误的答案。所以缓存树是精确匹配的：改动系统 prompt 会让它后面的所有内容失效，而改动最新的一条消息只会让这条消息失效。

### 问题背后的事故

报告者发现了三个叠在一起的原因：

1. 中继在每个请求里放了一个按会话随机生成的哈希和一条轮换的系统消息。去掉它们后，引擎命中率从 66.8% 升到 94.4%。
2. 客户端把任务列表快照写在系统 prompt 的末尾。每次任务更新都会改变系统 prompt，让它后面超过 100,000 token 的历史失效。
3. 分层缓存回载时如果找不到空间，会驱逐其他会话的前缀。报告者统计到 250,000 次驱逐调用，而完成的回载只有 376 次。

第一个修复是改 prompt。哈希造成的 27.6 个百分点，任何缓存参数都救不回来。课里讲了另一个部署中的同类事情：把动态内容移出可缓存的前缀后，命中率从 7% 升到 74%。

### 检查顺序

1. 导出两个连续请求的完整 token 序列，从第一个 token 开始对比。中继和 chat template 加进去的内容也要算上。
2. 开启 `--enable-cache-report` 后读 usage 块里的 `cached_tokens`，或者读原生 `/generate` 路由的 `meta_info`。
3. 看 `Prefill batch` 日志行里的 `#new-token` 和 `#cached-token`。
4. 从 `/metrics` 读 `sglang:cache_hit_rate`。
5. 有多台服务器时，检查路由。请求落到没有它前缀的服务器上，不管 prompt 写得怎样都会未命中。有一份报告把每段对话路由到同一台服务器后，命中率从 64.7% 升到 92.1%。

有两项服务器设置看起来像 prompt 问题。请求要求从位置 k 开始返回 prompt 的 log probability 时，只能复用前 k 个 token。不同的 LoRA adapter 永远不会共享树节点，因为 adapter 是树键的一部分。

## Follow-ups

- **Level 2:** 同一个随机 ID 改放到固定文本后面。现在代价是多少？ Expected: 大约 45 个 token 的 prefill，而不是大约 3,027 个；在实验里，这比稳定的 prompt 多 43 ms，而不是变为原来的 28 倍。
- **Level 3:** 修好 prompt 之后，一台服务器命中很好，整个集群仍然未命中。下一步查什么？ Expected: 路由；请求落到没有它前缀的服务器上就会未命中，有一份报告把每段对话路由到同一台服务器后，从 64.7% 升到了 92.1%。
- **Level 4:** 修好 prompt 后，主机层仍在伤害其他会话。事故里统计到了什么，说明什么？ Expected: 250,000 次驱逐调用对 376 次完成的回载；找不到空间的回载会把其他会话从 GPU 池里驱逐出去，所以只有在 prompt 修好之后，才需要去看池的大小和写入策略。

## Wrong answers

- "把分层缓存的比例调大，直到命中率恢复。" 从第 5 个 token 就开始的未命中，任何缓存参数都救不回来；第一个修复是改 prompt，它值 27.6 个百分点的命中率。
- "模板是稳定的，所以 prompt 也是稳定的。" 服务器看到的不是模板；中继、网关或 chat template 都可能插入哈希、日期或快照，所以要从开头对比两个连续请求的 token 序列。
- "中间改了一个字段，只会损失这个字段的 token。" 改动之后的每个 token 都在树的另一条分支上，因为后面 token 的注意力值取决于前面的每个 token。

## Taught in

[对前缀友好的 prompt](../../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)给出了三种形式的实验和这次事故，[RadixAttention 一课](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/docs/en.md)讲了排序规则。
