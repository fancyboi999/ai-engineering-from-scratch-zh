# MoE 服务：--moe-a2a-backend、DeepEP 与 EPLB

> 混合专家层将每个 token 发送到持有其专家的 GPU，因此 MoE 服务主要是通信问题，最繁忙的 GPU 决定整体速度。

DeepSeek-V3 这样的混合专家（MoE）模型，每个 token 只激活众多专家中的少数几个。理论上计算量很低，到了服务器却成了流量问题。每一步的每个 MoE 层，都要把 token 发往持有所选专家的 GPU，再把结果传回。一张 GPU 过载就会让其他卡全部等待。

读完本节，你能跟踪一个 token 如何经过 SGLang 的 MoE 层。你也能选择 all-to-all 后端和专家并行规模，决定何时开启负载均衡和 batch 重叠。

## 一个 MoE 层，五个阶段 {#s-moe-serving-deepep-and-eplb-one-moe-layer-five-stages}

**专家并行（EP）：** 将每个 MoE 层的专家分散到各张 GPU，token 移到专家所在处。`--ep-size` 设置共享专家的 GPU 数，默认 1 {{code}}。

SGLang 把 MoE 前向传播拆成各有负责方的阶段 {{docs}}。路由器为每个 token 选择专家。分派器把 token 移到持有这些专家的 GPU。执行器使用分组矩阵乘法计算所有本地专家。随后分派器传回并合并结果。

```figure
id: fig-6-2
kind: flow
title: 一个 token 经过 MoE 层
claim: 每个 MoE 层的 dispatch 和 combine 让每个 token 跨 GPU 移动两次，中间的分组矩阵乘法是唯一的专家计算。
caption: 从左向右读。靛蓝色箭头表示 GPU 间的 token 流量。标签列出 SGLang 阶段及选择其实现的参数。依据 v0.5.22 的 MoE 层代码和专家并行文档。
```

三个参数选择实现 {{code}}：

| 参数 | 默认值 | 选择内容 |
|---|---|---|
| `--moe-a2a-backend` | `none` | token 如何跨 GPU 移动：`deepep`、`mooncake`、`nixl`、`mori`、`pplx`、`flashinfer` 等 |
| `--moe-runner-backend` | `auto` | 执行专家计算的分组矩阵乘法内核 |
| `--deepep-mode` | `auto` | prefill batch 使用 `normal` 分派，decode batch 使用 `low_latency` 分派 |

使用 `none` 时，SGLang 通过 all-reduce 或 all-gather 集合通信移动 token。这适用于任意布局，但规模增大后更耗带宽。all-to-all 后端只将 token 发送到必要位置。

## SGLang 强制执行的布局规则 {#s-moe-serving-deepep-and-eplb-the-layout-rules-that-sglang-enforces}

all-to-all 后端跨越整个 TP 组。选择任一后端时，SGLang 将 `--ep-size` 设为等于 `--tp-size`，并用 info 日志记录改动 {{code}}。不能只在八张 GPU 中的四张上运行 DeepEP。专家并行小于张量并行的混合布局只适用于 `none` {{docs}}。

