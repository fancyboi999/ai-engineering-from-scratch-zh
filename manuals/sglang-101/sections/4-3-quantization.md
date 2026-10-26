# --quantization 与 --kv-cache-dtype

> 量化首先换来内存容量，其次才是速度；SGLang 将权重、GEMM 内核和 KV 缓存分为三个独立选择，让你只支付所需的代价。

Cloudflare 用 BF16 KV 缓存服务 Kimi K2.6，逐步提高并发。32 个并发请求时，服务器达到 1,558 tok/s；64 个时内存耗尽。改用 FP8 KV 缓存，同一服务在 64 个请求时达到 2,192 tok/s，比 BF16 最佳结果高约 41% {{field Cloudflare 2026-08}}。在两种版本都能运行的每个并发下，FP8 缓存的单 token 速度都更慢。它胜在能容纳两倍的请求。

读完本节，你能区分权重量化与 KV 缓存量化，在不破坏自动检测的前提下加载量化 checkpoint。你也能先算出内存收益再测速度，判断哪里适合降低精度。

## 三个选择，三组参数

**权重量化：** 用 FP8、FP4、INT4 等更少的位存储模型权重。它缩小权重体积，减少每次 GEMM 的内存流量。`--quantization` 选择量化方法。

**GEMM 后端：** 对量化权重执行矩阵乘法的内核库。通过 `--fp8-gemm-backend` 和 `--fp4-gemm-backend` 选择，两者默认均为 `auto`，根据 GPU 代际选择。

**KV 缓存 dtype：** 缓存的 key 和 value 的格式。通过 `--kv-cache-dtype` 选择，与权重独立。默认 `auto` 使用模型 dtype。

模型可以用 FP8 权重搭配 BF16 KV 缓存，也可以用 BF16 权重搭配 FP8 KV 缓存。它们改变的是不同预算，必须分别决策。

## 权重：优先离线量化

v0.5.22 的 `--quantization` 接受 31 个方法名。多数描述别人已经量化好的 checkpoint：AWQ、GPTQ、ModelOpt FP8 和 FP4、compressed-tensors、GGUF、Quark 等。少数在加载模型时量化 BF16 权重：`fp8`、`mxfp8`、`nvfp4_online`，以及 Apple silicon 上的 `mlx_q4`、`mlx_q8`。

**离线量化：** checkpoint 已存储低比特权重和缩放因子。**在线量化：** SGLang 在加载时转换全精度权重。

加载量化 checkpoint 时，不要传 `--quantization`。模型配置检查会读取 checkpoint 中的 `quantization_config.quant_method` 并使用它。如果传入的方法不同，检查只接受已知兼容组合，例如对 `modelopt` checkpoint 使用 `modelopt_fp4`。重新量化时，日志会提示你再次验证准确率。其余不匹配都会在启动时报错。

```figure
id: fig-4-4
kind: flow
title: SGLang 如何决定权重格式
claim: Checkpoint 自身声明量化方法；--quantization 只有在与该方法匹配或属于已知升级路径时才有用。
caption: 每行从左向右读。玫瑰色箭头终点为启动错误。末行为 v0.5.22 的 CUDA 路径。依据该版本的 _verify_quantization 和 GPTQ Marlin 覆盖逻辑。
```

这个参数还可能阻止自动升级。不传参数加载 GPTQ checkpoint 时，系统会自动检测，在运行时转换，然后由 Marlin 内核服务。升级代码只在未指定方法或指定 `gptq_marlin` 时接受转换。

PR #32114 在 2026-09-10 删除了普通 GPTQ CUDA 内核，CUDA 构建的方法注册表已无 `gptq` 条目，但参数解析器仍接受 `--quantization gptq`。随后模型配置检查跳过 Marlin 升级，抛出 `Unknown quantization method: gptq`。我们从代码中确认了这条路径，没有在 GPU 上实际运行。

## KV 缓存：带缩放因子的容量选择

`--kv-cache-dtype` 接受 `auto`、`bf16`、`fp8_e4m3`、`fp8_e5m2`、`mxfp8`（仅 FA4）、`nvfp4` 和 `fp4_mx_block16`。FP8 将每个 token 的字节数减半，FP4 降至四分之一，同一池因此能容纳两倍或四倍的 token。[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool) 展示如何计算模型每个 token 的字节数。

FP8 需要每个张量的缩放因子。`--quantization-param-path` 的帮助文本建议，在 KV 缓存 dtype 为 FP8 时提供缩放因子文件。若未提供，缩放因子默认为 1.0，可能影响准确率 {{code}}。每次改变 KV 缓存 dtype 都应检查准确率。

