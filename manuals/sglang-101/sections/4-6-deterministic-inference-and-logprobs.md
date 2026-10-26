# --enable-deterministic-inference 与 logprobs

> 同一 prompt 周围的 batch 发生变化，输出 token 就可能不同；SGLang 为已测试的模型与后端固定归约顺序，以解决这个问题。

你在温度为 0 时运行两次评估，分数却不同。一个 prompt 单独发送，再放进繁忙的 batch，第二个答案在四十个 token 后开始偏离。请求没有变化，服务器改变了请求所在的 batch，而 batch 改变了计算过程。

读完本节，你能解释 batch 为什么改变输出，以及确定性模式切换了什么。你也能读懂 SGLang 返回的 logprobs，测试模型是否具有确定性。

## 代价：加法顺序取决于 batch

浮点加法不满足结合律。同一组数按不同顺序求和，结果末尾几位可能不同。矩阵乘法、softmax、归一化都会把求和拆成 tile，许多内核根据 batch 大小选择拆分方式。同一请求在 batch 1 与 batch 37 中，会经过不同的拆分。

最后一位的差异就可能改变哪个 token 的 logit 最大。只要一个 token 不同，后续所有 token 就会基于不同文本生成。Thinking Machines 在 2025 年关于推理非确定性的文章中描述了这种现象 {{field Thinking Machines 2025-09}}，SGLang 的确定性模式采用了相同思路。

**Batch 不变性：** 一种内核属性。固定归约顺序后，某一行的结果不依赖 batch 中的其他行。

## 这个参数切换了什么

`--enable-deterministic-inference` 默认关闭。`--rl-on-policy-target fsdp` 也会将它开启。开启后，启动过程执行以下操作：

1. 将 PyTorch 的 `aten::mm`、`addmm`、`_log_softmax`、`mean.dim`、`rms_norm` 和 `bmm` 算子替换为具有 batch 不变性的内核。
2. 强制使用 `pytorch` 采样后端。
3. CUDA 张量并行时，设置 `NCCL_ALGO=allreduce:tree`，以固定顺序执行 all-reduce 求和。AMD 则使用单阶段 all-reduce。
4. 只接受 `ascend`、`fa3`、`fa4`、`flashinfer`、`intel_xpu` 和 `triton` 注意力后端。
5. 除非注意力后端为 `ascend`、`fa3`、`fa4` 或 `triton`，否则关闭基数缓存。
6. 为每个未指定 `sampling_seed` 的请求设置 seed 42。

```figure
id: fig-4-9
kind: comparison
title: 同一行在两个 batch 中归约
claim: 默认内核在两个 batch 中以不同方式拆分同一行；batch 不变内核对所有 batch 使用同一种拆分。
caption: 每列从上往下读。一行代表一个请求，tile 表示部分和。依据 v0.5.22 的 batch 不变算子覆盖实现。
```

