# sglang serve 与三个进程

> SGLang 将服务器拆为分词、调度与反分词三个进程，因为 Python 的文本工作不能拖慢向 GPU 提交任务的循环。

启动服务器，发一个请求，一切正常。接入真实流量后，用户排队，GPU 利用率却只有 40%。很多人先怪内核。LinkedIn 做了实际调查，慢的是分词器、进程间消息、Python 垃圾回收和 GIL {{field LinkedIn 2026-02}}。

读完本节，你能用 `sglang serve` 启动 SGLang，说出它启动的三个进程，并从启动日志读出决定后续行为的数字。

## 成本：一个 Python 线程做不完所有事

语言模型服务器做两类工作。GPU 工作是前向传播，每几毫秒执行一次 prefill 或 decode。CPU 工作是周边的一切：解析 HTTP、应用聊天模板、分词、把 token ID 还原为文本，以及检查停止字符串。

最直观的设计是全放在一个 Python 进程中，但负载一高就失败。GIL 下同一时间只有一个 Python 线程运行。3,000-token prompt 分词时占着解释器，而下一步 GPU 任务也需要它来启动。每一毫秒文本处理都变成 GPU 空等的一毫秒。

LinkedIn 在 H100 和小型排序模型上测过：每秒 500 次查询时，仅批量分词就把 P99 从 4,583 ms 降至 464 ms {{field LinkedIn 2026-02}}。模型没变，变的只是模型周围的 CPU 路径。

## SGLang 启动什么

**TokenizerManager：** 主进程中的对象，接收每个请求、应用聊天模板、分词并等待答案。HTTP 服务与 TokenizerManager 共用一个进程和一个 asyncio 循环。

**Scheduler：** 拥有 GPU 的独立进程，决定下一批 token、组建批次、执行前向传播并采样。张量并行时，每张 GPU 都有一个 scheduler 进程。

**DetokenizerManager：** 第三个进程，将输出 token ID 逐小段转为文本，再送回 TokenizerManager。

进程通过 ZMQ socket 通信。TokenizerManager 向 scheduler 发送 `TokenizedGenerateReqInput`，scheduler 向 detokenizer 发送 `BatchTokenIDOutput`，detokenizer 返回 `BatchStrOutput`。v0.5.22 默认用 pickle 序列化消息，因为 `SGLANG_USE_PICKLE_IPC` 为 true {{code}}。

```figure
id: fig-2-1
kind: flow
title: 一个 SGLang 服务的三个进程
claim: 请求通过 ZMQ 经过三个进程，只有 scheduler 接触模型，文本工作因此不会占用启动 GPU 步骤的线程。
caption: 按编号读箭头。蓝框是 SGLang 进程，橄榄色框为客户端。PID 5782、5909 来自 capture/out/server-default.log。
```

张量并行时，只有 scheduler 的 rank 0 打开 ZMQ socket。它向其他 rank 广播请求，让所有 GPU 组建相同批次 {{code}}。任何 rank 都不能自行决定。

## 上游运行的命令

上游在 Apple silicon Mac 上使用 MLX 后端和 4-bit Qwen3 0.6B 模型。v0.5.22 推荐 `sglang serve`。旧命令 `python -m sglang.launch_server` 仍可用，但警告会指出推荐入口是 `sglang serve` {{code}}。

```listing
title: 所有默认捕获的服务命令
source: capture/out/server-default.command.txt
lang: text
---
SGLANG_USE_MLX=1 sglang serve --model-path mlx-community/Qwen3-0.6B-4bit --disable-cuda-graph --host 127.0.0.1 --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.4
```

