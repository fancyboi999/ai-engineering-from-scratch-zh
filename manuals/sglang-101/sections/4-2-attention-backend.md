# --attention-backend

> SGLang 有多种注意力内核，因为没有哪一种能在所有 GPU 和模型上胜出；默认选择记录了别人已经付过代价的性能回退。

2026 年 1 月，一位用户升级 FlashInfer 后，在 H20 GPU 上服务 Qwen3-235B。token 间延迟中位数从 39.44 ms 上升到 283.52 ms，慢了七倍，而配置的其他部分都没变。同样测试下，FA3 内核为 56.73 ms。这就是 issue #17411，v0.5.22 选择注意力后端的代码仍引用它。

读完本节，你能说出 SGLang 为你的 GPU 和模型选择哪个后端，并解释原因。你也能为 prefill 和 decode 分别使用两个后端，判断何时应该覆盖默认值。

## 什么是注意力后端

**注意力后端：** 为一个 batch 在分页 KV 缓存上计算注意力的类。每个后端实现同一个接口，构建页表、索引缓冲区等逐 batch 元数据，为 CUDA graph 捕获与重放准备状态，并分别运行 `forward_extend` 完成 prefill、`forward_decode` 完成 decode。

模型代码从不按名称调用内核。每个注意力层调用的都是模型执行器在启动时安装的后端。因此一个参数就能替换所有模型中每层的内核。

v0.5.22 的参数接受 25 个名字。其中两个是别名（`nsa` 对应 `dsa`，`compressed` 对应 `dsv4`），因此实际有 23 个后端。

| 后端 | 用途 |
|---|---|
| `flashinfer` | 分页 MHA 和 MLA。支持大于 1 的推测 topk 和大于 1 的页大小。通用默认值。 |
| `fa3` | 面向 Hopper 的 FlashAttention 3。Hopper 的默认后端。 |
| `fa4` | 面向 Blackwell 的 FlashAttention 4。模型 K 与 V 的头宽度不同时选择它。 |
| `trtllm_mha`, `trtllm_mla` | 通过 FlashInfer 调用 TensorRT-LLM 内核，面向 Blackwell SM100 和 SM103。 |
| `flashmla`, `cutedsl_mla`, `tokenspeed_mla` | 面向 DeepSeek 等 MLA 模型的 decode 内核。 |
| `dsa`, `dsv4`, `qsa`, `minicpm_*` | 各自服务一个模型家族的稀疏注意力。 |
| `triton` | 可移植 Triton 内核。FlashInfer 无法运行模型时的默认值。 |
| `torch_native`, `flex_attention` | PyTorch 参考路径。Apple MPS 和 ARM64 CPU 默认使用 `torch_native`。 |
| `aiter`, `wave` | AMD ROCm 内核。AMD 上 MHA 默认使用 `aiter`。 |
| `intel_amx`, `intel_xpu`, `ascend`, `hpc_ops` | 分别面向支持 AMX 的 x86 CPU、Intel GPU、华为 NPU，以及面向 SM90 的腾讯内核。 |
| `llada2_cfg_flashinfer` | 扩散语言模型变体。 |

## 直观的选择为什么行不通

直观做法是看一份基准，找出最快的内核，然后让所有服务器都使用它。这行不通，因为每个后端都有基准里未体现的限制。

`trtllm_mha` 不接受 topk 大于 1 的推测解码，也无法在 SM120 上运行。FlashInfer 无法运行使用 attention sink 的模型。`fa4` 的原生页大小为 128。有些后端接受 FP8 KV 缓存，有些不接受。某个内核在一种模型和 GPU 上胜出，换一种组合却可能根本无法启动。

## SGLang 如何选择默认值

不传 `--attention-backend` 时，启动过程会调用一个函数，读取 GPU、模型注意力类型和推测解码设置。

```figure
id: fig-4-3
kind: decision
title: v0.5.22 的默认注意力后端
claim: SGLang 根据 GPU 代际和模型注意力类型选择后端，每个分支都记录了实测限制。
caption: 从上往下读。MHA 模型走左侧路径，MLA 模型走右侧。Hopper 指 CUDA 12.3 及以上。依据 v0.5.22 的 get_default_attn_backend。
```

对于 Llama、Qwen 等 MHA 模型，优先级如下：

1. Hopper、CUDA 12.3 及以上、且推测 topk 不大于 1 时，默认 `fa3`。代码注释引用了 issue #17411。
2. Blackwell SM100 或 SM103 默认 `trtllm_mha`；K 与 V 宽度不同时改用 `fa4`。
3. AMD 默认 `aiter`，Apple MPS 默认 `torch_native`。
4. 其余情况，如果安装了 FlashInfer 且模型没有 attention sink，则默认 `flashinfer`，否则为 `triton`。

对于 DeepSeek V3 等 MLA 模型，Hopper 选择 `fa3`，Blackwell 选择 `flashinfer`。AMD 在每个 rank 有 16 或 128 个 KV 头时选择 `aiter`。之后模型覆盖规则会将 SM100 上的 DeepSeek V3 改为 `trtllm_mla`。

同一函数的文档字符串称，页大小大于 1 时会避开 FA3。但代码没有检查页大小。注释与代码冲突时，实际运行的是代码。

## 一台服务器使用两个后端

