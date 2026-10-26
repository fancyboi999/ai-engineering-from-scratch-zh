---
id: bert-gpt-t5
title: BERT、GPT 与 T5 对比
code: BG
subtitle: 对比仅编码器、仅解码器和编码器-解码器：训练目标、掩码、模块、解码及选型。
hue: 32
sources: phases/07-transformers-deep-dive/05-full-transformer, phases/07-transformers-deep-dive/06-bert-masked-language-modeling, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder
source_hash: 1b493fb10da030f9
---

## 三类架构对比
type: comparison
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

| 因素 | BERT | GPT | T5 / BART |
|---|---|---|---|
| 堆栈 | 仅编码器 | 仅解码器 | 编码器与解码器 |
| 注意力 | 双向，无掩码 | 因果三角掩码 | 双向编码器、因果解码器 |
| 交叉注意力 | 无 | 无 | Q 来自解码器，K/V 来自编码器 |
| 目标 | 对 15% 的 token 做 MLM | 下一 token，错开一位 | 片段破坏或去噪 |
| 预测内容 | $P(x_{\text{masked}} \mid x_{\text{unmasked}})$ | $P(x_t \mid x_{<t})$ | 目标片段或干净序列 |
| 生成文本 | 否 | 是，逐 token 生成 | 是，基于编码器输出生成 |
| 适用任务 | 分类、检索、NER | 聊天、代码、推理 | 翻译、语音转文字 |
| 示例 | BERT, DeBERTa, ModernBERT | GPT, Llama, Qwen | T5, BART, Whisper |

## 模块连接
type: architecture
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

```arch
node | src | 1,1 | 源 token | 嵌入 + 位置 | client
node | enc | 2,1 | 编码器模块 | LN、自 MHA、LN、FFN | process
node | encout | 3,1 | 编码器输出 | (N_src, d_model)，运行一次 | store
node | tgt | 1,2 | 目标 token | 错开一位 | client
node | self | 2,2 | 掩码自注意力 | 子层 1 | process
node | cross | 3,2 | 交叉注意力 | 子层 2 | process
node | ffn | 4,2 | FFN | 子层 3 | process
node | logits | 4,1 | 下一 token 的 logits | 最终 LN + 投影 | model
edge | src | enc |
edge | enc | encout |
edge | tgt | self |
edge | self | cross |
edge | encout | cross | K, V
edge | cross | ffn |
edge | ffn | logits |
```

## 一次编码器-解码器前向传播
type: flow
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/05-full-transformer/code/main.py, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

1. **嵌入**：将 token 变为向量。加入 RoPE 或正弦位置信号。
2. **编码器**：每个模块先执行前置归一化自注意力，再执行前置归一化 FFN，两者都有残差连接。
3. **编码器输出**：每个输入只运行一次编码器。长输入应缓存该输出。
4. **解码器自注意力**：使用掩码，位置 `i` 只能看到截至 `i` 的位置。
5. **解码器交叉注意力**：编码器信息进入解码器的唯一位置。
6. **解码器 FFN**：之后在输出投影前执行最终 LN。
7. **检查**：源序列 6 个 token、目标序列 5 个 token 时，输出形状为 `(5, vocab)`。

## 课程代码任务
type: task-table
from: phases/07-transformers-deep-dive/05-full-transformer/code/main.py, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/code/main.py, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/code/main.py, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/code/main.py

| 任务 | 代码 |
|---|---|
| BERT 80/10/10 掩码 | `create_mlm_batch(tokens, vocab_size)` |
| 掩盖整词 | `whole_word_mlm(tokens, spans, vocab_size)` |
| GPT 因果掩码 | `causal_mask(n)` |
| 下一 token 损失 | `cross_entropy_shifted(logits, target_ids)` |
| T5 片段破坏 | `corrupt_spans(tokens, mask_rate=0.15)` |
| 重建原文 | `round_trip(source, target)` |
| 一个编码器模块 | `encoder_block(x, p)` |
| 一个解码器模块 | `decoder_block(x, enc_out, p)` |

## 加载各类模型
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

```python
tok = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
model = AutoModel.from_pretrained("answerdotai/ModernBERT-base")
out = model(**inputs).last_hidden_state   # (1, N, 768)，仅返回嵌入
model = AutoModelForCausalLM.from_pretrained("<model>")
out = model.generate(**inputs, max_new_tokens=64,
    temperature=0.7, top_p=0.9, do_sample=True)   # 采样回复
model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base")
inputs = tok("translate English to French: <text>", return_tensors="pt")   # 输入中包含任务名
out = model.generate(**inputs, max_new_tokens=32)
print(tok.decode(out[0], skip_special_tokens=True))
```

## 预训练目标
type: concepts
from: phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

