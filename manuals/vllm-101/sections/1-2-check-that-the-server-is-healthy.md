# 检查服务是否健康

> 三个路由和一行日志，就能在一分钟内告诉你服务是否启动、加载了哪个模型，以及它能容纳多少请求。

服务启动后，你需要在接收真实流量前确认它能正常工作。读完本节，你可以检查健康路由、模型列表、指标和 KV cache 容量。

## 请求健康路由 {#s-check-that-the-server-is-healthy-ask-the-health-route}

运行以下命令：

```bash
curl -i http://localhost:8000/health
```

你会看到 `HTTP/1.1 200 OK` 和一个空响应体。服务器日志里也会出现这次请求。

```listing
title: 首次健康检查和模型列表，记录来自 DGX Spark
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 截取自启动日志末尾的三行。
---
INFO:     Application startup complete.
INFO:     127.0.0.1:35152 - "GET /health HTTP/1.1" 200 OK
INFO:     127.0.0.1:34616 - "GET /v1/models HTTP/1.1" 200 OK
```

engine 正常运行时，健康路由会返回 200。这个路由不会生成 token，所以返回 200 不能证明请求能够完成。还要像[首次请求](#s-install-vllm-and-serve-your-first-model)那样发送一个简短请求。

如果路由没有响应，服务器可能仍在加载，也可能已经停止。查看服务器日志末尾。大型模型可能需要几分钟才能加载。

## 检查模型名称 {#s-check-that-the-server-is-healthy-check-the-model-name}

运行以下命令：

```bash
curl http://localhost:8000/v1/models
```

响应会列出一个模型。它的 `id` 就是请求中必须使用的名称。`max_model_len` 是服务器接受的请求最长 token 数。

## 查看 KV cache 容量 {#s-check-that-the-server-is-healthy-read-the-kv-cache-size}

回到启动日志，找到以 `GPU KV cache size` 开头的行。在我们的 DGX Spark 上，这行内容如下：

```listing
title: KV cache 容量行，记录来自 DGX Spark
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 截取自启动日志的一行。
---
(EngineCore pid=143) INFO 10-21 10:59:46 [kv_cache_utils.py:2464] GPU KV cache size: 234,960 tokens, Maximum concurrency for 8,192 tokens per request: 28.68x
```

第一个数字是服务器能为所有用户共同保存的上下文 token 总数。第二个数字表示同时容纳完整最大长度请求的数量。请求越短，能容纳的用户就越多。

如果第一个数字远小于预期，可能是其他程序占用了 GPU 内存，也可能是内存比例设置过低。[内存估算](#s-count-the-memory-before-you-pick-a-gpu)会教你在启动前预测这个数字。

## 查看指标 {#s-check-that-the-server-is-healthy-read-the-metrics}

运行以下命令：

```bash
curl -s http://localhost:8000/metrics | grep -E "^vllm:(num_requests_running|num_requests_waiting|kv_cache_usage_perc)\{"
```

你会看到三行。没有流量时，正在运行和等待的请求数都是 0，KV cache 使用率也是 0。你可以在另一个终端发送请求，再运行一次命令，观察这些数字如何变化。

下面三个指标能回答大多数初步问题：

| 指标 | 含义 |
|---|---|
| `vllm:num_requests_running` | engine 当前正在处理的请求数 |
| `vllm:num_requests_waiting` | 因 batch 或 KV cache 已满而排队的请求数 |
| `vllm:kv_cache_usage_perc` | KV cache 的使用比例，范围为 0 到 1 |

当等待请求数大于 0，且 KV cache 使用率接近 1 时，cache 已满。[生产运行](#s-watch-vllm-in-production)一节会列出完整的告警指标。

```takeaways
- 用健康路由检查存活状态，再发一个简短请求检查服务是否就绪。
- 每次启动后都查看 KV cache 容量行。
- 优先观察等待请求数和 KV cache 使用率。
```

来源：vLLM 0.31.0 文档（docs/serving/online_serving/openai_compatible_server.md、docs/design/metrics.md），capture/gpu/out-gb10/server-load-vllm.log。
