# MoE 服务：--moe-a2a-backend、DeepEP 与 EPLB

> 混合专家层把每个 token 发送到持有其专家的 GPU，因此 MoE 服务很大程度是通信问题，最繁忙 GPU 决定整体速度。

DeepSeek-V3 这样的混合专家（MoE）模型，每个 token 只激活众多专家中的几个。纸面上计算便宜，服务器中却是流量问题：每层、每步，各 token 必须传到持有选中专家的 GPU，结果再传回来。只要一张 GPU 过载，其他 GPU 都要等待。

读完本节，你能跟踪一个 token 如何穿过 SGLang 的 MoE 层，选择 all-to-all 后端和专家并行规模，判断何时开启负载均衡与 batch 重叠。

## 一个 MoE 层，五个阶段

**专家并行（EP）：** 每个 MoE 层的专家分布到多张 GPU，token 移动到专家所在处。`--ep-size` 设置共享专家的 GPU 数，默认 1 {{code}}。

SGLang 将 MoE 前向传播分成各有负责方的阶段 {{docs}}。路由器为每个 token 选择专家；分派器将 token 传到持有专家的 GPU；执行器使用分组矩阵乘法计算所有本地专家；分派器再传回结果并合并。

```figure
id: fig-6-2
kind: flow
title: 一个 token 穿过 MoE 层
claim: 每个 MoE 层中，dispatch 和 combine 让每个 token 跨 GPU 往返两次，中间的分组矩阵乘法才是专家计算。
caption: 从左向右读。靛蓝色箭头为 GPU 间 token 流量。标签列出 SGLang 阶段与选择实现的参数。依据 v0.5.22 MoE 层代码和专家并行文档。
```

两组参数选择实现 {{code}}：

| 参数 | 默认值 | 选择内容 |
|---|---|---|
| `--moe-a2a-backend` | `none` | token 如何跨 GPU 移动：`deepep`、`mooncake`、`nixl`、`mori`、`pplx`、`flashinfer` 等 |
| `--moe-runner-backend` | `auto` | 执行专家的分组矩阵乘法内核 |
| `--deepep-mode` | `auto` | prefill batch 使用 `normal` 分派，decode batch 使用 `low_latency` 分派 |

`none` 下，SGLang 通过 all-reduce 或 all-gather 集合通信移动 token。它适用于任意布局，但大规模时更耗带宽。All-to-all 后端只将 token 发往必要位置。

## SGLang 强制的布局规则

All-to-all 后端横跨整个 TP 组。选择其中一个时，SGLang 将 `--ep-size` 设为等于 `--tp-size`，并在 info 日志记录改动 {{code}}。不能只在八张 GPU 中的四张上运行 DeepEP。专家并行小于张量并行的混合布局，仅在 `none` 下有效 {{docs}}。

