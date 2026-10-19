# 事故索引

> 本表列出手册中的全部失败案例、现象、原因、修复或状态，以及解释它的章节。

各节用真实事故支撑论证，来源为 SGLang 或 Miles issue、PR、实践报告或上游捕获记录。本索引按部分列出，可按自己日志中的现象查找。开放或关闭状态由上游于 2026-10-16 核对，不能视作当前状态。

## 上游捕获

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| 并发 32 内存耗尽 (capture/out/oom-exploratory.log) | Metal 报告 `Insufficient Memory`，整棵服务进程树退出 | 池占据启动所见空闲内存的 87% | `--mem-fraction-static 0.4` | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| `--disable-overlap-schedule` on MLX (capture/out/server-no-overlap.log) | 首个真实批次发生 `RuntimeError`，随后退出 -9 | 关闭重叠的路径仍将两设备的 tensor 传给 `FutureMap.stash` | 0.5.22 仍存在，保持重叠开启 | [2.4](#s-the-overlap-scheduler) |
| 进程组 SIGTERM (capture/out/server-default.log) | 关闭时日志报告崩溃 | scheduler 子进程先退出，父进程因此走崩溃路径，未排空 | 只向主进程发 SIGTERM | [7.1](#s-operating-sglang) |
| GB10 内存保护 (capture/gpu/incidents/gb10-memory-guard-pauses.txt) | 启动停在 `Load weight end`，SGLang 日志无错误 | 机器保护守护程序暂停了 5 秒内增长最多 36.7 GiB 的 scheduler | 为服务配置保护规则或与所有者协商暂停保护 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| GB10 驱动 `NV_ERR_NO_MEMORY` (capture/gpu/incidents/gb10-driver-no-memory.txt) | 内核日志出现成批驱动内存耗尽行 | 错误与 KV 池分配发生在同一分钟 | 各服务均变为健康；按健康状态报警，别只看该行 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| 缺少 CUDA toolkit 的 L4 主机上 pip 安装 (capture/gpu/incidents/l4-toolchain-failures.txt) | 四次启动依次因 `Python.h`、`nvcc`、FlashInfer 头文件、`-lcudart` 失败 | 启动时内核编译器需要完整工具链 | 使用镜像或装有完整 CUDA toolkit 的主机 | [7.1](#s-operating-sglang) |
| 设置 `HF_HUB_OFFLINE=1` 的基准 | 模型均在磁盘，`random` 数据集仍失败 | 数据集要从 Hugging Face Hub 下载 ShareGPT | 使用 `--dataset-name random-ids` 或本地 `--dataset-path` | [7.1](#s-operating-sglang) |
| Qwen3-30B-A3B 的 EAGLE-3 草稿 | 启动拒绝：目标上下文 262144 大于推导值 2048 | 草稿配置声明 2,048 个位置 | 按 SGLang cookbook 设置 `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1`。Qwen3-8B 草稿声明 40,960，无需它即可启动 | [4.4](#s-speculative-decoding) |
| L4 扫描热降频 (capture/gpu/incidents/l4-thermal-throttle.txt) | CUDA graphs 无收益，同点不同种子相差 49% | GPU 0 达 87 °C，时钟仅 360 MHz（上限 2,040 MHz），热降速开启 | 每次运行记录 GPU 时钟和温度 | [5.1](#s-sglang-benchmark-serving) |
| 默认服务上的温度 0 (capture/gpu/out-gb10/determinism.txt) | GB10 上五次相同请求产生两种答案 | 上游未隔离原因 | `--enable-deterministic-inference` 使五次只产生一种答案 | [4.6](#s-deterministic-inference-and-logprobs) |

## 第 1、2 部分：请求路径

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| LinkedIn 实践报告, 2026-02 | 小型排序模型的 P99 达数秒 | 分词、ZMQ 消息、垃圾回收、GIL、调度器 | 批量分词、评分路径、预热后 `gc.freeze`（PR 9241） | [1.2](#s-one-request-end-to-end), [2.1](#s-sglang-serve-and-the-three-processes) |
| [#36889](https://github.com/sgl-project/sglang/issues/36889) | 接受 `--max-running-requests 8`，但两流即达吞吐上限 | Mamba 状态缓存将运行请求限制为 2 | 仅一条 info 行报告该限制 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| [#8463](https://github.com/sgl-project/sglang/issues/8463) | 反复 `KV cache pool is full. Retract requests.`，随后健康检查失败 | 回撤无法释放足够内存并反复循环 | 未修复即关闭；0.5.22 中止最后一个请求 | [2.3](#s-admission-and-retraction) |
| [#26248](https://github.com/sgl-project/sglang/issues/26248) | 回撤后 decode 从约 429 降至 20至38 token/s | 未记录 | 因不活跃关闭 | [2.3](#s-admission-and-retraction) |
| [#14972](https://github.com/sgl-project/sglang/issues/14972) | 开启重叠，使用率 94% 时在 `KV cache pool is full` 后分配失败 | 回撤未考虑一步后完成的请求 | PR [#15626](https://github.com/sgl-project/sglang/pull/15626) 未合入即关闭；0.5.22 调度器已处理 | [2.4](#s-the-overlap-scheduler) |
| [#34740](https://github.com/sgl-project/sglang/issues/34740) | 反分词工作量随输出长度平方增长 | 始终无法组成字符的字节 token 让偏移量无法前进 | 开放 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |

## 第 3 部分：KV 缓存

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#39675](https://github.com/sgl-project/sglang/issues/39675) | Apple MPS 首个 prefill 内存耗尽 | 容量未知导致比例 0.95 | 设置 `--mem-fraction-static` | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#42510](https://github.com/sgl-project/sglang/issues/42510) | 草稿池分配失败 | 计算目标池时草稿模型副本仍驻留 | 已报告 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#6027](https://github.com/sgl-project/sglang/issues/6027) | 64K-token DeepSeek-V3 prompt 在注意力中内存耗尽 | 日志报告可容纳 274,934 个 KV token，注意力仍耗尽内存 | 降低比例 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| [#43201](https://github.com/sgl-project/sglang/issues/43201) | 旧文章描述已不存在的 `ChunkCache` | 该类于 2026-10-08 删除 | `--disable-radix-cache` 构造禁用的 `UnifiedRadixCache` | [3.3](#s-radixcache) |
| [#32459](https://github.com/sgl-project/sglang/issues/32459) | 开启 EAGLE 后深层 prompt 命中率从 97% 降到 40至53% | 推测解码额外 KV 可能迫使树淘汰 prompt | 每添加功能都测命中率 | [3.3](#s-radixcache) |
| [#35129](https://github.com/sgl-project/sglang/issues/35129) | 命中率 66.8%，HiCache 回载淘汰其他会话 | System prompt 的随机哈希、轮换消息，以及没有空间时的回载 | 修改 prompt 后命中率升到 94.4% | [3.4](#s-prefix-friendly-prompts), [3.5](#s-eviction-policies-and-hicache) |
| Jarvislabs 实践报告, 2026-08 | 23% 输入 token 被重算 | 请求路由到没有其前缀的服务器 | 用一个 header 将各会话固定到一张 GPU，命中率 64.7% 升到 92.1% | [3.4](#s-prefix-friendly-prompts), [6.4](#s-sgl-model-gateway) |
| [#30760](https://github.com/sgl-project/sglang/issues/30760) | 一个张量并行 rank 永久等待预取，其余继续 | 未记录 | 已报告 | [3.5](#s-eviction-policies-and-hicache) |
| [#42465](https://github.com/sgl-project/sglang/issues/42465) | 开启 HiCache 时，540,000-token prompt 突发挂住全部 rank | 未记录 | 关闭 HiCache 后相同 prompt 可运行 | [3.5](#s-eviction-policies-and-hicache) |
| [#39830](https://github.com/sgl-project/sglang/issues/39830) | 20 次主机层命中全部流畅回答另一 prompt | 混合线性注意力模型的 HiCache 主机层命中 | 信任缓存前先测试混合模型 | [3.6](#s-hybrid-models-and-the-cache) |
| [#22935](https://github.com/sgl-project/sglang/issues/22935) | 相同 prompt 未复用 token | 节点拆分创建了没有 Mamba 状态的节点 | 重复 prompt 时读 `#cached-token` | [3.6](#s-hybrid-models-and-the-cache) |
| [#37834](https://github.com/sgl-project/sglang/issues/37834) | 命中率从 88.2% 降到 65.9%，TTFT 从 226 ms 增到 1,063 ms | 某选项强制 `no_buffer` Mamba 策略 | 没有更好实测就保留 `--mamba-radix-cache-strategy auto` | [3.6](#s-hybrid-models-and-the-cache) |
| [#36131](https://github.com/sgl-project/sglang/issues/36131) | 混合 SWA 模型单流 decode 降低 | 新默认值释放窗口外 SWA 槽位 | 已报告 | [3.6](#s-hybrid-models-and-the-cache) |

## 第 4 部分：每次前向传播

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#23769](https://github.com/sgl-project/sglang/issues/23769) | DeepSeek-V4-Pro-FP8 在计算图捕获期间退出 | 注意力数据并行下，graph batch size 按 rank 计 | 缩小 graph batch size 或降低比例 | [4.1](#s-forwardmode-and-cuda-graphs) |
| [#36478](https://github.com/sgl-project/sglang/issues/36478) | Python API 的 `disable_piecewise_cuda_graph=True` 抛 `TypeError` | PR #23906 将字段移到按阶段的 graph 配置 | `cuda_graph_backend_prefill="disabled"` | [4.1](#s-forwardmode-and-cuda-graphs) |
| joshua8.ai 实践报告, 2026-01 | SM120 卡上 SGLang 只能 eager 运行，NVFP4 不可用 | 新架构支持问题 | 比较引擎前检查捕获和权重格式 | [4.1](#s-forwardmode-and-cuda-graphs), [4.3](#s-quantization) |
| [#17411](https://github.com/sgl-project/sglang/issues/17411) | H20 的 ITL 中位数从 39.44 ms 增至 283.52 ms | FlashInfer 0.6.1 使 Hopper 注意力内核退化 | SGLang 将 `fa3` 设为 Hopper 默认 | [4.2](#s-attention-backend) |
| Cloudflare 实践报告, 2026-08 | BF16 KV 缓存在并发 64 时内存耗尽 | 缓存装不下 | FP8 KV 可容纳两倍 token | [3.1](#s-kv-bytes-per-token-and-the-kv-pool), [4.3](#s-quantization) |
| Pivot News 摘要, 2026-05 | RTX 4090 加入时混合集群崩溃 | FP4 路径要求计算能力 10.0 | 旧卡无软件路径 | [4.3](#s-quantization), [5.3](#s-reading-other-peoples-benchmarks) |
| [#5274](https://github.com/sgl-project/sglang/issues/5274) | 并发 20 时 EAGLE-3 使吞吐量从 217.8 降至 164.4 token/s | 推测计算争用满批次需要的算力 | 小批次运行推测解码 | [4.4](#s-speculative-decoding) |
| [#6783](https://github.com/sgl-project/sglang/issues/6783) | 10K 输入时接受长度降至 1.2 token | 草稿配置只有 2,048 位置，且无 rope scaling | 草稿配置增加 rope scaling 和 131,072 位置 | [4.4](#s-speculative-decoding) |
| David Noel Ng 实践报告, 2026-08 | DeepSeek-V4-Flash 接受长度 1.3至1.8 token | 草稿加载器未映射共享专家权重 | PR [#33276](https://github.com/sgl-project/sglang/pull/33276) | [4.4](#s-speculative-decoding) |
| [#37707](https://github.com/sgl-project/sglang/issues/37707) | 字符串字段接受短于 `minLength` 的值 | 同时有 `pattern` 时 xgrammar 丢弃长度规则 | 开放 | [4.5](#s-structured-outputs-with-xgrammar) |
| [#38863](https://github.com/sgl-project/sglang/issues/38863) | 推测解码下 bitmask CPU 时间随输出长度增长 | rollback 方法每次复制调试列表 | 开放 | [4.5](#s-structured-outputs-with-xgrammar) |
| [#43055](https://github.com/sgl-project/sglang/issues/43055) | gpt-oss-20b 在 prefix 模式产生不同贪心输出 | 确定性 Triton 内核按裁剪前缀对齐 KV tile | 开放 | [4.6](#s-deterministic-inference-and-logprobs) |
| [#43413](https://github.com/sgl-project/sglang/issues/43413), [#36174](https://github.com/sgl-project/sglang/issues/36174), [#31261](https://github.com/sgl-project/sglang/issues/31261) | 确定性模式不覆盖 Mamba2 混合、DeepSeek-V4 或 Qwen3.5 | 这些架构没有批次不变内核 | 尚未支持 | [4.6](#s-deterministic-inference-and-logprobs) |
| [#39597](https://github.com/sgl-project/sglang/issues/39597) | DFLASH 重启后贪心文本变化 | FlashInfer 自动调优选择了其他内核策略 | `--disable-flashinfer-autotune` 或确定性模式 | [4.6](#s-deterministic-inference-and-logprobs) |

## 第 5 部分：测量

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#3196](https://github.com/sgl-project/sglang/issues/3196) | 八张 H200 上 DeepSeek V3 只有 13 token/s | 脚本数词而非 token，且把 TTFT 算入速率 | 使用基准客户端测量 | [5.1](#s-sglang-benchmark-serving) |
| `sglang:utilization` | 繁忙服务器的 gauge 仍为 0 | 代码注释关联 #22713 的回归 | 使用队列与延迟序列 | [5.2](#s-the-metrics-endpoint) |
| [#35884](https://github.com/sgl-project/sglang/issues/35884) | 失败健康探测增加负载 | 超时 `/health` 调用未取消自身请求 | 将探测失败视为一个现象 | [5.2](#s-the-metrics-endpoint), [7.1](#s-operating-sglang) |
| [#22511](https://github.com/sgl-project/sglang/issues/22511) | GLM-5 高负载时出现 “health check failed” | 负载下 20 秒无输出到达 detokenizer | 用 `/ready` 作就绪检查 | [5.2](#s-the-metrics-endpoint), [7.1](#s-operating-sglang) |
| AIMultiple, 2026-01 | 至少五篇文章重复“SGLang 快 29%” | 来自列出 SGLang v0.2.3 的一次离线测试 | 忽略不带版本的结果 | [1.1](#s-what-a-serving-engine-owns), [5.3](#s-reading-other-peoples-benchmarks) |
| [vLLM discussion #17221](https://github.com/vllm-project/vllm/discussions/17221) | 看起来 SGLang 只用 7 GB，对方 21 GB | 参数对应错误：`--context-length` 对应 `--max-model-len` | 使用对应参数比较 | [5.3](#s-reading-other-peoples-benchmarks) |

## 第 6、7 部分：集群与运维

| 事故 | 现象 | 原因 | 修复或状态 | 章节 |
|---|---|---|---|---|
| [#19953](https://github.com/sgl-project/sglang/issues/19953) | 跨节点注意力数据并行在首消息挂起 | IPv6 `--dist-init-addr` 配上未启用 IPv6 的 ZeroMQ socket | 有修复提案，上游未确认合入 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| [#9787](https://github.com/sgl-project/sglang/issues/9787) | 一个 prefill GPU 空闲，随后全部 prefill 进程崩溃 | DeepEP dispatch 路由失衡，向一张 GPU 发太多 token | 缩小块、调专家布局、使用 EPLB | [6.2](#s-moe-serving-deepep-and-eplb) |
| [#12591](https://github.com/sgl-project/sglang/issues/12591) | 分离后的 TTFT 高于单服务器 | 旧 Mooncake transfer engine | 升级 Mooncake | [6.3](#s-prefill-decode-disaggregation) |
| [#9266](https://github.com/sgl-project/sglang/issues/9266) | 并发 64 时 “Prefill bootstrap failed” | Router 的 prefill 客户端超时太短 | PR [#9803](https://github.com/sgl-project/sglang/pull/9803) | [6.3](#s-prefill-decode-disaggregation) |
| [#9926](https://github.com/sgl-project/sglang/issues/9926) | “Aborted by AbortReq” 错误 | 客户端或 router 中止请求 | 检查传输前的超时 | [6.3](#s-prefill-decode-disaggregation) |
| Novita AI 实践报告, 2026-01 | 分离与重叠同时开启时 TTFT 大幅恶化 | KV 传输等待下一次内核启动 | 他们使用的参数不在 0.5.22 代码中 | [6.3](#s-prefill-decode-disaggregation) |
| [#22095](https://github.com/sgl-project/sglang/issues/22095) | GB200 NVL72 吞吐量退化一半 | SGLang 外部的 router 版本改变 | 与引擎一起固定并测试 router | [6.4](#s-sgl-model-gateway) |
| [#10608](https://github.com/sgl-project/sglang/issues/10608) | `cache_aware` 下 “Failed to select prefill/decode worker” | 分离路由与 Kubernetes 服务发现 | 用户改为轮询 | [6.4](#s-sgl-model-gateway) |
| CERIT-SC 实践报告, 2026-04 | 思考输出含工具调用、偶发挂起、循环占住 KV | 超长 prompt 的 agent 流量 | 32K 输出上限与 presence penalty | [7.1](#s-operating-sglang) |
| Doubleword 实践报告, 2026-04 | 冷启动 695 秒 | 权重加载 531 秒，加冷内核缓存 | 持久化缓存与进程 checkpoint 降到 9.6 秒 | [7.1](#s-operating-sglang) |
| [radixark/miles#860](https://github.com/radixark/miles/issues/860) | 滑动窗口模型的 `/release_memory_occupation` 无效 | SWA 池关闭 memory saver | 开放 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#1485](https://github.com/radixark/miles/issues/1485) | 张量并行 2 时 `down_proj` 输出不同 | 两引擎对 BF16 部分结果的求和顺序不同 | 开放 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#3714](https://github.com/radixark/miles/issues/3714) | 权重传输失败并报告 `Message truncated` | 确定性服务将 NCCL 通道限为 8，训练端用 24 | 开放 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| [radixark/miles#3277](https://github.com/radixark/miles/issues/3277) | 回撤后新 MoE 路由与旧对数概率并存 | 新权重下的重新 prefill 覆盖已记录路由 | 开放 | [7.2](#s-sglang-as-an-rl-rollout-engine) |

Sources: the incident paragraphs of every section under sections/; capture/out/oom-exploratory.log, server-no-overlap.log, server-default.log; capture/gpu/incidents/gb10-memory-guard-pauses.txt, gb10-driver-no-memory.txt, l4-toolchain-failures.txt, l4-thermal-throttle.txt; capture/gpu/out-gb10/determinism.txt and deterministic-determinism.txt; docs/cookbook/specbundle/specbundle_usage.mdx at v0.5.22; the GitHub issues and pull requests linked in the tables.
