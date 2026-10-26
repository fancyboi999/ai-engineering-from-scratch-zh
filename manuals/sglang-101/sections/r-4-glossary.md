# 术语表

> 以下术语在整本手册中含义一致，并标出首次定义它的章节。

每个术语只定义一次，位置见最后一列。定义来自固定标签的 SGLang 源码、捕获记录和各节引用的论文。

| 术语 | 本手册中的含义 | 定义章节 |
|---|---|---|
| 接受长度 | 每次 verify 提交的 token 数：接受的草稿 token，加一个奖励 token | [4.4](#s-speculative-decoding) |
| 注意力后端 | 为一个 batch 在分页 KV 缓存上计算注意力的类 | [4.2](#s-attention-backend) |
| 注意力数据并行 | 一个 TP 组内，注意力层以数据并行运行，前馈或专家层仍拆分在全部 GPU 上 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Batch 不变性 | 内核性质：归约顺序固定，因此一行的结果不依赖其他行 | [4.6](#s-deterministic-inference-and-logprobs) |
| Bootstrap room | prefill 与 decode 服务器用来找到同一请求另一半的编号 | [6.3](#s-prefill-decode-disaggregation) |
| 可断开的 graph | 遇到必须 eager 执行的操作时，结束当前捕获段，执行该操作，再开始下一段 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 捕获 bucket | SGLang 启动时为其记录 decode graph 的一个 batch 大小 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 并发（基准） | 所有请求端到端延迟之和除以运行时长 | [5.1](#s-sglang-benchmark-serving) |
| 约束解码 | 采样器选择 token 前，排除所有会违反语法的 token | [4.5](#s-structured-outputs-with-xgrammar) |
| Counter | 只增长的 Prometheus 累计值，通过窗口内速率读取 | [5.2](#s-the-metrics-endpoint) |
| CUDA graph | 固定形状和地址的内核启动记录，GPU 可通过一次 CPU 调用重放 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 数据并行（DP） | 多份完整模型，各有自己的请求和 KV 缓存 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Decode | 逐个生成后续 token 的循环，每个请求的每个 token 执行一次前向传播 | [1.3](#s-what-the-server-does-with-your-request) |
| DetokenizerManager | 将输出 token ID 转为文本并发回 TokenizerManager 的进程 | [2.1](#s-sglang-serve-and-the-three-processes) |
| 草稿模型 | 以低成本提出后续几个 token 的小模型或预测头 | [4.4](#s-speculative-decoding) |
| EPLB | 专家并行负载均衡器，记录专家使用情况并在 GPU 间移动专家 | [6.2](#s-moe-serving-deepep-and-eplb) |
| 专家并行（EP） | 每个 MoE 层的专家分散到 GPU，token 移到专家所在处 | [6.2](#s-moe-serving-deepep-and-eplb) |
| ForwardMode | batch 上的标签，告诉模型执行器运行哪类前向传播 | [4.1](#s-forwardmode-and-cuda-graphs) |
| Gauge | 调度器在每个日志间隔覆盖的值，因此抓取只看到最新值 | [5.2](#s-the-metrics-endpoint) |
| GEMM 后端 | 执行量化权重乘法的内核库 | [4.3](#s-quantization) |
| Goodput | 同时满足 TTFT 和 TPOT 目标的每秒请求数 | [1.3](#s-what-the-server-does-with-your-request) |
| 语法队列 | 语法尚在编译的请求列表 | [4.5](#s-structured-outputs-with-xgrammar) |
| 分组查询注意力 | 多个 query 头共享一个 key/value 头，因此 KV 头少于注意力头 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| HiCache | 分层缓存，将 radix tree 从 GPU 内存扩展到主机内存和存储 | [3.5](#s-eviction-policies-and-hicache) |
| Histogram | 每个 bucket 一个 counter 的集合，用窗口内速率读取百分位 | [5.2](#s-the-metrics-endpoint) |
| ITL | 将所有请求中相邻两个流式 chunk 的时间间隔汇总 | [5.1](#s-sglang-benchmark-serving) |
| KV 缓存 | 每层保存所有先前 token 的 key 和 value，让 decode 无须重复计算 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| KV 缓存 dtype | 缓存 key 和 value 的格式 | [4.3](#s-quantization) |
| KV 池 | 保存服务器保留的所有 token 的 key 和 value 的内存 | [1.2](#s-check-that-the-server-is-healthy) |
| L1、L2、L3 | HiCache 三层：GPU 池、固定主机内存池和可选共享存储后端 | [3.5](#s-eviction-policies-and-hicache) |
| Logprob | 服务器采样分布下，一个 token 的对数概率 | [4.6](#s-deterministic-inference-and-logprobs) |
| Mamba 层 | 每个序列保存一份固定大小状态的状态空间层或线性注意力层 | [3.6](#s-hybrid-models-and-the-cache) |
| 匹配率 | 新请求与网关树匹配的字符数，除以请求长度 | [6.4](#s-sgl-model-gateway) |
| 内存释放 | `POST /release_memory_occupation` 按标签释放 GPU 内存，`POST /resume_memory_occupation` 恢复它 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| 模型 world | 共同保存一份模型的 GPU 集合 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 多头潜在注意力（MLA） | DeepSeek 注意力，每 token 保存一个压缩潜在向量，代替每头的 key 和 value | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| 原生 API | SGLang 端点，主要是 `POST /generate` | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 新 token 比率 | 调度器预期运行请求将使用的剩余输出比例 | [2.3](#s-admission-and-retraction) |
| 离线量化 | checkpoint 已保存低比特权重及其 scale | [4.3](#s-quantization) |
| 在线量化 | SGLang 在加载时转换全精度权重 | [4.3](#s-quantization) |
| OpenAI API | 采用 OpenAI 格式的 `/v1/chat/completions`、`/v1/completions` 和 `/v1/models` 端点 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 重叠调度 | 一个 batch 的 CPU 工作与另一个 batch 的 GPU 工作同时运行 | [2.4](#s-the-overlap-scheduler) |
| 暂停与恢复 | `POST /pause_generation` 接收模式，默认 `abort` 会结束全部运行中请求 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| 峰值并发请求数 | 基准运行一秒内，任意时刻活跃请求数的最大值 | [5.1](#s-sglang-benchmark-serving) |
| 流水线并行（PP） | 完整层依次分配给不同 GPU，`--pp-size` 设置阶段数 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Prefill | 对完整 prompt 的前向传播，计算其 key、value 和首个输出 token | [1.3](#s-what-the-server-does-with-your-request) |
| Prefill-decode 分离（PD） | 两类 SGLang 服务器分别负责 prefill 和 decode，KV 在两者间移动 | [6.3](#s-prefill-decode-disaggregation) |
| RadixCache | token 序列的 radix tree，节点保存其边上 token 的 KV 槽位索引 | [3.3](#s-radixcache) |
| ReqToTokenPool | 每个运行请求一行、每个 token 位置一列的表 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| Retract | 从 decode batch 移除运行请求，释放其 KV 槽位，再放回队列 | [2.3](#s-admission-and-retraction) |
| 调度策略 | 准入前排序等待队列的规则，通过 `--schedule-policy` 设置 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| 调度器 | 独立进程，拥有 GPU，构建并运行各 batch，执行采样 | [2.1](#s-sglang-serve-and-the-three-processes) |
| 调度器循环 | 调度器进程中持续运行的函数，每轮处理一个 batch | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| 滑动窗口注意力（SWA） | 只读取最近几千 token 的注意力 | [3.6](#s-hybrid-models-and-the-cache) |
| 停止条件 | 结束请求的规则：停止 token、停止字符串、正则、长度上限、中止或语法结束 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 尾延迟优化 LRU（tlru） | 只保留满足对话下一轮延迟目标所需部分的驱逐策略 | [3.5](#s-eviction-policies-and-hicache) |
| 张量并行（TP） | 将每层权重矩阵切成 `--tp-size` 份，每张 GPU 一份 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 吞吐量 | 全部用户每秒输出 token 总数 | [1.3](#s-what-the-server-does-with-your-request) |
| TokenizerManager | 主进程中的对象，接收请求、应用聊天模板并分词 | [2.1](#s-sglang-serve-and-the-three-processes) |
| TokenToKVPoolAllocator | KV 槽位的空闲列表 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| TPOT | 对每个请求，首 token 之后的时间除以剩余输出 token 数 | [5.1](#s-sglang-benchmark-serving) |
| TreeNode | radix tree 的一个节点，子节点以首 token 为键，边上保存一段 token | [3.3](#s-radixcache) |
| TTFT | 从发送请求到收到首个流式 chunk 的时间 | [5.1](#s-sglang-benchmark-serving) |
| 双 batch 重叠（TBO） | 调度器将 batch 切成两个 micro-batch，一个运行注意力，另一个等待通信 | [6.2](#s-moe-serving-deepep-and-eplb) |
| 验证前向传播（Verify pass） | 目标模型对全部提议 token 执行一次前向传播，接受最长匹配前缀并额外增加一个 token | [4.4](#s-speculative-decoding) |
| 权重量化 | 用更少比特保存模型权重，例如 FP8、FP4 或 INT4 | [4.3](#s-quantization) |
| 权重更新会话 | `begin_weight_update`、一次或多次 `update_weights_from_*` 调用，然后 `end_weight_update` | [7.2](#s-sglang-as-an-rl-rollout-engine) |

来源：sections/ 下各文件中的术语定义；front.md。
