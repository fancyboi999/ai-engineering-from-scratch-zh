# 视觉 Transformer（ViT）

> 把图像切成 patch，把每个 patch 当成一个词，跑一个标准 transformer。别回头看。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 7 第 02 课（自注意力）、阶段 4 第 04 课（图像分类）
**预计时间：** ~45 分钟

## 学习目标

- 从零实现 patch 嵌入、学习式位置嵌入、class token 和 transformer 编码器块，搭一个极简 ViT
- 解释为什么 ViT 曾被认为需要海量预训练数据，直到 DeiT 和 MAE 证明并非如此
- 在架构先验上对比 ViT、Swin、ConvNeXt（无先验、局部窗口注意力、卷积骨干）
- 用 `timm` 和标准的线性探针 / 微调配方，在一个小数据集上微调预训练 ViT

## 问题背景

十年里，卷积几乎就是计算机视觉的同义词。CNN 有强归纳偏置——局部性、平移等变性——没人觉得你能替换掉它们。然后 Dosovitskiy 等人（2020）证明：一个朴素 transformer，作用于展平的图像 patch，完全不用卷积机制，在规模上能匹敌甚至击败最好的 CNN。

陷阱在于"在规模上"。ViT 在 ImageNet-1k 上输给 ResNet。在 ImageNet-21k 或 JFT-300M 上预训练、再在 ImageNet-1k 上微调的 ViT 赢了它。结论是 transformer 缺少有用的先验，但能从足够多的数据里学到它们。后续工作（DeiT、MAE、DINO）表明：有了对的训练配方——强增广、自监督预训练、蒸馏——ViT 在小数据上也训得很好。

到 2026 年，纯 CNN 在边缘设备上仍有竞争力（ConvNeXt 最强），但 transformer 称霸其余一切：分割（Mask2Former、SegFormer）、检测（DETR、RT-DETR）、多模态（CLIP、SigLIP）、视频（VideoMAE、VJEPA）。ViT 的块结构就是那个该掌握的。

## 核心概念

### Pipeline

```mermaid
flowchart LR
    IMG["图像<br/>(3, 224, 224)"] --> PATCH["patch 嵌入<br/>conv 16x16 s=16<br/>-> (768, 14, 14)"]
    PATCH --> FLAT["展平为<br/>(196, 768) token"]
    FLAT --> CAT["在前面拼<br/>[CLS] token"]
    CAT --> POS["加学习式<br/>位置嵌入"]
    POS --> ENC["N 个 transformer<br/>编码器块"]
    ENC --> CLS["取 [CLS]<br/>token 输出"]
    CLS --> HEAD["MLP 分类器"]

    style PATCH fill:#dbeafe,stroke:#2563eb
    style ENC fill:#fef3c7,stroke:#d97706
    style HEAD fill:#dcfce7,stroke:#16a34a
```

七步。patch -> token -> 注意力 -> 分类器。每个变体（DeiT、Swin、ConvNeXt、MAE 预训练）改其中一两步，其余照旧。

### Patch 嵌入

第一个卷积是诀窍。核大小 16、stride 16，于是一张 224x224 图像变成一个 14x14 的 16x16 patch 网格，每个被投影成一个 768 维嵌入。那一个卷积既切 patch 又做线性投影。

```
输入:  (3, 224, 224)
卷积 (3 -> 768, k=16, s=16, 无 padding):
输出: (768, 14, 14)
展平空间: (196, 768)
```

196 个 patch = 196 个 token。每个 token 的特征维度是 768（ViT-B）、1024（ViT-L）或 1280（ViT-H）。

### Class token

一个学习出来的向量，拼在序列前面：

```
tokens = [CLS; patch_1; patch_2; ...; patch_196]   shape (197, 768)
```

经过 N 个 transformer 块后，`[CLS]` 的输出是全局图像表示。分类头只读这一个向量。

### 位置嵌入

Transformer 没有内建的空间位置概念。给每个 token 加一个学习出来的向量：

```
tokens = tokens + learned_pos_embedding   (同样是 shape (197, 768))
```

这个嵌入是模型的一个参数；基于梯度的训练让它适应 2D 图像结构。有正弦式 2D 替代方案，但实践中很少用。

### Transformer 编码器块

标准的。多头自注意力、MLP、残差连接、pre-LayerNorm。

```
x = x + MSA(LN(x))
x = x + MLP(LN(x))

MLP 是带 GELU 的两层：Linear(d -> 4d) -> GELU -> Linear(4d -> d)
```

ViT-B/16 堆 12 个这样的块，每个 12 个注意力头，共 8600 万参数。

### 为什么用 pre-LN

