# 开放权重 VLM 配方：到底什么才重要

> 2024-2026 年的开放权重 VLM 文献是一片消融实验表的森林。苹果的 MM1 测了 13 种图像编码器、连接器、数据配比的组合。Allen AI 的 Molmo 证明了详细的人工 caption 胜过 GPT-4V 蒸馏。Cambrian-1 跑了 20+ 个编码器对比。Idefics2 把五轴设计空间正式化。Prismatic VLMs 在一个受控基准上对比了 27 种训练配方。在所有这些噪声里，一小撮结论跨论文成立：图像编码器比连接器架构更要紧，数据配比比这两者都更要紧，详细的人工 caption 胜过蒸馏的合成数据。本节课替你把这些表读了。

**类型：** Learn + lab
**语言：** Python（标准库，消融表解析器 + 配方挑选器）
**前置要求：** Phase 12 · 05（LLaVA 基线）
**预计时间：** ~180 分钟

## 学习目标

- 说出五轴 VLM 设计空间：图像编码器、连接器、LLM、数据配比、分辨率方案。
- 读懂一张 MM1 / Idefics2 / Cambrian-1 消融表，预测哪根旋钮能撬动给定基准。
- 在给定算力预算和任务配比下，为一个新 VLM 挑一套配方（编码器、连接器、数据、分辨率）。
- 解释为什么在相同 token 数下详细的人工 caption 胜过 GPT-4V 蒸馏。

## 问题背景

存在数百个开放权重 VLM。"好"和"最先进"之间的差距大半不在架构。在数据、分辨率方案和编码器选择。当你的模型表现不佳时，知道先拧哪根旋钮，能帮你省下一个 500 万 GPU 小时的错误。

2023 年那一波（LLaVA-1.5、InstructBLIP、MiniGPT-4）跑的是 caption 对预训练 + LLaVA-Instruct-150k。不错的基线。封顶在 MMMU 35% 左右。

2024 年那一波（MM1、Idefics2、Molmo、Cambrian-1、Prismatic VLMs）跑了穷举式消融。结果既出人意料又实用。

## 核心概念

### 五轴设计空间

Idefics2（Laurençon 等人，2024）命名了这些轴：

1. 图像编码器。CLIP ViT-L/14、SigLIP SO400m/14、DINOv2 ViT-g/14、InternViT-6B。编码器在 patch 大小、分辨率和预训练目标上各不相同。
2. 连接器。MLP（2-4 层）、Q-Former（32 query + 交叉注意力）、Perceiver Resampler（64 query）、C-Abstractor（卷积 + 双线性池化）。
3. 语言模型。Llama-3 8B / 70B、Mistral 7B、Phi-3、Gemma-2、Qwen2.5。LLM 规模是主导的参数成本。
4. 训练数据。caption 对（CC3M、LAION）、交错数据（OBELICS、MMC4）、指令数据（LLaVA-Instruct、ShareGPT4V、PixMo、Cauldron）。
5. 分辨率方案。固定 224/336/448、AnyRes、原生动态。训练中渐增或恒定。

每个生产 VLM 都在每条轴上做一个选择。MMMU 分数的大部分方差由第 1、4、5 轴解释——而不是你挑了哪个连接器。

### 第 1 轴：编码器 > 连接器

MM1 第 3.2 节显示：从 CLIP ViT-L/14 换到 SigLIP SO400m/14，MMMU 加了 3+ 分。把连接器从 MLP 换成 Perceiver Resampler，加了不到 1 分。Idefics2 复现了：SigLIP > CLIP，相同 token 数下 Q-Former ≈ MLP ≈ Perceiver。

Cambrian-1 的"Cambrian 视觉编码器对决"（Tong 等人，2024）在一个以视觉为中心的基准（CV-Bench）上跑了 20+ 个编码器。排行榜顶部是 DINOv2 和 SigLIP 的混合；CLIP 居中；ImageBind 和 ViT-MAE 靠后。CLIP ViT-L 到 DINOv2 ViT-g/14 在 CV-Bench 上差约 5-7 分。

2026 年开放 VLM 的默认编码器是 SigLIP 2 SO400m/14（用于语义 + 密集特征），有时再拼上 DINOv2 ViT-g/14 的特征（Cambrian 的"空间视觉聚合器"就这么做）。

