# 序列到序列模型

> 两个 RNN 假扮翻译官。它们撞上的瓶颈，正是注意力存在的理由。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 08（用于文本的 CNN + RNN）、Phase 3 · 11（PyTorch 入门）
**预计时间：** ~75 分钟

## 问题背景

分类把一个变长序列映射到单个标签。翻译把一个变长序列映射到另一个变长序列。输入和输出活在不同的词表里，可能是不同的语言，长度也不保证对等。

seq2seq 架构（Sutskever、Vinyals、Le，2014）用一套刻意做得简单的配方破解了这个。两个 RNN。一个读源句子，产出一个定长上下文向量。另一个读这个向量，逐个 token 生成目标句子。和你在第 08 课写的是同样的代码，只是粘法不同。

值得研究有两个理由。第一，上下文向量瓶颈是 NLP 里教学价值最高的一次翻车。它能解释注意力和 transformer 擅长的一切。第二，那套训练配方（teacher forcing、scheduled sampling、推理时的 beam search）至今仍适用于每个现代生成系统，包括 LLM。

## 核心概念

**编码器（Encoder）。** 一个读源句子的 RNN。它的最终隐藏状态就是**上下文向量**——整个输入的定长摘要。号称除了源句子之外什么都不丢。

**解码器（Decoder）。** 另一个从上下文向量初始化的 RNN。每一步把上一步生成的 token 当输入，产出目标词表上的一个分布。采样或取 argmax 来挑下一个 token。把它喂回去。重复，直到产出 `<EOS>` token 或达到最大长度。

**训练：** 解码器每一步的交叉熵损失，沿序列求和。在两个网络上做标准的随时间反向传播。

**Teacher forcing。** 训练时，解码器在第 `t` 步的输入是位置 `t-1` 上的*真实*token，而不是解码器自己上一步的预测。这稳住了训练；没有它，早期的错误会级联放大，模型永远学不会。推理时你只能用模型自己的预测，所以训练/推理之间总有一道分布鸿沟。这道鸿沟叫**暴露偏差（exposure bias）**。

**瓶颈。** 编码器学到的关于源句子的一切，都得挤进那一个上下文向量。长句子丢细节。罕见词被糊掉。重新排序（chat noir vs. black cat）只能死记，没法算出来。

注意力（第 10 课）通过让解码器看到*每一个*编码器隐藏状态、而不只是最后一个，直接修了这个。整套卖点就这一句。

```figure
lstm-gates
```

## 动手构建

### 第 1 步：一个编码器

```python
import torch
import torch.nn as nn


class Encoder(nn.Module):
    def __init__(self, src_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(src_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)

    def forward(self, src):
        e = self.embed(src)
        outputs, hidden = self.gru(e)
        return outputs, hidden
```

`outputs` 的形状是 `[batch, seq_len, hidden_dim]`——每个输入位置一个隐藏状态。`hidden` 的形状是 `[1, batch, hidden_dim]`——最后一步。第 08 课说"做分类时在 outputs 上池化"。这里我们把最后的隐藏状态留作上下文向量，忽略逐步的 outputs。

### 第 2 步：一个解码器

```python
class Decoder(nn.Module):
    def __init__(self, tgt_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(tgt_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, tgt_vocab_size)

    def forward(self, token, hidden):
        e = self.embed(token)
        out, hidden = self.gru(e, hidden)
        logits = self.fc(out)
        return logits, hidden
```

解码器一次只调一步。输入：一批单个 token 和当前隐藏状态。输出：下一个 token 的词表 logits 和更新后的隐藏状态。

### 第 3 步：带 teacher forcing 的训练循环

```python
def train_batch(encoder, decoder, src, tgt, bos_id, optimizer, teacher_forcing_ratio=0.9):
    optimizer.zero_grad()
    _, hidden = encoder(src)
    batch_size, tgt_len = tgt.shape
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    loss = 0.0
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)

    for t in range(tgt_len):
        logits, hidden = decoder(input_token, hidden)
        step_loss = loss_fn(logits.squeeze(1), tgt[:, t])
        loss += step_loss
        use_teacher = torch.rand(1).item() < teacher_forcing_ratio
        if use_teacher:
            input_token = tgt[:, t].unsqueeze(1)
        else:
            input_token = logits.argmax(dim=-1)

    loss.backward()
    optimizer.step()
    return loss.item() / tgt_len
```

两个值得点名的旋钮。`ignore_index=0` 跳过填充 token 上的损失。`teacher_forcing_ratio` 是每一步用真实 token 而非模型预测的概率。从 1.0（完全 teacher forcing）起步，在训练中退火到约 0.5，以弥合暴露偏差的鸿沟。

### 第 4 步：推理循环（贪心）

```python
@torch.no_grad()
def greedy_decode(encoder, decoder, src, bos_id, eos_id, max_len=50):
    _, hidden = encoder(src)
    batch_size = src.shape[0]
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    output_ids = []
    for _ in range(max_len):
        logits, hidden = decoder(input_token, hidden)
        next_token = logits.argmax(dim=-1)
        output_ids.append(next_token)
        input_token = next_token
        if (next_token == eos_id).all():
            break
    return torch.cat(output_ids, dim=1)
```

