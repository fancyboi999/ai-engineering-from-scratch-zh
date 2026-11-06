---
id: fp8-grew-the-pool-twice
title: 为什么 FP8 让显存池扩容了 4.77 倍而非 2 倍
card: gpu-memory-quantization
kind: estimate
level: 3
roles: [inference-engineer]
rounds: [ml-depth, system-design]
tags: [fp8, kv-pool, gb10, weights, capacity]
minutes: 8
lessons: []
manuals: [sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

在 GB10 上，以 BF16 运行 Qwen/Qwen3-30B-A3B-Instruct-2507 的服务加载了 57.75 GB 权重，规划出 227,243 token 的 KV 显存池。在保持相同显存比例的前提下，改用 FP8 权重并添加 `--kv-cache-dtype fp8_e4m3`。估算新的显存池大小，并解释为什么它不仅仅是旧池的两倍。

## Short answer

两个效应叠加乘积。FP8 权重降至 29.75 GB，释放出 28.00 GB，被设置的显存比例分配给了显存池，因此显存池在日志单位中从 20.80 GB 增长到 49.58 GB；同时，对于 48 层且每层 4 个大小为 128 的 KV 头的模型，每个 token 占用的字节数从 98,304 减半至 49,152。显存池从 227,243 增至 1,083,008 token，达到原先的 4.77 倍，模型加载时间也从 323.61 秒降至 152.29 秒。

## Full answer

### 两次启动日志对比

BF16 服务在 323.61 秒内加载了权重，显存占用为 57.75 GB，分配了 227,243 token 的缓存，日志显示为 20.80 GB。FP8 服务记录了日志 `Detected fp8 checkpoint`，接着是 `Using FP8 KV cache but no scaling factors provided. Defaulting to scaling factors of 1.0`，在 152.29 秒内加载完成，占用 29.75 GB，并分配了 1,083,008 token，其中键占 24.79 GB，值占 24.79 GB。两者都使用了 `--mem-fraction-static 0.7`，且均未传入 `--quantization` 参数，因为 SGLang 会自动从模型权重元数据中读取量化方法。

### 算术推导

显存比例固定了分配给权重与显存池的总份额。更小的权重为显存池留下了该份额中的更多空间：权重释放了 28.00 GB，显存池增长了 28.78 GB。与此同时，采用 FP8 缓存使每个 token 占用的字节数减半。这两个因素相乘，使得 227,243 token 增长到了 1,083,008 token。GB10 拥有 121.7 GiB 显存，因此在闭环扫参中 BF16 显存池从未用尽；而在权重占据了卡上绝大部分显存的 L4 上，相同的改动使显存池从 24,094 token 暴增至 142,369 token，达到 5.91 倍。

### 推理速度也发生变化

| 并发度 | BF16 输出 tok/s | FP8 输出 tok/s | BF16 中位数 TPOT | FP8 中位数 TPOT |
|---|---|---|---|---|
| 1 | 29.14 | 51.50 | 32.52 ms | 18.41 ms |
| 8 | 74.11 | 137.00 | 102.21 ms | 54.96 ms |
| 32 | 150.66 | 283.19 | 201.91 ms | 104.12 ms |
| 64 | 235.38 | 440.86 | 254.06 ms | 131.78 ms |

在所有并发度下，FP8 都带来了 1.73 到 1.88 倍的吞吐提升。该机器上的 decode 阶段需要从带宽适中的显存中读取权重，因此权重字节减半几乎换来了两倍的速度。这与仅使用 FP8 cache 的现场报告不同，后者单 token 速度稍慢几个百分点，仅靠容量胜出。

### 缩放因子（scale）

第二行日志是一个警告。由于未提供缩放因子文件，所有 KV scale 均设为 1.0。该 FP8 权重的索引中仅列出了权重 scale，没有 KV scale，因此权重 scale 并不意味着带有缓存 scale。两个服务对同一个 greedy prompt 输出完全相同的 12 个 token，但这并不能替代准确率检查。在 L4 上针对 8B 模型的 500 道 GSM8K 题目测试中，每种 FP8 配置的置信区间均有重叠，这才是你在自己的模型上应当执行的检查形式。

## Follow-ups

- **Level 3:** 为什么显存池扩容了 4.77 倍而不是 2 倍？ Expected: 单 token 字节数减半使相同显存下的 token 数量翻倍，而权重变小又为显存池多让出了 28.78 GB 显存；这两个因素相乘放大了扩容倍数。
- **Level 3:** 为什么相同的改动在 L4 上扩容了 5.91 倍，而在 GB10 上是 4.77 倍？ Expected: 在 24 GB 显卡上权重占据了绝大部分显存，因此权重减半使显存池可用字节数增加了两倍以上；在 GB10 上权重所占比例较小，释放出的显存影响相对有限。
- **Level 4:** 两个服务在 temperature 为 0 下对首个请求给出了完全相同的 12 token 回答，这算通过准确率检查了吗？ Expected: 不算，单个 prompt 说明不了问题；应运行如 500 题 GSM8K 这类基准并对比置信区间，且需关注 scale 警告，因为该权重包含权重 scale 但缺少 KV scale，缓存是以 1.0 的 scale 运行的。

## Wrong answers

- "FP8 将字节减半，因此显存池翻倍。" 权重也从 57.75 GB 缩减到 29.75 GB，释放的显存划归了显存池，因此显存池在 GB10 上扩充了 4.77 倍，在 L4 上扩充了 5.91 倍。
- "FP8 权重含有 scale，因此 KV cache 也经过了校准。" 其权重索引中仅列出权重 scale，未包含 KV scale；服务已记录日志说明其 cache 使用了 1.0 的 scale。
- "必须传入 --quantization fp8 告知服务。" SGLang 会自行检测权重类型，传入与权重不匹配的参数反而会在启动时报错；对公开发布的量化权重无需传该参数。
- "速度提升来源于更大的显存池。" GB10 上的 BF16 显存池从未用尽；速度提升来自于带宽有限的显存上 decode 步权重读取字节减半，在各并发下均达到 1.73 到 1.88 倍。

## Taught in

[--quantization 与 --kv-cache-dtype](../../../manuals/sglang-101/sections/4-3-quantization.md)包含了两次启动日志和压测数据。
