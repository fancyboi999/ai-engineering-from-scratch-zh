---
id: vlm-architectures
title: 视觉语言模型架构
code: VL
subtitle: ViT、桥接器与 LLM。包含投影器、Q-Former、Perceiver、门控交叉注意力、训练阶段和配置数值。
hue: 265
sources: phases/04-computer-vision/25-vision-language-models, phases/12-multimodal-ai/03-blip2-qformer-bridge, phases/12-multimodal-ai/04-flamingo-gated-cross-attention, phases/12-multimodal-ai/05-llava-visual-instruction-tuning, phases/12-multimodal-ai/07-open-weight-vlm-recipes, phases/19-capstone-projects/60-projection-layer-modality-align, phases/19-capstone-projects/61-cross-attention-fusion
source_hash: 24eab480196b284d
---

## ViT-MLP-LLM 模式
type: architecture
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md

```arch
node | img | 1,1 | 图像 | H x W x 3 | client
node | vit | 2,1 | 视觉编码器 | CLIP-L、SigLIP、DINOv3 | model
node | proj | 3,1 | 投影器 | 2-4 层 MLP 或 Q-former | process
node | txt | 1,2 | 文本 prompt | | client
node | tok | 2,2 | LLM 分词器 | 文本 token (M, d_llm) | process
node | cat | 3,2 | 交错或拼接 | LLM 空间中的图像 token | process
node | llm | 4,2 | 解码器 LLM | 生成文本答案 | model
edge | img | vit |
edge | vit | proj | (N, d_vit)
edge | proj | cat | (N, d_llm)
edge | txt | tok |
edge | tok | cat |
edge | cat | llm |
```

## 桥接机制
type: concepts
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md, phases/12-multimodal-ai/03-blip2-qformer-bridge/docs/zh.md, phases/12-multimodal-ai/04-flamingo-gated-cross-attention/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md

- **MLP 投影器**：Linear、GELU、Linear。将 `(N_patches, d_vit)` 映射到 `(N_patches, d_llm)`。
- **Q-Former**：32 个可学习查询对冻结的 ViT 图块做交叉注意力，输出 32 个视觉 token。
- **Perceiver 重采样器**：K = 64 个可学习潜变量。任意图块数量均输出 64 个 token。
- **门控交叉注意力**：$y = \tanh(\alpha) \cdot \mathrm{cross} + x$。Alpha 从 0 开始。
- **交叉注意力**：Q 来自文本流，K 和 V 来自图像流。
- **余弦对齐损失**：$1 - \cos(\mathrm{image}, \mathrm{text})$。0 表示对齐，2 表示相反。
- **DeepStack**：堆叠 ViT 多个深度的特征，不只用最后一层。
- **CMER**：文本置信度高、图文相似度低的输出占比。

## 三个训练阶段
type: flow
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md, phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md

1. **对齐**：冻结 ViT 和 LLM，只在图像描述配对上训练投影器。
2. **LLaVA 阶段 1**：558k 图像描述配对，对描述计算 LM 损失，耗时数小时。
3. **预训练**：解冻全部参数，在 500M+ 交错图文配对上训练。
4. **指令调优**：在（图像、问题、答案）三元组上微调。
5. **LLaVA 阶段 2**：投影器与 LLM 在 158k 轮视觉指令上训练。

## 代码任务
type: task-table
span: 2
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md, phases/04-computer-vision/25-vision-language-models/code/main.py, phases/12-multimodal-ai/04-flamingo-gated-cross-attention/code/main.py, phases/12-multimodal-ai/05-llava-visual-instruction-tuning/code/main.py, phases/19-capstone-projects/61-cross-attention-fusion/code/main.py

| 任务 | 代码 |
|---|---|
| 构建投影器 | `Projector(vit_dim=768, llm_dim=4096, hidden=4096)` |
| 堆叠 ViT 各深度 | `deepstack_features(per_layer_features)` |
| 测量 CMER | `cross_modal_error_rate(image_emb, text_emb, text_confidence)` |
| 将图块重采样为固定潜变量 | `perceiver_resampler(patches, num_latents=8, num_blocks=2)` |
| 门控步骤，门关闭 | `gated_cross_attention_step(text_hidden, visual, alpha=0.0)` |
| 每个文本 token 对应一张图像 | `interleaved_mask(seq)` |
| 含 576 token 的 LLaVA prompt | `build_llava_prompt(system, user, image_tokens=576)` |
| 自注意力掩码 | `causal_mask(length)` |

## 将图像 token 合入文本
type: annotated-code
lang: python
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md

```python
vision_tokens = self.vit(image)                 # (B, N_patches, d_vit)
vision_embeds = self.projector(vision_tokens)   # (B, N_patches, d_llm)
text_embeds = self.llm.get_input_embeddings()(input_ids)  # (B, M, d_llm)
out = text_embeds.clone()                       # 先复制，再填充
for b in range(input_ids.size(0)):              # 每次处理一个样本
    positions = (input_ids[b] == self.image_token_id).nonzero(as_tuple=True)[0]
    out[b, positions] = vision_embeds[b]        # <image> 槽位填入视觉特征
```

