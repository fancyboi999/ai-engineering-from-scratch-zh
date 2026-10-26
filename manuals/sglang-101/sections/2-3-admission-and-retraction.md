# 准入与回撤

> 只有预测的未来 token 能装入 KV 池，SGLang 才准入请求；服务器满时让新用户排队，避免破坏正在运行的请求。

仪表板显示 GPU 还有空闲内存，新请求却要等 28 秒才收到首 token。没有崩溃，没有丢请求，每 token 速度也正常，但用户仍觉得服务不可用。这是准入控制正常工作时的表现，你需要知道它为何让用户等待。

读完本节，你能解释决定准入的 token 预算，计算池能装下多少请求，并从日志区分正常排队与回撤问题。

## 成本：未来才需要的内存

请求现在需要为 prompt 分配 KV 缓存，之后还要为每个生成 token 分配。调度器不知道最终会生成多少，只知道上限 `max_new_tokens`。

两个直观方案都失败：给所有请求预留完整 `max_new_tokens`，多数请求会提前遇到序列结束 token，池的大部分空间因而闲置；完全不预留，则 decode 中池被填满，服务器被迫丢弃已完成的工作。

## 预测

SGLang 使用可修正的预测。两条规则决定准入 {{code}}：

- **新请求**需要容纳未缓存的 prompt token，加剩余 `max_new_tokens`；后者由 `SGLANG_CLIP_MAX_NEW_TOKENS_ESTIMATION` 截到 4,096。
- **每个运行中请求**预留剩余 `max_new_tokens` 乘以**新 token 比例**。

**新 token 比例：** 调度器预计运行中请求会使用的剩余输出比例。起始为 0.7 乘 `--schedule-conservativeness`（默认 1.0），经过 600 个 decode 步线性降到初值的 0.14，即默认配置下 0.098 {{code}}。

比例下降，是因为多数请求提前停止。运行越久且一切正常，调度器就越大胆。设置 `ignore_eos` 的请求不能提前结束，因此比例恒为 1.0。

```figure
id: fig-2-3
kind: comparison
title: 4,096 token 为何能装五个请求，装不下六个
claim: 设置 ignore_eos 时，各请求预留 256 prompt token 与全部 512 输出 token，五个共 3,840，第六个需总计 4,608。
caption: 每条代表 --max-total-tokens 4096 的 KV 池。绿色为预留 prompt KV，琥珀色为未来输出，灰色为空闲。来源：capture/out/server-small-pool.log 与 small-pool-bench-long-output-c16.txt。
```

## 小池实验

上游用 `--max-total-tokens 4096` 启动服务器，池远小于 Mac 可提供的容量。随后以并发 16、256-token 输入、512-token 输出运行基准。

基准客户端默认设置 `ignore_eos` 为 true，因此每个请求恰好生成 512 token {{code}}。每个请求预留 256 加 512，即 768 token。五个预留 3,840，第六个需要总计 4,608。调度器恰好准入五个。

```listing
title: 五个运行，十一个等待
source: capture/out/server-small-pool.log
lang: text
note: 摘自运行首分钟。首行为缓存预热 prompt。
---
[2026-10-16 14:08:02] Prefill batch, #new-seq: 1, #new-token: 1, #cached-token: 255, token usage: 0.06, #running-req: 0, #queue-req: 15, #pending-token: 0, cuda graph: False, input throughput (token/s): 0.80
[2026-10-16 14:08:02] Prefill batch, #new-seq: 4, #new-token: 896, #cached-token: 0, token usage: 0.28, #running-req: 1, #queue-req: 11, #pending-token: 2808, cuda graph: False, input throughput (token/s): 3889.60
…
[2026-10-16 14:08:14] Decode batch, #running-req: 5, #token: 1517, token usage: 0.37, cuda graph: False, gen throughput (token/s): 170.33, #queue-req: 11
[2026-10-16 14:08:17] Decode batch, #running-req: 5, #token: 2117, token usage: 0.52, cuda graph: False, gen throughput (token/s): 205.04, #queue-req: 11
…
[2026-10-16 14:08:26] Decode batch, #running-req: 5, #token: 3717, token usage: 0.91, cuda graph: False, gen throughput (token/s): 139.02, #queue-req: 11
```

观察 `token usage`：五个请求不断生成，使用预测为它们预留的空间，占用从 0.28 升到 0.91。其余十一个始终等待。五个完成后，下一组五个启动，日志以波次重复。

客户端感受到的代价如下：

```listing
title: 用户感受
source: capture/out/small-pool-bench-long-output-c16.txt
lang: text
note: 摘自汇总块。
---
Successful requests:                     32        
…
Concurrency:                             13.06     
…
Median TTFT (ms):                        27943.11  
…
Mean TPOT (ms):                          24.26     
```

全部请求成功。请求开始后，每 token 耗时 24 ms，但用户等待首 token 的中位数仍为 27.9 秒。`Concurrency` 的 13.06 是客户端平均未完成请求数，GPU 上同时只有五个。

