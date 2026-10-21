---
id: positional-encoding
title: 位置编码：正弦、RoPE、ALiBi
code: PR
subtitle: 选择、构建并检查位置方案。用 Python 对比正弦、可学习位置编码、RoPE、YaRN 和 ALiBi。
hue: 285
sources: phases/07-transformers-deep-dive/04-positional-encoding, phases/19-capstone-projects/32-token-positional-embeddings, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs
source_hash: e0c72d1b3cccae7f
---

## 方案对比
type: comparison
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md

| 方案 | 作用位置 | 外推能力 | 训练成本 | 使用者 |
|---|---|---|---|---|
| 绝对正弦 | 与嵌入相加 | 差 | 无额外成本 | 原始 transformer、早期 BERT |
| 可学习绝对位置 | 嵌入查表 | 无 | 极小 | GPT-2、GPT-3 |
| RoPE | 旋转 Q 与 K | 缩放后良好 | 无额外成本 | Llama 2/3/4、Qwen 2/3、Mistral、DeepSeek-V3、Kimi |
| RoPE + YaRN | 旋转 Q 与 K | 优秀 | 微调阶段 | Qwen2-1M、Llama 3.1 128K |
| ALiBi | 注意力分数 | 优秀 | 无额外成本 | BLOOM、MPT、Baichuan |

## 各方案的作用位置
type: architecture
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md

```arch
node | ids | 1,1 | Token 标识 | (B, T) | client
node | tok | 2,1 | Token 嵌入 | (B, T, D) | store
node | abs | 3,1 | 加入绝对位置编码 | 正弦或可学习 | process
node | qk | 4,1 | Q 与 K | 逐头处理 | process
node | rope | 4,2 | RoPE | 旋转 Q 与 K | process
node | score | 3,2 | 分数 | q 点积 k 除以 sqrt d | process
node | alibi | 2,2 | ALiBi 偏置 | 减去 m_h 乘距离 | process
node | soft | 1,2 | Softmax | 然后乘 V | process
edge | ids | tok | 查表
edge | tok | abs | 求和
edge | abs | qk | X
edge | qk | rope | pos
edge | rope | score | 点积
edge | score | alibi | 相加
edge | alibi | soft |
```

## 三种方案的代码
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/04-positional-encoding/code/main.py

```python
def sinusoidal_pe(n, d, base=10000.0):  # 加到嵌入上
    theta = pos / (base ** (2 * i / d))  # 每对 i 对应一个频率
    pe[pos][2 * i] = math.sin(theta)  # 偶数维
    pe[pos][2 * i + 1] = math.cos(theta)  # 奇数维
def apply_rope(x, pos, base=10000.0):  # 分别作用于 Q 与 K
    c = math.cos(theta)  # theta 与上面相同
    out[2 * i] = a * c - b * s  # 对第 i 对做二维旋转
    out[2 * i + 1] = a * s + b * c
def alibi_slopes(n_heads):  # 每个头一个斜率
    return [2 ** (-8 * (h + 1) / n_heads) for h in range(n_heads)]
row.append(-m * abs(i - j))  # 斜率为 m 的头的偏置
row.append(float("-inf"))  # 因果模式且 j > i
```

## 代码任务
type: task-table
span: 2
from: phases/07-transformers-deep-dive/04-positional-encoding/code/main.py, phases/19-capstone-projects/32-token-positional-embeddings/code/main.py, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md

| 任务 | 代码 |
|---|---|
| n 个位置的正弦表 | `sinusoidal_pe(n, d, base=10000.0)` |
| 旋转一个 Q 或 K 向量 | `apply_rope(x, pos, base=10000.0)` |
| 每个头的 ALiBi 偏置 | `alibi_bias(n_heads, seq_len, causal=True)` |
| 可学习表，每个位置一行 | `LearnedPositionalEmbedding(max_context_length, d_model)` |
| 将固定表注册为缓冲区 | `SinusoidalPositionalEmbedding(max_context_length, d_model)` |
| token 向量与位置向量求和 | `EmbeddingComposer(token_emb, learned_pos)` |
| 相邻位置相似度诊断 | `neighbour_cosine_curve(table, max_offset=8)` |
| 运行演示 | `python3 code/main.py` |

## 检查 RoPE 相对位置性质
type: flow
from: phases/07-transformers-deep-dive/04-positional-encoding/code/main.py, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md

1. **向量**：用 `rng.gauss(0, 1)` 采样 `q` 与 `k`，`d = 16`。
2. **旋转**：用同一函数执行 `apply_rope(q, pq)` 与 `apply_rope(k, pk)`。
3. **分数**：计算位置对 (3, 5)、(7, 9)、(100, 102)、(1024, 1026) 的 `dot(q_rot, k_rot)`。
4. **预期**：gap=2 的所有行点积相同，误差仅来自浮点计算。
5. **基数扫描**：基数分别为 10000、100000、1_000_000，计算 `pos=4096` 与 `pos=4098` 的分数。
6. **解读**：基数越大，旋转越慢，上下文更长且不发生相位回绕。

