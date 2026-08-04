# Janus-Pro：用于统一多模态模型的解耦编码器

> 统一多模态模型有个绕不开的张力。理解想要语义特征——SigLIP 或 DINOv2 输出富含概念级信息的向量。生成想要利于重建的编码——能组回清晰像素的 VQ token。这两个目标在单个编码器里不兼容。Janus（DeepSeek，2024 年 10 月）和 Janus-Pro（DeepSeek，2025 年 1 月）主张解法是别再硬凑：把两个编码器解耦。在任务间共享 transformer 主体，但理解走 SigLIP、生成走 VQ 分词器。在 7B 规模上，Janus-Pro 在 GenEval 上击败 DALL-E 3，同时在 MMMU 上追平 LLaVA。本节课通读为什么两个编码器能在一个失败的地方成功。

**类型：** Build
**语言：** Python（标准库，双编码器路由 + 共享主体信号）
**前置要求：** Phase 12 · 13（Transfusion）、Phase 12 · 14（Show-o）
**预计时间：** ~120 分钟

## 学习目标

- 解释为什么单个共享编码器会折损理解或生成质量。
- 描述 Janus-Pro 的路由：输入侧理解用 SigLIP 特征，生成在输入和输出两侧都用 VQ token。
- 追踪让 Janus-Pro 成功、而 Janus 失败的数据配比缩放。
- 把解耦（Janus-Pro）、耦合连续（Transfusion）、耦合离散（Show-o）三种架构作比较。

## 问题背景

统一模型在理解和生成之间共享一个 transformer 主体。先前的尝试（Chameleon、Show-o、Transfusion）都用一个视觉分词器服务两个方向。这个分词器是个折中：

- 为重建优化（生成）：VQ-VAE 捕捉细粒度像素细节，但产出的 token 语义连贯性弱。
- 为语义优化（理解）：SigLIP 嵌入把"猫"图聚到"猫"token 附近，但不允许好的重建。

Show-o 和 Transfusion 为此在某一个方向上付出了看得见的质量税。Janus-Pro 问：当两个任务需求不同时，为什么非要用一个分词器？

## 核心概念

### 解耦的视觉编码

Janus-Pro 的架构把两个编码器分开：

- 理解路径。输入图像 → SigLIP-SO400m → 2 层 MLP → transformer 主体。
- 生成路径。输入图像（若以现有图像为条件）→ VQ 分词器 → token ID → transformer 主体。
- 输出生成。transformer 预测的图像 token → VQ 解码器 → 像素。

transformer 主体是共享的。主体的上游和下游一切都是任务专属的。

输入靠 prompt 格式消歧：一个 `<understand>` 标签路由经 SigLIP；`<generate>` 路由经 VQ。或者路由由任务隐式决定。

### 为什么这能work

理解损失拿到 SigLIP 特征，CLIP 式预训练已为语义相似度调过它。模型的感知基准比 Show-o / Transfusion 提升，因为输入特征更契合任务。

生成损失拿到 VQ token，一个分词器已为重建调过它。图像质量比 Show-o 提升，因为 VQ 编码能干净地组回像素。

共享 transformer 主体看到两个输入分布（SigLIP 和 VQ），并学会与两者协作。断言是：足够的数据 + 足够的参数，主体能吸收这种切换。

### 数据缩放——Janus vs Janus-Pro

Janus（原版，arXiv 2410.13848）引入了解耦，但规模小（1.3B 参数，数据有限）。Janus-Pro（arXiv 2501.17811）做了缩放：

- 7B 参数（vs 1.3B）。
- 阶段 1（对齐）9000 万图文对，从 7200 万上调。
- 阶段 2（统一）7200 万，从 2600 万上调。
- 阶段 3 加了 20 万图像生成指令样本。

结果是：Janus-Pro-7B 在 MMMU 上追平 LLaVA（60.3 vs ~58），在 GenEval 上击败 DALL-E 3（0.80 vs 0.67）。一个开放模型，在统一光谱的两侧都有竞争力。

### JanusFlow —— rectified flow 变体

JanusFlow（arXiv 2411.07975）把 VQ 生成路径换成 rectified-flow 生成路径（连续）。划分变成"SigLIP 做理解 + rectified-flow 做生成"。质量天花板进一步抬高。架构仍是解耦编码器-共享主体。

### 共享主体的活

transformer 主体处理一条统一序列，但带两个输入分布。它的活是：