### 第 2 轴：连接器设计是平局

MM1、Idefics2、Prismatic 和 MM-Interleaved 全得出了同一个结论：在固定视觉 token 数下，连接器架构几乎不重要。在相同 token 预算下，对均值池化 patch 用的 2 层 MLP，性能与 32-query 的 Q-Former 相差不到 1 分。

真正要紧的是 token 数。视觉 token 越多 = LLM 算力越多 = 性能越好，到某点为止，之后收益递减。每张图 64 token 对 OCR 太少。576-1024 token 是大多数开放 VLM 的甜点区。2048+ 只对文档和图表有帮助。

Q-Former vs MLP 是个成本问题，不是质量问题：无论图像分辨率多高，Q-Former 都把 token 封顶在 32-64；MLP 吐出所有 patch token。对高分辨率输入，Q-Former 省 LLM 上下文；对低分辨率，差异就是噪声。

### 第 3 轴：LLM 规模设定上限

把 LLM 从 7B 翻倍到 13B，在每篇 VLM 论文里都可靠地给 MMMU 加 2-4 分。到 70B 你就饱和了大多数基准。VLM 的多模态推理上限就是 LLM 的文本推理上限——视觉编码器只能喂它，不能替它推理。

这就是 Qwen2.5-VL-72B 和 Claude Opus 4.7 在 MMMU-Pro 和 ScreenSpot-Pro 上碾压的原因：语言大脑巨大。一个 7B VLM 没法靠精巧的连接器设计去替代一个 70B VLM。

### 第 4 轴：数据——详细的人工 caption 胜过蒸馏

Molmo + PixMo（Deitke 等人，2024）是每个人都该读的 2024 年成果。Allen AI 让人工标注者用 1-3 分钟的密集语音转文字过程来描述图像，产出了 71.2 万张密集 caption 的图。训练数据里哪儿都没有 GPT-4V 蒸馏。

Molmo-72B 在全部 11 个基准上击败了 Llama-3.2-90B-Vision。差距不在架构——在 caption 质量。详细人工 caption 每张图含的信息比短网络 caption 多 5-10 倍，并且在 GPT-4V 蒸馏会幻觉的地方仍保持事实可靠。

ShareGPT4V（Chen 等人，2023）和 Cauldron（Idefics2）用混合的人工 + GPT-4V caption 沿用了同一套打法。趋势很清楚：对 2026 年的前沿来说，caption 密度 > caption 数量 > 蒸馏的便利。

### 第 5 轴：分辨率及其方案

Idefics2 的消融：384 -> 448 加 1-2 分。448 -> 980 配图像切分（AnyRes）在 OCR 基准上再加 3-5 分。固定分辨率训练在中等准确率处平台化；分辨率渐增（从 224 起，到 448 或原生收尾）训得更快、收得更高。

Cambrian-1 跑了分辨率 vs token 数的取舍：在固定算力下，你可以在低分辨率下要更多 token，或在高分辨率下要更少 token。OCR 上高分辨率赢；通用场景理解上低分辨率更多 token 赢。

2026 年的生产配方：阶段 1 在固定 384 下训，阶段 2 对 OCR 密集任务用最高 1280 的动态分辨率。

### Prismatic 的受控对比

Prismatic VLMs（Karamcheti 等人，2024）是那篇控制了所有轴的论文。同样的 13B LLM、同样的指令数据、同样的评测——一次只变一条轴。结果：

- 每张图的视觉 token 数解释了约 60% 的方差。
- 编码器选择解释约 20%。
- 连接器架构解释约 5%。
- 其余一切（数据配比、调度器、学习率）剩下的约 15%。

这是个粗略的分解，但它是文献里对"我该先消融什么"最干净的答案。

### 一个面向 2026 的挑选器

按照证据，2026 年一个新项目的默认开放 VLM 配方：

