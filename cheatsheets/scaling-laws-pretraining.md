---
id: scaling-laws-pretraining
title: 缩放定律与预训练
code: SL
subtitle: Chinchilla 数学、超额训练、从原始文本到打包批次的数据流水线，以及迷你 GPT 训练循环。
hue: 12
sources: phases/07-transformers-deep-dive/13-scaling-laws, phases/10-llms-from-scratch/03-data-pipelines, phases/10-llms-from-scratch/04-pre-training-mini-gpt
source_hash: ac1c47320162216c
---

## 数据流水线
type: architecture
from: phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

```arch
node | raw | 1,1 | 原始文本 | Common Crawl 原始约 250 TB | store
node | html | 2,1 | 去除 HTML | 仅保留可见文本 | process
node | lang | 3,1 | 语言检测 | lid.176.bin，置信度 0.8 | process
node | qual | 4,1 | 质量过滤 | 困惑度或启发式规则 | process
node | dedup | 4,2 | 去重 | MinHash + LSH | process
node | pii | 3,2 | 去除 PII | 正则与 NER | process
node | pack | 2,2 | 分词与打包 | 文档间插入 EOS | process
node | load | 1,2 | DataLoader | 打乱顺序的批次 | queue
edge | raw | html |
edge | html | lang |
edge | lang | qual |
edge | qual | dedup |
edge | dedup | pii |
edge | pii | pack |
edge | pack | load | 序列、掩码
```

## 公式
type: concepts
from: phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

- **计算量**：标准 transformer 为 $C \approx 6 \times N \times D$ FLOPs。
- **Hoffmann 损失**：$L(N, D) = \frac{A}{N^\alpha} + \frac{B}{D^\beta} + E$
- **拟合常数**：$\alpha \approx 0.34$、$\beta \approx 0.28$、$E \approx 1.69$、$A \approx 406$、$B \approx 411$。
- **计算最优**：$N_{\text{opt}} \sim C^{0.5}$、$D_{\text{opt}} \sim C^{0.5}$、$D/N \approx 20$。
- **Jaccard**：共有 shingle 占全部 shingle 的比例。超过 0.8 时删除副本。
- **压缩比**：每个 token 对应的字符数，英语约为 3-4。
- **初始损失**：约为 $\ln(V)$。256-token 的字节词表从 5.55 开始。
- **注意力缩放**：除以 $\sqrt{d_k}$。64 维时为 8。

## 模型与 Chinchilla 对比
type: comparison
from: phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

| 比较项 | GPT-3 | Chinchilla | Llama 3 8B |
|---|---|---|---|
| 参数 | 175B | 70B | 8B |
| Token | 约 300B | 1.4T | 15T |
| 每参数 token 数 | 约 1.7 | 约 20 | 1,875 |
| 判定 | 训练不足 | 按计算最优设计 | 超出最优值 94 倍 |
| 原因 | Kaplan 定律：大幅增加 N | 最小化每 FLOP 的损失 | 大规模服务成本低 |

## 计算最优与超额训练对比
type: comparison
from: phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md, phases/07-transformers-deep-dive/13-scaling-laws/code/main.py

| 比较项 | Chinchilla 最优 | 超额训练 |
|---|---|---|
| 最小化对象 | 每训练 FLOP 的训练损失 | 包含推理的总成本 |
| 每参数 token 数 | 约 20 | 按服务量为 100 至 500 |
| 成本支付 | 训练时支付一次 | 额外预训练 FLOP 支付一次 |
| 推理成本 | 较高，N 更大 | 较低，N 更小 |
| 代码检查 | `compute_optimal(C)` | `chinchilla_loss(N_under, D_over)` |
| 示例 | Chinchilla 70B 使用 1.4T | Llama 3 8B 使用 15T |

## 运行数据流水线
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/03-data-pipelines/code/main.py

```python
raw_docs = generate_sample_corpus()
cleaned_docs = [clean_text(doc) for doc in raw_docs]   # 去除 HTML、URL 和多余空格
filtered_docs = [doc for doc in cleaned_docs if quality_filter(doc)]   # 长度、大写、符号
deduped_docs, num_removed = deduplicate(filtered_docs, threshold=0.8)   # MinHash + LSH
tokenizer = SimpleTokenizer()
tokenizer.train_bpe(all_text, num_merges=100)
token_ids = tokenize_corpus(deduped_docs, tokenizer)   # 每篇文档后添加 eos_id
sequences, masks = pack_sequences(token_ids, seq_length, pad_id=0)   # seq_length 为 128
loader = PreTrainingDataLoader(sequences, masks, batch_size)   # batch_size 为 4，打乱顺序
stats = compute_statistics(deduped_docs, token_ids, sequences, tokenizer.vocab_size())
```

## 一个训练步骤
type: flow
from: phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/code/main.py

