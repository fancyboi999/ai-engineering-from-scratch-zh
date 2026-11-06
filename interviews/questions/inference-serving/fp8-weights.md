---
id: fp8-weights
title: FP8 checkpoint 什么时候划算
card: inference-serving
kind: tradeoff
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [design-review, ml-depth]
tags: [fp8, quantization, throughput, gsm8k, kv-pool]
minutes: 10
lessons: []
manuals: [vllm-101#s-fit-a-bigger-model-with-fp8-weights, sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你的 Qwen/Qwen3-8B 服务器用 BF16 能放进一张 L4，但 KV 池很小。模型发布方还提供了一个 FP8 checkpoint。FP8 checkpoint 什么时候划算？它对速度有什么影响？我们的 GSM8K 检查对它的代价怎么说？

## Short answer

FP8 权重用 1 个字节而不是 2 个字节存大部分参数，腾出的显存会被引擎分给 KV 池；在支持 FP8 运算的 GPU 上，它还会加快矩阵运算。在我们锁定频率、固定池大小的 L4 上，32 个用户时 FP8 checkpoint 每秒输出 284.7 个 token，BF16 是 208.8，多 36%，每个 token 的时间减少 30%。在 500 道 GSM8K 题上它得分 90.6%，BF16 是 91.8%，低 1.2 个百分点，两个区间重叠，所以这次运行没有显示出损失，也排除不了几个百分点的损失。

## Full answer

### 部署方式

像部署任何模型一样部署这个已发布的 checkpoint，`Qwen/Qwen3-8B-FP8`，不加任何参数。vLLM 会从 checkpoint 配置里读取量化方法。SGLang 也一样，如果 `--quantization` 参数与 checkpoint 不一致，除了少数已知兼容的组合外，启动时会报错。如果没有 FP8 checkpoint，vLLM 可以在加载 BF16 模型时做量化；手册没有测试这条路径。

### 弄清你的 GPU 实际在跑什么

L4 是 Ada GPU，SM 8.9，支持 FP8 运算，所以矩阵运算以 FP8 执行，因此既能腾出显存，也可能提升速度。Ada 之前的 GPU，比如 A100，不支持 FP8 运算。在那些卡上，vLLM 把权重保持为 FP8，运行 weight-only kernel：你仍然省下显存，但速度提升会更少。手册没有测试这类 GPU。

### L4 上的结果

会话锁定在 900 MHz，每组两个种子，两次运行的池都固定为 24,096 token：

| 用户数 | 中位 TPOT，BF16 / FP8 | 输出 tok/s，BF16 / FP8 | SM 中位频率，BF16 / FP8 |
|---|---|---|---|
| 32 | 119.9 / 83.8 ms | 208.8 / 284.7 | 881 / 900 MHz |
| 1 | 不比较 / 35.3 ms | 不比较 / 25.4 | 210 / 900 MHz |

32 个用户时，两个数字在不同种子下的范围都不重叠，BF16 的频率低约 2%，远小于差距本身。1 个用户时，BF16 那次因为 GPU 降频跌到 210 MHz，所以两者不做比较。

### 能腾出多少空间

速度测试固定了池大小，所以没有测到更大的池。空间上的收益来自字节数。同一张 L4 上的 SGLang 运行允许池增长，并同时换了权重和缓存：池从 BF16 的 24,094 token 增加到 FP8 权重加 FP8 cache 的 142,369 token，是原来的 5.91 倍；64 个用户时输出从每秒 250.85 个 token 增加到 735.91 个，因为 BF16 的池满了，FP8 的没有。1 个用户时 FP8 仍然更快，每个 token 39.66 ms 对 60.16 ms，因为 decode 每生成一个 token 都要读一遍所有权重，而 FP8 权重的字节数只有一半。

在 GB10 上，Qwen3-30B-A3B 的 FP8 组合也是如此：权重从 57.75 GB 降到 29.75 GB，加载时间从 323.61 秒降到 152.29 秒，池从 227,243 token 增加到 1,083,008 token，是原来的 4.77 倍，因为更小的权重腾出了显存，每个 token 也只占一半字节。在每个并发数下，吞吐量都是原来的 1.73 到 1.88 倍，因为那台机器上的 decode 要从带宽一般的内存里读权重。

### 准确率检查

2026-10-23 在 L4 上跑前 500 道 GSM8K 题，8-shot，贪心解码：

| 引擎 | 配置 | 答对 | 准确率 | Wilson 95% 区间 |
|---|---|---|---|---|
| vLLM | BF16 | 459/500 | 91.8% | 89.1 至 93.9 |
| vLLM | FP8 权重 | 453/500 | 90.6% | 87.7 至 92.9 |
| vLLM | FP8 权重 + FP8 KV | 453/500 | 90.6% | 87.7 至 92.9 |
| SGLang | BF16 | 458/500 | 91.6% | 88.8 至 93.7 |
| SGLang | FP8 权重 | 456/500 | 91.2% | 88.4 至 93.4 |
| SGLang | FP8 权重 + FP8 KV | 460/500 | 92.0% | 89.3 至 94.1 |

所有区间都重叠。这次运行没有显示出差异，只有 500 道题，也排除不了几个百分点的损失。这只是一个模型、一个基准。上生产之前，用你自己的 prompt 在两个 checkpoint 上都跑一遍。

### 什么时候不划算

- 池还有空间，GPU 也不支持 FP8 运算：收益很小，却要承担风险。
- 任务依赖很长的推理链：先做你自己的检查。
- 模型用 FP8 仍然放不下：4-bit checkpoint 把大部分权重存成约半个字节，在 24 GB 的卡上，这是部署 14B 模型的常见方式。4-bit 模型可能比 FP8 损失更多准确率，损失多少取决于模型和量化方法。

## Follow-ups

- **Level 3:** 速度测试固定了池大小。这隐藏了什么，又说明了什么？ Expected: 它隐藏了 FP8 腾出的更大的池，所以测试只说明速度的变化；空间上的收益来自字节数，允许池增长的那次 SGLang 运行在同时使用 FP8 cache 时从 24,094 token 增加到 142,369 token。
- **Level 3:** 为什么 1 个用户那一行不做比较？ Expected: BF16 那次因为 GPU 降频跌到 210 MHz，低于 900 MHz 的锁定值；锁频只能限制频率上限，挡不住降频，所以两次运行的频率不同。
- **Level 4:** 在 GB10 上，FP8 组合在每个负载下速度都接近翻倍，而一份只用 FP8 cache 的实际使用报告里，每个 token 反而稍慢。怎么解释这两者？ Expected: GB10 从带宽一般的内存里做 decode，权重字节减半带来了接近两倍的速度；只换 FP8 cache 不改变权重字节，还多了 scale 的计算，所以它赢在容量，不在每个 token 的速度。

## Wrong answers

- "FP8 总能加快 decode。" 只有在支持 FP8 运算的 GPU 上才会，比如 Ada、Hopper 和 Blackwell；在 A100 上，vLLM 把权重保持为 FP8 并运行 weight-only kernel，所以你省下了显存，速度提升会更少。
- "为了保险，加上 --quantization fp8。" vLLM 会从 checkpoint 配置里读取量化方法，而在 SGLang 中，与 checkpoint 不一致的参数会在启动时报错，所以对已发布的 checkpoint 不要加参数。
- "GSM8K 掉了 1.2 个百分点，说明 FP8 损失了准确率。" 两个区间重叠，所以这次运行没有显示出差异；它也排除不了几个百分点的损失，所以你要用自己的 prompt 在两个 checkpoint 上都跑一遍。
- "FP8 好，那 4-bit 就好两倍。" 4-bit 模型可能比 FP8 模型损失更多准确率，损失多少取决于模型和量化方法；在模型用 FP8 放不下时再用它，比如在 24 GB 的卡上跑 14B 模型，并且要做测试。

## Taught in

[用 FP8 权重装下更大的模型](../../../manuals/vllm-101/sections/2-5-fit-a-bigger-model-with-fp8-weights.md)和 [SGLang 量化一节](../../../manuals/sglang-101/sections/4-3-quantization.md)给出了 L4 和 GB10 上的运行结果以及 GSM8K 表。
