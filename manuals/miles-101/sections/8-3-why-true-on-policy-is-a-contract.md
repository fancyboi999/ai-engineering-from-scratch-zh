# 为什么 true on-policy 模式是一份契约

> 逐位一致要求两端使用相同 kernel，因此 true on-policy 模式只适用于它列出的模型和 GPU。

GRPO 假设 engine 和 trainer 为 token 计算的概率相同。我们的 GB10 上，每次正常的 Qwen3-0.6B 训练中，两端每个 token 的平均差距为 0.013 至 0.016。本节解释差距来源，以及为什么消除差距需要一份契约，而不是一个 flag。

读完本节后，你可以解释 true on-policy 模式为什么只支持部分模型和 GPU。

## 两个程序计算同一个模型 {#s-why-true-on-policy-is-a-contract-two-programs-compute-the-same-model}

每次权重更新后，engine 和 trainer 持有相同权重，但它们运行的程序不同。engine 针对速度优化：批量处理多个请求、根据 batch 大小选择 kernel，并融合多个操作。trainer 针对梯度计算优化：它使用不同的 attention kernel，并按不同顺序执行操作。

浮点数以不同顺序相加时，结果会有细微差别。同一组长求和采用两种顺序，末尾几位可能不同。经过 28 层网络和 151,936-token 词表后，这些差别会逐渐累积。我们认为测得的差距来自这里。

因此，这个差距并非任何一方的 bug，而是两个程序各自优化自身任务带来的成本。

## deterministic inference 修复了另一类问题 {#s-why-true-on-policy-is-a-contract-deterministic-inference-fixes-the-wrong-half}

deterministic inference 可以让 engine 对同一请求返回相同结果，而不受所在 batch 影响。这让 engine 能够重复自身的输出，却不能让 engine 按照 trainer 的方式计算。

