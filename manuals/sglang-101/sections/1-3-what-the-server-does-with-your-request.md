# 服务器如何处理请求

> 每个请求都有成本不同的两个阶段；四项指标能说明服务如何为所有用户处理这两个阶段。

你在[第 1.1 节](#s-install-sglang-and-serve-your-first-model)发送了两个请求，两次都在一秒内返回。十个用户使用同一台服务时，有些用户却可能要等几秒才能看到第一个词。原因在于每个请求的两个阶段。

读完本节，你能说出请求的两个阶段和评估服务的四项指标，也能说明 SGLang 控制什么、哪些事由模型和你负责。

## 两个阶段，两类成本 {#s-what-the-server-does-with-your-request-two-phases-with-two-different-costs}

**Prefill：** 对整个 prompt 做前向传播，在一个批次中计算每个 prompt token 的 key 和 value，并生成首个输出 token。**Decode：** 逐个生成后续 token 的循环；每个请求的每个 token 都要做一次前向传播。

两个阶段使用 GPU 的方式不同。Prefill 每次处理很多 token，让算术单元保持忙碌。Decode 每次每个请求只有一个新 token。

每一步 decode 都读取这一步所需的权重，以及缓存的 key 和 value，却只做少量计算。稠密模型需要读取全部权重。混合专家模型需要读取共享权重和路由器选中的专家权重。Decode 速度受内存带宽限制，prefill 速度受计算能力限制。

上游在 Mac 上用 0.6B 模型测量了这一差异。512-token prompt 的首 token 延迟中位数为 163 ms。之后每个新 token 平均耗时 4.38 ms。

```listing
title: 单请求，输入 512 token、输出 128 token
source: capture/out/bench-random-c1.txt
lang: text
note: 摘自基准汇总。省略中位数以外的延迟分位数，以及 token 间隔部分。
---
Max request concurrency:                 1         
Successful requests:                     16        
…
Median TTFT (ms):                        162.98    
…
Mean TPOT (ms):                          4.38      
```

每个 prompt token 最多约耗时 0.32 ms，而每个输出 token 耗时 4.38 ms，在这台 Mac 上相差约 14 倍。0.32 ms 是上限，因为 TTFT 还包括排队和首个 decode 步骤。在记录中的 L4 上，Qwen3-8B 的差距约为 160 倍：512-token prompt 用时 189 ms，而每个输出 token 用时 60 ms。服务引擎可以共享或跳过 prefill 工作。对于 decode，它主要通过批处理，让一次权重读取服务多个请求。[第 4.4 节](#s-speculative-decoding)展示减少 decode 步数的另一种方法。

```figure
id: fig-1-1
kind: comparison
title: 捕获 Mac 上的 prefill 与 decode
claim: TTFT 中位数除以 prompt 长度约为每个输入 token 0.32 ms，而 decode 每个输出 token 需要 4.38 ms。
caption: 从左向右读。两列来自同一次单请求基准运行。来源：capture/out/bench-random-c1.txt。
```

## 四项指标 {#s-what-the-server-does-with-your-request-the-four-numbers}

用四项指标共同评估服务。只给出其中一项的报告说明不了多少。

- **首 token 时间（TTFT）：** 用户看到第一个词前的等待时间，由 prefill 和队列决定。
- **每输出 token 时间（TPOT）：** 首 token 之后的平均 token 间隔。**Token 间延迟（ITL）**逐个测量相同的间隔，因此尾部能显示停顿。两者由 decode 决定。
- **吞吐量：** 所有用户每秒获得的输出 token 数，由批处理决定。
- **Goodput：** 同时满足 TTFT 目标和 TPOT 目标的每秒请求数。这是用户实际感受到的指标。

前三者相互制约。更大批次提高吞吐量，却降低每个用户收到 token 的速度。大 prefill 块让长 prompt 更早完成，但它运行时会阻塞同批所有 decode。[第 5.1 节](#s-sglang-benchmark-serving)展示实际扫描中的权衡。

SGLang 基准工具输出 TTFT、TPOT、ITL 和吞吐量。0.5.22 版本不输出 goodput，因此要从逐请求记录计算。[推理指标课](phases/17-infrastructure-and-production/08-inference-metrics-goodput)实现了这项计算。

## SGLang 的职责边界 {#s-what-the-server-does-with-your-request-what-sglang-owns-and-what-it-does-not}

SGLang 控制从请求到输出 token 之间的时间。它决定计算哪些 prompt token、复用哪些 token，以及每个请求何时运行。

```figure
id: fig-1-2
kind: layers
title: SGLang 的职责
claim: SGLang 负责分词、调度、KV 缓存和前向传播，模型与运维者负责质量、内存和路由。
caption: 从客户端到权重，自上而下读。灰色层在 SGLang 外部。来源：v0.5.22 源码与 capture/out/server-default.log。
```

三件事仍在外部。模型决定答案内容。上游 Mac 上的 0.6B 模型被要求说出一个行星名，却回答了并非行星的 "Ardens"。SGLang 正确且快速地提供了这个答案，任何服务引擎都无法让模型自动答对。

你作为运维者，决定给 SGLang 多少内存，以及将请求发送到哪台机器。SGLang 为后一项工作提供独立路由器，[第 6.4 节](#s-sgl-model-gateway)会介绍它。

## 一个请求的路径 {#s-what-the-server-does-with-your-request-the-path-of-one-request}

在 SGLang 内部，你的 `/generate` 请求经过三个进程。Tokenizer manager 将文本转换为 token ID。Scheduler 在缓存中找到五个 prompt token 中的两个，计算其余三个。Detokenizer 将新的 token ID 转为文本。

调度器用一行日志记录了自己处理请求的情况：

```listing
title: L4 调度器视角的请求
source: capture/gpu/out-l4/server-default.log
lang: text
note: 第 1.1 节 /generate 请求的 prefill 行和响应行。
---
[2026-10-17 14:43:41] Prefill batch, #new-seq: 1, #new-token: 3, #cached-token: 2, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 2.82
[2026-10-17 14:43:41] INFO:     127.0.0.1:58314 - "POST /generate HTTP/1.1" 200 OK
```

`#new-token: 3` 与 `#cached-token: 2` 相加等于五个 prompt token。这组数字是 SGLang 输出中最有用的信息。[第 3.4 节](#s-prefix-friendly-prompts)仅用它们就能找到未命中缓存的 prompt。

```figure
id: fig-1-3
kind: sequence
title: 一个 /generate 请求经过三个进程
claim: Tokenizer manager、scheduler 和 detokenizer 各处理请求一次，prefill 计算了五个 token 中的三个。
caption: 自上而下读。数字来自第 1.1 节的 L4 请求。来源：capture/gpu/out-l4/generate.txt 与 capture/gpu/out-l4/server-default.log。
```

## 本手册的建议 {#s-what-the-server-does-with-your-request-our-position}

按流量形态选择 SGLang，不要按宣传数字选择。Agent、使用固定 system prompt 的聊天、带固定开场内容的检索，都共享长前缀。对这类流量，前缀缓存能为每个请求省去 prefill 工作。如果每个 prompt 都独特且很长，选定前先用自己的 prompt 测量两种引擎。

不要相信未注明版本的 SGLang 基准。网上反复传播的“SGLang 比 vLLM 快 29%”来自一次注明 SGLang v0.2.3 的离线测试 {{field AIMultiple 2026-01}}。[第 5.3 节](#s-reading-other-peoples-benchmarks)展示独立测试的共同结论，以及上游自己的直接对比运行。

要了解调度器、缓存和每次前向传播如何完成这些工作，请读第 2 至 4 部分。先从[第 2.1 节](#s-sglang-serve-and-the-three-processes)开始，跟踪请求经过三个进程的路径。

```takeaways
- 注明并发数，同时报告 TTFT、TPOT、吞吐量和 goodput。
- 预计 decode 每 token 的成本比 prefill 高数十至数百倍。
- 调试每个请求时，检查调度日志的 #new-token 与 #cached-token。
- Prompt 共享前缀时可选 SGLang，不共享时先测量。
```

来源： capture/out/bench-random-c1.txt, capture/out/generate.txt, capture/out/server-default.log, capture/gpu/out-l4/server-default.log; python/sglang/benchmark/serving.py 和 python/sglang/srt/entrypoints/http_server.py，v0.5.22; AIMultiple, "LLM Inference Engines" (https://aimultiple.com/inference-engines, 2026-01-25), capture/gpu/summary/l4.json (load.default)
