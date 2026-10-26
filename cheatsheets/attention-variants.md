---
id: attention-variants
title: 注意力变体对比
code: AV
subtitle: 全量、滑动窗口、跨步、BigBird、差分与原生稀疏注意力：成本、KV 缓存、代码和修正。
hue: 265
sources: phases/07-transformers-deep-dive/12-kv-cache-flash-attention, phases/07-transformers-deep-dive/15-attention-variants, phases/10-llms-from-scratch/16-differential-attention-v2, phases/10-llms-from-scratch/17-native-sparse-attention
source_hash: 05ce22c9c2d6662b
---

## 变体对比
type: comparison
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md

| 变体 | 计算量 | KV 缓存 | 相对全量注意力的质量 |
|---|---|---|---|
| 全量注意力 | `O(N^2)` | 每层 `O(N)` | 基线 |
| SWA，窗口 1024 | N 乘 W | 每层 `O(W)` | -0.1 ppl，配合全局层效果好 |
| 局部 + 跨步稀疏 | N 乘 sqrt N | 混合 | 类似 SWA |
| BigBird，局部 + 全局 + 随机 | 约 `O(N)` | 混合 | 2× 上下文时追平全量 |
| Native Sparse（DeepSeek-V3.2） | N 乘活跃比例 | `O(N)` | 相差不超过 0.05 ppl |
| 差分注意力 | 2 乘 N 的平方 | `O(2N)` | ppl 降低 5 至 10% |

## 如何选择
type: tips
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md, phases/10-llms-from-scratch/16-differential-attention-v2/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md

- **全量注意力**：每层处理不超过约 16K 的上下文，或检索质量最重要时。
- **SWA + 全局混合**：超过 32K 的长上下文，是 2026 年该范围的默认方案。
- **稀疏块注意力**：自定义内核、自定义模式，适合检索与音频。
- **差分注意力**：注意力汇聚有害时，如长上下文 RAG 与大海捞针。
- **从头使用 DIFF**：目标有效上下文超过 64k 的新模型。
- **NSA**：目标上下文超过 64k 的预训练或继续训练。
- **不用 DIFF 或 NSA**：已预训练的稠密模型，或上下文少于 16k。

## 掩码构建器
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/15-attention-variants/code/main.py, phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md

```python
def swa_mask(n, window):
    M = [[NEG_INF] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)  # window >= n 时为完整因果注意力
        for j in range(lo, i + 1):
            M[i][j] = 0.0  # 0.0 表示关注，NEG_INF 表示屏蔽
    return M

def strided_mask(n, window, stride):  # 局部窗口，然后：
        for j in range(0, i + 1, stride):
            M[i][j] = 0.0  # 从当前位置按 stride 间隔回溯到 0

render(swa_mask(8, window=4), "sliding window (W=4)")
render(strided_mask(8, window=2, stride=3), "local (W=2) + strided (stride=3)")
```

## 使用 FlexAttention 实现 SWA
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md

```python
from torch.nn.attention.flex_attention import flex_attention, create_block_mask

def swa_pattern(b, h, q_idx, kv_idx):
    return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)  # 窗口 1024，因果约束

mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)  # 编译为 Triton 内核
```

## NSA：三个分支
type: architecture
from: phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/code/main.py

```arch
node | q | 1,2 | 查询 | 每个位置一个 | client
node | cmp | 2,1 | 压缩分支 | 块均值，N/l 个键 | process
node | sel | 2,2 | 选择分支 | top-k 块，k*l 个键 | process
node | win | 2,3 | 滑动窗口 | 最近 W 个 token | process
node | kv | 3,2 | KV 缓存 | 细粒度 token | store
node | gate | 4,2 | 门控 | sigmoid，3 个权重 | model
edge | q | cmp | 注意力
edge | cmp | sel | top_k_blocks
edge | q | win | 注意力
edge | kv | sel | 加载块
edge | sel | gate | out_sel
edge | cmp | gate | out_cmp
edge | win | gate | out_win
```

## Flash Attention 分块循环
type: flow
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py

1. **外循环**：将一个约 128 × 128 的 Q 块加载到 SRAM。
2. **内循环**：将每个 K 块与 V 块加载到 SRAM。
3. **SRAM**：计算 `S_tile = Q_tile @ K_tile^T`。
4. **SRAM**：跨块维护滚动的 `(max, sum)`。
5. **SRAM**：将旧输出乘以 `exp_old` 重新缩放，再加上新块。
6. **HBM**：将 `O_tile` 写回 HBM，每块访问一次 HBM。
7. **结果**：与标准注意力逐位相同，内存为 O(N)，而非 O(N^2)。

