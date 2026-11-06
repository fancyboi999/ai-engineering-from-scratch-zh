---
id: fp8-kv-cache
title: FP8 KV cache 能换来什么，又要付出什么
card: inference-serving
kind: tradeoff
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, design-review]
tags: [fp8, kv-cache, capacity, accuracy, attention-backend]
minutes: 10
lessons: []
manuals: [vllm-101#s-fit-more-users-with-an-fp8-kv-cache, sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

KV cache 满了，你的服务器开始让请求排队。有人建议加上 `--kv-cache-dtype fp8`。它能换来什么，可能付出什么代价？上生产之前，你怎么检查这两方面？

## Short answer

FP8 KV cache 用 1 个字节而不是 2 个字节存每个 key 和 value，所以同样的显存能装下两倍的 token：对 Qwen/Qwen3-8B，每个 token 从 144 KiB 降到 72 KiB，1 GiB 能装约 14,600 个 token，而不是约 7,300 个。它可能损失准确率，因为 FP8 每个张量需要一个 scale，没有 scale 的 checkpoint 会用 1.0 运行；它还可能换掉注意力后端，在我们的 L4 上，这导致了第一次启动失败。用你自己任务上的准确率测试和启动日志来检查：在 500 道 GSM8K 题上，我们的 FP8 KV 运行得分 90.8%，BF16 是 91.8%，两个区间重叠。

## Full answer

### 能换来什么

只有缓存变了，权重仍是 BF16。用 KV 公式，每个值按 1 个字节算。能装下的 token 翻倍，所以同样长度下能多装一倍用户，或者每个用户的上下文可以长一倍。

速度变化很小。在我们的 L4 上把池固定为 24,096 token，1 个用户时中位 TPOT 是 101.8 ms，BF16 是 104.1 ms，在相同的 210 MHz 频率下快 2.3%，不同种子的范围没有重叠。32 个用户时种子范围重叠，FP8 那次的频率也更高，所以手册不认为那里有提升。那次运行同时改了两样东西：缓存 dtype 和注意力后端。

一份实际使用报告展示了规模上的容量效应。用 BF16 cache 时，一个服务在 32 个并发请求下每秒产出 1,558 个 token，到 64 个时显存耗尽。换成 FP8 cache 后，它在 64 个并发时达到每秒 2,192 个 token，比 BF16 的最好结果高约 41%，而在两者都能运行的每个并发数下，它每个 token 都慢几个百分点。它赢在能装下两倍的请求：显存里能放的上下文从约 686,000 个 token 增加到约 137 万个。

### 要付出什么

FP8 每个张量需要一个 scale。没有 scale 文件时，所有 scale 都是 1.0。vLLM 会打出 `Using KV cache scaling factor 1.0`，SGLang 会打出 `Using FP8 KV cache but no scaling factors provided`。vLLM 团队把 scale 为 1.0 视为准确率上最坏的情况；在他们的测试中，大多数模型与 BF16 接近，但有一个跑在 latent attention 后端上的模型家族不是。

我们在 2026-10-23 于 L4 上做了自己的检查，跑前 500 道 GSM8K 题，8-shot，贪心解码。Qwen3-8B 没有 KV scale，所以 FP8 KV 运行用的 scale 是 1.0：

| 引擎 | 配置 | 答对 | 准确率 | Wilson 95% 区间 |
|---|---|---|---|---|
| vLLM | BF16 | 459/500 | 91.8% | 89.1 至 93.9 |
| vLLM | FP8 KV cache | 454/500 | 90.8% | 87.9 至 93.0 |
| SGLang | BF16 | 458/500 | 91.6% | 88.8 至 93.7 |
| SGLang | FP8 KV cache | 458/500 | 91.6% | 88.8 至 93.7 |

每个区间都与 BF16 的区间重叠，所以这次运行没有显示出差异。只有 500 道题，排除不了几个百分点的损失。这只是一个模型、一个基准。注意力结构不同的模型可能损失更多。

### L4 上的后端陷阱

FP8 在我们 L4 上的第一次启动失败了。vLLM 0.31.0 里的 FlashAttention 只在 Hopper 和 Blackwell 数据中心 GPU 上读 FP8 cache，而 L4 是 Ada GPU，SM 8.9。于是 vLLM 换到了 FlashInfer，它会在第一次启动时编译 kernel，而这次编译在我们的节点上失败了。解决办法是 `--attention-backend TRITON_ATTN`，它能读 FP8，也不需要编译；出于同样的原因，还要设置 `VLLM_USE_FLASHINFER_SAMPLER=0`。每次改缓存 dtype 之后，都看一下注意力后端那一行日志。

### 检查 scale 是否加载

1. 在 checkpoint 的权重索引里搜以 `k_scale` 或 `v_scale` 结尾的张量名。对有索引的 checkpoint，没有输出就是没有 scale。只有一个权重文件的 checkpoint 没有索引；这时用 `safetensors` Python 包列出张量名。
2. 在启动日志里找 scale 警告。如果 checkpoint 有 scale，警告仍然出现，说明加载器把它们丢了。在 0.31.0 中，有一个模型家族从不加载自己的 KV scale，这个 issue 还没关闭。
3. 上生产之前，用你自己的 prompt 分别在开和不开 FP8 时运行，比较回答。

Qwen3-30B-A3B 的 FP8 checkpoint 列出了权重 scale，但没有 KV scale，所以有权重 scale 不代表有 KV scale。

### 检查顺序

1. 池是不是瓶颈？看缓存使用率和队列。如果池还有空间，保持模型的 dtype。
2. 在 checkpoint 里搜 KV scale。
3. 启动服务器，看后端那一行和 scale 警告。
4. 在你自己的任务上做准确率检查。
5. 在相同频率下测速度，并预期每个 token 的速度变化不大。

## Follow-ups

- **Level 2:** 池还有空间，请求也不排队。你还会换吗？ Expected: 不会；缓存 dtype 是容量上的决定，池有空间时它什么也换不来，准确率和后端的风险却还在。
- **Level 3:** checkpoint 里有 k_scale 张量，scale 警告却还是出现了。这说明什么？ Expected: 加载器丢掉了这些 scale；在 0.31.0 中有一个模型家族从不加载 KV scale，这个 issue 还没关闭，所以在你换 checkpoint 或版本之前，服务器都用 1.0 运行。
- **Level 3:** 为什么 FP8 第一次启动在 L4 上失败，在数据中心 GPU 上却不会？ Expected: 默认注意力后端只在 Hopper 和 Blackwell 数据中心 GPU 上读 FP8 cache，所以 vLLM 退到了一个首次启动时编译 kernel 的后端，而这次编译失败了；Triton 后端能读 FP8，并且跳过编译。
- **Level 4:** GSM8K 检查得到 91.8% 对 90.8%，两个区间重叠。你能得出什么结论？ Expected: 这次运行没有显示出差异，也排除不了几个百分点的损失；这只是一个模型、一个基准，所以要在你的模型和任务上做同样的检查，并预期注意力结构不同的模型损失更多。

## Wrong answers

- "FP8 KV 把显存减半，所以吞吐量翻倍。" 它翻倍的是能装下的 token；在那份实际使用报告里，两种缓存都能运行的每个负载下，它每个 token 都慢几个百分点，赢只是因为 BF16 cache 在 64 个请求时显存耗尽。
- "checkpoint 是 FP8 的，所以 KV scale 肯定在里面。" 权重 scale 和 KV scale 是不同的张量；Qwen3-30B-A3B 的 FP8 checkpoint 列出了权重 scale，却没有 k_scale 或 v_scale，所以它的缓存用 1.0 运行。
- "准确率是模型的属性，测一次就够了。" 损失取决于模型、注意力结构和任务；在同样的测试里，大多数模型与 BF16 接近，而一个需要校准 scale 的模型家族在 scale 为 1.0 时损失了准确率。
- "注意力后端和缓存 dtype 没关系。" 在 L4 上，改 dtype 让 vLLM 换了后端，启动随之失败；每次改缓存 dtype 之后都要看后端那一行。

## Taught in

[用 FP8 KV cache 装下更多用户](../../../manuals/vllm-101/sections/2-4-fit-more-users-with-an-fp8-kv-cache.md)和 [SGLang 量化一节](../../../manuals/sglang-101/sections/4-3-quantization.md)在两个引擎上测量了池大小、速度和 GSM8K 准确率。
