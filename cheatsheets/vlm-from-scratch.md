---
id: vlm-from-scratch
title: 从零构建 VLM
code: BV
subtitle: 图块嵌入、ViT 编码器、MLP 投影器、交叉注意力解码器、InfoNCE 加 LM 预训练、R@K、EM 与 BLEU-4。
hue: 25
sources: phases/19-capstone-projects/58-vision-encoder-patches, phases/19-capstone-projects/59-vit-transformer, phases/19-capstone-projects/60-projection-layer-modality-align, phases/19-capstone-projects/61-cross-attention-fusion, phases/19-capstone-projects/62-vision-language-pretraining, phases/19-capstone-projects/63-multimodal-eval
source_hash: 61358d083dc0127c
---

## VLM 技术栈
type: architecture
from: phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md, phases/19-capstone-projects/62-vision-language-pretraining/docs/zh.md

```arch
node | img | 1,1 | 图像 | 224x224x3 | client
node | patch | 2,1 | PatchEmbed | Conv2d，196 个 token + CLS | process
node | vit | 3,1 | ViT | 12 个块，12 个头，pre-LN | model
node | proj | 4,1 | MLPProjector | 线性、GELU、线性 | process
node | text | 1,2 | 图像描述标识 | 文本表均值池化 | client
node | dec | 3,2 | 解码器 | 因果自注意力 + 交叉注意力 | model
node | loss | 4,2 | 损失 | InfoNCE + LM | process
edge | img | patch |
edge | patch | vit | 197 个 token
edge | vit | proj | CLS
edge | vit | dec | 记忆 K、V
edge | text | dec | 查询
edge | proj | loss | image_emb
edge | dec | loss | logits
```

## 运行各课
type: command-table
span: 2
from: phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md, phases/19-capstone-projects/62-vision-language-pretraining/docs/zh.md, phases/19-capstone-projects/63-multimodal-eval/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (58) | token 形状为 `(1, 197, 768)`，Unfold 与 Conv2d 一致 |
| `python3 code/main.py` (59) | 编码为 `(1, 197, 768)`，约 86M 参数 |
| `python3 code/main.py` (60) | 200 步，损失从约 1.07 降到约 0.80 |
| `python3 code/main.py` (61) | Logits 为 `(2, 10, text_vocab)`，掩码为 `(10, 10)`，并检查缓存 |
| `python3 code/main.py` (62) | 50 步，对比损失约 2.77 降至 2.4，LM 为 6.24 降至 4.7 |
| `python3 code/main.py` (63) | 训练 50 步前后的指标 |
| `python3 -m unittest code/test_main.py` | 运行单课测试 |

## 构建与编码
type: annotated-code
lang: python
from: phases/19-capstone-projects/58-vision-encoder-patches/code/main.py, phases/19-capstone-projects/59-vit-transformer/code/main.py

```python
cfg = ViTConfig()                         # 224、16、768，深度 12，头数 12
encoder = VisionEncoder(cfg).eval()       # 前端加 ViT 栈
img = synthesize_image(seed=0)            # (1, 3, 224, 224)，值在 [0, 1]
tokens, cls = encoder(img)                # (1, 197, 768) 和 (1, 768)
pos = sinusoidal_2d(grid_h, grid_w, dim)  # dim 可被 4 整除
ref = unfold_then_linear(img, weight, bias, cfg.patch_size)
nn.Conv2d(cfg.in_channels, cfg.hidden,
          kernel_size=cfg.patch_size, stride=cfg.patch_size)
x = x + self.attn(self.ln1(x))            # pre-LN 残差
x = x + self.ffn(self.ln2(x))             # GELU MLP，宽度 4x
```

## 对齐、融合与预训练
type: annotated-code
lang: python
from: phases/19-capstone-projects/60-projection-layer-modality-align/code/main.py, phases/19-capstone-projects/61-cross-attention-fusion/code/main.py, phases/19-capstone-projects/62-vision-language-pretraining/code/main.py

```python
projector = MLPProjector(cfg.vision_hidden, cfg.projection_hidden, cfg.text_hidden)
freeze(encoder)                                     # requires_grad_(False)
loss = cosine_alignment_loss(image_emb, text_emb)   # 1 - cos 的均值
mask = causal_mask(10)                              # (10, 10) 下三角
logits = decoder(text_ids, memory, use_cache=True)  # 缓存图像 K、V
contrast, sim = info_nce_loss(image_emb, text_emb, self.log_tau)
lm = lm_loss(logits, targets, padding_id=PAD_ID)    # PAD_ID 为 0
total = contrast + cfg.lm_weight * lm
```

## VLM 中的注意力
type: comparison
from: phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md

| 因素 | ViT 自注意力 | 解码器自注意力 | 交叉注意力 |
|---|---|---|---|
| 查询 | 图像 token | 文本 token | 文本 token |
| 键和值 | 图像 token | 文本 token | 图像记忆 token |
| 掩码 | 无 | 因果 `(Nt, Nt)` | 无 |
| 输出形状 | `(B, 197, 768)` | `(B, Nt, hidden)` | `(B, Nt, hidden)` |
| 原因 | 仅编码器，双向 | 自回归不能向前偷看 | 可见整张图像 |
| 缓存 | 不使用 | 不使用 | 每张图像的 K、V 计算一次 |

