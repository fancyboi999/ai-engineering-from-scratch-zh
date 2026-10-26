# 有理由时再更改 attention backend

> vLLM 会为你的 GPU 选择 attention backend；只有两种情况值得手动覆盖。

论坛帖子说另一个 attention backend 更快。读完本节，你可以查看 vLLM 选中的 backend，并判断何时需要覆盖它。

**我们的测量结果：**在 L4 上，强制使用 Triton backend 修复了 vLLM 所选 backend 启动失败的问题。

## 查看 vLLM 选择的 backend {#s-change-the-attention-backend-only-for-a-reason-read-the-backend-vllm-picked}

vLLM 启动时会写一行日志，显示已选 backend 以及其他可运行的 backend。用以下命令搜索日志：

```bash
grep "attention backend" server.log
```

我们在 DGX Spark 上使用 Qwen3-30B-A3B 和默认配置时，看到的日志如下：

```listing
title: DGX Spark 上的 attention backend 日志
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 列表中只包含与模型和当前设置兼容的 backend，顺序即 vLLM 尝试它们的顺序。
---
(EngineCore pid=143) INFO 10-21 10:53:17 [cuda.py:526] Using FLASH_ATTN attention backend out of potential backends: ['FLASH_ATTN', 'FLASHINFER', 'TRITON_ATTN', 'FLEX_ATTENTION'].
```

## 了解 vLLM 的尝试顺序 {#s-change-the-attention-backend-only-for-a-reason-know-the-order-vllm-tries}

vLLM 会根据 GPU 类型选择一组 backend。接着，它会排除与模型或当前设置不兼容的 backend，并选用剩下列表中的第一个。vLLM 0.31.0 对标准模型使用以下顺序：

| GPU | 示例 | 顺序 |
|---|---|---|
| SM 10.x | B200、GB200 | FlashInfer、FlashAttention、Triton、FlexAttention、TurboQuant |
| 其他 NVIDIA GPU | L4（SM 8.9）、H100（SM 9.0）、DGX Spark（SM 12.1） | FlashAttention、FlashInfer、Triton、FlexAttention、TurboQuant |

backend 被移除的原因只写入 debug 日志，不会写入 info 日志。将启动行中的列表与上表比较；缺失的 backend 已被排除。

## 了解 FP8 KV cache 会触发的切换 {#s-change-the-attention-backend-only-for-a-reason-know-the-switch-that-an-fp8-kv-cache-makes}

vLLM 0.31.0 中，FlashAttention 只会在 SM 9.0 和 SM 10.x 系列上读取 FP8 KV cache。因此，在 L4 或 DGX Spark 上设置 --kv-cache-dtype fp8 会悄悄改变 backend，不会出现 warning。[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)一节介绍了我们在 L4 上的实际情况。

## 强制指定 backend {#s-change-the-attention-backend-only-for-a-reason-force-a-backend}

使用 --attention-backend 设置 backend：

```bash
vllm serve Qwen/Qwen3-8B --kv-cache-dtype fp8 --attention-backend TRITON_ATTN
```

指定的 backend 与模型或设置不兼容时，vLLM 会在启动时停止，并给出原因。它不会自动改用另一个 backend。因此可以安全地尝试强制指定：要么成功运行，要么立即报错。

--block-size 也可能排除某些 backend。如果它排除了列表中较早的 backend，vLLM 会写出一条指出该 backend 的 warning。

## 查看我们的测量 {#s-change-the-attention-backend-only-for-a-reason-see-what-our-run-shows}

我们唯一一次强制指定 backend 的测试，同时更改了 backend 和 KV 数据类型，因此[结果](#s-fit-more-users-with-an-fp8-kv-cache)无法说明哪个 backend 更快。我们没有在任何 GPU 上比较过相同 KV 数据类型下的不同 backend。

## 设置建议 {#s-change-the-attention-backend-only-for-a-reason-decide}

将 backend 留给 vLLM 选择。只有以下两种情况需要覆盖：

- vLLM 选择的 backend 无法启动，例如 FlashInfer 在我们的 L4 上失败。
- 在自己的负载下测出速度变慢，并在相同负载下确认另一个 backend 能修复。

论坛帖子所说的性能优势可能来自不同 GPU、模型或负载。更改设置前，应在自己的环境中测量。

```takeaways
- 更改前，先查看启动日志中的 attention backend。
- 只有启动失败或确认存在性能问题时才覆盖 backend。
- 强制使用不兼容的 backend 时，服务器会停止并说明原因。
```

来源：capture/gpu/out-gb10/server-load-vllm.log、capture/gpu/incidents/l4-vllm-kv-fp8-flashinfer-attention-jit.txt、capture/gpu/summary/l4.json（load.vllm-fast-b、load.vllm-kv-fp8-triton），vLLM 0.31.0 源码（vllm/platforms/cuda.py、vllm/v1/attention/backends/fa_utils.py、vllm/v1/attention/backends/flash_attn.py）。
