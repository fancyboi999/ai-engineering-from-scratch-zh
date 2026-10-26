# 术语表

> 每个术语在全手册保持同一含义，并列出定义它的章节。

每个术语只在末列指出的章节定义一次。含义来自固定标签的 SGLang 源码、捕获记录及各节引用的论文。

| 术语 | 本手册中的含义 | 定义章节 |
|---|---|---|
| 接受长度（Acceptance length） | 每次验证提交的 token 数：接受的草稿 token 加一个 bonus token | [4.4](#s-speculative-decoding) |
| 注意力后端（Attention backend） | 为一个批次在分页 KV 缓存上计算注意力的类 | [4.2](#s-attention-backend) |
| 注意力数据并行 | 同一个 TP 组内注意力层做数据并行，前馈层或专家层仍跨所有 GPU 切分 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 批次不变性 | 一种内核属性：归约顺序固定，因此某行结果不依赖其他行 | [4.6](#s-deterministic-inference-and-logprobs) |
| Bootstrap room | Prefill 与 decode 服务器用来找到同一请求另一半的编号 | [6.3](#s-prefill-decode-disaggregation) |
| 可中断计算图 | 捕获遇到必须 eager 运行的算子便结束片段，执行算子后开启下一片段 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 捕获桶 | SGLang 启动时为其记录 decode graph 的一个批次大小 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 并发（基准） | 全部请求端到端延迟之和除以运行时长 | [5.1](#s-sglang-benchmark-serving) |
| 约束解码 | 采样前移除所有会破坏语法的 token | [4.5](#s-structured-outputs-with-xgrammar) |
| Counter | 只增长的 Prometheus 累计值，使用时间窗口内的速率读取 | [5.2](#s-the-metrics-endpoint) |
| CUDA graph | 固定形状与地址的内核启动记录，GPU 通过一次 CPU 调用重放 | [4.1](#s-forwardmode-and-cuda-graphs) |
| 数据并行（DP） | 多个完整模型副本，各自处理请求并维护 KV 缓存 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Decode | 生成后续 token 的循环，每请求每 token 一次前向传播 | [1.1](#s-what-the-server-does-with-your-request) |
| DetokenizerManager | 将输出 token ID 转为文本并送回 TokenizerManager 的进程 | [2.1](#s-sglang-serve-and-the-three-processes) |
| 草稿模型 | 低成本提出后续几个 token 的小模型或 head | [4.4](#s-speculative-decoding) |
| EPLB | 记录专家使用情况并在 GPU 间迁移专家的专家并行负载均衡器 | [6.2](#s-moe-serving-deepep-and-eplb) |
| 专家并行（EP） | 每个 MoE 层的专家分配到不同 GPU，token 发送到专家所在处 | [6.2](#s-moe-serving-deepep-and-eplb) |
| ForwardMode | 批次标签，指示 model runner 执行哪类前向传播 | [4.1](#s-forwardmode-and-cuda-graphs) |
| Gauge | 每次日志间隔由调度器覆盖的值，抓取只看到最新值 | [5.2](#s-the-metrics-endpoint) |
| GEMM 后端 | 执行量化权重矩阵乘法的内核库 | [4.3](#s-quantization) |
| Goodput | 同时满足 TTFT 与 TPOT 目标的每秒请求数 | [1.1](#s-what-the-server-does-with-your-request) |
| 语法队列 | 语法仍在编译的请求列表 | [4.5](#s-structured-outputs-with-xgrammar) |
| 分组查询注意力 | 多个 query head 共用一个 key/value head，使 KV head 少于 attention head | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| HiCache | 将基数树从 GPU 内存延伸到主机内存和存储的分层缓存 | [3.5](#s-eviction-policies-and-hicache) |
| Histogram | 每个桶一个 counter，通过时间窗口速率读取分位数 | [5.2](#s-the-metrics-endpoint) |
| ITL | 全部请求汇总的流式输出块之间的间隔 | [5.1](#s-sglang-benchmark-serving) |
| KV 缓存 | 保存每层此前所有 token 的 key/value，让 decode 不必重算 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| KV 缓存 dtype | 已缓存 key/value 的格式 | [4.3](#s-quantization) |
| KV 池 | 保存服务器保留的每个 token 的 key/value 的内存 | [1.2](#s-what-the-server-does-with-your-request) |
| L1, L2, L3 | HiCache 三层：GPU 池、锁页主机内存池、可选共享存储后端 | [3.5](#s-eviction-policies-and-hicache) |
| Logprob | 服务器采样分布下某 token 的对数概率 | [4.6](#s-deterministic-inference-and-logprobs) |
| Mamba 层 | 每序列保存一个固定大小状态的状态空间或线性注意力层 | [3.6](#s-hybrid-models-and-the-cache) |
| 匹配率 | 新请求与网关树匹配的字符数除以请求长度 | [6.4](#s-sgl-model-gateway) |
| 内存释放 | `POST /release_memory_occupation` 按标签释放 GPU 内存，`POST /resume_memory_occupation` 恢复 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| 模型世界（Model world） | 共同保存一个模型副本的 GPU 集合 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 多头潜在注意力（MLA） | DeepSeek 注意力，每 token 保存一个压缩潜变量，取代逐 head 的 key/value | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| 原生 API | SGLang 自有端点，主要为 `POST /generate` | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 新 token 比例 | 调度器预计运行请求会用掉的剩余输出比例 | [2.3](#s-admission-and-retraction) |
| 离线量化 | Checkpoint 已保存低比特权重与缩放值 | [4.3](#s-quantization) |
| 在线量化 | SGLang 加载时转换全精度权重 | [4.3](#s-quantization) |
| OpenAI API | OpenAI 格式的 `/v1/chat/completions`、`/v1/completions`、`/v1/models` 端点 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 重叠调度 | 某批次 CPU 工作与另一批次 GPU 工作同时运行 | [2.4](#s-the-overlap-scheduler) |
| 暂停与恢复 | 带 mode 的 `POST /pause_generation`，默认 `abort` 结束所有运行请求 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| 峰值并发请求 | 基准运行中任一秒内活跃请求数的最大值 | [5.1](#s-sglang-benchmark-serving) |
| 流水线并行（PP） | 整层按顺序分配到不同 GPU，`--pp-size` 设置阶段数 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Prefill | 对完整 prompt 前向传播，计算 key/value 并生成首输出 token | [1.1](#s-what-the-server-does-with-your-request) |
| Prefill-decode 分离（PD） | 两类 SGLang 服务分别负责 prefill 与 decode，之间传输 KV | [6.3](#s-prefill-decode-disaggregation) |
| RadixCache | token 序列的基数树，节点保存边上 token 的 KV 槽位索引 | [3.3](#s-radixcache) |
| ReqToTokenPool | 每运行请求一行、每 token 位置一列的表 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| 回撤 | 从 decode 批次移除运行请求，释放其 KV 槽位，放回队列 | [2.3](#s-admission-and-retraction) |
| 调度策略 | 准入前排序等待队列的规则，用 `--schedule-policy` 设置 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| Scheduler | 拥有 GPU、组建批次、运行并采样的独立进程 | [2.1](#s-sglang-serve-and-the-three-processes) |
| 调度循环 | scheduler 进程中持续运行的函数，每轮一个批次 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| 滑动窗口注意力（SWA） | 只读取最近几千 token 的注意力 | [3.6](#s-hybrid-models-and-the-cache) |
| 停止条件 | 结束请求的规则：停止 token、字符串、正则、长度限制、中止或语法结束 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |
| 尾延迟优化 LRU（tlru） | 只保留满足下一轮延迟目标所需会话部分的淘汰策略 | [3.5](#s-eviction-policies-and-hicache) |
| 张量并行（TP） | 每层权重矩阵切为 `--tp-size` 片，每 GPU 一片 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| 吞吐量 | 全部用户每秒获得的输出 token 数 | [1.1](#s-what-the-server-does-with-your-request) |
| TokenizerManager | 主进程中接收请求、应用聊天模板并分词的对象 | [2.1](#s-sglang-serve-and-the-three-processes) |
| TokenToKVPoolAllocator | KV 槽位空闲列表 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |
| TPOT | 每请求首 token 之后的时间除以剩余输出 token 数 | [5.1](#s-sglang-benchmark-serving) |
| TreeNode | 基数树节点，按首 token 索引子节点，并保存自身边上的 token 段 | [3.3](#s-radixcache) |
| TTFT | 从发送请求到收到首个流式输出块的时间 | [5.1](#s-sglang-benchmark-serving) |
| 双批次重叠（TBO） | 将批次切成两个微批，让一个执行注意力时另一个等待通信 | [6.2](#s-moe-serving-deepep-and-eplb) |
| 验证传播（Verify pass） | 目标模型对全部候选 token 做一次前向，接受最长匹配前缀并加一个 token | [4.4](#s-speculative-decoding) |
| 权重量化 | 以 FP8、FP4、INT4 等更少比特保存模型权重 | [4.3](#s-quantization) |
| 权重更新会话 | 先 `begin_weight_update`，再一次或多次 `update_weights_from_*`，最后 `end_weight_update` | [7.2](#s-sglang-as-an-rl-rollout-engine) |

Sources: the term definitions in every file under sections/; front.md.
