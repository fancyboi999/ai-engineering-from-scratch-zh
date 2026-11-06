---
id: small-pool-lru-thrash
title: 小池子里的 LRU 抖动，随后崩溃
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, agentic-ai-engineer]
rounds: [debugging, ml-depth]
tags: [eviction, radix-cache, kv-pool, lru, cuda-graphs, multi-turn]
minutes: 25
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [sglang-101#s-eviction-policies-and-hicache, sglang-101#s-operating-sglang, sglang-101#s-mem-fraction-static-and-startup-sizing, sglang-101#s-forwardmode-and-cuda-graphs]
practice: []
cheatsheet: []
related: [scenarios/request-id-at-prompt-start]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-0.6B
  hardware: the shared second L4 of a two-GPU node, with no clock lock
source:
  - manuals/sglang-101/capture/gpu/out-l4/eviction-multiturn.txt
  - manuals/sglang-101/capture/gpu/out-l4/small-pool-crash.txt
  - manuals/sglang-101/sections/3-5-eviction-policies-and-hicache.md
  - manuals/sglang-101/sections/7-1-operating-sglang.md
---


## Situation

一个编码助手为每个用户保留一个会话，每一轮都重新发送全部历史。团队用 SGLang 在一块与另一个团队共用的 GPU 上部署一个小模型，于是设了 `--max-total-tokens 8192`，给邻居留出空间。在一次负载测试中，24 个会话各 6 轮，同时 8 个用户，前几轮很快。从第四轮起，首 token 最长要 716 ms，指标端点显示缓存命中率一路跌向零。

接着出现了两种失败。有些运行中，服务器以 `CUDA error: an illegal memory access was encountered` 停止。另一些运行中，日志不报任何错误就停了，GPU 一直是 100%，所有客户端都在等。团队怀疑是淘汰策略，问要不要从 `lru` 换成 `lfu`。

## Evidence

- [引擎、模型和多轮 trace](evidence/trace-and-pool.txt)
- [按池大小和策略列出的整体命中率与每轮命中率](evidence/hit-rate-by-turn.txt)
- [第 5 轮和第 6 轮的首 token 时间中位数](evidence/ttft-at-late-turns.txt)
- [服务器命令、trace，以及各变体的中止和卡住次数](evidence/aborts-and-hangs.txt)
- [中止、卡住，以及是什么掩盖了故障](evidence/where-it-stopped.txt)

## Questions

1. 淘汰会移除什么？永远不会移除什么？`lru` 怎样选出被淘汰的对象？
2. 读第一行的每轮命中率。用文字描述这个规律，并说出背后的机制。
3. 同样的池大小下，`lfu` 和 `slru` 让后几轮保住了命中。这说明了工作集的什么？还有什么办法能修好它？
4. 两种失败都停在调度器的同一个调用里。哪两项改动让故障消失了？各自的代价是什么？
5. 给这些修复排序：更大的池、换策略、关闭 graph、launch blocking。哪个上线，哪个只做测试，哪个永远不进生产？

## Walkthrough

淘汰从 radix 树的叶子上移除没有被任何运行中请求持有的缓存 token。它从不移除运行中请求的 KV。在默认策略下，最后访问时间最早的叶子最先被淘汰。这条规则假设下一个请求和最近的请求相似。

第一份记录里的 trace 打破了这个假设。24 个会话以 8 的并发轮流发送，每一轮都重发一段越来越长的历史。第二份记录显示了池子对此的处理。8,192 个 token 加 `lru` 时，前三轮每轮命中率为 0.11、0.31 和 0.58，然后是 0.39、0.016 和 0.013。到第 5 轮，24 段不断增长的历史组成的循环已经比池子大。策略总是在某个会话回来之前把它的前缀淘汰掉，所以几乎每个后续轮次都要完整执行 prefill。整个 trace 的命中率在两次干净运行中都是 0.19。

同样的池用 `lfu` 时，整个 trace 达到 0.375，第 5 和第 6 轮保持 0.34 和 0.25。用 `slru` 时为 0.367，后两轮为 0.31 和 0.26。所以频率类策略恰好在池子装不下会回来的会话时起了作用。下面几行给出了真正的修复。16,384 个 token 时，`lru` 达到 0.685，第 6 轮命中率升到 0.83。默认池给出 0.687。在更大的池上，我们跑过的每种策略都落在 0.69 左右。第三份记录把这些换算成时间。第 5 和第 6 轮的首 token 中位数，一次 `lru` 运行是 699 和 449 ms，另一次是 716 和 355 ms；用 `lfu` 或 `slru` 时为 143 到 214 ms；用更大的池时为 56 到 160 ms。这张卡没有锁定时钟，所以这些数字只能相互比较。

第四份记录是失败统计。默认设置下，CUDA graph 和 overlap 调度器都开着，6 次运行中有 1 次中止、3 次卡住、2 次干净。设 `CUDA_LAUNCH_BLOCKING=1` 时，3 次全部干净。用 `--disable-cuda-graph` 时，4 次全部干净。开启分层缓存时，3 次中仍有 1 次中止。第五份记录显示，中止和每一次卡住都停在同一个地方：在 overlap 事件循环下，等待 decode 结果拷贝的那个 synchronize 调用。串行发射或关闭 graph 时故障不出现，所以没有任何 traceback 指出是哪个 kernel。也没有向上游提交问题。

## Resolution

两个问题叠在了一起。池子容纳不下这些会再次请求的会话的工作集，所以 `lru` 从第 4 轮起开始抖动。在这样重的淘汰下，带 CUDA graph 和 overlap 调度器的默认路径在 6 次运行中有 4 次碰上内存故障或卡住。

先扩大池子。16,384 个 token 时，同一个 trace 在默认策略下命中率达到 0.685，后面的轮次首 token 保持在 56 到 160 ms。如果池子是由 `--max-total-tokens` 这类上限决定的，就提高上限。如果是由内存决定的，在共用的卡上就意味着更大的 `--mem-fraction-static` 或 FP8 KV cache，而不是换策略。然后读启动日志里的 `max_total_num_tokens`，确认新的大小。之后再重新测量策略。在这个 trace 上，换策略只在那个太小的池子上有回报。

至于崩溃，在池子还小的时候，上线 `--disable-cuda-graph` 作为临时规避方案。在我们的 L4 和一个 8B 模型上，graph 每个 decode 步大约省 1%，所以要在你的模型上测量代价。更大的池子止住了抖动，但我们没有统计更大池子上的崩溃次数，所以对于这个故障，把它当作未测试。`CUDA_LAUNCH_BLOCKING=1` 只留给调试。

## Wrong turns

- "换成 lfu 直接上线。" 频率类策略会把昨天热门的 prompt 留在内存里，让今天的 prompt 为它买单。它在这里有用，只是因为池子太小，而更大的池子让所有策略打成平手。
- "在生产环境设 CUDA_LAUNCH_BLOCKING=1。" 它在 5 次运行中 5 次掩盖了故障，代价是每次 kernel 发射都要等前一个完成。用它调试，永远不要用它提供服务。
- "开启分层缓存来止住崩溃。" 开启主机层后，3 次运行中仍有 1 次中止。主机层保存被淘汰的前缀，不会改变出故障的那条路径。
- "提高运行中请求的上限，让会话不用等。" 运行中的请求越多，占用的池子越多，淘汰就越重，命中率跌得更低。

## Generalize

如果前几轮正常、后面几轮命中率下降，说明工作集已经超出了缓存。调策略之前先定缓存大小，因为策略只是在一个太小的集合里决定丢掉哪一部分。如果一个故障只在某种负载形态下出现，就一次只改一个开关来改变执行路径；把那个让工作串行化的开关留给调试器，不要留给用户。

## Taught in

SGLang 手册在[淘汰与 HiCache 页](../../../manuals/sglang-101/sections/3-5-eviction-policies-and-hicache.md)测量了这个 trace 和各策略，在[运维页](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)记录了崩溃，在[内存比例页](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)确定了池子大小，在 [CUDA graph 页](../../../manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md)权衡了 graph 的得失，[RadixAttention 课](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/docs/en.md)则搭建了这些策略所遍历的树。
