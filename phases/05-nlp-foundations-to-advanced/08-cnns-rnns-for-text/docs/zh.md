# 用于文本的 CNN 与 RNN

> 卷积学 n-gram，循环记得住。两者都被注意力取代了，但两者在受限硬件上仍然要紧。

**类型：** Build
**语言：** Python
**前置要求：** Phase 3 · 11（PyTorch 入门）、Phase 5 · 03（词嵌入）、Phase 4 · 02（从零实现卷积）
**预计时间：** ~75 分钟

## 问题背景

TF-IDF 和 Word2Vec 产出的是忽略词序的扁平向量。建在它们之上的分类器分不清 `dog bites man` 和 `man bites dog`。而词序有时正是信号所在。

在 transformer 到来之前，有两个架构家族填补了这个空缺。

**用于文本的卷积网络（TextCNN）。** 在词 embedding 序列上做一维卷积。宽度为 3 的滤波器就是一个可学习的三元组检测器：它跨越三个词，输出一个分数。叠加不同宽度（2、3、4、5）来检测多尺度模式。做最大池化得到定长表示。扁平、并行、快。

**循环网络（RNN、LSTM、GRU）。** 一次处理一个 token，维护一个把信息往前带的隐藏状态。串行、带记忆、输入长度灵活。从 2014 到 2017 年主导序列建模，然后注意力来了。

这节课把两者都搭出来，再点出那个催生了注意力的翻车点。

## 核心概念

**TextCNN**（Kim，2014）。token 先嵌入。一个宽度为 `k` 的一维卷积在连续的 `k`-gram embedding 上滑动滤波器，产出一张特征图。在这张图上做全局最大池化，挑出最强的激活。把几个滤波器宽度的最大池化输出拼起来，喂给分类头。

它为什么有效。一个滤波器就是一个可学习的 n-gram。最大池化对位置不变，所以 "not good" 不管在评论开头还是中间都激活同一个特征。三种滤波器宽度、每种 100 个滤波器，就给你 300 个学出来的 n-gram 检测器。训练是并行的，没有串行依赖。

**RNN。** 在每个时间步 `t`，隐藏状态 `h_t = f(W * x_t + U * h_{t-1} + b)`。`W`、`U`、`b` 跨时间共享。时刻 `T` 的隐藏状态是整个前缀的摘要。做分类时，在 `h_1 ... h_T` 上池化（max、mean 或取最后一个）。

朴素 RNN 受梯度消失之苦。**LSTM** 加上门，决定忘掉什么、存什么、输出什么，稳住了长序列里的梯度。**GRU** 把 LSTM 简化成两个门；参数更少而表现相近。

**双向 RNN** 一个 RNN 正向跑、另一个反向跑，拼接隐藏状态。每个 token 的表示都同时看到左右上下文。对标注任务至关重要。

```figure
rnn-unroll
```

## 动手构建

### 第 1 步：PyTorch 里的 TextCNN

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class TextCNN(nn.Module):
    def __init__(self, vocab_size, embed_dim, n_classes, filter_widths=(2, 3, 4), n_filters=64, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, n_filters, kernel_size=k)
            for k in filter_widths
        ])
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids).transpose(1, 2)
        pooled = []
        for conv in self.convs:
            c = F.relu(conv(x))
            p = F.max_pool1d(c, c.size(2)).squeeze(2)
            pooled.append(p)
        h = torch.cat(pooled, dim=1)
        return self.fc(self.dropout(h))
```

`transpose(1, 2)` 把 `[batch, seq_len, embed_dim]` 重塑成 `[batch, embed_dim, seq_len]`，因为 `nn.Conv1d` 把中间那一维当作通道。池化后的输出无论输入长度都是定长。

### 第 2 步：LSTM 分类器

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_classes, bidirectional=True, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=bidirectional)
        factor = 2 if bidirectional else 1
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * factor, n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids)
        out, _ = self.lstm(x)
        pooled = out.max(dim=1).values
        return self.fc(self.dropout(pooled))
```

在序列上做最大池化，而不是取最后状态。做分类时，最大池化通常胜过取最后一个隐藏状态，因为长序列末尾的信息往往会主导最后状态。

### 第 3 步：梯度消失演示（直觉）

没有门控的朴素 RNN 学不到长程依赖。看一个玩具任务：预测 token `A` 是否在序列里任何位置出现过。如果 `A` 在位置 1 而序列长 100 个 token，损失的梯度得往回流过循环权重的 99 次相乘。如果权重小于 1，梯度消失。如果大于 1，梯度爆炸。

```python
def vanishing_gradient_sim(seq_len, recurrent_weight=0.9):
    import math
    return math.pow(recurrent_weight, seq_len)


# 当权重 = 0.9、跨 100 步时：
#   0.9 ^ 100 ≈ 2.7e-5
# 从第 100 步到第 1 步的梯度实际上等于零。
```

LSTM 用一个**细胞状态（cell state）**修了这个，它只带加法交互地穿过网络（遗忘门会乘法地缩放它，但梯度仍沿着这条"高速公路"流动）。GRU 用更少的参数做类似的事。两者都能让你在 100+ 步的序列里稳定训练。

### 第 4 步：为什么这还不够

哪怕有了 LSTM，三个问题依旧存在。

