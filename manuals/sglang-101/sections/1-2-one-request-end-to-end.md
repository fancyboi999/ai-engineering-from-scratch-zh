# 一个请求的完整路径

> 一个带五 token prompt 的 `POST /generate` 经过三个进程，复用两个缓存 token，在 950 ms 内返回十二个 token。

理解推理服务引擎最快的办法，是发送一个小请求，读完它为该请求写下的所有信息。很多人跳过这一步：启动服务器，看到“ready”就开始压测。到生产第一次遇到意外时，才发现那行日志从没读过。

读完本节，你能在笔记本启动 SGLang，通过两种 API 各发一个请求，并解释响应中的每项计时和 token 数。

## 启动服务器

上游通过 MLX 后端在 Apple silicon 运行 SGLang 0.5.22，使用 4-bit Qwen3-0.6B。本手册每次捕获都以这条命令为起点。

```listing
title: 服务器命令
source: capture/out/server-default.command.txt
lang: text
---
SGLANG_USE_MLX=1 sglang serve --model-path mlx-community/Qwen3-0.6B-4bit --disable-cuda-graph --host 127.0.0.1 --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.4
```

`sglang serve` 是 v0.5.22 推荐的入口。旧命令 `python -m sglang.launch_server` 仍可用，但会警告。Apple silicon 安装说明包含 `--disable-cuda-graph`，它在 Mac 上没有实际作用，服务器也提示它已弃用。`--mem-fraction-static 0.4` 是上游自行选择的值，[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)展示了促使其设置该值的崩溃。

首个请求前，服务器计算内存规模并建立缓存。每次启动都应读这四行。

```listing
title: 重要启动日志
source: capture/out/server-default.log
lang: text
note: 从启动日志摘录四行，删去之间的下载、导入与警告。
---
[2026-10-16 13:58:03] Auto-sized attention KV pool: sys_available=48.49 GB, mlx_limit=51.8 GB, mlx_used=0.31 GB, kv_budget=19.39 GB, bytes_per_slot=114688, pool_size=181574
…
[2026-10-16 13:58:05] max_total_num_tokens=181574, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=4096, context_len=40960, available_gpu_mem=47.96 GB
…
[2026-10-16 13:58:06] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
…
[2026-10-16 13:58:08] The server is fired up and ready to roll!
```

**KV 池：** 保存服务器保留的每个 token 的 key 和 value。这里可容纳 181,574 个 token，每个占 114,688 字节。[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)从模型形状推导该数字。**max_running_requests：** 调度器同时运行的最多请求数。服务器根据池容量算出 4096，没有人手工设置它。

最后一行在服务器向自己发送请求后输出。SGLang 向自己的 `/generate` 发送 “The capital city of France is”，随后调用 `/freeze_gc`。这会冻结全部三个进程的 Python 垃圾回收器，使启动时创建的对象不再被扫描。记住这个细节，本节末尾的实践报告会再次提到它。

## 请求

上游向原生 API 发送五 token 的 prompt，要求温度为零，生成十二个 token。

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
source: capture/out/server-default.log
lang: text
---
[2026-10-16 13:58:10] Prefill batch, #new-seq: 1, #new-token: 3, #cached-token: 2, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1.55
[2026-10-16 13:58:10] INFO:     127.0.0.1:63795 - "POST /generate HTTP/1.1" 200 OK
```

`#new-token: 3` 加上 `#cached-token: 2`，恰好是五个 prompt token。这组数字是 SGLang 输出中最有用的信息。[第 3.4 节](#s-prefix-friendly-prompts)仅用它们就能发现 prompt 的问题。

```figure
id: fig-1-3
kind: sequence
title: 一个 /generate 请求经过三个进程
claim: Tokenizer manager、scheduler、detokenizer 各处理请求一次，prefill 只计算五个 token 中的三个。
caption: 自上而下读。数字来自同一请求。来源：capture/out/generate.txt 与 capture/out/server-default.log。
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

## 本手册的建议

发送流量前先读启动日志，测量前先预热。启动行说明了服务器选择的池容量、请求上限与缓存类型。三者都是算出来的，[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)展示过计算结果导致服务崩溃的情形。

LinkedIn 的实践报告说明，请求路径值得与内核同样的关注 {{field LinkedIn 2026-02}}。其排序服务用 0.6B 模型处理 300-token 输入，每秒 100 次查询。发现的瓶颈是分词、进程间 ZMQ 消息、Python 垃圾回收、GIL 和调度器。跳过 decode 的评分路径将 P99 从 6,220 ms 降至 454 ms。垃圾回收每隔几秒造成 100至300 ms 停顿。他们通过预热后冻结回收器修复，合入 PR 9241。

这就是启动时看到的冻结操作。

```takeaways
- 每次启动都读 KV 池、max_running_requests 与 tree cache 行。
- 测量前发送预热请求。
- 启动加 --enable-cache-report，让客户端看见 cached_tokens。
- 调试请求时核对日志的 #new-token 和 #cached-token。
```

Sources: capture/out/server-default.command.txt, capture/out/server-default.log, capture/out/generate.txt, capture/out/bench-random-c1.txt; python/sglang/srt/entrypoints/http_server.py (_execute_server_warmup, _freeze_gc_after_server_warmup) and python/sglang/srt/hardware_backend/mlx/model_runner.py (_compute_pool_size) at v0.5.22; LinkedIn Engineering, "Scaling LLM-based ranking systems with SGLang at LinkedIn" (https://www.linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin, 2026-02-20); pull request 9241 (https://github.com/sgl-project/sglang/pull/9241).
