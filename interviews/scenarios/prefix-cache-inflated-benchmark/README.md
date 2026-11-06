---
id: prefix-cache-inflated-benchmark
title: 负载更高，首 token 反而更快
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [benchmark, prefix-cache, ttft, experiment-hygiene]
minutes: 25
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [sglang-101#s-sglang-benchmark-serving, vllm-101#s-benchmark-your-server-in-15-minutes]
practice: []
cheatsheet: [inference-load-testing, sglang-serving]
related: [inference-serving/prefix-cache-order, inference-serving/goodput-sets-the-cap]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-30B-A3B-Instruct-2507
  hardware: one GB10 (DGX Spark)
source:
  - manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md
  - manuals/sglang-101/capture/gpu/out-gb10/server-default.command.txt
  - manuals/sglang-101/capture/gpu/out-gb10/bench-random-c8.txt
  - manuals/sglang-101/capture/gpu/out-gb10/bench-random-c32.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-default.log
  - manuals/sglang-101/capture/gpu/out-l4/prefix-cache-flush.txt
---


## Situation

一个基准测试工具包用 `Qwen/Qwen3-30B-A3B-Instruct-2507` 启动一台 SGLang 服务器，对它做负载扫描。每次运行发送 512 token 的随机 prompt，要求返回 128 token。工具包在同一台服务器上依次运行每个并发上限，每个上限只跑一次。

报告显示，并发上限为 8 时首 token 时间中位数为 677.61 ms，上限为 32 时为 390.38 ms。负载变成四倍，首 token 反而更快。一位同事想把结果发布为"调度器在高负载下效率更高"。发布之前，由你复查这次运行。

## Evidence

- [服务器命令](evidence/server-command.txt)
- [上限为 8 时的首 token 数据块](evidence/ttft-cap-8.txt)
- [上限为 32 时的首 token 数据块](evidence/ttft-cap-32.txt)
- [客户端参数](evidence/client-arguments.txt)
- [上限为 32 的运行中的两行 prefill 日志](evidence/prefill-lines.txt)
- [用三个种子重跑相同的上限](evidence/three-seed-rerun.txt)
- [同一负载连续跑四次](evidence/flush-test.txt)

## Questions

1. 负载上升时首 token 中位数反而下降，哪些解释说得通？读日志前至少写出两个。
2. 上限为 32 时，平均值和 P99 远高于中位数。这种分布形状说明了什么？
3. 客户端参数中的哪一项让两次运行发送相同的 prompt？
4. 这两行 prefill 日志能证明什么？不能证明什么？
5. 怎样重跑这次扫描，才能让结果可信？

## Walkthrough

1. **怀疑单个样本。** 没有哪种排队模型会让首 token 在负载更高时变快。每个上限只跑了一次，所以首先怀疑的是方法，不是调度器。把候选原因写下来：缓存是热的、GPU 时钟不同、内存池不同，或者单次运行的噪声。
2. **读完整的分布。** 上限为 32 时中位数为 390.38 ms，平均值却是 1166.51 ms，P99 为 2910.22 ms。中位数远低于平均值，说明请求分成了快慢两组。有什么东西让一部分请求变得很便宜。
3. **读客户端参数。** 这次运行用了随机数据集，参数为 `seed=7` 和 `flush_cache=False`。相同的种子让每次运行开头发送的 prompt 都一样。同一台服务器上的两次运行之间，没有任何操作清空缓存。
4. **读服务器日志。** 两个 prefill 批次分别接纳了 14 个和 15 个请求，每个请求只需要一个新 token，缓存 token 分别为 6879 个和 7634 个。这些 prompt 在前一次运行时就已经进了缓存。命中缓存的 prompt 跳过 prefill，首 token 自然来得快。
5. **先计数，再验证。** 手册统计了每次运行的 prefill 日志。上限为 32 时，128 个 prompt 中有 64 个在运行开始前就已在缓存中。上限为 8 时，64 个中有 16 个。上限为 32 时一半请求占了便宜，上限为 8 时是四分之一。然后改动上述分析指向的变量：每个上限用三个种子运行，677.61 ms 的结果没有再出现。

## Resolution

这个结果是前缀缓存造成的。工具包复用了同一个种子和同一台服务器，从不清空缓存，所以每次运行都命中了前一次运行留下的 prompt。用种子 1、2、3 重跑扫描，上限为 8 时中位数为 209.98 ms，上限为 32 时为 416.37 ms。运行干净时，首 token 随上限增大而变慢，与排队模型的预测一致。

修复靠的是一套流程，不是一个服务器参数：

1. 每次运行都从空缓存开始。给基准测试客户端传 `--flush-cache`，调用 `POST /flush_cache`，或者重启服务器。
2. 确认清空确实执行了。服务器只在没有请求运行或等待时才会清空。
3. 每次运行换一个新种子，让客户端发送新的 prompt。
4. 每次运行前后记录 `sglang:cached_tokens_total`，把缓存 token 数写在结果旁边。

另一项在 L4 上的测试量出了影响的大小。不清空缓存的重复运行，首 token 中位数大约只有全新运行的 1/4.8。清空之后，数值回到接近全新运行的水平。

## Wrong turns

- "上限高时调度器的批处理更好。" 队列只会增加等待时间。中位数下降，是因为缓存省掉了 prefill 工作。
- "基准测试时关掉前缀缓存。" 生产环境开着缓存运行。应在两次运行之间重置缓存并记录命中数，这样测的才是真实的服务器。
- "每个上限多跑一些请求，种子不变。" 种子不变，更多请求只会重复同样的 prompt，缓存一直是热的。
- "怪 GPU 时钟。" 时钟变化可能让结果移动，但 prefill 日志里有缓存 token，这不是时钟变化能产生的。

## Generalize

重复输入的基准测试，测的是它自己的缓存。一个结果和预期方向相反时，在相信它之前先读完整分布，检查哪些状态会在两次运行之间留存，再改动你的解释所指认的那一个变量。每个点跑三个种子并报告范围。每 token 时间受这个错误的影响比首 token 小，因为缓存命中省掉的是 prefill 工作，decode 工作不变。

## Taught in

[SGLang 101 的基准测试一节](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md#reset-the-prefix-cache-between-runs)发现了这个结果及其原因，[负载测试课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/)解释了为什么循环发送相同 prompt 只能测到一个点。