- 编码器：带 NaFlex 的原生分辨率 SigLIP 2 SO400m/14，如果你需要分割/grounding 就拼上 DINOv2 ViT-g/14 做密集特征。
- 连接器：patch token 上的 2 层 MLP。除非你受 token 约束，否则跳过 Q-Former。
- LLM：Qwen2.5 / Llama-3.1 / Gemma 2，求成本用 7B，求质量用 70B，按目标延迟来挑。
- 数据：PixMo + ShareGPT4V + Cauldron，再用任务专属指令数据补充。
- 分辨率：动态（长边最小 256、最大 1280 像素）。
- 方案：阶段 1 对齐（只训投影器），阶段 2 全量微调，阶段 3 任务专属微调。

这些默认值里的每一个，都能追溯到本节课末尾所引论文里某个实测的消融。

```figure
l5-vlm-recipe-knobs
```

## 实际使用

`code/main.py` 是一个消融表解析器加配方挑选器。它编码了 MM1 和 Idefics2 的消融表（精简版），让你查询：

- "给定预算 X 和任务 Y，哪套配方赢？"
- "如果我在一个 7B Llama 上把 SigLIP 换成 CLIP，预期 MMMU 变化多少？"
- "想要 80% 置信度的答案，我该先消融哪条轴？"

输出是一份排好序的配方列表，附带预期基准变化和一条"先消融什么"的建议。

## 拿去用

本节课产出 `outputs/skill-vlm-recipe-picker.md`。给定一个目标任务配比、一个算力预算和一个延迟目标，它产出一套完整配方（编码器、连接器、LLM、数据配比、分辨率方案），每个选择都引用了能佐证它的消融。它能阻止工程师每次开新 VLM 项目时都重新发明一遍 Idefics2 消融表。

## 练习

1. 读 MM1 第 3.2 节。在固定 2B LLM、预算 5000 万张图下，哪个编码器赢？换成 13B LLM 答案会反转吗？为什么？

2. Cambrian-1 发现拼接 DINOv2 + SigLIP 在以视觉为中心的基准上胜过单用任一个，但在 MMMU 上不加信号。预测哪些基准会涨、哪些保持不变。

3. 你的目标是一个跑在 2B LLM 上的移动 UI agent。挑编码器、连接器、分辨率和数据配比。用一张具体的消融表为每个选择辩护。

4. Molmo 出了 4B 和 72B 模型。4B 与闭源 7B VLM 旗鼓相当；72B 在 11/11 基准上击败 Llama-3.2-90B-Vision。这对 LLM 规模平台假说说明了什么？

5. 设计一张消融表，在一个 7B VLM 上把数据配比质量与编码器质量隔离开。最少需要几次训练？提出那四组轴设置。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 消融 | "拧一根旋钮" | 跑多次训练，彼此只在一条设计空间轴上不同，其余全保持恒定 |
| 连接器 | "桥" / "投影器" | 把视觉编码器输出映射进 LLM token 空间的可训练模块（MLP、Q-Former、Perceiver） |
| 详细人工 caption | "密集 caption" | 一段多句的人工撰写描述（通常 80-300 token），比网络 alt text 丰富 |
| 蒸馏 | "GPT-4V caption" | 由更强的专有 VLM 生成的训练数据；方便但易继承幻觉 |
| AnyRes / 动态分辨率 | "高分辨率路径" | 通过切块或 M-RoPE 喂入大于编码器原生分辨率的图像的策略 |
| 分辨率渐增 | "课程" | 从低分辨率起步并增大的训练方案，加速对齐学习 |
| 以视觉为中心的基准 | "CV-Bench / BLINK" | 侧重细粒度视觉感知而非偏语言推理的评测 |
| PixMo | "Molmo 的数据" | Allen AI 的 71.2 万张密集 caption 图数据集；把人工语音转写成密集 caption |

## 延伸阅读

- [McKinzie et al. — MM1 (arXiv:2403.09611)](https://arxiv.org/abs/2403.09611)
- [Laurençon et al. — Idefics2 / What matters building VLMs (arXiv:2405.02246)](https://arxiv.org/abs/2405.02246)
- [Deitke et al. — Molmo and PixMo (arXiv:2409.17146)](https://arxiv.org/abs/2409.17146)
- [Tong et al. — Cambrian-1 (arXiv:2406.16860)](https://arxiv.org/abs/2406.16860)
- [Karamcheti et al. — Prismatic VLMs (arXiv:2402.07865)](https://arxiv.org/abs/2402.07865)