Prefill 与 decode 对系统的压力不同。Prefill 读取长 query 块，decode 则用一个 query 读取长缓存。`--prefill-attention-backend` 和 `--decode-attention-backend` 分别设置两个阶段。两者不同时，SGLang 会用一个混合后端包装它们，根据 `ForwardMode` 分派。启用推测解码后，由 `--speculative-attention-mode` 决定两个后端中的哪一个运行验证，默认值为 `prefill`。

## 文档与代码不一致

v0.5.22 文档的注意力后端页面仍列出了 Cutlass MLA 和 Dual Chunk FlashAttention。PR #32114 在 2026-09-10 删除了两者，该标签下这两个名字都不是有效选项。同一页面称 Blackwell MHA 使用 `trtllm_mha`，但 K 与 V 宽度不对称的模型实际选择 `fa4`。这两种情况都以代码为准，本手册遵循代码。

## 应该测什么

做基准前，先读启动日志里最终选定的后端。然后每次只改一个参数，以真实并发重跑相同基准，比较 p50 和 p99 的 token 间延迟。注意力只占 decode 步骤的一部分，因此内核自身基准中的加速，未必会等比例反映在端到端指标上。

我们在 Mac 上捕获运行时，SGLang 走 MLX runtime。服务参数解析出 `torch_native`，但 MLX 使用自己的注意力路径，因此没有运行这里列出的后端。

## 上游在 L4 上测到了什么

上游在单张 L4 上用 `Qwen/Qwen3-8B` 运行[第 5.1 节](#s-sglang-benchmark-serving) 的负载扫描，每点三个 seed。默认服务器于 2026-10-16 运行，选择 `flashinfer` 后端；另一台于 2026-10-18 运行，设置 `--attention-backend triton`。两者池容量均为 24,094 token，最多为 48 个运行请求捕获 decode graph。每次运行时钟中位数不低于 1,000 MHz。

```listing
title: 负载下的 Triton 服务器
source: capture/gpu/out-l4/server-load-triton.log
lang: text
note: 启动时的池，以及 33 个运行中请求时的一行 decode 日志。
---
[2026-10-18 14:28:40] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-18 16:11:42] Decode batch, #running-req: 33, #token: 20422, token usage: 0.85, cuda graph: True, gen throughput (token/s): 311.50, #queue-req: 0
```

| 并发 | 输出 tok/s，flashinfer / triton | TPOT 中位数，flashinfer / triton | TTFT 中位数，flashinfer / triton |
|---|---|---|---|
| 1 | 13.42 / 13.94 | 60.16 / 59.98 ms | 189 / 183 ms |
| 8 | 112.62 / 112.90 | 66.01 / 65.83 ms | 170 / 187 ms |
| 32 | 270.11 / 270.91 | 96.18 / 96.99 ms | 2,970 / 2,833 ms |
| 64 | 250.85 / 257.29 | 107.42 / 107.76 ms | 18,349 / 18,260 ms |

**上游实测**两者的吞吐量和每 token 耗时中位数接近。吞吐量差距不超过 4%，TPOT 中位数差距不超过 1 ms。TTFT 中位数最多相差 9%，在并发 2、16 和 32 时超出 seed 波动；两台服务器运行日期不同。可能的解释是：稠密 8B 模型的上下文长度低于 1,000 token，注意力内核只占每步的一小部分，权重读取决定速度。

## 我们的建议

除非已经在自己的流量上测过，否则不设置 `--attention-backend`。默认值包含了其他用户发现的回退，例如 #17411，也包含 SM100 上 DeepSeek V3 这样的模型覆盖规则。同一个 issue 也是例外：用户认真测量后，可能找到比库升级后失效的默认值更好的选项。先测量，再覆盖，并在参数旁记录原因。

优先选择支持全部所需功能的后端，而非微基准最快的后端。页大小大于 1 时，topk 大于 1 的推测解码需要 `flashinfer`、`fa3` 或 `triton`。

## 事故

**库升级使 Hopper 慢了七倍。** Issue #17411（2026-01-20）：FlashInfer 0.6.1 的 Hopper 注意力内核发生回退，H20 上 token 间延迟中位数从 39.44 ms 上升到 283.52 ms。两天后，SGLang 将 `fa3` 设为 Hopper MHA 默认后端。

**另一个引擎没有使用计算图。** Varad More 的实践报告 {{field Varad More 2026-04}} 在单张 A10G 上测试 Gemma 3 4B，SGLang 为 149 tok/s，vLLM 为 84 tok/s。原因不在注意力速度：由于模型交错使用滑动窗口注意力，vLLM 采用了 `--enforce-eager`，未启用 CUDA graphs。只有两台服务器都重放计算图，后端比较才公平。

```takeaways
- 每次做基准前，读取启动日志中最终选定的注意力后端。
- 先在自己的流量上测出更好的选择，再设置 --attention-backend。
- 选择后端前，检查推测 topk、页大小等功能限制。
- 固定内核库版本，每次升级后重跑延迟测试。
```

来源：python/sglang/srt/arg_groups/model_override_base.py (get_default_attn_backend), arg_groups/choices.py (ATTENTION_BACKEND_CHOICES), layers/attention/base_attn_backend.py, layers/attention/attention_registry.py, model_executor/model_runner_components/attention_backend_setup.py, arg_groups/fields/spec.py, and docs/docs/advanced_features/attention_backend.mdx at v0.5.22; PR #32114; issue #17411; field report by Varad More (2026-04-22); capture/gpu/out-l4/server-load-triton.log, capture/gpu/summary/l4.json (load.default, load.triton).
