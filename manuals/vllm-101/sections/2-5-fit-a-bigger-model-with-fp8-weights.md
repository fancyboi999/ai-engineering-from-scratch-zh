# 用 FP8 权重装下更大的模型

> FP8 权重能为 KV cache 腾出内存，速度变化取决于 GPU 的硬件支持。

你的模型能够运行，但 KV 缓存池很小。读完本节，你可以在相同内存预算下比较 BF16 checkpoint 和 FP8 checkpoint。

**我们的测量结果：**在锁定时钟的 L4 上，32 个用户并发时，FP8 checkpoint 的输出量比 BF16 高 36%，两次运行的缓存池相同。

## 选择 checkpoint {#s-fit-a-bigger-model-with-fp8-weights-pick-a-checkpoint}

FP8 checkpoint 将大部分权重从每个 2 字节压缩到 1 字节。许多模型发布方会与 BF16 模型一起提供 FP8 版本。`Qwen/Qwen3-8B` 的 FP8 checkpoint 是 `Qwen/Qwen3-8B-FP8`，用法与普通模型相同：

```bash
vllm serve Qwen/Qwen3-8B-FP8
```

vLLM 会从 checkpoint 配置中读取量化方式，因此不需要额外参数。如果没有 FP8 checkpoint，vLLM 也可以在加载 BF16 模型时使用 `--quantization fp8_per_tensor` 进行量化。我们没有测试这条路径。

## 了解 GPU 的运行方式 {#s-fit-a-bigger-model-with-fp8-weights-know-what-your-gpu-runs}

L4 属于 Ada 架构，SM 8.9，支持 FP8 计算。因此，vLLM 会以 FP8 执行模型的矩阵计算，除了内存占用下降，速度也可能提高。

Ada 之前的 GPU（例如 A100）不支持 FP8 计算。vLLM 会以 FP8 保存权重，并使用 weight-only kernel。内存仍然会减少，但速度提升可能较小。我们没有测试这类 GPU。

## 计算节省的内存 {#s-fit-a-bigger-model-with-fp8-weights-count-the-memory-it-frees}

FP8 权重占用的内存接近一半。vLLM 会将释放的内存分配给 KV cache。对于 `Qwen/Qwen3-8B`，BF16 下每 GiB 的 KV 缓存池可容纳约 7,300 个 token，详见[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)。

