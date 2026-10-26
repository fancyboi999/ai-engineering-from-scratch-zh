# 让重复提示词命中前缀缓存

> 前缀缓存默认已启用，只有把共享内容放在提示词开头时才有收益。

每个请求都会重复同一段很长的 system prompt。读完本节，你可以调整提示词顺序来命中缓存，并通过指标确认缓存是否生效。

**我们的测量结果：**在 L4 上，无论前缀长度是多少，缓存都让首 token 延迟保持在约 400 ms。共享前缀有 1,024 个 token、关闭缓存时，首 token 延迟为 1,213 ms。

## 查看缓存节省了多少时间 {#s-make-repeated-prompts-hit-the-prefix-cache-see-what-the-cache-saves}

vLLM 0.31.0 默认启用前缀缓存。我们在 L4 上使用 `Qwen/Qwen3-8B`，分别开启和关闭缓存，运行相同的负载。每次运行会以 8 个用户发送 4 组、每组 16 条提示词。同一组内的提示词共享表格所示长度的 system prompt。每条提示词再添加 128 个 token 的问题，并请求生成 64 个 token。

| 共享提示词长度（L4 完整时钟时段） | 开启缓存的 TTFT 中位数 | 关闭缓存的 TTFT 中位数 | 输出 token/s，开启 / 关闭 |
|---|---|---|---|
| 无 | 408 ms | 392 ms | 113.8 / 113.6 |
| 256 | 488 ms | 753 ms | 111.5 / 99.1 |
| 1,024 | 396 ms | 1,213 ms | 106.0 / 70.9 |
| 2,048 | 410 ms | 2,550 ms | 100.2 / 46.6 |
| 4,096 | 375 ms | 13,353 ms | 86.8 / 19.6 |

开启缓存时，不论前缀长度是多少，首 token 耗时都在 400 ms 左右。关闭缓存时，每个请求都要重新计算整段提示词，因此前缀越长，首 token 就越慢。

需要谨慎解读后两行数据。关闭缓存时 GPU 降频了：前缀为 2,048 token 时，时钟中位数降到 1,035 MHz；前缀为 4,096 token 时降到 675 MHz。1,024-token 这一行的比较最可靠，因为两次运行时钟都不低于 1,410 MHz。在这里，缓存将首 token 延迟降低了约 3 倍，输出量提高了 50%。开启缓存的测试分别在 2026-10-17 和 2026-10-18 进行，关闭缓存的测试则在 2026-10-21 进行。

服务器日志每隔几秒就会报告一次命中率：

```listing
title: 共享前缀运行期间的缓存记录
source: capture/gpu/out-l4/server-h2h-prefix-vllm.log
lang: text
note: 87% 的提示词 token 来自缓存。
---
INFO 10-18 00:43:16 [loggers.py:320] Engine 000: Avg prompt throughput: 231.0 tokens/s, Avg generation throughput: 93.6 tokens/s, Running: 8 reqs, Waiting: 0 reqs, GPU KV cache usage: 77.2%, Prefix cache hit rate: 87.2%
```

```figure
id: fig-3-2b
kind: chart
title: 开启和关闭缓存
claim: 在 L4 上开启前缀缓存后，不同共享前缀长度下的首 token 延迟都维持在约 400 ms。
caption: 注意图表使用对数刻度：每条网格线约为下一条的 3 倍。带状范围表示三次运行。来源：capture/gpu/summary/l4.json。
```

## 将共享内容放在前面 {#s-make-repeated-prompts-hit-the-prefix-cache-put-the-shared-part-first}

缓存会从提示词的第一个 token 开始匹配，每次匹配一个 16-token block。第一个不同的 block 之后就不会再复用。因此，要命中缓存，请求开头必须是相同顺序的 token。

1. 将不会变化的内容放在最前面：system prompt、工具定义和固定指令。
2. 将不常变化的内容放在后面，例如同一会话中的文档。
3. 将每次请求都会变化的内容放在最后：用户问题、时间和请求 ID。

如果时间戳或 ID 出现在提示词开头，首个 block 就会变化，后续 block 也会失去缓存命中。还要检查 chat template，因为有些模板会在 system prompt 中插入日期。

vLLM 只缓存完整 block。共享内容有 20 个 token 时，只能复用其中一个 16-token block，剩余的 4 个 token 每次都要重新计算。

```figure
id: fig-3-2
kind: structure
title: 前缀命中
claim: 新请求会从提示词开头复用已缓存的 block，并在首个不同的 block 处停止。
caption: 先读上方，再读下方。虚线方块表示需要重新计算。来源：vLLM 0.31.0 源码。
```

## 隔离不同租户 {#s-make-repeated-prompts-hit-the-prefix-cache-keep-tenants-apart}

如果两位用户的提示词前缀相同，就会共享缓存 block。这能节省计算，也可能让一位用户从另一位用户的请求耗时推断其输入。为隔离租户，请在每个请求中提供 `cache_salt` 字段。salt 不同时，请求不会共享缓存 block。LoRA adapter 也是 block key 的一部分，因此不同 adapter 之间也不会共享 block。

## 确认缓存命中 {#s-make-repeated-prompts-hit-the-prefix-cache-prove-the-hit}

从 `/metrics` 读取两个计数器：

```bash
curl -s localhost:8000/metrics | grep -E "^vllm:prefix_cache_(queries|hits)"
```

用命中数除以查询数即可得到命中率。也可以对同一段较长提示词连续请求两次，比较第二次和第一次的首 token 延迟。

如果命中率很低，最常见的原因是提示词顺序。其次是缓存池已满，因为运行中的请求需要空间时，缓存中的旧 block 可能被移除。

```takeaways
- 在我们的 L4 测试中，默认启用前缀缓存后，不同前缀长度下的首 token 延迟都在约 400 ms。
- 将共享的提示词内容放在前面，把会变化的内容放在最后。
- 使用 cache_salt 隔离不同租户。
- 用前缀缓存计数器确认命中，不要靠猜测。
```

来源：capture/gpu/summary/l4.json（prefix.vllm、prefix.vllm-no-prefix-cache），capture/gpu/out-l4/server-h2h-prefix-vllm.log、capture/gpu/out-l4/server-h2h-prefix-vllm-no-cache.log，vLLM 0.31.0 文档（docs/design/prefix_caching.md），vLLM 0.31.0 源码（vllm/v1/core/kv_cache_utils.py、vllm/config/cache.py）。
