---
id: transformers-attention
title: Transformer 与注意力
subtitle: 计算注意力、应用掩码、拆分多头、加入位置并堆叠区块。使用课程中的 PyTorch 与 NumPy 实现。
hue: 12
sources: phases/07-transformers-deep-dive/02-self-attention-from-scratch, phases/07-transformers-deep-dive/03-multi-head-attention, phases/07-transformers-deep-dive/04-positional-encoding, phases/07-transformers-deep-dive/05-full-transformer, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling, phases/07-transformers-deep-dive/12-kv-cache-flash-attention, phases/07-transformers-deep-dive/13-scaling-laws, phases/07-transformers-deep-dive/14-build-a-transformer-capstone, phases/05-nlp-foundations-to-advanced/10-attention-mechanism, phases/19-capstone-projects/32-token-positional-embeddings, phases/19-capstone-projects/33-multihead-self-attention, phases/19-capstone-projects/34-transformer-block, phases/19-capstone-projects/35-gpt-model-assembly, phases/10-llms-from-scratch/04-pre-training-mini-gpt
code: TA
source_hash: af7d13dd45302b44
---

## 一个 pre-LN 解码器区块
type: architecture
from: phases/19-capstone-projects/34-transformer-block/docs/zh.md, phases/19-capstone-projects/34-transformer-block/code/main.py, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md

```arch
node | in | 1,1 | 输入嵌入 | token 加位置，B, T, D
node | ln1 | 2,1 | LayerNorm 1 |
node | mha | 2,2 | 多头因果注意力 | Q、K、V 与掩码
node | r1 | 1,2 | 加残差 | x + attn(ln1(x))
node | ln2 | 1,3 | LayerNorm 2 |
node | mlp | 2,3 | 逐位置 MLP | D 到 4D 再到 D
node | r2 | 2,4 | 加残差 | x + mlp(ln2(x))
node | out | 1,4 | 最终 LayerNorm、LM 头 | logits B, T, 50257
edge | in | ln1 |
edge | ln1 | mha |
edge | mha | r1 |
edge | r1 | ln2 |
edge | ln2 | mlp |
edge | mlp | r2 |
edge | r2 | out | x 12
```

## 注意力前向传播
type: flow
from: phases/19-capstone-projects/33-multihead-self-attention/docs/zh.md, phases/19-capstone-projects/33-multihead-self-attention/code/main.py

1. **qkv_proj**：一个线性层将 `(B, T, D)` 映射为 `(B, T, 3 * D)`。
2. **拆分**：分成 Q、K、V，再变形为 `(B, H, T, d_head)`。
3. **分数**：`q @ k.transpose(-2, -1)` 得到 `(B, H, T, T)`。
4. **缩放**：分数除以 `sqrt(d_head)`。
5. **掩码与 softmax**：未来位置设为 `-inf`，再沿键维度执行 softmax。
6. **加权求和**：`weights @ V`，再合并各头为 `(B, T, D)`。
7. **out_proj**：一个 `(D, D)` 线性层混合各头。

## 张量形状
type: command-table
from: phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md, phases/19-capstone-projects/33-multihead-self-attention/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/05-nlp-foundations-to-advanced/10-attention-mechanism/docs/zh.md

| 张量 | 形状 |
|---|---|
| Token 标识 | `(B, T)`，int64 |
| Token 嵌入矩阵 | `(V, D)` |
| 注意力输入 | `(B, T, D)` |
| QKV 投影输出 | `(B, T, 3 * D)` |
| 每头的 Q、K、V | `(B, H, T, d_head)`，`d_head = D // H` |
| 分数与权重 | `(B, H, T, T)` |
| Logits | GPT-2 small 为 `(B, T, 50257)` |
| 交叉注意力权重 | `(batch, T_dec, T_enc)` |

## 关键公式
type: concepts
from: phases/07-transformers-deep-dive/02-self-attention-from-scratch/docs/zh.md, phases/07-transformers-deep-dive/03-multi-head-attention/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

- **注意力**：$\text{Attention}(Q, K, V) = \mathop{\mathrm{softmax}}\left( \frac{Q K^T}{\sqrt{d_k}} \right) V$
- **头宽度**：$d_{\text{head}} = d_{\text{model}} / n_{\text{heads}}$
- **因果掩码**：$M_{ij} = \begin{cases} 0 & \text{if } j \le i \\ -\infty & \text{if } j > i \end{cases}$
- **正弦位置编码偶数维**：$PE_{(pos, 2i)} = \sin\left(pos / 10000^{2i / d_{\text{model}}}\right)$
- **正弦位置编码奇数维**：$PE_{(pos, 2i+1)} = \cos\left(pos / 10000^{2i / d_{\text{model}}}\right)$
- **RoPE 角度**：$\theta_i = \text{base}^{-2i / d_{\text{head}}}$，分数取决于 $(m - n)$。
- **ALiBi**: $\text{attn\_score}[i, j] = \frac{q_i \cdot k_j}{\sqrt{d}} - m_h \cdot |i - j|$
- **稳定 softmax**：$\mathop{\mathrm{softmax}}(x - c) = \mathop{\mathrm{softmax}}(x)$

## 代码任务
type: task-table
from: phases/19-capstone-projects/33-multihead-self-attention/code/main.py, phases/19-capstone-projects/32-token-positional-embeddings/code/main.py, phases/07-transformers-deep-dive/03-multi-head-attention/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/code/main.py