我们的运行将缓存池固定为 24,096 个 token，详见[固定缓存池](#s-count-the-memory-before-you-pick-a-gpu)，让两次运行使用相同的缓存容量。因此，这些运行没有测出缓存池扩大后的效果。释放的容量来自每个值占用字节数的变化，不是来自某次运行。

## 查看我们的测量结果 {#s-fit-a-bigger-model-with-fp8-weights-see-what-our-runs-show}

**我们的测量：**2026-10-22，我们在[900 MHz 锁频时段](#s-front-l4-sessions)用 L4 比较了 `Qwen/Qwen3-8B-FP8` 和 `Qwen/Qwen3-8B`。1 个和 32 个用户的测试都用了两个随机种子。

```figure
id: fig-2-5
kind: chart
title: 32 个用户并发时的 FP8 权重和 BF16
claim: 锁定时钟且使用相同 KV cache 容量时，FP8 权重在 32 个用户并发下每秒输出 284.7 个 token，BF16 为 208.8 个。
caption: 每条柱形表示两个随机种子的中位数。BF16 运行的时钟中位数为 881 MHz，FP8 为 900 MHz。来源：capture/gpu/summary/l4.json。
```

| 用户数（L4 锁频时段） | TPOT 中位数，BF16 / FP8 | 输出 token/s，BF16 / FP8 | SM 时钟中位数，BF16 / FP8 |
|---|---|---|---|
| 32 | 119.9 / 83.8 ms | 208.8 / 284.7 | 881 / 900 MHz |
| 1 | 不比较 / 35.3 ms | 不比较 / 25.4 | 210 / 900 MHz |

32 个用户并发时，FP8 的输出量提高 36%，每个 token 的耗时缩短 30%。两个指标的随机种子结果范围都不重叠。BF16 时钟低了约 2%，差距远小于性能差异。

单用户测试中，GPU 因降频而降到 210 MHz，低于锁定值。因此，我们不比较该负载下的 BF16 和 FP8。

## 使用 4-bit 或 8-bit 整数 checkpoint {#s-fit-a-bigger-model-with-fp8-weights-use-a-4-bit-or-8-bit-integer-checkpoint}

FP8 将权重压缩到一半。4-bit checkpoint 的大部分权重约占半个字节，因此可以装下参数量两倍的模型。对 L4 这样的 24 GB GPU，4-bit checkpoint 常用于部署 14B 模型。

vLLM 0.31.0 会从 checkpoint 配置中读取以下格式。发布好的 checkpoint 无须额外参数：

| 格式 | 存储方式 | 0.31.0 说明 |
|---|---|---|
| AWQ 和 GPTQ | 4-bit 权重，16-bit 计算 | Turing 及更新架构的 GPU 可运行；Ampere、Ada 和 Hopper 使用较快的 Marlin kernel |
| compressed-tensors W4A16 或 W8A8 | 4-bit 或 8-bit 权重，由 LLM Compressor 库生成 | vLLM 项目推荐用此库创建 checkpoint |
| bitsandbytes | 服务加载模型时生成 4-bit 权重 | 需要单独安装 `vllm-bnb-plugin`；对未量化模型还要设置 `--quantization bitsandbytes` |
| GGUF | llama.cpp 文件格式 | 需要单独安装 `vllm-gguf-plugin`，vLLM 文档将此功能标为实验性 |

例如，Qwen 发布了 Qwen3-14B 的 4-bit AWQ checkpoint：

```bash
vllm serve Qwen/Qwen3-14B-AWQ --max-model-len 8192
```

我们在 L4 上启动过一次这个 AWQ checkpoint，没有设置 `--quantization`。日志显示 `quantization=auto_awq`，并使用 Marlin kernel。权重占用 9.44 GiB，缓存池可容纳 36,272 个 token。我们没有测量速度或准确率。

2026-10-23，我们也在 L4 节点上的第二块共享 GPU 启动过另外两种格式。该 GPU 处于降频状态，因此不报告速度。

- **bitsandbytes。**未安装插件时，设置 `--quantization bitsandbytes` 会在启动时因 `Unknown quantization method: bitsandbytes` 而停止。先安装插件：若使用 uv 路径，运行 `uv pip install vllm-bnb-plugin`；若使用 pip 路径，运行 `pip install vllm-bnb-plugin`。安装后，`Qwen/Qwen3-1.7B` 的权重占用 1.33 GiB，而 BF16 占用 3.22 GiB，降到了 41%。缓存池从 92,960 个 token 增至 108,512 个。
- **GGUF。**安装插件后，运行 `vllm serve unsloth/Qwen3-0.6B-GGUF:Q4_K_M --tokenizer Qwen/Qwen3-0.6B`，权重占用 0.55 GiB，chat 请求返回 HTTP 200。

41% 这个数字只适用于一个小模型。embedding 和输出层仍然使用 16-bit，因此更大的模型占用比例可能不同。我们没有测量这两种格式的准确率。

4-bit 模型的准确率损失可能大于 FP8，损失大小也取决于模型和量化方法。在自己的提示词上测试这两种格式。

## 检查准确率 {#s-fit-a-bigger-model-with-fp8-weights-check-the-accuracy}

2026-10-23，我们在 L4 上以 8-shot greedy 模式运行了 GSM8K 前 500 道题，比较 `Qwen/Qwen3-8B` 和 `Qwen/Qwen3-8B-FP8`：

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

FP8 权重的分数低了 1.2 个百分点，两个区间有重叠。因此，本次运行没有显示出差异，也不能排除几个百分点的损失。这只适用于一个模型和一个基准。在生产环境部署前，用自己的提示词测试两个 checkpoint，并比较回答。我们没有对 4-bit 格式运行这项检查。

```takeaways
- 部署已发布的 FP8 checkpoint，不需要额外参数。
- FP8 仍然装不下模型时，再考虑 4-bit checkpoint。
- 生产部署前，用自己的提示词检查输出质量。
```

来源：capture/gpu/summary/l4.json（load.vllm-lock-b、load.vllm-lock-fp8），vLLM 0.31.0 源码（vllm/model_executor/layers/quantization/fp8.py），vLLM 0.31.0 文档（docs/features/quantization/online.md、docs/features/quantization/README.md、docs/features/quantization/auto_awq.md、docs/features/quantization/gptqmodel.md、docs/features/quantization/bnb.md、docs/features/quantization/gguf.md、docs/features/quantization/llm_compressor/），capture/gpu/out-l4/livecheck-2026-10-22.txt、capture/gpu/out-l4/livecheck-2026-10-23.txt，vLLM 0.31.0 文档（docs/features/quantization/bnb.md），capture/gpu/out-l4/gsm8k-fp8-accuracy.txt。
