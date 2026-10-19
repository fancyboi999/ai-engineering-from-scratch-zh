# 证据对照：推理优化：KV 缓存、量化与批处理

中文主题：[推理优化：KV 缓存、量化与批处理](../inference-optimization.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 任务

对应主题区块：**任务**（`task-table`）。

来源文件：

- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)

构建器核对的标识与数值：

- `--enable-prefix-caching`
- `--kv-cache-dtype`
- `--tensor-parallel-size`
- `--max-model-len`
- `--gpu-memory-utilization`
- `speculative_config`
- `spec_decode_metrics.accepted_tokens_per_request`
- `spec_decode_metrics`
- `accepted_tokens_per_request`
- `attn_implementation`
- `flash_attention_2`

## 部署模型服务

对应主题区块：**部署模型服务**（`annotated-code`）。

来源文件：

- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md`](../../phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md)

构建器核对的标识与数值：

- `--tensor-parallel-size`
- `--max-model-len`
- `--enable-prefix-caching`
- `--kv-cache-dtype`

## Python 离线批处理

对应主题区块：**Python 离线批处理**（`annotated-code`）。

来源文件：

- [`phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md`](../../phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md)
- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)

构建器核对的标识与数值：

- `LLM`
- `tensor_parallel_size`
- `enable_prefix_caching`
- `max_model_len`
- `gpu_memory_utilization`
- `max_tokens`
- `SamplingParams`
- `llm.generate`
- `generate`

## 公式

对应主题区块：**公式**（`concepts`）。

来源文件：

- [`phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md`](../../phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md)
- [`phases/10-llms-from-scratch/11-quantization/docs/zh.md`](../../phases/10-llms-from-scratch/11-quantization/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)

构建器核对的标识与数值：

- `num_layers`
- `num_kv_heads`
- `head_dim`
- `seq_len`
- `bytes_per_param`
- `queue_time`
- `network_request`
- `prefill_time`
- `output_tokens`
- `network_response`
- `max`
- `abs`
- `clamp`
- `round`

## 推理服务引擎

对应主题区块：**推理服务引擎**（`architecture`）。

来源文件：

- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)
- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 调度器的一次迭代

对应主题区块：**调度器的一次迭代**（`flow`）。

来源文件：

- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 常用默认值

对应主题区块：**常用默认值**（`defaults`）。

来源文件：

- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md`](../../phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md)
- [`phases/10-llms-from-scratch/11-quantization/docs/zh.md`](../../phases/10-llms-from-scratch/11-quantization/docs/zh.md)

构建器核对的标识与数值：

- `16 token`
- `512 token`
- `--gpu-memory-utilization`
- `0.9`
- `speculative_config`
- `Q4_K_M`
- `AWQ`
- `128-1024`

## 选择量化格式

对应主题区块：**选择量化格式**（`command-table`）。

来源文件：

- [`phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md`](../../phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md)
- [`phases/10-llms-from-scratch/11-quantization/docs/zh.md`](../../phases/10-llms-from-scratch/11-quantization/docs/zh.md)

构建器核对的标识与数值：

