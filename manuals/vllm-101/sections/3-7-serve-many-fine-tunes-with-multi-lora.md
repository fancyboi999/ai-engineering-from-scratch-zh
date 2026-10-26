# 用 multi-LoRA 服务多个微调模型

> 一个基础模型可以服务多个 LoRA adapter；adapter 的数量和 rank 决定资源开销。

你有一个基础模型的多个微调版本。读完本节，你可以通过一个基础模型，按请求服务不同的 LoRA adapter。

## 启动 LoRA {#s-serve-many-fine-tunes-with-multi-lora-start-the-server-with-lora-on}

LoRA adapter 是叠加在基础模型上的一小组额外权重。服务器只保留一份基础模型权重，并针对每个请求应用指定的 adapter。不同 adapter 的请求可以放在同一个 batch 中运行。

```bash
vllm serve Qwen/Qwen3-8B \
  --enable-lora \
  --lora-modules support=/adapters/support legal=/adapters/legal \
  --max-loras 4 --max-lora-rank 64
```

每个路径都指向 PEFT 格式的目录，大多数训练库都会写出这种格式。目录中包含 `adapter_config.json` 和 `adapter_model.safetensors` 权重文件。vLLM 也支持读取 `adapter_model.bin`。路径还可以是 Hugging Face 仓库名称。

请求使用 `model` 字段中的名称选择 adapter：

```bash
curl http://localhost:8000/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"model": "support", "messages": [{"role": "user", "content": "Reset my password"}]}'
```

`/v1/models` 会列出基础模型和各个 adapter。

2026-10-23，我们在 L4 节点的第二块共享 GPU 上运行了这项配置。使用的是 `Qwen/Qwen3-0.6B` 和两个公开 adapter，rank 分别为 8 和 64。`/v1/models` 列出了基础模型、`support` 和 `legal`，向每个 adapter 发送 chat 请求都返回 HTTP 200。

## 设置三个上限 {#s-serve-many-fine-tunes-with-multi-lora-size-the-three-limits}

| 参数 | 默认值 | 限制内容 |
|---|---|---|
| `--max-loras` | 1 | 同一个 batch 中可在 GPU 上运行的 adapter 数 |
| `--max-lora-rank` | 16 | 服务器接受的最大 adapter rank |
| `--max-cpu-loras` | 未设置 | 保留在 CPU 内存中、可随时加载的 adapter 数 |

对于运行多个 adapter 的服务器，默认每个 batch 只允许一个 adapter，通常太低。第二个 adapter 的请求必须等第一个 adapter 的 batch 结束。将 `--max-loras` 提高到同时处于繁忙状态的 adapter 数量。

`--max-lora-rank` 应设置为 adapter 的最大 rank，不要更高。vLLM 文档建议避免设置成 256 之类的大默认值，因为服务器会为最大 rank 预留内存。

## 在服务器运行时加载 adapter {#s-serve-many-fine-tunes-with-multi-lora-load-adapters-while-the-server-runs}

要在不重启的情况下新增 adapter，启动时设置 `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`。然后向 `/v1/load_lora_adapter` 发送 adapter 名称和路径；卸载时请求 `/v1/unload_lora_adapter`。只有在信任服务器的所有调用方时才启用此功能，因为该路由会从调用方提供的路径加载文件。

## 了解 LoRA 对其他功能的影响 {#s-serve-many-fine-tunes-with-multi-lora-know-what-lora-changes-elsewhere}

- **前缀缓存。** Adapter 是每个缓存 block key 的一部分。即使提示词相同，不同 adapter 之间也不会共享缓存 block。
- **CUDA graph。** vLLM 会为带 adapter 的 batch 单独捕获 graph。Adapter 越多，graph 尺寸越多，启动时间和内存占用也会增加。
- **名称。** 从 0.31 开始，adapter 不能与已提供服务的模型同名。

我们没有在自己的硬件上测量，也没有测试 L4 或 GB10 上 adapter 数量和 rank 对性能的影响。

```takeaways
- 一个基础模型可以服务多个 adapter，请求使用名称选择 adapter。
- 将 --max-loras 设为繁忙 adapter 的数量，并将 rank 上限设为最大 rank。
- 不同 adapter 不会共享前缀缓存 block。
```

来源：vLLM 0.31.0 源码（vllm/config/lora.py、vllm/lora/lora_model.py、vllm/lora/peft_helper.py、vllm/lora/utils.py、vllm/v1/core/kv_cache_utils.py），vLLM 0.31.0 文档（docs/features/lora.md），v0.31.0 发布说明，capture/gpu/out-l4/livecheck-2026-10-23.txt。
