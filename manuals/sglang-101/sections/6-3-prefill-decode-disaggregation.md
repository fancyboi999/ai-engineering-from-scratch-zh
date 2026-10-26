# Prefill-decode 分离：--disaggregation-mode

> 分离将 prefill 放到独立服务器，让长 prompt 不再延迟其他用户的 token；只有测量确认该延迟是问题时，它才有价值。

聊天用户原本能看到流畅输出，直到有人粘贴一篇长文档。服务器为文档执行 prefill 时，所有流都暂停。prefill 同时计算大量 token，decode 每步为每个请求计算一个 token。在同一服务器上，两者共享 GPU 步骤，长 prefill 会占用整个步骤。分块 prefill 能缩短暂停，却无法消除它。

读完本节，你能解释 SGLang 如何把请求的 KV 缓存从 prefill 服务器移到 decode 服务器。你也能启动最小分离配置，并根据测量判断是否需要它。

## 两台服务器，一个请求 {#s-prefill-decode-disaggregation-two-servers-one-request}

**Prefill-decode 分离（PD）：** 用 `--disaggregation-mode prefill` 和 `--disaggregation-mode decode` 启动两种 SGLang 服务器。默认值为 `null`，表示一台服务器执行两种工作 {{code}}。prefill 服务器计算 prompt 的 KV 缓存和首个 token。decode 服务器接收 KV 缓存，生成其余 token。

SGLang 文档给出两个拆分理由 {{docs}}。prefill batch 会打断 decode batch。采用注意力数据并行时，一组可能执行 prefill，另一组执行 decode，后者每步都要等待最慢的组。独立服务器消除这两类等待。两个资源池还可以采用各自的并行布局，例如 prefill 使用大 TP，decode 使用注意力数据并行。

## KV 缓存如何移动 {#s-prefill-decode-disaggregation-how-the-kv-cache-moves}