我们的运行直接展示了这一点。启用 deterministic inference 后，两次运行的第 0 步差距相同，精确到小数点后六位；差距仍保持在 0.015 左右。具体数据见[第 4.5 节](#s-use-deterministic-inference)。

```figure
id: fig-8-3
kind: comparison
title: 两种方法分别解决两类问题
claim: deterministic inference 可以让 engine 重复输出，只有 true on-policy 契约能让两端完全一致。
caption: 左侧为 trainer，右侧为 engine。
```

## 契约固定哪些内容 {#s-why-true-on-policy-is-a-contract-what-the-contract-pins}

要让差距严格为 0，两端必须以相同顺序执行相同运算。Miles 的契约为一组模型固定了以下内容：

- 两端使用相同 attention kernel：FlashAttention 3。
- 采用任何 batch 大小下都能得到相同结果的操作。
- 使用 engine 在 prefill 阶段计算 log probability 的方式。
- 为每个模型单独定义配置，因为不同模型需要匹配的网络层不同。

每一项都消除一种运算顺序差异。组合起来后，两个程序就能逐位一致。

## 为什么只支持 Hopper 和 Qwen3 {#s-why-true-on-policy-is-a-contract-why-it-stops-at-hopper-and-at-qwen3}

契约中的每一项代码都需要有人在特定硬件上验证。FlashAttention 3 是为 Hopper GPU 构建的。批次不变操作和模型配置只在 dense Qwen3 模型上经过验证。新 GPU 或新模型都需要编写自己的 kernel，并按同样方式检查。

因此我们将其称为契约，而不是设置。设置会让代码尝试运行；契约则列明已经通过验证的情况，并拒绝其他情况。

## 我们的差距是当前配置的基线 {#s-why-true-on-policy-is-a-contract-our-gap-is-the-floor-of-our-setup}

约 0.015 的差距是当前配置的基线。该配置在两端都使用 BF16，engine 使用 SGLang kernel，trainer 使用 FSDP kernel。这不是 RL 的通用规律，其他配置会得到不同结果。以下变化来自公开研究，我们只在小规模测试了第一项：

- **精度：**2025 年的一项研究在 trainer 和 engine 两端使用 FP16，结果显示差距几乎消失。FP16 比 BF16 保留更多数值位，因此每次舍入的误差更小。
- **Tensor parallel 大小：**2025 年的一篇论文显示，拆分到多张 GPU 上的 engine 与单 GPU trainer 可能采用不同顺序相加。即使使用批次不变的 kernel，这部分差距仍会存在，因此 engine 的 tensor parallel 大小本身也会造成差异。
- **逐位一致 kernel：**同一篇论文让 vLLM engine 和 FSDP trainer 使用按固定树形顺序相加的 kernel，最终逐位一致。在 Qwen3-8B 测试中，推理耗时增加了 22% 至 63%。

2026-10-23，我们在 Miles 之外使用 L4 节点的第二张 GPU 检查了精度影响。SGLang 0.5.22 使用 BF16 或 FP16 部署 `Qwen/Qwen3-0.6B`。在 top-p 为 1 时，对 32 个 prompt 最多采样 64 个 token，因此没有采样 mask。由于 3 个答案在生成 64 个 token 前就遇到了 end token，本次比较涵盖 32 个 prompt 生成的 1,961 个 token。我们使用 Transformers 对同一批 token 执行前向计算，模拟 trainer。

```listing
title: engine 与 trainer 每个 token 的 logprob gap 绝对值中位数
source: capture/gpu/out-l4/logprob-gap-by-dtype.txt
lang: text
note: 完整数据表。列出 engine dtype，再列出 trainer dtype。
---
engine   trainer   median    p90      mean     max
BF16     BF16      0.0073    0.087    0.027    0.355
BF16     FP16      0.0079    0.053    0.019    0.279
BF16     FP32      0.0076    0.053    0.019    0.280
FP16     BF16      0.0085    0.061    0.021    0.265
FP16     FP16      0.00094   0.010    0.0032   0.033
FP16     FP32      0.0010    0.0068   0.0024   0.023
```

- 两端都使用 FP16 时，差距中位数比两端都使用 BF16 小约 7.8 倍。最大 token 差距从 0.355 降至 0.033。
- 只有一端使用 FP16 没有帮助，差距仍为 0.0079 和 0.0085。
- 即使 trainer 使用 FP32，BF16 engine 的差距仍约为 0.0076，因此下限由 engine 自身的舍入误差决定。

该测试在一定范围内支持上述研究结论，但也有局限：只使用一个 0.6B 模型，只测量 logprob gap，没有运行训练，也没有使用 Miles 镜像。GPU 与其他任务共享，且未锁定频率；这不会改变上述数值。

其他团队也公布了正常训练的差距。可以将其作为有效运行差距范围的参考，不要将它们当作自己运行的目标：

| 已公开的配置 | 每个 token 的差距 |
|---|---|
| vLLM 团队的 RL 框架在 A100 上运行 Qwen3-4B | 约 0.011 |
| 相同框架在 GB200 上运行 Qwen3-30B-A3B MoE | 约 0.018 |
| 相同框架在 GB200 上运行 GLM-4.5-Air | 0.02 至 0.03 |
| Miles 使用 BF16 在 GB300 上运行 DeepSeek-V4.1 | 0.019 至 0.023 |
| Miles 使用 routing replay 在 GB300 上运行 GLM-5.3-Flash，见[第 3.4 节](#s-train-a-moe-model) | 0.0068 至 0.0106 |

我们的建议是：使用契约范围之外的 GPU 时，先判断差距是否会影响训练。如果会，精度、tensor parallel 大小和逐位一致 kernel 都是可调因素，但每项都会增加耗时或工作量。如果不会，先测量第 0 步的差距，并确保它处于正常训练范围内，然后再消除 sampler 引入的那部分差距。

```takeaways
- 差距来自两个程序采用了不同的计算顺序，而非 bug。
- deterministic inference 可以让 engine 重复结果；true on-policy 模式则可以让两端计算一致。
- 约 0.015 是我们当前 BF16 配置和 kernel 的差距下限，不是通用规律。
```

来源：Miles main 08752a12 中的 true on-policy 契约、模型配置和文档；capture/gpu/summary/miles-gb10-lab.json (runs.e6a-base、runs.e6b-det-triton、runs.e6c-det-flashinfer、runs.e6d-det-triton-repeat)；Qwen3-0.6B 模型配置；capture/gpu/out-l4/logprob-gap-by-dtype.txt；Defeating the Training-Inference Mismatch via FP16，arXiv 2510.26788；Deterministic Inference across Tensor Parallel Sizes，arXiv 2511.17826；vLLM blog 中的 vime 公告，2026-06-09；SGLang pull request 42408；Miles GLM-5.3-Flash 模型文档。
