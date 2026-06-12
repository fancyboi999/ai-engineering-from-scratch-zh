# CLIP 与对比式视觉-语言预训练

> OpenAI 的 CLIP（2021）证明了一个足以撑起后续五年的想法：只用嘈杂的网络图文对加一个对比损失，就能把图像编码器和文本编码器对齐到同一个向量空间。零监督标签。4 亿对。由此得到的嵌入空间能做零样本分类、图文检索，还能作为视觉塔插进每一个 2026 年的 VLM。SigLIP 2（2025）用 sigmoid 换掉 softmax，以更低的成本把规模推过了 CLIP。本节课把从 InfoNCE 到 sigmoid 成对损失的数学走一遍，并用纯标准库 Python 把训练步骤搭出来。

**类型：** Build
**语言：** Python（标准库，InfoNCE + sigmoid 损失实现）
**前置要求：** Phase 12 · 01（ViT patch）、Phase 7（Transformers）
**预计时间：** ~180 分钟

## 学习目标

- 从互信息推导出 InfoNCE 损失，并实现一个数值稳定的向量化版本。
- 解释为什么 sigmoid 成对损失（SigLIP）能扩展到 batch 32768+ 而不需要 softmax 所要求的 all-gather 开销。
- 通过构造文本模板（`a photo of a {class}`）并对余弦相似度取 argmax，跑一次零样本 ImageNet 分类。
- 说出 CLIP / SigLIP 预训练给你的四根杠杆：batch 大小、温度、prompt 模板、数据质量。

## 问题背景

CLIP 之前的视觉是监督式的。收集带标签的数据集（ImageNet：120 万张图，1000 个类别），训一个 CNN，发布。标签很贵，标签会偏向标注者能达成一致的东西，而且标签不经微调就无法迁移到新任务。

图文网络上免费躺着十亿多对松散标注的数据。一张金毛的照片配着 alt text "我家的狗 Max 在公园里"，本身就带着监督信号——这段文字描述了这张图。问题是：你能把它变成有用的训练吗？

CLIP 的答案：把图文对当成一个匹配任务。给定一批 N 张图和 N 段 caption，学着在 N-1 个干扰项之中把每张图匹配到属于它自己的 caption。监督信号是"这两个东西是一对；那 N-1 个不是"。没有类别标签。没有人工标注。只有一个对比损失。

由此得到的嵌入空间能做的事远超 CLIP 训练时的目标。ImageNet 零样本能work，是因为"a photo of a cat"嵌入到了那些从未被显式标为猫的猫图片附近。正是这个赌注催生了每一个 2026 年的 VLM。

## 核心概念

### 双编码器

CLIP 有两座塔：

- 图像编码器 `f`：ViT 或 ResNet，每张图输出一个 D 维向量。
- 文本编码器 `g`：小型 transformer，每段 caption 输出一个 D 维向量。

两座塔都把输出归一化成单位长度。因为两边都是单位范数，相似度就是 `cos(f(x), g(y)) = f(x)^T g(y)`。

对一批 N 个 (图像, caption) 对，构建形状为 `(N, N)` 的相似度矩阵 `S`：

```
S[i, j] = cos(f(x_i), g(y_j)) / tau
```

其中 `tau` 是一个可学习的温度（CLIP 初始化为 0.07；在 log 空间里学）。

### InfoNCE 损失

CLIP 在行和列上各做一次对称的交叉熵：

```
loss_i2t = CE(S, labels=identity)     # 每张图的正例是它自己的 caption
loss_t2i = CE(S^T, labels=identity)   # 每段 caption 的正例是它自己的图
loss = (loss_i2t + loss_t2i) / 2
```

这就是 InfoNCE。CE 里的 softmax 逼着每张图与它的 caption 比 batch 里其他所有 caption 更匹配。"负例"就是 batch 里其余所有项。batch 越大 = 负例越多 = 信号越强。CLIP 用 batch 32k 训；规模很要紧。

### 温度