每次交互都由[第 6.4 节](#s-sgl-model-gateway)的网关发起。它选择一台 prefill 和一台 decode 服务器，并向请求添加三个字段：prefill 服务器的 bootstrap 主机、bootstrap 端口，以及名为 bootstrap room 的随机 63 位数字。随后同时向两台服务器发送相同请求 {{code}}。

**Bootstrap room：** 两台服务器用来找到同一请求另一半的编号。可以把它看作预订号：decode 服务器预订 KV 槽位，prefill 服务器写入这些槽位。

```figure
id: fig-6-3
kind: sequence
title: 一个分离请求
claim: decode 服务器预留 KV 槽位并发布地址，随后 prefill 服务器将 KV 页直接写入 decode 内存。
caption: 从上往下读。实线箭头表示请求，青色箭头表示内存写入，点线箭头表示返回客户端的 token 流。依据 v0.5.22 的网关 PD 路由器、prefill 和 decode 调度器及 Mooncake 连接代码。
```

1. decode 服务器创建接收器，通过 bootstrap 服务器找到 prefill rank，并为 prompt 预留 KV 槽位。
2. 它把这些槽位的地址发给 prefill 端。
3. prefill 服务器为 prompt 执行正常的 prefill 前向传播。
4. 它将 KV 页写入 decode 服务器预留的槽位。默认 Mooncake 后端采用单边 RDMA 写入。Mooncake 将两端连续的页合并成一次批量传输 {{code}}。
5. decode 服务器发现传输完成，将请求加入运行 batch，无须再次 prefill。
6. 客户端收到的流来自 decode 服务器。

bootstrap 服务器运行在 prefill 主机，默认端口 8998 {{code}}。两端使用五个状态跟踪传输：Failed、Bootstrapping、WaitingForInput、Transferring 和 Success {{code}}。

```figure
id: fig-6-3b
kind: state
title: 一次传输的 KVPoll 状态
claim: 每次传输经过引导、等待和传输，最终成功，任意阶段都可能失败。
caption: 从左向右读。数字是 KVPoll 类的取值。琥珀色箭头表示状态变化，玫红色箭头表示失败。依据 v0.5.22 的基础连接代码。
```

## 关键设置 {#s-prefill-decode-disaggregation-settings-that-matter}

| 设置 | 默认值 | 含义 |
|---|---|---|
| `--disaggregation-mode` | `null` | 两种角色分别为 `prefill` 或 `decode` |
| `--disaggregation-transfer-backend` | `mooncake` | 还支持 `mooncake_tcp`、`nixl`、`mori`、`ascend`、`fake` |
| `--disaggregation-bootstrap-port` | 8998 | prefill 主机的 bootstrap 服务器端口 |
| `--num-reserved-decode-tokens` | 512 | 请求加入运行 batch 时，在内存中预留的 decode token 数 |
| `SGLANG_DISAGGREGATION_BOOTSTRAP_TIMEOUT` | 300 | prefill 等待 decode 端槽位地址的秒数 |
| `SGLANG_DISAGGREGATION_WAITING_TIMEOUT` | 300 | decode 等待 KV 页的秒数 |
| `SGLANG_DISAGGREGATION_QUEUE_SIZE` | 4 | 并行传输队列数 |

所有默认值均来自 v0.5.22 代码 {{code}}。`mooncake_tcp` 面向没有 RDMA 网卡的集群。我们没有测量它的速度。

不要直接向 prefill 或 decode 服务器发送请求。调度器断言必须存在 bootstrap room，错误信息也会要求改为向路由器发送请求 {{code}}。

## 我们的建议 {#s-prefill-decode-disaggregation-our-position}

不要从分离开始。先用单服务器，再在网关后增加数据并行副本。只有测量确认，在实际服务并发下 prefill 干扰损害 token 间延迟，才分离 prefill 与 decode。分离会新增一组故障点：bootstrap、RDMA 传输、两个超时，以及必须正确配对服务器的路由器。

即使关注尾延迟，收益也有条件。2025 年的一项研究比较了分离服务器与同时运行两阶段的服务器。结果表明收益没有保证，它依赖请求负载和移动 KV 缓存的路径。我们没有亲自测量。保留分离配置前，应在真实负载下，将它与相同 GPU 作为普通服务器运行的配置比较。

真实事故说明跳过测量的代价。一名用户运行一台 prefill 和一台 decode 服务器，各使用 TP4（[issue #12591](https://github.com/sgl-project/sglang/issues/12591)）。首 token 时间高于未分离的单 TP4 服务器。原因是旧版 Mooncake 传输引擎，升级后解决。维护者还建议，不使用注意力数据并行时设置 `SGLANG_DISAGGREGATION_QUEUE_SIZE=1`。如果没有单服务器基线，就没人知道分离使结果变差。

## 另外两起事故，都来自路由器 {#s-prefill-decode-disaggregation-two-more-incidents-both-from-the-router}

GLM-4.5 配置在 64 个并发请求下，prefill 端记录大量 `Prefill bootstrap failed` 和 `Aborted by AbortReq` 错误（[issue #9266](https://github.com/sgl-project/sglang/issues/9266)）。四到七个并发请求可以工作。路由器的 prefill 客户端超时太短，导致路由器中止仍在运行的请求。PR [#9803](https://github.com/sgl-project/sglang/pull/9803)修复了超时。

维护者在相关讨论（[issue #9926](https://github.com/sgl-project/sglang/issues/9926)）给出一般规则：`Aborted by AbortReq` 表示客户端或路由器发起了中止。先检查超时，再怀疑传输。

Novita AI 在 H200 上运行 GLM-4.7 时发现另一种延迟 {{field Novita 2026-01}}。分离配合重叠调度器，吞吐量上升约 10%，但首 token 时间大幅恶化。在 prefill 端，KV 传输要等待下个 batch 的内核启动。不使用 CUDA graphs 时，他们的 92 层模型启动内核需要数百毫秒。他们通过新增 `--disaggregation-async-transfer` 参数修复。我们未在 v0.5.22 代码中找到该参数，复制命令前请核对版本。

## 每台 decode 应配多少 prefill 服务器 {#s-prefill-decode-disaggregation-how-many-prefill-servers-for-each-decode-server}

比例取决于流量。dstack 在八张 H200 上测试 gpt-oss-120b，仅采用 SGLang 分离和张量并行 {{field dstack 2025-09}}。高并发下，无论负载偏 prefill、偏 decode 还是均衡，一台 prefill 配三台 decode 的所有指标都胜出。低并发下，三比一和二比二的首 token 时间更好。他们的[文章](https://dstack.ai/blog/benchmarking-pd-ratios/)只给图表，没有绝对数字，因此只能用于判断方向。

更大规模下，SGLang 团队在 12 个各有八张 H100 的节点上运行 DeepSeek {{team 2025-05}}。输入 2000 token 时，报告每节点每秒输入 52.3k、输出 22.3k token。他们在分别运行的实验中，用 4 个节点测 prefill、9 个节点测 decode。Mooncake 团队报告在 128 张 H200 上运行 Kimi K2，使用 4 个 prefill 和 12 个 decode 节点 {{team 2025-07}}。给 decode 更多节点，是为了让 KV 池容纳 batch 480。两份报告都来自系统开发团队。

## 两张 L4 上发生了什么 {#s-prefill-decode-disaggregation-what-happened-on-two-l4s}

我们把 Qwen3-8B 分到第一张 L4 的 prefill 服务器和第二张 L4 的 decode 服务器。两张卡没有 RDMA，因此使用 `--disaggregation-transfer-backend mooncake_tcp`。第二张卡还运行另一团队的 pod，所以 decode 池只有 2,925 token，prefill 为 24,094。随后通过路由器运行[第 5.1 节](#s-sglang-benchmark-serving)的开环扫描。

```listing
title: KV 传输队列填满，会话终止
source: capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt
lang: text
note: prefill 和 decode 日志，以及每秒 8 请求时的基准结果，省略时间戳。
---
… Decode batch, #running-req: 2, #token: 1206, token usage: 0.41, pre-allocated usage: 0.00, #prealloc-req: 19, #transfer-req: 0, #retracted-req: 0
… TCP lane queue-full rejection count: 4096
… Session 151.242.195.41:15367 failed.
Prefill transfer failed lines: 2902
Successful requests:                     240
Total generated tokens (retokenized):    0
Mean TTFT (ms):                          0.00
```

decode 一次只能运行两个请求，另有 19 个等待 decode 内存。prefill 继续为它们生成 KV 缓存，发往 decode 的 TCP 传输队列随之填满。扫描开始三分钟后，传输会话失败，且未能恢复。之后每个请求都传输失败。

危险的是接下来的结果。每个失败请求经路由器后仍算成功，却没有文本。每秒 8 请求时，基准把 240 个请求全部记为成功。它打印每秒 751.85 个输出 token，高于相同速率下 FP8 服务器的 728.61。只有两个数字暴露问题：重新分词后的输出 token 为零，平均 TTFT 为 0.00 ms。

我们没有发布这些吞吐量数字。工具现在会拒绝所有请求 TTFT 都为 0 的运行。

随后我们对调两端。decode 获得完整的 24,094 token 池，prefill 使用共享卡上的 2,925 token 池。1 至 8 用户时，每个请求都返回文本。16 用户时，8,192 个生成 token 中仅 2,048 个作为文本返回。32 用户时，所有请求均返回空文本，工具停止扫描。

```listing
title: 对调后的分离配置发生故障
source: capture/gpu/out-l4/bench-pd-swap.txt
lang: text
note: 8、16 和 32 用户时的基准汇总行，比较生成 token 与重新分词后的 token。
---
c8: Successful requests: 32 
c8: Total generated tokens: 4096 
c8: Total generated tokens (retokenized): 4096 
c16: Successful requests: 64 
c16: Total generated tokens: 8192 
c16: Total generated tokens (retokenized): 2048 
c32: Successful requests: 128 
c32: Total generated tokens: 16384 
c32: Total generated tokens (retokenized): 0 
```

原始方向在两种扫描中都很早失败。2 用户时，2,048 个生成 token 中仅 512 个作为文本返回，4 用户时全部丢失。固定速率扫描从每秒 0.5 请求起就丢失多数文本。我们没有这对卡在负载下分离运行的有效实测结果，也不作此声称。读取分离基准的吞吐量前，先检查 `Total generated tokens (retokenized)`。

## 要测量什么 {#s-prefill-decode-disaggregation-what-to-measure}

先用[第 5.1 节](#s-sglang-benchmark-serving)的基准测单服务器 TTFT 和 token 间延迟。若长 prompt 到达时 token 间延迟上升，分离可能有帮助。拆分后观察以下指标 {{code}}：

- `sglang:num_bootstrap_failed_reqs_total` 和 `sglang:num_transfer_failed_reqs_total`，它们必须保持不增长。
- `sglang:kv_transfer_latency_ms` 和 `sglang:kv_transfer_speed_gb_s`，展示每次移动的代价。
- `sglang:num_decode_prealloc_queue_reqs` 和 `sglang:num_decode_transfer_queue_reqs`，展示等待内存或传输的请求数。

```takeaways
- 拆分前先测单服务器 TTFT 和 token 间延迟。
- 从一台 prefill 配一台 decode 开始，与单服务器比较。
- 所有请求通过网关发送，不直接发往角色服务器。
- prefill 记录 Aborted by AbortReq 时，先查路由器和客户端超时。
- 调整队列大小前，先升级传输库。
- 相信分离基准前，先检查重新分词后的输出 token。
- 根据自己的并发选择 prefill 与 decode 比例，再观察传输失败。
```

来源：python/sglang/srt/arg_groups/fields/disagg.py、python/sglang/srt/arg_groups/choices.py、python/sglang/srt/environ.py、python/sglang/srt/disaggregation/prefill.py、python/sglang/srt/disaggregation/decode.py、python/sglang/srt/disaggregation/base/conn.py (KVPoll)、python/sglang/srt/disaggregation/common/conn.py、python/sglang/srt/disaggregation/mooncake/conn.py、python/sglang/srt/managers/data_parallel_controller.py、python/sglang/srt/observability/metrics_collector.py、sgl-model-gateway/src/routers/http/pd_router.rs 和 pd_types.rs，以及 docs/docs/advanced_features/pd_disaggregation.mdx，均为 v0.5.22；capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt、capture/gpu/out-l4/bench-pd-swap.txt；issue #12591、#9266、#9926，PR #9803；Novita AI 发表于 Hugging Face 的文章，2026-01-22；dstack，Benchmarking Prefill-Decode ratios，2025-09-25；LMSYS，96 H100 部署，2025-05-05；Mooncake 团队发表于 LMSYS 博客的文章，2025-07-20；capture/gpu/incidents/l4-pd-summary-lines.txt；Li 等，Revisiting Disaggregated Large Language Model Serving for Performance and Energy Implications，arXiv 2601.08833（2025-11）。