贪心解码每一步都挑概率最高的 token。它会跑偏：一旦你认定了一个 token，就收不回去了。**Beam search** 让 top-`k` 个部分序列同时存活，最后挑得分最高的那个完整序列。束宽 3-5 是标准。

### 第 5 步：把瓶颈演示出来

在一个玩具复制任务上训练模型：源 `[a, b, c, d, e]`，目标 `[a, b, c, d, e]`。增加序列长度，观察准确率。

```
seq_len=5   copy accuracy: 98%
seq_len=10  copy accuracy: 91%
seq_len=20  copy accuracy: 62%
seq_len=40  copy accuracy: 23%
```

单个 GRU 隐藏状态没法无损地记住一个 40-token 的输入。信息在每个编码器步骤里都在，但解码器只看到最后那个状态。注意力直接修了这个。

## 实际使用

PyTorch 有基于 `nn.Transformer` 和 `nn.LSTM` 的 seq2seq 模板。Hugging Face 的 `transformers` 库提供在数十亿 token 上训练的完整编码器-解码器模型（BART、T5、mBART、NLLB）。

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("facebook/bart-base")
model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-base")

src = tok("Translate this to French: Hello, how are you?", return_tensors="pt")
out = model.generate(**src, max_new_tokens=50, num_beams=4)
print(tok.decode(out[0], skip_special_tokens=True))
```

现代编码器-解码器把 RNN 换成了 transformer。高层形状（编码器、解码器、逐 token 生成）和 2014 年那篇 seq2seq 论文一模一样。每个块内部的机制不同了。

### 什么时候还会回头用基于 RNN 的 seq2seq

对新项目来说，几乎从不。具体的例外：

- 流式翻译，你以有界内存一次消费一个 token 的输入。
- 端侧文本生成，transformer 的内存成本承受不起。
- 教学。理解编码器-解码器瓶颈是理解 transformer 为何胜出的最快路径。

### 暴露偏差及其缓解

- **Scheduled sampling。** 训练中退火 teacher forcing 比例，让模型学会从自己的错误里恢复。
- **最小风险训练。** 在句子级 BLEU 分数上训练，而不是 token 级交叉熵。更贴近你真正想要的。
- **强化学习微调。** 用一个指标奖励序列生成器。用在现代 LLM 的 RLHF 里。

三者至今都适用于基于 transformer 的生成。

## 拿去用

存为 `outputs/prompt-seq2seq-design.md`：

```markdown
---
name: seq2seq-design
description: Design a sequence-to-sequence pipeline for a given task.
phase: 5
lesson: 09
---

Given a task (translation, summarization, paraphrase, question rewrite), output:

1. Architecture. Pretrained transformer encoder-decoder (BART, T5, mBART, NLLB) is the default. RNN-based seq2seq only for specific constraints.
2. Starting checkpoint. Name it (`facebook/bart-base`, `google/flan-t5-base`, `facebook/nllb-200-distilled-600M`). Match the checkpoint to task and language coverage.
3. Decoding strategy. Greedy for deterministic output, beam search (width 4-5) for quality, sampling with temperature for diversity. One sentence justification.
4. One failure mode to verify before shipping. Exposure bias manifests as generation drift on longer outputs; sample 20 outputs at the 90th-percentile length and eyeball.

Refuse to recommend training a seq2seq from scratch for under a million parallel examples. Flag any pipeline that uses greedy decoding for user-facing content as fragile (greedy repeats and loops).
```

## 练习

1. **简单。** 实现玩具复制任务。在目标等于源的输入-输出对上训练一个 GRU seq2seq。测量长度 5、10、20 处的准确率。复现这个瓶颈。
2. **中等。** 加上束宽为 3 的 beam search 解码。在一个小平行语料上测 BLEU，和贪心对比。记录 beam search 在哪里胜出（通常是末尾 token），在哪里没有差别。
3. **困难。** 在一个 10k 对的复述数据集上微调 `facebook/bart-base`。在留出输入上把微调模型的 beam-4 输出和基座模型对比。报告 BLEU 并挑 10 个定性例子。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 编码器（Encoder） | 输入 RNN | 读源句子。产出逐步隐藏状态和一个最终上下文向量。 |
| 解码器（Decoder） | 输出 RNN | 从上下文向量初始化。一次生成一个目标 token。 |
| 上下文向量 | 那个摘要 | 编码器最终隐藏状态。定长。注意力要解决的那个瓶颈。 |
| Teacher forcing | 用真实 token | 训练时喂入真实的上一个 token。稳住学习。 |
| 暴露偏差 | 训练/测试鸿沟 | 在真实 token 上训练的模型，从没练过从自己的错误里恢复。 |
| Beam search | 更好的解码 | 每一步让 top-k 个部分序列存活，而不是贪心地一锤定音。 |

## 延伸阅读

- [Sutskever, Vinyals, Le (2014). Sequence to Sequence Learning with Neural Networks](https://arxiv.org/abs/1409.3215) —— 原始 seq2seq 论文。四页。
- [Cho et al. (2014). Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation](https://arxiv.org/abs/1406.1078) —— 引入了 GRU 和编码器-解码器框架。
- [Bahdanau, Cho, Bengio (2014). Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473) —— 注意力论文。学完这一课立刻读。
- [PyTorch NLP from Scratch tutorial](https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html) —— 可上手构建的 seq2seq + attention 代码。