## 默认值与数字
type: defaults
from: phases/07-transformers-deep-dive/04-positional-encoding/code/main.py, phases/19-capstone-projects/32-token-positional-embeddings/code/main.py, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `base` | `10000.0` | 正弦与 RoPE |
| `rope_theta` | `500000.0` | Llama 3 8B，从 10k 缩放而来 |
| `causal` | `True` | `alibi_bias` 遮蔽 `j > i` |
| `DEFAULT_INIT_STD` | `0.02` | 可学习表初始化 |
| `max_offset` | `8` | `neighbour_cosine_curve` |
| `max_context_length` | `128` | `DemoConfig` |
| `d_model` | `64` | 尝试 32，观察条带 |
| GPT-2 可学习表 | 1024 | 上下文 1025 超出表尾 |

## 用 RoPE 扩展长上下文
type: concepts
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

- **base**：RoPE 频率缩放因子。增大它可在推理时扩展上下文。
- **NTK-aware**：从 4K 扩展到 16K+ 时，将 `base` 重缩放为 `base * (scale_factor)^(d/(d-2))`。
- **YaRN**：保持注意力熵的逐维插值。Llama 3.1 128K 使用此方案。
- **LongRoPE**：进化搜索选择逐维缩放因子。Phi-3-Long 使用此方案。
- **位置插值**：按扩展倍数缩小位置值。微调 1–5B token。
- **结果**：Llama 3 用 RoPE 缩放将上下文从 8K 扩展至 128K。

## 需要读取的配置字段
type: command-table
from: phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/code/main.py, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md

| 命令 | 作用 |
|---|---|
| `rope_theta` | RoPE 基频 |
| `max_position_embeddings` | 训练上下文长度 |
| `model.config.rope_scaling` | 缩放类型与因子，例如 yarn |
| `"position": "rope-yarn"` | 计算器中的 Qwen 2.5 72B |
| `"position": "rope-sliding"` | Gemma 2 9B，RoPE 加滑动窗口层 |
| `"position": "learned"` | GPT-2 Small，1024 个位置 |
| `sliding_window` | 滑动窗口层使用最后 W 个 token |
| `layer_types` | 哪些层使用全注意力或滑动窗口 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/32-token-positional-embeddings/code/main.py, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/07-transformers-deep-dive/04-positional-encoding/code/main.py, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `seq_len <n> exceeds max_context_length <L>` | 输入比表长 | 增大 `max_context_length` |
| `d_model must be even for sinusoidal` | `d_model` 为奇数 | 使用偶数 `d_model` |
| `token and positional embeddings must share d_model` | 两者宽度不同 | 用相同 `d_model` 构建 |
| token 打乱后输出相同 | 没有位置信号 | 加入位置方案 |
| 可学习模型超过训练长度就失败 | 对应行不存在 | 使用带缩放的 RoPE |
| 正弦方案超过 `max_len` 后失败 | 这些位置未参与训练 | 使用 RoPE 或 ALiBi |
| 间隔相同，RoPE 分数却不同 | 只旋转了 Q 或 K | 用 `apply_rope` 旋转两者 |
| RoPE 长上下文效果下降 | 小基数导致相位回绕 | 增大 `base`，尝试 YaRN |

## 方案选型
type: tips
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

- 新解码器模型使用 RoPE。Llama、Mistral、Qwen、DeepSeek 和 Gemma 均使用 RoPE。
- 扩展上下文且能承担微调阶段时，使用 RoPE + YaRN。
- 最重视长度外推且不想使用嵌入表时，使用 ALiBi。
- 想使用无参数输入表时，选择正弦方案。前沿模型已很少使用。
- 仅在最大上下文固定时使用可学习绝对位置，如 GPT-2。
- RoPE 与 ALiBi 作用于注意力步骤，而非输入端。

## 问答
type: qa
from: phases/07-transformers-deep-dive/04-positional-encoding/docs/zh.md, phases/19-capstone-projects/32-token-positional-embeddings/docs/zh.md, phases/10-llms-from-scratch/14-open-models-architecture-walkthroughs/docs/zh.md

- **注意力为何需要位置？** 它无法感知顺序。打乱 `X` 的行，只会打乱输出行。
- **RoPE 为何具有相对性？** 每对维度的点积包含位置间隔乘 theta 的余弦项。
- **相加还是拼接？** 相加。使整个网络中的 `D` 保持不变。
- **参数成本多少？** 可学习方案增加 `max_context_length * D`，正弦方案为零。
- **RoPE 为何胜出？** 不改架构、具有相对位置性质，且有用于长上下文的 `base` 参数。
- **初始化时可学习方案与正弦方案有何区别？** 可学习方案的邻居相似度随机，正弦方案平滑衰减。
