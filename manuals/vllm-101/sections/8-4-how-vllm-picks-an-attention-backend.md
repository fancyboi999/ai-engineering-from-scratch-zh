# vLLM 如何选择 attention backend

> 本节解释每种 GPU 型号的 backend 选择顺序，以及首选项无法运行时 vLLM 会选择什么。

前向计算中，attention kernel 是随 GPU 变化最大的部分。读完本节，你可以预测 vLLM 在自己的 GPU 上会选择哪个 backend，也能解释为什么改一个 flag 就会切换 backend。

## 每类 GPU 都有一份候选列表 {#s-how-vllm-picks-an-attention-backend-a-list-for-each-gpu-class}

vLLM 0.31.0 有 30 多种 attention backend。在 CUDA GPU 上，它会按顺序检查列表，并选择第一个满足模型与配置条件的 backend。标准 attention 模型的候选顺序如下：

| GPU | 顺序 |
|---|---|
| Blackwell 数据中心 GPU，例如 B200 | FlashInfer、FlashAttention、Triton、FlexAttention、TurboQuant |
| 其他所有 CUDA GPU，包括 L4 和 GB10 | FlashAttention、FlashInfer、Triton、FlexAttention、TurboQuant |

多头潜在注意力模型，例如 DeepSeek 系列，有自己的候选列表。

FlashAttention 也有不同版本。vLLM 在 Hopper GPU 上使用 v3，在支持它的 Blackwell 数据中心 GPU 上使用 v4。其他 GPU 使用 v2，因此我们的 L4 和 GB10 都运行了 FlashAttention 2。GB10 日志记录了实际选择及候选列表：

```listing
title: GB10 启动日志中的 backend 记录
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: vLLM 选择了列表中的第一项。
---
(EngineCore pid=143) INFO 10-21 10:53:17 [cuda.py:526] Using FLASH_ATTN attention backend out of potential backends: ['FLASH_ATTN', 'FLASHINFER', 'TRITON_ATTN', 'FLEX_ATTENTION'].
```

## 为什么 flag 会改变 backend {#s-how-vllm-picks-an-attention-backend-why-a-flag-changes-the-backend}

每个 backend 都声明了支持的 KV cache 数据类型、head size、block size 和 CUDA graph 模式。如果你的设置不受首选 backend 支持，vLLM 就会尝试下一个。

常见情况是 FP8 KV cache。在 L4 上，FlashAttention 2 无法读取 FP8 cache。设置 `--kv-cache-dtype fp8` 后，vLLM 会跳过它；如果已安装 FlashInfer，就选择 FlashInfer，否则选择 Triton。因此你的 FP8 结果同时测量了新数据类型和新 kernel。我们的 L4 上 FlashInfer 构建失败，[FP8 KV cache 章节](#s-fit-more-users-with-an-fp8-kv-cache)记录了这次情况。

## 为什么候选顺序不同 {#s-how-vllm-picks-an-attention-backend-why-the-order-differs}

我们的理解是：候选顺序反映了编写该列表时，各 GPU 类别上 kernel 的速度和测试成熟度。FlashInfer 针对 Blackwell 数据中心 GPU 做过调优，因此排在该列表首位。较早的 GPU 上，FlashAttention 的使用记录更长。这个顺序是会随版本变化的选择，不是固定定律。

所以每次启动、每次修改 flag 后，都要查看 backend 日志。如果两次运行使用了不同 backend，你比较的是 kernel，而不是配置。`--attention-backend` 可以用 enum 名称固定一个 backend，例如 `TRITON_ATTN`。

```takeaways
- vLLM 按 GPU 类型遍历候选列表，选择第一个支持当前设置的 backend。
- L4 上使用 FP8 KV cache 时，FlashAttention 2 会换成 FlashInfer 或 Triton。
- 每次启动后都检查 backend 记录；比较配置时固定 backend。
```

Sources: the vLLM source at v0.31.0 (vllm/platforms/cuda.py, vllm/v1/attention/backends/registry.py, vllm/v1/attention/backends/fa_utils.py), vLLM documentation at v0.31.0 (docs/design/attention_backends.md), vLLM issue 60262, capture/gpu/out-gb10/server-load-vllm.log.
