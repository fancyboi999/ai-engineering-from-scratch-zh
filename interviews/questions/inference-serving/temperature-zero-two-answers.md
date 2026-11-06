---
id: temperature-zero-two-answers
title: temperature 为 0 却给出了两种不同的回答
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [ml-depth, debugging]
tags: [determinism, batch-invariance, prefix-cache, greedy, seed]
minutes: 8
lessons: []
manuals: [vllm-101#s-get-reproducible-outputs, sglang-101#s-deterministic-inference-and-logprobs]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
你在服务引擎上以 temperature 为 0 对同一评测跑了两次，得分却不一致。你单独发送一个失败的 prompt，得到一种回答；把它放进繁忙的 batch 里发送，又得到另一种回答。请求本身没有任何变化。解释究竟是什么发生了改变，以及种子能解决什么、不能解决什么。

## Short answer

batch 改变了算术运算。浮点加法不满足结合律，kernel 会根据 batch 大小对求和切块，所以在大小为 3 的 batch 和大小为 30 的 batch 中，同一请求的数字加法顺序不同；最后一位比特的变化就能翻转最大 logit，之后的每个 token 就会沿着不同的文本展开。前缀缓存也是如此，因为复用缓存块的请求走的 prefill 路径不同，dtype 也是如此。种子只固定采样的随机抽取，所以光有种子是不够的：离线时在单进程中按相同顺序运行引擎；在线时使用批次无关（batch-invariant）模式并承担其速度代价。

## Full answer

### 改变同一请求的四个因素

- **batch。** 矩阵乘法、softmax 和 norm 会把求和切成瓦片，许多 kernel 根据 batch 大小选择切块方式。
- **调度。** 在多进程服务器中，请求到达的时机决定了它加入哪个 batch。
- **前缀缓存。** 复用缓存块的请求计算 prompt 的路径，与未命中缓存的请求不同。
- **dtype。** BF16 和 FP16 对每个数字的舍入不同，同一模型在两种精度下写出的文本也不同。

vLLM 的种子默认为 0 且无法取消，因为推测解码要求所有 worker 采样相同的 token。所以种子始终存在，但仅靠它本身并不够。

### 手册统计的结果

Qwen3-0.6B 的贪心输出，在一段约 170 token 的共享系统 prompt 之后接 32 个 ShareGPT 问题，输出 128 token，在两次运行之间逐 token 对比。括号中的数字是首个不同 token 的中位位置：

| 对比条件 | SGLang | vLLM |
|---|---|---|
| 清空缓存后重复对比全新运行 | 32 个中 0 个 | 32 个中 0 个 |
| 关缓存对比关缓存 | 32 个中 0 个 | 32 个中 0 个 |
| 全新运行对比热缓存 | 32 个中 21 个 (45) | 32 个中 11 个 (57) |
| 开缓存对比关缓存 | 32 个中 25 个 (26) | 32 个中 21 个 (48) |

在 1 个用户且缓存状态相同时，文本完全一致。热缓存导致 SGLang 上 32 个输出中的 21 个发生改变，vLLM 上改变了 11 个。在 64 个用户同时发送时，即使关闭缓存，两次运行依然不同：SGLang 上 64 个输出中有 27 个不同，vLLM 上有 50 个不同：仅 batch 本身就改变了大多数输出。1 个用户下 BF16 对比 FP16，在 0.6B 模型上分别改变了 vLLM 64 个输出中的 48 个和 SGLang 64 个中的 51 个；在 Qwen3-1.7B 上分别改变了 56 个和 57 个。

在 GB10 上的 SGLang 探测用一个 prompt 说明了问题。同一个 prompt 在 temperature 为 0 下单独发送 5 次、混在大小为 16 的 batch 中发送 5 次，默认服务器输出了两份不同的文本，它们在 238 个字符后分叉。单独发送的第一个请求从头计算了 prompt；后四个请求在 radix 缓存中找到了它。开启确定性模式后，全部 10 次请求输出了相同的文本。

### 怎么修复

| 场景 | 修复方案 | 代价 |
|---|---|---|
| 使用 `LLM` 类的离线评测 | `VLLM_ENABLE_V1_MULTIPROCESSING=0`，相同的种子，按相同顺序输入相同 prompt | 引擎在你的进程中运行，调度时序完全可复现 |
| 在线实时服务器 | `VLLM_BATCH_INVARIANT=1`，或 SGLang 上的 `--enable-deterministic-inference` | 每个请求都要走更慢的 kernel |
| 必须完全匹配的贪心评测 | 贪心采样加上述两项之一 | 同上 |

每种修复都需要相同的硬件、相同的引擎版本和相同的配置。在 SGLang 上，该参数用批次无关 kernel 替换矩阵、softmax、norm 和批处理乘法算子，强制使用普通采样器，固定张量并行下的 all-reduce 顺序，只接受部分注意力后端，关闭 radix 缓存（除非后端支持），并为每个未带 `sampling_seed` 的请求分配默认种子 42。

### 如何测试

将同一评测运行两次并逐 token 对比输出，而不仅仅对比分数。每次探测前清空前缀缓存或重启服务器。如果输出不同，挑出一个不同的 prompt 单独跑两次。如果单独跑时两次一致，且 batch 探测是在相同的缓存状态下启动的，差异就来自 batch。SGLang 自带一个测试，以随机 batch 大小发送同一 prompt 并统计不同的输出数量，支持单 prompt、共享前缀以及缓存对比非缓存 prefill 等模式。

## Follow-ups

- **Level 2:** 手册表格中的哪些对比每次都给出相同的文本？ Expected: 清空缓存后的重复运行对比全新运行，以及关闭缓存时的重复对比，两款引擎上都是 32 个中 0 个改变。
- **Level 3:** 模型和 prompt 完全相同，为什么热前缀缓存会改变贪心采样的回答？ Expected: 复用缓存块的请求计算 prompt 的路径与完整 prefill 不同，所以 logits 在最后几位上有差异，一个 token 改变就会改变后续文本；在 SGLang 上它改变了 32 个输出中的 21 个，在 vLLM 上改变了 11 个。
- **Level 4:** 在高负载下，两次关闭缓存的运行依然存在差异。这对修复方案说明了什么？ Expected: 仅 batch 本身就改变了大多数输出（vLLM 上 64 个中的 50 个），所以缓存重置只在 1 个用户时有用；在线服务器需要批次无关 kernel，手册并未在该负载下测试该模式。

## Wrong answers

- "temperature 为 0 能保证输出是确定性的。" 贪心只选最大 logit，而 batch 会改变 logit 的最后几位；GB10 服务器在请求未发生任何改变的情况下，对 temperature 为 0 的同一 prompt 给出了两种文本。
- "设置了种子输出就会一致。" 种子只固定随机抽取；vLLM 的种子默认为 0 且无法取消，输出依然会随 batch 和缓存发生变化。
- "每次运行前清空缓存就够了。" 1 个用户时确实够了（32 个中 0 个改变）；64 个用户时，两次关闭缓存的运行依然在 64 个输出中有 50 个不同，因为 batch 改变了求和顺序。
- "换成 FP16 就能得到精确结果。" BF16 和 FP16 舍入不同，同一模型在两种 dtype 下写出的文本也不同，0.6B 模型改变了 64 个中的 48 个；要在对比的各次运行之间保持同一种 dtype。

## Taught in

[获取可复现的输出](../../../manuals/vllm-101/sections/3-8-get-reproducible-outputs.md)和 [SGLang 确定性推理一节](../../../manuals/sglang-101/sections/4-6-deterministic-inference-and-logprobs.md)统计了发生变化的输出数量并列出了修复方案。
