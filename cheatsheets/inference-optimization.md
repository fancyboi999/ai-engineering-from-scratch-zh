---
id: inference-optimization
title: 推理优化：KV 缓存、量化与批处理
code: IO
subtitle: KV 缓存、量化、批处理与推测解码。汇总公式、调度器参数和导致延迟的常见错误。
hue: 200
sources: phases/07-transformers-deep-dive/12-kv-cache-flash-attention, phases/10-llms-from-scratch/11-quantization, phases/10-llms-from-scratch/12-inference-optimization, phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding, phases/17-infrastructure-and-production/08-inference-metrics-goodput, phases/17-infrastructure-and-production/09-production-quantization
source_hash: d39edde0c1537917
---

## 推理流水线
type: architecture
from: phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py

```arch
node | req | 1,1 | 请求 | 排队与到达 | client
node | pc | 1,2 | PrefixCache | 共享 prompt 前缀树 | store
node | admit | 2,1 | 准入 | 空闲 KV 块 | process
node | kv | 2,2 | KVCache | 每个 token 的 K 与 V | store
node | pre | 3,1 | 预填充 | 分块 prompt | gpu
node | dec | 3,2 | 解码 | 每步一个 token | gpu
edge | req | admit | 到达
edge | pc | pre | 复用前缀
edge | admit | pre | 分配空闲块
edge | pre | dec | prompt 处理完毕
edge | dec | kv | 追加
edge | kv | dec | 读取
```

## 一步解码
type: flow
from: phases/10-llms-from-scratch/12-inference-optimization/code/main.py

1. **写入**：`kv_cache.update` 为各层保存新的 K 与 V。
2. **读取**：缓存返回当前长度以内的切片。
3. **注意力计算**：`scaled_dot_product_attention` 作用于缓存的前缀。
4. **推进**：每解码一个 token，用 `kv_cache.advance(1)` 增加长度。

## softmax 核心更新
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py

```python
new_m = max(m, *scores)                      # 当前最大值
if m == float("-inf"):
    exp_old = 0.0
else:
    exp_old = math.exp(m - new_m)            # 重新缩放已有累积值
exp_new = [math.exp(sc - new_m) for sc in scores]
s = s * exp_old + sum(exp_new)               # 当前累积和
```

## 任务速查
type: task-table
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py, phases/10-llms-from-scratch/12-inference-optimization/code/main.py

| 任务 | 代码 |
|---|---|
| 计算 KV 缓存字节数 | `kv_cache_bytes(N, n_layers, n_heads_kv, d_head, dtype=2)` |
| 分块计算注意力输出 | `tiled_softmax_dot(q, Ks, Vs, tile=4)` |
| 模拟批处理 | `simulate_continuous_batching(requests, batch_size)` |
| 缓存共享前缀 | `PrefixCache(max_entries=1000)` |
| 推测后续 token | `speculative_decode(draft_model, target_model, context, num_speculative=5)` |
| 检查内存是否足够 | `memory_budget(config, gpu_memory_gb)` |

## 默认值
type: defaults
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py, phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `dtype` in `kv_cache_bytes` | 2 | 每个值的字节数，fp16 或 bf16 |
| `tile` in `tiled_softmax_dot` | 4 | 每个块的 key 数 |
| `max_entries` in `PrefixCache` | 1000 | 前缀树节点上限 |
| `num_speculative` | 5 | 每轮草稿 token 数 |
| `acceptance_rate` in `DraftModel` | 0.8 | 模拟接受率 |
| `CHUNK_SIZE` | 512 | 每个预填充分块的 token 数 |
| `KV_BLOCK_SIZE` | 16 | 每个 KV 块的 token 数 |
| `KV_BLOCKS_AVAILABLE` | 1800 | 教学模型的块预算 |

## 公式
type: concepts
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py, phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/10-llms-from-scratch/11-quantization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py

- **KV 缓存字节数**：`2 * N * n_layers * n_heads_kv * d_head * dtype`。
- **每个 token 的 KV**：两个张量乘以层数、KV 头数、头维度和元素字节数。
- **动态最大值 softmax**：输出与完整 softmax 一致，内存中只保留一个块。
- **块数**：总 token 数除以块大小，向上取整。
- **量化比例**：绝对值最大值除以整数范围上限。

## 故障排查
type: troubleshooting
from: phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 前缀查询返回 0 | 开头 token 不同，前缀树匹配终止 | 从第一个 token 起保持共享 prompt 一致 |
| 前缀树停止插入 | 达到 `max_entries` 上限 | 提高 `max_entries` |
| 批次槽位空闲 | 静态批次等待最长输出完成 | 使用连续批处理 |
| 长 prompt 阻塞解码 | 预填充没有分块 | 启用 `chunked`，按 `CHUNK_SIZE` 执行预填充 |
| 推测解码反而更慢 | 接受率低 | 启用前先测量接受率 |
| 模型无法放入显存 | 权重超过 GPU 显存容量 | 量化模型或增加 GPU |

## 术语
type: glossary
from: phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py

- **KV 缓存**：保存过去 token 的 key 与 value，避免重复计算。
- **预填充**：生成首个输出 token 前，处理完整 prompt。
- **解码**：每步生成一个输出 token。
- **TTFT**：首 token 延迟，在预填充结束时确定。
- **ITL**：相邻输出 token 之间的延迟。

## 问答
type: qa
from: phases/10-llms-from-scratch/12-inference-optimization/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py, phases/17-infrastructure-and-production/08-inference-metrics-goodput/code/main.py

- **为什么保存 K 与 V？** 每步解码直接读取缓存，不必重新计算前缀。
- **静态批处理为什么浪费资源？** 每一行都要等待最长输出。
- **为什么分块预填充？** 长 prompt 会阻塞其他请求的解码。
- **为什么不同基准工具的 TPOT 不同？** 一种将 TTFT 计入速率，另一种不计入。

## 提示
type: tips
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput/code/main.py, phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py, phases/10-llms-from-scratch/12-inference-optimization/code/main.py

- 报告 P99 延迟，并逐个请求检查是否满足三项限制。
- 根据调度器常量确定分块大小与块数。
- 不同请求的共享 prompt 前缀保持一致。
- 提高批大小前，先核对 KV 内存预算。
