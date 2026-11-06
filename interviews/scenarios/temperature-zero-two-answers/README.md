---
id: temperature-zero-two-answers
title: 温度为 0 仍得到两种回答
card: scenarios
kind: incident
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [determinism, greedy, batch-invariance, prefix-cache, dtype, evals]
minutes: 25
lessons: []
manuals: [sglang-101#s-deterministic-inference-and-logprobs, vllm-101#s-get-reproducible-outputs, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: []
related: [scenarios/prefix-cache-inflated-benchmark]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 and vLLM 0.31.0
  model: Qwen/Qwen3-30B-A3B-Instruct-2507 on the GB10, and Qwen/Qwen3-8B-FP8 and Qwen/Qwen3-0.6B on the L4
  hardware: one GB10 with 128 GB of unified memory, and the shared second L4 of a two-GPU node
source:
  - manuals/sglang-101/capture/gpu/out-gb10/determinism.txt
  - manuals/sglang-101/capture/gpu/out-gb10/deterministic-determinism.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-deterministic.log
  - manuals/sglang-101/capture/gpu/out-l4/livecheck-2026-10-23.txt
  - manuals/vllm-101/capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt
  - manuals/vllm-101/capture/gpu/out-l4/batch-invariant-cost.txt
  - manuals/vllm-101/capture/gpu/out-l4/livecheck-2026-10-22.txt
---


## Situation

一个评测团队在温度为 0 下针对团队的服务端点运行两次基准测试，prompt 列表相同，顺序也相同。两次得分相差约一分。他们挑出一个回答改变了的问题，单独发送两次，两次得到的文本完全相同。随后，针对一台运行带 MoE 层模型的 GB10 服务器，他们把这个问题单独发送五次，并在大小为 16 的批次中发送五次。五个单请求中的第一个给出一种文本；接下来的四个给出另一种文本，在数百个字符后偏离第一种文本；而批次中的所有五个请求又给出了第一种文本。

工单称权重或分词器一定损坏了，因为根据定义，温度为 0 是确定性的。

## Evidence

- [默认 GB10 服务器上探测的摘要](evidence/probe-summary-default.txt)
- [L4 上的同一探测：默认服务器与带确定性参数的对比](evidence/probe-on-the-l4.txt)
- [带确定性参数的 GB10 服务器的三行启动日志](evidence/what-the-flag-switched.txt)
- [GB10 上带确定性参数的探测摘要](evidence/probe-summary-deterministic.txt)
- [在两款引擎上，随缓存状态和批次变化的贪心输出数量](evidence/cache-and-batch.txt)
- [在 BF16 与 FP16 之间变化的贪心输出数量](evidence/dtype.txt)
- [vLLM 上批不变模式的速度代价（锁定时钟）](evidence/batch-invariant-cost.txt)

## Questions

1. 温度 0 取 logit 最高的 token。请求中没有任何改变时，服务引擎上的什么原因会让同一个 prompt 在两次请求之间的 logits 改变？
2. 在 GB10 探测中，五个单请求中的第一个与后四个不同，而批次请求与第一个匹配。用同一个机制解释这两个事实。
3. 在 L4 上，默认服务器给出了三种文本：A、B、B、B、B，然后是 C、B、B、B、B。批次引入了什么？
4. 确定性参数让所有十个请求都匹配了。列出它切换了什么，以及每次切换的代价。
5. 数量表分开了三个原因。哪一个靠重置缓存修复，哪一个需要批不变内核，哪一个既不是 bug 也无法靠参数修复？
6. 写出必须严格精确复现的评测规范，并说明你为此放弃了什么。

## Walkthrough

浮点加法不满足结合律。矩阵乘法、softmax 或 norm 会把求和拆成 tile，许多内核根据批大小以及 prompt 所走的路径来选择拆分方式。最后一位的差异就能改变哪个 token 具有最高的 logit，而在一个不同的 token 之后，后续每个 token 都以不同的文本为条件。所以请求没有改变，处理请求的计算过程改变了。

第一份摘要包含三项计数。五个单请求给出了两种不同的文本，五个批次中的请求给出了一种，而且所有五个批次文本都与第一个单请求匹配。手册给出的解释是：第一个请求从头计算其 prompt，后四个在 radix 缓存中找到了 prompt 并运行了不同的 prefill 路径。这两种文本共享的 238 个字符，是第一个比特翻转之前的 token。L4 探测加入了批次。在默认服务器上，规律是 A、B、B、B、B、C、B、B、B、B：第一个单请求与后四个不同，一个批次请求落在了第三种文本上。批次再次改变了 tile 的拆分。

第三份记录展示了该参数在 GB10 启动时做了什么。采样后端换成了 PyTorch 采样器。在未给出注意力后端的情况下，服务器回退到 FlashInfer，并列出了该模式接受的六个后端。radix 缓存关闭了，因为在该版本中，确定性模式下的 FlashInfer 与缓存不兼容。在 L4 上，同一个参数回退到 `fa3`，保持 radix 缓存开启。第四份摘要是 GB10 上的结果：单请求只有一种文本，批次中只有一种，五个批次全部与单请求匹配。GB10 上的代价是并发 8 时损失了 18% 的吞吐量（从每秒 78.92 降到 64.83 个 token），每 token 时间中位数从 97.30 升到 117.43 ms，每个重复前缀都要重新计算。

第五份记录在单用户下区分了原因。两款引擎在清空缓存后重复运行，32 个输出中有 0 个改变；在关闭缓存后重复运行，同样为 0。针对热缓存的相同 prompt 在一款引擎上改变了 32 个输出中的 21 个，在另一款上改变了 11 个。一次发送 64 个请求时，关闭缓存的两次运行仍有 27/64 和 50/64 的输出不同，因此仅批次就改变了大多数输出，在该负载下无法分离缓存效应。dtype 记录是第三个原因：对小模型而言，BF16 与 FP16 相比，改变了 64 个输出中的 51 个和 48 个，而在相同 dtype 下重复运行则完全没有改变。最后一份记录是另一款引擎修复的代价。在锁定时钟下，批不变模式使小模型单用户的每 token 时间变为 2.4 倍，8B 模型 8 用户下变为 1.4 倍，输出分别减少 58% 和 27%。在该引擎上，开启该模式后，单请求与大小为 32 的批次产生的文本完全相同，关闭时则不同。

## Resolution

权重和分词器没有问题。清空缓存后重复运行对每个 prompt 给出了完全相同的文本。三个原因改变了得分：前缀缓存（为热 prompt 运行了不同的 prefill 路径）、每个请求所在的批次，以及两个端点之间团队未保持固定的 dtype。

当评测必须精确复现时，在两次运行之间清空缓存或重启服务器，保持 dtype、引擎版本和硬件相同，并且一次运行一个请求。这样不需要参数就能完全复现。在负载下，开启确定性模式或批不变模式并承担代价：GB10 上并发 8 时损失 18% 的吞吐量，另一款引擎上每 token 时间变为 1.4 到 2.4 倍。对每个采样的请求设置采样种子。逐 token 比较输出，不要只比得分，在依赖它之前，在你的模型、后端和并行布局上运行引擎的确定性测试。生产流量保持该模式关闭，生产环境中缓存和更快的内核比完全一致的比特更有价值。

## Wrong turns

- "权重或分词器损坏了。" 清空缓存后重复运行在两款引擎上 32 个输出中有 0 个改变，每个文本都完全匹配。损坏的权重不会因清空缓存而复原。
- "设置种子，问题就消失了。" 贪心解码不采样任何内容，而且引擎已经固定了种子。改变的是求和顺序，种子碰不到它。
- "在生产环境中开启确定性参数。" 它在并发 8 时损失了 18% 的吞吐量，并在默认后端上关闭了 radix 缓存。把这个代价留给评测和 rollout，不要留给用户。
- "得分相差在一分以内，所以两次运行是一致的。" 两次运行可以用不同的输出达到相同的得分，而下一次运行可能落在别处。要比较 token。
- "根据定义，温度 0 是确定性的。" 它选取最大的 logit，而 logits 会随缓存状态、批次和 dtype 改变。GB10 对同一个 prompt 给出了两种文本，请求中没有任何改变。

## Generalize

确定性是整个执行过程的属性，而不是采样规则的属性。批次、缓存状态、数据类型、内核或硬件的任何改变，都可能让 logit 改变一位，让文本改变一段。明确你要固定其中的哪些项，测量修复的代价，并在每次评测结果旁边写明缓存设置和缓存 token 数。

## Taught in

SGLang 手册在[确定性推理页](../../../manuals/sglang-101/sections/4-6-deterministic-inference-and-logprobs.md)运行了该探测并列出了开关，在[基准测试页](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)给出了清空路由，vLLM 手册在[可复现性页](../../../manuals/vllm-101/sections/3-8-get-reproducible-outputs.md)统计了三个原因并给出了自己修复的代价。
