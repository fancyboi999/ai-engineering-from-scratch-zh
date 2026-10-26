---
id: gans
title: 从 DCGAN 到 StyleGAN
code: GA
subtitle: 损失、DCGAN 代码、Pix2Pix、CycleGAN 和 StyleGAN，以及默认值、故障特征与修正方法。
hue: 12
sources: phases/08-generative-ai/01-generative-models-taxonomy-history, phases/08-generative-ai/03-gans-generator-discriminator, phases/08-generative-ai/04-conditional-gans-pix2pix, phases/08-generative-ai/05-stylegan, phases/04-computer-vision/09-image-generation-gans
source_hash: 007ed77e22f94fc9
---

## StyleGAN 生成器
type: architecture
from: phases/08-generative-ai/05-stylegan/docs/zh.md

```arch
node | z | 1,1 | z | N(0, I)，512 维 | store
node | map | 2,1 | 映射网络 | 8 层 MLP | model
node | w | 3,1 | W 中的 w | 大致解耦 | store
node | const | 1,2 | 可学习常量 | 4×4×512 | store
node | synth | 2,2 | 合成块 | 上采样、卷积、AdaIN、噪声 | gpu
node | img | 3,2 | 图像 | 从 4 到 1024 | client
node | noise | 1,3 | 逐层噪声 | 可学习的逐通道缩放 | process
edge | z | map |
edge | map | w |
edge | w | synth | 每个块都使用 AdaIN
edge | const | synth |
edge | noise | synth |
edge | synth | img | 分辨率翻倍
```

## 一次训练步骤
type: flow
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/code/main.py

1. **采样**：抽取一批真实数据，并从 N(0, I) 采样噪声 `z`。
2. **D 步骤**：真实图像以 1 为目标评分，`G(z).detach()` 以 0 为目标评分。
3. **G 步骤**：重新生成假样本，以 1 为目标对 `D(G(z))` 评分。
4. **重复**：每批先执行一步 D，再执行一步 G。
5. **探测**：每 100 步统计各模态的样本数，低于 50 时警告。
6. **检查**：每个 epoch 结束时查看 64 个样本。
7. **平衡**：`p_G = p_data`，且 D 在各处都输出 0.5。

## 损失与公式
type: concepts
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md

- **极小极大**：$\min_G \max_D \; \mathbb{E}_x[\log D(x)] + \mathbb{E}_z[\log(1 - D(G(z)))]$
- **D 损失**：二元交叉熵，真实样本 = 1，假样本 = 0。
- **G 损失**：$-\log D(G(z))$，这是非饱和形式。
- **WGAN**：$\text{loss}_D = \mathbb{E}[D(\text{fake})] - \mathbb{E}[D(\text{real})]$，$\text{loss}_G = -\mathbb{E}[D(\text{fake})]$
- **Pix2Pix G**：$-\log D(x, G(x)) + \lambda \cdot \lVert y - G(x) \rVert_1$
- **循环**：$F(G(x)) \approx x$ 且 $G(F(y)) \approx y$。
- **AdaIN**：$y_{\text{scale}} \cdot \frac{x - \mathrm{mean}(x)}{\mathrm{std}(x)} + y_{\text{bias}}$
- **截断**：$w' = \hat{w} + \psi \cdot (w - \hat{w})$。$\psi < 1$ 用多样性换取质量。

## DCGAN train_step
type: annotated-code
lang: python
from: phases/04-computer-vision/09-image-generation-gans/code/main.py, phases/04-computer-vision/09-image-generation-gans/docs/zh.md

```python
opt_d.zero_grad()
d_real = D(real)                    # logits，sigmoid 仅在损失中使用
d_fake = D(G(z).detach())           # 梯度不流入 G
loss_d = (F.binary_cross_entropy_with_logits(d_real, torch.ones_like(d_real))
          + F.binary_cross_entropy_with_logits(d_fake, torch.zeros_like(d_fake)))
loss_d.backward()
opt_d.step()
opt_g.zero_grad()
d_fake = D(G(z))                    # 第二次前向传播保留计算图
loss_g = F.binary_cross_entropy_with_logits(d_fake, torch.ones_like(d_fake))
loss_g.backward()                   # 非饱和 G 损失
opt_g.step()
```

## 代码中的任务
type: task-table
from: phases/04-computer-vision/09-image-generation-gans/code/main.py, phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/code/main.py, phases/08-generative-ai/05-stylegan/code/main.py

| 任务 | 代码 |
|---|---|
| 构建生成器 | `Generator(z_dim=64, img_channels=3, feat=32)` |
| 为 D 的卷积封装 SN | `spectral_norm(c)` |
| 创建优化器 | `Adam(lr=2e-4, betas=(0.5, 0.999))` |
| 在评估模式采样 | `sample(G, n=8, z_dim=z_dim, device=device)` |
| 统计参数量 | `sum(p.numel() for p in G.parameters())` |
| 为 G 或 D 加入条件 | `inp = z + one_hot(c, num_classes)` |
| 将 z 映射到 w | `w = mapping(z, mapping_net)` |
| 截断 w | `w_bar[i] + psi * (w_test[i] - w_bar[i])` |

