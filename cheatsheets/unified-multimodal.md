---
id: unified-multimodal
title: 统一多模态模型
code: UM
subtitle: 选择统一架构：离散 NTP、双损失扩散、掩码扩散、解耦编码器、下一尺度预测与任意模态互转。
hue: 290
sources: phases/08-generative-ai/19-visual-autoregressive-var, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens, phases/12-multimodal-ai/12-emu3-next-token-for-generation, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified, phases/12-multimodal-ai/15-janus-pro-decoupled-encoders, phases/12-multimodal-ai/16-mio-any-to-any-streaming
source_hash: 71d61aa3367b9d76
---

## 四类统一架构对比
type: comparison
span: 2
from: phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md, phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/docs/zh.md

| 比较项 | Chameleon, Emu3 | Transfusion | Show-o | Janus-Pro |
|---|---|---|---|---|
| 图像形式 | 离散 VQ token | 连续 16x16 图块 | 离散 VQ token | SigLIP 输入，VQ token 输出 |
| 图像损失 | 下一 token 交叉熵 | 流匹配 MSE | 掩码 token 上的交叉熵 | VQ token 上的下一 token 预测 |
| 图像注意力 | 因果 | 图像块内双向 | 图像块内双向 | 文本式共享主干 |
| 图像解码 | 1024-4096 次前向，逐 token 生成 | 10-30 步扩散 | 约 16 个并行步骤 | 逐 token 生成 |
| 视觉编码器 | 一个 VQ 分词器 | 线性图块投影 | 一个 VQ 分词器 | SigLIP 加 VQ 分词器 |
| 弱点 | 分词器上限，推理慢 | 损失权重需调优 | 分词器有损 | 需要训练两个分词器 |
| 关键数值 | Emu3 FID 5.4，SDXL 为 5.6 | 7B 时比 Chameleon 风格好 3-5 个 FID 点 | 约 16 步，对比约 1000 步 | GenEval 0.80，DALL-E 3 为 0.67 |

## 按场景选择
type: tips
from: phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md, phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/12-multimodal-ai/16-mio-any-to-any-streaming/docs/zh.md

- Chameleon 系列：需要一个解码器完成图像生成与混合模态输出。
- 适配器 VLM（LLaVA 系列）：只需要理解，能复用更多预训练计算。
- Emu3：希望一个检查点通过 prompt 模板完成图像生成、感知与视频任务。
- Transfusion：质量优先，且能承担双损失的集成复杂度。
- Show-o：希望一个开放模型以合理速度完成 T2I、图像修补和 VQA。
- Janus-Pro：同时需要理解和生成。只需生成时选择 SD3 或 Flux。
- VAR：希望约 10 次前向生成类别条件图像，对比 DiT 的 28-50 次。
- MIO：需要一个模型处理语音输入输出，TTFAB 低于 500ms。

## Janus-Pro 解耦路由
type: architecture
from: phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/docs/zh.md, phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/code/main.py

```arch
node | img | 1,1 | 输入图像 | | client
node | prompt | 1,2 | 文本 prompt | 任务标签选择路径 | client
node | siglip | 2,1 | SigLIP-SO400m | 后接 2 层 MLP
node | vqin | 2,2 | VQ 分词器 | 可选图像条件
node | body | 3,1 | 共享主干 | 由 DeepSeek-MoE-7B 初始化 | model
node | vqout | 3,2 | 图像 VQ token | 由主干预测
node | text | 4,1 | 文本输出 | 自回归
node | dec | 4,2 | VQ 解码器 | 像素
edge | img | siglip | 理解
edge | img | vqin | 生成
edge | prompt | body | 文本 token
edge | siglip | body |
edge | vqin | body |
edge | body | text |
edge | body | vqout |
edge | vqout | dec |
```

## Show-o 掩码采样循环
type: flow
from: phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/code/main.py, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md

1. **开始**：所有图像 token 都为 `MASK`。玩具实现的 `SEQ_LEN` 为 16，`VOCAB` 为 8。
2. **调度**：`cosine_schedule(T)` 为 T=8 个步骤各提供一个掩码比例。
3. **预测**：transformer 并行预测全部掩码 token。
4. **提交**：保留置信度最高的 token，`keep_ratio = max(0.15, 1 - ratios[step])`。
5. **重复**：其余 token 保持掩码，进入下一步。
6. **完成**：`step_unmask(tokens, prompt_seed, 1.0)` 填入所有仍被掩码的 token。

## 残差多尺度分词器（VAR）
type: annotated-code
lang: python
from: phases/08-generative-ai/19-visual-autoregressive-var/code/main.py

```python
SCALES = (1, 2, 4, 8)                       # 8x8 图像上的 4 个尺度
CODEBOOK = 16                               # 每个尺度的条目数
residual = img.copy()
for scale, book in zip(SCALES, codebooks):
    coarse = downsample(residual, scale)    # 池化到 scale x scale
    tok = encode(coarse, book)              # 最近码本项索引
    recon = book[tok]
    residual = residual - upsample(recon, IMG)  # 仍未捕获的部分
    tokens.append(tok)
out = out + upsample(book[tok], IMG)        # 解码器将所有尺度相加
```

## 双损失步骤（Transfusion）
type: annotated-code
lang: python
from: phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/code/main.py

```python
weights = {"text_scale": 0, "img_scale": 0, "text_w": 1.0, "img_w": 0.1}
mask = build_mask(tokens)                   # 文本因果，图像双向
text_loss = sum(cross_entropy_toy(p) for p in text_probs) / len(text_probs)
t = random.random()                         # 每张图像一个时间步
xt = (1 - t) * x + t * n                    # 加噪图块
target_vel = n - x                          # 速度目标
img_loss = mse(pred_flat, tgt_flat)         # 流匹配 MSE
total = weights["text_w"] * text_loss + weights["img_w"] * img_loss
```