DeepEP 有两种分派模式。**Normal 模式**以高吞吐发送大 prefill batch，不能捕获进 CUDA graph。**Low-latency 模式**发送小 decode batch，可在 CUDA graph 内运行。默认 `auto` 在适合的场合分别使用两者。强制 `--deepep-mode normal` 会让 SGLang 关闭 decode CUDA graphs，并打印一行警告 {{code}}。[第 4.1 节](#s-forwardmode-and-cuda-graphs)展示了关闭 graph 的代价。

## 根据 batch 选择专家并行规模 {#s-moe-serving-deepep-and-eplb-choose-the-expert-parallel-size-from-your-batch}

扩大专家并行会让专家分布得更散，使更多流量经过较慢链路。Ant Group 在 H20 上测了 DeepSeek-R1 decode {{field Ant-Group 2025-09}}：

| Decode batch | EP16 | EP32 |
|---|---|---|
| 8 | 278 tokens/s | 293 tokens/s |
| 32 | 675 tokens/s | 585 tokens/s |

EP32 在小 batch 胜出，在他们生产使用的 batch 上却低了 13%。他们用流量解释这一结果：EP16 约一半 MoE 流量留在 NVLink，EP32 约四分之一。他们选择 EP16 也为了减少单张 GPU 故障影响的请求数。[文章](https://www.lmsys.org/blog/2025-09-26-sglang-ant-group/)发表于 LMSYS 博客，测量属于他们。

## 专家负载均衡 {#s-moe-serving-deepep-and-eplb-expert-load-balancing}

真实流量不会均匀分散到专家。有些专家获得多数 token，持有它们的 GPU 就成为每步最慢的 rank。

**EPLB：** 专家并行负载均衡器。它记录每次前向传播使用的专家。每隔 `--eplb-rebalance-num-iterations` 次前向传播，默认 1000 次，就计算新的放置方案并移动专家权重 {{code}}。`--ep-num-redundant-experts` 为热门专家增加副本，默认 0。一个阈值参数在 GPU 利用率已经很高时跳过重平衡，默认 1.0 表示从不跳过。

EPLB 默认关闭（`--enable-eplb` 为 false）。测量显示不均衡后再开启。使用 `--expert-balancedness-report-mode prometheus`，观察 `sglang:eplb_balancedness` {{code}}。SGLang 团队报告 EPLB 的 prefill 加速比为 1.49、decode 为 2.54 {{team 2025-05}}。这些数字来自模拟不均衡，流量本来均衡时，应预期更小收益。

## 通信与计算重叠 {#s-moe-serving-deepep-and-eplb-overlapping-communication-with-compute}

**双 batch 重叠（TBO）：** 调度器将一个 batch 切成两个 micro-batch。一个运行注意力时，另一个等待 dispatch 或 combine。用 `--enable-two-batch-overlap` 开启，默认关闭 {{code}}。

prefill 按 token 数拆分。若没有任何切分能让两边各获得至少 48% 的 token，就把一个序列切到两半。该阈值由 `--tbo-token-distribution-threshold` 设置，默认 0.48。

SGLang 文档称 TBO 最高可获得两倍吞吐量 {{docs}}。文档链接的博客在 96 张 H100 上测得 27% 至 35% 提升 {{team 2025-05}}。规划应以实测数字为准。

Ant Group 在 H20 上没有采用 TBO {{field Ant-Group 2025-09}}。它只在 batch 为 64 或 128 时有帮助，而这些 batch 的每输出 token 耗时不达标。他们改用 `--enable-single-batch-overlap`，让共享专家计算与 combine 步骤重叠。在 batch 20 至 56 时测得 8% 至 10% 提升。

## 单 GPU、一个 MoE 模型：batch 读取更多专家 {#s-moe-serving-deepep-and-eplb-one-gpu-one-moe-model-the-batch-reads-more-experts}

单 GPU 不需要跨卡分派，因此 MoE 看起来开销低。我们在一张 NVIDIA GB10 上服务 Qwen3-30B-A3B，扫描并发 1 至 64。模型配置有 48 层，每个 MoE 层有 128 个专家，每 token 激活 8 个。

| 并发 | BF16 TPOT 中位数 | FP8 TPOT 中位数 |
|---|---|---|
| 1 | 32.52 ms | 18.41 ms |
| 8 | 102.21 ms | 54.96 ms |
| 64 | 254.06 ms | 131.78 ms |

**我们测得**以上结果，每点使用三个 seed。并发从 1 增至 64 时，BF16 的每输出 token 耗时增至 7.8 倍，FP8 增至 7.2 倍。稠密模型的一个 decode 步骤，为整个 batch 将每份权重读取一次。MoE 每步读取的权重集合则随 batch 增长。我们没有在 GB10 上运行稠密模型对照。

```figure
id: fig-6-2c
kind: chart
title: GB10 上 MoE 模型的每输出 token 耗时与并发
claim: batch 增至 64 倍时，每输出 token 耗时增至 7.8 倍，每个额外请求可能读取其他专家。
caption: 各曲线从左向右读。梅紫色为 BF16，绿色为 FP8，色带表示三个 seed 的最低和最高值。Qwen3-30B-A3B，输入 512、输出 128 token。来源：capture/gpu/summary/gb10.json。
```

一个可能原因是专家的并集。并发 1 时，每层每个 decode 步骤读取 8 个专家的权重。并发 64 时，64 个 token 各从 128 个专家中选择 8 个。假设路由均匀，每步每层会读取约 126 个专家。

这是算术推导，不是测量，真实路由也没有那么均匀。从 32 到 64 用户时，专家并集仅增长约 13%，每 token 耗时却仍在增加。因此，注意力、KV 读取和扫描中的 prefill 步骤也随 batch 增长。模型名称表示每 token 激活约 3B 参数，batch 为 64 时读取的却接近全部 30B。

prompt 也限制了这一结果的适用范围。`random` 数据集将 ShareGPT 文本裁剪或重复到 512 token，每个回答都生成 128 token。

NVIDIA 研究者在 2026 年的 SPEED-Bench 基准研究中，用随机 token ID 测试了一个 MoE 模型。在部分层中，20% 至 30% 的专家始终空闲。我们的 prompt 是真实文本，仍与你的流量不同。我们没有测量它们选择了哪些专家。用这份结果规划容量前，先拿自己的 prompt 样本做同样扫描。

**我们的建议：** 单机规划 MoE 时，应按完整 batch 读取的字节数计算，而非激活参数量。先量化。使用 FP8 KV 缓存的 FP8 checkpoint，在我们测过的全部并发下，将每 token 耗时降至 BF16 的 0.52 至 0.57。它量化了全部权重和 KV 缓存，不能把收益只归因于专家。

## 我们的建议 {#s-moe-serving-deepep-and-eplb-our-position}

同时执行 prefill 和 decode 的服务器保持 `--deepep-mode` 为 `auto`。根据满足延迟目标的 batch 选择 `--ep-size`，不要照抄最大规模公开运行。只有 `sglang:eplb_balancedness` 显示不均衡才开启 EPLB。把 TBO 作为大 decode batch 的吞吐量功能，保留前先测它对每输出 token 耗时的影响。

## 两份全规模实践报告 {#s-moe-serving-deepep-and-eplb-two-field-reports-at-full-scale}

本部分有一个结果通过外部审计。Crusoe 使用 SGLang 0.5.15.post1，在 512 张 AMD MI355X 上运行 DeepSeek-R1，提交至 MLPerf Inference v6.1 {{field Crusoe 2026-09}}。每节点运行 TP8、EP8 和八个注意力组。离线成绩约每秒 2.90 百万 token（290 万）。服务器场景的 p99 每输出 token 耗时为 79.98 ms，限制为 80 ms。[文章](https://www.crusoe.ai/resources/blog/serving-5-75-million-tokens-per-second-crusoes-mlperf-inference-v6-1-results-on-amd-mi355x)列出了参数。

SGLang 团队的 96 GPU 运行报告每节点每秒输入 52.3k、输出 22.3k token {{team 2025-05}}。它使用 12 个各有八张 H100 的节点，prefill 和 decode 位于不同节点。[第 6.3 节](#s-prefill-decode-disaggregation)解释这一拆分。

## 真实事故：一张 GPU 耗尽内存 {#s-moe-serving-deepep-and-eplb-a-real-incident-one-gpu-runs-out-of-memory}

一个团队以四台 prefill、六台 decode 服务器和大规模专家并行运行 DeepSeek V3（[issue #9787](https://github.com/sgl-project/sglang/issues/9787)）。负载下，一个 prefill rank 的 GPU 利用率降至零，随后所有 prefill 进程崩溃。讨论将原因追溯到 DeepEP 分派。不均衡路由向一张 GPU 发送过多 token，导致内存耗尽。建议的修正是减小每个注意力组的分块 prefill、调优初始专家放置和启用 EPLB。普遍教训是：MoE 服务中，最繁忙 GPU 同时决定速度和内存上限。

```figure
id: fig-6-2b
kind: comparison
title: 两种 batch 大小下的 EP16 与 EP32
claim: 更宽的专家并行在 batch 8 胜出，在 batch 32 却低 13%，因为留在 NVLink 的流量更少。
caption: 每列从上往下读。数字为 H20 上 DeepSeek-R1 的每秒 decode token 数，来自 Ant Group 于 2025-09-26 发布的 LMSYS 博客，属于他们的测量。
```

```takeaways
- 除非调试某种分派模式，否则保持 --deepep-mode auto。
- 根据满足延迟目标的 batch 选择 --ep-size。
- sglang:eplb_balancedness 显示不均衡后再开启 EPLB。
- 保留双 batch 重叠前，先测每输出 token 耗时。
- 一个 MoE rank 耗尽内存时，减小每个注意力组的分块 prefill。
- 按完整 batch 读取的专家字节数规划单机 MoE 服务器。
```

来源：python/sglang/srt/arg_groups/fields/exec_.py、python/sglang/srt/arg_groups/overrides.py (_a2a_ep_size)、python/sglang/srt/arg_groups/moe_hook.py、python/sglang/srt/eplb/eplb_manager.py、python/sglang/srt/batch_overlap/two_batch_overlap.py、python/sglang/srt/observability/metrics_collector.py 和 docs/docs/advanced_features/expert_parallelism.mdx，均为 v0.5.22；LMSYS，Deploying DeepSeek with PD Disaggregation and Large-Scale Expert Parallelism on 96 H100 GPUs，2025-05-05；Ant Group 发表于 LMSYS 博客的文章，2025-09-26；Crusoe，MLPerf Inference v6.1 结果，2026-09-16；issue #9787；capture/gpu/summary/gb10.json、capture/gpu/sweep.py 和 Qwen/Qwen3-30B-A3B-Instruct-2507 的 config.json；v0.5.22 的 python/sglang/benchmark/datasets/random.py (sample_random_requests)；Abramovich 等，SPEED-Bench: A Unified and Diverse Benchmark for Speculative Decoding，arXiv 2604.09557（2026-02，2026-05 修订）。
