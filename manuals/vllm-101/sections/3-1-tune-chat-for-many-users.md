# 为多用户 chat 调优

> 对 chat 来说，token 之间最差的间隔比吞吐量更重要，因此要观察用户增加时的 P99 ITL。

少量用户使用 chat 服务时，流式输出很平滑；用户一多，token 之间就出现长时间停顿。读完本节，你可以在用户增加时保持流式输出稳定。

**我们的测量结果：**在 L4 上，并发 16 个用户时约三分之二的请求满足延迟目标；并发 32 个用户时没有请求达标。限制 batch 并没有解决问题。

## 了解 chat 用户的感受 {#s-tune-chat-for-many-users-know-what-a-chat-user-feels}

Chat 用户主要感受到两个数字：首 token 延迟（TTFT），以及答案流式输出过程中 token 之间的间隔（ITL）。吞吐量决定你要为 GPU 支付多少费用，但用户看不到它。

关注 P99 ITL，也就是 100 个间隔中最慢的那个。流中一次长停顿，比整个流稍慢更明显。两个指标都应设置目标。我们的目标是首 token 在 1 秒内返回，每个 token 的间隔不超过 100 ms。

## 找到流式输出开始变差的位置 {#s-tune-chat-for-many-users-see-where-the-stream-breaks}

