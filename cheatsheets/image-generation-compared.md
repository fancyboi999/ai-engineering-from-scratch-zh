---
id: image-generation-compared
title: GAN、扩散与流模型对比
code: GD
subtitle: GAN、DDPM、潜在扩散、整流流 DiT、流匹配与 VAR。包含目标、步数、代码和修正方法。
hue: 315
sources: phases/04-computer-vision/09-image-generation-gans, phases/04-computer-vision/10-image-generation-diffusion, phases/04-computer-vision/11-stable-diffusion, phases/04-computer-vision/23-diffusion-transformers-rectified-flow, phases/08-generative-ai/13-flow-matching-rectified-flows, phases/08-generative-ai/19-visual-autoregressive-var
source_hash: cb411dddc4875cd0
---

## 采样成本对比
type: comparison
from: phases/04-computer-vision/10-image-generation-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md

| 模型族 | 计算次数 | 说明 |
|---|---|---|
| GAN | 一次前向传播 | 快，但难训练 |
| DDPM | 1000 | 线性 beta 调度 |
| DDIM | 50 | 确定性。与 DDPM 采用相同训练 |
| DPM-Solver++ 2M Karras | 20-30 | SD 生产默认选择 |
| 整流流（Euler） | 20-30 | SD3、FLUX、Z-Image |
| Schnell、Turbo、LCM | 1-4 | 从多步模型蒸馏而来 |
| VAR，K = 10 个尺度 | 10 次计算 | DiT 在 256x256 时需要 28-50 次 |

## 训练目标对比
type: comparison
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/10-image-generation-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md

| 模型族 | 目标 | 损失 |
|---|---|---|
| GAN 判别器 | P(real) | 对真实与生成样本计算二元交叉熵 |
| GAN 生成器 | `D(G(z))` | 越高越好。非饱和形式 |
| DDPM | `epsilon_theta(x_t, t)` | 对真实噪声计算 MSE |
| 整流流（4.23） | `epsilon - x0` | 对速度计算 MSE |
| 流匹配（8.13） | `x1 - x0` | 这里 x1 为噪声，x0 为数据 |
| VAR | 交叉熵 | 对下一尺度的 VQ 编码计算 |

## 选择条件
type: tips
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md

- **GAN**：10 ms 以内的实时生成、风格迁移、Pix2Pix 或 CycleGAN 转换。
- **SD 1.5 潜在扩散**：开源社区使用 LoRA 微调。
- **DiT + 整流流**：先进的文生图方案。FLUX.1-schnell 是开源默认选择。
- **蒸馏流（LCM-LoRA、schnell）**：延迟低于 1s，1-4 步。
- **流匹配**：除了图像，还适合音频、视频与科学领域。
- **VAR**：类别条件 ImageNet。计算次数少，具有 GPT 式扩展规律。

## Stable Diffusion 流水线
type: architecture
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md

```arch
node | txt | 1,1 | 文本 prompt | | client
node | te | 2,1 | 文本编码器 | CLIP-L 或 T5 | model
node | noise | 1,2 | 噪声 | 4x64x64 | store
node | unet | 3,1 | UNet | 对文本做交叉注意力 | gpu
node | sched | 3,2 | 调度器 | DPM-Solver++、Euler | process
node | lat | 2,2 | 干净潜变量 | 4x64x64 | store
node | vae | 2,3 | VAE 解码器 | | model
node | img | 3,3 | 图像 | 512x512 RGB | client
edge | txt | te |
edge | te | unet | 嵌入
edge | noise | unet |
edge | unet | sched |
edge | sched | lat |
edge | lat | vae |
edge | vae | img |
```

## 代码任务
type: task-table
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/10-image-generation-diffusion/code/main.py, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/code/main.py, phases/08-generative-ai/19-visual-autoregressive-var/code/main.py

| 任务 | 代码 |
|---|---|
| 带谱归一化的 GAN | `build_sn_discriminator()` |
| 线性 beta 调度 | `linear_beta_schedule(T=1000)` |
| DDPM 采样 | `sample_ddpm(model, schedule, shape)` |
| DDIM 采样 | `sample_ddim(..., steps=50, eta=0.0)` |
| 整流流训练步骤 | `rectified_flow_train_step(model, x0, ...)` |
| Euler 采样 | `rectified_flow_sample(model, shape, steps=20)` |
| 多尺度 VQ token | `tokenize_multiscale(img, codebooks)` |

## diffusers 调用
type: task-table
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md

| 任务 | 代码 |
|---|---|
| SD 文生图 | `guidance_scale=7.5, num_inference_steps=25` |
| 替换调度器 | `DPMSolverMultistepScheduler.from_config(...)` |
| 图生图 | `img2img(..., image=init_image, strength=0.6)` |
| 修补白色区域 | `inpaint(..., mask_image=mask)` |
| 融合 LoRA | `pipe.fuse_lora(lora_scale=0.8)` |
| FLUX.1-schnell | `guidance_scale=0.0, num_inference_steps=4` |
| SD 3.5 Large | `guidance_scale=3.5, num_inference_steps=28` |

