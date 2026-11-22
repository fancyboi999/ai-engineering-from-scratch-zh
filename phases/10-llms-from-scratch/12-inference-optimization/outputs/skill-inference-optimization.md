---
name: skill-inference-optimization
description: 诊断并优化 LLM 推理服务的吞吐、延迟和成本
version: 1.0.0
phase: 10
lesson: 12
tags: [inference, kv-cache, batching, speculative-decoding, vllm, optimization]
---

# LLM 推理优化模式

推理分两个阶段：prefill（受计算限制，可并行）和 decode（受内存限制，串行）。
每种优化都针对其中一个或两个阶段。

```
Request -> Prefill (process prompt) -> Decode (generate tokens) -> Response
              |                            |
         Compute-bound               Memory-bound
         Optimize: fusion,           Optimize: batching,
         prefix caching              quantization, speculation
```

## 决策框架

### 第 1 步：找出瓶颈

测量你的负载的 ops:byte 比：

| ops:byte | 瓶颈类型 | 优化方向 |
|----------|-------|-----------------|
| < 50 | 内存 | 量化 KV cache，增大 batch |
| 50-200 | 过渡区 | 两者都重要，先从 batching 入手 |
| > 200 | 计算 | kernel 融合、张量并行、FP8 |

### 第 2 步：选择推理引擎

- **默认**：vLLM（模型支持最广，有 PagedAttention 和兼容 OpenAI 的 API）
- **多轮对话 / 结构化输出**：SGLang（RadixAttention 前缀缓存、约束解码）
- **NVIDIA 上的最大吞吐**：TensorRT-LLM（kernel 融合，H100 上的 FP8）

### 第 3 步：按顺序应用优化

1. **KV cache**：始终开启，没有副作用
2. **连续批处理**：始终开启，没有副作用（vLLM/SGLang 默认开启）
3. **前缀缓存**：有共享 system prompt 时开启（大多数聊天机器人都有）
4. **量化**：KV cache 用 INT8/FP8 可减少 2-4 倍内存，质量损失极小
5. **投机解码**：延迟比吞吐更重要时加上
6. **张量并行**：模型放不进一张 GPU 时拆到多张 GPU 上

## KV cache 内存公式

```
per_token = 2 * num_layers * num_kv_heads * head_dim * bytes_per_param
total = per_token * sequence_length * num_concurrent_users
```

常见模型速查（BF16）：

| 模型 | 每 token | 100 用户 @ 4K |
|-------|-----------|----------------|
| Llama 3 8B | 32 KB | 12.5 GB |
| Llama 3 70B | 320 KB | 125 GB |
| Llama 3 405B | 504 KB | 197 GB |

## 投机解码检查清单

- 草稿模型应比目标模型小 5-10 倍（例如用 8B 给 70B 打草稿）
- 接受率 > 70% 才有明显提速
- 最适合可预测的文本（代码、结构化输出、自然语言）
- 最不适合创意类、重度依赖采样的任务（降低 temperature 有帮助）
- 对大多数负载：EAGLE > 草稿-目标模式 > n-gram

## 常见错误

- 以 batch=1 运行 decode（受内存限制，GPU 计算单元 95% 闲置）
- 分配连续的 KV cache 块（改用 PagedAttention，浪费接近零）
- 80% 的请求共用同一个 system prompt，却没开前缀缓存
- 给模型权重预留过多显存，KV cache 没地方放
- 只测吞吐不测延迟（TTFT 10 秒时吞吐再高也没用）
- 在高 temperature 下用投机解码（接受率跌到 50% 以下）

## 监控检查清单

- 首 token 时间（TTFT）：prefill 延迟，交互场景目标 < 500ms
- token 间延迟（ITL）：decode 速度，流式输出目标 < 50ms
- 吞吐（token/秒）：所有并发用户的总和
- KV cache 利用率：已分配缓存中正在使用的比例
- Batch 利用率：每轮迭代中 batch 槽位被填满的比例
- 队列深度：等待 batch 槽位的请求数
