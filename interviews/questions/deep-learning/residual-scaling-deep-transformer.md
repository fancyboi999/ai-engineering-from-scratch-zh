---
id: residual-scaling-deep-transformer
title: 为什么深层残差堆叠仅靠 Kaiming 初始化是不够的
card: deep-learning
kind: concept
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, design-review]
tags: [weight-initialization, residual-connections, transformers, variance]
minutes: 12
lessons: [phases/03-deep-learning-core/08-weight-initialization]
manuals: []
practice: []
cheatsheet: [deep-learning-training]
related: [deep-learning/kaiming-factor-of-two, deep-learning/layernorm-not-batchnorm]
updated: 2026-11-03
---

一个采用 Kaiming 初始化的 Transformer 模型在 20 层时训练非常平稳，但在采用相同配方扩展到 126 层时直接发生发散崩溃。所有其他配置完全未变。请解释为什么即便采用了方差保持初始化，增加网络深度依然会引发崩溃，以及 GPT-2 风格的修复方案是如何解决该问题的。

## Short answer

Kaiming 初始化只能保证通过每个独立子层时的信号方差保持恒定，但残差结构会将子层的输出直接加回到输入张量上，独立随机变量相加会导致方差直接叠加。经过 N 次残差加法叠加后，主干残差流的方差会与 N 成正比线性膨胀，因此网络越深，残差信号的幅值就越庞大，基于其构建的自注意力 logits 与前馈激活值也会随之增大。GPT-2 方案将向残差主干写入的投影层权重缩放 1 / sqrt(2N)，使得无论网络多深，累积的残差方差在任意深度都保持稳定。

## Full answer

### 两种方差保持概念的区别

Kaiming 初始化解决的是单个矩阵乘法后接 ReLU 时，如何使输出信号的方差与输入信号的方差保持一致。它完全不感知后续的计算图拓扑结构。在残差结构块中，下一个计算是加法运算：

```text
x = x + sublayer(x)
```

若子层的输出方差与 x 大致相等，且两者近似独立，两者的相加和的方差大约翻倍。每个残差块都会发生一次方差累加。经过 N 个残差块累加后，残差流方差与 N 成正比。课程明确指出了这一点：每一次加法都在增加方差，在 N 个残差层之后方差呈线性增长。

### 为什么在深度增加时该缺陷集中爆发

在 20 层时，方差增长幅度有限，优化器尚能应对。但在 126 层（课程引用的 405B 参数大模型深度）下，残差流在初始状态下已经膨胀到了很大的尺度，导致自注意力内部的 Softmax 计算以及前馈网络中的非线性激活完全脱离了预期的工作区间，最初的梯度更新步长过大。课程指出，若不加以干预校正，残差主干将在深层堆叠中无界增长。

### GPT-2 风格的缩放修复方案

GPT-2 将负责向残差流输出写入的投影层权重统一缩放 1 / sqrt(2N)，其中 N 为 Transformer 的总层数。系数 2 代表每一层存在两次向主干的写入：一次来自自注意力投影层，另一次来自前馈块。2N 个经过该系数缩放的独立分支方差累加之后，其总方差恰好等同于单个标准分支的方差，从而保证了残差流信号在任意网络深度下都始终稳定在安全的工作区间内。课程特别提到，405B 模型采用了类似机制，而任何从零构建的 Transformer 模型都必须主动实现该缩放逻辑。

### 动工修改前的实验诊断确认

向未训练的模型输入随机 token 序列，记录每层残差流的幅度。若模长随深度增长，则确诊该问题；引入权重缩放后重新测试，该曲线应当保持平直。课程设计的实验正是在 50 层深度下完整验证了这一过程。

## Follow-ups

- **Level 3:** 为什么 Kaiming 初始化无法自行防范这种方差膨胀？ Expected: Kaiming 仅保证矩阵乘法后接 ReLU 时的方差恒定，无法掌控其后残差跳跃连接的加法方差累积。
- **Level 3:** 为什么缩放因子是 2N 而不是 N？ Expected: 每个 Transformer 层包含两次向残差流的加法写入（自注意力与前馈块各一次），N 层网络累计发生 2N 次残差加法。
- **Level 4:** 在修改代码前，如何通过实验证实确实发生了残差方差膨胀？ Expected: 将随机数据传入初始网络并记录各层残差流的特征模长；若随深度增长则支持这一诊断，缩放后曲线应当平直。
- **Level 4:** 采用 Pre-LN 结构能否免除这种投影权重缩放？ Expected: Pre-LN 规范了进入子层的输入尺度并提升了稳定性，但残差加法依然发生在归一化之外，因此写入层的权重缩放依然必不可少。

## Wrong answers

- "更深的网络只需要调小学习率即可解决该问题。" 调小学习率只能减慢权重更新速度；它完全无法解决初始状态下前向传播在深层累积的巨大方差。
- "Kaiming 初始化已经是方差保持的，因此层数变深不可能引发方差问题。" Kaiming 只保持子层内部的方差，并不保证子层输出与残差主干相加后的方差不变。
- "在整个模型输出端将残差流整体除以 N 即可修复。" 修正必须作用于方差累加的每一个源头点；缩放投影层能保护中间每一层都在安全区间内，而非仅在最后一层亡羊补牢。

## Taught in

[权重初始化课程](../../../phases/03-deep-learning-core/08-weight-initialization/)深入解析了残差方差累加机制以及 GPT-2 投影层方差缩放方案。
