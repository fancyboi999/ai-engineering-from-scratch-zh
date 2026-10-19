# Prefill-decode 分离：--disaggregation-mode

> 分离将 prefill 移到独立服务器，让长 prompt 不再拖延其他用户的 token；只有实测问题确实来自这种干扰，它才值得采用。

聊天用户原本看到平滑输出，直到有人粘贴长文档。服务器为文档做 prefill 时，所有输出流暂停。Prefill 同时计算许多 token，decode 每步为每个请求计算一个 token。两者共享单台服务器的 GPU 步骤，长 prefill 占走这一步。分块 prefill 可以缩短停顿，却不能消除。

读完本节，你能解释 SGLang 如何将请求的 KV 缓存从 prefill 服务器移到 decode 服务器，也能启动最小分离部署，并根据测量决定是否需要它。

## 两台服务器，一个请求

**Prefill-decode 分离（PD）：** 两类 SGLang 服务器，分别以 `--disaggregation-mode prefill` 和 `--disaggregation-mode decode` 启动。默认 `null` 表示单台服务器完成两者 {{code}}。Prefill 服务器计算 prompt 的 KV 缓存和首个 token，decode 服务器接收缓存并生成其余 token。

SGLang 文档给出两个拆分理由 {{docs}}：prefill batch 会打断 decode batch；注意力数据并行时，一个组可能 prefill，另一个组 decode，decode 组每步必须等待最慢组。独立服务器消除这两种等待。每类池也能采用自己的并行布局，例如 prefill 用较宽 TP，decode 用注意力数据并行。

## KV 缓存如何移动