## 代码任务
type: task-table
from: phases/08-generative-ai/19-visual-autoregressive-var/code/main.py, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/code/main.py, phases/12-multimodal-ai/12-emu3-next-token-for-generation/code/main.py, phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/code/main.py, phases/12-multimodal-ai/16-mio-any-to-any-streaming/code/main.py

| 任务 | 代码 |
|---|---|
| 每个尺度的残差 VQ token | `tokenize_multiscale(img, codebooks)` |
| 8x8 图像转为 4 个 token 标识 | `image_to_tokens(img)` |
| 统计图像 token | `TokCost("image 512x512", 512, 8).tokens()` |
| 混合引导 logits | `cfg_mix(cond_logits, uncond_logits, gamma)` |
| 温度为 0.8 时用 CFG 采样 | `sample_tokens(cond, uncond, gamma=3.0)` |
| 选择理解或生成 | `route(prompt)` |
| 布置四模态词表 | `build_vocab()` |
| 追踪 TTFAB 预算 | `streaming_decode_latency(model_size_b=8)` |

## 关键公式
type: concepts
from: phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/code/main.py, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md

- **残差 VQ**：$f \approx \sum_k \mathrm{upsample}(\mathrm{embed}(z_k))$。尺度 k 保存尺度 1 至 k-1 遗漏的部分。
- **流匹配**：$x_t = (1-t) x_0 + t \epsilon$。损失是 $v_\theta(x_t, t)$ 与 $\epsilon - x_0$ 的 MSE。
- **CFG**：混合值 = 无条件值 + gamma 乘以（有条件值减无条件值）。
- **余弦掩码比例**：$\cos(\pi t / 2T)$。第 0 步比例为 1.0，第 T 步无掩码。
- **Show-o 损失**：掩码 token 上的交叉熵。文本 NTP 只掩码最后一个 token。
- **Chameleon 词表**：32000 个文本标识加 8192 个图像标识，共 40192。
- **Emu3 视频**：4 s、8 FPS、256x256 对应 64 * 64 * 8 = 32,768 tokens。

## 应记住的数值
type: defaults
from: phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/12-multimodal-ai/16-mio-any-to-any-streaming/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Chameleon 码本 K | 8192 | 每张 512x512 图像为 1024 tokens |
| Emu3 码本 | 32768 | 每张 512x512 为 4096 tokens，PSNR 为 30.5 dB |
| CFG 引导权重 | 3.0-7.0 | 分别在有描述和无描述的条件下生成 |
| Emu3 温度 | 0.8 | 感知任务使用 1.0 |
| Transfusion 去噪步数 | 10-30 | 以前面的文本为条件 |
| MaskGIT 迭代 | 8-16 | 余弦调度效果良好 |
| VAR 尺度 K | 10 | 256x256 图像需要 10 次前向 |
| TTFAB 目标 | <500ms | 保持对话感 |

## 故障排查
type: troubleshooting
from: phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/16-mio-any-to-any-streaming/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 34B 早期融合训练发散 | 深层 logit 幅值爆炸 | 使用 QK-Norm，每次残差相加后加 dropout |
| 图像 PSNR 停在 26-28 dB | VQ-VAE 分词器质量上限 | 使用更好的分词器或连续图块 |
| 一个损失头占主导 | NTP 与扩散调度不匹配 | 调整损失权重 |
| 图像伪影 | 温度过高 | 图像生成使用 0.8 |
| 模式坍塌 | 温度过低 | 提高温度 |
| 每张 512x512 图像约 2 分钟 | 4096 tokens，速度为 30 tok/s | 使用推测解码，优化 KV 缓存 |
| 缺少跨模态上下文 | 跳过交错训练的第 2 阶段 | 训练全部四个课程阶段 |
| 语音质量差 | 跳过语音增强的第 3 阶段 | 添加第 3 阶段音频数据 |

## 缩写
type: glossary
from: phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/docs/zh.md, phases/12-multimodal-ai/12-emu3-next-token-for-generation/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/16-mio-any-to-any-streaming/docs/zh.md

- **VAR**：视觉自回归。在 VQ 网格金字塔上预测下一尺度。
- **VQ-VAE**：向量量化变分自编码器，将特征映射为码本索引。
- **NTP**：下一 token 预测，根据 token 0 至 i 预测 token i+1。
- **CFG**：无分类器引导，混合有条件和无条件 logits。
- **IBQ**：逆瓶颈量化器。Emu3 分词器类型，码本为 32768+。
- **MMDiT**：多模态 DiT，SD3 使用联合注意力的主干。
- **TTFAB**：首个音频字节延迟，从用户语音到首个音频输出。
- **Residual-VQ**：堆叠码本。基础层表示内容，后续层补充韵律。

## 问答
type: qa
from: phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/zh.md, phases/12-multimodal-ai/16-mio-any-to-any-streaming/docs/zh.md

- **一个视觉编码器为何不够？** VQ 编码语义较弱，SigLIP 特征不擅长重建。
- **Show-o 为何天然支持修补？** 训练任务就是预测掩码 token，遮住区域再预测即可。
- **VAR 为何快？** 一次 transformer 前向并行预测整个尺度。
- **Transfusion 文本关注什么？** 前面的文本和已有图像，图像可见其前面的文本。
- **Janus-Pro 为何超过 Janus？** 参数为 7B 对 1.3B，第 2 阶段样本对为 72M 对 26M。
- **MIO 如何区分标识？** 每种模态在同一词表中分配互不重叠的 ID 范围。
