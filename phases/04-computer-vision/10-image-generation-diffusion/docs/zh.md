# 图像生成 —— 扩散模型

> 扩散模型学的是去噪。训练它从一张含噪图像里去掉一点点噪声，把这件事倒着重复一千遍，你就有了一个图像生成器。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 4 第 07 课（U-Net）、阶段 1 第 06 课（概率）、阶段 3 第 06 课（优化器）
**预计时间：** ~75 分钟

## 学习目标

- 推导前向加噪过程 `x_0 -> x_1 -> ... -> x_T`，解释为什么闭式 `q(x_t | x_0)` 对任意 t 都成立
- 实现一个 DDPM 风格的训练目标，回归每一步加入的噪声，再实现一个从纯噪声走回图像的采样器
- 搭一个时间条件 U-Net（小到能在 CPU 上训练），为任意时间步预测噪声
- 解释 DDPM 和 DDIM 采样的区别，以及各自何时合适（第 23 课深入讲 flow matching 和 rectified flow）

## 问题背景

GAN 一次性生成：噪声进、图像出，一次前向。它们快但难训练。扩散模型迭代生成：从纯噪声起步，小步去噪，图像浮现。它们慢但易训练。过去五年，后一个性质占了上风：任何小团队都能训练一个扩散模型并拿到像样的样本；而 GAN 训练是要靠多年失败的运行才学得会的手艺。

除了训练稳定性，扩散的迭代结构正是现代图像生成做的一切的解锁器：文本条件化、inpainting、图像编辑、超分辨率、可控风格。采样循环的每一步都是注入新约束的地方。这个钩子，就是为什么 Stable Diffusion、Imagen、DALL-E 3、Midjourney，以及你将用到的每个可控图像模型，都是基于扩散的。

这一课构建最小的 DDPM：前向加噪、反向去噪、训练循环。下一课（Stable Diffusion）把它接进一个带 VAE、文本编码器和无分类器引导的生产系统里。

## 核心概念

### 前向过程

拿一张图像 `x_0`。加一丁点高斯噪声得到 `x_1`。再多加一丁点得到 `x_2`。一直走 T 步，直到 `x_T` 几乎和纯高斯噪声无法区分。

```
q(x_t | x_{t-1}) = N(x_t; sqrt(1 - beta_t) * x_{t-1},  beta_t * I)
```

`beta_t` 是一个小的方差调度，通常在 T=1000 步上从 0.0001 线性增到 0.02。每一步都稍微缩小信号并注入新鲜噪声。

### 闭式跳跃

一步步加噪是一条马尔可夫链，但数学能折叠：你可以一步就从 `x_0` 直接采出 `x_t`。

```
定义 alpha_t = 1 - beta_t
定义 alpha_bar_t = prod_{s=1..t} alpha_s

那么：
  q(x_t | x_0) = N(x_t; sqrt(alpha_bar_t) * x_0,  (1 - alpha_bar_t) * I)

等价地：
  x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon
  其中 epsilon ~ N(0, I)
```

这一个方程就是扩散实用的全部原因。训练时你挑一个随机 `t`，从 `x_0` 直接采出 `x_t`，一步就训练——不需要模拟整条马尔可夫链。

### 反向过程

前向过程是固定的。反向过程 `p(x_{t-1} | x_t)` 才是神经网络要学的。扩散模型不直接预测 `x_{t-1}`；它们预测第 t 步加入的噪声 `epsilon`，再由数学从中导出 `x_{t-1}`。

```mermaid
flowchart LR
    X0["x_0<br/>（干净图像）"] --> Q1["q(x_t|x_0)<br/>加噪声"]
    Q1 --> XT["x_t<br/>（含噪）"]
    XT --> MODEL["model(x_t, t)"]
    MODEL --> EPS["预测的 epsilon"]
    EPS --> LOSS["对真实 epsilon<br/>做 MSE"]

    XT -.->|采样| STEP["p(x_{t-1}|x_t)"]
    STEP -.-> XT1["x_{t-1}"]
    XT1 -.->|重复 1000 次| X0S["x_0（采样得到）"]

    style X0 fill:#dcfce7,stroke:#16a34a
    style MODEL fill:#fef3c7,stroke:#d97706
    style LOSS fill:#fecaca,stroke:#dc2626
    style X0S fill:#dbeafe,stroke:#2563eb
```

