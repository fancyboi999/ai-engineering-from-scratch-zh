# GAN —— 生成器 vs 判别器

> Goodfellow 在 2014 年的招数是干脆绕开密度。两个网络。一个造假，一个抓假。它们打到假货跟真货无法区分为止。这本不该有用。它经常也确实没用。一旦真有用了，在窄领域里它的样本仍然是文献里最锐的。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 3 · 02（反向传播）、阶段 3 · 08（优化器）、阶段 8 · 02（VAE）
**预计时间：** ~75 分钟

## 问题背景

VAE 产出模糊样本，是因为它的 MSE 解码器损失对*均值*图像才是贝叶斯最优的——而众多像样数字的均值是一个糊掉的数字。你想要一个奖励*像不像*的损失，而不是逐像素地贴近某一个目标。「像不像」没有闭式解。你只能把它学出来。

Goodfellow 的想法：训练一个分类器 `D(x)` 来区分真图和假图。训练一个生成器 `G(z)` 来骗过 `D`。`G` 的损失信号就是 `D` 当下认为什么东西看起来像真的。这个信号随着 `G` 变强而更新，追着一个移动的靶子跑。如果两个网络都收敛了，`G` 就在从没写下过 `log p(x)` 的情况下学会了数据分布。

这就是对抗训练。数学上是一个极小极大博弈：

```
min_G max_D  E_real[log D(x)] + E_fake[log(1 - D(G(z)))]
```

到 2026 年，GAN 不再是 SOTA 生成器了（扩散和流匹配抢走了这顶王冠）。但 StyleGAN 2/3 仍是史上上线过最锐的人脸模型，GAN 判别器在扩散训练里被用作*感知损失*，对抗训练还驱动着那些让你能上线实时扩散的快速一步蒸馏（SDXL-Turbo、SD3-Turbo、LCM）。

## 核心概念

![GAN 训练：生成器与判别器在极小极大博弈中](../assets/gan.svg)

**生成器 `G(z)`。** 把噪声向量 `z ~ N(0, I)` 映射成一个样本 `x̂`。一个解码器形状的网络（全连接或转置卷积）。

**判别器 `D(x)`。** 把一个样本映射成一个标量概率（或分数）。真 → 1，假 → 0。

**损失。** 两个交替的更新：

- **训练 `D`：** `loss_D = -[ log D(x) + log(1 - D(G(z))) ]`。在真=1、假=0 上做二元交叉熵。
- **训练 `G`：** `loss_G = -log D(G(z))`。这是 Goodfellow 用的*非饱和*形式（原始的 `log(1 - D(G(z)))` 在 `D` 自信时会饱和，把梯度搞死）。

**训练循环。** 走一步 `D`，走一步 `G`。重复。

**为什么有用。** 如果 `G` 完美匹配了 `p_data`，那么 `D` 不会比瞎猜更好，处处输出 0.5；`G` 再也拿不到梯度。这就是均衡。

**为什么会崩。** 模式坍缩（`G` 找到一个 `D` 分不出来的模式，就一直印它）、梯度消失（`D` 学得太快，`log D` 饱和）、训练不稳定（学习率、批大小，什么都算）。

## 让 GAN 跑起来的那些变体

| 年份 | 创新 | 修了什么 |
|------|------------|-----|
| 2015 | DCGAN | 卷积/反卷积、batch norm、LeakyReLU——第一个稳定的架构。 |
| 2017 | WGAN、WGAN-GP | 用 Wasserstein 距离 + 梯度惩罚替换 BCE。修了梯度消失。 |
| 2017 | 谱归一化 | 给判别器加 Lipschitz 界。2026 年的判别器里仍在用。 |
| 2018 | Progressive GAN | 先训低分辨率，再加层。第一批百万像素结果。 |
| 2019 | StyleGAN / StyleGAN2 | 映射网络 + 自适应实例归一化。固定领域写实度的顶尖水平。 |
| 2021 | StyleGAN3 | 无混叠、平移等变——2026 年仍是人脸的金标准。 |
| 2022 | StyleGAN-XL | 带条件、类别感知、更大规模。 |
| 2024 | R3GAN | 用更强的正则化重新包装；不靠花招就能在 1024² 上工作。 |