## DDPM 与整流流对比
type: annotated-code
lang: python
from: phases/04-computer-vision/10-image-generation-diffusion/code/main.py, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/code/main.py

```python
t = torch.randint(0, T, (bs,), device=device)   # DDPM：整数步
x_t = q_sample(x0, t, noise, schedule)          # 闭式跳转
loss = F.mse_loss(pred, noise)                  # 预测噪声
t = torch.rand(n, device=device)                # RF：t 在 [0, 1] 内
x_t = (1 - t[:, None, None, None]) * x0 + t[:, None, None, None] * epsilon
target_v = epsilon - x0                         # 从数据到噪声的速度
loss = F.mse_loss(pred_v, target_v)
dt = 1.0 / steps                                # Euler，steps=20
for _ in range(steps):
    v = model(x, t)
    x = x - dt * v                              # 从噪声走向数据
    t = t - dt
```

## 一次 GAN 训练步骤
type: annotated-code
lang: python
from: phases/04-computer-vision/09-image-generation-gans/code/main.py, phases/04-computer-vision/09-image-generation-gans/docs/zh.md

```python
opt_d.zero_grad()
d_real = D(real)
d_fake = D(G(z).detach())                    # 梯度不传入 G
loss_d = (F.binary_cross_entropy_with_logits(d_real, torch.ones_like(d_real))
          + F.binary_cross_entropy_with_logits(d_fake, torch.zeros_like(d_fake)))
loss_d.backward()
opt_d.step()
opt_g.zero_grad()
d_fake = D(G(z))
loss_g = F.binary_cross_entropy_with_logits(d_fake, torch.ones_like(d_fake))  # 非饱和
loss_g.backward()
opt_g.step()
opt_g = torch.optim.Adam(G.parameters(), lr=2e-4, betas=(0.5, 0.999))  # DCGAN 默认值
```

## 关键公式
type: concepts
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/10-image-generation-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md

- **GAN 博弈**：$\min_G \max_D \; \mathbb{E}_x[\log D(x)] + \mathbb{E}_z[\log(1 - D(G(z)))]$
- **DDPM 跳转**：$x_t = \sqrt{\bar{\alpha}_t} \, x_0 + \sqrt{1 - \bar{\alpha}_t} \, \epsilon$，其中 $\bar{\alpha}_t = \prod_{s=1}^{t} \alpha_s$
- **CFG**：$\epsilon = \epsilon_{\text{uncond}} + w \cdot (\epsilon_{\text{cond}} - \epsilon_{\text{uncond}})$
- **整流流**：当 $t \in [0, 1]$ 时，$x_t = (1 - t) \, x_0 + t \, \epsilon$
- **速度形式的 CFG**：$v_{\text{cfg}} = (1+w) v_{\text{cond}} - w v_{\text{uncond}}$
- **潜空间节省**：(3*512*512)/(4*64*64) = 计算量减少 48x。

## VAR 下一尺度生成
type: flow
from: phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/code/main.py

1. **分词器**：多尺度残差 VQ。训练一次后冻结。
2. **尺度 1**：采样 z_1，共 1 个 token。
3. **尺度 2**：以 z_1 为条件并行采样 4 个 token。
4. **尺度 3**：以 z_1 和 z_2 为条件并行采样 16 个 token。
5. **解码**：将各尺度上采样后的嵌入相加。VAE 解码器生成图像。
6. **微型运行**：`SCALES = (1, 2, 4, 8)`、`CODEBOOK = 16`。总共 4 次计算。

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/code/main.py, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 样本多样性下降 | 模式坍塌 | 使用谱归一化或标签条件 |
| D 准确率约 100% | D 占优，G 梯度消失 | 缩小 D，降低 D 的学习率 |
| 两个损失来回波动，无趋势 | G 与 D 交替占优 | TTUR：让 D 的学习率为 2-4x |
| 样本依赖批次 | BN 使用批次统计量 | 采样前调用 `G.eval()` |
| 严重伪影 | 引导系数过高 | SD 使用 7.5，整流流使用 3.5-5 |

## 问答
type: qa
from: phases/04-computer-vision/10-image-generation-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/23-diffusion-transformers-rectified-flow/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md, phases/08-generative-ai/19-visual-autoregressive-var/docs/zh.md

- **扩散为何容易训练？** 损失为 MSE，没有对抗博弈。
- **整流流为何需要更少步数？** 路径接近直线。
- **VAR 为何快？** 一次计算生成一个尺度的全部 token，长度随尺度对数增长。
- **FLUX.1-schnell 为何使用引导系数 0.0？** 它训练时没有使用 CFG。