早期 transformer 用 post-LN（`x = LN(x + sublayer(x))`），不带 warmup 很难训过 6-8 层。Pre-LN（`x = x + sublayer(LN(x))`）不带 warmup 也能稳定训练更深的网络。每个 ViT 和每个现代 LLM 都用 pre-LN。

### Patch 大小的权衡

- 16x16 patch -> 196 token，标准。
- 32x32 patch -> 49 token，更快但分辨率更低。
- 8x8 patch -> 784 token，更细但 O(n^2) 注意力成本缩放很差。

patch 越大 = token 越少 = 越快但空间细节越少。SwinV2 在层级窗口里用 4x4 patch。

### DeiT 在 ImageNet-1k 上训练 ViT 的配方

原始 ViT 需要 JFT-300M 才能击败 CNN。DeiT（Touvron 等人，2020）仅靠 ImageNet-1k 就把 ViT-B 训到 81.8% top-1，靠四个改动：

1. 重度增广：RandAugment、Mixup、CutMix、Random Erasing。
2. 随机深度（训练时随机丢掉整个块）。
3. 重复增广（同一图像每个 batch 采 3 次）。
4. 从一个 CNN 教师蒸馏（可选，进一步提升准确率）。

每个现代 ViT 训练配方都源自 DeiT。

### Swin vs ConvNeXt

- **Swin**（Liu 等人，2021）—— 基于窗口的注意力。每个块在一个局部窗口内做注意力；交替的块移动窗口，跨窗口混合信息。在保留注意力算子的同时找回了类 CNN 的局部性先验。
- **ConvNeXt**（Liu 等人，2022）—— 重新设计的 CNN，匹配了 Swin 的架构选择（深度可分卷积、LayerNorm、GELU、倒置瓶颈）。它表明差距不是"注意力 vs 卷积"，而是"现代训练配方 + 架构"。

2026 年，ConvNeXt-V2 和 Swin-V2 都是生产级；正确的选择取决于你的推理栈（ConvNeXt 在边缘上编译得更好）和预训练语料。

### MAE 预训练

掩码自编码器（He 等人，2022）：随机掩码 75% 的 patch，训练编码器只处理可见的 25%，训练一个小解码器从编码器输出重建被掩码的 patch。预训练后丢掉解码器，微调编码器。

MAE 让 ViT 仅靠 ImageNet-1k 就可训练、达到 SOTA，是当前默认的自监督配方。

```figure
batchnorm-inference
```

## 动手构建

### 第 1 步：Patch 嵌入

```python
import torch
import torch.nn as nn

class PatchEmbedding(nn.Module):
    def __init__(self, in_channels=3, patch_size=16, dim=192, image_size=64):
        super().__init__()
        assert image_size % patch_size == 0
        self.proj = nn.Conv2d(in_channels, dim, kernel_size=patch_size, stride=patch_size)
        num_patches = (image_size // patch_size) ** 2
        self.num_patches = num_patches

    def forward(self, x):
        x = self.proj(x)
        return x.flatten(2).transpose(1, 2)
```

一个卷积、一个 flatten、一个 transpose。这就是整个"图像到 token"步骤。

### 第 2 步：Transformer 块

Pre-LN、多头自注意力、带 GELU 的 MLP、残差连接。

```python
class Block(nn.Module):
    def __init__(self, dim, num_heads, mlp_ratio=4, dropout=0.0):
        super().__init__()
        self.ln1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, dropout=dropout, batch_first=True)
        self.ln2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, dim * mlp_ratio),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * mlp_ratio, dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        a, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), need_weights=False)
        x = x + a
        x = x + self.mlp(self.ln2(x))
        return x
```

`nn.MultiheadAttention` 处理拆头、缩放点积和输出投影。`batch_first=True`，所以形状是 `(N, seq, dim)`。

### 第 3 步：ViT

```python
class ViT(nn.Module):
    def __init__(self, image_size=64, patch_size=16, in_channels=3,
                 num_classes=10, dim=192, depth=6, num_heads=3, mlp_ratio=4):
        super().__init__()
        self.patch = PatchEmbedding(in_channels, patch_size, dim, image_size)
        num_patches = self.patch.num_patches
        self.cls_token = nn.Parameter(torch.zeros(1, 1, dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, dim))
        self.blocks = nn.ModuleList([
            Block(dim, num_heads, mlp_ratio) for _ in range(depth)
        ])
        self.ln = nn.LayerNorm(dim)
        self.head = nn.Linear(dim, num_classes)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        nn.init.trunc_normal_(self.cls_token, std=0.02)

    def forward(self, x):
        x = self.patch(x)
        cls = self.cls_token.expand(x.size(0), -1, -1)
        x = torch.cat([cls, x], dim=1)
        x = x + self.pos_embed
        for blk in self.blocks:
            x = blk(x)
        x = self.ln(x[:, 0])
        return self.head(x)

vit = ViT(image_size=64, patch_size=16, num_classes=10, dim=192, depth=6, num_heads=3)
x = torch.randn(2, 3, 64, 64)
print(f"output: {vit(x).shape}")
print(f"params: {sum(p.numel() for p in vit.parameters()):,}")
```