Cloudflare 公布了它的检查结果。Kimi K2.6 使用 BF16 与 FP8 KV 时，GSM8K 分别为 94.24、94.09，MMLU 为 89.11、89.04，MMLU-Pro 为 80.29、79.29 {{field Cloudflare 2026-08}}。这是他们在自己模型上测得的数字，你的模型可能不同。

2026 年，vLLM 团队测试了未经校准的 FP8 KV cache。大多数模型的结果接近 BF16。他们指出，在 FlashMLA backend 上运行 Kimi-K2.5 时应使用校准缩放因子 {{field vLLM 2026-04}}。我们没有复测这些模型。

2026-10-23，我们在一张 L4 上做了自己的检查：使用 SGLang 0.5.22，测 `Qwen/Qwen3-8B` 和 `Qwen/Qwen3-8B-FP8` 的前 500 道 GSM8K 题，8-shot，greedy 解码。两个 checkpoint 都没有包含 KV 缩放因子，因此 FP8 KV 运行使用的 scale 为 1.0。

```listing
title: GSM8K 准确率，500 题、8-shot，Qwen3-8B，SGLang 0.5.22
source: capture/gpu/out-l4/gsm8k-fp8-accuracy.txt
lang: text
note: 展示 SGLang 结果。文件中的 vLLM 结果略去。
---
engine   config                     correct   accuracy   Wilson 95% interval
SGLang   BF16                       458/500   91.6%      88.8 to 93.7
SGLang   FP8 weights                456/500   91.2%      88.4 to 93.4
SGLang   FP8 KV cache               458/500   91.6%      88.8 to 93.7
SGLang   FP8 weights + FP8 KV       460/500   92.0%      89.3 to 94.1
…
```

四组 Wilson 置信区间互相重叠。这次运行没有显示准确率差异。500 道题还不足以排除几个百分点的下降。这只是一个模型和一个基准，部署自己的模型前仍须测准确率。

### 检查缩放因子是否已加载

不传 `--quantization-param-path` 时，日志会出现 `Using FP8 KV cache but no scaling factors provided` {{code}}。不过 checkpoint 也可能把缩放因子一并写入权重文件，因此这条警告本身无法说明服务最终使用了哪组值。

先检查 checkpoint 的索引文件，搜索以 `k_scale` 或 `v_scale` 结尾的张量名：

```bash
grep -oE '"[^"]*(k|v)_scale"' model.safetensors.index.json | sort -u
```

2026-10-22，我们检查了 `Qwen/Qwen3-30B-A3B-Instruct-2507-FP8` 的索引。索引列出权重 scale，却没有 KV scale，因此下方 FP8 服务器使用 KV scale 1.0。

然后检查加载日志。PR #35455 之前，SGLang 会漏载 compressed-tensors checkpoint 中的 KV scale，日志中的 `k_scale` 参数会报 not found {{issue #35455}}。这项修复已包含在 v0.5.22 {{code}}。如果仍看到 `k_scale` 或 `v_scale` 缺失警告，说明 loader 跳过了该缩放因子。在 scale 接近 1.0 的 checkpoint 上，这个 PR 测得 GSM8K 准确率从漏载时的 0.960 升至正确加载后的 0.965。

最后，用你自己的 prompt 分别运行 FP8 和非 FP8 配置。正式上线前要对比答案。

## 量化是容量决策

```figure
id: fig-4-5
kind: comparison
title: Kimi K2.6 的 BF16 与 FP8 KV 缓存对照
claim: 在两种缓存都能运行的每个负载下，FP8 KV 缓存都慢几个百分点；BF16 耗尽内存后，FP8 仍能继续扩展。
caption: Cloudflare 于 2026-08-03 报告的不同并发下每秒输出 token 数。虚线柱为 BF16，实线柱为 FP8。玫瑰色标记内存耗尽的运行。未公布 SGLang 版本。
```

Cloudflare 还在 GLM 5.2 上测试了 INT4 权重 {{field Cloudflare 2026-08}}。Decode 更快：并发 1 时从 60 增至 92 tok/s，并发 64 时从 1,672 增至 1,933 tok/s。Prefill 却变慢了，从 FP8 的约 10,160 tok/s 降至 INT4 的约 8,660 tok/s。

