# 使用 FP8 KV cache 容纳更多用户

> FP8 KV cache 能让缓存容量容纳双倍 token；在 L4 上，它还会悄悄改变 attention backend。

服务器因 KV cache 已满而将请求排队。读完本节，你可以将 KV 缓存池容量翻倍，并检查对速度和准确率的影响。

**我们的测量结果：**第一次在 L4 上使用 FP8 启动失败，改用 Triton backend 后启动成功。在缓存池大小不变时，单用户每个 token 的生成速度提高了 2.3%。

## 启用 FP8 {#s-fit-more-users-with-an-fp8-kv-cache-turn-it-on}

KV cache 为每层、每个 head 和每个 token 保存两个值。默认情况下，vLLM 使用模型的数据类型存储这些值。`Qwen/Qwen3-8B` 使用 BF16，每个值占 2 字节。FP8 则将每个值压到 1 字节：

```bash
vllm serve Qwen/Qwen3-8B --kv-cache-dtype fp8
```

模型权重仍然使用 BF16。只有 KV cache 的数据类型会改变。

## 计算它能增加多少容量 {#s-fit-more-users-with-an-fp8-kv-cache-count-what-it-gives-you}

根据[内存估算](#s-count-the-memory-before-you-pick-a-gpu)中的公式计算，并将每个值按 1 字节计算。`Qwen/Qwen3-8B` 在 BF16 下每个 token 需要 144 KiB，在 FP8 下需要 72 KiB。

```figure
id: fig-2-4
kind: chart
title: 1 GiB 可存储的 KV token 数
claim: Qwen3-8B 的 KV cache 每 GiB 在 BF16 下可容纳约 7,300 个 token，在 FP8 下可容纳约 14,600 个。
caption: 数值根据每个 token 所需的字节数计算，不是运行测得。来源：Qwen/Qwen3-8B 模型配置。
```

相同内存可以容纳双倍 token。因此，在上下文长度不变时，可以容纳双倍用户；也可以让每个用户使用两倍长度的上下文。

## 修复 L4 上的启动问题 {#s-fit-more-users-with-an-fp8-kv-cache-fix-the-start-on-an-l4}

我们第一次在 L4 上使用 `--kv-cache-dtype fp8` 启动失败。原因是 attention backend：

1. vLLM 会优先在 L4 上尝试 FlashAttention。
2. vLLM 0.31.0 的 FlashAttention 只在 Hopper 和 Blackwell 数据中心 GPU 上读取 FP8 KV cache。L4 是 Ada GPU，SM 8.9。
3. vLLM 接着尝试列表中的下一个 backend：FlashInfer。
4. FlashInfer 会在首次启动时编译 kernel。我们的节点在编译期间失败。

```listing
title: L4 上的 FlashInfer 编译错误
source: capture/gpu/incidents/l4-vllm-kv-fp8-flashinfer-attention-jit.txt
lang: text
note: 记录了 2026-10-22 的 FP8 启动。vLLM 在两个可用 backend 中选择 FlashInfer。编译 FP8 prefill kernel 失败，因为 CUDA 编译器与 CUDA 头文件来自不同版本。
---
(EngineCore pid=814129) INFO 10-22 09:11:03 [cuda.py:526] Using FLASHINFER attention backend out of potential backends: ['FLASHINFER', 'TRITON_ATTN'].
(EngineCore pid=814129) ERROR 10-22 09:11:53 [core.py:1433] /data/vllm/.venv/lib/python3.12/site-packages/flashinfer/data/cccl/libcudacxx/include/cuda/std/__cccl/cuda_toolkit.h:41:8: error: #error "CUDA compiler and CUDA toolkit headers are incompatible, please check your include paths"
RuntimeError: Engine core initialization failed. See root cause above. Failed core proc(s): {}
```

在同一节点上，FlashInfer sampler 也遇到了相同的编译错误。因此，我们的 sweep 工具会设置 `VLLM_USE_FLASHINFER_SAMPLER=0` 来启动 vLLM。

这里应选择 Triton backend。它能读取 FP8 KV cache，也不需要编译 FlashInfer。此外，还要像 sweep 工具那样关闭 FlashInfer sampler：

```bash
VLLM_USE_FLASHINFER_SAMPLER=0 vllm serve Qwen/Qwen3-8B --kv-cache-dtype fp8 --attention-backend TRITON_ATTN
```

[Attention backend](#s-change-the-attention-backend-only-for-a-reason)一节会解释 vLLM 如何选择 backend。

## 查看我们的测量结果 {#s-fit-more-users-with-an-fp8-kv-cache-see-what-our-run-shows}

**我们的测量：**2026-10-22，我们在 L4 上使用 Qwen3-8B，将 Triton backend 下的 FP8 KV cache 与 BF16 默认配置进行比较。两个配置都在[降频时段](#s-front-l4-sessions)以 1 和 32 个用户运行。

两次运行都将缓存池固定为 24,096 个 token，详见[固定缓存池](#s-count-the-memory-before-you-pick-a-gpu)。因此，本次运行没有测量缓存池扩大的效果，只测量速度变化。

| 用户数（L4 降频时段） | TPOT 中位数，BF16 / FP8 | 输出 token/s，BF16 / FP8 | SM 时钟中位数，BF16 / FP8 | 种子数，BF16 / FP8 |
|---|---|---|---|---|
| 1 | 104.1 / 101.8 ms | 10.59 / 10.75 | 210 / 210 MHz | 3 / 2 |
| 32 | 142.7 / 138.0 ms | 186.68 / 192.00 | 450 / 480 MHz | 3 / 2 |

单用户时，FP8 每个 token 的速度提高 2.3%，两次运行的时钟相同，随机种子的结果范围也不重叠。32 个用户时，随机种子结果范围重叠，而且 FP8 运行时的时钟更高，所以我们不宣称该配置有性能提升。

这两次运行同时改变了 KV 数据类型和 backend。表中的结果无法区分是哪一项带来了提升。两次运行期间 GPU 都处于降频状态，因此应比较比例，不要比较绝对耗时。

## 检查准确率 {#s-fit-more-users-with-an-fp8-kv-cache-check-the-accuracy}

2026-10-23，我们在 L4 上使用 Qwen3-8B，以 8-shot greedy 模式运行了 GSM8K 前 500 道题。Qwen3-8B 没有 KV scale，因此 FP8 KV cache 运行使用 scale 1.0。FP8 KV cache 使用上文的 Triton backend。

```listing
title: vLLM 0.31.0 在 Qwen3-8B 上的 GSM8K 准确率，500 题，8-shot
source: capture/gpu/out-l4/gsm8k-fp8-accuracy.txt
lang: text
note: 展示 vLLM 的结果。同一文件中的 SGLang 结果已省略。
---
engine   config                     correct   accuracy   Wilson 95% interval
…
vLLM     BF16                       459/500   91.8%      89.1 to 93.9
vLLM     FP8 weights                453/500   90.6%      87.7 to 92.9
vLLM     FP8 KV cache               454/500   90.8%      87.9 to 93.0
vLLM     FP8 weights + FP8 KV       453/500   90.6%      87.7 to 92.9
```

所有置信区间都与 BF16 的区间重叠，因此本次测量没有发现差异。500 题不足以排除几个百分点的准确率损失。结果只适用于一个模型和一个基准，应在自己的模型和任务上进行同样的检查。attention 布局不同的模型可能损失更多。

vLLM 博客于 2026 年 4 月发布了文章《The State of FP8 KV-Cache and Attention Quantization in vLLM》，测试未经校准的 FP8 KV cache。作者来自 AWS 和 Red Hat。测试中大多数模型的结果接近 BF16，也有少数例外。文章指出使用 FlashMLA backend 的 Kimi-K2.5 不适合未经校准的 scale。我们没有自行测量这些结果。

### 检查模型是否加载了 scale {#s-fit-more-users-with-an-fp8-kv-cache-check-that-your-scales-load}

有校准 scale 的 checkpoint 不一定会使用它们。0.31.0 的 issue 54623 报告，Qwen3.5 模型系列从未加载 KV scale。Issue 60333 则报告一个 MTP draft loader 存在相同问题。这两项 issue 都尚未关闭。

先检查 checkpoint 是否包含 scale。在 Hugging Face cache 的权重索引中搜索以 `k_scale` 或 `v_scale` 结尾的 tensor 名称。将下面的模型目录替换为自己的模型：

```bash
grep -oE '"[^"]*(k|v)_scale"' ~/.cache/huggingface/hub/models--Qwen--Qwen3-8B/snapshots/*/model.safetensors.index.json | head
```

没有输出，说明 checkpoint 不含 scale。

只有一个权重文件的 checkpoint 没有索引。此时可使用 `safetensors` Python 包列出 tensor 名称。

然后查看启动日志。如果出现 `Using KV cache scaling factor 1.0`，表示 vLLM 使用的 scale 是 1.0。如果 checkpoint 带有 scale，而日志仍有这条 warning，说明 loader 丢弃了 scale。

最后，在生产环境部署前，用自己的提示词分别运行 FP8 和 BF16，比较输出结果。

## 了解 0.31.0 之后的变化 {#s-fit-more-users-with-an-fp8-kv-cache-know-what-changed-after-0-31-0}

0.32.0 新增适用于 SM 8.x 和 SM 12.x GPU 的 NVFP4 KV cache，覆盖 L4 和 GB10。它每个 token 所需的字节数比 FP8 更少。我们尚未测试这个功能。

```takeaways
- 改变 KV 数据类型后，查看日志中的 attention backend。
- FlashInfer 编译失败时，先尝试 `--attention-backend TRITON_ATTN`。
- 检查是否出现 scale 1.0 warning，并用自己的提示词检查输出质量。
```

来源：capture/gpu/summary/l4.json（load.vllm-fast-b、load.vllm-kv-fp8-triton），capture/gpu/incidents/l4-vllm-kv-fp8-flashinfer-attention-jit.txt、capture/gpu/incidents/l4-vllm-flashinfer-jit.txt，vLLM 0.31.0 源码（vllm/platforms/cuda.py、vllm/v1/attention/backends/fa_utils.py、vllm/v1/attention/backends/triton_attn.py），vLLM 0.31.0 文档（docs/features/quantization/quantized_kvcache.md），vLLM 博客文章《The State of FP8 KV-Cache and Attention Quantization in vLLM》（2026-04-22），vLLM issues 54623 和 60333，v0.32.0 发布说明（NVFP4 KV cache），capture/gpu/out-l4/gsm8k-fp8-accuracy.txt。
