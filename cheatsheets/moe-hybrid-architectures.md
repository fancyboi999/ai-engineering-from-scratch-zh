---
id: moe-hybrid-architectures
title: 混合专家与混合架构
code: MH
subtitle: 路由器、专家、无辅助损失均衡、MLA、DeepSeek-V3 参数量和 Jamba SSM 混合架构。含公式与标准库计算器。
hue: 168
sources: phases/07-transformers-deep-dive/11-mixture-of-experts, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer
source_hash: 18fd285a4fcbf3d4
---

## 一个 MoE 层
type: architecture
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

```arch
node | tok | 1,1 | token 隐状态 | 注意力与归一化之后 | client
node | router | 2,1 | 路由器 | 单个线性层，分数 (N_tokens, E) | process
node | bias | 3,1 | 分数 + 偏置 | 仅用于选择 | store
node | topk | 4,1 | Top-k 选择 | 每个 token 从 E 中选 k 个 | process
node | shared | 1,2 | 共享专家 | 每个 token 均使用 | model
node | e1 | 2,2 | 路由专家 | SwiGLU FFN | model
node | e2 | 3,2 | 路由专家 | SwiGLU FFN | model
node | sum | 4,2 | 加权求和 | 门控来自原始分数 | process
edge | tok | router |
edge | router | bias |
edge | bias | topk |
edge | topk | e1 |
edge | topk | e2 |
edge | e1 | sum |
edge | e2 | sum |
edge | shared | sum |
```

## 无辅助损失的均衡循环
type: flow
from: phases/07-transformers-deep-dive/11-mixture-of-experts/code/main.py, phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md

1. **初始化**：`bias = [0.0] * n_experts`，目标使用量为 `n_tokens * top_k / n_experts`。
2. **路由**：按 `scores + bias` 选择前 k 个。
3. **门控**：对选中专家的原始分数做 softmax。
4. **计数**：`run_epoch` 统计各专家被激活的次数。
5. **更新**：超过目标时 `bias[e] -= gamma`，低于目标时 `bias[e] += gamma`。
6. **重复**：演示使用 `gamma=0.15`，运行 10 次迭代。
7. **检查**：熵上升趋近均匀分布的最大值 `ln(n_experts)`。

## 路由器代码
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/11-mixture-of-experts/code/main.py

```python
def route(hidden, W_router, top_k, bias):
    E = len(W_router)
    scores = [sum(h * w for h, w in zip(hidden, W_router[e])) for e in range(E)]
    biased = [s + b for s, b in zip(scores, bias)]   # 偏置改变选择
    top_idx = sorted(range(E), key=lambda i: -biased[i])[:top_k]
    chosen = [scores[i] for i in top_idx]   # 使用原始分数，不加偏置
    m = max(chosen)
    exps = [math.exp(c - m) for c in chosen]
    s = sum(exps)
    gates = [e / s for e in exps]   # softmax 门控之和为 1
    return top_idx, gates
```

## 课程中的计算器
type: task-table
from: phases/07-transformers-deep-dive/11-mixture-of-experts/code/main.py, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/code/main.py, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/code/main.py, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/code/main.py

| 任务 | 代码 |
|---|---|
| DeepSeek-V3 报告 | `print_report(name, cfg, ctx=131_072)` |
| 专家均衡 | `update_bias(bias, usage, target, gamma=0.15)` |
| 路由均衡评分 | `entropy(counts)` |
| 统计任意 config.json | `analyze(name, config)` |
| 识别注意力方案 | `attention_scheme(config)` |
| DeepSeek-V3 总量 | `compute_totals(cfg, ctx=None)` |
| 混合 SSM 状态 | `ssm_state_bytes(cfg, bytes_per_elem)` |
| 混合 KV 缓存 | `kv_cache_bytes(cfg, ctx, bytes_per_elem)` |

## 公式
type: concepts
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md

- **MoE 参数**：总量为 $E \times$ FFN 大小，每个 token 的活跃量为 $k \times$ FFN 大小。
- **稀疏度**：活跃量除以总量，DeepSeek-V3 为 37/671 ≈ 5.5%。
- **细粒度**：每个 token 有 $\binom{256}{8} \approx 400$ 万亿种专家组合。
- **KV 缓存**：`2 * num_layers * num_kv_heads * head_dim * max_seq_len * bytes_per_element`
- **MLA 缓存**：`num_layers * kv_lora_rank * max_seq_len * bytes_per_element`
- **SSM**：$h_t = A h_{t-1} + B x_t$，$y_t = C h_t$。每个 token 的内存恒定。
- **SwiGLU 宽度**：`ff_dim = (2/3) * 4 * hidden = 8/3 * hidden`
- **Jamba 混合**：`l = 8` 表示每 7 层 Mamba 配 1 层注意力，`e = 2` 表示隔层使用 MoE。

## DeepSeek-V3 配置
type: annotated-code
lang: text
from: phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md

