---
id: vision-transformers
title: 视觉 Transformer 与图块 Token
code: VT
subtitle: 切分图块、嵌入、添加 CLS 与位置，运行 pre-LN 块。涵盖 token 数、参数计算与任意分辨率打包。
hue: 220
sources: phases/04-computer-vision/14-vision-transformers, phases/07-transformers-deep-dive/09-vision-transformers, phases/12-multimodal-ai/01-vision-transformer-patch-tokens, phases/12-multimodal-ai/06-any-resolution-patch-n-pack, phases/19-capstone-projects/58-vision-encoder-patches, phases/19-capstone-projects/59-vit-transformer
source_hash: c86fe6670fe5c3b8
---

## ViT 流水线
type: architecture
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md

```arch
node | img | 1,1 | 图像 | (3, 224, 224) | client
node | patch | 2,1 | 图块嵌入 | 卷积 16x16，s=16 | process
node | flat | 3,1 | 展平 | (196, 768) 个 token | process
node | cls | 4,1 | 前置 [CLS] | 197 个 token | store
node | pos | 4,2 | 加上学习位置 | (197, 768) | store
node | enc | 3,2 | N 个编码器块 | pre-LN | gpu
node | take | 2,2 | 取 [CLS] 输出 | | process
node | head | 1,2 | MLP 分类器 | | model
edge | img | patch |
edge | patch | flat |
edge | flat | cls |
edge | cls | pos |
edge | pos | enc |
edge | enc | take |
edge | take | head |
```

## 形状与成本计算
type: concepts
from: phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md, phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/04-computer-vision/14-vision-transformers/docs/zh.md

- **网格**：$(H/P) \times (W/P)$ 个图块。224 分辨率、图块 16 时，14x14 = 196 个 token。
- **图块向量**：$3P^2$ 个值。P = 16 时为 768。
- **投影**：`nn.Conv2d(3, D, kernel_size=P, stride=P)` 等价于先展开再线性变换。
- **序列**：图块 + 1 个 CLS + 寄存器。224 分辨率的 ViT-B/16 为 197。
- **注意力成本**：$n^2$。196 个 token 产生 38,416 个分数；150,528 个像素产生 226 亿个。
- **每头维度**：`head_dim = hidden / num_heads`。768 / 12 = 64。
- **块参数量**：$12 D^2$ + 3k。D = 768 时约 7.1M，12 块为 85M。
- **图块嵌入参数量**：`3 * P * P * hidden + hidden`。ViT-Base/16 为 590,592。

## Tiny ViT 前向传播
type: annotated-code
lang: python
from: phases/04-computer-vision/14-vision-transformers/code/main.py, phases/04-computer-vision/14-vision-transformers/docs/zh.md

```python
vit = ViT(image_size=64, patch_size=16, num_classes=10, dim=192, depth=6, num_heads=3)
x = self.patch(x)                                 # (N, 16, 192)
cls = self.cls_token.expand(x.size(0), -1, -1)
x = torch.cat([cls, x], dim=1)                    # (N, 17, 192)
x = x + self.pos_embed                            # 学习参数，trunc_normal std=0.02
for blk in self.blocks:
    x = blk(x)                                    # pre-LN 注意力，然后 MLP
return self.head(self.ln(x[:, 0]))                # 仅用 [CLS] 分类
```

## ViT-B 规模的 pre-LN 块
type: annotated-code
lang: python
from: phases/19-capstone-projects/59-vit-transformer/code/main.py, phases/19-capstone-projects/59-vit-transformer/docs/zh.md

```python
cfg = ViTConfig()                                 # 224、16、隐藏维度 768、深度 12、头数 12
qkv = self.qkv(x).reshape(b, n, 3, h, hd).permute(2, 0, 3, 1, 4)
q, k, v = qkv[0], qkv[1], qkv[2]
scores = (q @ k.transpose(-2, -1)) * self.scale   # scale = 1 / sqrt(head_dim)
attn = F.softmax(scores, dim=-1)                  # 无掩码，编码器双向
x = x + self.attn(self.ln1(x), store_attn=store_attn)
x = x + self.ffn(self.ln2(x))                     # hidden 到 4 * hidden 再到 hidden
tokens, cls = encoder(img)                        # (1, 197, 768) 与 (1, 768)
```

## 代码任务
type: task-table
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/19-capstone-projects/58-vision-encoder-patches/code/main.py, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/code/main.py, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/code/main.py, phases/07-transformers-deep-dive/09-vision-transformers/code/main.py

| 任务 | 代码 |
|---|---|
| 预训练 ViT-B/16 | `timm.create_model("vit_base_patch16_224")` |
| 展平图块，使用标准库 | `patchify(image, patch_size)` |
| 固定二维位置表 | `sinusoidal_2d(grid_h, grid_w, dim)` |
| 检查 Conv2d 的计算 | `unfold_then_linear(x, weight, bias, patch_size)` |
| 序列长度 | `seq_length(cfg)` |
| 每次前向传播 FLOP 数 | `flops_per_forward(cfg)` |
| 打包混合尺寸 | `pack_batch(images, patch)` |
| 块对角掩码 | `build_dense_mask(pack)` |