## 一个预训练步骤
type: flow
from: phases/19-capstone-projects/62-vision-language-pretraining/code/main.py, phases/19-capstone-projects/62-vision-language-pretraining/docs/zh.md

1. **采样器**：从 200 对语料中无放回抽取 16 对。
2. **编码器**：返回记忆 token 和投影后的图像嵌入。
3. **文本侧**：对嵌入后的描述标识求均值，得到 `text_emb`。
4. **InfoNCE**：双方 L2 归一化，分别对行和列算交叉熵，再取均值。
5. **解码器**：读取 `text_ids[:, :-1]`，预测 `text_ids[:, 1:]`。
6. **LM 损失**：交叉熵，忽略填充标识 0。
7. **Adam**：按 `contrast + lm_weight * lm` 更新，每 5 步打印一次。

## 形状与数字
type: concepts
from: phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md, phases/19-capstone-projects/63-multimodal-eval/docs/zh.md

- **图块**：224 / 16 得到 14x14 网格，共 196 块，每块 768 个值。
- **注意力成本**：196 个 token，每头每层产生 38,416 个分数。
- **投影**：ViT-Base/16 为 590,592 个参数，CLS 增加 768。
- **头维度**：768 / 12 个头得到 64。
- **每块**：约 7.1M，12 块约 85M，编码器约 86M。
- **投影器**：`768 -> 1024 -> 512` 输出头约为 1.3M。
- **余弦损失**：对齐时为 0，反向时为 2。
- **随机 R@K，N=50**：R@1 为 0.02，R@5 为 0.10，R@10 为 0.20。

## 评估模型
type: task-table
span: 2
from: phases/19-capstone-projects/63-multimodal-eval/code/main.py

| 任务 | 代码 |
|---|---|
| 构建评估套件 | `build_eval_suite(seed, n_samples, vocab_size, max_len)` |
| 图像与文本召回 | `i2t, t2i = recall_at_k(sim, k)` |
| VQA 准确率 | `vqa_exact_match(predictions, references)` |
| 图像描述评分 | `bleu4(generated, references, smoothing=True)` |
| 全部三项指标 | `evaluate(model, suite)` |
| 两次评估间训练 | `contrast, lm, _ = model(imgs, ids)` |

## 配置默认值
type: defaults
from: phases/19-capstone-projects/58-vision-encoder-patches/code/main.py, phases/19-capstone-projects/59-vit-transformer/code/main.py, phases/19-capstone-projects/60-projection-layer-modality-align/code/main.py, phases/19-capstone-projects/61-cross-attention-fusion/code/main.py, phases/19-capstone-projects/62-vision-language-pretraining/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `image_size`, `patch_size` | 224 | 图块 16，隐藏维度 768 |
| `depth`, `heads` | 12 | `mlp_ratio` 为 4.0，LayerNorm eps 为 1e-6 |
| 对齐 `steps` | 200 | 32 对，lr 3e-4 |
| `projection_hidden` | 1024 | `text_hidden` 为 512 |
| 解码器 `hidden` | 256 | 8 个头，深度 4，197 个视觉 token |
| 预训练 `batch_size` | 16 | 50 步，lr 5e-4 |
| `lm_weight` | 1.0 | LM 损失权重 |
| `init_log_tau` | math.log(1.0 / 0.07) | 缩放值限制在 1e-3 至 100.0 |

## 错误与修正
type: troubleshooting
from: phases/19-capstone-projects/58-vision-encoder-patches/code/main.py, phases/19-capstone-projects/59-vit-transformer/code/main.py, phases/19-capstone-projects/60-projection-layer-modality-align/code/main.py, phases/19-capstone-projects/61-cross-attention-fusion/code/main.py, phases/19-capstone-projects/62-vision-language-pretraining/code/main.py, phases/19-capstone-projects/63-multimodal-eval/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `patch_size ... must divide image_size` | 网格不是整数 | 选择可整除图像尺寸的图块大小 |
| `PatchEmbed` 返回 `spatial mismatch` | 输入尺寸与配置不同 | 调整到 `image_size` |
| `sinusoidal_2d dim must be divisible by 4` | 隐藏维度不是 4 的倍数 | 使用可被 4 整除的隐藏维度 |
| `hidden ... not divisible by heads` | 头维度不是整数 | 选择可整除隐藏维度的头数 |
| `could not load lesson 58 main.py` | 课程目录移动 | 保留同级课程目录的位置 |
| `causal mask shape ... does not match` | 掩码不是 `(Nt, Nt)` | 用 `causal_mask(nt)` 构建 |
| `batch_size ... cannot exceed corpus size` | 无放回采样 | 减小批次或增加样本对 |
| `k ... not in [1, N]` | K 大于候选池 | k 保持不超过 N |

## 问答
type: qa
from: phases/19-capstone-projects/58-vision-encoder-patches/docs/zh.md, phases/19-capstone-projects/59-vit-transformer/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md, phases/19-capstone-projects/62-vision-language-pretraining/docs/zh.md

- **为何用图块而不是像素？** 150,528 个像素 token 的注意力成本难以承担。
- **对齐时为何冻结编码器？** 只需训练 1.3M 参数的投影器。
- **为何采用后期融合？** 文本保持独立，图像 K、V 每张图只计算一次。
- **为何学习温度？** 过小噪声大，过大会使 softmax 变平。
