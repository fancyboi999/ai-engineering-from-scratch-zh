# OCR 与文档理解

> OCR 是一条三阶段流水线——检测文字框、识别字符，再把它们排版。每个现代 OCR 系统都在重排或合并这些阶段。

**类型：** Learn + Use
**语言：** Python
**前置要求：** 阶段 4 第 06 课（检测）、阶段 7 第 02 课（自注意力）
**预计时间：** ~45 分钟

## 学习目标

- 梳理经典 OCR 流水线（检测 -> 识别 -> 版面）和现代端到端替代方案（Donut、Qwen-VL-OCR）
- 实现用于序列到序列 OCR 训练的 CTC（Connectionist Temporal Classification）损失
- 用 PaddleOCR 或 EasyOCR 做生产文档解析，不训练
- 区分 OCR、版面解析和文档理解——为每个任务挑对工具

## 问题背景

满是文字的图像无处不在：收据、发票、证件、扫描书籍、表单、白板、标牌、截图。从中抽取结构化数据——不只是字符，而是"这是总金额"——是最高价值的应用视觉问题之一。

这个领域分成三个技能层：

1. **OCR 本身**：把像素变成文字。
2. **版面解析**：把 OCR 输出归组成区域（标题、正文、表格、页眉）。
3. **文档理解**：从版面里抽取结构化字段（"invoice_total = $42.50"）。

每一层都有经典和现代方法，而"我想从图像里得到文字"和"我要这张收据的总金额"之间的差距，比大多数团队意识到的更大。

## 核心概念

### 经典流水线

```mermaid
flowchart LR
    IMG["图像"] --> DET["文字检测<br/>(DB、EAST、CRAFT)"]
    DET --> BOX["词/行<br/>边界框"]
    BOX --> CROP["裁剪每个区域"]
    CROP --> REC["识别<br/>(CRNN + CTC)"]
    REC --> TXT["文本字符串"]
    TXT --> LAY["版面<br/>排序"]
    LAY --> OUT["按阅读顺序的文本"]

    style DET fill:#dbeafe,stroke:#2563eb
    style REC fill:#fef3c7,stroke:#d97706
    style OUT fill:#dcfce7,stroke:#16a34a
```

- **文字检测**产出逐行或逐词的四边形。
- **识别**把每个区域裁到固定高度，跑一个 CNN + BiLSTM + CTC 产出字符序列。
- **版面**重建阅读顺序（拉丁文从上到下、从左到右；阿拉伯文、日文不同）。

### 一段话讲清 CTC

OCR 识别从一个固定长度的特征图产出一个可变长度的序列。CTC（Graves 等人，2006）让你不用字符级对齐就能训练它。模型在每个时间步输出一个（词表 + blank）上的分布；CTC 损失对所有"合并重复、去掉 blank 后能化简成目标文本"的对齐做边缘化。

```
原始输出: "h h h _ _ e e l l _ l l o _ _"
合并重复并去掉 blank 后: "hello"
```

CTC 就是 CRNN 在 2015 年奏效、并在 2026 年仍训练着大多数生产 OCR 模型的原因。

### 现代端到端模型

- **Donut**（Kim 等人，2022）—— 一个 ViT 编码器 + 一个文本解码器；读一张图像直接吐出 JSON。没有文字检测器，没有版面模块。
- **TrOCR** —— ViT + transformer 解码器，做行级 OCR。
- **Qwen-VL-OCR / InternVL** —— 为 OCR 任务微调的完整视觉-语言模型；2026 年在复杂文档上准确率最佳。
- **PaddleOCR** —— 成熟生产包里的经典 DB + CRNN 流水线；仍是开源主力。

端到端模型需要更多数据和算力，但跳过了多阶段流水线的误差累积。

### 版面解析

对结构化文档，跑一个版面检测器（LayoutLMv3、DocLayNet），给每个区域打标签：Title、Paragraph、Figure、Table、Footnote。阅读顺序于是变成"按版面顺序遍历区域、拼接"。