| 任务 | 代码 |
|---|---|
| 应用因果掩码 | `scores.masked_fill(mask_slice == 0, float("-inf"))` |
| 沿键维度做 softmax | `F.softmax(scores, dim=-1)` |
| 合并多头 | `x.transpose(1, 2).contiguous().view(b, t, h * dh)` |
| 加入位置信息 | `x = tok + pos.unsqueeze(0)` |
| 填充正弦位置表 | `pe[:, 0::2] = torch.sin(angle)` |
| 旋转 Q 与 K | `apply_rope(x, pos, base=10000)` |
| 支持 GQA 的融合内核 | `scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)` |
| 绑定 LM 头权重 | `self.lm_head.weight = self.tok_embed.weight` |

## MultiHeadSelfAttention 前向传播
type: annotated-code
lang: python
from: phases/19-capstone-projects/33-multihead-self-attention/code/main.py

```python
self.qkv_proj = nn.Linear(d_model, 3 * d_model, bias=True)  # 一次矩阵乘得到 Q、K、V
causal_mask = torch.tril(torch.ones(max_context_length, max_context_length))
self.register_buffer("causal_mask", causal_mask, persistent=False)  # 无梯度
qkv = self.qkv_proj(x)                          # (B, T, 3D)
q, k, v = qkv.chunk(3, dim=-1)                  # 三个 (B, T, D) 视图
q = self._split_heads(q)                        # (B, H, T, d_head)
k = self._split_heads(k)
v = self._split_heads(v)
scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.d_head)
mask_slice = self.causal_mask[:t, :t]           # 左上角 (T, T)
scores = scores.masked_fill(mask_slice == 0, float("-inf"))
weights = F.softmax(scores, dim=-1)             # 每行之和为 1
context = self._merge_heads(torch.matmul(weights, v))  # (B, T, D)
out = self.out_proj(context)                    # 混合各头
```

## 默认值与数值
type: defaults
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/34-transformer-block/code/main.py, phases/07-transformers-deep-dive/03-multi-head-attention/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/code/main.py, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 正弦与 RoPE 基数 | 10000 | 长上下文时提高 RoPE 基数 |
| mlp_expansion | 4 | MLP 从 D 到 4D 再到 D |
| d_head | 64 | 生产常用 64 或 128 |
| 初始化标准差 | 0.02 | Linear 与 Embedding 权重 |
| 残差投影缩放 | 1 / sqrt(2 * num_layers) | out_proj 与 fc2 |
| GPT-2 small d_model | 768 | 12 个头、12 层，约 124M |
| 每 token 每层的 KV 字节数 | `2 * d_head * dtype_size` | 每头，包含 K 与 V |
| 计算最优比例 | 20 | 每参数对应的 token 数 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/33-multihead-self-attention/code/main.py, phases/19-capstone-projects/33-multihead-self-attention/docs/zh.md, phases/19-capstone-projects/34-transformer-block/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md, phases/05-nlp-foundations-to-advanced/10-attention-mechanism/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| d_model 与 n_heads 触发 `ValueError` | D 不能被 H 整除 | 选择能整除 D 的 H |
| `seq_len` 超过 max_context_length | T 超过掩码大小 | 仅保留最后 context_length 个 token |
| 模型偷看下一个 token | 没有因果掩码 | 用 `-inf` 遮蔽上三角 |
| softmax 得到 `inf` | 对过大数值求 `exp` | 先减去每行最大值 |
| 学习停滞 | 分数未缩放 | 除以 `sqrt(d_head)` |
| 深层堆叠发散 | 残差路径使用 post-LN | 改用 pre-LN |
| 权重绑定没有节省参数 | 复制了权重而非共享 | 赋值为同一个参数 |
| 超过训练长度后输出差 | 位置不能外推 | RoPE 配合基数缩放 |

## 缩略语
type: glossary
from: phases/07-transformers-deep-dive/03-multi-head-attention/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md

- **MHA**：多头注意力，N 个查询头、N 个 K/V 头。
- **MQA**：多查询注意力，共享一个 K/V 投影。
- **GQA**：分组查询注意力，较少的 K/V 头复制后匹配 Q。
- **MLA**：多头潜变量注意力，将 K 与 V 放入低秩潜变量。
- **RoPE**：旋转位置嵌入，按位置旋转 Q 与 K。
- **ALiBi**：线性偏置注意力，对分数施加距离惩罚。
- **RMSNorm**：不减均值的 LayerNorm。
- **KV 缓存**：保存每个前缀 token 的 K 与 V。

## 问答
type: qa
from: phases/07-transformers-deep-dive/02-self-attention-from-scratch/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/07-transformers-deep-dive/03-multi-head-attention/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md

- **为何除以 sqrt(d_k)？** 大点积会使 softmax 饱和，导致梯度消失。
- **掩码为何用 -inf？** exp(-inf) = 0，使未来位置权重为零。
- **为何加入位置？** 单独的注意力不区分排列。
- **为何用 GQA？** KV 缓存可减少 N/G 倍，质量几乎不变。
- **Flash Attention 是近似吗？** 不是，持续维护 max 与 sum 保持精确。

## 提示
type: tips
from: phases/19-capstone-projects/33-multihead-self-attention/docs/zh.md, phases/19-capstone-projects/33-multihead-self-attention/code/tests/test_attention.py, phases/19-capstone-projects/34-transformer-block/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/05-nlp-foundations-to-advanced/10-attention-mechanism/docs/zh.md

- 测试每行权重之和为 1。
- 测试未来 token 不会改变过去输出。
- 随机初始化时损失应接近 log(V)。
- 对照参考模型核对参数量。
- softmax 之后与 MLP 第二个线性层之后放 dropout。
- 不要用注意力权重证明推理过程。