- 对理解：消费 SigLIP 特征 + 文本 token → 自回归吐文本。
- 对生成：消费文本 token + （可选的图像 VQ token）→ 自回归吐图像 VQ token。

主体没有每个块的模态专属权重。它就是你预期在 Qwen 或 Llama 里能找到的那种文本式 transformer，加上两个输入适配器。

有意思的是，这意味着 Janus-Pro 的主体可以从一个预训练 LLM 初始化。Janus-Pro 确实从 DeepSeek-MoE-7B 初始化。这个选择很要紧：LLM 贡献的推理能力，是纯从头训的统一模型难以企及的。

### 与 InternVL-U 的对比

InternVL-U（第 12.10 课）是 2026 年的续作。它结合了：

- 原生多模态预训练（InternVL3 骨干）。
- 解耦编码器路由（SigLIP 进，VQ + 扩散头出）。
- 统一理解 + 生成 + 编辑。

InternVL-U 把 Janus-Pro 的架构选择纳入一个更大的框架。解耦编码器的想法如今是规模化统一模型的默认。

### 局限

解耦编码器增加架构复杂度。两个分词器要训、两条输入路径要维护、两套失败模式。对不需要生成的产品，Janus-Pro 过度工程了——挑一个 LLaVA 家族的理解模型。

对不需要理解的产品，Janus-Pro 资历过剩——挑一个 Stable Diffusion 3 / Flux 模型。

对两者都需要的产品，Janus-Pro 如今是参考性的开放架构。

```figure
l5-janus-decouple
```

## 实际使用

`code/main.py` 模拟 Janus-Pro 路由：

- 两个模拟编码器：SigLIP 式（产出 256 维语义向量）和 VQ 式（产出整数编码）。
- 一个 prompt 路由器，基于任务标签挑编码器。
- 一个共享主体（替身），不管 token 序列由哪个编码器产出都处理它。
- 一个从阶段 1（对齐）到阶段 3（指令微调）的加权采样调度切换。

打印 3 个示例的路由路径：图像 QA、T2I、图像编辑。

## 拿去用

本节课产出 `outputs/skill-decoupled-encoder-picker.md`。给定一个想要在准前沿质量下做统一生成 + 理解的产品，它在 Janus-Pro、JanusFlow、InternVL-U 之间挑选，附一个具体的数据规模建议。

## 练习

1. Janus-Pro-7B 在 GenEval 上击败 DALL-E 3。解释为什么一个 7B 开放模型能在生成上追平前沿专有模型、却在理解上不能。

2. 实现一个路由函数：给定 prompt 文本，分类为 `understand` 或 `generate`。你怎么处理"描述然后画出来"这类模糊 prompt？

3. JanusFlow 把 VQ 路径换成 rectified flow。transformer 主体现在输出什么，损失有什么变化？

4. 提出 Janus-Pro 架构再加一个解耦编码器就能处理的第四个任务。例子：图像分割（DINO 式）、深度（MiDaS 式）。

5. 读 Janus-Pro 第 4.2 节关于数据缩放的内容。相对 Janus，哪个数据阶段对 T2I 质量增益贡献最大？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 解耦编码 | "两个视觉编码器" | 每个方向用独立分词器或编码器：理解用语义，生成用重建 |
| 共享主体 | "一个 transformer" | 单个 transformer 处理任一编码器的输出；无模态专属权重 |
| SigLIP 做理解 | "语义特征" | 提供丰富概念特征但重建差的 CLIP 家族视觉塔 |
| VQ 做生成 | "重建编码" | 能干净解码回像素的向量量化 token |
| JanusFlow | "rectified-flow 变体" | 用连续 flow-matching 生成头替代 VQ 的 Janus-Pro |
| 路由标签 | "任务标签" | 挑输入编码器的 prompt 标记（`<understand>` / `<generate>`） |

## 延伸阅读

- [Wu et al. — Janus (arXiv:2410.13848)](https://arxiv.org/abs/2410.13848)
- [Chen et al. — Janus-Pro (arXiv:2501.17811)](https://arxiv.org/abs/2501.17811)
- [Ma et al. — JanusFlow (arXiv:2411.07975)](https://arxiv.org/abs/2411.07975)
- [InternVL-U (arXiv:2603.09877)](https://arxiv.org/abs/2603.09877)
- [Dong et al. — DreamLLM (arXiv:2309.11499)](https://arxiv.org/abs/2309.11499)