## 四种 GAN 对比
type: comparison
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md
span: 2

| 维度 | DCGAN | Pix2Pix | CycleGAN | StyleGAN |
|---|---|---|---|---|
| 输入 | 噪声 z | 图像 x，以 dropout 作为噪声 | X 域图像 | 将 z 映射到 w |
| 生成器 | 转置卷积、tanh 输出 | 带跳跃连接的 U-Net | G：X 到 Y，F：Y 到 X | 常量加逐块 AdaIN |
| 额外损失 | 无 | λ 乘 L1 | 循环一致性 | StyleGAN2 中的路径长度正则 |
| 数据 | 仅图像 | 配对的 (x, y) | 非配对 | 窄域、人脸 |
| 用途 | 32x32 基线 | 草图转照片 | 马转斑马、季节转换 | 逼真人脸、编辑 |

## 单次前向与多步生成
type: comparison
from: phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md

| 维度 | Pix2Pix | SD-Img2Img | SDXL-Turbo | ControlNet + SDXL |
|---|---|---|---|---|
| 步数 | 1 | 20 | 1-4 | 20-30 |
| 单张 L4 上生成 512² | ~30 ms | ~1.2 s | ~0.15-0.35 s | ~3-5 s |

## 默认值
type: defaults
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/04-computer-vision/09-image-generation-gans/code/main.py, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Adam `lr` | 2e-4 | DCGAN 的 G 和 D 默认值 |
| Adam `betas` | (0.5, 0.999) | 较低的 beta1 |
| `z_dim` | 64 | 32x32 DCGAN 的噪声维度 |
| D 的 LeakyReLU 斜率 | 0.2 | D 的所有层 |
| Pix2Pix 的 L1 权重 λ | 100 | 从这里开始，逐步退火降低 |
| PatchGAN 感受野 | 约 70×70 | 每个输出单元对应的像素范围 |
| 截断 ψ | 0.7 | 需要多样性时用 1.0 |
| TTUR 比率 | 2-4 | D 比 G 学得更快 |

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| D 损失低，G 损失振荡，多样性下降 | 模态坍塌 | 小批量判别、谱归一化、标签 |
| D 准确率约 100%，G 损失巨大且不变 | D 占优 | 缩小 D、降低 D 学习率、标签平滑 |
| 两种损失无趋势地摆动 | 振荡 | TTUR 或 Wasserstein 损失 |
| D 准确率超过 95% | D 太强 | 将 D 学习率降低 2-5 倍 |
| 某个真实模态从未出现 | G 记住了单一模态 | 为 D 输入加噪声，或使用 WGAN-GP |
| 输出忽略条件 | D 中的条件信号太弱 | 在 D 的早期加入条件，使用投影 D |
| Pix2Pix 输出模糊 | L1 权重过高 | 稳定后将 λ 退火降低 |
| 水滴伪影 | AdaIN 将均值归零 | 使用 StyleGAN2 的权重解调 |

## 术语
type: glossary
from: phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md

- **DCGAN**：步幅卷积、批归一化，G 用 ReLU，D 用 LeakyReLU。
- **WGAN-GP**：Wasserstein 距离加梯度惩罚。
- **SN**：谱归一化，约束 D 各层的 Lipschitz 常数。
- **TTUR**：双时间尺度更新规则，使用两种学习率。
- **cGAN**：条件 GAN，G(z, c) 与 D(x, c) 都接收条件。
- **PatchGAN**：D 输出 N × N 的逐图块得分网格。
- **AdaIN**：自适应实例归一化，先归一化，再由 w 控制缩放与偏移。
- **FID**：Fréchet Inception 距离，越低越好。

## 选择条件
type: tips
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/03-gans-generator-discriminator/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md, phases/08-generative-ai/01-generative-models-taxonomy-history/docs/zh.md

- **GAN**：低于 10 ms 的实时生成、风格迁移、图像到图像转换。
- **StyleGAN3**：固定姿态的逼真人脸。
- **Pix2Pix**：数千个配对样例、范围明确的任务、快速推理。
- **CycleGAN**：没有配对数据的图像转换。
- **冻结映射网络**：用少量图像进行域适配。
- **扩散或流匹配**：多模态或开放式任务。

## 问答
type: qa
from: phases/04-computer-vision/09-image-generation-gans/docs/zh.md, phases/08-generative-ai/04-conditional-gans-pix2pix/docs/zh.md, phases/08-generative-ai/05-stylegan/docs/zh.md, phases/08-generative-ai/01-generative-models-taxonomy-history/docs/zh.md

- **D 步骤为什么用 `G(z).detach()`？** 在 D 更新期间阻止梯度流入 G。
- **为什么用非饱和损失？** 早期 `D(G(z))` 接近零，原始 G 损失会导致梯度消失。
- **采样前为什么切换到评估模式？** 此时批归一化使用运行统计量。
- **D 为什么接收 (x, y) 对？** 没有 x，D 无法检查一致性。
- **StyleGAN 为什么仍在使用？** 只需一次前向传播，4090 上生成 1024² 人脸不到 10 ms。
- **GAN 能给出 p(x) 吗？** 不能。它是隐式密度模型，只能采样。