1. **串行瓶颈。** 在长度 1000 的序列上训练 RNN，需要 1000 次串行的前向/反向步骤。无法跨时间并行。
2. **编码器-解码器结构里的定长上下文向量。** 解码器只看到编码器的最终隐藏状态，它把整个输入压扁了。长输入丢细节。第 09 课直接讲这个。
3. **远程依赖的准确率上限。** LSTM 胜过朴素 RNN，但跨 200+ 步传播特定信息仍然吃力。

注意力把这三个全解决了。transformer 彻底丢掉了循环。第 10 课是那个转折点。

## 实际使用

PyTorch 的 `nn.LSTM`、`nn.GRU`、`nn.Conv1d` 都是生产可用的。训练代码是标准套路。

Hugging Face 提供预训练 embedding，你把它接成输入层：

```python
from transformers import AutoModel

encoder = AutoModel.from_pretrained("bert-base-uncased")
for param in encoder.parameters():
    param.requires_grad = False


class BertCNN(nn.Module):
    def __init__(self, n_classes, filter_widths=(2, 3, 4), n_filters=64):
        super().__init__()
        self.encoder = encoder
        self.convs = nn.ModuleList([nn.Conv1d(768, n_filters, kernel_size=k) for k in filter_widths])
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, input_ids, attention_mask):
        with torch.no_grad():
            out = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        x = out.transpose(1, 2)
        pooled = [F.max_pool1d(F.relu(conv(x)), kernel_size=conv(x).size(2)).squeeze(2) for conv in self.convs]
        return self.fc(torch.cat(pooled, dim=1))
```

适合约束就用它的清单。

- **边缘 / 端侧推理。** 配 GloVe embedding 的 TextCNN 比 transformer 小 10-100 倍。如果你的部署目标是手机，就用这套。
- **流式 / 在线分类。** RNN 一次处理一个 token；transformer 需要完整序列。对实时进来的文本，LSTM 仍然胜出。
- **做基线的小模型。** 在新任务上快速迭代。在 CPU 上 5 分钟就能训一个 TextCNN。
- **数据有限的序列标注。** 对 1k-10k 句标注数据，BiLSTM-CRF（第 06 课）仍是生产级的 NER 架构。

其他一切都交给 transformer。

## 拿去用

存为 `outputs/prompt-text-encoder-picker.md`：

```markdown
---
name: text-encoder-picker
description: Pick a text encoder architecture for a given constraint set.
phase: 5
lesson: 08
---

Given constraints (task, data volume, latency budget, deploy target, compute budget), output:

1. Encoder architecture: TextCNN, BiLSTM, BiLSTM-CRF, transformer fine-tune, or "use a pretrained transformer as a frozen encoder + small head".
2. Embedding input: random init, GloVe / fastText frozen, or contextualized transformer embeddings.
3. Training recipe in 5 lines: optimizer, learning rate, batch size, epochs, regularization.
4. One monitoring signal. For RNN/CNN models: attention mechanism absence means they miss long-range deps; check per-length accuracy. For transformers: fine-tuning collapse if LR too high; check train loss.

Refuse to recommend fine-tuning a transformer when data is under ~500 labeled examples without showing that a TextCNN / BiLSTM baseline has plateaued. Flag edge deployment as needing architecture-before-everything.
```

## 练习

1. **简单。** 在一个 3 分类玩具数据集（数据你自己编）上训练一个 TextCNN。验证滤波器宽度 (2, 3, 4) 的平均 F1 胜过单一宽度 (3)。
2. **中等。** 给 LSTM 分类器实现 max 池化、mean 池化和取最后状态三种池化。在一个小数据集上比较；记录哪种池化胜出并猜测原因。
3. **困难。** 搭一个 BiLSTM-CRF NER 标注器（结合第 06 课和这一课）。在 CoNLL-2003 上训练。和第 06 课的纯 CRF 基线、以及一个 BERT 微调对比。报告训练时间、内存和 F1。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| TextCNN | 用于文本的 CNN | 词 embedding 上的一维卷积叠加 + 全局最大池化。Kim（2014）。 |
| RNN | 循环网络 | 每个时间步更新隐藏状态：`h_t = f(W x_t + U h_{t-1})`。 |
| LSTM | 门控 RNN | 加上输入/遗忘/输出门 + 一个细胞状态。在长序列里稳定训练。 |
| GRU | 更简单的 LSTM | 两个门而非三个。准确率相近，参数更少。 |
| 双向（Bidirectional） | 两个方向 | 正向 + 反向 RNN 拼接。每个 token 看到上下文两侧。 |
| 梯度消失 | 训练信号死掉 | 朴素 RNN 里反复乘以 <1 的权重，使早期步骤的梯度实际为零。 |

## 延伸阅读

- [Kim, Y. (2014). Convolutional Neural Networks for Sentence Classification](https://arxiv.org/abs/1408.5882) —— TextCNN 论文。八页，好读。
- [Hochreiter, S. and Schmidhuber, J. (1997). Long Short-Term Memory](https://www.bioinf.jku.at/publications/older/2604.pdf) —— LSTM 论文。出乎意料地清晰。
- [Olah, C. (2015). Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) —— 让 LSTM 对所有人变得易懂的那些图。
