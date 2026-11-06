---
id: pick-a-4-bit-format
title: 为 24 GB 显存上的 14B 模型选择 4 位量化格式
card: gpu-memory-quantization
kind: tradeoff
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [screen, design-review]
tags: [quantization, awq, gptq, bitsandbytes, gguf]
minutes: 10
lessons: [phases/17-infrastructure-and-production/09-production-quantization, phases/10-llms-from-scratch/11-quantization]
manuals: [vllm-101#s-fit-a-bigger-model-with-fp8-weights]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

一个 14B 模型必须在一张 24 GB 显卡上运行，但在 FP8 下无法保留足够可用的 KV 显存池。你可以选择 AWQ、GPTQ、compressed-tensors 格式的权重、加载时 bitsandbytes 量化，或者 GGUF 文件。你如何选型，手册对各格式的实测结果是什么？

## Short answer

优先选择已公开发布的 4 位量化权重，而不是在加载时实时量化；并根据推理引擎与业务工作负载挑选具体格式。对于 GPU 服务，搭配 Marlin 内核的 AWQ 是默认选择；若基座模型上还需要挂载 LoRA 适配器，则选择 GPTQ；GGUF 仅用于 CPU 或边缘端服务，因为其算子并非为 GPU 构建。手册在 L4 上实测了 AWQ 格式的 Qwen3-14B，权重占用 9.44 GiB，显存池保留了 36,272 token；使用 bitsandbytes 加载 Qwen3-1.7B 占用 1.33 GiB，相比 BF16 的 3.22 GiB 相当于 41%；并通过文档标为实验性的插件加载了 0.55 GiB 的 GGUF 文件。

## Full answer

### vLLM 支持的量化格式

| 格式 | 存储内容 | 0.31.0 版本的注意事项 |
|---|---|---|
| AWQ 与 GPTQ | 4 位权重，16 位计算 | 支持从 Turing 架构起的 GPU，在 Ampere、Ada 和 Hopper 上配备高效的 Marlin 内核 |
| compressed-tensors W4A16 或 W8A8 | 4 位或 8 位权重，由 LLM Compressor 库生成 | vLLM 官方推荐使用此库构建自定义量化权重 |
| bitsandbytes | 4 位权重，在服务加载模型时实时量化 | 需要单独安装 `vllm-bnb-plugin` 包，并在未量化模型上指定 `--quantization bitsandbytes` |
| GGUF | llama.cpp 的专用文件格式 | 需要单独安装 `vllm-gguf-plugin` 包，文档明确标为实验性功能 |

对于已发布的量化模型无需额外传参；vLLM 会自动从模型配置中读取量化方法。

### 手册实测情况

- **AWQ。** 在 L4 上执行 `vllm serve Qwen/Qwen3-14B-AWQ --max-model-len 8192` 且不带量化参数。日志显示 `quantization=auto_awq` 并启用了 Marlin 内核。权重占用 9.44 GiB，显存池容纳 36,272 token。未测试速度与准确率。
- **bitsandbytes。** 若未安装插件，服务会因 `Unknown quantization method: bitsandbytes` 报错中止。安装插件后，Qwen3-1.7B 加载占用 1.33 GiB，相比 BF16 的 3.22 GiB 相当于 41%，显存池从 92,960 增至 108,512 token。41% 的比例包含了保持 16 位的嵌入层与输出层，因此在更大模型上该比例会有所不同。
- **GGUF。** 安装插件后，4 位版本的 Qwen3-0.6B 加载了 0.55 GiB 权重，chat 请求正常返回 HTTP 200。

在这些测试期间节点的第二张 GPU 遭遇降频，因此手册未提供吞吐测速，亦未对这两个小模型格式评测准确率。

### 课程选型指南

- CPU 或边缘端服务：GGUF，生产默认采用中等 4 位变体。GGUF 是一种将多种量化变体打包在一起的文件格式，首尾层保持更高精度，在运行速度最快的 CPU 引擎 llama.cpp 中表现最佳。在 vLLM 中其速度较慢，课程测得 7B 模型约为 93 tok/s，因为该格式不是为 GPU 算子打造的。
- 无适配器的常规聊天 GPU 服务：AWQ。它在量化过程中保护最显著的权重；结合 Marlin 内核，它在 7B 模型上达到约 741 tok/s，在所有 4 位格式中取得了最好的代码准确率，比朴素内核提升了 10.9 倍。
- 单基座挂载多个 LoRA 适配器的 GPU 服务：带 Marlin 的 GPTQ，在 7B 模型上达到约 712 tok/s，比无 Marlin 快 2.6 倍，因为截至 2026 年初，vLLM 中的显式微缩放 4 位格式尚未支持 LoRA，而 GPTQ 完整支持。
- 重度推理与数学任务：FP8，并接受相应的显存开销；课程指出 AWQ 在数学任务上会损失若干个百分点。

### 两个常见陷阱

校准集必须与业务领域匹配：AWQ 与 GPTQ 通过校准推理挑选需要保护的关键权重，使用通用的网络爬虫文本会导致其为代码、医疗或法律流量保护了错误的权重。务必在数百个领域内真实样本上校准，并在评估集上验证。此外，KV cache 与权重显存是独立的：4 位量化的 70B 模型权重约为 35 GB，在 128 并发及 2k 上下文下，还需要额外近 20 GB 显存用于缓存。

### 准确率注意事项

4 位量化模型可能比 FP8 产生更多的准确率损失，具体取决于模型架构与量化方式。手册中的 GSM8K 检验是在 FP8 上执行的，并未覆盖 4 位格式。必须在自有的 prompt 业务集上测试候选格式；如果表现模糊，在各格式上运行 1,000 个样本的评估。

## Follow-ups

- **Level 2:** 为什么选择公开发布的权重，而不是在加载时使用 bitsandbytes 量化？ Expected: 加载时量化会显著拖慢启动速度，且产生未经充分验证的权重；已发布的权重具有明确的量化方法，通常附带已公开的准确率，且 vLLM 能直接从配置读取而无需额外参数。
- **Level 3:** bitsandbytes 在 1.7B 模型上节省了 41% 内存。14B 模型也能节省相同的比例吗？ Expected: 不会相同；41% 包含了保持 16 位的嵌入层与输出层，它们在更大模型中所占比例较小，因此整体节省比例会发生改变。
- **Level 3:** 需要在 4 位基座上挂载 LoRA 适配器，应选用哪种格式？ Expected: 搭配 Marlin 内核的 GPTQ，因为 vLLM 支持在其上挂载 LoRA 适配器；截至 2026 年初，显式微缩放 4 位格式尚未支持 LoRA。
- **Level 4:** 采用通用文本校准的 AWQ 垂直领域模型在自有评估集上下滑了若干个百分点。原因是什么，如何解决？ Expected: AWQ 从校准集中挑选受保护的权重，通用文本导致其保护了与垂直领域不符的权重；在上线前，使用数百个领域内样本重新校准并在评估集上复测。

## Wrong answers

- "GGUF 是最流行的格式，所以应在 GPU 服务器上使用。" 它是 CPU 和边缘端的首选；在 vLLM 中需要实验性插件，且其算子并非为 GPU 构建，在课程数据中 7B 模型仅跑出约 93 tok/s。
- "在加载时用 bitsandbytes 量化，只需一个参数即可。" 未安装插件时服务会因不支持该方法而报错中止，且量化出的权重未经任何人评估；应直接选用已验证的公开发布 AWQ 或 GPTQ 权重。
- "4 位量化的精度损失和 FP8 一样小。" 4 位模型可能损失更多精度，且取决于模型与方法；课程表明 AWQ 在数学上会掉若干个点，必须自行测试验证。
- "对任何模型内存都能节省 41%。" 实测的 41% 来自一个嵌入层和输出层保留 16 位的小模型；在更大模型上比例不同，且 KV cache 显存与权重显存相互独立。

## Taught in

[用 FP8 权重装下更大的模型](../../../manuals/vllm-101/sections/2-5-fit-a-bigger-model-with-fp8-weights.md)列出了各格式和三次启动实测，[生产量化课程](../../../phases/17-infrastructure-and-production/09-production-quantization/docs/en.md)与[量化课程](../../../phases/10-llms-from-scratch/11-quantization/docs/en.md)给出了选型指南。
