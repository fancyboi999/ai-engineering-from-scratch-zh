# 来源

> 本手册按权威性排序来源，本页列出各节引用的全部外部来源及使用章节。

排序与[前言](#s-front)一致。两个来源冲突时，以更高者为准，正文明确说明。各节使用的固定标签源码文件列在节末来源行，此处不重复。下列页面均由上游于 2026-10-16 阅读，不代表中文维护时重新核验了外部现状。

## 来源排序

| 排名 | 来源 | 手册采用的内容 | 引用方式 |
|---|---|---|---|
| 1 | 标签 `baa9befa` 的 SGLang 源码 | 所有默认值与机制 | 各节来源行的文件列表 |
| 2 | `capture/out/` 中的捕获记录 | 全部 listing 与标为实测的数字 | 捕获文件名 |
| 3 | SGLang issue 与 PR | 事故与各功能的设计历史 | `issue` 及编号 |
| 4 | 论文 | RadixAttention 原始设计与 SGLang 实现的方法 | `paper` 及标题 |
| 5 | 标签对应的 SGLang 文档 | 与代码核对后的文档行为 | `docs` 及标题 |
| 6 | 独立实践报告 | 本手册无法运行的 GPU 行为 | `field`、作者与月份 |
| 7 | SGLang 团队与厂商报告 | 始终标明为作者主张的声明 | `team` 或厂商及月份 |

## 第 1、2 级：代码与捕获

| 来源 | 使用章节 |
|---|---|
| SGLang 0.5.22，标签 `v0.5.22`，提交 `baa9befa381511cd4d56f83980951e5a45fffc6d`, [github.com/sgl-project/sglang](https://github.com/sgl-project/sglang) | 每节 |
| Miles 0.1.2，标签 `v0.1.2`，提交 `a22fd824`, [github.com/radixark/miles](https://github.com/radixark/miles) | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| 捕获工具与 `capture/out/`，录制于 2026-10-16 | 每个有 listing 的章节 |

## 第 3 级：PR

Issue 见[事故索引](#s-ref-incident-index)。以下 PR 解释设计变化。

| PR | 改动 | 使用章节 |
|---|---|---|
| [#9241](https://github.com/sgl-project/sglang/pull/9241) | 预热后冻结垃圾回收器 | [1.2](#s-check-that-the-server-is-healthy) |
| [#11210](https://github.com/sgl-project/sglang/pull/11210) | 单线程两个 CUDA stream 实现重叠 | [2.4](#s-the-overlap-scheduler) |
| [#14312](https://github.com/sgl-project/sglang/pull/14312) | 将 `sgl-router` 更名为 `sgl-model-gateway` | [6.4](#s-sgl-model-gateway) |
| [#23906](https://github.com/sgl-project/sglang/pull/23906) | 将 prefill graph 字段移入按阶段配置 | [4.1](#s-forwardmode-and-cuda-graphs) |
| [#29458](https://github.com/sgl-project/sglang/pull/29458) | CUDA 可中断 prefill graph | [4.1](#s-forwardmode-and-cuda-graphs) |
| [#32114](https://github.com/sgl-project/sglang/pull/32114) | 删除 Cutlass MLA、Dual Chunk FlashAttention 和普通 GPTQ CUDA 内核 | [4.2](#s-attention-backend), [4.3](#s-quantization) |
| [#37898](https://github.com/sgl-project/sglang/pull/37898) | 将 20至35 GB GPU 的 decode graph 上限从 24 提高到 48 | [4.1](#s-forwardmode-and-cuda-graphs) |
| [#40795](https://github.com/sgl-project/sglang/pull/40795) | 删除旧基准别名 | [5.1](#s-sglang-benchmark-serving) |
| [#41818](https://github.com/sgl-project/sglang/pull/41818) | 添加 `--attn-dp-size`，让 `--dp-size` 只有一种含义 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| [#42285](https://github.com/sgl-project/sglang/pull/42285), [#42286](https://github.com/sgl-project/sglang/pull/42286), [#42287](https://github.com/sgl-project/sglang/pull/42287) | 移除 prefill graph 的 torch.compile 路径 | [4.1](#s-forwardmode-and-cuda-graphs) |

## 第 4 级：论文

| 论文 | 使用章节 |
|---|---|
| Zheng 等， SGLang: Efficient Execution of Structured Language Model Programs, [arXiv 2312.07104](https://arxiv.org/abs/2312.07104) | [2.2](#s-the-scheduler-loop-and-schedule-policy), [3.1](#s-kv-bytes-per-token-and-the-kv-pool), [3.3](#s-radixcache), [4.5](#s-structured-outputs-with-xgrammar) |
| 代码引用的尾延迟优化 LRU 策略, [arXiv 2510.15152](https://arxiv.org/abs/2510.15152) | [3.5](#s-eviction-policies-and-hicache) |

## 第 5 级：固定标签的 SGLang 文档

| 页面 | 使用章节 |
|---|---|
| `docs/docs/hardware-platforms/apple_metal.mdx` | 前言, [2.1](#s-sglang-serve-and-the-three-processes), [2.4](#s-the-overlap-scheduler) |
| `docs/docs/advanced_features/hyperparameter_tuning.mdx` | [2.3](#s-admission-and-retraction) |
| `docs/docs/advanced_features/hicache_design.mdx` 与 `radix_eviction_policy.mdx` | [3.5](#s-eviction-policies-and-hicache) |
| `docs/docs/advanced_features/attention_backend.mdx` | [4.2](#s-attention-backend) |
| `docs/docs/advanced_features/quantization.mdx` | [4.3](#s-quantization) |
| `docs/docs/advanced_features/expert_parallelism.mdx` | [6.2](#s-moe-serving-deepep-and-eplb) |
| `docs/docs/advanced_features/pd_disaggregation.mdx` | [6.3](#s-prefill-decode-disaggregation) |
| `docs/docs/get-started/install.mdx` | [7.1](#s-operating-sglang) |
| `docs/docs/advanced_features/sglang_for_rl.mdx` | [7.2](#s-sglang-as-an-rl-rollout-engine) |

## 第 6 级：独立实践报告

| 作者 | 报告 | 月份 | 使用章节 |
|---|---|---|---|
| AIMultiple | [推理引擎基准](https://aimultiple.com/inference-engines) | 2026-01，回答于 2026-10 | [1.1](#s-what-the-server-does-with-your-request), [5.3](#s-reading-other-peoples-benchmarks) |
| Alibaba Cloud、RBG 与 Mooncake 团队 | [用 SGLang RBG 和 Mooncake 构建生产推理平台](https://www.alibabacloud.com/blog/building-a-production-grade-cloud-native-large-model-inference-platform-with-sglang-rbg-%2B-mooncake_602933) | 2026-03 | [3.5](#s-eviction-policies-and-hicache) |
| Ant Group | [LMSYS 博客：H20 上使用 SGLang 运行 DeepSeek-R1](https://www.lmsys.org/blog/2025-09-26-sglang-ant-group/) | 2025-09 | [4.4](#s-speculative-decoding), [6.1](#s-tp-size-dp-size-and-attn-dp-size), [6.2](#s-moe-serving-deepep-and-eplb), [7.1](#s-operating-sglang) |
| CERIT-SC | [在 CERIT-SC 运行 LLM](https://blog.cerit.io/blog/run-llm2/)与[后续文章](https://blog-dev.cerit.io/blog/llm3/) | 2025-10, 2026-04 | [7.1](#s-operating-sglang) |
| Cloudflare | [更小、更快、更安全的模型](https://blog.cloudflare.com/smaller-faster-safer-models/) | 2026-08 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool), [4.3](#s-quantization) |
| Crusoe | [AMD MI355X 上的 MLPerf Inference v6.1 结果](https://www.crusoe.ai/resources/blog/serving-5-75-million-tokens-per-second-crusoes-mlperf-inference-v6-1-results-on-amd-mi355x) | 2026-09 | [1.1](#s-what-the-server-does-with-your-request), [5.3](#s-reading-other-peoples-benchmarks), [6.2](#s-moe-serving-deepep-and-eplb) |
| David Noel Ng | [GH200 基准，第 4 部分](https://dnhkng.github.io/posts/gh200-benchmarking-part-4-dsv4-released/) | 2026-08 | [4.4](#s-speculative-decoding) |
| DeepInfra | [vLLM vs SGLang](https://deepinfra.com/blog/vllm-vs-sglang) | 2026-08 | [5.3](#s-reading-other-peoples-benchmarks) |
| Doubleword | [SGLang 快速启动](https://fergusfinn.com/blog/fast-sglang-starts/) | 2026-04 | [7.1](#s-operating-sglang) |
| dstack | [Prefill-decode 配比基准](https://dstack.ai/blog/benchmarking-pd-ratios/) | 2025-09 | [6.3](#s-prefill-decode-disaggregation) |
| Hazy Research | [张量并行 Llama megakernel](https://hazyresearch.stanford.edu/blog/2025-09-28-tp-llama-main) | 2025-09 | [4.1](#s-forwardmode-and-cuda-graphs) |
| InferenceX by SemiAnalysis | [GLM-5 FP8 on MI355X](https://inferencex.semianalysis.com/blog/mi355x-glm5-fp8-sglang-40-cheaper-than-b200), [MI355X 上 DeepSeek-V4-Pro 的 26 天优化](https://inferencex.semianalysis.com/blog/mi355x-deepseek-v4-pro-sglang-110x-in-26-days),，以及 [GLM-5 NVFP4 on B200](https://inferencex.semianalysis.com/blog/b200-glm5-nvfp4-vs-h200-fp8-3-6x-perf-per-dollar) | 2026-05 | [4.1](#s-forwardmode-and-cuda-graphs), [5.3](#s-reading-other-peoples-benchmarks) |
| Jarvislabs | [H100 上的 SGLang 与 vLLM](https://jarvislabs.ai/blog/vllm-sglang-trtllm-comparison) | 2026-05 | [1.1](#s-what-the-server-does-with-your-request), [4.1](#s-forwardmode-and-cuda-graphs), [5.3](#s-reading-other-peoples-benchmarks) |
| Jarvislabs | [托管端点](https://jarvislabs.ai/blog/managed-endpoints) | 2026-08 | [3.4](#s-prefix-friendly-prompts), [6.4](#s-sgl-model-gateway) |
| joshua8.ai | [LLM 推理基准](https://joshua8.ai/llm-inference-benchmark/) | 2026-01 | [4.1](#s-forwardmode-and-cuda-graphs), [4.3](#s-quantization), [5.3](#s-reading-other-peoples-benchmarks) |
| LinkedIn Engineering | [LinkedIn 使用 SGLang 扩展 LLM 排序系统](https://www.linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin) | 2026-02 | [1.2](#s-check-that-the-server-is-healthy), [2.1](#s-sglang-serve-and-the-three-processes), [7.1](#s-operating-sglang) |
| Luca Lowndes | [SGLang 优化](https://luca.lowndes.net/blog/sglang-optimisations) | 2025-11 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| Modal | [LLM 年鉴](https://modal.com/llm-almanac/summary) | 2025-06 | [5.3](#s-reading-other-peoples-benchmarks) |
| Novita AI | [Hugging Face：SGLang 与 GLM MoE 模型](https://huggingface.co/blog/novita/sglang-glm4-moe) | 2026-01 | [6.3](#s-prefill-decode-disaggregation) |
| Pivot News | [混合 Blackwell 基准摘要](https://pivotnews.ai/build/benchmarking-vllm-vs-sglang-vs-llama-cpp-on-a-mixed-blackwel) | 2026-05 | [4.3](#s-quantization), [5.3](#s-reading-other-peoples-benchmarks) |
| RunPod | [何时选择 SGLang 而非 vLLM](https://runpod.ghost.io/when-to-choose-sglang-over-vllm-multi-turn-conversations-and-kv-cache-reuse/) | 2025-06 | [3.3](#s-radixcache), [5.3](#s-reading-other-peoples-benchmarks) |
| SemiAnalysis | [InferenceMAX](https://newsletter.semianalysis.com/p/inferencemax-open-source-inference) | 2025-10 | [1.1](#s-what-the-server-does-with-your-request), [5.3](#s-reading-other-peoples-benchmarks) |
| Spheron | [vLLM vs TensorRT-LLM vs SGLang](https://www.spheron.network/blog/vllm-vs-tensorrt-llm-vs-sglang-benchmarks/) | 2026 | [1.1](#s-what-the-server-does-with-your-request), [5.3](#s-reading-other-peoples-benchmarks) |
| Steve Rawlinson | [双 H100 上的 vLLM 与 SGLang](https://rawlinson.ca/articles/vllm-vs-sglang-performance-benchmark-h100) | 2025-12 | [1.1](#s-what-the-server-does-with-your-request), [3.2](#s-mem-fraction-static-and-startup-sizing), [5.3](#s-reading-other-peoples-benchmarks) |
| Thinking Machines | [消除 LLM 推理的不确定性](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) | 2025-09 | [4.6](#s-deterministic-inference-and-logprobs) |
| Varad More | [推理引擎基准系统](https://github.com/varad-more/inference-engine-benchmark-system) | 2026-04 | [3.3](#s-radixcache), [4.2](#s-attention-backend), [4.5](#s-structured-outputs-with-xgrammar), [5.3](#s-reading-other-peoples-benchmarks) |
| vLLM 社区 | [讨论 #17221](https://github.com/vllm-project/vllm/discussions/17221) | 2025-04 | [5.3](#s-reading-other-peoples-benchmarks) |

## 第 7 级：SGLang 团队与厂商报告

| 作者 | 报告 | 月份 | 使用章节 |
|---|---|---|---|
| LMSYS | [SGLang 与 Llama 3](https://www.lmsys.org/blog/2024-07-25-sglang-llama3/) | 2024-07 | [5.3](#s-reading-other-peoples-benchmarks) |
| LMSYS | [SGLang v0.4：零开销批次调度器](https://lmsys.org/blog/2024-12-04-sglang-v0-4/) | 2024-12 | [2.4](#s-the-overlap-scheduler), [6.1](#s-tp-size-dp-size-and-attn-dp-size), [6.4](#s-sgl-model-gateway) |
| LMSYS | [96 张 H100 上 DeepSeek 的 PD 分离与大规模 EP](https://lmsys.org/blog/2025-05-05-large-scale-ep/) | 2025-05 | [6.2](#s-moe-serving-deepep-and-eplb), [6.3](#s-prefill-decode-disaggregation) |
| LMSYS 博客的 Mooncake 团队 | [Kimi K2 与大规模 EP](https://www.lmsys.org/blog/2025-07-20-k2-large-scale-ep/) | 2025-07 | [6.3](#s-prefill-decode-disaggregation) |
| LMSYS | [SGLang HiCache](https://lmsys.org/blog/2025-09-10-sglang-hicache/) | 2025-09 | [3.5](#s-eviction-policies-and-hicache) |
| SGLang | [v0.5.21 发布说明](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) | 2026-10 | [3.5](#s-eviction-policies-and-hicache) |
| Google Cloud | [Vertex AI 上的 EAGLE-3](https://docs.cloud.google.com/gemini-enterprise-agent-platform/blog/posts/from-research-to-production-accelerate-oss-llm-with-eagle-3-on-vertex) | 2025-11 | [4.4](#s-speculative-decoding) |
| Modal with Decagon | [Decagon 案例](https://frontend.modal.com/blog/decagon-case-study) | 2025-11 | [4.4](#s-speculative-decoding) |
| LMSYS and RadixArk | [Miles](https://www.lmsys.org/blog/2025-11-19-miles/) | 2025-11 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| RadixArk | [Miles v0.1](https://www.lmsys.org/blog/2026-08-18-miles-v0-1/) | 2026-08 | [7.2](#s-sglang-as-an-rl-rollout-engine) |
| Miles 团队 | `docs/advanced/p2p-weight-transfer.md`（Miles v0.1.2） | 2026-10 | [7.2](#s-sglang-as-an-rl-rollout-engine) |

Sources: front.md; sections/ 下各文件的来源行与引用。