1. **批次**：取 `seq_len + 1` 个 token，输入去掉最后一个，目标去掉第一个。
2. **掩码**：`np.triu(np.full((seq_len, seq_len), -1e9), k=1)` 屏蔽未来位置。
3. **前向**：依次经过嵌入、全部块和最终 LayerNorm。logits 使用 `token_embed.T`。
4. **损失**：`cross_entropy_loss(logits, target_ids)` 使用减去最大值的 log-softmax。
5. **反向**：计算全部参数的梯度。
6. **更新**：执行 `block.ffn.W1 -= lr * gW1`，其他张量同样更新。
7. **调度**：GPT-2 预热 2,000 步，再做余弦衰减。

## 课程函数
type: task-table
from: phases/07-transformers-deep-dive/13-scaling-laws/code/main.py, phases/10-llms-from-scratch/03-data-pipelines/code/main.py, phases/10-llms-from-scratch/04-pre-training-mini-gpt/code/main.py, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

| 任务 | 代码 |
|---|---|
| 预测损失 | `chinchilla_loss(N, D)` |
| 求最优 N 和 D | `compute_optimal(C_flops, n_grid=200)` |
| 词 shingle | `get_shingles(text, k=5)` |
| 将签名分桶 | `lsh_buckets(signature, bands=16)` |
| 训练迷你 GPT | `train_mini_gpt(corpus, num_steps=200)` |
| 统计 GPT-2 系列参数 | `parameter_breakdown()` |
| 权重与 KV 内存 | `memory_estimate()` |

## 默认值
type: defaults
from: phases/10-llms-from-scratch/03-data-pipelines/code/main.py, phases/10-llms-from-scratch/04-pre-training-mini-gpt/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `min_words` | 50 | 丢弃过短页面 |
| `max_ratio_caps` | 0.3 | 丢弃全大写垃圾文本 |
| `max_ratio_special` | 0.1 | 丢弃符号噪声 |
| `num_hashes` | 128 | MinHash 签名长度 |
| `bands` | 16 | 分带越多，召回越高 |
| `threshold` | 0.8 | 判定重复的 Jaccard 阈值 |
| `vocab_size` | 50257 | `MiniGPT` 使用 768 维、12 头、12 层 |
| `max_seq_len` | 1024 | GPT-2 上下文窗口 |

## 故障排查
type: troubleshooting
from: phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 模型逐字复述段落 | 数据中有重复项 | MinHash 去重，网页数据约有 38% 重复 |
| 输出含 HTML 标签 | 使用原始网页文本 | 训练前去除 HTML |
| 文档互相泄漏信息 | 打包文档共享注意力 | 使用块对角掩码 |
| 序列利用率低于 90% | 填充浪费 | 打包文档，之间插入 EOS |
| 英语检测置信度低于 0.8 | 不是干净的英语文本 | 过滤掉该文档 |
| 模型早期发散 | 初始学习率过高 | 预热学习率 |
| `exp` 溢出为无穷 | logits 过大 | exp 前减去最大值 |
| 梯度在第 1 块附近消失 | 无残差路径 | 添加 `x + sublayer(x)` |

## GPT-2 Small 数值
type: concepts
from: phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

- **总计**：权重绑定后为 124,438,272 个参数。
- **Token 嵌入**：(50257, 768)，共 38,597,376 个参数。
- **每块**：7,080,960，注意力为 2,359,296，FFN 为 4,718,592。
- **头**：12 个头，每头 64 维。FFN 从 768 扩到 3,072。
- **权重绑定**：输出头复用 token 嵌入，节省 38M。
- **KV 缓存**：每个 token 18,432 个值。1024 tokens、FP32 时约 75MB。
- **初始化**：权重使用 0.02 标准差。

## 用缩放定律决策
type: tips
from: phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

- 基础模型每参数不足 20 个 token 时，预计微调会较早饱和。
- 推理占预算大头时，选择训练更久的小模型。
- 超过 Chinchilla 最优值 1000 倍后，log-loss 变化趋于噪声。
- 按连续损失规划预算，基准分数跳变常是评分器造成的假象。
- 更好的数据、Muon 和 MoE 改变常数，不改变形状。
- 预计存在数据上限：约 5 至 10 万亿高质量英语 token。
- Llama 3 混合比例：50% 网页、25% 代码、13% 书籍和论文、8% 数学、4% 多语言。

## 问答
type: qa
from: phases/07-transformers-deep-dive/13-scaling-laws/docs/zh.md, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md, phases/10-llms-from-scratch/04-pre-training-mini-gpt/docs/zh.md

- **$E$ 是什么？** 不可约损失，即数据自身的熵。
- **为何超额训练？** 训练成本只付一次，推理成本持续支付。
- **为何不逐文档填充？** 填充浪费计算，应打包文档并使用掩码。
- **解码为何慢？** 解码受内存带宽限制，预填充受计算限制。