每次交换由[第 6.4 节](#s-sgl-model-gateway) 的网关发起。它选择一台 prefill 和一台 decode 服务器，为请求添加三个字段：prefill 的 bootstrap host、bootstrap port，以及一个称为 bootstrap room 的随机 63 位数字。随后同时向两台服务器发送同一个请求 {{code}}。

**Bootstrap room：** 两台服务器据此匹配同一请求各自部分的编号。可以把它理解为预订号：decode 服务器预订 KV 槽位，prefill 服务器向其中写入。

```figure
id: fig-6-3
kind: sequence
title: 一个分离部署请求
claim: Decode 服务器预留 KV 槽位并公布地址，prefill 服务器直接将 KV 页写入 decode 内存。
caption: 从上往下读。实线箭头为请求，青色箭头为内存写入，点线箭头为发往客户端的 token 流。依据 v0.5.22 的网关 PD 路由器、prefill/decode 调度器和 Mooncake 连接代码。
```

1. Decode 服务器创建接收器，通过 bootstrap 服务器找到 prefill rank，为 prompt 预留 KV 槽位。
2. 将槽位地址发送到 prefill 一侧。
3. Prefill 服务器对 prompt 执行普通 prefill 前向传播。
4. 将 KV 页写入 decode 服务器预留的槽位。默认 Mooncake 后端使用单边 RDMA 写入，并把两端连续页合成一次批量传输 {{code}}。
5. Decode 服务器发现传输完成，无须重新 prefill，就将请求加入运行 batch。
6. 客户端输出流来自 decode 服务器。

Bootstrap 服务器运行在 prefill 主机，默认端口 8998 {{code}}。两端用五种状态跟踪传输：Failed、Bootstrapping、WaitingForInput、Transferring、Success {{code}}。

```figure
id: fig-6-3b
kind: state
title: 一次传输的 KVPoll 状态
claim: 每次传输依次经过 bootstrap、等待、传输，最终成功；任何阶段都可能失败。
caption: 从左向右读。数字为 KVPoll 类中的值。琥珀色箭头为状态变化，玫瑰色为失败。依据 v0.5.22 基础连接代码。
```

## 重要设置

| 设置 | 默认值 | 含义 |
|---|---|---|
| `--disaggregation-mode` | `null` | 两个角色分别为 `prefill` 或 `decode` |
| `--disaggregation-transfer-backend` | `mooncake` | 另有 `mooncake_tcp`、`nixl`、`mori`、`ascend`、`fake` |
| `--disaggregation-bootstrap-port` | 8998 | prefill 主机的 bootstrap 服务端口 |
| `--num-reserved-decode-tokens` | 512 | 请求加入运行 batch 时，内存中预留的 decode token 数 |
| `SGLANG_DISAGGREGATION_BOOTSTRAP_TIMEOUT` | 300 | prefill 等待 decode 槽位地址的秒数 |
| `SGLANG_DISAGGREGATION_WAITING_TIMEOUT` | 300 | decode 等待 KV 页的秒数 |
| `SGLANG_DISAGGREGATION_QUEUE_SIZE` | 4 | 并行传输队列数 |

默认值均来自 v0.5.22 代码 {{code}}。`mooncake_tcp` 适用于没有 RDMA 网卡的集群，我们没有测量它的速度。

不要直接请求 prefill 或 decode 服务器。调度器会断言 bootstrap room 存在，错误信息为“Do not send requests directly to prefill or decode instances; send to the router instead” {{code}}。

## 我们的建议

不要从分离部署开始。先用单服务器，再在网关后添加数据并行副本。只有实测证明，在服务并发下 prefill 干扰损害 token 间延迟，才拆分两者。分离增加了另一组故障：bootstrap、RDMA 传输、两个超时，以及必须正确配对服务器的路由器。

一次真实事故展示跳过测量的代价。用户各运行一台 TP4 的 prefill 和 decode 服务器（[issue #12591](https://github.com/sgl-project/sglang/issues/12591)），TTFT 却高于不分离的单台 TP4。原因是旧 Mooncake 传输引擎，升级后修复。维护者还建议，在不使用注意力数据并行时设置 `SGLANG_DISAGGREGATION_QUEUE_SIZE=1`。没有单服务器基线，就没人能知道分离让结果更差。

## 另两次事故，都来自路由器

GLM-4.5 部署在并发 64 时，prefill 端记录大量“Prefill bootstrap failed”和“Aborted by AbortReq”（[issue #9266](https://github.com/sgl-project/sglang/issues/9266)）；并发四至七却正常。路由器给 prefill 客户端的超时太短，中止了仍在运行的请求。[PR #9803](https://github.com/sgl-project/sglang/pull/9803) 修复了超时。

维护者在相关讨论中给出一般规则（[issue #9926](https://github.com/sgl-project/sglang/issues/9926)）：“Aborted by AbortReq”意味着客户端或路由器主动中止。怀疑传输前，先查超时。

Novita AI 在 H200 上运行 GLM-4.7 时发现另一种延迟 {{field Novita 2026-01}}。分离搭配重叠调度器，吞吐量提高约 10%，TTFT 却严重恶化。Prefill 端的 KV 传输等待下一 batch 的内核启动；没有 CUDA graphs 时，他们 92 层模型的启动需要数百毫秒。修复新增了 `--disaggregation-async-transfer` 参数。我们在 v0.5.22 代码中找不到它，复制命令前先核对版本。

## 每台 decode 应配多少 prefill

比例取决于流量。dstack 在八张 H200 上，用 SGLang 分离部署和纯张量并行测试 gpt-oss-120b {{field dstack 2025-09}}。高并发下，一台 prefill 配三台 decode，在 prefill 重、decode 重、均衡三类负载中，各指标都胜出。低并发下，三比一、二比二的 TTFT 更好。[文章](https://dstack.ai/blog/benchmarking-pd-ratios/) 只有图表、无绝对数字，因此只能作为方向参考。

最大规模的例子中，SGLang 团队报告使用每节点八张 H100 的配置运行 DeepSeek，并列出 4 个 prefill 节点和 9 个 decode 节点；原报告同时称总计 12 个节点，与这组分配不一致，不能据此核算总 GPU 数 {{team 2025-05}}。他们报告输入长度 2000 token 时，每节点每秒输入 52.3k、输出 22.3k token。Mooncake 团队则报告 Kimi K2 在 128 张 H200 上使用 4 个 prefill、12 个 decode 节点 {{team 2025-07}}。更多节点分给 decode，是为了让 KV 池能容纳大小 480 的 batch。两份都是系统建设团队自己的报告。

## 两张 L4 上发生了什么

我们将 Qwen3-8B 拆为第一张 L4 的 prefill 服务器和第二张 L4 的 decode 服务器。两张卡没有 RDMA，因此使用 `--disaggregation-transfer-backend mooncake_tcp`。第二张卡还运行另一团队的 pod，decode 池只有 2,925 token，prefill 为 24,094。随后通过路由器运行[第 5.1 节](#s-sglang-benchmark-serving) 的开环扫描。

```listing
title: KV 传输队列填满，会话终止
source: capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt
lang: text
note: 来自 prefill、decode 日志和每秒 8 请求基准结果的行。省略时间戳。
---
… Decode batch, #running-req: 2, #token: 1206, token usage: 0.41, pre-allocated usage: 0.00, #prealloc-req: 19, #transfer-req: 0, #retracted-req: 0
… TCP lane queue-full rejection count: 4096
… Session 151.242.195.41:15367 failed.
Prefill transfer failed lines: 2902
Successful requests:                     240
Total generated tokens (retokenized):    0
Mean TTFT (ms):                          0.00
```

Decode 一次只能运行两个请求，另外 19 个等待 decode 内存。Prefill 不断为它们生成 KV 缓存，发往 decode 的 TCP 传输队列填满。扫描开始三分钟后，传输会话失败，此后没有恢复，所有后续请求传输均失败。

危险之处发生在后面。每个失败请求通过路由器仍返回 HTTP 200，但没有文本。基准把 240 个请求全部计为成功，还打印出比 FP8 服务器更高的吞吐量。只有两个数字露出了问题：重新分词后的输出 token 数为零，平均 TTFT 为 0.00 ms。

我们没有发布那些吞吐量数字。现在工具会拒绝所有请求 TTFT 均为 0 的运行。我们正在将 decode 放到更大池上重新测量。阅读任何分离部署基准的吞吐量前，先检查 `Total generated tokens (retokenized)`。

## 应该测什么

先用[第 5.1 节](#s-sglang-benchmark-serving) 基准，测单服务器 TTFT 与 token 间延迟。长 prompt 到达时 token 间延迟上升，分离可能有用。拆分后观察以下指标 {{code}}：

- `sglang:num_bootstrap_failed_reqs_total` 和 `sglang:num_transfer_failed_reqs_total`，应保持不增长。
- `sglang:kv_transfer_latency_ms` 和 `sglang:kv_transfer_speed_gb_s`，展示每次移动的成本。
- `sglang:num_decode_prealloc_queue_reqs` 和 `sglang:num_decode_transfer_queue_reqs`，展示等待内存或传输的请求。

```takeaways
- 拆分前，先测单服务器 TTFT 与 token 间延迟。
- 从一台 prefill、一台 decode 开始，并与单服务器比较。
- 所有请求通过网关，不要直接发给角色服务器。
- Prefill 出现 Aborted by AbortReq 时，先检查路由器和客户端超时。
- 调整队列大小前，先升级传输库。
- 相信分离部署基准前，检查重新分词后的输出 token 数。
- 根据自己的并发选择 prefill/decode 比例，随后观察传输失败。
```

来源：python/sglang/srt/arg_groups/fields/disagg.py, python/sglang/srt/arg_groups/choices.py, python/sglang/srt/environ.py, python/sglang/srt/disaggregation/prefill.py, python/sglang/srt/disaggregation/decode.py, python/sglang/srt/disaggregation/base/conn.py (KVPoll), python/sglang/srt/disaggregation/common/conn.py, python/sglang/srt/disaggregation/mooncake/conn.py, python/sglang/srt/managers/data_parallel_controller.py, python/sglang/srt/observability/metrics_collector.py, sgl-model-gateway/src/routers/http/pd_router.rs and pd_types.rs, and docs/docs/advanced_features/pd_disaggregation.mdx, all at v0.5.22. capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt. Issues #12591, #9266, #9926, pull request #9803. Novita AI on Hugging Face, 2026-01-22. dstack, "Benchmarking Prefill-Decode ratios", 2025-09-25. LMSYS, 96 H100 deployment, 2025-05-05. The Mooncake team on the LMSYS blog, 2025-07-20.
