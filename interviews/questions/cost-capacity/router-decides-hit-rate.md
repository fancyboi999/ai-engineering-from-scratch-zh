---
id: router-decides-hit-rate
title: 第二个副本让前缀缓存失效
card: cost-capacity
kind: design
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, ml-depth]
tags: [routing, prefix-cache, replicas, session-affinity]
minutes: 15
lessons: [phases/17-infrastructure-and-production/19-ai-gateways]
manuals: [sglang-101#s-sgl-model-gateway, vllm-101#s-run-vllm-on-kubernetes]
practice: []
cheatsheet: [sglang-serving, llm-routing-gateways, gpu-kubernetes]
related: [cost-capacity/hit-rate-gauge-lies, inference-serving/prefix-cache-order]
updated: 2026-11-03
---

你加了第二个服务副本，想把容量翻倍。吞吐上去了，长聊天会话的首 token 时间却变差了，两台服务器的缓存命中率都下降了。请解释原因，并设计路由，让第二个副本不再抵消缓存的效果。

## Short answer

每个副本都有自己的 KV cache，路由器如果随机或轮流分发请求，就会把一段聊天的第五轮发给从没见过第一到第四轮的副本。那个副本要把整段历史重新 prefill 一遍，这正是缓存要避免的前缀未命中。用缓存感知的策略把每段对话送回持有它前缀的副本，这个策略记住哪台服务器见过哪些文本，前面再加一道负载均衡检查。然后在服务器本身读命中率，因为路由器的记录只是猜测。

## Full answer

### 机制

普通的 Kubernetes Service 随机分发请求。SGLang 服务器内的数据并行控制器默认用轮询，不考虑前缀。无论哪种，一段对话的各轮都会落到不同的副本上，每个副本都在计算另一个副本已经持有的历史。SGLang 手册里的一份现场报告测出了损失：逐轮路由时，23% 的输入 token 被重新计算。加了一个把每段对话固定到一块 GPU 的请求头后，缓存命中率从 64.7% 升到 92.1%，首 token 时间的中位数减半。

### 缓存感知路由器怎样选服务器

SGLang 网关为每个模型维护一棵近似的 radix 树，树建在请求文本的字符上，所以路由时从不需要分词。对每个请求，它按顺序做三件事：

1. 检查均衡。当最忙服务器的负载比最闲的高出 64 以上，并且是最闲的 1.5 倍以上时，请求发给负载最低的服务器。
2. 否则计算匹配率，即请求文本中与树匹配的比例。高于 0.3 时，请求发给匹配最长的服务器。
3. 低于 0.3 时，发给负载最低的服务器。

后台任务每 120 秒把每棵树裁剪到最多 67,108,864 个节点。均衡检查放在最前面是有意的：前缀优先的策略会把所有长对话都堆到一台热点服务器上。

### 这棵树只是猜测

网关记录的是它把文本发到了哪里。它从不问服务器现在还持有什么，而服务器之后可能会淘汰这个前缀。所以一个请求即使到了树指定的服务器，也可能还要 prefill。要在服务器本身上检查命中率，用它们的计数器在一个窗口上计算，不能只看路由决策。

### 按流量选策略

聊天和 agent 流量的各轮共享很长的前缀，用缓存感知路由。prompt 各不相同的 batch 流量，用二选一（power-of-two）或轮询策略，因为匹配率低于阈值时本来就没有亲和性。不要把多轮对话流量放在默认轮询的服务器内数据并行后面。

### vLLM 这一层里的同一个思路

vLLM 手册列出了一些读取引擎指标来选择副本的路由器，其中一个还读取引擎用 `--kv-events-config` 发布的 KV cache 事件，让请求去到持有它前缀的副本。production stack 的路由器把一个会话固定在一个副本上。用网关课程的说法，这是下沉了一层的提供商路由：AI 网关在提供商之间路由，引擎路由器在副本之间路由。

### 把路由器和引擎一起固定版本

SGLang 手册记录过一次事故：同一个引擎构建，配一个版本的路由器跑出每秒 132,140 个 token，配下一个版本只有 69,767。把路由器和引擎当作一个系统做基准测试，并固定两者的版本。

## Follow-ups

- **Level 3:** 为什么路由器先检查负载均衡，再看前缀匹配？ Expected: 前缀优先的策略会把所有长对话都送到一台热点服务器。差距大时，不均衡检查会把请求发给负载最低的服务器。
- **Level 3:** 哪类流量不该用缓存感知策略？ Expected: prompt 各不相同的 batch 流量。匹配率低于阈值时没有亲和性，基于负载的策略能用更少的状态做同样的事。
- **Level 4:** 网关一直把某台服务器的对话路由给它，它的命中率却还是很低。为什么？ Expected: 网关的树记录的是它把文本发到了哪里，不是服务器还持有什么。服务器淘汰了这个前缀，请求就要 prefill。要读服务器自己的计数器。
- **Level 4:** 你升级了路由器，没动引擎。要测什么？ Expected: 把路由器和引擎当作一个系统，测吞吐和命中率，因为在一次已报告的事故中，光是换路由器就让吞吐减半。

## Wrong answers

- "加一个副本，每台服务器的命中率不会变。" 每个副本都有自己的缓存，随机路由会把每段对话拆到两个副本上。
- "按用户 ID 哈希到一台服务器就完事了。" 这能把用户留在一台服务器上，但不管负载。手册里的网关先做均衡，所以一个热点用户不会把一个副本压满而得不到任何缓解。
- "不用网关，打开服务器内的数据并行。" 它默认用轮询，不考虑前缀，而这正是你要解决的问题。

## Taught in

[SGLang 101 的模型网关一节](../../../manuals/sglang-101/sections/6-4-sgl-model-gateway.md)讲解缓存感知路由和那份现场报告，[vLLM 101 的 Kubernetes 一节](../../../manuals/vllm-101/sections/6-4-run-vllm-on-kubernetes.md)列出读取引擎指标和缓存事件的路由器，[AI 网关课程](../../../phases/17-infrastructure-and-production/19-ai-gateways/)把路由放在网关的各项功能中介绍。
