---
id: rnns-seq2seq
title: RNN、Seq2Seq 与 N-gram 模型
code: RS
subtitle: TextCNN、LSTM 与 GRU、带教师强制的编码器解码器、束搜索、BLEU、Kneser-Ney，以及注意力胜出的原因。
hue: 330
sources: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text, phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence, phases/05-nlp-foundations-to-advanced/11-machine-translation, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer, phases/07-transformers-deep-dive/01-why-transformers
source_hash: 5eb65876b11fc250
---

## Seq2seq 编码器与解码器
type: architecture
from: phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md

```arch
node | src | 1,1 | 源 token | src ids | client
node | enc | 2,1 | 编码器 GRU | outputs、hidden | model
node | ctx | 3,1 | 上下文向量 | 最后隐状态 | store
node | bos | 1,2 | bos_id token | 之后为上一个 token | client
node | dec | 2,2 | 解码器 GRU | 每次一步 | model
node | out | 3,2 | 词表 logits | argmax 或束搜索 | process
edge | src | enc |
edge | enc | ctx | 瓶颈
edge | ctx | dec | 初始化隐状态
edge | bos | dec | input_token
edge | dec | out |
edge | out | bos | 反馈
```

## 核心公式
type: concepts
from: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md, phases/07-transformers-deep-dive/01-why-transformers/docs/zh.md

- **RNN**：$h_t = f(W x_t + U h_{t-1} + b)$，W、U、b 在时间维共享。
- **LSTM**：输入门、遗忘门、输出门加细胞状态，梯度稳定。
- **GRU**：两个门，准确率相近，参数更少。
- **TextCNN**：宽度 k 的滤波器是可学习 k-gram，每个滤波器做全局最大池化。
- **N-gram**：$P(w \mid \mathrm{ctx}) = \mathrm{count}(\mathrm{ctx}, w) / \mathrm{count}(\mathrm{ctx})$
- **困惑度**：$\exp(-\frac{1}{N} \sum_i \log P(w_i \mid \mathrm{ctx}_i))$，越低越好。
- **Kneser-Ney**：绝对折扣，低阶分布使用续接概率。
- **BLEU**：1 至 4 阶 n-gram 精确率的几何平均，加简短惩罚，范围 0 至 100。

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/code/main.py, phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/code/main.py, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md, phases/07-transformers-deep-dive/01-why-transformers/code/main.py

| 任务 | 代码 |
|---|---|
| N 步后的剩余梯度 | `vanishing_gradient_sim(seq_len, recurrent_weight=0.9)` |
| 不使用教师信号解码 | `greedy_decode(encoder, decoder, src, bos_id, eos_id, max_len=50)` |
| 简化 BLEU | `simple_bleu(hypothesis, reference, max_n=4)` |
| 字符 F 分数 | `chrf(hypothesis, reference, n=6, beta=2)` |
| 统计 trigram | `train_ngram(corpus_tokens, n=3)` |
| 平滑 bigram 模型 | `kneser_ney_bigram_model(corpus_tokens, discount=0.75)` |
| 评分留出文本 | `perplexity(prob_fn, sentences)` |
| 串行与并行深度 | `rnn_style(xs, decay=0.9)` 对比 `attention_style(xs)` |

## 使用教师强制训练
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md

```python
_, hidden = encoder(src)                        # 上下文向量
input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
loss_fn = nn.CrossEntropyLoss(ignore_index=0)   # 跳过填充
for t in range(tgt_len):
    logits, hidden = decoder(input_token, hidden)
    loss += loss_fn(logits.squeeze(1), tgt[:, t])
    use_teacher = torch.rand(1).item() < teacher_forcing_ratio
    if use_teacher:
        input_token = tgt[:, t].unsqueeze(1)    # t-1 时的真实值
    else:
        input_token = logits.argmax(dim=-1)     # 自身预测
loss.backward()
```

## TextCNN 前向传播
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md

```python
x = self.embed(token_ids).transpose(1, 2)  # [batch, embed_dim, seq_len]
for conv in self.convs:                    # 宽度 (2, 3, 4) 各一个
    c = F.relu(conv(x))
    p = F.max_pool1d(c, c.size(2)).squeeze(2)  # 最强激活
    pooled.append(p)
h = torch.cat(pooled, dim=1)               # 任意长度均得到固定大小
out, _ = self.lstm(x)                      # 改用 LSTM 分类器
pooled = out.max(dim=1).values             # 最大池化优于最后状态
```

