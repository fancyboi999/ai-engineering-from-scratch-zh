# 获得可复现的输出

> 只有 seed 不能保证繁忙 batch 中输出一致；batch invariance 会降低速度。

你在运行 eval，每次运行的分数都不一样。读完本节，你可以让相同请求得到相同输出。

## 了解输出变化的原因 {#s-get-reproducible-outputs-know-why-outputs-change}

vLLM 文档说明，默认情况下 vLLM 不保证输出一致，以换取速度。以下因素会改变一个请求的结果：

- **Batch。** Kernel 会根据 batch 大小拆分求和。同一个请求在大小为 3 的 batch 和大小为 30 的 batch 中，数字相加顺序会不同。浮点求和依赖顺序。某个 logit 的微小差异就可能改变采样出的 token，后面的 token 也会随之不同。
- **调度顺序。** 在默认的多进程服务器中，请求到达时间会决定它进入哪个 batch。
- **前缀缓存。** 复用缓存 block 的请求与未命中缓存的请求会用不同方式计算提示词。在我们对 0.31.0 的测试中，32 条提示词里有 11 条的 greedy 输出因暖缓存而改变。2026 年的论文《Same Request, Different Answer》也在 vLLM 0.11 上观察到相同现象。
- **数据类型。** BF16 和 FP16 的舍入结果不同，因此同一个模型使用这两种数据类型时会生成不同文本。

当前 engine 的 seed 默认值为 0，且不能取消设置。Speculative decoding 要求所有 worker 采样出相同 token。因此 seed 始终存在，但单靠 seed 不足以保证复现。

## 根据场景选择修复方式 {#s-get-reproducible-outputs-pick-the-fix-for-your-case}

| 场景 | 修复方式 | 成本 |
|---|---|---|
| 使用 LLM 类运行离线 eval | 设置 VLLM_ENABLE_V1_MULTIPROCESSING=0，使用相同 seed，并按相同顺序发送相同提示词 | Engine 在同一进程中运行，因此调度顺序可复现 |
| 有在线流量的服务器 | 按下一节开启 batch-invariant 模式 | 每个请求都会使用较慢的 kernel |
| 必须完全匹配的 greedy eval | 将 greedy sampling 与上述任一修复方法结合 | 同上 |

所有方法还要求硬件、vLLM 版本和设置都相同。新版本或新 GPU 会改变 kernel，输出也可能随之变化。

## 启用 batch-invariant 模式 {#s-get-reproducible-outputs-turn-on-the-batch-invariant-mode}

启动服务器时设置一个环境变量：

```bash
VLLM_BATCH_INVARIANT=1 vllm serve Qwen/Qwen3-8B 2>&1 | tee server.log
```

该模式要求 NVIDIA GPU 的计算能力至少为 8.0，包括 L4 和 GB10。vLLM 文档将 Qwen3-8B 列为该模式已测试的模型之一。该模式会关闭一些可能改变求和顺序的加速功能，例如 tensor parallelism 下的 custom all-reduce。

我们在 L4 上用小模型 Qwen3-0.6B 运行过一次探测。开启模式后，同一条 greedy 提示词单独运行或放入包含 32 个请求的 batch，都会生成相同文本。关闭模式时，两种情况下输出不同。但一个小模型上的一条提示词不能说明你的模型也适用，应使用自己的模型运行本页末尾的测试。

## 查看我们的输出变化测试 {#s-get-reproducible-outputs-see-what-changed-the-output-in-our-runs}

我们使用 ShareGPT 问题，共享一个约 170-token 的 system prompt，关闭思考，使用 greedy 生成 128 个输出 token。逐 token 比较每次输出与第二次运行的结果。测试在 2026-10-22 和 2026-10-23 于 L4 节点的第二块 GPU 上进行，模型为 Qwen/Qwen3-0.6B。该 GPU 与其他任务共享，且没有锁频。

时钟会改变运行速度，但不会改变 greedy token。每个计数都来自同一块 GPU 上的一次测试时段。

```listing
title: 单用户时 32 个输出中的差异数
source: capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt
lang: text
note: 展示并发数为 1 的表格。括号中的数字表示首个差异 token 的位置中位数。SGLang 列来自在 SGLang 0.5.22 上进行的相同探测。
---
comparison                     SGLang 0.6B   vLLM 0.6B
flushed repeat against fresh   0 of 32       0 of 32
cache off against cache off    0 of 32       0 of 32
fresh against warm cache       21 of 32 (45) 11 of 32 (57)
cache on against cache off     25 of 32 (26) 21 of 32 (48)
```

- **单用户，同一缓存状态。** 清空缓存后重复运行，或关闭缓存后重复运行，32 条提示词的输出都相同。
- **单用户，暖缓存。** 对相同提示词使用暖缓存后，32 条输出中有 11 条改变。开启缓存和关闭缓存的结果有 21 条不同。
- **多用户。** 一次发送 64 个用户的请求后，关闭缓存的两次运行中有 50 条输出不同。仅 batch 就改变了大多数输出，因此这个负载下无法单独判断缓存影响。
- **数据类型。** 关闭缓存后，以单用户发送 64 条问题。Qwen3-0.6B 使用 BF16 与 FP16 时，有 48/64 条输出不同；Qwen3-1.7B 有 56/64 条不同。首个不同 token 的位置中位数分别为 51 和 56。相同数据类型的重复运行没有差异。

