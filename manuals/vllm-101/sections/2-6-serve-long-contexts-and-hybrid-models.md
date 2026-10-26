# 服务长上下文和混合模型

> 长上下文和混合模型都会改变 vLLM 计算内存的方式；启动错误可能隐藏它们失败的原因。

你可能需要超过默认长度的上下文，也可能要服务一个混合模型，其中包含普通 attention 层、滑动窗口层或状态空间层。读完本节，你可以有意设置最大上下文长度，并理解每种层如何使用缓存。

本手册没有运行长上下文或混合模型。本节内容来自 vLLM 文档、0.31.0 源码和发布说明。

## 有意设置最大上下文长度 {#s-serve-long-contexts-and-hybrid-models-set-the-maximum-length-on-purpose}

如果没有设置 `--max-model-len`，vLLM 会采用模型配置中的长度。`Qwen/Qwen3-8B` 的长度是 40,960 token。每个 token 占 144 KiB 时，一个该长度的请求需要 5.6 GiB KV cache。在 24 GB GPU 上，权重会占用 16.4 GB，剩余空间可能连一个这样的请求都无法容纳，导致启动失败。

将 `--max-model-len` 设为用户会发送的最长提示词与回答之和。缓存池大小不会改变。降低上限只会防止一个请求占用整个缓存池，也能让启动检查通过。

## 升级后检查长度 {#s-serve-long-contexts-and-hybrid-models-check-the-length-after-an-upgrade}

一些模型通过 YaRN 等扩展方法增加上下文长度。0.30.0 版本调整了 vLLM 的 YaRN 处理方式，以匹配 Hugging Face Transformers 库。部分模型从配置中推导出的长度因此变短。发布说明给出的一个例子，从 131,072 token 降到了 32,768 token。

升级后查看启动日志中的推导长度。如果数值变化了，手动设置 `--max-model-len`，或确认模型仍支持更长的上下文。

## 了解混合模型如何使用缓存 {#s-serve-long-contexts-and-hybrid-models-know-how-a-hybrid-model-uses-the-cache}

混合模型包含不止一种层。vLLM 会把每种层分别放入一个 KV cache group。下表列出了每种 group 的规则。

| 层类型 | 缓存内容 | 前缀缓存何时命中 |
|---|---|---|
| Full attention | 每个 token 的 key 和 value | 前缀中的每个 block 都仍在缓存中 |
| Sliding window | 最近一个窗口的 key 和 value | 最近窗口中的 block 仍在缓存中 |
| 状态空间，例如 Mamba | 每个请求对应一个状态，而不是每个 token 一个条目 | 提示词中该位置必须有保存的状态；状态保存规则在不同版本间有变化 |

分组设计让同一个缓存池能够服务所有类型。它也意味着：对相同提示词而言，混合模型的前缀缓存命中率会不同于 full-attention 模型。

## 避免使用已移除或改名的参数 {#s-serve-long-contexts-and-hybrid-models-avoid-the-removed-and-renamed-flags}

混合模型的支持变化较快。0.29 到 0.32 之间有三项变化需要注意：

- Mamba cache 的 `all` 模式在 0.30 中弃用，并会让 vLLM 使用较旧的 model runner。0.32 已移除该模式。
- 0.31 将 `--enable-mamba-fine-grained-prefix-cache` 改名为 `--enable-mamba-shared-prefix-checkpoint`。
- 移除 `all` 模式后，有一个开放的 issue 报告 `--mamba-block-size` 没有作用。

升级后混合模型启动变慢或内存占用增加时，先检查这些参数。`--disable-hybrid-kv-cache-manager` 可以关闭分组，以验证问题是否由分组导致。

## 检查设置 {#s-serve-long-contexts-and-hybrid-models-check-the-setup}

启动服务并查看缓存池日志行。它会根据最大上下文长度给出最大并发量：

```bash
grep "GPU KV cache size" server.log
```

只有启动成功时才会输出缓存池日志行。如果启动因 KV cache 和最大长度报错而停止，就降低 `--max-model-len`，直到出现这行日志。然后查看并发量，并与计划服务的满长度用户数比较。

```takeaways
- 将最大模型长度设为请求的最长长度，不要直接采用模型上限。
- 每次升级后都检查推导出的上下文长度。
- 混合模型的前缀缓存命中率可能不同，应使用自己的提示词测试。
```

来源：vLLM 0.31.0 文档（docs/design/hybrid_kv_cache_manager.md、docs/configuration/optimization.md），vLLM 0.31.0 源码（vllm/config/scheduler.py、vllm/config/cache.py），v0.30.0、v0.31.0 和 v0.32.0 发布说明，vLLM issue 60838，Qwen/Qwen3-8B 模型配置。
