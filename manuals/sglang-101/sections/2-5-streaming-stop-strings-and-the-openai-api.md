# 流式输出、停止字符串与 OpenAI API

> SGLang 在 scheduler 检查停止条件，在 detokenizer 构建文本；原生 /generate 端点还报告 OpenAI 格式缺失的计时和缓存数据。

聊天窗口里，停止字符串前的最后一个词姗姗来迟；或开启推测解码后，停止字符串泄漏到输出；或客户端完全没有 `cached_tokens`，无法判断是否命中缓存。三者都与文本在哪里生成、由谁报告哪些信息有关。

读完本节，你能在原生 `/generate` 与 OpenAI 端点之间做选择，解读原生响应每项计时，并解释流式文本为何有时等待。

## 同一服务器上的两种 API

**原生 API：** SGLang 自有端点，主要是 `POST /generate`。接收文本或 token ID 以及 `sampling_params`，返回含 SGLang 数据的 `meta_info` 对象。

**OpenAI API：** `/v1/chat/completions`、`/v1/completions`、`/v1/models`，格式符合 OpenAI 客户端预期。分词前服务器先应用聊天模板。

两者构建相同内部请求，经过[第 2.1 节](#s-sglang-serve-and-the-three-processes)的相同三个进程，区别在于返回内容。

## 原生响应提供什么

上游工具以温度 0 发送一个要求输出 12 token 的原生请求。

```listing
title: 一个原生 /generate 响应
source: capture/out/generate.txt
lang: json
note: 删去 output_ids 和 weight_versions 列表。
---
{
  "text": " Paris, and the capital of Germany is Berlin. The capital",
  …
  "meta_info": {
    "id": "e272e3ffc4064bfeaa0223b86408e107",
    "finish_reason": {
      "type": "length",
      "length": 12
    },
    "prompt_tokens": 5,
    …
    "num_retractions": 0,
    …
    "queue_time": 0.0002437499351799488,
    "reasoning_tokens": 0,
    "completion_tokens": 12,
    "cached_tokens": 2,
    …
    "cached_tokens_details": {
      "device": 2,
      "host": 0
    },
    "dp_rank": null,
    "e2e_latency": 0.9496850408613682,
    …
    "first_token_latency": 0.8885334208607674,
    …
    "decode_throughput": 179.8807619469758,
    …
  }
}
```

每个字段都回答生产中会问的问题：

- `finish_reason` 说明停止原因，这里为 `length`，因为请求 12 个并得到 12 个 token。
- `queue_time` 为 0.24 ms，几乎没排队。有负载时，这通常最先增长。
- `first_token_latency` 为 889 ms，`e2e_latency` 为 950 ms。冷服务的首 token 占去大部分时间。
- `num_retractions` 为 0。非零值的代价见[第 2.3 节](#s-admission-and-retraction)。
- `cached_tokens` 为五个 prompt token 中的两个，均来自设备，无主机内存缓存。

工具首个请求为何已有两个缓存 token？答案很清楚。接受流量前，服务以 “The capital city of France is” 预热 {{code}}。工具 prompt 是 “The capital of France is”，前两个 token 在基数树中匹配预热。缓存不关心前缀由哪个用户发送。

## OpenAI 响应提供什么

```listing
title: OpenAI 聊天响应
source: capture/out/generate.txt
lang: json
note: 删去 ID、创建时间与元数据块。
---
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Ardens",
        "reasoning_content": null
      },
      "logprobs": null,
      "finish_reason": "stop",
      "matched_stop": 151645
    }
  ],
  "usage": {
    "prompt_tokens": 21,
    "total_tokens": 25,
    "completion_tokens": 4,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "reasoning_tokens": 0
  },
```

上游要求用一个词说出一个行星名，4-bit 0.6B 模型回答 “Ardens”，并非行星。用微型模型评判服务引擎时应记住这点。引擎完成了工作：遇到回合结束 token 151645 停止，并报告 `matched_stop`。

`cached_tokens` 字段存在，是因为服务使用 `--enable-cache-report`。没有该参数，SGLang 会从 OpenAI usage 省略缓存细节，尽管每个请求都计算了这些值 {{code}}。原生 `meta_info` 无论如何都报告 `cached_tokens`。

Mac 读者注意：v0.5.22 的 MLX decode 默认贪心，除非设置 `--mlx-enable-sampling`，否则 `temperature`、语法掩码和输出 logprobs 都不起作用。`sglang serve` 帮助明确说明了这一点。工具使用温度 0，因此两种设置结果相同。[第 4.6 节](#s-deterministic-inference-and-logprobs)介绍 GPU 上的采样和 logprobs。

## 在哪里检查停止字符串

**停止条件：** 结束请求的规则，可以是停止 token、停止字符串、正则、`max_new_tokens` 上限、中止或语法结束。

SGLang 在每一步后按固定顺序在 scheduler 检查停止条件 {{code}}。先检查停止字符串，再检查序列结束 token。代码注释解释原因：推测解码单步可能接受多个 token，按 token 检查只会裁掉最后一个，使停止字符串泄漏。Detokenizer 仅从输出裁掉匹配的停止文本。

```figure
id: fig-2-5
kind: sequence
title: 带停止字符串的流式请求
claim: Scheduler 决定何时停止，detokenizer 将 ID 转为文本，output streamer 暂存可能构成停止字符串开头的文本。
caption: 自上而下读。蓝色生命线为 SGLang 进程，橄榄色为客户端，靛蓝虚点箭头为流式输出块。行为来自 v0.5.22 的 schedule_batch.py、output_streamer.py、detokenizer_manager.py。
```

## 流式文本为何等待

两条规则可能延迟输出块 {{code}}：

- **不完整字符。** Detokenizer 用每请求两个偏移量做增量解码。新文本末尾若是不完整 UTF-8 字符，就等待下个 token 再发送。
- **可能的停止字符串。** 文本末尾若可能是停止字符串开头，output streamer 暂存它。后续 token 若补全停止字符串，这段文本永不输出；否则随下一块发出。

默认 `--stream-interval 1` 让 SGLang 每步后流式发送。非流式请求仍每 50 token 在服务内部发送一次进度，由 `SGLANG_FORCE_STREAM_INTERVAL` 控制，让 TokenizerManager 能跟踪它 {{code}}。

## 事故：不再前进的 detokenizer

若 token 始终无法组成完整字符，不完整字符规则就有代价 {{issue #34740}}。文本末尾是替换字符 U+FFFD 时，detokenizer 等待。永不组成字符的字节 token 让偏移量始终不动，于是每一步重新解码整个尾部，工作量随长度平方增长。报告通过填充 ID 100 的测试设置发现它，该 ID 在 DeepSeek-V4-Pro 上解码为 U+FFFD。上游核验时该 issue 仍开放。

## 本手册的建议

调试、测量或自建客户端时使用原生 `/generate`，其 `meta_info` 提供每请求的排队时间、首 token 延迟、缓存命中与回撤。OpenAI 格式容不下其中多数数据。

已有 OpenAI 格式应用则使用 OpenAI 端点。每个服务器都开启 `--enable-cache-report`，让这些客户端也看到缓存命中。它没有额外成本，[第 3 部分](#s-prefix-friendly-prompts)说明这个数字的价值。

```takeaways
- 调试和测量用 /generate，读取 meta_info。
- 用 --enable-cache-report 启动，让 OpenAI 客户端看到 cached_tokens。
- 文本末尾可能是停止字符串开头时，流式输出会等待。
- 小模型答错时，应分别评判引擎和模型。
```

Sources: python/sglang/srt/entrypoints/http_server.py (warm-up prompt, /generate), python/sglang/srt/entrypoints/openai/serving_chat.py (enable_cache_report), python/sglang/srt/managers/schedule_batch.py (update_finish_state, check_match_stop_str_prefix), python/sglang/srt/managers/scheduler_components/output_streamer.py, python/sglang/srt/managers/detokenizer_manager.py, python/sglang/srt/environ.py (SGLANG_FORCE_STREAM_INTERVAL), python/sglang/srt/arg_groups/fields/serving.py at v0.5.22; capture/out/generate.txt and capture/one_request.py; capture/out/serve-help.txt for --mlx-enable-sampling; issue https://github.com/sgl-project/sglang/issues/34740.
