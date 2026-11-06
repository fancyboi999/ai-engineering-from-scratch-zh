---
id: shared-prefix-first
title: 为什么 prompt 的共享部分要放在最前面
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-depth]
tags: [prefix-cache, radix-cache, kv-cache, ttft, prompt-order]
minutes: 8
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [vllm-101#s-make-repeated-prompts-hit-the-prefix-cache, sglang-101#s-prefix-friendly-prompts, sglang-101#s-radixcache]
practice: []
cheatsheet: []
related: [inference-serving/prefix-cache-order, inference-serving/low-hit-rate-with-a-stable-template]
updated: 2026-11-03
---

对话服务的每个请求都重复同一段长系统 prompt，引擎默认开启前缀缓存。什么决定下一个请求能否复用上一个请求的计算？你会怎样安排 prompt 内容，又怎样用数字而非猜测证明命中？

## Short answer

缓存从第一个 token 向后匹配，遇到第一个不同之处就停止，所以命中需要 prompt 开头的 token 及其顺序相同。不变的部分放在最前面，按会话变化的部分放在其次，问题、时间和请求 ID 放在最后。从服务器证明命中：usage 块中的 `cached_tokens` 字段、prefill 日志中的 `#cached-token` 计数，或 `/metrics` 中的前缀缓存计数器。

## Full answer

### 命中能省下什么

L4 上用 Qwen/Qwen3-8B、vLLM 0.31.0，以 8 个用户运行 4 组各 16 个 prompt。每组共用表中对应长度的系统 prompt，再加 128 token 的问题，要求返回 64 token。

| 共享 prompt 长度 | 开启缓存的中位 TTFT | 关闭缓存的中位 TTFT |
|---|---|---|
| 无共享 | 408 ms | 392 ms |
| 256 token | 488 ms | 753 ms |
| 1,024 token | 396 ms | 1,213 ms |
| 2,048 token | 410 ms | 2,550 ms |
| 4,096 token | 375 ms | 13,353 ms |

开启缓存后，各个长度下首 token 时间都约为 400 ms。关闭缓存后，它随共享部分变长而增加，因为每个请求都重新计算整段 prompt。1,024 那行对比最干净，因为两次运行的频率都不低于 1,410 MHz；缓存使首 token 时间缩短到约三分之一，输出增加 50%。同卡上的 SGLang 曲线形态相同：共享 4,096 token 时为 479 对 14,706 ms，关闭缓存的那次运行降频到了 930 MHz。

### 为什么顺序决定结果

每个 token 的注意力值都取决于前面的所有 token。如果复用改动之后的 token，缓存就会返回错误答案，所以前缀缓存设计为精确匹配，也因此不容许前缀变化。vLLM 每次匹配一个 16 token 块，只缓存完整块：共享部分为 20 token 时，一个块可命中，最后 4 token 每次都要计算。SGLang 的 radix 树逐 token 匹配，最后一个 prompt token 总要经过 prefill，因为模型需要它的 logits 来采样第一个输出 token。2,999 token 的 prompt 报告命中 2,998 token。

### 内容顺序

1. 不变的部分：系统 prompt、固定顺序的工具定义、固定指令。
2. 很少变化的部分：某个会话的文档、之前的轮次，原样发送。
3. 每个请求都会变化的部分：用户问题、时间、请求 ID。

也要检查聊天模板。有些模板把日期放进系统 prompt。JSON 对象的键顺序变化，就会变成不同的 token 序列。

### 证明命中

- vLLM：从 `/metrics` 读取 `vllm:prefix_cache_hits_total` 除以 `vllm:prefix_cache_queries_total`，以及打印 `Prefix cache hit rate` 的日志行，共享前缀运行中途该值为 87.2%。
- SGLang：用 `--enable-cache-report` 启动，读取 usage 块中的 `cached_tokens`、每条 `Prefill batch` 日志中的 `#cached-token` 和 `#new-token`，或读取 `sglang:cache_hit_rate` 瞬时指标，共享前缀基准测试后为 0.94，关闭缓存时为 0.0。

命中率低时，原因几乎总是 prompt 顺序。其次是池已满，因为旧块只会保留到运行中的请求需要这部分显存。第三是路由：多台服务器时，请求落到没有它前缀的服务器上，不管 prompt 怎样都会未命中；一份报告把每段对话路由到同一台服务器后，命中率从 64.7% 升到 92.1%。

### 隔离租户

前缀相同的两个用户共享块，一个用户的耗时可能暴露另一个用户发送过什么。每个租户的 `cache_salt` 字段进入块键，不同 salt 就永不共享。LoRA adapter 也是键的一部分。

## Follow-ups

- **Level 2:** vLLM 上，每个请求都以同样的 20 token 开头。多少来自缓存？ Expected: 16，即一个完整块；最后 4 个每次都计算，因为只缓存完整块。
- **Level 3:** prompt 稳定，一台服务器命中很好，整个集群却仍未命中。说出 prompt 之外的两个原因。 Expected: 池满，旧块在下个请求到来前被丢弃；路由器把会话送到从未见过其前缀的服务器；粘性路由让一份报告中的命中率从 64.7% 升到 92.1%。
- **Level 3:** SGLang 收到长为 2,999 token 的 prompt 时，为何缓存计数是 2,998，而不会是 2,999？ Expected: 最后一个 prompt token 总要经过 prefill，因为模型需要它的 logits 来采样第一个输出 token。
- **Level 4:** 客户端在系统 prompt 末尾写入任务列表快照，每轮都更新。树会怎样处理？ Expected: 每次更新都改变系统 prompt，其后所有 token 都无法命中，包括整段历史；手册的事故中每轮有超过 100,000 token 失效，修复是把快照移到历史之后或放进请求元数据。

## Wrong answers

- "缓存已开启，重复 prompt 就会命中。" 匹配从第一个 token 开始且必须精确；开头附近的时间戳、请求 ID 或工具列表重排都会让后面的所有块未命中，一个开头的随机 ID 让 3,034 token 的 prompt 只命中 5 个。
- "用户问题放在最前面，让模型先读它。" 问题每次都变，后面的共享系统 prompt 永远无法匹配；固定部分在前，问题在后。
- "为了公平的基准测试，关闭缓存。" 生产环境开启缓存，测试应在两次运行之间重置而非关闭；关闭时，共享 4,096 token 的首 token 时间在 vLLM 为 13,353 ms，在 SGLang 为 14,706 ms。
- "用客户端响应时间衡量命中率。" 从服务器的 usage 块、prefill 日志或计数器读取；第二次响应更快也可能是 GPU 已预热。

## Taught in

[让重复 prompt 命中前缀缓存](../../../manuals/vllm-101/sections/3-2-make-repeated-prompts-hit-the-prefix-cache.md)、[对前缀友好的 prompt](../../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)和 [RadixCache](../../../manuals/sglang-101/sections/3-3-radixcache.md)测量了两个引擎的缓存，[RadixAttention 一课](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/docs/en.md)给出了内容顺序规则。