约 280 万参数——一个在 CPU 上跑得动的小 ViT。真正的 ViT-B 是 8600 万；同一个类定义，用 `dim=768, depth=12, num_heads=12`。

### 第 4 步：合理性检查 —— 单图推理

```python
logits = vit(torch.randn(1, 3, 64, 64))
print(f"logits: {logits}")
print(f"probs:  {logits.softmax(-1)}")
```

应该无错运行。概率之和为 1。

## 实际使用

`timm` 提供每个 ViT 变体的 ImageNet 预训练权重。一行：

```python
import timm

model = timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10)
```

2026 年 `timm` 是视觉 transformer 的生产默认。在同一套 API 下支持 ViT、DeiT、Swin、Swin-V2、ConvNeXt、ConvNeXt-V2、MaxViT、MViT、EfficientFormer，以及几十个其他模型。

做多模态（图像 + 文本）时，`transformers` 提供 CLIP、SigLIP、BLIP-2、LLaVA。这些里面的图像编码器都是某个 ViT 变体。

## 拿去用

这一课产出：

- `outputs/prompt-vit-vs-cnn-picker.md` —— 一个 prompt，根据数据集规模、算力和推理栈，在 ViT、ConvNeXt、Swin 之间挑选。
- `outputs/skill-vit-patch-and-pos-embed-inspector.md` —— 一个 skill，验证 ViT 的 patch 嵌入和位置嵌入形状是否匹配模型期望的序列长度，抓出最常见的移植 bug。

## 练习

1. **（简单）** 打印上面那个小 ViT 一次前向里每个中间张量的形状。确认：输入 `(N, 3, 64, 64)` -> patch `(N, 16, 192)` -> 带 CLS `(N, 17, 192)` -> 分类器输入 `(N, 192)` -> 输出 `(N, num_classes)`。
2. **（中等）** 在第 4 课的合成 CIFAR 数据集上微调一个预训练的 `timm` ViT-S/16。和在同样数据上微调 ResNet-18 对比。报告训练时间和最终准确率。
3. **（困难）** 为这个小 ViT 实现 MAE 预训练：掩码 75% 的 patch，训练编码器 + 一个小解码器去重建被掩码的 patch。评估预训练前后在合成数据上的线性探针准确率。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| Patch 嵌入 | "第一个卷积" | 核大小 = stride = patch 大小的卷积；把图像变成 token 嵌入的网格 |
| Class token | "[CLS]" | 拼在 token 序列前面的学习出来的向量；它的最终输出是全局图像表示 |
| 位置嵌入 | "学习式位置" | 加到每个 token 上的学习出来的向量，让 transformer 知道每个 patch 来自哪 |
| Pre-LN | "子层前做 LayerNorm" | 稳定的 transformer 变体：`x + sublayer(LN(x))` 而非 `LN(x + sublayer(x))` |
| 多头注意力 | "并行注意力" | 标准 transformer 注意力，拆成 num_heads 个独立子空间，之后拼接 |
| ViT-B/16 | "Base，patch 16" | 经典尺寸：dim=768、depth=12、heads=12、patch_size=16、image=224；约 8600 万参数 |
| DeiT | "数据高效 ViT" | 仅在 ImageNet-1k 上配强增广训练的 ViT；证明海量预训练数据并非严格必需 |
| MAE | "掩码自编码器" | 自监督预训练：掩码 75% 的 patch，重建；主导的 ViT 预训练配方 |

## 延伸阅读

- [An Image is Worth 16x16 Words (Dosovitskiy et al., 2020)](https://arxiv.org/abs/2010.11929) —— ViT 论文
- [DeiT: Data-efficient Image Transformers (Touvron et al., 2020)](https://arxiv.org/abs/2012.12877) —— 如何仅靠 ImageNet-1k 训练 ViT
- [Masked Autoencoders are Scalable Vision Learners (He et al., 2022)](https://arxiv.org/abs/2111.06377) —— MAE 预训练
- [timm documentation](https://huggingface.co/docs/timm) —— 你在生产中会用到的每个视觉 transformer 的参考