两个参数不是默认值，且都有意设置。`--enable-cache-report` 在每个 OpenAI 风格响应中添加缓存 token 数，[第 2.5 节](#s-streaming-stop-strings-and-the-openai-api)会展示。`--mem-fraction-static 0.4` 限制 KV 池，[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)解释不加它时上游遇到的崩溃。

日志对另一个参数提出异议。SGLang 文档的 Apple silicon 页面要求传 `--disable-cuda-graph`，但日志第二行说该参数“已弃用，将在未来版本移除”，替代项是 `--cuda-graph-backend-{decode,prefill}=disabled`。

文档与代码冲突，以代码为准。该参数在 v0.5.22 仍可用，但应在后续版本移除前替换。

## 先读启动日志

启动日志说明 SGLang 替你作了哪些决定。多数数字不是你设的参数，而是 SGLang 根据内存、模型和硬件计算的值。

```listing
title: SGLang 启动计算的限制
source: capture/out/server-default.log
lang: text
note: 摘自启动部分；各次捕获均有同类行，但内存数字不同。
---
[2026-10-16 13:58:05] max_total_num_tokens=181574, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=4096, context_len=40960, available_gpu_mem=47.96 GB
…
[2026-10-16 13:58:06] Using the Python TreeCore: the Rust TreeCore supports Linux only
[2026-10-16 13:58:06] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
[2026-10-16 13:58:06] Engine startup timings (s): load_weight=0.00, kv_cache_allocation=0.00, scheduler_e2e=7.01, cuda_graph={prefill=0.00, decode=0.00, target_verify=0.00, draft_prefill=0.00, draft_decode=0.00, draft_extend=0.00}, tokenizer_e2e=11.92
```

逐字段阅读首行：

- `max_total_num_tokens=181574` 是以 token 计的 KV 池容量，[第 3 部分](#s-kv-bytes-per-token-and-the-kv-pool)解释来源。
- `chunked_prefill_size=4096` 是单步处理的最大 prompt 片段，更长的 prompt 分段处理。
- `max_running_requests=4096` 是可同时 decode 的请求数。它是计算值，不保证延迟良好。
- `context_len=40960` 是模型接收的最长序列。

Tree cache 行同样重要。从 v0.5.21 起，Linux 上的基数树默认由 Rust 实现。上游 Mac 上使用 Python，日志明确指出。

## 预热与垃圾回收器

宣告就绪前，服务器先给自己发送一个请求，再调用自己的 `/freeze_gc` 端点。

```listing
title: 预热请求与冻结垃圾回收器
source: capture/out/server-default.log
lang: text
---
[2026-10-16 13:58:08] Prefill batch, #new-seq: 1, #new-token: 6, #cached-token: 0, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 3.85
[2026-10-16 13:58:08] INFO:     127.0.0.1:63781 - "POST /generate HTTP/1.1" 200 OK
[2026-10-16 13:58:08] INFO:     127.0.0.1:63785 - "POST /freeze_gc HTTP/1.1" 200 OK
[2026-10-16 13:58:08] The server is fired up and ready to roll!
```

`/freeze_gc` 有它的历史。LinkedIn 观察到每隔几秒发生 100至300 ms 的垃圾回收停顿，用预热加 `gc.freeze()` 修复 {{field LinkedIn 2026-02}}。v0.5.22 会在预热后自动做同样的事，scheduler 与 detokenizer 也包括在内 {{code}}。

## 关闭日志中的进程

服务停止时，最能看清进程拆分。上游捕获工具通过 SIGTERM 停止每个服务器。

```listing
title: 主进程视角的关闭过程
source: capture/out/server-default.log
lang: text
---
[2026-10-16 14:01:45] SIGTERM received. signum=None frame=None. Draining requests and shutting down...
[2026-10-16 14:01:45] Subprocess scheduler_0 (pid=5909) crashed with exit code -15. Triggering SIGQUIT for cleanup...
```

主进程 PID 为 5782，scheduler 为 5909。退出码 -15 就是工具自己发送的 SIGTERM，因此 “crashed” 一词有误导性。应学会读退出码：真实 scheduler 崩溃也输出相同结构，只是退出码不同，见[第 2.4 节](#s-the-overlap-scheduler)。

## 本手册的建议

把 CPU 路径视作模型服务器的一部分。TTFT 高但 GPU 不忙时，先看 tokenizer 进程，再看内核。SGLang 可为两端增加 worker：`--tokenizer-worker-num` 和 `--detokenizer-worker-num`，默认均为 1 {{code}}。

不要每次实验都盲用启动日志报告的默认值。记下计算出的限制，再决定哪些需要自己设定。[第 7.1 节](#s-operating-sglang)给出顺序。

```takeaways
- 用 sglang serve 启动，保留启动日志。
- 将日志计算的限制记入笔记。
- GPU 空闲而延迟高时，先检查 tokenizer 进程。
- 先读关闭日志退出码，再判断是否崩溃。
```

Sources: python/sglang/srt/entrypoints/engine.py (Engine docstring and process launch), python/sglang/srt/managers/io_struct.py, python/sglang/srt/environ.py (SGLANG_USE_PICKLE_IPC), python/sglang/srt/managers/scheduler_components/request_receiver.py, python/sglang/launch_server.py, python/sglang/srt/entrypoints/http_server.py (warm-up and /freeze_gc), python/sglang/srt/arg_groups/fields/serving.py at v0.5.22; docs/docs/hardware-platforms/apple_metal.mdx at v0.5.22; capture/out/server-default.command.txt and capture/out/server-default.log; LinkedIn Engineering, "Scaling LLM-based ranking systems with SGLang at LinkedIn", 2026-02-20, https://www.linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin.