DeepEP 有两种分派模式。**Normal 模式**高吞吐传输大 prefill batch，无法捕获进 CUDA graph。**Low-latency 模式**传输小 decode batch，可在 CUDA graph 内运行。默认 `auto` 在各自合适场景使用两者。若强制 `--deepep-mode normal`，SGLang 会关闭 decode CUDA graphs，并打印一行警告 {{code}}。关闭后的代价见[第 4.1 节](#s-forwardmode-and-cuda-graphs)。

## 根据 batch 选择专家并行规模

更宽的专家并行将专家摊得更散，让更多流量经过慢链路。Ant Group 在 H20 GPU 上对 DeepSeek-R1 decode 做了测量 {{field Ant-Group 2025-09}}：

| Decode batch | EP16 | EP32 |
|---|---|---|
| 8 | 278 tokens/s | 293 tokens/s |
| 32 | 675 tokens/s | 585 tokens/s |

EP32 在小 batch 胜出，在生产使用的 batch 上却低 13%。他们用流量解释：EP16 约一半 MoE 流量留在 NVLink，EP32 只有约四分之一。他们也希望限制单 GPU 故障影响的请求数，因此选择 EP16。[文章](https://www.lmsys.org/blog/2025-09-26-sglang-ant-group/) 发表于 LMSYS 博客，数字属于他们的测量。

## 专家负载均衡

真实流量不会均匀分散到专家。有些专家获得大多数 token，持有它们的 GPU 就成为每步最慢的 rank。

**EPLB：** 专家并行负载均衡器。它记录每次前向传播使用的专家，每隔 `--eplb-rebalance-num-iterations` 次前向传播，默认 1000 次，计算新的放置方案并移动专家权重 {{code}}。`--ep-num-redundant-experts` 为热门专家增加副本，默认 0。另一个阈值参数可在 GPU 利用率已经较高时跳过重平衡，默认 1.0 意味着从不跳过。

EPLB 默认关闭（`--enable-eplb` 为 false）。测量显示不均衡后再开启，不要提前开。使用 `--expert-balancedness-report-mode prometheus` 运行，观察 `sglang:eplb_balancedness` {{code}}。SGLang 团队报告 EPLB 将 prefill 加速 1.49 倍、decode 加速 2.54 倍 {{team 2025-05}}。这些数字来自模拟不均衡，原本均衡的流量应预期收益更小。

## 通信与计算重叠

**双 batch 重叠（TBO）：** 调度器将一个 batch 切成两个 micro-batch。一个执行注意力时，另一个等待分派或合并。通过 `--enable-two-batch-overlap` 开启，默认关闭 {{code}}。

Prefill 按 token 数拆分。如果没有任何切分能让两边各获得至少 48% 的 token，就将一个序列切到两半。这由 `--tbo-token-distribution-threshold` 决定，默认 0.48。

SGLang 文档称 TBO 能“解锁最高 2 倍吞吐量” {{docs}}，但文档链接的博客在 96 张 H100 上实测提升 27% 至 35% {{team 2025-05}}。应按实测数字规划。

Ant Group 在 H20 上放弃了 TBO {{field Ant-Group 2025-09}}。它只在 batch 64 或 128 时有帮助，而这些 batch 的 TPOT 已不达标。团队改用 `--enable-single-batch-overlap`，将共享专家计算与 combine 步骤重叠。在 batch 20 至 56 时测得 8% 至 10% 收益。

## 单 GPU、一个 MoE 模型：batch 读取更多专家

单 GPU 没有跨卡分派，看起来 MoE 很便宜。我们在一张 NVIDIA GB10 上服务 Qwen3-30B-A3B，扫描并发 1 至 64。其配置共 48 层，每个 MoE 层 128 个专家，每 token 激活 8 个。

| 并发 | BF16 TPOT 中位数 | FP8 TPOT 中位数 |
|---|---|---|
| 1 | 32.52 ms | 18.41 ms |
| 8 | 102.21 ms | 54.96 ms |
| 64 | 254.06 ms | 131.78 ms |

**我们每个点用三个 seed 实测。** 并发从 1 到 64，BF16 每输出 token 耗时增大 7.8 倍，FP8 增大 7.2 倍。稠密模型一个 decode 步骤为整个 batch 将每份权重读取一次；MoE 模型需要读取的权重集合却随 batch 增大。

```figure
id: fig-6-2c
kind: chart
title: GB10 上 MoE 模型的 TPOT 与并发
claim: 每输出 token 耗时几乎随 batch 同步增长，因为每增加一个请求就需读取其他专家。
caption: 每条曲线从左向右读。梅紫色为 BF16，绿色为 FP8，色带为三个 seed 的最小和最大值。Qwen3-30B-A3B，输入 512、输出 128 token。来源：capture/gpu/summary/gb10.json。
```

原因在专家并集。并发 1 时，每层每个 decode 步骤读取 8 个专家权重。并发 64 时，64 个 token 各从 128 个专家中选择 8 个。如果路由均匀，每步每层约需读取 128 个中的 126 个专家。

这只是算术推导，不是测量，真实路由没有那么均匀。名称表明每 token 激活约 3B 参数，但 batch 64 读取的接近全部 30B。

**我们的建议：** 单机规划 MoE 时，应按完整 batch 读取的字节数，而非激活参数量。先量化专家。我们测的所有并发下，FP8 每 token 耗时降至 BF16 的 0.52 至 0.57。

## 我们的建议

同时服务 prefill 和 decode 的服务器，保持 `--deepep-mode auto`。根据满足延迟目标的 batch 选择 `--ep-size`，不要照最大规模公开运行抄。只有 `sglang:eplb_balancedness` 显示不均衡才开启 EPLB。将 TBO 视为大 decode batch 的吞吐量功能，保留前先检查 TPOT 是否达标。

## 两份全规模实践报告

本部分有一个结果通过外部审计。Crusoe 使用 SGLang 0.5.15.post1，在 512 张 AMD MI355X 上运行 DeepSeek-R1，提交 MLPerf Inference v6.1 {{field Crusoe 2026-09}}。每个节点使用 TP8、EP8 和八个注意力组。离线成绩约每秒 290 万 token；服务器场景 p99 TPOT 为 79.98 ms，限制 80 ms。[文章](https://www.crusoe.ai/resources/blog/serving-5-75-million-tokens-per-second-crusoes-mlperf-inference-v6-1-results-on-amd-mi355x) 列出了参数。

SGLang 团队的 96 GPU 运行报告每节点每秒输入 52.3k、输出 22.3k token {{team 2025-05}}。它使用 12 个各有八张 H100 的节点，prefill 与 decode 分别放在不同节点，机制见[第 6.3 节](#s-prefill-decode-disaggregation)。

## 真实事故：一张 GPU 耗尽内存

某团队用四台 prefill、六台 decode 服务器，以大规模专家并行运行 DeepSeek V3（[issue #9787](https://github.com/sgl-project/sglang/issues/9787)）。负载下，一个 prefill rank 的 GPU 利用率降至零，随后所有 prefill 进程崩溃。讨论追溯到 DeepEP 分派：不均衡路由向一张 GPU 发送过多 token，使其内存耗尽。建议降低每个注意力组的分块 prefill、调优初始专家放置并开启 EPLB。普遍教训是：MoE 服务中，最繁忙 GPU 同时决定速度与内存上限。

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
- 保留双 batch 重叠前，先检查每输出 token 耗时。
- 某个 MoE rank 耗尽内存时，降低每注意力组的分块 prefill。
- 根据完整 batch 读取的专家字节数规划单机 MoE 服务器。
```

来源：python/sglang/srt/arg_groups/fields/exec_.py, python/sglang/srt/arg_groups/overrides.py (_a2a_ep_size), python/sglang/srt/arg_groups/moe_hook.py, python/sglang/srt/eplb/eplb_manager.py, python/sglang/srt/batch_overlap/two_batch_overlap.py, python/sglang/srt/observability/metrics_collector.py, and docs/docs/advanced_features/expert_parallelism.mdx, all at v0.5.22. LMSYS, "Deploying DeepSeek with PD Disaggregation and Large-Scale Expert Parallelism on 96 H100 GPUs", 2025-05-05. Ant Group on the LMSYS blog, 2025-09-26. Crusoe, MLPerf Inference v6.1 results, 2026-09-16. Issue #9787. capture/gpu/summary/gb10.json, capture/gpu/sweep.py, and the config.json of Qwen/Qwen3-30B-A3B-Instruct-2507.