`tau` 控制 softmax 的锐度。tau 低 → 分布尖锐，有难负例挖掘的效果。tau 高 → 柔和，所有样本都贡献。CLIP 学的是 log(1/tau)，做了裁剪以防塌缩。SigLIP 2 固定初始 tau，改用一个可学习的偏置。

### 为什么 sigmoid 扩展得更好（SigLIP）

softmax 需要整个相似度矩阵保持同步。在分布式训练里，你必须把每个嵌入 all-gather 到每个副本，再做 softmax。这在通信上是按 world size 平方增长的。

SigLIP 用逐元素的 sigmoid 换掉 softmax：对每一对 `(i, j)`，损失是一个"这两个是匹配对吗？"的二分类，正类标签是对角线，其余都是负类。损失为：

```
L = -1/N sum over (i, j) [ y_ij log sigmoid(S[i,j]) + (1-y_ij) log sigmoid(-S[i,j]) ]
```

`i == j` 时 `y_ij = 1`，否则为 0。每一对的损失彼此独立。不需要 all-gather。每张 GPU 算自己的本地块再求和。SigLIP 2 能廉价地扩展到 batch 32k-512k，而 CLIP 在这里需要成比例增长的通信。

### 零样本分类

给定 N 个类名，为每个类别构建一个文本模板：

```
"a photo of a {class}"
```

用文本编码器嵌入每个模板。用图像编码器嵌入你的图像。余弦相似度的 argmax = 预测类别。在目标类别上不做任何训练。

prompt 模板很要紧。CLIP 原论文每个类别用了 80 个模板（普通、艺术、照片、绘画等等）并把嵌入取平均，ImageNet +3 分。现代用法通常挑一两个模板。

### 线性探针与微调

零样本是个基线。线性探针（在冻结的 CLIP 特征之上为你的目标类别训一个线性层）在域内任务上胜过零样本。全量微调在域内胜过线性探针，但可能损害零样本迁移。三种范式，三种取舍。

### SigLIP 2：NaFlex 与密集特征

SigLIP 2（2025）新增：
- NaFlex：单个模型处理可变长宽比和分辨率。
- 更好的密集特征，用于分割和深度估计，瞄准在 VLM 里作为冻结骨干使用。
- 多语言：在 100+ 种语言上训练，而 CLIP 只有英语。
- 10 亿参数规模，而 CLIP 封顶在 4 亿。

在 2026 年的开放 VLM 里，SigLIP 2 SO400m/14 是默认视觉塔。CLIP 在纯图文检索里仍是默认选择——前提是它那套特定的 LAION-2B 训练分布与你的查询模式相符。

### ALIGN、BASIC、OpenCLIP、EVA-CLIP

ALIGN（Google，2021）：与 CLIP 同样的想法，18 亿对规模，90% 是噪声。证明了嘈杂数据也能 scale。OpenCLIP（LAION）：在 LAION-400M / 2B 上对 CLIP 的开放复现，多种规模，是首选的开放 checkpoint。EVA-CLIP：从掩码图像建模初始化；是 VLM 的强力骨干。BASIC：Google 的 CLIP+ALIGN 混合体。都是同一个家族，数据和调参不同。

### 零样本天花板

CLIP 类模型在 ImageNet 零样本上封顶在 76% 左右（CLIP-G、OpenCLIP-G）。再往上要么需要大得多的数据（SigLIP 2 拿到 80%+），要么需要架构改动（监督头、更多参数）。这个基准正在饱和；真正的价值是下游 VLM 消费的那个嵌入空间。

```figure
multimodal-fusion
```

## 实际使用

`code/main.py` 实现了：

1. 一个玩具双编码器（基于哈希的图像特征、字符级的文本特征），让你不用 numpy 就能看到 InfoNCE 的形状。
2. 纯 Python 的 InfoNCE 损失（用 log-sum-exp 保证数值稳定）。
3. 用于对比的 sigmoid 成对损失。
4. 一个零样本分类例程：对一组文本 prompt 计算余弦相似度，取 argmax 做预测。

