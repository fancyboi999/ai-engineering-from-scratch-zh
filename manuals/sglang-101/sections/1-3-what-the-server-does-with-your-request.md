# 服务器如何处理请求

> 每个请求都分为两个阶段，代价不同；四项指标能说明服务器如何处理所有用户的流量。

刚安装好服务器并发送了两个请求，它们都在一秒内返回。但有十个用户时，同一台服务器可能让一些用户等几秒才能看到第一个字。原因在于每个请求都要经过两个阶段。

读完本节，你能说出请求的两个阶段、评估服务的四项指标，也能解释 SGLang 控制什么、哪些事由模型和你负责。

## 两个阶段，两类瓶颈

**Prefill：** 对完整 prompt 做前向传播，在一批矩阵乘法中计算每个 prompt token 的 key 和 value，并生成首个输出 token。**Decode：** 逐个生成后续 token 的循环；每个请求的每个 token 都需要一次前向传播。

两个阶段对 GPU 的压力不同。Prefill 每次处理很多 token，能让算术单元忙起来。Decode 每次每个请求只生成一个新 token。稠密模型的每一步都会读取全部权重和缓存的 key、value，却只做少量计算。MoE 模型只读共享权重和路由器选中的专家权重。Decode 速度受内存带宽限制，prefill 速度受计算限制。

上游在一台 Mac 上用 0.6B 模型测量了差异。512-token prompt 到首 token 的延迟中位数为 163 ms。之后每个新 token 平均耗时 4.38 ms。

```listing
title: 单请求，输入 512 token、输出 128 token
source: capture/out/bench-random-c1.txt
lang: text
note: 从基准汇总摘录。删去中位数以外的延迟分位数，以及 token 间隔部分。
---
Max request concurrency:                 1         
Successful requests:                     16        
…
Median TTFT (ms):                        162.98    
…
Mean TPOT (ms):                          4.38      
```

每个 prompt token 的时间上限约为 0.32 ms，而每个输出 token 需要 4.38 ms。在这台 Mac 上，二者相差约 14 倍。在我们的 L4 上，使用 Qwen3-8B 时差距约为 160 倍：512-token prompt 用时 189 ms，每个输出 token 用时 60 ms。服务引擎可以共享或跳过 prefill 的工作；decode 则主要靠批处理，让一次权重读取服务多个请求。

```figure
id: fig-1-1
kind: comparison
title: 捕获 Mac 上的 prefill 与 decode
claim: TTFT 除以 prompt 长度给出每个输入 token 耗时上限，decode 每个输出 token 需要 4.38 ms。
caption: 从左向右读。0.32 ms 是 TTFT 除以 prompt 长度的上限，其中还包括排队和首个 decode 步骤。两列均来自单请求基准。来源：capture/out/bench-random-c1.txt。
```

## 四个指标

服务器需要回答四个问题，只回答一个的报告没有意义。

- **首 token 时间（TTFT）：** 用户看到第一个词前等待多久，由 prefill 和排队决定。
- **每输出 token 时间（TPOT）：** 首 token 之后的平均 token 间隔。**Token 间延迟（ITL）**逐个测量同一间隔，因此尾部能显示停顿。两者由 decode 决定。
- **吞吐量：** 全部用户每秒获得的输出 token 数，由批处理决定。
- **Goodput：** 同时满足 TTFT 和 TPOT 目标的每秒请求数。这才是用户实际感受到的容量。

