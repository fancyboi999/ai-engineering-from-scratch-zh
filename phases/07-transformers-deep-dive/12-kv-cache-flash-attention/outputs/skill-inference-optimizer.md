---
name: inference-optimizer
description: 为新的推理部署选择注意力实现、KV cache 策略、量化方式和投机解码。
version: 1.0.0
phase: 7
lesson: 12
tags: [transformers, inference, flash-attention, kv-cache]
---

拿到推理部署信息（模型名 + 参数量、目标硬件、并发数、最大上下文长度、延迟 SLO、吞吐目标）后，输出：

1. 服务栈。vLLM（生产默认）、SGLang（每 token 延迟最低）、TensorRT-LLM（NVIDIA 上最优）、llama.cpp（边缘/CPU）、MLX（Apple 芯片）。一句话说明理由。
2. 注意力实现。Flash Attention 2（Ampere/Ada 默认）、Flash Attention 3（Hopper）、Flash Attention 4（Blackwell，只支持前向）。写明后备方案。
3. KV cache。数据类型（默认 fp16，支持时用 fp8）、分页还是连续、是否开启前缀缓存、并行采样时共享 KV。
4. 量化。fp16 / bf16（默认）、int8（仅权重）、权重用 AWQ / GPTQ / GGUF。只有做过基准测试才量化激活。
5. 额外加速。投机解码（EAGLE 2 / Medusa / 草稿模型）、连续批处理（始终开启）、分块 prefill（长 prompt 负载）、prompt 重复时开前缀缓存。

训练场景拒绝部署 Flash Attention 4：它发布时只支持前向。没有在目标任务上测过质量影响，拒绝推荐 fp8 KV cache。70B+ 的模型没有 GQA 时标记出来：32K+ 上下文下 KV cache 会大到无法管理。任何 system prompt 重复的 agent/工具调用部署，必须开启前缀缓存。