- `Q4_K_M`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md`](../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)
- [`phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md`](../../phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 术语表

对应主题区块：**术语表**（`glossary`）。

来源文件：

- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)
- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/10-llms-from-scratch/11-quantization/docs/zh.md`](../../phases/10-llms-from-scratch/11-quantization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md`](../../phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md)
- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md`](../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md)
- [`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md`](../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md)
- [`phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md`](../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md)
- [`phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md`](../../phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/inference-optimization.md

Paths are relative to /private/tmp/aiefs-cheatsheets/phases/. KV = 07-transformers-deep-dive/12-kv-cache-flash-attention/docs/en.md, IO = 10-llms-from-scratch/12-inference-optimization/docs/en.md, QZ = 10-llms-from-scratch/11-quantization/docs/en.md, VL = 17-infrastructure-and-production/04-vllm-serving-internals/docs/en.md, EG = 17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/en.md, MT = 17-infrastructure-and-production/08-inference-metrics-goodput/docs/en.md, PQ = 17-infrastructure-and-production/09-production-quantization/docs/en.md.

## Tasks (task-table, 8)
- --enable-prefix-caching: KV:199
- --kv-cache-dtype fp8: KV:200
- --tensor-parallel-size 4: KV:197
- --max-model-len 32768: KV:198
- --gpu-memory-utilization 0.9 (default 0.9): VL:33
- speculative_config with "method": "eagle3": VL:61, EG:25,49
- spec_decode_metrics.accepted_tokens_per_request: EG:50
- attn_implementation="flash_attention_2": KV:186

## Serve a model (annotated-code, 6 lines)
- pip install vllm and vllm serve command: KV:195-200
- FP8 KV affects attention accuracy: PQ:84

## Offline batch in Python (annotated-code, 10 lines)
- LLM(...) and SamplingParams and llm.generate: IO:695-706
- gpu_memory_utilization as HBM share for KV blocks: VL:33
- continuous batching inside the engine: IO:204 (vLLM: PagedAttention, continuous batching)

## Formulas (concepts, 8)
- KV cache size formula: IO:86
- Llama 3 70B 320 KB, 1.28 GB, 40 GB: IO:92-94
- ops:byte definition and ~1 at decode batch 1: IO:55,58
- TTFT formula: MT:27
- E2E formula: MT:41
- spec speedup and K=5, alpha=0.7 gives 4.1x: EG:31
- INT8 scale and clamp: QZ:100-101
- goodput: MT:53-55

## Serving engine (architecture, 7 nodes, 6 edges)
- waiting queue, RUNNING list, scheduler per decode iteration: VL:39-45
- KV block pool 16-token blocks, block table: VL:31
- fused forward, one GPU call: VL:91
- draft proposes K tokens, target verifies: EG:21

## One scheduler iteration (flow, 7)
- 1: VL:41, VL:75. 2: VL:31,76. 3: VL:42,78-81. 4: VL:51,87. 5: VL:89. 6: VL:91. 7: VL:31

## Defaults worth knowing (defaults, 7)
- PagedAttention block 16 tokens, under 4 percent: VL:31,33
- chunked prefill 512 tokens, P99 ITL: VL:51,14
- --gpu-memory-utilization 0.9: VL:33
- speculative_config opt-in: EG:25
- GGUF Q4_K_M production default: PQ:38
- AWQ datacenter default unless multi-LoRA: PQ:3,52
- PTQ calibration data 128-1024 examples: QZ:154

## Pick a quantization format (command-table, 6)
- GGUF Q4_K_M CPU/edge llama.cpp: PQ:29,38
- GPTQ multi-LoRA, Marlin: PQ:30,44-46
- AWQ ~741 tok/s on 7B: PQ:50-52
- FP8 near-lossless, reasoning, medical, code: PQ:56
- NVFP4 Blackwell, validate per model: PQ:34,58-65
- FP8 KV separate choice: PQ:84

## Troubleshooting (8)
- P99 ITL on long prompts, chunked prefill: VL:49-51
- alpha below 0.55: EG:35,51
- mean ITL down, P99 up, two-pass: EG:56, EG:90
- 4-bit model OOM, KV stays FP16/FP8: PQ:75-82
- calibration on generic text: PQ:69-71
- AWQ INT4 loses 3-5 points on MATH, use FP8 or BF16: PQ:88
- tools disagree on TPOT: MT:76-83
- compatibility matrix: VL:61, EG:71

## Glossary (8)
- TTFT, TPOT, ITL, E2E, P99: MT:127-133
- HBM 80 GB on H100, ~3 TB/s: KV:220
- Alpha: EG:98
- PTQ: QZ:144

## Q&A (5)
- decode memory-bound ~1 op per weight: IO:58
- GQA 8 KV heads 4 KB per token per layer: KV:45-48,54
- spec decoding exact: IO:186
- Flash Attention exact via running softmax: KV:89
- 60 percent goodput is failure: MT:55

## Tips (6)
- P50, P90, P99: MT:63
- measure alpha first: EG:3,48-51
- prefix caching for agents, 5x: KV:203
- calibrate in-domain, hundreds of samples: PQ:71
- 2x peak concurrency, 30-50 iterations: MT:99-100
- publish tool, version, model, hardware, concurrency, prompt distribution: MT:101
````