### 训练损失

每个训练步：

1. 采一张真实图像 `x_0`。
2. 从 [1, T] 均匀采一个时间步 `t`。
3. 采噪声 `epsilon ~ N(0, I)`。
4. 算 `x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon`。
5. 用网络预测 `epsilon_theta(x_t, t)`。
6. 最小化 `|| epsilon - epsilon_theta(x_t, t) ||^2`。

就这样。神经网络学着预测任意时间步的噪声。损失是 MSE。没有对抗博弈，没有崩溃，没有震荡。

### 采样器（DDPM）

要生成：从 `x_T ~ N(0, I)` 起步，一步步往回走。

```
for t = T, T-1, ..., 1:
    eps = model(x_t, t)
    x_{t-1} = (1 / sqrt(alpha_t)) * (x_t - (beta_t / sqrt(1 - alpha_bar_t)) * eps) + sqrt(beta_t) * z
    其中 t > 1 时 z ~ N(0, I)，否则为 0
return x_0
```

关键在于：虽然反向条件分布一般没有闭式解，但对这个特定的高斯前向过程，它有。那些丑陋的系数就是贝叶斯法则给你的。

### 为什么是 1000 步

前向噪声调度的选法，要让每一步加的噪声刚好够多，使反向那一步近似高斯。步数太少，反向那一步离高斯很远，网络建模不好。步数太多，采样变贵而收益递减。T=1000 配线性调度是 DDPM 默认。

### DDIM：快 20 倍的采样

训练一样。采样变了。DDIM（Song 等人，2020）定义了一个确定性的反向过程，不重新训练就能跳过时间步。用 DDIM 采 50 步，能给出接近 1000 步 DDPM 的质量。每个生产系统都用 DDIM 或更快的变体（DPM-Solver、Euler ancestral）。

### 时间条件化

网络 `epsilon_theta(x_t, t)` 需要知道它在给哪个时间步去噪。现代扩散模型通过正弦时间嵌入（和 transformer 里位置编码同一个点子）注入 `t`，它们被加到 U-Net 每一层的特征图上。

```
t_embedding = sinusoidal(t)
feature_map += MLP(t_embedding)
```

没有时间条件化，网络就得从图像本身猜噪声水平，这能行，但样本效率低得多。

```figure
cv-diffusion-image
```

## 动手构建

### 第 1 步：噪声调度

```python
import torch

def linear_beta_schedule(T=1000, beta_start=1e-4, beta_end=2e-2):
    return torch.linspace(beta_start, beta_end, T)


def precompute_schedule(betas):
    alphas = 1.0 - betas
    alphas_cumprod = torch.cumprod(alphas, dim=0)
    return {
        "betas": betas,
        "alphas": alphas,
        "alphas_cumprod": alphas_cumprod,
        "sqrt_alphas_cumprod": torch.sqrt(alphas_cumprod),
        "sqrt_one_minus_alphas_cumprod": torch.sqrt(1.0 - alphas_cumprod),
        "sqrt_recip_alphas": torch.sqrt(1.0 / alphas),
    }

schedule = precompute_schedule(linear_beta_schedule(T=1000))
```

预计算一次，训练和采样时按索引 gather。

### 第 2 步：前向扩散（q_sample）

```python
def q_sample(x0, t, noise, schedule):
    sqrt_a = schedule["sqrt_alphas_cumprod"][t].view(-1, 1, 1, 1)
    sqrt_one_minus_a = schedule["sqrt_one_minus_alphas_cumprod"][t].view(-1, 1, 1, 1)
    return sqrt_a * x0 + sqrt_one_minus_a * noise
```

一行闭式。`t` 是一批时间步，batch 里每张图一个。

### 第 3 步：一个小小的时间条件 U-Net