```figure
gan-minimax
```

## 动手构建

`code/main.py` 在一维数据上训练一个迷你 GAN：两个高斯的混合。生成器和判别器都是单隐层 MLP。我们手写前向、反向和极小极大循环。目标是在两个关键失效模式（模式坍缩 + 梯度消失）发生时亲眼看见它们。

### 第 1 步：非饱和损失

香草版的 Goodfellow 损失 `log(1 - D(G(z)))` 在 D 高自信地把 G 的假货判成假时趋于 0。到那时 G 的梯度基本为零——G 没法改进了。非饱和形式 `-log D(G(z))` 的渐近行为正相反：D 自信时它会爆掉，给 G 一个强信号。

```python
def g_loss(d_fake):
    # maximize log D(G(z))  <=>  minimize -log D(G(z))
    return -sum(math.log(max(p, 1e-8)) for p in d_fake) / len(d_fake)
```

### 第 2 步：每走一步生成器就走一步判别器

```python
for step in range(steps):
    # train D
    real_batch = sample_real(batch_size)
    fake_batch = [G(z) for z in sample_noise(batch_size)]
    update_D(real_batch, fake_batch)

    # train G
    fake_batch = [G(z) for z in sample_noise(batch_size)]  # fresh fakes
    update_G(fake_batch)
```

给 G 用新鲜的假货，否则梯度是过期的。

### 第 3 步：盯着模式坍缩

```python
if step % 200 == 0:
    samples = [G(z) for z in sample_noise(500)]
    mode_a = sum(1 for s in samples if s < 0)
    mode_b = 500 - mode_a
    if min(mode_a, mode_b) < 50:
        print("  [!] mode collapse: one mode is starved")
```

典型症状：两个真实模式里有一个不再被生成。判别器不再纠正它，因为它从没被当成假货见过。

## 坑

- **判别器太强。** 把 D 的学习率砍 2-5 倍，或者加实例/层噪声。如果 D 准确率超过 95%，G 就死了。
- **生成器背下了一个模式。** 给 D 的输入加噪声、用 minibatch-discriminator 层，或者换成 WGAN-GP。
- **batch norm 泄露统计量。** 真批和假批流过同一个 BN 层会把它们的统计量混在一起。改用实例归一化或谱归一化。
- **刷 Inception 分数。** FID 和 IS 在样本数少时很噪。评测用 ≥10k 个样本。
- **「一次到位采样」对条件任务是个谎言。** 你仍然需要 CFG 系数、截断技巧和重采样才能得到能用的输出。

## 实际使用

2026 年的 GAN 技术栈：

| 场景 | 选择 |
|-----------|------|
| 写实人脸、固定姿态 | StyleGAN3（最锐、最小） |
| 动漫 / 风格化人脸 | StyleGAN-XL 或 Stable Diffusion LoRA |
| 图到图翻译 | Pix2Pix / CycleGAN（阶段 8 · 04）或 ControlNet（阶段 8 · 08） |
| 快速一步文生图 | 对扩散做对抗蒸馏（SDXL-Turbo、SD3-Turbo） |
| 扩散训练器内部的感知损失 | 在图像裁块上跑一个小 GAN 判别器 |
| 任何多模态、开放式的东西 | 别——用扩散或流匹配 |

GAN 锐但窄。一旦你的领域放开了——照片、任意文本 prompt、视频——就换扩散。对抗这个招数作为一个组件（感知损失、蒸馏）继续活着，而不是作为独立的生成器。

## 拿去用