对表单，用**键值抽取**模型（视觉丰富文档用 Donut，普通扫描用 LayoutLMv3）。它们拿图像 + 检测到的文字 + 位置，预测结构化的键值对。

### 评估指标

- **字符错误率（CER）** —— Levenshtein 距离 / 参考长度。越低越好。生产目标：干净扫描上 < 2%。
- **词错误率（WER）** —— 词级别的同样东西。
- **结构化字段上的 F1** —— 用于键值任务；衡量 `{invoice_total: 42.50}` 是否正确出现。
- **JSON 上的编辑距离** —— 用于端到端文档解析；Donut 论文引入了归一化的树编辑距离。

```figure
cv3-ctc-collapse
```

## 动手构建

### 第 1 步：CTC 损失 + 贪心解码器

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def ctc_loss(log_probs, targets, input_lengths, target_lengths, blank=0):
    """
    log_probs:      (T, N, C) 在含 blank（索引 0）的词表上做 log-softmax
    targets:        (N, S) 整数目标（无 blank）
    input_lengths:  (N,) 每个样本用到的时间步数
    target_lengths: (N,) 每个样本的目标长度
    """
    return F.ctc_loss(log_probs, targets, input_lengths, target_lengths,
                      blank=blank, reduction="mean", zero_infinity=True)


def greedy_ctc_decode(log_probs, blank=0):
    """
    log_probs: (T, N, C) log-softmax
    返回: 索引序列列表（去掉 blank，合并重复）
    """
    preds = log_probs.argmax(dim=-1).transpose(0, 1).cpu().tolist()
    out = []
    for seq in preds:
        decoded = []
        prev = None
        for idx in seq:
            if idx != prev and idx != blank:
                decoded.append(idx)
            prev = idx
        out.append(decoded)
    return out
```

`F.ctc_loss` 在可用时用高效的 CuDNN 实现。贪心解码器比束搜索简单，CER 通常在束搜索的 1% 以内。

### 第 2 步：微型 CRNN 识别器

行级 OCR 的极简 CNN + BiLSTM。

```python
class TinyCRNN(nn.Module):
    def __init__(self, vocab_size=40, hidden=128, feat=32):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, feat, 3, 1, 1), nn.BatchNorm2d(feat), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat, feat * 2, 3, 1, 1), nn.BatchNorm2d(feat * 2), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat * 2, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
            nn.Conv2d(feat * 4, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
        )
        self.rnn = nn.LSTM(feat * 4, hidden, bidirectional=True, batch_first=True)
        self.head = nn.Linear(hidden * 2, vocab_size)

    def forward(self, x):
        # x: (N, 1, H, W)
        f = self.cnn(x)                # (N, C, H', W')
        f = f.mean(dim=2).transpose(1, 2)  # (N, W', C)
        h, _ = self.rnn(f)
        return F.log_softmax(self.head(h).transpose(0, 1), dim=-1)  # (W', N, vocab)
```

固定高度输入（CNN 把高度 max-pool 到 1）。宽度是 CTC 的时间维。

### 第 3 步：合成 OCR

生成黑底白字的数字串做端到端冒烟测试。

```python
import numpy as np

def synthetic_line(text, height=32, char_width=16):
    W = char_width * len(text)
    img = np.ones((height, W), dtype=np.float32)
    for i, c in enumerate(text):
        x = i * char_width
        shade = 0.0 if c.isalnum() else 0.5
        img[6:height - 6, x + 2:x + char_width - 2] = shade
    return img


def build_batch(strings, vocab):
    H = 32
    W = 16 * max(len(s) for s in strings)
    imgs = np.ones((len(strings), 1, H, W), dtype=np.float32)
    target_lengths = []
    targets = []
    for i, s in enumerate(strings):
        imgs[i, 0, :, :16 * len(s)] = synthetic_line(s)
        ids = [vocab.index(c) for c in s]
        targets.extend(ids)
        target_lengths.append(len(ids))
    return torch.from_numpy(imgs), torch.tensor(targets), torch.tensor(target_lengths)


