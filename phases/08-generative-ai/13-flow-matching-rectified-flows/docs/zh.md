# 流匹配与整流流

> 扩散模型采样要走 20-50 步，因为它从噪声到数据走的是一条弯路。流匹配（Lipman et al., 2023）和整流流（Liu et al., 2022）把路径训直了。路径越直，步数越少，推理越快。Stable Diffusion 3、Flux.1、AudioCraft 2 在 2024 年全都换成了流匹配。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 8 · 06（DDPM）、阶段 1 · 微积分
**预计时间：** ~45 分钟

## 问题背景

DDPM 的反向过程是从 `N(0, I)` 走回数据分布的一段 1000 步随机游走。DDIM 把它压成 20-50 步确定性步骤。你想要更少的步——理想是一步。拦路虎在于求解反向过程的那个 ODE 是刚性的；路径是弯的。

如果你能这样训模型：从噪声到数据的路径是一条*直线*，那么从 `t=1` 到 `t=0` 一个 Euler 步就行。流匹配直接构造这个：定义一条从 `x_1 ∼ N(0, I)` 到 `x_0 ∼ data` 的直线插值，训一个向量场 `v_θ(x, t)` 去匹配它的时间导数，推理时积分。

整流流（Liu 2022）更进一步：用一个 reflow 过程迭代地把路径拉直，产出一个越来越接近线性的 ODE。两次 reflow 迭代后，一个 2 步采样器就能追平 50 步 DDPM 的质量。

## 核心概念

![流匹配：噪声与数据之间的直线插值](../assets/flow-matching.svg)

### 直线流

定义：

```
x_t = t · x_1 + (1 - t) · x_0,   t ∈ [0, 1]
```

其中 `x_0 ~ data`，`x_1 ~ N(0, I)`。沿这条直线的时间导数是常数：

```
dx_t / dt = x_1 - x_0
```

定义一个神经向量场 `v_θ(x_t, t)`，训它去匹配这个导数：

```
L = E_{x_0, x_1, t} || v_θ(x_t, t) - (x_1 - x_0) ||²
```

这就是**条件流匹配**损失（Lipman 2023）。训练是免仿真的：你从不展开那个 ODE。只采 `(x_0, x_1, t)` 然后回归。

### 采样

推理时，沿时间*往回*积分学出来的向量场：

```
x_{t-Δt} = x_t - Δt · v_θ(x_t, t)
```

从 `x_1 ~ N(0, I)` 起步，Euler 步降到 `t=0`。

### 整流流（Liu 2022）

直线流能用，但学出来的路径*其实并不直*——它们会弯，因为许多个 `x_0` 可以映到同一个 `x_1`。整流流的 reflow 步：

1. 用随机配对训出流模型 v_1。
2. 通过把 v_1 从 `x_1` 积分到它的落点 `x_0`，采 N 个对 `(x_1, x_0)`。
3. 在这些配对样本上训 v_2。因为这些对现在是「ODE 匹配」的，它们之间的直线插值真正变得更平。
4. 重复。

实践中 2 次 reflow 迭代就能让你接近线性，实现 2-4 步推理。SDXL-Turbo、SD3-Turbo、LCM 全都是从流匹配蒸馏出来的模型。

### 为什么它 2024 年在图像上胜出

三个原因：

1. **免仿真训练**——训练时不展开 ODE，实现起来轻而易举。
2. **更好的损失几何**——直路径有一致的信噪比，而 DDPM 的 ε 损失在调度两端的 SNR 很差。
3. **更快的推理**——SDXL-Turbo 质量下 4-8 步；一致性蒸馏下 1 步。

## 流匹配 vs DDPM —— 确切的联系

带高斯条件路径的流匹配就是*带特定噪声调度*的扩散。挑 `x_t = α(t) x_0 + σ(t) x_1` 这个调度，流匹配就还原出 Stratonovich 重述的扩散，`v = α'·x_0 - σ'·x_1`。对高斯路径，两者在代数上等价。

流匹配多带来的：目标的*清晰*（一个朴素的速度）、更干净的损失，以及拿非高斯插值去做实验的许可。

```figure
normalizing-flow
```

## 动手构建

`code/main.py` 在一个双峰高斯混合上实现一维流匹配。向量场 `v_θ(x, t)` 是一个用直线目标训的迷你 MLP。推理时积分 1、2、4、20 个 Euler 步，比较样本质量。

### 第 1 步：训练损失

```python
def train_step(x0, net, rng, lr):
    x1 = rng.gauss(0, 1)
    t = rng.random()
    x_t = t * x1 + (1 - t) * x0
    target = x1 - x0
    pred = net_forward(x_t, t)
    loss = (pred - target) ** 2
    # backprop + update
```

### 第 2 步：多步推理

```python
def sample(net, num_steps):
    x = rng.gauss(0, 1)
    for i in range(num_steps):
        t = 1.0 - i / num_steps
        dt = 1.0 / num_steps
        x -= dt * net_forward(x, t)
    return x
```

### 第 3 步：比较步数

预期 4 步采样器就已经能追平 20 步的质量——这对延迟是件大事。

## 坑

