---
id: the-client-is-part-of-the-measurement
title: 同一台服务器，两个客户端测出两个数字
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [benchmark, client-bias, temperature, prompt-lengths, load-testing]
minutes: 8
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [vllm-101#s-benchmark-your-server-in-15-minutes, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
两位工程师在同一天对同一台服务器做基准测试，报告的数字却相差几个百分点。两人用的都是标准基准测试客户端。在查看服务器之前，客户端的哪些方面可以解释这种差距？你会为团队制定什么规则？

## Short answer

客户端本身就是测量的一部分。在同一台 vLLM 服务器上，SGLang 客户端测得的中位首 token 时间比 vLLM 客户端高出 3% 到 10%，输出吞吐量低 2% 到 8%；两个客户端发送了不同的随机 prompt；而在 1 个用户下，temperature 0.7 相比 temperature 0 把每 token 时间增加了 10% 到 13%。规则是：统一客户端、统一 temperature、统一 prompt 长度分布并注明范围比率、每次运行前清空缓存并换新种子、记录 GPU 频率，并将所有这些写在每个数字旁边。

## Full answer

### 同一台服务器上的三个客户端

手册让同一台 vLLM 服务器（部署 Qwen/Qwen3-0.6B）接受 SGLang 客户端、`vllm bench serve` 及其 Rust 版本的压测，每次运行前重置缓存，各客户端交替跑了两轮。64 个用户时的每秒输出 token 数：

| Temperature | SGLang 客户端 | vllm bench | vllm bench, Rust |
|---|---|---|---|
| 0 | 359, 348 | 379, 377 | 371, 365 |
| 0.7 | 331, 343 | 360, 363 | 356, 353 |

两个 vLLM 客户端在 1、16 和 64 个用户时的结果在噪声范围内一致。SGLang 客户端测出的服务器更慢：中位首 token 时间高出 3% 到 10%，在 16 和 64 个用户时输出吞吐量低 2% 到 8%。两个客户端从各自的 random 数据集发送不同的 prompt token，所以微小差距的一部分可能来自 prompt。在 1 个用户下，temperature 0.7 相比 0 把每 token 中位时间增加了 10% 到 13%，在 16 和 64 个用户下增加了 3% 到 6%。

### 改变结果的四个默认值

SGLang 客户端在测量任何东西之前就做出了选择：

| 设置 | 默认值 | 对结果的影响 |
|---|---|---|
| `--random-range-ratio` | 0.0 | 每个长度在 1 到所要求的长度之间抽取，所以平均 prompt 大约只有一半长 |
| `ignore_eos` | 开启 | 每个请求都生成正好达到所要求长度的输出 |
| `--request-rate` | inf | 所有请求都在时间 0 发出，仅受并发上限限制 |
| `--warmup-requests` | 1 | 计时开始前先跑一个请求 |

第一行是陷阱所在。在默认比率下，输入长度 512 得到的平均 prompt 接近 256 token，而报告上写的是 512。传入 1.0 或在结果旁边注明长度分布。比率为 1.0 时，32 个 512 token 的 prompt 在报告中的总输入 token 数为 16384。

### 固定长度会形成波浪

比率设为 1.0 时，每个请求长度相同，同时开始的请求会同时结束，后续请求也会成批涌入。在 L4 上 16 个用户时，固定长度测得中位首 token 时间为 1,996 ms，P99 ITL 为 82 ms；混合长度测得 291 ms 和 300 ms。两种设置会让同一服务器表现得截然不同。固定长度测的是突发流量，首 token 慢而 token 生成平顺。混合长度测的是稳定流量，首 token 快但流式输出有停顿。对比两个版本时保持 1.0，定延迟目标之前跑你的真实长度分布。

### 客户端自身的队列

SGLang 客户端从一个 Python 进程发送所有请求。2026 年的一项研究发现，这种客户端在高请求率下会增加自己的排队延迟，从而报告比服务器实际更高的首 token 时间和每 token 时间。在相信高到达率下的数字之前，把一个客户端进程与两个各发一半请求率的进程对比一下。课程也指出了通用压测工具的同类陷阱：客户端在解释器锁下分词会推高报告的 token 间隔延迟，而循环发送同一个 prompt 几乎每次都会命中前缀缓存并虚增吞吐量。

### 手写脚本

一份报告测得大模型在 8 张 GPU 上只有每秒 13 个 token，而托管 API 为 60 个。审查发现脚本按空格切分单词计数，并把首 token 时间算进了速率里。单词不是 token，TTFT 也不是 decode 时间。使用基准测试客户端，它会统计 token 并将 TTFT 和 TPOT 分开。

### 规则

1. 统一客户端和版本，并在每个结果中注明。
2. 统一 temperature，并在每个结果中注明。
3. `--random-range-ratio 1.0`，或写明长度分布。
4. 每次运行前清空缓存并更换种子，记录缓存命中的 token 数。
5. 记录 GPU 频率，剔除过热运行。
6. 汇报吞吐量时，必须附带同一并发上限下的中位和 P99 TTFT 与 TPOT。

## Follow-ups

- **Level 2:** 为什么默认的范围比率只描述了一半的工作量？ Expected: 每个长度在 1 到所要求的长度之间抽取，所以平均 prompt 只有所要求的一半左右；比率为 1.0 时每个 prompt 都是完整长度，报告中的总输入 token 数会证实这一点。
- **Level 3:** 固定长度给出了迟到的首 token 和平稳的流，混合长度恰好相反。你会用哪个？ Expected: 固定长度用于对比两个版本，因为它们完全可复现；在定延迟目标前用真实的长度分布，因为两种分布会让服务器呈现不同的性能特征。
- **Level 3:** 同事手写的计时循环测得每秒 13 个 token，而托管 API 测得 60 个。循环有什么问题？ Expected: 它按空格切分单词，并把首 token 时间算进了速率；单词不是 token，TTFT 不是 decode 时间，应该使用基准测试客户端。
- **Level 4:** 在每秒 16 个请求下，客户端报告了一个难以置信的首 token 时间。你怎么检查客户端本身？ Expected: 单进程客户端在高请求率下会增加自己的队列；运行两个各发一半请求率的客户端进程做对比，并记录客户端的 CPU 使用率。

## Wrong answers

- "两个都是标准客户端，所以数字具有可比性。" 在同一台服务器上，SGLang 客户端测得的首 token 时间高出 3% 到 10%，吞吐量低 2% 到 8%；几个百分点的差距可能完全来自客户端。
- "temperature 不会改变速度。" temperature 0.7 相比 0 在 1 个用户下把每 token 中位时间增加了 10% 到 13%，在 16 和 64 个用户下增加了 3% 到 6%。
- "把输入长度设为 512，prompt 就是 512 个 token。" 默认范围比率 0.0 下平均 prompt 大约是 256 个 token；传入 1.0 或注明分布。
- "能处理 HTTP 的压测工具就能处理模型流量。" 通用工具循环发送同一个 prompt，几乎每次都会命中前缀缓存，而且读不到流中的 token 间隔；使用能对 prompt 长度采样并统计 token 的客户端。

## Taught in

[15 分钟压测你的服务器](../../../manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md)和 [SGLang 基准测试一节](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)对比了客户端，[负载测试一课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)指出了两个客户端陷阱。