vocab = ["_"] + list("0123456789abcdefghijklmnopqrstuvwxyz")
imgs, targets, lengths = build_batch(["hello", "world"], vocab)
print(f"images: {imgs.shape}   targets: {targets.shape}   lengths: {lengths.tolist()}")
```

真实 OCR 数据集会加字体、噪声、旋转、模糊和颜色。上面的流水线一模一样。

### 第 4 步：训练草图

```python
model = TinyCRNN(vocab_size=len(vocab))
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for step in range(200):
    strings = ["abc" + str(step % 10)] * 4 + ["xyz" + str((step + 1) % 10)] * 4
    imgs, targets, target_lens = build_batch(strings, vocab)
    log_probs = model(imgs)  # (W', 8, vocab)
    input_lens = torch.full((8,), log_probs.size(0), dtype=torch.long)
    loss = ctc_loss(log_probs, targets, input_lens, target_lens, blank=0)
    opt.zero_grad(); loss.backward(); opt.step()
```

在这种平凡的合成数据上，损失应在 200 步内从约 3 降到约 0.2。

## 实际使用

三条生产路径：

- **PaddleOCR** —— 成熟、快、多语言。一行用法：`paddleocr.PaddleOCR(lang="en").ocr(image_path)`。
- **EasyOCR** —— Python 原生、多语言、PyTorch 骨干。
- **Tesseract** —— 经典；模型力不从心时，对老旧扫描文档仍有用。

做端到端文档解析，用 Donut 或一个 VLM：

```python
from transformers import DonutProcessor, VisionEncoderDecoderModel

processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
```

对结构可复用的收据、发票和表单，微调 Donut。对任意文档或需要推理的 OCR，像 Qwen-VL-OCR 这样的 VLM 是当前默认。

## 拿去用

这一课产出：

- `outputs/prompt-ocr-stack-picker.md` —— 一个 prompt，给定文档类型、语言和结构，挑出 Tesseract / PaddleOCR / Donut / VLM-OCR。
- `outputs/skill-ctc-decoder.md` —— 一个 skill，从零写贪心和束搜索 CTC 解码器，含长度归一化。

## 练习

1. **（简单）** 在 5 位随机数字串上训练 TinyCRNN 500 步。在一个留出集上报告 CER。
2. **（中等）** 把贪心解码换成束搜索（beam_width=5）。报告 CER 差值。在哪些输入上束搜索胜出？
3. **（困难）** 对一组 20 张收据用 PaddleOCR，抽取行项目，对 {item_name, price} 对计算相对手工标注真值的 F1。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| OCR | "从像素得到文字" | 把图像区域变成字符序列 |
| CTC | "免对齐损失" | 不用逐时间步标签就训练序列模型的损失；对对齐做边缘化 |
| CRNN | "经典 OCR 模型" | 卷积特征提取器 + BiLSTM + CTC；2015 年的基线，至今仍在生产中用 |
| Donut | "端到端 OCR" | ViT 编码器 + 文本解码器；从图像直接吐出 JSON |
| 版面解析 | "找区域" | 检测并标注文档里的 Title/Table/Figure/Paragraph 区域 |
| 阅读顺序 | "文本序列" | 把识别出的区域排成句子的顺序；拉丁文平凡，混合版面不平凡 |
| CER / WER | "错误率" | 字符或词粒度上的 Levenshtein 距离 / 参考长度 |
| VLM-OCR | "会读字的 LLM" | 为 OCR 任务训练或提示的视觉-语言模型；复杂文档上当前的 SOTA |

## 延伸阅读

- [CRNN (Shi et al., 2015)](https://arxiv.org/abs/1507.05717) —— 最初的 CNN+RNN+CTC 架构
- [CTC (Graves et al., 2006)](https://www.cs.toronto.edu/~graves/icml_2006.pdf) —— 最初的 CTC 论文；密集塞满了算法点子
- [Donut (Kim et al., 2022)](https://arxiv.org/abs/2111.15664) —— 免 OCR 的文档理解 transformer
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) —— 开源的生产 OCR 栈