因此，单用户时清空缓存足以复现 greedy 输出。但我们的负载测试显示，繁忙时清空缓存还不够。在线服务器可尝试本节介绍的 batch-invariant 模式；我们没有在该负载下测试它。数据来自小模型和一块 GPU，仍需用自己的模型验证。

## 了解 batch-invariant 模式的覆盖范围 {#s-get-reproducible-outputs-know-what-the-batch-invariant-mode-does-not-cover}

0.31.0 中该模式仍处于 beta。其他团队的工作发现了三个限制；我们没有自行测量：

- **速度成本。** Thinking Machines Lab 在 2025 年 9 月的文章《Defeating Nondeterminism in LLM Inference》中，使用 vLLM 运行了 1,000 条 Qwen3-8B 请求。默认配置耗时 26 秒，使用 batch-invariant kernel 后为 55 秒，换用更好的 attention kernel 后为 42 秒。2026 年 CoRun 论文报告，batch-invariant kernel 会让延迟增加一倍以上，吞吐量最多下降 74%。
- **执行方式变化。** 2026 年论文《Vosti: Specifying, Implementing, and Verifying Deterministic LLM Inference》测试了提示词分块和 KV cache 复用等变化。vLLM 的 batch-invariant 模式在某些情况下仍会生成不同 logits。
- **部分模型路径。** 在 0.31.0 中，自行选择 attention backend 的模型会跳过模式检查，因此输出仍可能依赖 batch。0.32.0 会检查每个 attention layer 的 backend。针对 torch.compile 下 MoE 模型同时使用 data、tensor 和 expert parallelism 的修复不在 0.32.0 中。

因此要测试实际部署配置：模型、并行布局、前缀缓存设置和 token 预算都要一致。

## 检查复现结果 {#s-get-reproducible-outputs-check-the-result}

对相同 eval 运行两次，逐 token 比较输出，不要只比较分数。两次之间重置前缀缓存或重启服务器，方法见[性能测试](#s-benchmark-your-server-in-15-minutes)。如果输出不同，将一条失败的提示词单独发送两次。如果单独运行的答案相同，差异就来自 batch。

## 测量我们 L4 上的速度成本 {#s-get-reproducible-outputs-know-the-speed-cost-on-our-l4}

2026-10-23，我们在 L4 上将时钟锁定为 900 MHz 后测量了成本。依次运行默认配置、batch-invariant 配置、默认配置，每种设置使用两个随机种子；每次运行前都重置缓存。

```listing
title: vLLM 0.31.0 上 Qwen3-0.6B 的 batch-invariant 模式与默认值
source: capture/gpu/out-l4/batch-invariant-cost.txt
lang: text
note: 展示 Qwen3-0.6B 的结果，每次运行的时钟中位数均为 900 MHz。前面的设置行和后面的 Qwen3-8B 数据已省略。
---
…
users   median TPOT default / batch-invariant   output tok/s default / batch-invariant
1       6.9 / 16.9 ms (2.4x)                    140.6 / 58.7 (58% lower)
8       9.9 / 18.2 ms (1.8x)                    755 / 420 (44% lower)
32      18.8 / 25.9 ms (1.4x)                   1,565 / 1,154 (26% lower)
…
```

在 Qwen/Qwen3-8B 上并发 8 个用户时，每个 token 的耗时增加了 1.4 倍，输出 token/s 下降 27%。并发 32 个用户时，耗时增加 1.3 倍，输出下降 23%。该模型的单用户测试时钟低于锁频值，因此不纳入比较。用户共同使用每个步骤时，相对成本会下降；小模型上的成本更高。在线服务器启用前，先在自己的模型上测量。

```takeaways
- Batch 会改变求和顺序，因此单靠 seed 不够。
- 离线运行时，在同一进程中使用相同 seed 和提示词顺序。
- 在线使用时，batch-invariant 模式是主要修复方法，但会降低速度，且不能覆盖所有路径。
- 比较两次运行前要重置前缀缓存。
- 比较两次运行时保持数据类型一致。
```

来源：vLLM 0.31.0 文档（docs/usage/reproducibility.md、docs/features/batch_invariance.md），vLLM 0.31.0 源码（vllm/envs.py），论文《Same Request, Different Answer: Quantization Amplifies Cache-Induced Divergence in LLM Serving》（arXiv 2609.04748，2026）、Horace He 和 Thinking Machines Lab 的《Defeating Nondeterminism in LLM Inference》（2025-09-10）、论文《CoRun: Padding is Simple and Efficient for Deterministic LLM Inference》（arXiv 2608.14376，2026）、论文《Vosti: Specifying, Implementing, and Verifying Deterministic LLM Inference》（arXiv 2609.38981，2026），v0.32.0 发布说明（batch-invariant 模式的 attention backend 检查），vLLM pull request 61118（inductor batch-invariant 模式，2026-10-17 合并，未包含在 v0.32.0），capture/gpu/out-l4/livecheck-2026-10-22.txt、capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt、capture/gpu/out-l4/batch-invariant-cost.txt。
