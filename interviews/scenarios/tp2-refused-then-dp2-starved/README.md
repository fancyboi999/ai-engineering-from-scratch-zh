---
id: tp2-refused-then-dp2-starved
title: 张量并行启动被拒，数据并行缺少资源
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [tensor-parallel, data-parallel, shared-gpu, kv-pool, load-balancing, round-robin]
minutes: 25
lessons: []
manuals: [sglang-101#s-tp-size-dp-size-and-attn-dp-size, sglang-101#s-mem-fraction-static-and-startup-sizing]
practice: []
cheatsheet: []
related: [scenarios/startup-oom-shared-gpu, scenarios/load-knee-and-admission-cap]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: a node with two L4 GPUs, the second shared with another team's pods
source:
  - manuals/sglang-101/capture/gpu/incidents/l4-tp-unbalanced-memory.txt
  - manuals/sglang-101/capture/gpu/out-l4/server-dp2.log
  - manuals/sglang-101/capture/gpu/out-l4/server-dp2-tokens.log
  - manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md
  - manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md
---

## Situation

一个团队在单张 L4 上提供 `Qwen/Qwen3-8B` 服务，想提高容量。节点上有第二张 L4，于是计划把两张卡都用上。第一次尝试是 `--tp-size 2`。服务器在 NCCL 建立两秒后停止，报 `RuntimeError`，指出显存容量不均衡，某些 GPU 可能被其他进程占用。快速查看节点发现，第二张卡上有另一个团队的两个小 pod。

第二次尝试是 `--dp-size 2`，由一个控制器管理模型的两个副本。服务启动了，团队运行了负载扫描。在 64 个用户下，这对卡每秒交付的输出比单卡还要少，每个首 token 都要等许多秒。另一个团队的工程师认为节点本身有一半坏了，要求提硬件工单。你被要求先看日志。

## Evidence

- [启动前几分钟第二张 GPU 的显存占用](evidence/the-other-tenant.txt)
- [NCCL 建立两秒后的张量并行启动日志](evidence/tp2-refused.txt)
- [数据并行启动：各 rank 的权重与池大小](evidence/dp2-two-pools.txt)
- [64 个请求负载下两个 rank 的四行 decode 日志](evidence/dp2-under-load.txt)
- [张量并行检查做了什么，以及它为什么是对的](evidence/the-check-and-the-rule.txt)
- [默认负载均衡方式如何填满较小的副本](evidence/what-round-robin-did.txt)
- [同一对卡在按 token 数路由请求下的表现](evidence/routed-by-tokens.txt)

## Questions

1. 张量并行检查比较了什么？为什么数据并行在它失败的地方启动成功了？
2. 两个副本加载了相同的权重。为什么一个池的大小只有另一个的八分之一？
3. 在负载下，哪个 rank 积压了队列，哪个 rank 接近空闲？哪项默认设置把工作发到了那里？
4. 拥有相等池大小的两个副本能否让容量翻倍？在宣称这一点之前你会读什么？
5. 说出保留双卡的两套方案和放弃双卡的一套方案，并指出手册测了哪一套。

## Walkthrough

1. **读张量并行报错里的检查。** 加载权重前，每个 rank 测量自己的可用内存，通信组取最小值。如果该值低于本地可用内存的 90%，服务器停止。报错打印了三个数字：加载前的可用内存 18.28 GB，该卡的本地内存，以及作为底线的该卡本地内存的 90%，即 19.53 GB。第二张卡被两个各占 1,746 MiB 的 pod 用了 3,506 MiB，导致其低于这条线。这个版本没有参数能关掉这项检查。这项检查停下来是对的，因为张量并行组的每个 rank 承担等额的权重份额和等大的池，最小的卡会限制两张卡的池大小。
2. **看数据并行为什么能启动。** 每个副本自己决定池大小，所以没有均衡检查。两个 rank 都加载了 15.28 GB 的权重。由于 pod 占用了剩余显存，rank 0 随后有 6.59 GB 可用，rank 1 只有 3.17 GB。计算出的池大小分别为 24,094 token 和 2,925 token。四个 640 token 的请求就能填满小的那个。
3. **读四行 decode 日志。** rank 1 运行 4 个请求，token 使用率为 0.82 到 0.87，每秒写入约 25 个 token，队列里有 59 个请求。rank 0 运行 1 到 3 个请求，使用率为 0.02 到 0.07，每秒写入不到 10 个 token，没有队列。控制器的默认方式 `auto` 在非分离式架构下解析为 `round_robin`，而轮询不看池大小或队列。基准测试保持 64 个请求开放，于是 63 个都落在了小副本上（4 个在运行，59 个在等待），在小副本交回槽位之前，客户端无法向大副本发送更多工作。
4. **量化损失。** 64 个用户下，这对卡每秒给出 41.7 个 token，单张 L4 为 250.9 个；三次种子下首 token 的 P99 时间中位数，双卡为 391 秒，单张 L4 为 33.4 秒。双卡在最高的两档负载下时钟还降到了 765 和 675 MHz，低于时钟底线，而单卡运行在 1,320 和 1,080 MHz，所以部分损失来自时钟。在 4 个用户以内，双卡已经慢了 16% 到 41%，原因手册未做隔离分析。
5. **读测过的那套方案。** 使用 `--load-balance-method total_tokens` 时，每个请求发给持有 token 最少的副本。同一对不均衡的卡随后在 64 个用户下给出了每秒 114.7 个 token，轮询时为 41.7，单卡为 250.9；首 token 中位数从 4,763 ms 降到 3,977 ms。那次运行的时钟为 1,020 MHz，之前是 675 MHz，所以收益的一部分可能是显卡时钟带来的。手册没有测试拥有相等池大小的双卡，也没有测试加权路由网关后面的两台服务器。它的预期是：只有当每个副本拥有大致相等的池时，数据并行才会增加容量。

## Resolution

节点没有坏。第二张卡承载了另一个租户，两套拓扑以各自的方式反映了这一事实：均衡检查在加载前停止了第一套拓扑，第二套拓扑给一个副本分配了 2,925 token 的池，并把每隔一个请求发给它。团队退回单张 L4 承接生产流量，因为它在每个负载下都优于双卡，并要求将 pod 移走。拿到两张完整的卡后，他们会再次启动 `--dp-size 2`，并且只有在 `DP0` 和 `DP1` 两个 rank 的 `#tokens` 行读数大致相同时才接受。

两行 decode 日志是这个结论的证据：池较小的 rank 积压了 59 个等待请求，而池较大的 rank 只用了其池的 2% 到 7%。按 token 数路由把双卡在 64 用户下的表现从 41.7 提高到 114.7 token/s，却仍然输给单卡，所以要修的限制是池大小，而不是路由器。

## Wrong turns

- "张量并行被拒，所以用能启动的数据并行。" 能启动不代表能提供服务。负载测试前先读每个 rank 的 `#tokens` 行，因为每个副本自己定池大小，没人会把它们相互比较。
- "调低内存比例，让张量并行检查通过。" 检查比较的是权重加载前的可用内存，不是比例。较小的卡仍会决定两个 rank 的池大小。
- "轮询是公平的，所以损失一定是硬件造成的。" 轮询不读池大小或队列。64 个开放请求中，63 个堆在池较小的副本上。
- "修好路由，两个副本就会让吞吐量翻倍。" 按 token 路由时，双卡每秒给出 114.7 token，单卡为 250.9。小池子依然存在，部分收益来自更高的时钟。

## Generalize

并行拓扑是一个承诺，承诺每个成员承担相等的份额。张量并行在加载前检查这个承诺，并在某张卡不足时停止。数据并行不做检查，每张卡剩多少就给每个副本多少，于是共享卡上的副本只有很小的池，却被不看容量的路由器优先填满。在增加 GPU 之前，先看卡上还有什么；启动之后，读每个 rank 的池大小行。未经逐 rank 验证的容量，是一笔算不拢的账。

## Taught in

SGLang 101 的并行页面在[双 L4 上的实测结果](../../../manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md#what-happened-on-two-l4s)和[相同双卡上的数据并行落败](../../../manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md#data-parallelism-on-the-same-pair-lost)中记录了两次启动和路由修复，显存页面在[SGLang 如何决定拆分](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md#how-sglang-decides-the-split)中解释了为什么池大小取决于每张卡自己的可用内存。
