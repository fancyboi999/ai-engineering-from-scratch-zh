# --speculative-algorithm

> 推测解码用 GPU 的空闲算力换取每步提交多个 token，因此它降低低负载延迟，却会在 GPU 已满时消耗吞吐量。

一位用户在 A6000 上为 Llama-3.1-8B 开启 EAGLE-3，做了两次测试。Batch 为 1 时，输出从 42.0 增至 92.5 tok/s，速度翻倍以上；并发 20 时，输出却从 217.8 降至 164.4 tok/s，慢了约四分之一。两个数字都出现在 issue #5274 中，而且都正确。维护者回答，推测解码“适合小 batch，而非压力测试” {{issue #5274}}。

读完本节，你能解释草稿、验证和接受长度，并看懂 SGLang 选择的默认值。你也能找出推测解码设置的请求上限，判断它适合哪些场景。

## 代价：decode 一次只生成一个 token

每个 decode 步骤为每个请求提交一个 token，下一步需要这个 token 作为输入。Batch 为 1 时，一步要读取模型全部权重，只计算一个 token。GPU 还有空闲算力，瓶颈是内存流量。更大的 batch 会用其他请求填满空闲算力。

推测解码则用猜测填满它。**草稿模型：** 一个小模型，或基于目标模型训练的小型预测头，用较低成本提出后续若干 token。**验证过程：** 目标模型一次前向传播同时计算所有候选 token。它接受与自己本来会生成的结果一致的最长前缀，再额外生成一个自己的 token。

**接受长度：** 每次验证提交的 token 数，即接受的草稿 token 加上额外的一个 token。接受长度为 3，意味着目标模型一次前向传播提交三个 token。

## SGLang 中的一个步骤

```figure
id: fig-4-6
kind: sequence
title: steps 3、topk 1、4 个草稿 token 的一次 EAGLE 步骤
claim: 一次 EAGLE 步骤先起草 token 链，再用目标模型一次前向传播验证，提交已接受前缀和额外一个 token。
caption: 从上往下读。数字采用 v0.5.22 中多数模型的默认值 (3, 1, 4)。绿色 token 被接受，玫瑰色 token 被拒绝。依据该版本的 EAGLEWorkerV2.forward_batch_generation。
```

1. **起草。** 草稿模型运行 `--speculative-num-steps` 次。如果 `--speculative-eagle-topk` 大于 1，每一步在每个节点保留多个候选，长成一棵树。树构建器保留最好的 `--speculative-num-draft-tokens` 个节点，构建树形 mask。
2. **验证。** 目标模型在 `TARGET_VERIFY` 模式下，用树形 mask 一次计算所有草稿 token。贪心请求保留最长匹配路径；采样请求则在应用温度、top-k 和 top-p 后比较概率。
3. **扩展草稿。** 草稿模型以 `DRAFT_EXTEND_V2` 模式读取已接受的 token，为下一步准备好缓存。

接受阈值 `--speculative-accept-threshold-single` 和 `--speculative-accept-threshold-acc` 默认均为 1.0。使用这些值时，贪心请求生成的 token 与未启用推测解码时相同。

## 算法与默认值

`--speculative-algorithm` 接受 `EAGLE`、`EAGLE3`、`NEXTN`、`STANDALONE`、`NGRAM`、`DFLASH`、`DSPARK` 和 `UNO`。`NEXTN` 是 `EAGLE` 的别名。DeepSeek V3 等 checkpoint 内含多 token 预测层的模型，SGLang 会将草稿模型路径设为目标模型路径。`NGRAM` 完全不需要草稿模型，而是在已读文本中查找重复 token 序列。

未设置形状时，SGLang 根据模型架构选择 `(num_steps, topk, num_draft_tokens)`。

| 模型 | 默认形状 |
|---|---|
| `LlamaForCausalLM`, Grok | (5, 4, 8)：最多 8 个草稿节点的树 |
| DeepSeek、GLM、GPT-OSS、MiMo、`STANDALONE` 及其他所有模型 | (3, 1, 4)：由 3 个草稿组成的链 |

Topk 为 1 时，代码强制将草稿 token 数设置为步数加一。

## 没人主动要求的上限