前三者相互制约。增大批次可提高吞吐量，但每个用户获得 token 的速度会降低。较大的 prefill 块让长 prompt 更快完成，却会在运行期间阻塞同批次所有 decode。[第 5.1 节](#s-sglang-benchmark-serving)展示真实扫描中的权衡：增加用户并未增加吞吐量，等待时间却涨到五倍。

SGLang 基准工具输出 TTFT、TPOT、ITL 和吞吐量。v0.5.22 不输出 goodput，需要自己从逐请求记录计算。[推理指标课](phases/17-infrastructure-and-production/08-inference-metrics-goodput)实现了这项计算。

## SGLang 的职责边界

SGLang 是围绕模型组织的三个进程和一个缓存。Tokenizer manager 将文本转为 token ID。Scheduler 决定每次前向传播运行哪些请求，维护 KV 缓存，并查找已计算过的 prompt 前缀。Detokenizer 将 token ID 转回文本并流式输出。[第 2.1 节](#s-sglang-serve-and-the-three-processes)跟踪请求经过这三个进程。

```figure
id: fig-1-2
kind: layers
title: SGLang 的职责
claim: SGLang 负责分词、调度、KV 缓存和前向传播，模型与运维者负责质量、内存和路由。
caption: 从客户端向权重自上而下读。灰色层在 SGLang 外部。来源：v0.5.22 源码与 capture/out/server-default.log。
```

三类工作仍在外部。模型决定答案内容。上游捕获记录中，0.6B 模型被要求说出一个行星名，却回答了并非行星的 “Ardens”。SGLang 正确且快速地提供了该答案，推理服务引擎无法让模型自动答对。

运维者决定给 SGLang 多少内存，以及将请求发送到哪台机器。SGLang 为后者提供独立路由器，即模型网关，详见[第 6.4 节](#s-sgl-model-gateway)。

## SGLang 的优势与劣势

每种引擎都会发布自己胜出的基准。阅读 SGLang 团队之外的报告后，可以看到与上述机制一致的规律。

**Prompt 重复时，SGLang 占优。** 一份实践报告在两张 H100 上运行 SGLang 0.5.6 和 8B 模型 {{field Rawlinson 2025-12}}。单用户时 TTFT 为 583 ms，vLLM 0.11 为 2,141 ms。[第 3.3 节](#s-radixcache)的基数缓存跳过了已经完成的 prefill。

**Prompt 各不相同时，稠密模型上两者接近。** 一份报告在单张 H100 上用 FP8 运行 SGLang 0.5.9 和 Llama 3.3 70B {{field Spheron 2026}}。50 用户时输出速度为 1,920 token/s，对方为 1,850。如今两种引擎使用相同的内核家族，对多数团队而言 4% 差距只是噪声。

**长 prompt 配合默认设置时，SGLang 的 TTFT 落后。** 一份单 H100、16K-token prompt 的报告在 60 用户时测得平均 TTFT 为 10.8 s，对方为 1.9 s {{field Jarvislabs 2026-05}}。同次运行中 SGLang 的 TPOT 最优，为 63至81 ms，对方为 97至120 ms。SGLang 将长 prompt 分块，让 decode 继续前进，代价是首 token 更晚到达。

**SGLang 是大型混合专家模型的参考引擎。** SemiAnalysis 将它选为 InferenceMAX 中 DeepSeek 模型的默认引擎 {{field SemiAnalysis 2025-10}}。首份经过审计、使用 SGLang 的 MLPerf 结果在 512 张 MI355X 上运行 DeepSeek-R1 {{field Crusoe 2026-09}}。[第 6 部分](#s-tp-size-dp-size-and-attn-dp-size)解释支撑它的并行机制。

## 本手册的建议

按流量形态选择 SGLang，不要按标题数字选。Agent、使用固定 system prompt 的聊天、带固定开场内容的检索，都共享很长的前缀。对这些流量，SGLang 缓存能让每个请求受益。若每个 prompt 都独特且很长，选定前先用自己的 prompt 测量两种引擎。

不要相信不写版本的 SGLang 基准。网上流传最多的“SGLang 比 vLLM 快 29%”来自一次离线测试，其页面将 SGLang v0.2.3 与 vLLM 0.11 并列 {{field AIMultiple 2026-01}}。至少另有五篇文章换个名字转抄该数字。[第 5.3 节](#s-reading-other-peoples-benchmarks)说明相信基准之前该如何审读。

```takeaways
- 注明并发，同时报告 TTFT、TPOT、吞吐量与 goodput。
- Prefill 每 token 通常不到一毫秒，decode 则需数毫秒。
- Prompt 共享前缀时可选 SGLang；不共享时先测量。
- 相信基准数字前先核对 SGLang 版本。
```

Sources: capture/out/bench-random-c1.txt, capture/out/generate.txt, capture/out/server-default.log; python/sglang/benchmark/serving.py and python/sglang/srt/entrypoints/http_server.py at v0.5.22; Rawlinson, "vLLM vs SGLang: Performance Benchmark on Dual H100 GPUs" (https://rawlinson.ca/articles/vllm-vs-sglang-performance-benchmark-h100, 2025-12-05); Spheron, "vLLM vs TensorRT-LLM vs SGLang" (https://www.spheron.network/blog/vllm-vs-tensorrt-llm-vs-sglang-benchmarks/); Jarvislabs, "SGLang vs vLLM: H100 Benchmarks" (https://jarvislabs.ai/blog/vllm-sglang-trtllm-comparison, 2026-05-18); SemiAnalysis, "InferenceMAX" (https://newsletter.semianalysis.com/p/inferencemax-open-source-inference, 2025-10-09); Crusoe, MLPerf Inference v6.1 (https://www.crusoe.ai/resources/blog/serving-5-75-million-tokens-per-second-crusoes-mlperf-inference-v6-1-results-on-amd-mi355x, 2026-09-16); AIMultiple, "LLM Inference Engines" (https://aimultiple.com/inference-engines, 2026-01-25).

## 一个请求经过哪些进程

我们向原生 API 发送一个五 token 的 prompt，要求温度为零并生成十二个 token。

```listing
title: 响应元数据
source: capture/out/generate.txt
lang: json
note: 摘自 /generate 响应，删去输出 ID、权重版本块、存储和时间戳字段。
---
"meta_info": {
  …
  "finish_reason": {
    "type": "length",
    "length": 12
  },
  "prompt_tokens": 5,
  …
  "queue_time": 0.0002437499351799488,
  …
  "completion_tokens": 12,
  "cached_tokens": 2,
  …
  "e2e_latency": 0.9496850408613682,
  …
  "first_token_latency": 0.8885334208607674,
  …
  "decode_throughput": 179.8807619469758,
```

逐字段阅读：队列等待 0.24 ms，因为没有其他请求。五个 prompt token 中两个已经缓存。这里的 “The capital of France is” 与预热 prompt “The capital city of France is” 共享前两个 token，基数缓存找到并跳过了它们。文本 “Paris, and the capital of Germany is Berlin. The capital” 在 12 token 时停止，因为请求要求 12 个；`finish_reason` 为 `length`。

调度器也从自身视角记录了同一请求。

```listing
title: 调度器视角的请求
source: capture/gpu/out-l4/server-default.log
lang: text
---
[2026-10-17 14:43:41] Prefill batch, #new-seq: 1, #new-token: 3, #cached-token: 2, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 2.82
[2026-10-17 14:43:41] INFO:     127.0.0.1:58314 - "POST /generate HTTP/1.1" 200 OK
```

`#new-token: 3` 加上 `#cached-token: 2`，恰好是五个 prompt token。这组数字是 SGLang 输出中最有用的信息。[第 3.4 节](#s-prefix-friendly-prompts)仅用它们就能发现 prompt 的问题。

```figure
id: fig-1-3
kind: sequence
title: 一个 /generate 请求经过三个进程
claim: Tokenizer manager、scheduler、detokenizer 各处理请求一次，prefill 只计算五个 token 中的三个。
caption: 自上而下读。数字来自本手册第 1.1 节中我们的 L4 请求。来源：capture/gpu/out-l4/generate.txt 与 capture/gpu/out-l4/server-default.log。
```

## 首 token 时间与你想的不同

首 token 耗时 889 ms，完整请求耗时 950 ms，意味着其后十一个 token 共耗时约 61 ms。在同一服务上，经过基准工具预热后，512-token prompt 的首 token 延迟中位数为 163 ms。Prompt 长了约 100 倍，启动却快了五倍。

889 ms 并非由 prompt 长度造成。新形状的首次请求要支付一次性成本。在 MLX 上，[第 3.4 节](#s-prefix-friendly-prompts)首次复用缓存前缀的请求也较慢。上游没有从日志找出精确原因。但对任何后端都适用的教训是：启动后第一个请求测量的是启动过程，应从性能测量中丢弃。

## 通过 OpenAI API 问同样的问题

多数客户端使用 OpenAI 聊天 API，SGLang 在同一端口提供它。上游关闭思考，让聊天端点用一个词说出一个行星名。

```listing
title: 聊天补全
source: capture/out/generate.txt
lang: json
note: 摘自 /v1/chat/completions 响应，删去 ID、时间戳与元数据块。
---
"message": {
  "role": "assistant",
  "content": "Ardens",
  "reasoning_content": null
},
"logprobs": null,
"finish_reason": "stop",
"matched_stop": 151645
…
"usage": {
  "prompt_tokens": 21,
  "total_tokens": 25,
  "completion_tokens": 4,
  "prompt_tokens_details": {
    "cached_tokens": 0
  },
```

七个词的问题变成 21 个 prompt token，因为聊天模板添加了角色标记。模板成本是真实的，计算上下文预算时必须计入。模型回答 “Ardens”，它不是行星。SGLang 完成了职责：运行运维者选定的模型，以四个 token 返回答案。

这里有 `cached_tokens`，只是因为启动时传入了 `--enable-cache-report`。没有该参数，即使调度器复用了数千 token，OpenAI 响应也完全不报告缓存 token。应开启它。它没有额外成本，也是客户端观察缓存的唯一方式。



Sources: capture/out/bench-random-c1.txt, capture/out/generate.txt, capture/out/server-default.log, capture/gpu/out-l4/server-default.log, capture/gpu/out-l4/generate.txt; python/sglang/benchmark/serving.py and python/sglang/srt/entrypoints/http_server.py at v0.5.22; AIMultiple, “LLM Inference Engines” (https://aimultiple.com/inference-engines, 2026-01-25).
