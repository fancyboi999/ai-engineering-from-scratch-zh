# 运行批处理和离线任务

> 没有人等待首 token 时，可以不断提高并发量，直到吞吐量不再增长。

你需要在夜间处理大量提示词。读完本节，你可以在不关心延迟的任务中获得最高的 token/s。

**我们的测量结果：**在 L4 上使用 Qwen3-8B 时，并发用户达到 32 后，输出量不再增长，约为每秒 274 个 token。

## 选择离线类或服务器 {#s-run-batch-and-offline-jobs-pick-the-offline-class-or-the-server}

处理固定的一组提示词时，离线 `LLM` 类会在 Python 进程中运行 engine。它没有 HTTP 层，也无需调优客户端：

```python
from vllm import LLM, SamplingParams

prompts = ["Summarize the history of Lisbon in three sentences.", "Write a haiku about the sea."]
llm = LLM(model="Qwen/Qwen3-8B")
params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(prompts, params)
for out in outputs:
    print(out.outputs[0].text)
```

一次调用传入整组提示词。engine 会自行调度所有提示词并尽量保持 batch 满载。

处理 OpenAI 请求文件时，使用 batch 命令：

```bash
vllm run-batch -i requests.jsonl -o results.jsonl --model Qwen/Qwen3-8B
```

需要其他程序提交任务，或任务要与在线流量共用 GPU 时，使用服务器。

## 找出吞吐量停止增长的位置 {#s-run-batch-and-offline-jobs-find-where-throughput-stops-growing}

没有人等待首 token 时，只有总输出量重要。逐渐提高并发量，直到输出量不再增长。

2026-10-17，我们在 L4[完整时钟时段](#s-front-l4-sessions)使用 `Qwen/Qwen3-8B` 和 512-token 提示词进行测试。并发用户从 1 个增加到 32 个时，输出量从 13.5 token/s 升到 273.9 token/s。并发数增至 64 后，输出降到 241.4 token/s，因为缓存池已满，GPU 也降频了。2026-10-18 的另一轮测试中，固定请求速率为每秒 4 个请求，吞吐量达到 286.6 token/s；时钟为 1,245 MHz，而最高为 1,275 MHz。因此，在这块 GPU 上，并发约 32 个用户时输出量最高。更多用户只会让每个请求等待更久。

你的硬件上限取决于模型、提示词和回答长度，以及缓存池大小。使用自己的长度运行[性能 sweep](#s-benchmark-your-server-in-15-minutes)，找出上限。

## 提高批处理上限 {#s-run-batch-and-offline-jobs-raise-the-limits-for-a-batch-job}

两个上限会限制 batch 大小。默认值取决于 GPU 内存和 vLLM 的运行方式：

- `--max-num-seqs` 限制同时运行的请求数。
- `--max-num-batched-tokens` 限制一个步骤处理的 token 数。离线 `LLM` 类的默认值比服务器更大。vLLM 文档建议设置为高于 8,192 的数值以提高吞吐量，尤其是大 GPU 上运行小模型时。

[Token 预算](#s-keep-long-prompts-from-stalling-short-ones)一节列出了当前 GPU 对这两个参数的默认值。

较大的 token 预算让长提示词用更少步骤完成 prefill。运行中的流式请求在每个步骤里得到的资源会减少，而批处理任务不在乎这一点。

我们测量过 DGX Spark 上的预算：低请求速率时，16,384 会造成更长的 token 间隔。[长提示词](#s-keep-long-prompts-from-stalling-short-ones)一节提供了数值。我们没有测量该设置对批处理的影响。

## 检查运行状态 {#s-run-batch-and-offline-jobs-check-the-run}

监控 `vllm:num_requests_running` 和 `vllm:kv_cache_usage_perc`。如果缓存使用率持续接近 1 且请求在等待，说明 batch 受缓存池限制。可以使用 FP8 KV cache 增加容量，或降低最大长度。如果运行数达到 `--max-num-seqs` 上限但缓存仍有空闲，就提高该上限。

```takeaways
- 固定提示词列表使用离线 LLM 类，并在一次调用中传入整个列表。
- 提高并发量，直到输出不再增长。我们在 L4 上测得的峰值约为 32 个用户。
- 提高批处理任务的 token 预算，因为此时首 token 慢一些没有影响。
```

来源：capture/gpu/summary/l4.json（load.vllm、rate.vllm），vLLM 0.31.0 文档（docs/configuration/optimization.md），vLLM 0.31.0 源码（vllm/entrypoints/llm.py、vllm/entrypoints/cli/）。