存为 `outputs/skill-gan-debugger.md`。技能接受一次失败的 GAN 训练（损失曲线、样本网格、数据集大小），输出一份排好序的可能原因清单、一行修复，以及一套重跑流程。

## 练习

1. **简单。** 用默认设置跑 `code/main.py`。然后设 `D_LR = 5 * G_LR` 再跑。G 的损失多快坍缩成一个常数？
2. **中等。** 把 Goodfellow 的 BCE 损失换成 WGAN 损失：`loss_D = E[D(fake)] - E[D(real)]`，`loss_G = -E[D(fake)]`，并把 D 的权重裁到 `[-0.01, 0.01]`。训练更稳了吗？比较墙钟收敛时间。
3. **困难。** 把这个一维例子扩到二维数据（一个环上的 8 个高斯混合）。追踪生成器在第 1k、5k、10k 步分别抓住了 8 个模式里的几个。实现 minibatch discrimination 后重新测量。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| 生成器 | 「G」 | 噪声到样本的网络，`G: z → x̂`。 |
| 判别器 | 「D」 | 分类器 `D: x → [0, 1]`，真 vs 假。 |
| 极小极大 | 「那个博弈」 | 对一个联合目标做 `min_G max_D`。 |
| 非饱和损失 | 「那个修法」 | G 用 `-log D(G(z))` 而不是 `log(1 - D(G(z)))`。 |
| 模式坍缩 | 「G 背下了一样东西」 | 数据明明多样，生成器却只产出寥寥几种不同的输出。 |
| WGAN | 「Wasserstein」 | 用推土机距离 + 梯度惩罚替换 BCE；梯度更平滑。 |
| 谱归一化 | 「Lipschitz 招数」 | 约束 D 的权重范数来限定它的斜率；稳定训练。 |
| StyleGAN | 「真能用的那个」 | 映射网络 + AdaIN；人脸领域同类最佳，2026 年依旧。 |

## 生产笔记：一次到位推理是 GAN 留存下来的优势

在开放领域生成上，GAN 在样本质量上不再占优，但在推理成本上仍然占优。用生产推理文献的词汇说，GAN 具有：

- **没有 prefill、没有 decode 阶段。** 单次 `G(z)` 前向。TTFT ≈ 总延迟。
- **没有 KV-cache 压力。** 唯一的状态就是权重。批大小受限于激活内存，而不是缓存。
- **连续批处理轻而易举。** 由于每个请求耗费相同的固定 FLOPs，在服务器目标占用率上跑一个静态批通常就是最优。不需要 in-flight 调度器。

这就是为什么 GAN 蒸馏（SDXL-Turbo、SD3-Turbo、ADD、LCM）是 2026 年快速文生图的主流技术：它把一条 20-50 步的扩散流水线压成 1-4 次 GAN 式前向，同时保留扩散基模型的分布。对抗损失作为一个训练期的旋钮活了下来，用来把慢生成器变成快生成器。

## 延伸阅读

- [Goodfellow et al. (2014). Generative Adversarial Nets](https://arxiv.org/abs/1406.2661) —— 最初那篇 GAN 论文。
- [Radford et al. (2015). Unsupervised Representation Learning with DCGAN](https://arxiv.org/abs/1511.06434) —— 第一个稳定的架构。
- [Arjovsky, Chintala, Bottou (2017). Wasserstein GAN](https://arxiv.org/abs/1701.07875) —— WGAN。
- [Miyato et al. (2018). Spectral Normalization for GANs](https://arxiv.org/abs/1802.05957) —— SN。
- [Karras et al. (2020). Analyzing and Improving the Image Quality of StyleGAN](https://arxiv.org/abs/1912.04958) —— StyleGAN2。
- [Karras et al. (2021). Alias-Free Generative Adversarial Networks](https://arxiv.org/abs/2106.12423) —— StyleGAN3。
- [Sauer et al. (2023). Adversarial Diffusion Distillation](https://arxiv.org/abs/2311.17042) —— SDXL-Turbo。