对服务器而言，第五点影响最大。使用 `flashinfer` 时，确定性模式会关闭前缀缓存。每个重复前缀都要重新支付完整 prefill 成本。[第 3.3 节](#s-radixcache) 解释了这个缓存省下什么。

## Logprobs 经过温度缩放

**Logprob：** 服务器所采样分布中某个 token 的对数概率。请求设置 `return_logprob` 或 OpenAI 的 `logprobs` 字段后，SGLang 就会返回它。

只要 batch 并非全部使用贪心解码，采样器就通过 `log_softmax(logits / temperature)` 计算返回的 logprobs。只有全部贪心的 batch，或设置了环境变量 `SGLANG_RETURN_ORIGINAL_LOGPROB` 时，才不使用温度，返回 `log_softmax(logits)`。温度 0.7 的请求得到的是锐化分布的 logprobs。

这对采样是正确的，但会让拿这些数与温度 1 的模型运行比较的人感到意外。强化学习训练器如果直接从原始 logits 计算 logprobs，每个 token 都会不匹配，看起来像数值 bug。[第 7.2 节](#s-sglang-as-an-rl-rollout-engine) 解释它为什么影响训练。

我们的测试显示，top-p 没有改变返回值。我们在 L4 上使用 BF16 `Qwen/Qwen3-0.6B`，温度 1、top-p 0.9，并设置 `return_logprob`。测试发送了 16 条 48-token prompt，再用 Transformers 对完整词表计算 float32 参考值。

```listing
title: 返回 logprob 与完整词表参考值的差异
source: capture/gpu/out-l4/logprobs-top-p.txt
lang: text
note: 显示两种 SGLang 设置；同一文件里的 vLLM 结果略去。
---
engine and mode                                  returned minus reference, median   median absolute
…
SGLang return_logprob, ORIGINAL_LOGPROB=0        0.0000                             0.0066
SGLang return_logprob, ORIGINAL_LOGPROB=1        0.0000                             0.0066
```

无论环境变量取 0 还是 1，SGLang 都返回 top-p 过滤前的 logprob。在温度 1 时，两个设置得到相同值。同一 prompt 的 top-p 过滤后 logprob 高约 `-log(保留概率质量)`，中位数约 0.053。因此，如果 trainer 对保留 token 重新归一化，就不能直接比较这个值。该 GPU 由所有者共享且没有锁定时钟，但这不会改变 logprob。

## Apple silicon 上的情况

我们的捕获运行在 MLX runtime 上，MLX 的采样处理不同。`--mlx-enable-sampling` 的帮助文本说明了变化。

```listing
title: sglang serve --help 中的 MLX 采样参数
source: capture/out/serve-help.txt
lang: text
note: 节选自参数列表，省略了关于重叠调度器的三行。
---
  --mlx-enable-sampling
                        MLX backend only: sample decode tokens (temperature /
                        top-k / top-p / min-p) instead of greedy argmax.
…
                        exact argmax behavior. Also enables on the MLX path:
                        grammar vocab masks and custom logit processors (these
                        break decode chaining per step; custom processors run
                        on pure-decode steps only), logit_bias, output
                        logprobs (sampled token / top-k / token_ids; prompt
                        input logprobs are not computed), NaN sanitization
                        (SGLANG_SANITIZE_NAN_LOGITS), and per-request
                        sampling_seed under --enable-deterministic-inference
                        (deterministic within MLX only). Penalties are not
                        applied.
```

不传该参数时，MLX 的每个 decode 步骤都选择 logit 最高的 token，无论请求要求什么温度。语法 mask 和输出 logprobs 也需要这个参数；MLX 始终不应用惩罚项。我们的捕获工具发送温度 0，因此结果不依赖该参数。

## 应该测什么

SGLang 自带一个测试，以随机 batch 大小发送同一 prompt，统计不同输出数。它有三种模式：`single`、针对共享前缀的 `prefix`，以及比较有无缓存 prefill 的 `radix_cache`。

```bash
python3 -m sglang.test.test_deterministic --n-trials 50 --test-mode single
python3 -m sglang.test.test_deterministic --n-start 1 --n-trials 50 --test-mode prefix
```

对自己的模型、注意力后端和并行布局运行它。每个 prompt 只有一种输出才算通过。然后分别开启和关闭参数测量吞吐量，因为 batch 不变内核会牺牲部分速度。

## 我们在 GB10 上测到了什么

探测以温度 0、128 个新 token 发送一个 prompt：先单独发送五次，再与另外 15 个 prompt 组成大小 16 的 batch 发送五次。在单张 NVIDIA GB10 上，对 `Qwen/Qwen3-30B-A3B-Instruct-2507` 先测试默认服务器，再开启 `--enable-deterministic-inference` 测试。

**我们在默认服务器上实测到了两种答案。** 首个单独请求和五个 batch 请求生成相同文本；后四个单独请求生成另一段文本，在第 238 个字符后偏离前者。这些运行的请求完全没变。

我们的解释是：首个请求从头计算 prompt，后四个在基数缓存中找到它，走了不同的 prefill 路径。上述测试的 `radix_cache` 模式检查的就是这种情况。

开启参数后，十个请求都写出相同文本。启动日志显示了上述列表中的切换：

```listing
title: 确定性模式在 GB10 上切换了什么
source: capture/gpu/out-gb10/server-deterministic.log
lang: text
note: 启动日志中的三行，省略时间戳和第二行末尾。
---
… Sampling backend is set to pytorch for deterministic inference.
… Attention backend not specified. Falling back to 'flashinfer' for deterministic inference. You can explicitly set --attention-backend to one of ['ascend', 'fa3', 'fa4', 'flashinfer', 'intel_xpu', 'tri…
… Currently radix cache is not compatible with flashinfer attention backend for deterministic inference. It will be supported in the future.
```

并发 8 时，代价是损失 18% 吞吐量。输出从 78.92 降至 64.83 tok/s，每 token 耗时中位数从 97.30 升至 117.43 ms。基数缓存已关闭，所以共享前缀负载的代价会比这次测试更大。

## 我们在 L4 上测到了什么

在 L4 上用 BF16 `Qwen/Qwen3-8B` 测试时，默认服务后四个单独请求生成的文本彼此相同，却与首个请求不同。Batch 请求又生成了两种文本，因此默认服务对同一 prompt 共给出四种答案。开启确定性参数后，L4 上十次输出全部一致。

后来我们在同一节点的第二张 L4 上测试 FP8 `Qwen/Qwen3-8B-FP8`。首个单独请求仍与后四个不同；这次 batch 额外生成一种文本。开启确定性参数后，十次输出也一致。

这次测试还显示 backend 会变化。在 L4 上启用确定性参数、但不指定 `--attention-backend` 时，SGLang 选择了适用于 SM 8.9 的 `fa3`。该 GPU 上的默认服务使用 `flashinfer`。

```listing
title: L4 上确定性模式选择的 attention backend
source: capture/gpu/out-l4/livecheck-2026-10-23.txt
lang: text
note: 启动日志一行及其旁注。
---
Attention backend not specified. Falling back to 'fa3' for deterministic inference
The server ran on fa3 on SM 8.9 with no error. The default server on this GPU uses flashinfer.
```

因此，在这张 GPU 上启用确定性模式也改变了 attention backend。该设置使用 `fa3` 时会保留基数缓存。

## 缓存、batch 与 dtype 的影响

我们比较了两次运行中 greedy 输出有差异的数量。prompt 来自 ShareGPT，均有约 170-token 的共享 system prompt，关闭思考模式并生成 128 token。测试运行于 L4 节点的第二张 GPU，使用 `Qwen/Qwen3-0.6B`。该 GPU 由所有者共享且未锁定时钟。时钟影响速度，不影响 greedy token。

```listing
title: 并发 1 时不同条件间输出变化的数量，共 32 条 prompt
source: capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt
lang: text
note: 括号中是首个不同 token 的中位位置。vLLM 一列来自同一组 prompt 在 vLLM 0.31.0 上的测试。
---
comparison                     SGLang 0.6B   vLLM 0.6B
flushed repeat against fresh   0 of 32       0 of 32
cache off against cache off    0 of 32       0 of 32
fresh against warm cache       21 of 32 (45) 11 of 32 (57)
cache on against cache off     25 of 32 (26) 21 of 32 (48)
```

- **单请求且缓存状态相同。** 刷新后重复请求，或关闭基数缓存后重复请求，32 条 prompt 都返回相同文本。
- **单请求但缓存状态不同。** 同一 prompt 在热缓存下有 21/32 条输出不同。基数缓存开启与关闭相比，25/32 条输出不同。
- **64 条并发请求。** 两次关闭缓存的运行有 27/64 条输出不同。仅 batch 就会改变很多输出，因此无法单独测出缓存影响。
- **dtype 不同。** 我们以并发 1 发送 64 条问题，并关闭缓存。Qwen3-0.6B 中 BF16 与 FP16 有 51/64 条输出不同；Qwen3-1.7B 中有 57/64 条不同。首个差异 token 的中位位置分别为 41 和 54。同一 dtype 重复运行则没有差异。

2026 年一项对两个 serving engine 的研究发现了相同的缓存差异 {{paper cache-induced-divergence 2026-09}}。我们的计数来自一张 GPU 上的小模型；可以对自己的模型执行相同检查。

## 结果的适用范围

这里的吞吐量损失来自一个模型、一个并发点和单次运行。其他团队测量了确定性模式的成本与差异。以下结果不是我们测得的：

- **速度成本。** Thinking Machines Lab 用 vLLM 处理 1,000 条 Qwen3-8B 请求，默认耗时 26 秒，使用 batch-invariant kernel 后耗时 55 秒。更快的 attention kernel 将耗时降至 42 秒 {{field Thinking Machines 2025-09}}。
- **高负载下损失更大。** 2026 年 CoRun 研究测得，batch-invariant kernel 的延迟超过两倍，吞吐量最多降低 74% {{paper CoRun 2026-08}}。
- **执行路径的其他变化。** 2026 年 Vosti 研究验证了 prompt 分块和 KV 缓存复用等设置；某些组合下，SGLang 确定性模式仍会产生不同 logits {{paper Vosti 2026-09}}。

因此，应在实际服务并发下测量成本。也要测试完整配置：模型、attention backend、并行布局、chunk size 和缓存设置。

## 我们的建议

把 `--enable-deterministic-inference` 视为对一个模型、一个后端的承诺，并测试这个承诺。强化学习 rollout 和需要复现的评估适合开启。生产流量默认关闭，前缀缓存和更快的内核通常比位级一致更有价值。不要假设温度 0 就意味着文本相同，GB10 实测并非如此。

对每个必须复现的请求设置 `sampling_seed`。人人都用 seed 42，会让所有采样请求使用相同的随机数序列。

比较两次 eval 时，使用相同配置，并逐 token 比较输出，而不是只比较分数。比较前运行 `POST /flush_cache` 或重启服务，见[第 5.1 节](#s-sglang-benchmark-serving)。同时记录缓存设置与命中的 token 数。

## 事故

**参数被接受，输出却仍有变化。** Issue #43055（2026-10-08）：gpt-oss-20b 在 prefix 模式中，对同一 prompt 给出了多种贪心输出。评论定位到滑动窗口层的确定性 Triton extend 内核：它将 KV tile 对齐到裁剪后的前缀，而不是绝对位置。本手册核验时 issue 仍开放。

**部分架构尚未覆盖。** Issue #43413 报告 Mamba2 混合模型不具有 batch 不变性。Issues #36174 和 #31261 列出 DeepSeek-V4 与 Qwen3.5 尚不支持确定性模式。

**重启改变了贪心输出。** Issue #39597（2026-09-15）：使用 DFLASH 推测算法时，相同 prompt 在重启后给出不同文本。FlashInfer 自动调优每次启动选择了不同内核策略。临时解决方式是 `--disable-flashinfer-autotune` 或确定性模式。

```takeaways
- 依赖可复现输出前，先对自己的模型和后端运行 sglang.test.test_deterministic。
- 确定性模式会关闭 flashinfer 的前缀缓存，可选择 fa3 或 triton。
- 相信温度 0 前，先将一个 prompt 单独发送和放入 batch，统计不同输出数。
- 比较两次评估前先刷新缓存，并记录命中 token 数。
- 训练器按温度 1 比较 logprobs 时，设置 SGLANG_RETURN_ORIGINAL_LOGPROB。
- 按线上并发测量确定性模式的成本，不要只测一个点。
- 逐 token 比较两次运行的输出，并保持 dtype 一致。
- Apple silicon 上，请求需要温度或 logprobs 时，传入 --mlx-enable-sampling。
```

来源：capture/gpu/out-gb10/determinism.txt, deterministic-determinism.txt, server-deterministic.log, bench-random-c8.txt, deterministic-bench-random-c8.txt, capture/gpu/out-l4/determinism.txt, deterministic-determinism.txt, livecheck-2026-10-23.txt, greedy-output-cache-batch-dtype.txt, logprobs-top-p.txt, capture/gpu/determinism_probe.py; python/sglang/srt/batch_invariant_ops/batch_invariant_ops.py (enable_batch_invariant_mode), arg_groups/attention_hook.py (handle_deterministic_inference), arg_groups/choices.py (DETERMINISTIC_ATTENTION_BACKEND_CHOICES, RADIX_SUPPORTED_DETERMINISTIC_ATTENTION_BACKEND), sampling/sampling_batch_info.py, layers/sampler.py, python/sglang/srt/entrypoints/http_server.py (flush_cache), python/sglang/test/test_deterministic.py at v0.5.22; capture/out/serve-help.txt; issues #43055, #43413, #36174, #31261, and #39597; Thinking Machines, Defeating Nondeterminism in LLM Inference (2025-09); Patodiya, Same Request, Different Answer: Quantization Amplifies Cache-Induced Divergence in LLM Serving, arXiv 2609.04748 (2026-09); Zhao et al., CoRun: Padding is Simple and Efficient for Deterministic LLM Inference, arXiv 2608.14376 (2026-08); Qin et al., Vosti: Specifying, Implementing, and Verifying Deterministic LLM Inference, arXiv 2609.38981 (2026-09).