**我们的测量：**2026-10-21，在 L4[完整时钟时段](#s-front-l4-sessions)使用 Qwen/Qwen3-8B 测试并发数从 1 到 64。每条请求发送 512 个提示词 token，要求生成 128 个 token；每个数据点使用三个随机种子。

| 用户数（L4 完整时钟时段） | 输出 token/s | TTFT 中位数 | P99 ITL | 达到目标的请求比例 | SM 时钟中位数 |
|---|---:|---:|---:|---:|---:|
| 8 | 112.8 | 0.25 s | 67 ms | 75% | 1,485 MHz |
| 16 | 201.3 | 0.29 s | 85 ms | 64% | 1,455 MHz |
| 32 | 275.1 | 1.80 s | 613 ms | 0% | 1,275 MHz |
| 64 | 242.3 | 11.18 s | 1,233 ms | 0% | 1,005 MHz |

并发最多 16 个用户时，每增加一个用户都会提高输出量，流式输出仍保持稳定。但在并发 16 个用户时，已经有三分之一请求的首 token 太晚。并发 32 个用户时，输出量仍然增加，但 P99 ITL 增长了 7 倍，没有请求达到目标。服务器很忙，用户只能等待。

### 谨慎看待 32 个用户以下受前缀缓存复用影响的结果 {#s-tune-chat-for-many-users-treat-results-below-32-users-as-affected-by-prefix-cache-reuse}

这次 sweep 为所有并发数使用同一台服务器，并且没有在不同并发数测试之间重置前缀缓存。每个随机种子在每种并发数下都发送相同的开头提示词，因此很多请求命中了缓存，跳过了 prefill。2026-10-23，我们在同一块 L4 上重新运行 sweep，每次运行前都重置缓存，并将时钟锁定在 900 MHz；同时与同一时段未清空缓存的运行进行比较：

```listing
title: L4 上 Qwen3-8B 清空和未清空缓存时的 TTFT 中位数
source: capture/gpu/out-l4/load-flushed-vs-unflushed.txt
lang: text
note: 展示 TTFT 中位数行。达标请求比例和 P99 ITL 行已省略。
---
median TTFT, flushed against unflushed
users   vLLM                                   SGLang
4       650 / 145 ms (4.5x)                    532 to 645 / 141 ms (3.8 to 4.6x)
8       951 to 978 / 264 to 274 ms (3.6x)      1,174 to 1,273 / 173 to 178 ms (6.6 to 7.3x)
16      1,550 to 1,587 / 294 to 295 ms (5.3x)  1,804 to 1,944 / 218 ms (8.3 to 8.9x)
32      1,982 to 2,084 / 2,012 to 3,091 ms     3,216 to 3,228 / 2,710 to 2,917 ms
…
```

重置缓存后，并发 8 个用户时达标请求比例为 50%；未重置时为 75% 至 81%。并发 16 个用户时，达标比例从约 65% 降到 25%。同一时段未清空缓存时，16 用户的 P99 ITL 为 82 至 84 ms；重置后为 522 ms。并发超过 32 个用户后，排队成为主要因素，重置缓存几乎没有影响。因此这块卡的流式输出问题出现在 8 到 16 个用户之间，而不是 16 到 32 个之间。上表仍保留完整时钟时段的记录。

这块 GPU 上，每一步的 token 预算是 2,048。新提示词到达时，其分块会和正在运行的流式请求共用当前步骤，因此已有流会暂停。[Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase)一节解释了处理顺序。

## 了解序列数上限的作用 {#s-tune-chat-for-many-users-know-what-a-cap-on-sequences-does}

参数 --max-num-seqs 设置同时运行的请求数。L4 上的默认值是 256，其他 GPU 的默认规则见[Token 预算](#s-keep-long-prompts-from-stalling-short-ones)。我们将它设为 16 并运行了相同的 sweep：

```figure
id: fig-3-1
kind: chart
title: 用户增加时将序列数限制为 16
claim: 并发不超过 16 个用户时，序列数上限 16 与默认设置相当；并发 32 个用户时，输出量从 275 token/s 降到 172 token/s。
caption: 每个点表示三个随机种子的中位数，带状范围覆盖这些结果。首 token 时间使用对数刻度。来源：capture/gpu/summary/l4.json。
```

| 用户数（L4 完整时钟时段） | 配置 | 输出 token/s | TTFT 中位数 | ITL 中位数 | P99 ITL | SM 时钟中位数 |
|---|---|---:|---:|---:|---:|---:|
| 32 | 默认值 | 275.1 | 1.8 s | 80.5 ms | 613 ms | 1,275 MHz |
| 32 | --max-num-seqs 16 | 171.8 | 12.3 s | 69.8 ms | 595 ms | 1,365 MHz |

序列上限让单条流稍微平滑了一点。但一半用户为了首 token 在队列中等待，输出量减少了 38%。限流运行的时钟更高，因此不能用时钟解释吞吐量下降。并发 64 个用户时，该运行的时钟降到了 630 MHz，因此不比较这一行。

上限不会让 GPU 容纳更多用户，只会决定谁等待。

### 在 64 个用户时测试上限 {#s-tune-chat-for-many-users-try-a-cap-at-64-users}

在 L4 上并发 64 个用户时，vLLM 的 P99 ITL 超过一秒，而 SGLang 约为 150 ms。2026-10-23，我们尝试用序列上限缩小差距。测试时钟锁定在 900 MHz，每种配置有两个随机种子，每次运行前重置缓存。0.31.0 还有第二个上限 --max-num-active-seqs，用于限制一个步骤内运行的请求数。

```listing
title: L4 上 64 用户时的限流测试，vLLM 0.31.0 对比 SGLang 0.5.22
source: capture/gpu/out-l4/admission-cap-64-users.txt
lang: text
note: 从证据文件截取的测试行。远低于锁频值运行的行已省略。
---
config                        median SM clock (s1/s2)   median TTFT       P99 ITL               output tok/s
SGLang default                900 / 900                 19.4 s            143 to 153 ms         225 to 231
…
vLLM default, earlier run     900                       11.8 s            1,359 ms              220
…
--max-num-seqs 32             900 / 795                 17.2 to 20.6 s    1,163 to 1,399 ms     196 to 230
…
--max-num-active-seqs 48      900 / 900                 11.8 s            1,329 to 1,373 ms     215 to 218
…
--max-num-active-seqs 16      795 / 683                 44.8 to 48.8 s    1,133 to 1,139 ms     129 to 136
```

我们测试的所有上限都未能让 vLLM 的 P99 ITL 接近 SGLang。运行请求数为 16 或 32 时，P99 ITL 仍高于 1.1 秒，首 token 要等 17 至 65 秒。这组测试中有许多运行远低于锁定时钟值，证据文件列出了全部结果。因此，在这块卡上，将并发限制为 64 个用户时，限流无法修复长间隔问题。减少每个副本的用户数更有效。

## 查看缓存池过小时的表现 {#s-tune-chat-for-many-users-see-what-a-small-pool-does}

KV 缓存池也会限制用户数。**我们的测量：**在 L4 上，将 6,560-token 缓存池（设置 --num-gpu-blocks-override 410 和 --max-model-len 4096）与 24,096-token 缓存池进行比较。两次测试都在 2026-10-22 的[900 MHz 锁频时段](#s-front-l4-sessions)进行，并发 32 个用户，每项使用两个随机种子。

| 缓存池（L4 锁频时段） | TTFT 中位数 | P99 TTFT | SM 时钟中位数 |
|---|---:|---:|---:|
| 24,096 个 token | 3.1 s | 7.1 s | 881 MHz |
| 6,560 个 token | 31.6 s | 48.0 s | 248 MHz |

一个 640-token 请求在结束前需要 640 个缓存 token。因此，6,560-token 缓存池一次大约只能容纳 10 个请求。其他 22 个请求必须等待正在运行的请求完成。

只有请求所需的 block 能放进缓存池时，vLLM 才会启动它。运行中的请求需要新 block 时，可能会挤出另一个请求，vLLM 会将其记为 preemption。因此，32 个请求中大多数在开始运行前都排了队。

小缓存池测试的时钟降到了约 250 MHz，低于锁定值。时钟低 3.6 倍，单步时间最多可能慢 3.6 倍。但首 token 延迟变成了 10 倍，因此大部分额外等待来自队列。不要比较这两次运行的吞吐量或每 token 耗时。

## 调优步骤 {#s-tune-chat-for-many-users-tune-it}

1. 设置首 token 和每 token 耗时目标。
2. 逐渐增加并发数运行自己的负载，找到最后一个仍满足两个目标的并发数。
3. 如果 KV cache 使用率接近 100% 且请求在等待，说明缓存池太小。可通过[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)或[FP8 权重](#s-fit-a-bigger-model-with-fp8-weights)增加空间。降低最大长度在这里没有帮助，因为缓存池大小不会改变。
4. 如果缓存池有空间，但 P99 ITL 仍太高，说明 GPU 已满。增加 GPU 或副本。限制序列数会让等待转移到首 token。

在 DGX Spark 上，vLLM 和 SGLang 并发 32 和 64 个用户时的输出量相当。但并发 32 个用户时，vLLM 的 P99 ITL 约为 SGLang 的两倍，分别为 478 和 220 ms。选择 chat engine 时，也应比较 P99 ITL。

```takeaways
- Chat 服务要关注 P99 ITL 和首 token 延迟，不能只看吞吐量。
- 在我们的 L4 上，16 到 32 个用户之间开始出现流式延迟问题，但输出量仍在增加。
- 序列数上限会将等待转移到首 token，并降低输出量。
- KV 缓存池太小会让请求排队，推迟首 token。
```

来源：capture/gpu/summary/l4.json（load.vllm-b、load.vllm-seqs-16、load.vllm-lock-b、load.vllm-lock-small-pool），capture/gpu/summary/gb10.json（load.vllm、load.sglang），vLLM 0.31.0 源码（vllm/engine/arg_utils.py、vllm/v1/core/sched/scheduler.py、vllm/v1/metrics/loggers.py），capture/gpu/out-l4/load-flushed-vs-unflushed.txt、capture/gpu/out-l4/admission-cap-64-users.txt。