- **MLM**：选取 15% 的 token。其中 80% 变为 `[MASK]`，10% 随机替换，10% 不变。
- **标签**：选中位置的原始 token。其他位置全部为 -100。
- **NSP**：预测句子 B 是否紧随 A。RoBERTa 表明它有负面影响，现代编码器不再使用。
- **因果语言模型**：输入 `[t1, t2, t3]`，目标为 `[t2, t3, t4]`。对各位置的 $-\log P$ 求和。
- **因果掩码**：若 $j \le i$ 则 $M_{ij} = 0$，否则为 $-\infty$。在 softmax 前加入。
- **片段破坏**：片段平均长度为 3，总计占 15%，各自替换为 `<extra_id_0>`、`<extra_id_1>`。
- **T5 目标**：只包含被破坏的片段，每段跟在对应哨兵标记后。
- **BART**：五种噪声函数。解码器重建完整原始序列。

## 解码策略
type: command-table
from: phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/code/main.py, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

| 命令 | 作用 |
|---|---|
| `sample_greedy(probs)` | 每步取 argmax。用于代码补全、确定性任务 |
| `sample_temperature(logits, t, rng)` | logits 除以 T。T 越高，多样性越大 |
| `sample_top_k(logits, k, rng)` | 只从概率最高的 k 个 token 中采样 |
| `sample_top_p(logits, p, rng)` | 累计概率至少为 p 的最小集合 |
| `sample_min_p(logits, min_p, rng)` | 保留满足 `p >= min_p * max_p` 的 token |
| 束搜索 | 翻译和摘要使用宽度 4 至 5 |
| 推测解码 | 草稿模型提出 N 个 token，大模型验证 |

## 模块：2017 与 2026 对比
type: comparison
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md

| 组件 | 2017 模块 | 2026 模块 |
|---|---|---|
| 归一化 | LayerNorm，后置归一化 | RMSNorm，前置归一化 |
| FFN 激活 | ReLU | SwiGLU |
| FFN 扩张倍数 | 4× | 2.6×（三个矩阵） |
| 位置 | 正弦绝对位置 | RoPE |
| 注意力 | 完整 MHA | GQA（或 MLA） |
| 偏置项 | 有 | 无 |

## 代码默认值
type: defaults
from: phases/07-transformers-deep-dive/05-full-transformer/code/main.py, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/code/main.py, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/code/main.py, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `mask_prob` | 0.15 | BERT 选取比例 |
| `IGNORE_INDEX` | -100 | 未选中位置的标签 |
| `mask_rate` | 0.15 | T5 中片段所占 token 比例 |
| `mean_span` | 3.0 | T5 平均片段长度 |
| `mask_token` | `<mask>` | BART 掩码及填充 token |
| `layer_norm` eps | 1e-5 | 减去均值 |
| `rms_norm` eps | 1e-6 | 不减均值 |
| `temperature` | 1.0 | `softmax`, top-k, top-p, min-p |

## 各类架构的使用条件
type: tips
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

- 分类、嵌入、NER、NLI 和 RAG 重排使用 BERT。每 token 运行速度是解码器的 5 至 10×。
- 不要用 BERT 生成文本。编码器不能自回归地产生 token。
- 生成、聊天、代码和推理使用 GPT。仅解码器架构最容易扩展。
- 开放权重模型默认可使用 min-p + temperature 0.7。
- 输入是明确源序列时使用 T5 或 BART：翻译、语音、结构化任务。
- 编码器-解码器使用束搜索。输出分布比聊天更窄。
- 摘要与提取既可使用编码器-解码器，也可使用仅解码器架构。

## 故障排查
type: troubleshooting
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 微调时没有 `[MASK]` 就失败 | 训练时 100% 使用 `[MASK]` | 使用 80/10/10 规则 |
| 模型偷看答案作弊 | 缺少因果掩码 | 在 softmax 前加入 `-inf` 三角掩码 |
| 未来位置权重不严格为零 | Softmax 不会输出严格的零 | 将未来位置分数设为 `-inf` |
| 深层堆栈梯度消失 | 没有残差连接 | 使用 `x + sublayer(x)` |
| 12 层后激活爆炸 | 后置归一化 | 改用前置归一化 |
| 被破坏片段无法重建 | 片段记录存在差一错误 | 运行往返检查 |
| 长输入解码缓慢 | 编码器每步重新运行 | 缓存编码器输出 |

## 问答
type: qa
from: phases/07-transformers-deep-dive/05-full-transformer/docs/zh.md, phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/zh.md, phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/zh.md

- **为何 BERT 可以利用右侧上下文？** 编码器没有因果掩码。
- **为何 GPT 训练可以并行？** 一次传播得到 N 个下一 token 损失。推理仍是串行。
- **一个模块有多少参数？** MHA 为 `4 · d²`，SwiGLU FFN 约为 `3rd²`。
- **为何 T5 预训练比 BART 便宜？** T5 仅解码片段，BART 解码完整序列。
- **嵌入模型是 BERT 吗？** 是。编码器相同，使用对比损失。
