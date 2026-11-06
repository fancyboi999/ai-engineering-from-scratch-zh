---
id: request-id-at-prompt-start
title: 放在 prompt 开头的请求 ID
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [debugging, ml-depth]
tags: [prefix-cache, prompt-layout, radix-cache, cached-tokens, ttft]
minutes: 15
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [sglang-101#s-prefix-friendly-prompts, sglang-101#s-radixcache, vllm-101#s-make-repeated-prompts-hit-the-prefix-cache]
practice: []
cheatsheet: [sglang-serving]
related: [scenarios/prefix-cache-inflated-benchmark, inference-serving/prefix-cache-order]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory, and a GB10 as the second machine
source:
  - manuals/sglang-101/capture/gpu/out-l4/cache-experiment.txt
  - manuals/sglang-101/capture/gpu/out-l4/server-default.log
  - manuals/sglang-101/capture/gpu/out-gb10/cache-experiment.txt
  - manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md
---


## Situation

一个 agent 产品通过中继发送所有请求。为便于追踪，中继在系统 prompt 开头插入一行 `Request id <hex>.`，每次调用都使用新值。系统 prompt 本身长 2,999 个 token，内容从不改变。团队在 L4 上用 SGLang 服务 `Qwen/Qwen3-8B`，并启用了 `--enable-cache-report`。

用户反馈，每轮首个 token 都要等约两秒，即使重复提问也是如此。团队将显存比例翻倍，尝试另一种淘汰策略，并开启分层缓存，等待时间却没有变化。指标端点报告的缓存命中率接近零。

## Evidence

- [系统 prompt 以请求 ID 开头的五次请求](evidence/id-at-start.txt)
- [使用固定系统 prompt 的相同五次请求](evidence/stable-prompt.txt)
- [将相同请求 ID 移至系统 prompt 末尾](evidence/id-at-end.txt)
- [三种形式请求经过时的调度器日志](evidence/scheduler-view.txt)
- [在 GB10 上用更大模型重复同一实验的汇总](evidence/second-machine.txt)

## Questions

1. 第一份证据展示五次请求，缓存 token 数说明匹配在什么位置停止？
2. radix 树怎样匹配 prompt？为什么首次差异之后的内容无法命中？
3. 第三份证据将 ID 放在 prompt 末尾，阅读前先预测缓存 token 数，再解释差异。
4. 运行中的服务可从哪三个位置确认命中或未命中？按从最接近单次请求到最综合的顺序说明。
5. 团队先调整了缓存层级和淘汰策略，为什么都没有帮助？应按什么顺序调整 prompt 与服务端参数？

## Walkthrough

逐项阅读第一份证据。每次请求发送约 3,030 个 prompt token，服务端报告的 `cached_tokens` 为 3 或 6。每轮首个 token 耗时为 2,159.2 到 2,171.2 ms。因此每次请求都完整执行系统 prompt 的 prefill，缓存只找到了随机十六进制数字之前的少量 token。

第二份证据是对照组。在固定系统 prompt 后提出相同问题，从第二轮开始，2,999 个 token 中有 2,998 个命中缓存，首个 token 在 80.7 到 85.1 ms 内到达。第一轮只有 3 个缓存 token，耗时 2,143.9 ms，因为这一轮填充了缓存。所以只要 prompt 能匹配，服务端和模型处理这个 prompt 的速度能快约二十五倍。

第三份证据把相同的随机 ID 移到系统 prompt 末尾。缓存 token 数升至 2,983 到 2,987，首个 token 耗时降至 93.1 到 99.7 ms。三种形式的 token 几乎相同，只有顺序不同。radix 树从第一个 token 开始比较，在首次差异处停止。差异之后的内容不能匹配，因为后续每个 token 的注意力值都依赖此前所有 token。若缓存复用差异之后的 token，就会返回错误答案。

调度器日志从服务端角度展示相同现象。固定 prompt 的各轮记录 `#cached-token: 2998`，只有一个新 token。随后五个 prefill 批次各有约 3,025 到 3,029 个新 token，缓存数为 3 或 6。ID 在末尾的各轮则有 45 到 50 个新 token，以及 2,983 到 2,987 个缓存 token。最后一份证据在 GB10 上用混合专家模型重复实验。耗时不同，为 632.2 ms 对 44.75 ms，缓存 token 数则相同，为 6 对 2,998。

## Resolution

中继把一个不断变化的值放在了所有请求唯一共享部分的开头。改一处就修好了：将追踪 ID 移出系统 prompt，放入请求元数据，或把它放在末尾。在 L4 实测中，ID 位于开头时首个 token 的中位耗时为 2,161.4 ms，移至末尾后降为 98.2 ms；约 3,030 个 token 中，缓存 token 中位数从 6 升至 2,986。

从三个位置证明修复有效。使用 `--enable-cache-report` 启动服务，读取每个响应 usage 块中的 `cached_tokens`；读取调度器日志每行 `Prefill batch` 的 `#cached-token`；从 `/metrics` 读取 `sglang:cache_hit_rate`。在 vLLM 中读取 `vllm:prefix_cache_hits_total` 和 `vllm:prefix_cache_queries_total`。团队最初调整的缓存配置不是问题，因为任何淘汰策略或主机缓存层都无法匹配从开头就不同的 token。

## Wrong turns

- "提高显存比例，让缓存容纳更多内容。" 显存池并未满，未命中来自 prompt 顺序；更大的池只会保存更多无法匹配的块。
- "开启分层缓存。" 主机层保存被淘汰的前缀，但这里没有发生淘汰，前缀从一开始就未命中。
- "命中率低是因为问题不同。" 问题约占 30 个 token，位于 2,999-token prompt 的末尾；变化的问题只增加约 30 个 token 的 prefill，而非 2,999 个。
- "对系统 prompt 求哈希并据此路由。" 多台服务分摊流量时路由才有意义，这里只有一台服务，且每次请求的 prompt 都不同，路由也无法提供帮助。

## Generalize

将 prompt 布局视为服务系统的一部分。固定内容放在最前，按会话变化的内容其次，按请求变化的内容最后。不要将 ID、时间戳、哈希或随机种子放进系统 prompt，工具定义和 JSON 键也要保持固定顺序。调整任何缓存参数前，先查看真实请求的缓存 token 数。改 prompt 能找回的命中率，任何服务端参数都找不回来。

## Taught in

SGLang 手册在[适合前缀缓存的 prompt 页面](../../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)测量三种 prompt 形式，在[RadixCache 页面](../../../manuals/sglang-101/sections/3-3-radixcache.md)说明树结构，vLLM 手册在[前缀缓存页面](../../../manuals/vllm-101/sections/3-2-make-repeated-prompts-hit-the-prefix-cache.md)给出相同规则，[RadixAttention 课程](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/docs/en.md)则从零构建这一机制。