v0.5.22 中，EAGLE、NGRAM、DFLASH 和 DSPARK 的处理逻辑，在你没有设置 `--max-running-requests` 时都会执行相同操作：将值设为 48，并输出一次警告：“Max running requests is reset to 48 for speculative decoding” {{code}}。推测解码需要为草稿 token 留出内存，在小 batch 下效果最好，因此这个上限用于保护服务器。它也限制了你的基准。

开启推测解码、但不显式设置上限的吞吐量测试，测的是一台最多接纳 48 个请求的服务器。如果流量有 200 个并发请求，其余 152 个就在队列等待，首 token 时间随之上升。警告只在启动时打印一次，在首个请求到来前便已滚出屏幕。

## 应该测什么

调度器每条 decode 日志会输出 `accept len` 和 `accept rate`，`/metrics` 则导出 `sglang:spec_accept_length` 和 `sglang:spec_accept_rate`。用自己的 prompt 测量，因为接受率取决于文本和草稿。David Noel Ng 的实践报告 {{field David Noel Ng 2026-08}} 在两张 GH200 上测试 DeepSeek-V4-Flash，修复加载器后测得 3.5 至 5.05 个 token。

随后分别开启和关闭推测解码，扫描并发，找到两条曲线的交点。Ant Group {{field Ant Group 2025-09}} 在 H20 上对 DeepSeek-R1 做了这项测量。更长的草稿在 batch 1 时提升 21%，在 batch 32 时损失约 18%。

```figure
id: fig-4-7
kind: comparison
title: 同一功能在两种 batch 大小下的表现
claim: 相同 GPU 和模型上，推测解码让单请求速度翻倍，却降低了并发 20 时的吞吐量。
caption: 单张 A6000 上 Llama-3.1-8B 开启和关闭 EAGLE-3 的输出 tok/s，来自 2025-04-11 的 issue 5274。所有柱使用同一刻度。
```

## 我们在 GB10 上测到了什么

我们在一张 NVIDIA GB10 上，为 `Qwen/Qwen3-30B-A3B-Instruct-2507` 运行 EAGLE-3。草稿模型为 `lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex`，形状采用 SGLang cookbook 为这组模型设置的 (3, 1, 4)。

第一次启动失败了。草稿配置声明 2,048 个位置，目标模型声明 262,144 个位置。上下文长度检查抛出 `ValueError`，末尾提示“To allow overriding this maximum, set the env var SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1” {{code}}。Cookbook 的对应命令设置了这个变量，因此我们也照做。

```listing
title: 设置覆盖变量后的草稿上下文长度检查
source: capture/gpu/out-gb10/server-eagle3.log
lang: text
note: 启动日志中的三行，省略时间戳。
---
… Warning: Target model's context_length (262144) is greater than the derived context_length (2048). This may lead to incorrect model outputs or CUDA errors. Note that the derived context_length may differ from max_position_embeddings in the model's config.
… Overriding the draft model's max_position_embeddings to 262144.
… Max running requests is reset to 48 for speculative decoding. You can override this by explicitly setting --max-running-requests.
```

这个变量只移除检查，不会教会草稿读取长 prompt；下面的 issue #6783 就是这种失败。我们的 prompt 只有 512 个 token，因此这次运行不能说明长上下文表现。

我们原以为 24 GB L4 上也会被拒绝。使用草稿 `Tengyunw/qwen3_8b_eagle3` 启动 `Qwen/Qwen3-8B`，没有设置变量，服务器却成功启动了。草稿声明 40,960 个位置，与目标模型相同，因此检查无须拒绝。这个变量针对的是某个草稿配置，不是 EAGLE-3 本身。设置前，先比较两个配置中的 `max_position_embeddings`。

```listing
title: 24 GB L4 上的一次 EAGLE-3 启动
source: capture/gpu/out-l4/server-eagle3-no-env.log
lang: text
note: 启动日志中的四行，省略时间戳。
---
… Load weight end. elapsed=3.89 s, type=Qwen3ForCausalLM, avail mem=6.41 GB, mem usage=15.28 GB.
… Load weight end. elapsed=0.67 s, type=LlamaForCausalLMEagle3, avail mem=4.50 GB, mem usage=1.90 GB.
… KV Cache is allocated. dtype: torch.bfloat16, #tokens: 8827, K size: 0.61 GB, V size: 0.61 GB
… max_total_num_tokens=8827, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=48, context_len=40960, available_gpu_mem=1.19 GB
```