## 代码任务
type: task-table
from: phases/07-transformers-deep-dive/15-attention-variants/code/main.py, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code/main.py, phases/10-llms-from-scratch/16-differential-attention-v2/code/main.py, phases/10-llms-from-scratch/17-native-sparse-attention/code/main.py

| 任务 | 代码 |
|---|---|
| SWA 因果掩码 | `swa_mask(n, window)` |
| 局部加跨步掩码 | `strided_mask(n, window, stride)` |
| 统计可关注单元格 | `count_nonmasked(M)` |
| KV 缓存字节数 | `kv_cache_bytes(N, n_layers, n_heads_kv, d_head, dtype=2)` |
| Flash 风格 softmax | `tiled_softmax_dot(q, Ks, Vs, tile=4)` |
| 一行的信噪比 | `snr(weights_row, signal_pos)` |
| DIFF V1 与 V2 参数量 | `compute_param_diff(hidden=4096, n_heads=32, kv_heads=8)` |
| NSA 每个查询的键数 | `count_nsa(N, l, k, W)` |

## 关键数字
type: defaults
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md, phases/07-transformers-deep-dive/15-attention-variants/code/main.py, phases/10-llms-from-scratch/16-differential-attention-v2/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Llama 3 70B 每个 token 每层的 KV | 4096 字节 | 80 层，8 个 KV 头，fp16 |
| Llama 3 70B 的 KV，32K 上下文 | 10 GiB | 8 个 KV 头的 GQA |
| Gemma 3 层混合 | SWA:全局为 5:1 | window=1024 |
| 128K 上下文的 SWA KV 缩减倍数 | 128 倍 | 窗口 1024，最近 W 个 token |
| Gemma-3 混合 KV 缩减倍数 | ~6x | 相对纯全量注意力 |
| DIFF `lambda_init` | 0.8 | 每个头分别学习 |
| NSA 窗口 `W` | 512 | 64k 时 `l = 64, k = 16`，25x |
| 128k 时 NSA | 3536 个键 | 减少 36x |

## 常见问题排查
type: troubleshooting
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md, phases/10-llms-from-scratch/16-differential-attention-v2/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| SWA 模型长距离检索失败 | 没有全局层 | 按 5:1 交错插入全量层 |
| 权重流向 token 0 | softmax 引起注意力汇聚 | 使用差分注意力 |
| 超过 32k 后丢失中间信息 | softmax 噪声底随 N 增长 | 从头用 DIFF，或在 Q 上用 LoRA |
| DIFF V1 解码比基线慢 | 值缓存加载两次 | 使用 DIFF V2 |
| 70B 以上模型训练后期不稳 | V1 的逐头 RMSNorm | V2 将其移除 |
| 在已预训练稠密模型上用 NSA | 无法直接改装 | 继续训练 |
| 16k 以下 NSA 无收益 | 三分支开销 | 使用全量注意力 |
| 推理时稀疏化加速很小 | 模型未按该路由训练 | 原生稀疏训练 |

## 问答
type: qa
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md, phases/10-llms-from-scratch/16-differential-attention-v2/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md

- **Flash Attention 减少计算吗？** 不减少。它避免保存完整激活，每个 token 仍关注所有 token。
- **NSA 为何可训练？** 梯度经过压缩分支的分数传播，`top_k` 只选择要加载的块。
- **DIFF 为何在 128k 时更有效？** 噪声底随上下文增长，4k 时很小。
- **DIFF V2 兼容 GQA 吗？** 兼容。V2 增加 Q 头，不增加 KV 头。
- **1024 个 token，l 32、k 4、w 128 时 NSA 有多少键？** 32 + 128 + 128 = 288 个键，减少 3.5x。

## 术语表
type: glossary
span: 2
from: phases/07-transformers-deep-dive/15-attention-variants/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/10-llms-from-scratch/17-native-sparse-attention/docs/zh.md

- **SWA**：滑动窗口注意力，每个查询关注最近 W 个 token。
- **感受野**：L 层、窗口 W 的 SWA 栈最多看到 L × W 个 token。
- **注意力汇聚**：每行之和为 1，无信息的查询会把权重放在位置 0。
- **NSA**：原生稀疏注意力，学习块稀疏性，内核跳过零块。
- **DSA**：Deepseek Sparse Attention，是 NSA 的后继。
- **HBM**：高带宽内存，H100 约为 3 TB/s。
- **SRAM**：每个 SM 的片上内存，约为 30 TB/s。