Decode 受内存流量限制，较小的权重因此有帮助。Prefill 受计算限制，而 INT4 反量化消耗算力。Cloudflare 将两个阶段分到不同服务器，decode 使用 INT4，prefill 使用 FP8。[第 6.3 节](#s-prefill-decode-disaggregation) 解释这种拆分。

## 我们在 GB10 上测到了什么

我们在一张 NVIDIA GB10 上运行了两次 `Qwen/Qwen3-30B-A3B-Instruct-2507`。第一台服务器加载 BF16 checkpoint；第二台加载 FP8 checkpoint `Qwen/Qwen3-30B-A3B-Instruct-2507-FP8`，并设置 `--kv-cache-dtype fp8_e4m3`。两者都使用 `--mem-fraction-static 0.7`，没有传 `--quantization`。

```listing
title: FP8 服务器识别 checkpoint 并确定池容量
source: capture/gpu/out-gb10/server-fp8.log
lang: text
note: 启动日志中的四行，省略时间戳。
---
… Detected fp8 checkpoint.
… Using FP8 KV cache but no scaling factors provided. Defaulting to scaling factors of 1.0.
… Load weight end. elapsed=152.29 s, type=Qwen3MoeForCausalLM, quant=fp8, fmt=e4m3, avail mem=83.63 GB, mem usage=29.75 GB.
… KV Cache is allocated. dtype: torch.float8_e4m3fn, #tokens: 1083008, K size: 24.79 GB, V size: 24.79 GB
```

**我们实测**了两个选择带来的收益。权重从 57.75 GB 降至 29.75 GB，加载时间从 323.61 s 降至 152.29 s。池容量从 227,243 增至 1,083,008 个 token，是原来的 4.77 倍。

这个数字是两种效应相乘的结果。权重缩小后，给池多留出了 28.00 GB；按日志单位计算，池从 20.80 GB 增至 49.58 GB，增加 28.78 GB。随后每个 token 的字节数又减半：48 层、4 个 KV 头、头大小 128 时，从 98,304 降至 49,152 字节。

扫描服务器的池容量不同于上方单次启动日志。BF16 扫描池为 234,600 token，FP8 扫描池为 1,084,458 token。请以相应 sweep 汇总数据为准。

Listing 第二行就是上一小节提到的警告。我们没有提供缩放因子文件，所以所有缩放因子都为 1.0。在温度为 0 的首个请求中，两台服务器生成了相同的 12 个 token。但这只有一个 prompt，不能算准确率检查。

每种负载的速度都变了。扫描在每个并发下运行三个 seed：

| 并发 | BF16 输出 tok/s | FP8 输出 tok/s | BF16 TPOT 中位数 | FP8 TPOT 中位数 |
|---|---|---|---|---|
| 1 | 29.14 | 51.50 | 32.52 ms | 18.41 ms |
| 8 | 74.11 | 137.00 | 102.21 ms | 54.96 ms |
| 32 | 150.66 | 283.19 | 201.91 ms | 104.12 ms |
| 64 | 235.38 | 440.86 | 254.06 ms | 131.78 ms |

```figure
id: fig-4-3b
kind: chart
title: FP8 改变整条延迟与吞吐量曲线
claim: GB10 上，FP8 权重与 FP8 KV 在并发 1 至 64 的所有档位都提高了每秒 token 数，并降低了每 token 耗时。
caption: 每个点是一种并发，从 c1 到 c64。横轴为每秒输出 token 数，纵轴为 TPOT 中位数。梅紫色为 BF16，绿色为 FP8。来源：capture/gpu/summary/gb10.json。
```

这与上面的 Cloudflare 结果不同。那里 FP8 缓存的单 token 速度略慢，优势来自容量；这里权重也用了 FP8。这台机器 decode 时从带宽有限的内存读取权重，字节数减半，速度就接近翻倍。

## 在 24 GB L4 上做相同测试

GB10 有 121.7 GiB 内存，所以 BF16 池始终够用。为观察另一种情况，我们在一张 NVIDIA L4 上用 `Qwen/Qwen3-8B` 和 `Qwen/Qwen3-8B-FP8` 做了同样对照。两台服务器均使用 `--mem-fraction-static 0.85`。每次运行前，扫描程序都等待显卡降温至 72°C。

```listing
title: L4 上的 BF16 服务器
source: capture/gpu/out-l4/server-load-default.log
lang: text
note: 启动日志中的两行，省略时间戳。
---
… Load weight end. elapsed=3.92 s, type=Qwen3ForCausalLM, avail mem=6.59 GB, mem usage=15.28 GB.
… KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
```

```listing
title: L4 上的 FP8 服务器
source: capture/gpu/out-l4/server-load-fp8.log
lang: text
note: 启动日志中的两行，省略时间戳。
---
… Load weight end. elapsed=2.54 s, type=Qwen3ForCausalLM, quant=fp8, fmt=e4m3, avail mem=13.06 GB, mem usage=8.81 GB.
… KV Cache is allocated. dtype: torch.float8_e4m3fn, #tokens: 142369, K size: 4.89 GB, V size: 4.89 GB
```

**我们实测** BF16 池有 24,094 个 token，FP8 池有 142,369 个 token，为前者的 5.91 倍。扫描中的每个请求有 512 个输入 token 和 128 个输出 token。BF16 池大约能容纳 37 个这样的请求。

| 并发 | BF16 输出 tok/s | FP8 输出 tok/s | BF16 TTFT 中位数 | FP8 TTFT 中位数 |
|---|---|---|---|---|
| 1 | 13.42 | 24.53 | 189.16 ms | 140.72 ms |
| 16 | 201.09 | 313.92 | 211.78 ms | 147.52 ms |
| 32 | 270.11 | 507.20 | 2,969.61 ms | 199.09 ms |
| 64 | 250.85 | 735.91 | 18,348.57 ms | 296.42 ms |

```figure
id: fig-4-3c
kind: chart
title: 24 GB 显卡上，BF16 池被填满
claim: 单张 L4 上，BF16 吞吐量在并发 32 时停留在每秒 270 个 token，FP8 则在并发 64 时继续升至 736。
caption: 输出吞吐量与最大并发的关系，每个点使用三个 seed。梅紫色为 BF16，绿色为 FP8 权重搭配 FP8 KV 缓存。来源：capture/gpu/summary/l4.json。
```

调度器日志揭示了并发 64 时的原因。BF16 服务器最多运行 38 个请求，token 使用率为 0.99，队列里有 26 个请求。FP8 服务器同时运行全部 64 个请求，token 使用率 0.29，队列为空。BF16 从并发 32 到 64 吞吐量反而下降，因为更多请求在等候，每个等待请求的 TTFT 都包含这段等待时间。

并发 1 时，池大小无关紧要，但 FP8 仍然更快：每 token 39.66 ms，BF16 为 60.16 ms。这与 GB10 的现象相同。L4 上的 decode 每生成一个 token 都要读取全部权重，FP8 权重的字节数只有一半。

这张卡上的 goodput 结果很明确。我们的目标是 TTFT 小于 1 s、TPOT 小于 100 ms。并发 32 和 64 时，BF16 每秒达标请求数都是 0；FP8 在并发 64 时每秒有 2.87 个请求达标。

### 池装不下前缀时

上述 L4 测试给 BF16 分配了完整的池。上游随后将两个版本都设为相同的较小预算 `--mem-fraction-static 0.74`，运行[第 3.3 节](#s-radixcache) 的共享前缀扫描。每次运行以 8 用户发送 64 个 prompt，分为四组，每组 16 个，共享系统 prompt 长度从 0 至 4,096 token。四组各 4,096 token 的前缀需要约 16,000 token 缓存。

```listing
title: 同一内存预算下的两个池
source: capture/gpu/out-l4/server-small-pool-bf16-fp8.log
lang: text
note: 内存比例同为 0.74 时的 BF16 池和 FP8 池。
---
[2026-10-18 19:35:26] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 6559, K size: 0.45 GB, V size: 0.45 GB
[2026-10-18 22:02:58] KV Cache is allocated. dtype: torch.float8_e4m3fn, #tokens: 107299, K size: 3.68 GB, V size: 3.68 GB
```

| 共享 prompt token 数 | 输出 tok/s，BF16 / FP8 | TTFT 中位数，BF16 / FP8 |
|---|---|---|
| 0 | 113.5 / 180.1 | 354 / 255 ms |
| 1,024 | 95.0 / 164.1 | 470 / 349 ms |
| 2,048 | 25.9 / 155.1 | 12,576 / 380 ms |
| 4,096 | 10.9 / 134.8 | 40,126 / 372 ms |

**上游实测 BF16 出现性能断崖，FP8 没有。** BF16 池只能容纳 6,559 token。共享长度达到 2,048 token 后，四个前缀便放不下。首 token 中位数从 470 ms 升至 12.6 s。

FP8 池可容纳 107,299 token，因此保留了所有前缀。各长度下的首 token 时间都低于 400 ms。共享 2,048 token 时，FP8 输出吞吐量是 BF16 的 6.0 倍。

最后一行有个限制。共享 4,096 token 时，BF16 在三次尝试后仍低于 1,000 MHz 的时钟下限，中位数仅 390 MHz。因此应以 2,048 那一行为结果。该行 BF16 时钟中位数为 1,275 MHz，高于下限，但一半样本仍带热降频标志。FP8 运行的时钟中位数为 1,200 至 1,260 MHz。

## 我们的建议

使用离线量化 checkpoint，不传 `--quantization`。文档也建议优先使用离线量化 {{docs}}。在线量化增加加载时间，还会产生一个没人评估过的 checkpoint。

根据内存而非速度选择 KV 缓存 dtype。如果池已满导致请求排队，搭配缩放因子文件的 FP8 缓存是最便宜的扩容方式。如果池还有空间，保持模型 dtype。

在 GB10 这样 decode 等待内存的 GPU 上，FP8 的吞吐收益明显。我们在 GB10 对照中同时改变了权重和 KV cache dtype，吞吐量是基线的 1.73 至 1.88 倍。因此它不能单独证明 FP8 权重的收益。要评估只改 FP8 KV 的效果，可参考[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)引用的独立实测；仍须为自己的模型检查缩放因子和准确率。

Prefill 和 decode 分别运行在不同服务器时，按阶段选择量化。更小的权重有助于 decode，却可能拖慢 prefill。

## 事故

**BF16 缓存在 64 个请求时耗尽内存。** Cloudflare {{field Cloudflare 2026-08}} 报告，Kimi K2.6 使用 BF16 KV 缓存时，在并发 64 发生内存不足。FP8 缓存约可容纳 137 万 token，BF16 约 686,000；FP8 可以承接同样负载。

**容器无法运行 NVFP4。** joshua8.ai 的实践报告 {{field joshua8 2026-01}} 使用 RTX PRO 6000 Blackwell，但其 SGLang 容器无法运行 NVFP4，因此比较的是 GPTQ-INT4 的 SGLang 与 NVFP4 的 vLLM。比较引擎时要使用相同权重格式，否则测到的是格式差异。

**FP4 要求特定 GPU 代际。** Pivot News 上的一篇用户摘要 {{field Pivot News 2026-05}} 报告，RTX 4090 加入 Blackwell 流水线后，SGLang 崩溃。它的 FP4 路径要求计算能力 10.0，没有为旧卡提供软件替代路径。我们看到的是对 Reddit 帖子的二手摘要。

```takeaways
- 加载量化 checkpoint 时不传 --quantization，让 SGLang 自行读取量化方法。
- CUDA 构建中，将 --quantization gptq 改为不传参数或使用 gptq_marlin。
- 服务 FP8 KV 缓存前，提供 KV 缩放因子文件并检查准确率。
- 根据队列长度与池使用率选择 KV 缓存 dtype，再测量速度。
- 读取 KV Cache is allocated 日志，确认每个选择换来的池容量。
```

来源：capture/gpu/out-gb10/server-default.log, server-fp8.log, server-fp8.command.txt, generate.txt, fp8-generate.txt, capture/gpu/summary/gb10.json, capture/gpu/summary/l4.json, capture/gpu/out-l4/server-load-default.log, server-load-fp8.log, capture/gpu/out-l4/gsm8k-fp8-accuracy.txt, capture/gpu/out-l4/server-pools.log, capture/gpu/out-l4/server-small-pool-bf16-fp8.log, python/sglang/srt/arg_groups/choices.py (QUANTIZATION_CHOICES), arg_groups/fields/model.py (kv_cache_dtype, quantization_param_path), configs/model_config.py (_verify_quantization), layers/quantization/__init__.py (get_quantization_config), layers/quantization/gptq/gptq.py (override_quantization_method), layers/quantization/fp8.py, model_executor/model_runner_components/load_model_utils.py (load_kv_cache_scales), layers/quantization/compressed_tensors/compressed_tensors.py (kv_cache_scheme), and docs/docs/advanced_features/quantization.mdx at v0.5.22; PR #32114; PR #35455 (compressed-tensors KV scales, merged 2026-08-20); 2026-10-22 的 Qwen/Qwen3-30B-A3B-Instruct-2507-FP8 `model.safetensors.index.json`; vLLM 团队，The State of FP8 KV-Cache and Attention Quantization in vLLM (2026-04-22); field reports by Cloudflare (2026-08-03), joshua8.ai (2026-01-10), and Pivot News (2026-05-19); capture/gpu/summary/l4.json (prefix.small-pool, prefix.fp8-small-pool).