同一次启动也展示了小显卡上加载草稿的代价。这张 L4 上，仅目标模型时池容量为 24,094 个 token；加载草稿后只剩 8,827 个 token，约能容纳 13 个我们使用的 640 token 请求。

**我们实测**了并发 1 至 64，每种并发运行三个 seed，以 BF16 服务器为基线：

| 并发 | 基线 TPOT 中位数 | EAGLE-3 TPOT 中位数 | 基线输出 tok/s | EAGLE-3 输出 tok/s |
|---|---|---|---|---|
| 1 | 32.52 ms | 20.30 ms | 29.14 | 40.93 |
| 8 | 102.21 ms | 59.44 ms | 74.11 | 97.06 |
| 32 | 201.91 ms | 106.97 ms | 150.66 | 228.78 |
| 64 | 254.06 ms | 138.41 ms | 235.38 | 276.32 |

所有并发下，每步接受长度都保持在 2.71 至 2.74 个 token。单 token 收益没有随负载缩小，而是从并发 1 的 1.60 倍增至并发 32 的 1.89 倍。

```figure
id: fig-4-4b
kind: chart
title: 混合专家模型上，EAGLE-3 收益随 batch 增大
claim: GB10 上，EAGLE-3 将每 token 耗时中位数在并发 1 时缩短为原来的 1/1.60，并发 32 时为 1/1.89。
caption: 曲线为各并发下基线 TPOT 中位数除以 EAGLE-3 TPOT 中位数。玫瑰色虚线表示没有收益，脚注给出接受长度范围。来源：capture/gpu/summary/gb10.json。
```

这与前面的 A6000 报告相反，模型差异解释了原因。稠密模型每一步读取全部权重，更大的 batch 已经用掉了空闲算力。混合专家模型则只读取这一步各 token 选中的专家。验证过程使用这一步已经读入的专家权重，为每个请求计算四个位置。这是我们的解释，测量范围只有一个模型和一张 GPU。

上限仍是限制。并发 64 时，吞吐量仍高于基线，分别为 276.32 和 235.38 tok/s；但首 token 时间中位数分别是 7,772 ms 和 557 ms。服务器只接纳 48 个请求，其余 16 个在队列等待。

## 我们在 24 GB L4 上测到了什么

我们在一张 L4 上，用稠密模型 `Qwen/Qwen3-8B` 与草稿 `Tengyunw/qwen3_8b_eagle3` 做了相同扫描。这次设置了上述变量，因为扫描程序为每台 EAGLE-3 服务器都这样设置。

```listing
title: L4 上 EAGLE-3 服务器的池
source: capture/gpu/out-l4/server-load-eagle3.log
lang: text
note: 扫描中服务器的启动日志行，省略时间戳。
---
… KV Cache is allocated. dtype: torch.bfloat16, #tokens: 9951, K size: 0.68 GB, V size: 0.68 GB
… max_total_num_tokens=9951, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=48, context_len=40960, available_gpu_mem=1.23 GB
```

**我们实测**池容量为 9,951 个 token，而不加载草稿时为 24,094。它约能容纳 15 个 640 token 请求，低于 48 个请求的上限。

| 并发 | 默认 TPOT 中位数 | EAGLE-3 TPOT 中位数 | 默认输出 tok/s | EAGLE-3 输出 tok/s |
|---|---|---|---|---|
| 1 | 60.16 ms | 25.61 ms | 13.42 | 31.81 |
| 8 | 66.01 ms | 35.58 ms | 112.62 | 181.55 |
| 32 | 96.18 ms | 43.82 ms | 270.11 | 269.42 |
| 64 | 107.42 ms | 51.50 ms | 250.85 | 245.34 |

所有并发下，每步接受长度都是 2.73 至 2.74 个 token。每种负载的单 token 速度都快约两倍。但从并发 32 起，服务器每秒输出的 token 已不比默认配置多。

```figure
id: fig-4-4c
kind: chart
title: 24 GB 显卡上，每个 token 更快，服务器却未提速
claim: L4 上，EAGLE-3 在并发 1 时达到默认输出吞吐量的 2.37 倍，并发 32 时只有 1.00 倍。
caption: 紫色为默认 TPOT 除以 EAGLE-3 TPOT，青色为 EAGLE-3 输出吞吐量除以默认值。玫瑰色虚线表示没有收益。来源：capture/gpu/summary/l4.json。
```