## 命令
type: command-table
from: phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (19.58) | 前端输出 (1, 197, 768) |
| `python3 code/main.py` (19.59) | 完整编码器，约 86M 参数 |
| `python3 -m unittest code/test_main.py` | 运行形状与等价性测试 |
| `code/main.py` (12.01) | 图块分词器与几何计算器 |

## 模型规模
type: defaults
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/07-transformers-deep-dive/09-vision-transformers/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| ViT-B/16 | 86M | dim=768、depth=12、heads=12 |
| ViT-Large | ~307M | hidden=1024、depth=24、heads=16 |
| ViT-Huge | ~632M | 特征维度 1280 |
| SigLIP So400M | 400M | hidden=1152、depth=27、heads=16 |
| Tiny ViT（第 4.14 课） | 280 万 | dim=192、depth=6、CPU |
| MLP 扩张倍数 | 4x | 2x 欠拟合，8x 过拟合 |
| 寄存器 token | 4 | DINOv2 与 SigLIP 2 |
| MAE 掩码比例 | 75% | 编码器看到可见的 25% |

## 图块大小与 token 数
type: defaults
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 224，图块 16 | 196 个 token | 标准配置 |
| 224，图块 32 | 49 个 token | 更快，分辨率更低 |
| 224，图块 8 | 784 个 token | 更精细，成本按平方增长 |
| SigLIP 2 SO400m/14，384 分辨率 | 729 个图块 token | 2026 年默认 VLM 视觉塔 |
| NaFlex 预算 | 256、729、1024 | 一个检查点，推理时选择 |
| AnyRes 672x672，2x2 加缩略图 | 2880 | 4 * 576 + 576 |
| OCR 与文档 | 1024-4096 个 token | 自然照片需要 256-576 |

## 对混合批次切块并打包
type: flow
from: phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/code/main.py

1. **网格**：按图块大小 14 计算每张图的原生图块网格。
2. **展平**：每张图变为独立的变长序列。
3. **拼接**：将全部序列接成一个。偏移量给出 `cu_seqlens`。
4. **掩码**：构建块对角掩码。图块只关注自己图像内的图块。
5. **位置**：为每个图块分配二维 RoPE 或分数位置。
6. **结果**：576 + 256 + 768 个 token 合成一个 1600 token 序列，无填充。

## 池化与位置选择
type: concepts
from: phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md, phases/07-transformers-deep-dive/09-vision-transformers/docs/zh.md, phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md

- **[CLS] token**：最终隐藏状态代表图像。原版 ViT 与 CLIP 使用它。
- **均值池化**：图块输出的平均值。SigLIP 与 DINOv2 使用它。
- **寄存器 token**：额外 4 至 16 个 token 吸收高范数伪影。送入 LLM 前移除。
- **学习式一维位置**：将模型绑定到训练分辨率。
- **二维正弦位置**：固定，0 个参数。一半维度编码行，一半编码列。
- **2D-RoPE、M-RoPE**：按 (row, col) 旋转 q 和 k，无需位置表。
- **VLM 衔接**：跳过池化，每个图块成为一个 LLM 输入 token。

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/19-capstone-projects/58-vision-encoder-patches/code/main.py, phases/19-capstone-projects/59-vit-transformer/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| ViT 在 ImageNet-1k 上输给 ResNet | 没有 CNN 先验，数据太少 | DeiT 方案或 MAE 预训练 |
| 深层堆叠无法训练 | 超过 6-8 层时使用 post-LN | 使用 pre-LN |
| 新分辨率使位置失效 | 学习式一维位置表 | 插值或使用 2D-RoPE |
| 文本被压扁，图表标签丢失 | 缩放为正方形 | 按原生分辨率编码 |
| 超过 50% 的 token 是填充 | 按最长边填充 | 带掩码切块打包 |
| 高范数伪影图块 | 没有吸收 token | 增加寄存器 token |
| 网格触发 ValueError | `patch_size` 不能整除 `image_size` | 选择可整除的图块大小 |
| `sinusoidal_2d` 抛错 | dim 不能被 4 整除 | 使用 4 的倍数维度 |

## 问答
type: qa
from: phases/04-computer-vision/14-vision-transformers/docs/zh.md, phases/07-transformers-deep-dive/09-vision-transformers/docs/zh.md, phases/12-multimodal-ai/01-vision-transformer-patch-tokens/docs/zh.md, phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md

- **为何用图块而非像素？** 224x224 图像有 150,528 个像素 token，注意力成本按平方增长。
- **为何 pre-LN？** 无需预热即可稳定训练深层堆叠。
- **图块用 14 还是 16？** 14 产生更多 token，更适合 OCR 与稠密任务，但更慢。
- **稠密特征选什么骨干？** DINOv2。匹配文本则用 CLIP 或 SigLIP。
- **学习式还是正弦位置？** 固定分辨率下学习式更好；分辨率变化时正弦更好。