```text
hidden_size: 7168              # 嵌入维度
intermediate_size: 18432       # 前 3 层的稠密 MLP
moe_intermediate_size: 2048    # 每个专家的 MLP
num_hidden_layers: 61          # 3 层稠密 + 58 层 MoE
first_k_dense_layers: 3        # 用稠密 MLP 提高稳定性
num_attention_heads: 128       # 查询头
kv_lora_rank: 512              # 每个 token 每层的 MLA 潜向量
num_experts: 256               # 每个块的路由专家数
num_experts_per_tok: 8         # top-8 路由
shared_experts: 1              # 始终启用的稠密基础
mtp_module: 1                  # 预测 t+2，14B 参数
```

## 模型对比
type: comparison
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md

| 因素 | Llama 3 70B | Mixtral 8x7B | DeepSeek V3 | Jamba |
|---|---|---|---|---|
| 家族 | 稠密 transformer | MoE transformer | MoE transformer | Mamba + 注意力 + MoE |
| 总参数 / 活跃参数 | 70B / 70B | 47B / 13B | 671B / 37B | 52B / 12B |
| 专家 | 无 | 8 个专家，top-2 | 256 + 1 个共享专家，top-8 | 隔层使用 MoE |
| 注意力 | GQA (64/8) | GQA | MLA | 每 7 层 Mamba 配 1 层 |
| 上下文 | 128k | 32k | 128k | 单个 80GB GPU 上 256k |

## 内存数字
type: concepts
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md

- **Llama 3 8B，128k**：KV 缓存 17.2 GB，BF16 权重为 16 GB。
- **DeepSeek-V3，128k**：MLA 缓存 7.6 GB，GQA 基线需要 30.5 GB。
- **32 层，256k**：完整 MHA 为 128 GB；Jamba 1:7 只缓存 4 层注意力，为 16 GB。
- **Jamba SSM 状态**：总计 3.7 MB，不随序列长度增长。
- **671B，fp16**：约需 1.3 TB 显存，全部专家留在 GPU 上。
- **MTP 模块**：在 671B 之外增加 14B，开销 2.1%。

## 计算器默认值
type: defaults
from: phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/code/main.py, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `kv_lora_rank` | 512 | 配置省略时采用的 MLA 潜向量维度 |
| `activation` | gelu | `swiglu` 和 `geglu` 增加门控矩阵 |
| `norms_per_layer` | 2 | 每个 RMSNorm 为 `h`，LayerNorm 为 `2 * h` |
| `head_dim` | hidden_size / num_attention_heads | Gemma 2 9B 设置为 256 |
| `layer_types` | full_attention | 每层缓存完整上下文 |
| `rope_theta` | 10k | Llama 3 扩大至 500k |

## 常见问题排查
type: troubleshooting
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 90% 的 token 都去一个专家 | 路由器不均衡 | 逐专家偏置，在损失之外更新 |
| 负载高时质量下降 | 容量溢出丢弃 token | 使用偏置均衡，不丢弃 token |
| 主任务损失变差 | 辅助负载均衡损失 | 使用无辅助损失方案 |
| 偏置影响预测 | 门控使用了偏置分数 | 用原始 `scores` 做门控 |
| 多 GPU 延迟高 | 专家全互联通信 | 延迟敏感服务避免 MoE |
| KV 缓存比权重还大 | 长上下文完整 MHA | 使用 GQA 或 MLA |
| 混合架构上下文检索失败 | 注意力太少，比例为 1:15 | 使用 1:7 或 1:8 |
| 参数统计少了 525M | 未统计独立 LM 输出头 | 读取 `tie_word_embeddings` |

## 各设计适用场景
type: tips
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

- 需要较低单 token 推理成本的前沿质量时使用 MoE。
- 具备足够显存和专家并行基础设施时使用 MoE。
- 边缘端、延迟敏感的单用户服务或低于 7B 的模型不用 MoE。
- 64k+ 上下文或单 GPU 内存预算有限时使用混合架构。
- 少于 16k 上下文或需要全位置相互关注时，不使用混合架构。
- 参数量超过约 13B 时使用 GQA 或 MLA。
- 阅读滑动窗口配置时，先看全量层与滑动层的比例。

## 缩写
type: glossary
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md

- **MoE**：混合专家，每块有 N 个 MLP，路由器为每个 token 选择 top-k。
- **GQA**：分组查询注意力，每组 Q 头共享一个 K 和一个 V，共 G 组。
- **MQA**：多查询注意力，全部头共享一个 K 和一个 V。
- **MLA**：多头潜在注意力，K 和 V 使用共享低秩潜向量。
- **MTP**：多 token 预测，预测 $t+2$，提供免费的推测草稿。
- **SSM**：状态空间模型，使用固定大小状态的递推。
- **MIMO**：多输入多输出，Mamba-3 的矩阵值投影。

## 问答
type: qa
from: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/zh.md, phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/zh.md, phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/zh.md

- **偏置为何只影响选择？** 它纠正负载，而不影响预测。
- **共享专家做什么？** 捕获共同知识，路由专家负责专门知识。
- **V3 前 3 层为何稠密？** 早期层跳过路由器以保持稳定。
- **Jamba 为何用 1:7？** 注意力负责精确召回，Mamba 低成本处理其余部分。
- **万亿规模下什么占优？** DeepSeek-V3 风格的纯 transformer + MLA + MoE。