## 回撤：预测出错时

比例衰减至 0.098，预测可能过于大胆。运行时间长的请求会需要超过池容量的槽位。每个 decode 步之前，调度器检查每个运行请求能否再拿到一个槽 {{code}}。

**回撤：** 从 decode 批次移除运行请求，释放其 KV 槽位，并放回等待队列。它们之后重新 prefill。

检查失败时，SGLang 输出 `KV cache pool is full. Retract requests.`。它优先回撤输出 token 最少的请求；输出数量相同时，优先回撤 prompt 最长的请求，因为这样损失的工作最少 {{code}}。随后重置比例为新估计值：已解码 token 加每请求 20 token，再除以 `max_new_tokens` 总量。v0.5.22 中，若回撤所有其他请求后最后一个请求仍放不下，调度器会中止它，结束循环 {{code}}。

我们的小池运行没有发生回撤。服务器日志没有 `Retract requests` 记录，指标端点也显示为零，但这个指标有一个限制：`num_retracted_reqs` 是 gauge，调度器每个日志间隔都会重置它。因此读数为 0 只覆盖最近一个间隔。`num_retracted_requests_total` 才是整次运行的累计计数。

```listing
title: 小池运行中回撤为零
source: capture/out/small-pool-metrics.txt
lang: text
---
sglang:num_retracted_reqs{engine_type="unified",model_name="mlx-community/Qwen3-0.6B-4bit",moe_ep_rank="0",pid="38678",pp_rank="0",tp_rank="0"} 0.0
```

预测无需修正。`ignore_eos` 使预留量完全准确。真实流量会提前结束，因此比例下降、准入变大胆，才有可能回撤。

```figure
id: fig-2-3b
kind: timeline
title: 600 个 decode 步中的新 token 比例
claim: 比例从 0.7 降至 600 步后的 0.098，回撤后跳升，因此准入逐渐大胆直到失败。
caption: 从左向右按 decode 步读。琥珀色线为未设置 ignore_eos 的默认比例，玫红标记为回撤。常量来自 v0.5.22 的 new_token_ratio_tracker.py。
```

## 事故：回撤成为问题

一台八张 H20 运行 DeepSeek-R1 的服务器，各 rank 反复输出 `KV cache pool is full. Retract requests.`，随后连健康检查也不响应 {{issue #8463}}。评论者认为，回撤未能释放足够内存，导致循环重复。Issue 未修复便关闭。v0.5.22 会在回撤所有其他请求后仍然缺少内存时中止最后一个请求。这个改动用于结束循环，但我们没有复现该事故。

另一用户发现回撤后 decode 吞吐量从约 429 token/s 降到 20至38，并一直维持低位 {{issue #26248}}。该 issue 因不活跃而关闭，未记录原因。教训仍成立：日志中的回撤是性能警报。

## 本手册的建议

排队是诚实的失败方式。它让运行中的请求保持速度，通过 `#queue-req` 和 TTFT 显露过载。回撤则把过载隐藏为浪费的 prefill 工作。

SGLang 调优文档认为偶尔回撤（约每分钟一次）可以接受。超过该频率应视作配置问题。提高 `--schedule-conservativeness`，例如设为 1.3，让预测初值更高；或降低 `--max-running-requests`。不要只靠增大 `--mem-fraction-static` 修复，[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)说明代价。

客户端应设置合理的 `max_new_tokens`。如果请求 4,096 个输出 token 却只使用 200，准入控制会为每个新请求预留约 20 倍的实际输出空间。

```takeaways
- 按未缓存 prompt 加 max_new_tokens 与空闲池比较，计算准入。
- 队列长但 token 很快表示准入控制，并非故障。
- num_retracted_reqs 增长快于约每分钟一次时报警。
- 先提高 schedule-conservativeness，再考虑增加内存来减少回撤。
- 客户端发送合理 max_new_tokens，使准入正确估算请求。
```

Sources: python/sglang/srt/managers/schedule_policy.py (PrefillAdder.add_one_req, _get_running_request_total_token_offset, CLIP_MAX_NEW_TOKENS), python/sglang/srt/managers/scheduler_components/new_token_ratio_tracker.py, python/sglang/srt/managers/schedule_batch.py (check_decode_mem, retract_decode, _get_decode_retraction_order), python/sglang/srt/managers/scheduler.py (update_running_batch), python/sglang/srt/environ.py, python/sglang/benchmark/serving.py (ignore_eos default) at v0.5.22; docs/docs/advanced_features/hyperparameter_tuning.mdx at v0.5.22; capture/out/server-small-pool.command.txt, server-small-pool.log, small-pool-bench-long-output-c16.txt, small-pool-metrics.txt; issues https://github.com/sgl-project/sglang/issues/8463 and https://github.com/sgl-project/sglang/issues/26248.
