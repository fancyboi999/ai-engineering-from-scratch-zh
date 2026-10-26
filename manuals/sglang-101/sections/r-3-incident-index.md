# 事故索引

> 本表汇总手册讲述的故障，包括症状、原因、修复或状态，以及解释该事故的章节。

各节将真实事故作为证据，来源包括 SGLang 或 Miles issue、PR、实践报告及我们的捕获记录。本索引按部分排列，方便你用自己日志中的症状搜索。开放或关闭状态核验于 2026-10-16。

## 我们的捕获记录 {#s-ref-incident-index-our-capture}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| 并发 32 时内存耗尽（[日志](manuals/sglang-101/capture/out/oom-exploratory.log)） | Metal 报告 `Insufficient Memory`，整个服务器进程树退出 | 池占用了启动时所见空闲内存的 87% | `--mem-fraction-static 0.4` | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| MLX 上的 `--disable-overlap-schedule`（[日志](manuals/sglang-101/capture/out/server-no-overlap.log)） | 首个真实 batch 报 `RuntimeError`，随后服务器通过 SIGQUIT 退出并终止进程树 | 非重叠路径仍调用 `FutureMap.stash`，张量位于两个设备 | 0.5.22 尚未解决，保持重叠开启 | [2.4](#s-the-overlap-scheduler) |
| 向进程组发 SIGTERM（[日志](manuals/sglang-101/capture/out/server-default.log)） | 关闭时日志报告崩溃 | 调度器子进程先退出，父进程进入崩溃路径，未排空请求 | 只向主进程发送 SIGTERM | [7.1](#s-operating-sglang) |
| GB10 内存保护（[记录](manuals/sglang-101/capture/gpu/incidents/gb10-memory-guard-pauses.txt)） | 启动在调度器分配 KV 池时停止，未保留这些启动的服务器日志 | 主机保护守护进程暂停了调度器，其内存在 5 s 内增长至 36.7 GiB | 停止保护程序，或为服务器调整其配置 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| GB10 驱动 `NV_ERR_NO_MEMORY`（[记录](manuals/sglang-101/capture/gpu/incidents/gb10-driver-no-memory.txt)） | 内核日志突发驱动内存不足信息 | 突发发生在首次启动的 2026-10-16，未保留当日服务器日志，无法逐一对应启动 | 后续捕获中各服务器均变为健康，应对健康状态告警，不能只凭该行 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| 无 CUDA toolkit 的 L4 主机 pip 安装（[记录](manuals/sglang-101/capture/gpu/incidents/l4-toolchain-failures.txt)） | 四次启动依次因 `Python.h`、`nvcc`、FlashInfer 头文件及 `-lcudart` 失败 | 启动时的内核编译器需要完整工具链 | 使用镜像或具备完整 CUDA toolkit 的主机 | [7.1](#s-operating-sglang) |
| `HF_HUB_OFFLINE=1` 下的基准，未保留日志 | 所有模型均在磁盘上，`random` 数据集仍失败 | 数据集从 Hugging Face Hub 下载 ShareGPT | `--dataset-name random-ids` 或本地 `--dataset-path` | [7.1](#s-operating-sglang) |
| L4 上的 `--chunked-prefill-size 8192`（[记录](manuals/sglang-101/capture/gpu/incidents/l4-chunk-8192-prefill-graph-oom.txt)） | 启动以 PyTorch `INTERNAL ASSERT FAILED` 结束 | 8,192 token 的 prefill graph 需要的内存超过 KV 池剩下的 2.33 GB | 24 GB 卡保持默认分块 4,096 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| 第二张 L4 被共享时的 `--tp-size 2`（[记录](manuals/sglang-101/capture/gpu/incidents/l4-tp-unbalanced-memory.txt)） | 启动报 `RuntimeError: The memory capacity is unbalanced` | 另一用户的两个 pod 占用第二张 GPU 的 3.5 GB | 使用独占 GPU，或只用一张卡 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 两张 L4 通过 TCP 分离 prefill 和 decode（[记录](manuals/sglang-101/capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt)、[汇总行](manuals/sglang-101/capture/gpu/incidents/l4-pd-summary-lines.txt)） | 基准将所有请求记为成功，重新分词输出 token 为 0，平均 TTFT 为 0.00 ms | 发往小 decode 池的传输队列填满，传输会话失败 | 每次分离基准检查 `Total generated tokens (retokenized)` | [6.3](#s-prefill-decode-disaggregation) |
| L4 上的 vLLM FlashInfer 采样器（[记录](manuals/sglang-101/capture/gpu/incidents/l4-vllm-flashinfer-jit.txt)） | JIT 构建后报 `Engine core initialization failed` | 安装中的 CUDA 编译器与 CUDA toolkit 头文件不匹配 | 贪心基准使用 `VLLM_USE_FLASHINFER_SAMPLER=0` | [5.3](#s-reading-other-peoples-benchmarks) |
| Miles 使用 `--attn-implementation triton`（[日志](manuals/sglang-101/capture/gpu/out-miles/true-on-policy-error.log)） | `ValueError: Specified attn_implementation="triton" is not supported` | 训练器端不接受 Triton 后端 | 使用两端都支持的契约 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| GB10 上的 Miles true on-policy（[日志](manuals/sglang-101/capture/gpu/out-miles/true-on-policy-fa3-error.log)） | SGLang 因 FA3 SM 断言停止，作业随后在 63 分钟内记录约 200,000 条 `503`，却从未失败 | FA3 接受 SM 8.0 至 9.0，rollout 循环持续重试已死引擎 | 观察 SGLang 日志，核对 GPU 是否具备契约内核 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| Miles 负载下 GB10 关机（[记录](manuals/sglang-101/capture/gpu/incidents/gb10-boot-list.txt)） | 主机在 2026-10-18 关机三次 | 日志没有记录原因 | 脚本在 GPU 达到 84 C 时暂停容器 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| Qwen3-30B-A3B 的 EAGLE-3 草稿 | 拒绝启动：目标上下文 262144 大于推导值 2048 | 草稿配置声明 2,048 个位置 | 按 SGLang cookbook 设置 `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1`；Qwen3-8B 草稿声明 40,960 个位置，无此设置也能启动 | [4.4](#s-speculative-decoding) |
| L4 扫描的热降频（[记录](manuals/sglang-101/capture/gpu/incidents/l4-thermal-throttle.txt)） | CUDA graphs 没有收益，同一点不同 seed 相差 49% | GPU 0 为 87 °C，时钟只有 2,040 MHz 中的 360 MHz，热降频生效 | 每次运行记录 GPU 时钟与温度 | [5.1](#s-sglang-benchmark-serving) |
| 默认服务器温度 0（[日志](manuals/sglang-101/capture/gpu/out-gb10/determinism.txt)） | GB10 上 5 个相同请求产生 2 种回答 | 本次运行未隔离原因 | `--enable-deterministic-inference` 在 5 次中得到 1 种回答 | [4.6](#s-deterministic-inference-and-logprobs) |

## 第 1、2 部分：请求路径 {#s-ref-incident-index-part-1-and-part-2-the-request-path}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| LinkedIn 实践报告，2026-02 | 小排序模型的 P99 延迟达数秒 | 分词、ZMQ 消息、垃圾回收、GIL 和调度器 | 批量分词、打分路径、预热后 `gc.freeze`（PR 9241） | [1.2](#s-check-that-the-server-is-healthy)、[2.1](#s-sglang-serve-and-the-three-processes) |
| [#36889](https://github.com/sgl-project/sglang/issues/36889) | 接受 `--max-running-requests 8`，吞吐量却停在 2 条流 | Mamba 状态缓存把运行请求限制为 2 | 只有 info 日志报告此上限 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| [#8463](https://github.com/sgl-project/sglang/issues/8463) | 反复 `KV cache pool is full. Retract requests.`，随后健康检查失败 | retract 未能释放足够内存，反复发生 | 未修复即关闭；0.5.22 调度器会中止最后一个请求 | [2.3](#s-admission-and-retraction) |
| [#26248](https://github.com/sgl-project/sglang/issues/26248) | retract 后 decode 从约每秒 429 降至 20 至 38 token | 未记录 | 因不活跃关闭 | [2.3](#s-admission-and-retraction) |
| [#14972](https://github.com/sgl-project/sglang/issues/14972) | 开启重叠，使用率 94% 时出现 `KV cache pool is full`，随后分配失败 | retract 未计入晚一步完成的请求 | PR [#15626](https://github.com/sgl-project/sglang/pull/15626)未合并即关闭，0.5.22 调度器已处理此情况 | [2.4](#s-the-overlap-scheduler) |
| [#34740](https://github.com/sgl-project/sglang/issues/34740) | 反分词工作量随输出长度平方增长 | 无法组成完整字符的字节 token 一直不能推进 offset | 未关闭 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |

## 第 3 部分：KV 缓存 {#s-ref-incident-index-part-3-the-kv-cache}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#39675](https://github.com/sgl-project/sglang/issues/39675) | Apple MPS 首次 prefill 内存耗尽 | 未知容量使比例设为 0.95 | 设置 `--mem-fraction-static` | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#42510](https://github.com/sgl-project/sglang/issues/42510) | 草稿池分配失败 | 确定目标池大小时，草稿模型副本仍留在内存 | 已报告 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#6027](https://github.com/sgl-project/sglang/issues/6027) | 64K token 的 DeepSeek-V3 prompt 在注意力阶段内存耗尽 | 日志显示可容纳 274,934 个 KV token，注意力仍耗尽内存 | 降低内存比例 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#43201](https://github.com/sgl-project/sglang/issues/43201) | 旧文章描述的 `ChunkCache` 类已不存在 | 该类在 2026-10-08 删除 | `--disable-radix-cache` 构建禁用状态的 `UnifiedRadixCache` | [3.3](#s-radixcache) |
| [#32459](https://github.com/sgl-project/sglang/issues/32459) | EAGLE 下深层 prompt 命中率从 97% 降至 40% 至 53% | 推测所需额外 KV 迫使树驱逐 prompt | 每增加一项功能都测命中率 | [3.3](#s-radixcache) |
| [#35129](https://github.com/sgl-project/sglang/issues/35129) | 命中率 66.8%，HiCache 加载回 GPU 时驱逐其他会话 | system prompt 含随机哈希和轮换消息，加载回 GPU 时又没有空间 | 修改 prompt 后命中率升至 94.4% | [3.4](#s-prefix-friendly-prompts)、[3.5](#s-eviction-policies-and-hicache) |
| Jarvislabs 实践报告，2026-08 | 23% 输入 token 被重新计算 | 请求被发往没有其前缀的服务器 | 一个请求头将各对话固定到一张 GPU，命中率从 64.7% 升至 92.1% | [3.4](#s-prefix-friendly-prompts)、[6.4](#s-sgl-model-gateway) |
| [#30760](https://github.com/sgl-project/sglang/issues/30760) | 一个 TP rank 永久等待预取检查，其他 rank 已继续 | 未记录 | 已报告 | [3.5](#s-eviction-policies-and-hicache) |
| [#42465](https://github.com/sgl-project/sglang/issues/42465) | 开启 HiCache，突发 540,000 token 的 prompt 导致全部 rank 挂起 | 未记录 | 关闭 HiCache 后同样 prompt 可以运行 | [3.5](#s-eviction-policies-and-hicache) |
| [#39830](https://github.com/sgl-project/sglang/issues/39830) | 20 次主机层命中全部流畅回答了另一个 prompt | 混合线性注意力模型命中 HiCache 主机层 | 依赖缓存前测试混合模型 | [3.6](#s-hybrid-models-and-the-cache) |
| [#22935](https://github.com/sgl-project/sglang/issues/22935) | 完全相同的 prompt 未复用任何 token | 节点拆分创建了没有 Mamba 状态的节点 | 对重复 prompt 查看 `#cached-token` | [3.6](#s-hybrid-models-and-the-cache) |
| [#37834](https://github.com/sgl-project/sglang/issues/37834) | 命中率从 88.2% 降至 65.9%，TTFT 从 226 ms 升至 1,063 ms | 一个选项强制使用 `no_buffer` Mamba 策略 | 除非实测更好，否则保持 `--mamba-radix-cache-strategy auto` | [3.6](#s-hybrid-models-and-the-cache) |
| [#36131](https://github.com/sgl-project/sglang/issues/36131) | 混合 SWA 模型的单流 decode 变慢 | 新默认值释放窗口外的 SWA 槽位 | 已报告 | [3.6](#s-hybrid-models-and-the-cache) |

## 第 4 部分：每次前向传播 {#s-ref-incident-index-part-4-each-forward-pass}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#23769](https://github.com/sgl-project/sglang/issues/23769) | DeepSeek-V4-Pro-FP8 在 graph 捕获时退出 | 注意力数据并行下，graph batch 大小按每 rank 计算 | 减小 graph batch 或降低内存比例 | [4.1](#s-forwardmode-and-cuda-graphs) |
| [#36478](https://github.com/sgl-project/sglang/issues/36478) | Python API 的 `disable_piecewise_cuda_graph=True` 报 `TypeError` | PR #23906 将该字段移入按阶段的 graph 配置 | `cuda_graph_backend_prefill="disabled"` | [4.1](#s-forwardmode-and-cuda-graphs) |
| joshua8.ai 实践报告，2026-01 | SM120 卡只能以 eager 模式运行 SGLang，NVFP4 无法运行 | 新架构支持问题 | 比较引擎前检查捕获和权重格式 | [4.1](#s-forwardmode-and-cuda-graphs)、[4.3](#s-quantization) |
| [#17411](https://github.com/sgl-project/sglang/issues/17411) | H20 的 ITL 中位数从 39.44 ms 升至 283.52 ms | FlashInfer 0.6.1 的 Hopper 注意力内核退化 | SGLang 将 `fa3` 设为 Hopper 默认值 | [4.2](#s-attention-backend) |
| Cloudflare 实践报告，2026-08 | BF16 KV 缓存在并发 64 时内存耗尽 | 缓存装不下 | FP8 KV 缓存容纳两倍 token | [3.1](#s-kv-bytes-per-token-and-the-kv-pool)、[4.3](#s-quantization) |
| Pivot News 摘要，2026-05 | RTX 4090 加入混合集群后崩溃 | FP4 路径要求计算能力 10.0 | 旧卡没有软件执行路径 | [4.3](#s-quantization)、[5.3](#s-reading-other-peoples-benchmarks) |
| [#5274](https://github.com/sgl-project/sglang/issues/5274) | 并发 20 时，EAGLE-3 将吞吐量从每秒 217.8 降至 164.4 token | 推测消耗了完整 batch 需要的计算 | 在小 batch 运行推测 | [4.4](#s-speculative-decoding) |
| [#6783](https://github.com/sgl-project/sglang/issues/6783) | 10K 输入时接受长度降至 1.2 token | 草稿配置只有 2,048 位置，没有 rope 缩放 | 为草稿配置增加 rope 缩放和 131,072 位置 | [4.4](#s-speculative-decoding) |
| David Noel Ng 实践报告，2026-08 | DeepSeek-V4-Flash 接受长度为 1.3 至 1.8 token | 草稿加载器没有映射共享专家权重 | PR [#33276](https://github.com/sgl-project/sglang/pull/33276) | [4.4](#s-speculative-decoding) |
| [#37707](https://github.com/sgl-project/sglang/issues/37707) | 字符串字段接受短于 `minLength` 的值 | 同时有 `pattern` 时，xgrammar 丢弃该规则 | 未关闭 | [4.5](#s-structured-outputs-with-xgrammar) |
| [#38863](https://github.com/sgl-project/sglang/issues/38863) | 推测模式下，bitmask 的 CPU 时间随输出长度增长 | 回滚方法每次调用都复制调试列表 | 未关闭 | [4.5](#s-structured-outputs-with-xgrammar) |
| [#43055](https://github.com/sgl-project/sglang/issues/43055) | gpt-oss-20b 在前缀模式给出不同贪心输出 | 确定性 Triton 内核将 KV tile 对齐到裁剪后的前缀 | 未关闭 | [4.6](#s-deterministic-inference-and-logprobs) |
| [#43413](https://github.com/sgl-project/sglang/issues/43413)、[#36174](https://github.com/sgl-project/sglang/issues/36174)、[#31261](https://github.com/sgl-project/sglang/issues/31261) | 确定性模式未覆盖 Mamba2 混合模型、DeepSeek-V4 或 Qwen3.5 | 这些架构没有 batch 不变内核 | 尚不支持 | [4.6](#s-deterministic-inference-and-logprobs) |
| [#39597](https://github.com/sgl-project/sglang/issues/39597) | DFLASH 重启后贪心文本变化 | FlashInfer 自动调优选择其他内核策略 | `--disable-flashinfer-autotune` 或确定性模式 | [4.6](#s-deterministic-inference-and-logprobs) |

## 第 5 部分：测量 {#s-ref-incident-index-part-5-measuring}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#3196](https://github.com/sgl-project/sglang/issues/3196) | 八张 H200 上 DeepSeek V3 每秒仅 13 token | 脚本计数的是词，并把 TTFT 算入速率 | 使用基准客户端测量 | [5.1](#s-sglang-benchmark-serving) |
| `sglang:utilization` | 繁忙服务器 gauge 读数为 0 | 代码注释关联 #22713 的退化 | 使用队列与延迟序列 | [5.2](#s-the-metrics-endpoint) |
| [#35884](https://github.com/sgl-project/sglang/issues/35884) | 失败健康探针增加负载 | 超时 `/health` 调用未取消其请求 | 将探针失败视为一个症状 | [5.2](#s-the-metrics-endpoint)、[7.1](#s-operating-sglang) |
| [#22511](https://github.com/sgl-project/sglang/issues/22511) | GLM-5 高负载下 `health check failed` | 负载下 20 s 没有输出到达反分词器 | 就绪探针使用 `/ready` | [5.2](#s-the-metrics-endpoint)、[7.1](#s-operating-sglang) |
| AIMultiple，2026-01 | 至少五篇文章重复 SGLang 快 29% 的说法 | 一项离线测试列出的版本是 SGLang v0.2.3 | 忽略未提供版本的结果 | [1.3](#s-what-the-server-does-with-your-request)、[5.3](#s-reading-other-peoples-benchmarks) |
| [vLLM discussion #17221](https://github.com/vllm-project/vllm/discussions/17221) | SGLang 看起来只用 7 GB，对方 21 GB | 参数用错：对应 `--max-model-len` 的是 `--context-length` | 用匹配的参数比较引擎 | [5.3](#s-reading-other-peoples-benchmarks) |

## 第 6、7 部分：集群与运维 {#s-ref-incident-index-part-6-and-part-7-fleets-and-operations}

| 事故 | 症状 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#19953](https://github.com/sgl-project/sglang/issues/19953) | 跨节点注意力数据并行在首条消息挂起 | IPv6 `--dist-init-addr` 配合未开启 IPv6 的 ZeroMQ socket 绑定 | 已提出修复，无法确认合并 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| [#9787](https://github.com/sgl-project/sglang/issues/9787) | 一个 prefill GPU 空闲，随后所有 prefill 进程崩溃 | DeepEP 分派的不均衡路由向一张 GPU 发去过多 token | 减小分块、调优专家放置和开启 EPLB | [6.2](#s-moe-serving-deepep-and-eplb) |
| [#12591](https://github.com/sgl-project/sglang/issues/12591) | 分离后的 TTFT 高于单服务器 | 旧版 Mooncake 传输引擎 | 升级 Mooncake | [6.3](#s-prefill-decode-disaggregation) |
| [#9266](https://github.com/sgl-project/sglang/issues/9266) | 64 个并发请求时报 `Prefill bootstrap failed` | 路由器的 prefill 客户端超时太短 | PR [#9803](https://github.com/sgl-project/sglang/pull/9803) | [6.3](#s-prefill-decode-disaggregation) |
| [#9926](https://github.com/sgl-project/sglang/issues/9926) | `Aborted by AbortReq` 错误 | 客户端或路由器发起中止 | 检查传输前先查超时 | [6.3](#s-prefill-decode-disaggregation) |
| Novita AI 实践报告，2026-01 | 分离与重叠使 TTFT 大幅恶化 | KV 传输等待下次内核启动 | 他们的参数不在 0.5.22 代码中 | [6.3](#s-prefill-decode-disaggregation) |
| [#22095](https://github.com/sgl-project/sglang/issues/22095) | GB200 NVL72 上吞吐量退化两倍 | SGLang 外的路由器变更版本 | 一起固定并测试路由器与引擎 | [6.4](#s-sgl-model-gateway) |
| [#10608](https://github.com/sgl-project/sglang/issues/10608) | `cache_aware` 报 `Failed to select prefill/decode worker` | 分离和 Kubernetes 发现模式下的路由 | 用户改用轮询 | [6.4](#s-sgl-model-gateway) |
| CERIT-SC 实践报告，2026-04 | 推理输出中出现工具调用，罕见挂起，循环占用 KV | prompt 很长的 agent 流量 | 32K 输出上限和 presence penalty | [7.1](#s-operating-sglang) |
| Doubleword 实践报告，2026-04 | 冷启动 695 s | 权重加载 531 s，加上冷内核缓存 | 持久缓存与进程 checkpoint：9.6 s | [7.1](#s-operating-sglang) |
| [radixark/miles#860](https://github.com/radixark/miles/issues/860) | 滑动窗口模型 `/release_memory_occupation` 不起作用 | SWA 池关闭 memory saver | 未关闭 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#1485](https://github.com/radixark/miles/issues/1485) | TP2 下 `down_proj` 输出不同 | 两个引擎以不同顺序相加 BF16 部分结果 | 未关闭 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#3714](https://github.com/radixark/miles/issues/3714) | 权重传输报 `Message truncated` | 确定性服务将 NCCL 通道上限固定为 8，训练器使用 24 | 未关闭 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#3277](https://github.com/radixark/miles/issues/3277) | retract 后，新 MoE 路由搭配旧对数概率 | 新权重下重新 prefill 覆盖了所记录路由 | 未关闭 | [7.2](#s-sglang-as-an-rl-rollout-engine) |

来源：sections/ 下各节事故段落；capture/out/oom-exploratory.log、server-no-overlap.log、server-default.log；capture/gpu/incidents/gb10-memory-guard-pauses.txt、gb10-driver-no-memory.txt、l4-toolchain-failures.txt、l4-thermal-throttle.txt；capture/gpu/out-gb10/determinism.txt 和 deterministic-determinism.txt；v0.5.22 的 docs/cookbook/specbundle/specbundle_usage.mdx；表中链接的 GitHub issue 和 PR；capture/gpu/incidents/l4-chunk-8192-prefill-graph-oom.txt、capture/gpu/incidents/l4-tp-unbalanced-memory.txt、capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt、capture/gpu/incidents/l4-pd-summary-lines.txt、capture/gpu/incidents/l4-vllm-flashinfer-jit.txt、capture/gpu/incidents/gb10-boot-list.txt、capture/gpu/out-miles/true-on-policy-error.log、capture/gpu/out-miles/true-on-policy-fa3-error.log。