## 只训练投影层
type: annotated-code
lang: python
from: phases/19-capstone-projects/60-projection-layer-modality-align/code/main.py

```python
cfg = AlignConfig()                    # 768 -> 1024 -> 512，200 步
encoder = VisionEncoder(encoder_cfg).eval()
freeze(encoder)                        # requires_grad_(False)
projector = MLPProjector(cfg.vision_hidden, cfg.projection_hidden, cfg.text_hidden)
with torch.no_grad():
    _, cls = encoder(img)              # CLS 池化，无编码器梯度
    text_emb = text(ids)               # 冻结的 MockTextEmbedding
image_emb = projector(cls)
loss = cosine_alignment_loss(image_emb, text_emb)
```

## 桥接数值
type: defaults
from: phases/12-multimodal-ai/03-blip2-qformer-bridge/docs/zh.md, phases/12-multimodal-ai/04-flamingo-gated-cross-attention/docs/zh.md, phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/07-open-weight-vlm-recipes/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Q-Former 查询数 | 32 | BLIP-2 中训练 188M 参数 |
| Perceiver 潜变量 K | 64 | 经过 6 个重采样块 |
| 每 M 层放一个门控块 | 4 | Flamingo，alpha 初始为 0 |
| LLaVA 每图像 token 数 | 576 | 24x24 网格，MLP `1024 → 4096 → 4096` |
| AnyRes 每图像 token 数 | 2880 | 336x336 分块加一张缩略图 |
| 合适 token 区间 | 576-1024 | 64 对 OCR 太少 |
| 动态分辨率 | 最小 256，最大 1280 | 长边像素数 |

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md, phases/12-multimodal-ai/04-flamingo-gated-cross-attention/docs/zh.md, phases/12-multimodal-ai/07-open-weight-vlm-recipes/docs/zh.md, phases/12-multimodal-ai/03-blip2-qformer-bridge/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 图像 token 触发 `ValueError` | 占位符数量与图块数不同 | 预先填充每个样本至相同数量 |
| 自信地输出错误物体 | 12% 抓取配对缺少图像依据 | 跟踪 CMER，高 CMER 转人工评审 |
| 上下关系、计数错误 | VLM 空间测试得分为 50-60% | 使用姿态、深度或检测模型 |
| 调优后文本能力下降 | 门过快开得太大 | alpha 从 0 开始，检查门控调度 |
| OCR 弱 | 视觉 token 太少 | 使用 576-1024 token 或 AnyRes |
| 上下文迅速填满 | 每图像 576 token，每帧更多 | 使用 32 token 的 Q-Former |

## 缩写
type: glossary
from: phases/04-computer-vision/25-vision-language-models/docs/zh.md, phases/12-multimodal-ai/03-blip2-qformer-bridge/docs/zh.md, phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md

- **VLM**：视觉语言模型，图像编码器加完整语言模型。
- **ITC**：图文对比。在池化查询与文本 CLS 上计算 CLIP 式损失。
- **ITM**：图文匹配。在困难负样本上训练二分类器。
- **ITG**：以图像为依据的文本生成。在查询上计算因果 LM 损失。
- **CMER**：跨模态错误率，衡量幻觉的 KPI。
- **AnyRes**：将高分辨率图像拆为分块，拼接它们的 token。

## 问答
type: qa
from: phases/12-multimodal-ai/03-blip2-qformer-bridge/docs/zh.md, phases/12-multimodal-ai/04-flamingo-gated-cross-attention/docs/zh.md, phases/12-multimodal-ai/07-open-weight-vlm-recipes/docs/zh.md, phases/19-capstone-projects/61-cross-attention-fusion/docs/zh.md, phases/19-capstone-projects/60-projection-layer-modality-align/docs/zh.md

- **Q-Former 还是 MLP？** token 预算重要时选 Q-Former，每 token 质量重要时选 MLP。
- **BLIP-2 还是 Flamingo？** 预算有限的单图 VQA 选 BLIP-2，少样本、多图选 Flamingo。
- **alpha 为何初始化为 0？** 第 0 步模型就是在文本上运行的预训练 LLM。
- **交叉注意力为何无需掩码？** 在任何文本之前，整个图像已可见。
- **为何两层而非一层？** GELU 提供一次非线性弯折。单个线性层只能旋转和缩放。
- **先消融什么？** 视觉 token 数解释约 60% 方差，编码器约 20%，连接器约 5%。

## 默认开放权重 VLM 配置
type: tips
from: phases/12-multimodal-ai/07-open-weight-vlm-recipes/docs/zh.md

- 编码器：SigLIP 2 SO400m/14。分割或定位任务添加 DINOv2 ViT-g/14。
- 连接器：图块 token 上的 2 层 MLP。除非 token 受限，否则跳过 Q-Former。
- LLM：注重成本选 7B，注重质量选 70B。LLM 大小决定上限。
- 数据：PixMo + ShareGPT4V + Cauldron。密集人工描述优于蒸馏。
- 阶段 1 使用固定 384 分辨率。OCR 再提升至最高 1280 的动态分辨率。
- 先换编码器，再换连接器。SigLIP 相比 CLIP 使 MMMU 增加 3+ 个百分点。