```python
import torch.nn as nn
import torch.nn.functional as F
import math

def timestep_embedding(t, dim=64):
    half = dim // 2
    freqs = torch.exp(-math.log(10000) * torch.arange(half, device=t.device) / half)
    args = t[:, None].float() * freqs[None]
    emb = torch.cat([args.sin(), args.cos()], dim=-1)
    return emb


class TinyUNet(nn.Module):
    def __init__(self, img_channels=3, base=32, t_dim=64):
        super().__init__()
        self.t_mlp = nn.Sequential(
            nn.Linear(t_dim, base * 4),
            nn.SiLU(),
            nn.Linear(base * 4, base * 4),
        )
        self.t_dim = t_dim
        self.enc1 = nn.Conv2d(img_channels, base, 3, padding=1)
        self.enc2 = nn.Conv2d(base, base * 2, 4, stride=2, padding=1)
        self.mid = nn.Conv2d(base * 2, base * 2, 3, padding=1)
        self.dec1 = nn.ConvTranspose2d(base * 2, base, 4, stride=2, padding=1)
        self.dec2 = nn.Conv2d(base * 2, img_channels, 3, padding=1)
        self.time_proj = nn.Linear(base * 4, base * 2)

    def forward(self, x, t):
        t_emb = timestep_embedding(t, self.t_dim)
        t_emb = self.t_mlp(t_emb)
        t_proj = self.time_proj(t_emb)[:, :, None, None]

        h1 = F.silu(self.enc1(x))
        h2 = F.silu(self.enc2(h1)) + t_proj
        h3 = F.silu(self.mid(h2))
        d1 = F.silu(self.dec1(h3))
        d2 = torch.cat([d1, h1], dim=1)
        return self.dec2(d2)
```

两级 U-Net，在瓶颈处注入时间条件。对真实图像把深度和宽度放大。

### 第 4 步：训练循环

```python
def train_step(model, x0, schedule, optimizer, device, T=1000):
    model.train()
    x0 = x0.to(device)
    bs = x0.size(0)
    t = torch.randint(0, T, (bs,), device=device)
    noise = torch.randn_like(x0)
    x_t = q_sample(x0, t, noise, schedule)
    pred = model(x_t, t)
    loss = F.mse_loss(pred, noise)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    return loss.item()
```

这就是整个训练循环。没有 GAN 博弈，没有专门的损失，一次 MSE 调用。

### 第 5 步：采样器（DDPM）

```python
@torch.no_grad()
def sample(model, schedule, shape, T=1000, device="cpu"):
    model.eval()
    x = torch.randn(shape, device=device)
    betas = schedule["betas"].to(device)
    sqrt_one_minus_a = schedule["sqrt_one_minus_alphas_cumprod"].to(device)
    sqrt_recip_alphas = schedule["sqrt_recip_alphas"].to(device)

    for t in reversed(range(T)):
        t_batch = torch.full((shape[0],), t, dtype=torch.long, device=device)
        eps = model(x, t_batch)
        coef = betas[t] / sqrt_one_minus_a[t]
        mean = sqrt_recip_alphas[t] * (x - coef * eps)
        if t > 0:
            x = mean + torch.sqrt(betas[t]) * torch.randn_like(x)
        else:
            x = mean
    return x
```

1000 次前向产出一个 batch 的样本。真实代码里你会把它换成 DDIM 50 步采样器。

### 第 6 步：DDIM 采样器（确定性，快约 20 倍）

```python
@torch.no_grad()
def sample_ddim(model, schedule, shape, steps=50, T=1000, device="cpu", eta=0.0):
    model.eval()
    x = torch.randn(shape, device=device)
    alphas_cumprod = schedule["alphas_cumprod"].to(device)

    ts = torch.linspace(T - 1, 0, steps + 1).long()
    for i in range(steps):
        t = ts[i]
        t_prev = ts[i + 1]
        t_batch = torch.full((shape[0],), t, dtype=torch.long, device=device)
        eps = model(x, t_batch)
        a_t = alphas_cumprod[t]
        a_prev = alphas_cumprod[t_prev] if t_prev >= 0 else torch.tensor(1.0, device=device)
        x0_pred = (x - torch.sqrt(1 - a_t) * eps) / torch.sqrt(a_t)
        sigma = eta * torch.sqrt((1 - a_prev) / (1 - a_t) * (1 - a_t / a_prev))
        dir_xt = torch.sqrt(1 - a_prev - sigma ** 2) * eps
        noise = sigma * torch.randn_like(x) if eta > 0 else 0
        x = torch.sqrt(a_prev) * x0_pred + dir_xt + noise
    return x
```

