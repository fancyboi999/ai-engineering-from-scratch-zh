---
name: vllm-scheduler-reader
description: 读取调度器层面的参数来诊断 vLLM 服务配置，判断 PagedAttention、continuous batching 和 chunked prefill 中哪一个是瓶颈。
version: 1.0.0
phase: 17
lesson: 04
tags: [vllm, paged-attention, continuous-batching, chunked-prefill, serving, scheduler]
---

给定一份 vLLM 服务配置（模型、dtype、硬件、`--gpu-memory-utilization`、`--max-num-batched-tokens`、`--enable-chunked-prefill`、`--speculative-config`、最大并发），以及一组实测指标（TTFT 均值/P99、ITL 均值/P99、吞吐 tok/s），给出调度器层面的诊断。

输出以下内容：

1. 解读配置。对每个参数，写出它控制的调度器行为和 2026 年的默认值。标出所有被设成非默认值的参数，并说明原因。
2. 定位瓶颈。把瓶颈归为以下之一：PagedAttention 配额不足（KV block 饥饿）、continuous batching 停滞（WAITING 队列增长）、chunked prefill 大小不当（ITL 尾部尖刺）、decode 计算受限（ITL 下限）、HBM 受限（batch 放不下）。用上报的指标说明理由。
3. 参数建议。给出具体、有先后顺序的操作：改哪个参数、试什么值、看哪个指标。在调度器层面的调优用尽之前，不要建议"多加几张 GPU"。
4. 兼容性检查。对照配置中具体 vLLM 版本的兼容性矩阵，检查每一对已开启的特性。v0.18.0 的矩阵标明 speculative decoding 与 chunked prefill 和 prefix caching 兼容。
5. 延伸阅读。根据诊断暴露的问题，指向 vLLM v0.18.0 发布说明、PagedAttention 论文或 Aleksa Gordic 的 V1 调度器解读之一。

直接否决：
- 没有四项核心指标（TTFT、ITL、吞吐、并发）就做诊断。拒绝，并索要指标。
- 不检查 speculative decoding 配置就推荐 `--enable-chunked-prefill`。
- 把 `DCGM_FI_DEV_GPU_UTIL` 当作扩缩容信号。vLLM 会预分配 KV；占空比数字有误导性。

拒绝规则：
- 如果 H100 上报的吞吐低于 100 tok/s，瓶颈多半不在 vLLM。检查客户端的分词器、Python GIL 或请求级串行化。
- 如果 `--gpu-memory-utilization` 低于 0.7，拒绝继续调优。运维主动留下了 HBM 没用，先提高这个上限，再动调度器参数。
- 如果运维要 speculative decoding + chunked prefill 的配方，回答前先对照其 vLLM 版本的兼容性矩阵检查这个组合，并指向阶段 17 · 05 的 EAGLE-3 作为 draft 方法。

输出：一页调度器诊断，列出参数、瓶颈、有序建议、兼容性说明和延伸阅读指引。最后用一段"接下来测什么"，根据定位到的瓶颈，从 P99 ITL、block 分配速率或 WAITING 队列深度中选一个。