- **时间参数化。** 流匹配用 `t ∈ [0, 1]`，`t=0` 在数据端、`t=1` 在噪声端。DDPM 用 `t ∈ [0, T]`，`t=0` 在数据端、`t=T` 在噪声端。方向相同，尺度不同。论文里老是搞错这个。
- **调度选择。** 整流流的直线是「那个」流匹配调度，但你可以用余弦或 logit-normal 的 t 采样（SD3 就这么干）来更好地覆盖尺度。
- **reflow 成本。** 为 reflow 生成配对数据集，每个样本是一整趟推理。只在你真需要 1-2 步推理时才做 reflow。
- **无分类器引导仍然适用。** 只要在线性组合里把 ε 换成 v：`v_cfg = (1+w) v_cond - w v_uncond`。

## 实际使用

| 使用场景 | 2026 年的栈 |
|----------|-----------|
| 文生图、最佳质量 | 流匹配：SD3、Flux.1-dev |
| 文生图、1-4 步 | 蒸馏的流匹配：Flux.1-schnell、SD3-Turbo、SDXL-Turbo |
| 实时推理 | 从流匹配基模型做一致性蒸馏（LCM、PCM） |
| 音频生成 | 流匹配：Stable Audio 2.5、AudioCraft 2 |
| 视频生成 | 流匹配与扩散混合（Sora、Veo、Stable Video） |
| 科学 / 物理（粒子轨迹、分子） | 流匹配 + 等变向量场 |

2025-2026 年只要论文说「比扩散快」，它几乎总是流匹配 + 蒸馏。

## 拿去用

存为 `outputs/skill-fm-tuner.md`。技能接受一个扩散风格的模型规格，把它转成一个流匹配训练配置：调度选择、时间采样分布（均匀 / logit-normal）、优化器、reflow 计划、目标步数、评测流程。

## 练习

1. **简单。** 跑 `code/main.py`，比较相对真实数据分布的 1 步 vs 20 步 MSE。
2. **中等。** 把均匀 `t` 采样换成 logit-normal（把采样集中在中段 t）。模型质量提升了吗？
3. **困难。** 实现一次 reflow 迭代：积分第一个模型生成配对的 (x_0, x_1)，在这些对上训第二个模型，比较 1 步样本质量。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| 流匹配 | 「直线扩散」 | 训 `v_θ(x, t)` 沿插值匹配 `x_1 - x_0`。 |
| 整流流 | 「Reflow」 | 把学出来的流拉直的迭代过程。 |
| 速度场 | 「v_θ」 | 模型的输出——移动 `x_t` 的方向。 |
| 直线插值 | 「那条路径」 | `x_t = (1-t)·x_0 + t·x_1`；目标导数极简单。 |
| Euler 采样器 | 「一阶 ODE 求解器」 | 最简单的积分器；路径直时效果好。 |
| logit-normal t | 「SD3 采样」 | 把 `t` 采样集中到梯度最强的中段值。 |
| 一致性蒸馏 | 「一步采样器」 | 训一个学生把任意 `x_t` 直接映到 `x_0`。 |
| 带速度的 CFG | 「v-CFG」 | `v_cfg = (1+w) v_cond - w v_uncond`；同样的招数，新变量。 |

## 生产笔记：Flux.1-schnell 是流匹配最快的样子

流匹配的生产胜果是 Flux.1-schnell——一个被蒸馏到 1-4 步推理、同时保持 Flux-dev 级质量的流匹配 DiT。Niels 的「在 8GB 机器上跑 Flux」笔记本是参考部署配方：T5 + CLIP 编码，量化的 MMDiT 去噪（schnell 用 4 步而 dev 用 50 步），VAE 解码。成本账：

| 变体 | 步数 | L4 上 1024² 的延迟 | 总 FLOPs（相对） |
|---------|-------|------------------------|------------------------|
| Flux.1-dev（原始） | 50 | ~15 s | 1.0× |
| Flux.1-schnell | 4 | ~1.2 s | 0.08×（快 12 倍） |
| SDXL-base | 30 | ~4 s | 0.25× |
| SDXL-Lightning 2-step | 2 | ~0.3 s | 0.03× |

生产法则：**流匹配基模型 + 蒸馏 = 2026 年快速文生图的默认。** 每个主流厂商都上线这个组合：SD3-Turbo（SD3 + 流 + 蒸馏）、Flux-schnell（Flux-dev + 整流流拉直）、CogView-4-Flash。纯扩散基模型只在遗产检查点里还存在。

## 延伸阅读

- [Liu, Gong, Liu (2022). Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow](https://arxiv.org/abs/2209.03003) —— 整流流。
- [Lipman et al. (2023). Flow Matching for Generative Modeling](https://arxiv.org/abs/2210.02747) —— 流匹配。
- [Esser et al. (2024). Scaling Rectified Flow Transformers for High-Resolution Image Synthesis](https://arxiv.org/abs/2403.03206) —— SD3，规模化的整流流。
- [Albergo, Vanden-Eijnden (2023). Stochastic Interpolants](https://arxiv.org/abs/2303.08797) —— 涵盖 FM + 扩散的通用框架。
- [Song et al. (2023). Consistency Models](https://arxiv.org/abs/2303.01469) —— 扩散 / 流的一步蒸馏。
- [Sauer et al. (2023). Adversarial Diffusion Distillation (SDXL-Turbo)](https://arxiv.org/abs/2311.17042) —— turbo 变体。
- [Black Forest Labs (2024). Flux.1 models](https://blackforestlabs.ai/announcing-black-forest-labs/) —— 生产中的流匹配。
