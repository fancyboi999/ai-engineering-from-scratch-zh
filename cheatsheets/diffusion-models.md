---
id: diffusion-models
title: 扩散与生成模型
subtitle: 训练、采样并评估 VAE、GAN、DDPM、潜空间扩散与流匹配。使用课程中的简化 Python 实现。
hue: 300
sources: phases/08-generative-ai/02-autoencoders-vae, phases/08-generative-ai/03-gans-generator-discriminator, phases/08-generative-ai/06-diffusion-ddpm-from-scratch, phases/08-generative-ai/07-latent-diffusion-stable-diffusion, phases/08-generative-ai/08-controlnet-lora-conditioning, phases/08-generative-ai/13-flow-matching-rectified-flows, phases/08-generative-ai/14-evaluation-fid-clip-score
code: DG
source_hash: 56a0bbf8bc754e83
---

## 带 CFG 的潜空间扩散
type: architecture
from: phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/02-autoencoders-vae/docs/zh.md

```arch
node | text | 1,1 | 文本编码器 | 冻结，CLIP 或 T5
node | noise | 1,2 | 含噪潜变量 | 初始为 N(0, I)
node | den | 2,1 | 去噪器 | U-Net 或 DiT
node | cfg | 3,1 | CFG 混合 | 有条件与无条件
node | lat | 4,1 | 干净潜变量 | 64 x 64 x 4
node | dec | 4,2 | VAE 解码器 | 潜变量转像素
node | img | 3,2 | 图像 | 512 x 512 x 3
node | enc | 2,2 | VAE 编码器 | 训练与 img2img
edge | text | den | 交叉注意力
edge | noise | den |
edge | den | cfg | 两个 eps
edge | cfg | lat | T 步
edge | lat | dec |
edge | dec | img |
edge | img | enc | 训练
edge | enc | noise | 加噪
```

## DDPM 训练与采样
type: flow
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/06-diffusion-ddpm-from-scratch/code/main.py

1. **调度**：$T$ 步内令 $\beta_t$ 从 1e-4 线性增至 0.02，再计算 $\bar\alpha_t$。
2. **采样**：从数据取 $x_0$，随机取 $t$，采样 $\epsilon \sim \mathcal{N}(0, I)$。
3. **加噪**：通过闭式表达式一次计算 $x_t$。
4. **预测**：网络接收 $x_t$ 与 $t$ 的正弦嵌入，输出 $\hat\epsilon$。
5. **损失**：计算 $\epsilon$ 与 $\hat\epsilon$ 的平方误差，再做梯度更新。
6. **开始采样**：采样 $x_T \sim \mathcal{N}(0, I)$。
7. **反向过程**：从 $t = T$ 到 1 执行反向步骤，除最后一步外每步都加噪。

## 关键公式
type: concepts
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md

- **前向过程**：$q(x_t \mid x_0) = \mathcal{N}\left( \sqrt{\bar\alpha_t} \, x_0, (1 - \bar\alpha_t) I \right)$
- **累积 alpha**：$\bar\alpha_t = \prod_{s=1}^{t} (1 - \beta_s)$
- **简化损失**：$L_{\text{simple}} = \lVert \epsilon - \epsilon_\theta(x_t, t) \rVert^2$
- **反向步骤**：$x_{t-1} = \frac{1}{\sqrt{\alpha_t}} \left( x_t - \frac{\beta_t}{\sqrt{1 - \bar\alpha_t}} \epsilon_\theta(x_t, t) \right) + \sigma_t z$
- **VAE 损失**：$\lVert x - \hat{x} \rVert^2 + \beta \sum_i \frac{\sigma_i^2 + \mu_i^2 - \log \sigma_i^2 - 1}{2}$
- **GAN 博弈**：$\min_G \max_D \, \mathbb{E}[\log D(x)] + \mathbb{E}[\log(1 - D(G(z)))]$
- **CFG**: $\epsilon_{\text{cfg}} = (1 + w) \epsilon_{\text{cond}} - w \epsilon_{\text{uncond}}$
- **流匹配**：$x_t = t x_1 + (1 - t) x_0$，$L = \lVert v_\theta(x_t, t) - (x_1 - x_0) \rVert^2$

## 代码任务
type: task-table
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/code/main.py, phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/code/main.py, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md

| 任务 | 代码 |
|---|---|
| 为 $x_0$ 加噪至步骤 $t$ | `x_t = math.sqrt(a_bar) * x0 + math.sqrt(1 - a_bar) * eps` |
| VAE 重参数化 | `[m + s * e for m, s, e in zip(mu, sigma, eps)]` |
| 非饱和 G 损失 | `-sum(math.log(max(p, 1e-8)) for p in d_fake) / len(d_fake)` |
| 为 CFG 丢弃标签 | `use_c = NULL_CLASS if rng.random() < 0.1 else c` |
| CFG 混合 | `eps_cfg = (1 + w) * eps_cond - w * eps_uncond` |
| 流匹配目标 | `target = x1 - x0` |
| 流的欧拉步骤 | `x -= dt * net_forward(x, t)` |
| 分块 VAE 解码 | `pipe.vae.enable_tiling()` |

## DDPM 调度、加噪与反向循环
type: annotated-code
lang: python
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/code/main.py