跑一下，看损失曲线。绝对数值是玩具级的；曲线形状与真正的 CLIP 训练器吐出来的一致。

## 拿去用

本节课产出 `outputs/skill-clip-zero-shot.md`。给定一组图像（通过路径）和一个目标类别列表，它用 CLIP 模板构建文本 prompt，用指定的 checkpoint（如 `openai/clip-vit-large-patch14`）嵌入两侧，返回 top-1 / top-5 预测及相似度分数。这个 skill 拒绝对不在 prompt 列表里的类别下任何断言。

## 练习

1. 手算一个 4 对 batch 的 InfoNCE。构造 4x4 相似度矩阵，跑 softmax，挑出对角线，算交叉熵。拿这个手算结果验证你的 Python 实现。

2. SigLIP 在温度之外还用了一个偏置参数 `b`：`S'[i,j] = S[i,j]/tau + b`。当 batch 类别严重不平衡（每行负例远多于正例）时，`b` 起什么作用？读 SigLIP 第 3 节（arXiv:2303.15343）。

3. 为猫 vs 狗建一个零样本分类器。试两个 prompt 模板：`a photo of a {class}` 和 `a picture of a {class}`。在 100 张测试图上测准确率。模板集成是否胜过单模板？

4. 算一下 512 张 GPU、batch 32k 下 softmax InfoNCE 与 sigmoid 成对损失的通信成本。哪个是 O(N)，哪个是 O(N^2)？引用 SigLIP 第 4 节。

5. 读 OpenCLIP 缩放定律论文（arXiv:2212.07143，Cherti 等人）。从图里复现他们关于数据缩放的结论：在固定模型规模下，ImageNet 零样本准确率与训练数据规模之间是什么样的对数线性关系？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|----------------|------------------------|
| InfoNCE | "对比损失" | 在一个 batch 的相似度矩阵上做交叉熵；每项的正例是它配对的那项，负例是其余一切 |
| Sigmoid 损失 | "SigLIP 损失" | 逐对的二元交叉熵；无 softmax、无 all-gather，在分布式训练里廉价地扩展 |
| 温度 | "tau" | 在 softmax/sigmoid 之前缩放 logit 的标量；控制分布的锐度 |
| 零样本 | "免微调分类" | 用文本 prompt 构造类别嵌入并按余弦相似度分类；在目标类别上不训练 |
| Prompt 模板 | "a photo of a ..." | 围绕类名的文本脚手架；让零样本准确率波动 1-5 分 |
| 双编码器 | "双塔" | 一个图像编码器 + 一个文本编码器，输出在共享的 D 维空间里 |
| 难负例 | "难缠的干扰项" | 与正例相似到模型得费劲才能分开的负例 |
| 线性探针 | "冻结 + 一层" | 只在冻结特征之上训一个线性分类器；衡量特征质量 |
| NaFlex | "原生灵活分辨率" | SigLIP 2 的能力：以任意长宽比和分辨率摄入图像而无需缩放 |
| 温度缩放 | "对数参数化的 tau" | CLIP 参数化 `log(1/tau)` 让梯度表现良好；裁剪以防塌缩到接近零的 tau |

## 延伸阅读

- [Radford et al. — Learning Transferable Visual Models From Natural Language Supervision (arXiv:2103.00020)](https://arxiv.org/abs/2103.00020) —— CLIP 论文。
- [Zhai et al. — Sigmoid Loss for Language Image Pre-Training (arXiv:2303.15343)](https://arxiv.org/abs/2303.15343) —— SigLIP。
- [Tschannen et al. — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786) —— 多语言 + NaFlex。
- [Jia et al. — ALIGN (arXiv:2102.05918)](https://arxiv.org/abs/2102.05918) —— 用嘈杂网络数据 scale。
- [Cherti et al. — Reproducible scaling laws for contrastive language-image learning (arXiv:2212.07143)](https://arxiv.org/abs/2212.07143) —— OpenCLIP 缩放定律。
