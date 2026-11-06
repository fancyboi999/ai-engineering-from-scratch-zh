---
id: kv-scales-silently-at-one
title: 从未成功加载的 FP8 KV 缩放因子
card: gpu-memory-quantization
kind: debug
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [fp8, kv-cache, scales, accuracy, checkpoint]
minutes: 8
lessons: []
manuals: [vllm-101#s-fit-more-users-with-an-fp8-kv-cache, sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你在附带校准缩放因子（scale）的模型权重上开启了 FP8 KV cache，但评估集上的准确率却下降了。启动日志中有一行关于缩放因子的提示。发生了什么，你如何确认，有哪些应对方案？

## Short answer

服务正在以 1.0 的缩放因子运行 cache，因为加载器并未读取权重中自带的缩放因子：在这种情况下，vLLM 会打印 `Using KV cache scaling factor 1.0`。而 SGLang 只要未传入 `--quantization-param-path` 就会打印 `Using FP8 KV cache but no scaling factors provided`，因此仅凭其警告无法确定服务实际使用的缩放因子。要确认 vLLM 的情况，可在权重索引中搜索以 `k_scale` 或 `v_scale` 结尾的张量；如果存在且 vLLM 仍打印警告，说明加载器遗漏了它们，在 0.31.0 版本中已有公开 issue 记录这对整个模型家族和一个投机草稿模型加载器存在该问题。可选方案包括换用能正常加载缩放因子的模型权重或版本、在 SGLang 上通过量化参数路径传入 scale 文件，或者在问题修复前沿用 BF16 cache，且每次变更后都在自身业务任务上运行准确率评估。

## Full answer

### 缩放因子的作用

FP8 要求为每个张量配备一个缩放因子，以将键和值的数值范围映射到对应格式。如果没有提供，所有缩放因子默认为 1.0。vLLM 团队将这种情况视为准确率的最坏情形。在他们针对未校准缓存的测试中，大多数模型表现接近 BF16，但潜在注意力后端上的某个模型家族在缺少校准缩放因子时表现较差。SGLang 针对 compressed-tensors 权重中缩放因子遗漏的修复测试显示，在一个缩放因子接近 1.0 的权重上，遗漏缩放因子时 GSM8K 得分为 0.960，正常加载时为 0.965；如果权重的缩放因子远偏离 1.0，精度损失会更大。

### 三步排查确认

1. 检查权重文件中是否存在缩放因子。在权重索引中搜索以 `k_scale` 或 `v_scale` 结尾的张量名称：

```bash
grep -oE '"[^"]*(k|v)_scale"' model.safetensors.index.json | sort -u
```

若没有输出，说明该权重根本没有包含缩放因子。只有一个权重文件的模型没有索引文件，可用 safetensors 包直接列出张量名。

2. 查看启动日志。在 vLLM 中，如果权重中包含缩放因子但日志打印了缩放因子警告，说明加载器丢弃了它们。在 SGLang 中，只要没传缩放因子文件就会打印该警告，因此仅靠此行无法确认服务实际用了什么缩放因子；如果日志明确提示缺少 `k_scale` 或 `v_scale` 参数，则表明加载器跳过了它们。

3. 在上线前，对比带与不带 FP8 cache 时在自有 prompt 上的输出回答。

### 锁定版本下的加载器现状

在 vLLM 0.31.0 中，某个模型家族始终无法加载其 KV 缩放因子，且一个投机草稿模型加载器也会丢弃它们；这两个 issue 依然处于 open 状态。SGLang 在 2026-08-20 合并修复前也会丢弃 compressed-tensors 权重的 KV 缩放因子，并在日志中报告每个 `k_scale` 参数未找到；该修复已包含在 v0.5.22 中。vLLM 的后续版本还修复了 2 级睡眠会清空已校准缩放因子、导致重新加载后首个请求返回错误结果的缺陷。

### 权重缩放因子不是 KV 缩放因子

Qwen3-30B-A3B 的 FP8 权重索引中只列出了权重 scale，没有包含 KV scale，因此其 cache 在手册的 GB10 上是以 1.0 的 scale 运行的。FP8 权重本身并不能说明其 cache 的情况，除非亲自检查。

### 手册在无缩放因子下的实测结果

Qwen3-8B 本身没有 KV scale，因此手册中 FP8 KV 运行全部采用了 1.0 的 scale。在 500 道 GSM8K 题目（8-shot、greedy）上，vLLM 使用 FP8 cache 得分为 90.8%，BF16 为 91.8%；SGLang 为 91.6% 对 91.6%。所有置信区间均有重叠。但这并不意味着可以掉以轻心：500 道题无法排除微小分数的下滑，这只是单一模型和单一基准，采用其他注意力架构的模型可能会损失更多。

### 可行方案

- 换用能正常加载缩放因子的其他权重版本或引擎版本；变更后务必查看日志。
- 在 SGLang 上，通过 `--quantization-param-path` 传入 scale 文件。
- 在缩放因子能正常加载前保留 BF16 cache，转而通过 FP8 权重获取显存容量。
- 无论哪种方案，都在自身任务上运行准确率评测，并将 cache 警告视为需要追踪的缺陷。

## Follow-ups

- **Level 3:** 模型权重只有一个权重文件且没有索引，该如何查找缩放因子？ Expected: 使用 safetensors 库列出张量名称，替代直接搜索索引文件，并查找以 k_scale 或 v_scale 结尾的名称。
- **Level 3:** 日志打印了警告，但你的 GSM8K 评测未显示损失，这就完成验证了吗？ Expected: 没有；500 道题无法排除微小点数的下滑，损失取决于模型及其注意力架构，且已知有模型家族必须依赖校准后的 scale；必须在自有业务任务上验证，并将此警告作为缺陷持续跟踪。
- **Level 4:** 为什么校准后的缩放因子对某些注意力架构比对其他架构更重要？ Expected: scale 将键和值的动态范围映射到 FP8 范围内，若某种架构的数值分布超出了格式表示范围，以 1.0 的 scale 运行就会发生截断或精度丢失；vLLM 团队指出某个潜在注意力模型家族在未校准时表现很差，而大多数模型与 BF16 相近，因此架构和校准共同决定了最终表现。

## Wrong answers

- "权重是 FP8 的，所以 KV 缩放因子一定加载了。" 权重 scale 和 KV scale 是不同的张量，且即使权重含有 KV scale，加载器也可能将其丢弃；日志警告会明确服务实际所用的情况。
- "该警告只是提示性信息。" 在 vLLM 上，它意味着每个 KV scale 都是 1.0，这被 vLLM 团队视为准确率的最坏情形；在权重包含 scale 时，它意味着加载器丢弃了它们。
- "1.0 的 scale 在 Qwen3-8B 上能用，所以它放之四海而皆准。" 它仅在一个模型的 500 题 GSM8K 上给出了重叠区间，不能排除微小降幅，且另一个模型家族在 1.0 下出现了明显准确率下滑。
- "传入 --quantization fp8 即可加载缩放因子。" 权重处理方式与 cache 缩放因子是分开的；在 SGLang 上 scale 来自权重或量化参数路径文件，传入与权重不匹配的权重参数会在启动时报错。

## Taught in

[使用 FP8 KV cache 容纳更多用户](../../../manuals/vllm-101/sections/2-4-fit-more-users-with-an-fp8-kv-cache.md)与[--quantization 与 --kv-cache-dtype](../../../manuals/sglang-101/sections/4-3-quantization.md)展示了缩放因子警告以及如何检查缩放因子的加载情况。