## 翻译与评分
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md

```python
model_id = "facebook/nllb-200-distilled-600M"
tok = AutoTokenizer.from_pretrained(model_id, src_lang="eng_Latn")
out = model.generate(**inputs,
    forced_bos_token_id=tok.convert_tokens_to_ids("fra_Latn"),  # 目标语言
    num_beams=5, length_penalty=1.0, max_new_tokens=64)
print(tok.batch_decode(out, skip_special_tokens=True)[0])
bleu = sacrebleu.corpus_bleu(hypotheses, references)
chrf = sacrebleu.corpus_chrf(hypotheses, references)
```

## 默认值与数字
type: defaults
from: phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md, phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `teacher_forcing_ratio` | 0.9 | 从 1.0 开始，退火至约 0.5 |
| 束宽 | 3-5 | 通用内容机器翻译用 4-5 |
| KN `discount` | 0.75 | 从每个 bigram 计数中扣除 |
| TextCNN 滤波器 | 64 | 宽度 (2, 3, 4)，dropout 0.3 |
| `0.9 ^ 100` | 2.7e-5 | 100 步后剩余的梯度 |
| 长度 40 的复制准确率 | 23% | 长度 5 时为 98%，体现瓶颈 |
| BLEU 分数区间 | 30 | 40 较好，50 优秀，低于 1 是噪声 |
| Brown 语料 4-gram KN 困惑度 | 140 | transformer LM 可达 15-30 |

## 常见问题排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md, phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 长输出漂移 | 暴露偏差 | 调度采样，对比例退火 |
| 长输入丢失细节 | 单个固定上下文向量 | 对全部编码器状态做注意力 |
| 普通 RNN 学不到长距离关系 | 梯度消失 | 使用 LSTM 或 GRU |
| 贪心输出重复循环 | 每个 token 都立即定案 | 宽度 4-5 的束搜索 |
| 输出语言错误 | 生成偏离目标语言 | 检查 `forced_bos_token_id`，运行语言识别 |
| 短输入产生长输出 | 约 5 个 token 以下长度惩罚异常 | 按源长度限制输出 |
| 流畅输出加入新事实 | 幻觉 | 约束解码、人工审核 |
| N-gram 给出概率 0 | 未见过该 n-gram | Kneser-Ney 平滑 |

## 如何选择
type: qa
from: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md, phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md, phases/07-transformers-deep-dive/01-why-transformers/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md

- **TextCNN？** 用于边缘与设备端，比 transformer 小 10-100x。
- **LSTM？** 逐 token 的流式文本；1k-10k 标注句子可用 BiLSTM-CRF。
- **RNN seq2seq？** 几乎不用，仅用于流式翻译或设备端生成。
- **N-gram LM？** 设备端自动补全、重评分，以及神经 LM 之前的基线。
- **Transformer？** 其余场景。串行深度为 1 而非 N，内存为 $O(N^2)$。
- **BLEU 还是 chrF？** 两者都报告，chrF 更适合形态丰富的语言。

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/zh.md, phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/zh.md, phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md, phases/07-transformers-deep-dive/01-why-transformers/docs/zh.md

- **LSTM**：带输入门、遗忘门、输出门与细胞状态的门控 RNN。
- **GRU**：有两个门的门控 RNN。
- **NMT**：神经机器翻译，在平行文本上训练的 transformer 编码器解码器。
- **NLLB**：No Language Left Behind，覆盖 200 种语言的机器翻译模型家族。
- **chrF**：字符级 F 分数。
- **SSM**：状态空间模型，可并行训练的递推。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/zh.md, phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/zh.md

- 始终使用 `sacrebleu`，自写 BLEU 代码的分数无法比较。
- 至少报告两类指标，质量重要时默认用 COMET。
- 用 50-100 个人工标注样本校准每个指标。
- 只有分词完全相同时才能比较困惑度。
- 几千对干净平行文本优于几十万对噪声文本。