池容量解释了差异。池内只有 15 个请求，其余请求都在等待槽位。并发 32 时，EAGLE-3 的 TTFT 中位数为 8,040 ms，不开启时为 2,970 ms。当显卡受 KV 池限制时，草稿消耗的是 batch 所需的内存。

## 我们的建议

把推测解码视为低、中并发的延迟工具。每个副本只有少数用户的交互流量适合开启；批处理和高并发服务器默认关闭。

接受这条经验前，先测自己模型的交点。上面的混合专家模型在 GB10 上并发 32 时仍有收益。L4 上的稠密模型到 32 就不再胜出，因为草稿占掉了近 60% 的池。

开启推测解码时，始终自己设置 `--max-running-requests`。根据扫描中仍有收益的并发选择数值。

优先使用模型自带的草稿层。带多 token 预测层的模型无须额外下载。使用 EAGLE-3 时，检查草稿模型是否支持 prompt 长度；接受率低时，可用自己的流量训练草稿。Google Cloud {{team Google Cloud 2025-11}} 和 Modal 与 Decagon {{team Modal 2025-11}} 都训练了自己的草稿。Modal 报告接受长度比开源草稿高 38%。两者均为厂商报告。

## 事故

**推测解码使压力测试变慢。** Issue #5274（2025-04-11）：A6000 上的 EAGLE-3 在并发 20 时把吞吐量从 217.8 降至 164.4 tok/s，却在 batch 1 时把速度从 42.0 提至 92.5 tok/s。解决方式是只在小 batch 开启。

**草稿无法读取长 prompt。** Issue #6783（2025-05-30）：Llama-3.3-70B FP8 配合 EAGLE-3，输入 1k 时接受 3.2 个 token，3k 时为 1.6，10k 时为 1.2。10k 时仅生成 63.9 tok/s，不开启推测解码为 102.7。草稿配置只有 2,048 个位置，没有 rope scaling。在草稿配置中加入 Llama 3 rope scaling 和 131,072 个位置后问题修复。

**加载器 bug 遗漏专家权重。** David Noel Ng {{field David Noel Ng 2026-08}} 发现 SGLang 在 DeepSeek-V4-Flash 上比 vLLM 慢。接受长度只有 1.3 至 1.8 个 token，只有一条日志警告指向原因。草稿加载器未将共享专家权重映射到融合槽位。本地修复后，decode 从 115.7 提至 176.0 tok/s，PR #33276 随后在上游修复。

```takeaways
- 为低并发交互流量开启推测解码，测出它从哪里开始不再胜出。
- 设置 --speculative-algorithm 时，始终显式设置 --max-running-requests。
- 相信加速效果前，先用自己的 prompt 读取 decode 日志中的 accept len。
- 对照最长 prompt 检查草稿模型上下文长度。
- SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1 只移除了检查，长 prompt 必须自行测试。
```

来源：capture/gpu/out-gb10/server-eagle3.log, capture/gpu/out-l4/server-eagle3-no-env.log, capture/gpu/out-l4/server-load-eagle3.log, capture/gpu/summary/l4.json, server-eagle3.command.txt, eagle3-bench-random-c1.txt, eagle3-bench-random-c8.txt, eagle3-bench-random-c32.txt, capture/gpu/summary/gb10.json, python/sglang/srt/configs/model_config.py (_derive_context_length), docs/cookbook/specbundle/specbundle_usage.mdx, python/sglang/srt/speculative/eagle_worker_v2.py (forward_batch_generation), speculative/eagle_utils.py (build_tree_kernel_efficient, eagle_sample), arg_groups/speculative_hook.py (_auto_choose_speculative_params, _handle_eagle_family, _handle_ngram, _resolve_speculative_algorithm_alias), arg_groups/fields/spec.py, managers/scheduler_components/metrics_reporter.py, and observability/metrics_collector.py at v0.5.22; issues #5274 and #6783; PR #33276; field reports by Ant Group on the LMSYS blog (2025-09-26) and David Noel Ng (2026-08-04); vendor reports by Google Cloud (2025-11-25) and Modal with Decagon (2025-11-13).
