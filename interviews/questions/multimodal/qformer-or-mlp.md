---
id: qformer-or-mlp
title: 连接器选型：Query 桥接层还是 MLP
card: multimodal
kind: tradeoff
level: 2
roles: [applied-ai-engineer, inference-engineer]
rounds: [system-design, ml-depth]
tags: [q-former, mlp-projector, token-budget, connector]
minutes: 12
lessons: [phases/12-multimodal-ai/03-blip2-qformer-bridge, phases/12-multimodal-ai/05-llava-visual-instruction-tuning, phases/12-multimodal-ai/07-open-weight-vlm-recipes]
manuals: []
practice: []
cheatsheet: [vlm-architectures, vlm-model-families]
related: [multimodal/image-tokens-per-image]
updated: 2026-11-03
---

正在为一款新产品在冻结的视觉编码器与保持冻结的大语言模型之间选型桥接层。一位架构师希望使用基于 Query 的 Transformer（如 Q-Former）将每张图像压缩为固定数量的 token。另一位架构师主张使用简单的 MLP，将每个 patch 对应的 token 原样透传。你会如何权衡并做出决策？

## Short answer

按 token 预算决定，而不是空谈质量。在固定视觉 token 数量的前提下，消融研究发现连接器架构的影响微乎其微，在均值池化 patch 的 MLP、Query 桥接层和重采样器之间差距在 1 分左右；全 patch MLP 会消耗更多 token，处于不同的预算区间。Query 桥接层无论分辨率如何都把图像限制在 32 个 token，代价是 188M 参数和两阶段预训练；MLP 输出每个 patch，336 像素图像为 576 个 token，仅约 22M 参数且使用单一语言建模损失。当上下文受限时（如长视频或多图）选用压缩桥接层；当注重单位 token 质量和简洁性且上下文足够时选用 MLP。

## Full answer

### 两种桥接层

| | Query 桥接层 | MLP |
|---|---|---|
| 单图视觉 token | 32 个，固定 | 336 像素 576 个，切片后约 2880 个 |
| 语言模型冻结时的可训练参数 | 188M | 约 22M |
| 预训练 | 表征阶段使用对比、匹配和生成损失，随后是生成阶段 | 全程使用语言建模损失 |
| 更换语言模型 | 重新训练桥接层 | 重新训练一个小投影头 |
| 多图与视频 | 较生硬，但节省 token | 自然拼接，但消耗大量 token |

### 消融实验的统一结论

几项受控研究得出了同一结论：在固定视觉 token 数量下，连接器解释了基准得分约 5% 的方差，单图 token 数量解释了约 60%，编码器解释了约 20%。在相同预算下，针对池化 patch 的 MLP 与 32 个 query 的桥接层差距在 1 分以内。因此关键在于能承受多少 token，以及使用哪个编码器。

### 路线分野的原因

压缩型桥接层胜在上下文预算受限的场景：长视频、单 prompt 多图、小上下文窗口。而在上下文扩大到 32k 及以上后，单图场景下 MLP 胜出，因为每个 patch 都能被语言模型看到，且无需调整第一阶段损失。消融给出的 token 预算：单图 64 个 token 不足以阅读文本，576 到 1024 是大多数任务的合适范围，2048 及以上只对文档和图表有用。

### Query 桥接层的隐形成本

它的 query 学习中间表征，语言模型随后必须对其解码，因此信息会在瓶颈中丢失。更换语言模型或编码器时需要重新训练。指令感知变体将指令传入 query，按问题专门特化，挽回部分损失。

### 决策规则

1. 计算当前分辨率下的单图 token 数量，并乘以每个 prompt 的图像数量。
2. 若能容纳在上下文中并留出文本空间，使用 MLP，把精力放在编码器和数据上。
3. 若容纳不下，使用压缩桥接层，并接受组件更换时的重训成本。

## Follow-ups

- **Level 2:** 为什么 Query 桥接层需要专门做独立的预训练？ Expected: 它的 Query 起初是随机初始化的，必须先学会从原始 patch 中提取与文本相关的特征，语言模型才看得懂；而 MLP 的输入本就是已蕴含语义的 patch。
- **Level 2:** 桥接层第一阶段预训练的三套损失函数分别起什么作用？ Expected: 池化 query 与文本的对比对齐、使用难负样本的匹配分类器，以及以图像为依据的文本生成，迫使 query 编码文本所需的信息。
- **Level 3:** 某团队此前选用了 MLP，现在需要上线 10 分钟长视频业务，他们首先会撞上什么瓶颈？ Expected: 上下文窗口爆炸；单帧 token 数乘以海量视频帧数会瞬间击穿任何窗口上限，他们最终不得不大幅抽稀帧率或换回压缩桥接层。
- **Level 3:** 既然连接器对得分影响微乎其微，多模态模型的质量到底来自哪里？ Expected: 视觉编码器能力、单图 token 数量、训练数据配比以及分辨率调度策略；配方课程的方差归因把连接器排在最末位。

## Wrong answers

- "Query 桥接层机制更高级，因此生成的回答必然更好。" 在同等 token 预算下两者表现差距在 1 分以内；其核心优势是压缩，而不是质量。
- "MLP 保留了全部 patch，因此在任何场景下都绝对更优。" 保留所有 patch 的代价是消耗巨额 token；面对多图或视频时上下文会过早耗尽。
- "先敲定桥接层结构，再去挑选视觉编码器。" 编码器和 token 数量决定了绝大部分模型表现方差；桥接层结构应当是整个系统最后调节的杠杆。

## Taught in

[BLIP-2 课程](../../../phases/12-multimodal-ai/03-blip2-qformer-bridge/)详解了 Query 桥接层与其二阶段训练，[LLaVA 课程](../../../phases/12-multimodal-ai/05-llava-visual-instruction-tuning/)对比了这两种桥接层，[开源训练配方课程](../../../phases/12-multimodal-ai/07-open-weight-vlm-recipes/)给出了严谨的消融实验结论。
