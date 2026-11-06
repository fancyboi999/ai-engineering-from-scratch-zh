---
id: the-cost-of-batch-invariance
title: 确定性对线上服务器的代价
card: inference-serving
kind: tradeoff
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, ml-depth]
tags: [batch-invariance, determinism, throughput, prefix-cache, evaluation]
minutes: 10
lessons: []
manuals: [vllm-101#s-get-reproducible-outputs, sglang-101#s-deterministic-inference-and-logprobs]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
你的评测团队希望从线上服务器获得比特级完全一致的输出，并要求你为所有流量开启批次无关（batch-invariant）模式。该模式改变了什么？会付出多大代价？你会怎么回复？

## Short answer

该模式将根据 batch 大小切分求和的 kernel，替换为保持同一种规约顺序的 kernel，使同一个请求无论单独运行还是在 batch 中运行，都能得到相同的 logits。它的代价是降低速度，且在低并发下最明显：在我们的 L4 上，小模型在 1 个用户时每 token 时间变为原来的 2.4 倍，32 个用户时为 1.4 倍；Qwen3-8B 在 8 个用户下为 1.4 倍，输出减少 27%。在测出我们实际并发下的代价后，我会建议在评测和 rollout 服务器上开启，在线上生产流量中保持关闭，因为在 SGLang 默认后端下开启该模式还会关闭前缀缓存。

## Full answer

### 该模式切换了什么

在 vLLM 中，`VLLM_BATCH_INVARIANT=1` 需要计算能力版本为 8.0 或更高的 GPU（包括 L4 和 GB10），并会关闭改变求和顺序的加速特性，比如张量并行下的自定义 all-reduce。在 0.31.0 中它处于 beta 状态。

在 SGLang 中，`--enable-deterministic-inference` 将矩阵乘法、log-softmax、mean、RMS norm 和批处理乘法算子替换为批次无关 kernel，强制使用普通采样后端，将 all-reduce 设为树状结构以让张量并行求和按固定顺序累加，只接受部分注意力后端，关闭 radix 缓存（除非后端支持），并为每个未带 `sampling_seed` 的请求分配默认种子 42。缓存规则影响最大：在 GB10 的默认后端下，日志显示 radix 缓存不兼容，因此每个重复前缀都要重新做一次完整的 prefill。在 L4 上，该模式选择了一个能保留缓存的后端。

### 手册测得的数据

vLLM 在锁定 900 MHz 的 L4 上运行 Qwen3-0.6B，按“默认、批次无关、再次默认”的顺序运行，每组两个随机种子，每次运行前重置缓存：

| 用户数 | 中位 TPOT，默认 / 批次无关 | 输出 tok/s，默认 / 批次无关 |
|---|---|---|
| 1 | 6.9 / 16.9 ms (2.4x) | 140.6 / 58.7（低 58%） |
| 8 | 9.9 / 18.2 ms (1.8x) | 755 / 420（低 44%） |
| 32 | 18.8 / 25.9 ms (1.4x) | 1,565 / 1,154（低 26%） |

在 Qwen3-8B 上，8 个用户时每 token 时间变为原来的 1.4 倍，输出降低 27%；32 个用户时分别为原来的 1.3 倍和降低 23%。相对代价随着每一步共享的用户增多而下降，且在小模型上更明显。

SGLang 在 GB10 上运行 Qwen3-30B-A3B，在并发 8 下每台服务器跑一次：输出从每秒 78.92 个 token 降至 64.83 个（降低 18%），中位每 token 时间从 97.30 ms 升至 117.43 ms。那次运行中关闭了 radix 缓存，所以带有共享前缀的负载付出的代价会高于这个数字。

### 其他团队测得的数据

一篇关于非确定性的文章指出，1,000 个 Qwen3-8B 请求在 vLLM 默认配置下耗时 26 秒，在批次无关 kernel 下耗时 55 秒，在更好的注意力 kernel 下耗时 42 秒。2026 年的一项研究测得批次无关 kernel 带来两倍以上的延迟，吞吐量最多降低 74%。一项验证研究发现，在执行方式发生某些改变（如 prompt 分块和 KV cache 复用）时，两个引擎的这些模式会给出不同的 logits。手册本身没有测量这些。

### 该模式未覆盖的盲区

在 0.31.0 中，自行选择注意力后端的 vLLM 模型会跳过检查，其输出依然可能取决于 batch；下一个版本会检查每个注意力层，但对编译模式下同时开启数据、张量和专家并行的 MoE 模型的修复并未包含在内。在 SGLang 上，有报告指出混合状态空间模型不具备批次无关性，一些较新的架构尚未受支持，滑动窗口 kernel 在前缀模式下给出了多份不同的贪心输出（该 issue 仍处于 open 状态），且某推测算法在重启后因为 kernel 自动调优在每次启动时选择了不同的策略而给出了不同的文本。

### 我会怎么回复

在把比特级完全一致作为交付物的场景中使用该模式：强化学习 rollout 以及必须可复现的评测。生产流量保持使用默认 kernel，在那里前缀缓存和更快的 kernel 比比特级一致更有价值。在我们实际服务的并发数下测量代价，而不是看单一数据点，并测试确切的配置：模型、注意力后端、并行布局、分块大小和缓存设置。在对比的两次运行之间清空缓存，并保持 dtype 一致。

## Follow-ups

- **Level 3:** 为什么并发越高，相对代价越小？ Expected: 批次无关 kernel 放弃了空闲 GPU 可以利用的快速拆分，这种损失在较小步骤中所占比例更大；每步包含更多行时，固定顺序带来的开销占比更小（32 个用户时为 1.4 倍，1 个用户时为 2.4 倍）。
- **Level 3:** 在 SGLang 上，18% 低估了对话负载的代价。为什么？ Expected: 在默认注意力后端下，确定性模式会关闭 radix 缓存，所以每个重复前缀都要重新做完整 prefill；在 GPU 支持的情况下选择能保留缓存的后端。
- **Level 4:** 两台服务器都开启了该模式，对同一个 prompt 的贪心输出依然不同。说出三个原因。 Expected: 硬件或引擎版本不同；遇到了该模式未覆盖的模型路径，比如自行选择后端的注意力层或混合状态空间层；以及 kernel 自动调优在每次启动时选择了不同的策略。

## Wrong answers

- "GPU 空闲时该模式没有代价。" 在低并发下代价最大，小模型在 1 个用户时每 token 时间变为原来的 2.4 倍，因为批次无关 kernel 放弃了空闲 GPU 可以利用的快速拆分。
- "生产环境应该开启它，因为正确性第一。" 生产流量从前缀缓存和快速 kernel 中获得的收益，远大于比特级完全一致；手册的立场是在 rollout 和评测中使用该模式，并在你实际服务的并发下测量代价。
- "该参数覆盖所有模型。" 在 0.31.0 中，自行选择注意力后端的模型会跳过检查，混合状态空间层未被覆盖，且编译下专家模型的修复未包含在下个版本中；要测试具体配置。
- "种子 42 让采样请求可复现。" 它让每个未带 sampling_seed 的请求抽取相同的随机数，这虽然可复现，但在不同用户之间也是完全相同的；对需要复现的请求单独设置 sampling_seed。

## Taught in

[获取可复现的输出](../../../manuals/vllm-101/sections/3-8-get-reproducible-outputs.md)测量了 L4 上的代价，[SGLang 确定性推理一节](../../../manuals/sglang-101/sections/4-6-deterministic-inference-and-logprobs.md)列出了该参数切换的组件。