`eta=0` 完全确定性（同样的噪声输入总是产出同样的输出）。`eta=1` 恢复成 DDPM。

## 实际使用

干生产活，用 `diffusers`：

```python
from diffusers import DDPMScheduler, UNet2DModel

unet = UNet2DModel(sample_size=32, in_channels=3, out_channels=3, layers_per_block=2)
scheduler = DDPMScheduler(num_train_timesteps=1000)
```

这个库提供现成的调度器（DDPM、DDIM、DPM-Solver、Euler、Heun）、可配置的 U-Net、文本到图像和图像到图像的 pipeline，以及 LoRA 微调 helper。

做研究的话，`k-diffusion`（Katherine Crowson）有最忠实的参考实现和最好的采样变体。

## 拿去用

这一课产出：

- `outputs/prompt-diffusion-sampler-picker.md` —— 一个 prompt，根据质量目标、延迟预算和条件化类型，在 DDPM / DDIM / DPM-Solver / Euler 之间挑选。
- `outputs/skill-noise-schedule-designer.md` —— 一个 skill，给定 T 和目标破坏程度，产出线性、余弦或 sigmoid 的 beta 调度，外加信噪比随时间变化的诊断图。

## 练习

1. **（简单）** 可视化前向过程：拿一张图像，在 `t in [0, 100, 250, 500, 750, 1000]` 处画出 `x_t`。验证 `x_1000` 看起来像纯高斯噪声。
2. **（中等）** 在合成圆形数据集上训练 TinyUNet 20 个 epoch，采样 16 个圆。对比 DDPM（1000 步）和 DDIM（50 步）采样——从同一个噪声种子出发，它们产出的图像相似吗？
3. **（困难）** 实现一个余弦噪声调度（Nichol & Dhariwal，2021）：`alpha_bar_t = cos^2((t/T + s) / (1 + s) * pi / 2)`。用线性和余弦调度训练同一个模型，展示余弦在低步数下给出更好的样本。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 前向过程 | "随时间加噪声" | 固定的马尔可夫链，在 T 步里把图像破坏成高斯噪声 |
| 反向过程 | "一步步去噪" | 学到的分布，从噪声走回图像 |
| Epsilon 预测 | "预测噪声" | 训练目标：`epsilon_theta(x_t, t)` 预测第 t 步加入的噪声 |
| Beta 调度 | "噪声量" | T 个小方差组成的序列，定义每步进入多少噪声 |
| alpha_bar_t | "累积保留因子" | (1 - beta_s) 直到时间 t 的乘积；t 越大，剩下的信号越少 |
| DDPM 采样器 | "祖先式、随机" | 从条件高斯里采出每个 x_{t-1}；1000 步 |
| DDIM 采样器 | "确定性、快" | 把采样改写成一个确定性 ODE；20-100 步、质量相近 |
| 时间条件化 | "告诉模型是哪个 t" | t 的正弦嵌入，注入 U-Net，让它知道噪声水平 |

## 延伸阅读

- [Denoising Diffusion Probabilistic Models (Ho et al., 2020)](https://arxiv.org/abs/2006.11239) —— 让扩散变实用、并在 FID 上击败 GAN 的那篇论文
- [Improved DDPM (Nichol & Dhariwal, 2021)](https://arxiv.org/abs/2102.09672) —— 余弦调度和 v-parameterisation
- [DDIM (Song, Meng, Ermon, 2020)](https://arxiv.org/abs/2010.02502) —— 让实时推理成为可能的确定性采样器
- [Elucidating the Design Space of Diffusion (Karras et al., 2022)](https://arxiv.org/abs/2206.00364) —— 对每个扩散设计选择的统一视角；当前最佳参考
