# 降低长会话的成本

> 只要缓存仍保存着旧轮次，这些轮次就不需要重新计算；GPU 缓存池不足时，可以将它们卸载。

随着对话变长，响应速度会变慢。读完本节，你可以继续使用缓存中的历史轮次，避免每次都重新 prefill。

## 长会话为何变慢 {#s-keep-long-sessions-cheap-why-a-long-session-slows-down}

每轮 chat 请求都会重新发送完整对话。如果没有缓存，服务器会在每个请求中重新计算之前的轮次，所以首 token 延迟会随对话轮次增加。

只要之前的轮次仍在缓存中，前缀缓存就能消除这部分重复计算。第 10 轮与第 9 轮拥有相同的开头，因此第 9 轮对应的 block 会命中缓存。服务器只需计算新的用户消息和答案。

运行中的请求需要内存时，缓存中的 block 就可能被移除。繁忙服务器上的用户暂停一分钟后再继续对话，缓存可能已经不在。此时服务器会重新计算整个对话。

## 保持各轮提示词一致 {#s-keep-long-sessions-cheap-keep-the-prompt-stable-across-turns}

缓存命中要求 token 内容和顺序都相同：

- 每轮都原样发送之前的消息。不要在轮次之间裁剪、总结或重新格式化。
- 整个会话期间保持 system prompt 和工具列表一致。
- 必须缩短对话时，应删除中间的完整轮次，不要从开头裁剪。提示词开头一旦改变，之后的 block 都无法命中。

## 将 block 卸载到主机内存 {#s-keep-long-sessions-cheap-offload-blocks-to-host-memory}

GPU 缓存池不足以保留空闲会话时，vLLM 可以在丢弃 block 前将它们复制到 CPU 内存。后续请求会从 CPU 内存重新加载，这比重新 prefill 长上下文更快。

启用原生卸载只需设置一个参数，指定要使用的 CPU 内存 GiB 数：

```bash
vllm serve Qwen/Qwen3-8B --kv-offloading-size 32
```

`--kv-offloading-backend` 用于选择实现方式。默认的 `native` 使用 vLLM 自带代码；`lmcache` 使用 LMCache 库，还需要单独运行 LMCache server。卸载会用 CPU 内存和 PCIe 传输时间来换取计算量。

我们没有在自己的硬件上测量此功能，也没有比较从 CPU 内存重新加载与在 L4 或 GB10 上重新 prefill 的耗时。

## 在多台服务器间共享缓存 {#s-keep-long-sessions-cheap-use-a-shared-cache-across-servers}

多台服务器由 router 分配请求时，用户的下一轮可能发到没有处理过之前轮次的服务器。可以用两种方式处理。session affinity 让 router 将同一会话发送到相同服务器，从而继续使用该服务器上的缓存。也可以通过 LMCache 或 Mooncake 等 KV connector 使用共享 KV store，让任意服务器都能加载这些 block。[KV connector](#s-how-kv-connectors-move-the-cache)一节会介绍第二种方式。

## 检查会话缓存 {#s-keep-long-sessions-cheap-check-the-session-cache}

先发送第 1 轮对话，再发送以第 1 轮开头的第 2 轮。分别在发送前后查看前缀缓存计数器：

```bash
curl -s localhost:8000/metrics | grep -E "^vllm:(external_)?prefix_cache_(queries|hits)_total"
```

第 2 轮期间，`vllm:prefix_cache_hits_total` 大约会增加第 1 轮的 token 长度，数值向下取整到完整的 16-token block。我们在 L4 上用 Qwen3-0.6B 验证过。第 1 轮有 2,182 个提示词 token。第 2 轮时，计数器增加了 2,176，即 136 个完整 block。启用卸载后，启动日志会显示 connector 名称；原生 backend 使用 `OffloadingConnector`。从 CPU 内存恢复的 block 会计入 `vllm:external_prefix_cache_hits_total`。

```takeaways
- 只要历史轮次的 block 还在缓存中，前缀缓存就能跳过这些轮次的计算。
- 原样发送之前的轮次，不要改动对话开头。
- 空闲会话无法放进 GPU 缓存池时，可将 block 卸载到 CPU 内存。
```

来源：vLLM 0.31.0 源码（vllm/config/cache.py、vllm/config/vllm.py、vllm/v1/kv_offload/base.py、vllm/v1/kv_offload/config.py、vllm/v1/kv_offload/factory.py、vllm/v1/metrics/loggers.py、vllm/distributed/kv_transfer/kv_connector/factory.py），vLLM 0.31.0 文档（docs/features/kv_offloading_usage.md、docs/design/prefix_caching.md），capture/gpu/out-l4/livecheck-2026-10-22.txt。