```python
betas = [1e-4 + (0.02 - 1e-4) * t / (T - 1) for t in range(T)]  # 线性
alphas = [1 - b for b in betas]
alpha_bars, cum = [], 1.0
for a in alphas:
    cum *= a
    alpha_bars.append(cum)                      # 累积乘积
eps = rng.gauss(0, 1)                           # 训练噪声
x_t = math.sqrt(a_bar) * x0 + math.sqrt(1 - a_bar) * eps  # 一次计算
x = rng.gauss(0, 1)                             # 从噪声开始采样
for t in range(T - 1, -1, -1):                  # 从 T-1 到 0
    eps_hat, _ = forward([x], t_emb, net)       # 预测噪声
    mean = (x - beta_t / math.sqrt(1 - alpha_bars[t]) * eps_hat[0]) / math.sqrt(alphas[t])
    x = mean + math.sqrt(beta_t) * rng.gauss(0, 1)  # 仅当 t > 0
```

## 采样器与步数
type: command-table
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md, phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md

| 采样器 | 步数 |
|---|---|
| DDPM | 论文使用 1000 个反向步骤 |
| DDIM | 20 至 50，训练目标相同 |
| DPM-Solver++ | 10 至 20 |
| UniPC | 8 至 16 |
| 流匹配，欧拉法 | 直线路径上 4 至 8 步 |
| Rectified flow，2 次 reflow | 2 至 4 |
| 蒸馏、一致性模型 | 1 至 4，需要重新训练 |
| VAE 或 GAN | 一次前向传播 |

## 默认值与数值
type: defaults
from: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/06-diffusion-ddpm-from-scratch/code/main.py, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| $\beta$ 起点 | 1e-4 | 线性调度 |
| $\beta$ 终点 | 0.02 | $x_T$ 接近 $\mathcal{N}(0, I)$ |
| 步数 $T$ | 1000 | 简化代码使用 40 |
| CFG 强度 $w$ | 3 | 3 至 7 通常效果较好 |
| CFG 标签丢弃率 | 10% | 训练时使用空 token |
| SD 1.x VAE 缩放因子 | 0.18215 | 编码后应用 |
| LoRA 秩 $r$ | 4-16 | 注意力层，重度微调使用 64 至 128 |
| FID 样本数 | 10k | N 过低会给出虚低 FID |

## 故障排查
type: troubleshooting
from: phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| $z$ 不携带 $x$ 的信息 | 后验坍塌，KL 占主导 | 将 $\beta$ 从 0 退火至 1，或使用 free bits |
| GAN 仅生成一种模式 | 模式坍塌 | 为 D 输入加噪、批内判别或 WGAN-GP |
| G 停止提升，D 准确率超过 95% | D 太强 | 将 D 学习率降低 2 至 5 倍 |
| 图像过饱和、油腻 | CFG 过高 | 将 $w$ 保持在 3 至 7 |
| 去噪器训练时潜变量方差错误 | 缺少 VAE 缩放因子 | 使用检查点的缩放因子 |
| SD 1.x VAE 在 1024² 出现 NaN | 转为 fp16 | 使用 fp16-fix VAE 或 bf16 |
| LoRA 没有效果 | 基座模型与训练时不同 | 使用匹配的基座模型 |
| FID 好得异常 | N 少于 10k | 至少 10k 样本，使用 3 个种子 |

## 缩略语
type: glossary
from: phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

- **VAE**：变分自编码器，编码器输出分布，KL 项约束潜空间。
- **ELBO**：证据下界，重建项减 KL，是 $\log p(x)$ 的下界。
- **GAN**：生成器 $G(z)$ 与判别器 $D(x)$ 的极小极大博弈。
- **DDPM**：Ho 等人，2020。线性 $\beta$、1000 步、U-Net。
- **DDIM**：非马尔可夫采样器，20 至 50 步，训练目标相同。
- **CFG**：无分类器引导，混合有条件与无条件预测。
- **DiT**：扩散 transformer，以潜变量分块上的 transformer 替代 U-Net。
- **FID**：Fréchet Inception 距离，衡量真实与生成特征高斯拟合的距离。

## 问答
type: qa
from: phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/zh.md, phases/08-generative-ai/13-flow-matching-rectified-flows/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md

- **为何输出 log σ² 而非 σ？** 输出无需受限，σ 接近 0 时 softplus 的梯度会消失。
- **VAE 样本为何模糊？** MSE 重建会给出多个合理输出的均值。
- **为何在潜空间扩散？** 64×64×4 潜变量以约少 64 倍的 FLOPs 达到相近质量。
- **流匹配与 DDPM 不同吗？** 对高斯路径，两者在代数上等价。
- **FID 如何计算？** 在 Inception-v3 特征上计算 $\lVert \mu_r - \mu_g \rVert^2 + \mathop{\mathrm{Tr}}(\Sigma_r + \Sigma_g - 2 (\Sigma_r \Sigma_g)^{0.5})$。越低越好。

## 提示
type: tips
from: phases/08-generative-ai/02-autoencoders-vae/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

- 使用闭式 KL，蒙特卡洛 KL 慢 3 倍。
- 每步为 G 生成新的假样本，否则梯度已经过期。
- 图像任务使用合适的时间嵌入，直接输入 $t$ 无效。
- 质量进入平台期时尝试余弦调度。
- ControlNet 权重和保持在 1.0 附近，LoRA 保持 $\alpha \le 1.5$。
- 同时报告 FID、CLIP 分数和人工偏好。
