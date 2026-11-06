---
id: multi-lora-serving-cost
title: 一台服务器挂多个 LoRA adapter 的代价
card: inference-serving
kind: design
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, screen]
tags: [lora, adapters, max-loras, prefix-cache, cuda-graphs]
minutes: 8
lessons: [phases/17-infrastructure-and-production/09-production-quantization]
manuals: [vllm-101#s-serve-many-fine-tunes-with-multi-lora, sglang-101#s-prefix-friendly-prompts]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你有同一个基座模型的二十个微调版本，每个都是一个 LoRA adapter，你想用一台 vLLM 服务器来提供它们。你要设置什么？什么决定成本？开启 LoRA 后，服务器里还有什么会变？

## Short answer

启动时用 `--enable-lora` 开启 LoRA，用 `--lora-modules` 给 adapter 命名，让每个请求在 `model` 字段里选一个。成本由三个上限决定：`--max-loras`，默认为 1，限制一个 batch 里能运行的 adapter 数；`--max-lora-rank`，默认为 16，按最大的 rank 预留显存；`--max-cpu-loras`，限制放在 CPU 内存里随时可加载的 adapter 数。LoRA 还会改变前缀缓存，因为 adapter 是每个块键的一部分，所以两个 adapter 永远不会共享缓存块；它还会为 adapter 增加 CUDA graph，所以启动更慢，占用的显存也更多。

## Full answer

### 启动

```bash
vllm serve Qwen/Qwen3-8B \
  --enable-lora \
  --lora-modules support=/adapters/support legal=/adapters/legal \
  --max-loras 4 --max-lora-rank 64
```

每个路径都是一个 PEFT 格式的文件夹，大多数训练库写出的就是这种格式：`adapter_config.json`，加上 `adapter_model.safetensors` 或 `adapter_model.bin` 里的权重。请求在 `model` 字段里写 adapter 的名字来选择它，`/v1/models` 会列出基座模型和每个 adapter。使用不同 adapter 的请求可以在同一个 batch 里运行。手册用 Qwen3-0.6B 和两个公开 adapter 跑了这个配置，rank 分别是 8 和 64，发给每个 adapter 的对话请求都返回了 HTTP 200。

### 设定三个上限

| 参数 | 默认值 | 限制什么 |
|---|---|---|
| `--max-loras` | 1 | GPU 上一个 batch 里能运行的 adapter 数 |
| `--max-lora-rank` | 16 | 服务器接受的最大 adapter rank |
| `--max-cpu-loras` | 未设置 | 放在 CPU 内存里、随时可加载的 adapter 数 |

对挂了很多 adapter 的服务器来说，每个 batch 一个 adapter 的默认值太低。发给第二个 adapter 的请求要等第一个 adapter 的 batch 跑完。把 `--max-loras` 调到同一时间忙碌的 adapter 数。把 `--max-lora-rank` 设为你的 adapter 中最大的 rank，不要更高：服务器会按它接受的最大 rank 预留显存，文档也不建议用 256 这样大的默认值。CPU 内存里的 adapter 在请求点名时能很快加载，所以按常用的 adapter 来设定 `--max-cpu-loras`。

### 运行中加载 adapter

设置 `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True` 后，可以带上名字和路径 POST 到 `/v1/load_lora_adapter`，再 POST 到 `/v1/unload_lora_adapter` 把它移除。只有在你信任服务器的每个调用方时才开启它，因为这个路由会从调用方给出的路径加载文件。

### 其他地方的变化

- **前缀缓存。** 在 vLLM 里 adapter 是每个块键的一部分，在 SGLang 里是树键的一部分。即使 prompt 相同，两个 adapter 也永远不会共享缓存块。一段共用的系统 prompt 会按 adapter 各缓存一份，而不是只缓存一次。
- **CUDA graph。** vLLM 会为带 adapter 的 batch 单独捕获 graph。adapter 越多、graph 尺寸越多，启动时间和显存占用就越多。
- **名字。** 从 0.31 起，adapter 不能和已部署模型同名。

手册没有在它的硬件上测量 adapter 数量和 rank 带来的成本。

### 选择基座格式时考虑 LoRA

课里的选型指南说，4-bit GPTQ 基座在 vLLM 中支持 LoRA adapter，并能用快速的 Marlin kernel，而 microscaling 4-bit 格式在 2026 年初还不支持 LoRA。对一个基座加许多微调变体的场景，4-bit 应该走 GPTQ；没有 LoRA 时选 AWQ，质量不能有任何变化时选 FP8。

## Follow-ups

- **Level 2:** 两个租户分别使用两个不同的 adapter 发送同样的长系统 prompt。第二个请求能命中缓存吗？ Expected: 不能；adapter 在 vLLM 里是块键的一部分，在 SGLang 里是树键的一部分，所以即使 token 完全相同，两个 adapter 也不会共享块。
- **Level 3:** GPU 空闲，发给第二个 adapter 的请求却在等待。为什么？ Expected: adapter 上限默认为 1，所以一个 batch 里只能运行一个 adapter，发给另一个 adapter 的请求要等那个 batch 跑完；把它调到同一时间忙碌的 adapter 数。
- **Level 3:** 为什么不把 rank 上限设成 256 求个保险？ Expected: 服务器按它接受的最大 rank 预留显存，上限过高会为你并没有的 adapter 从 KV 池里拿走显存；把它设为你最大的 rank。
- **Level 4:** 你还想让基座模型用 4-bit 权重。选哪种格式？它排除了什么？ Expected: GPTQ 4-bit 基座，因为它在 vLLM 中支持 LoRA adapter，还能用 Marlin kernel；microscaling 4-bit 格式在 2026 年初不支持 LoRA，所以在它们支持之前都排除在外。

## Wrong answers

- "每个 adapter 一台服务器更简单。" 每台服务器都要放一份自己的基座模型和自己的池；一个基座加按请求选择的 adapter 能共享这两样，使用不同 adapter 的请求还能在同一个 batch 里运行。
- "默认上限就够了。" 每个 batch 一个 adapter 会让发给第二个 adapter 的请求等待，rank 上限 16 会拒绝 rank 64 的 adapter；按你实际部署的 adapter 设定这两个值。
- "开启运行时加载，这样运维不用重启就能添加 adapter。" 加载路由会从调用方给出的路径读取文件，所以只有在你信任服务器的每个调用方时才开启。
- "基座模型相同，所以 LoRA 对前缀缓存没有影响。" adapter 会改变 key 和 value，所以它是块键的一部分，两个 adapter 永远不会共享缓存块。

## Taught in

[用 multi-LoRA 部署多个微调版本](../../../manuals/vllm-101/sections/3-7-serve-many-fine-tunes-with-multi-lora.md)给出了参数和上限，[对前缀友好的 prompt](../../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)提到了树键，[生产量化一课](../../../phases/17-infrastructure-and-production/09-production-quantization/docs/en.md)讲了 4-bit 基座怎样搭配 adapter。
