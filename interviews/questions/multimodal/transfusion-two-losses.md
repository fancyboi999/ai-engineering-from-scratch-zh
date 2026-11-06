---
id: transfusion-two-losses
title: 两个损失、一个 Transformer、一次梯度更新
card: multimodal
kind: concept
level: 4
roles: [applied-ai-engineer]
rounds: [ml-depth]
tags: [transfusion, two-loss, flow-matching, attention-mask]
minutes: 15
lessons: [phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens]
manuals: []
practice: []
cheatsheet: [unified-multimodal, image-generation-compared]
related: [multimodal/vq-tokenizer-ceiling, multimodal/show-o-parallel-decoding]
updated: 2026-11-03
---

请详细解释单个 Transformer 如何在单次梯度更新步骤中，将预测下一个 token 的纯文本因果建模目标与图像上的去噪扩散损失联合训练。请涵盖输入表征构建、注意力掩码设计、逐位置的损失路由机制，以及随之而来的损失平衡难题。随后，说明其同门架构做出了何种针对性改进。

## Short answer

文本通过嵌入表以离散 token 形式输入，图像通过线性投影层以连续的 16 × 16 像素 patch 向量形式输入，并在图文交界处用图像起始和结束标签包围。混合序列经历单次前向传播，随后按位置分别路由损失：文本位置计算词表输出头上的交叉熵损失，图像 patch 位置则计算流匹配（flow-matching）回归损失（预测加噪 patch 在采样时间步朝向干净原图的速度向量）。注意力掩码采用块下三角结构：文本之间保持因果关系，单张图像内部 patch 之间保持全双向关联，文本关注在其之前闭合的图像，图像 patch 关注先前的文本。两套损失通过同一套权重反向传播，因此必须手动平衡两者的相对大小；兄弟架构保留了联合注意力，但在每个块中为文本和图像各自保留了独立权重。

## Full answer

### 输入表征设计

单条输入序列中混合共存两种截然不同的输入形态：文本位置输入离散 token id 并通过标准词表嵌入表（Embedding table）查表；图像位置则输入实数维度的 patch 向量，通过线性投影层映射至隐层维度（与 Vision Transformer 的 patch 嵌入逻辑完全一致）。序列中使用标签标记图像的起始与闭合边界。

### 注意力掩码拓扑矩阵

```text
M[i, j] = 1 if
  i and j are text and j <= i                        causal text
  or i and j are patches of the same image           bidirectional inside an image
  or i is text, j is a patch, and that image closed before i
  or i is a patch, j is text, and j precedes the image start
```

在 Teacher Forcing 模式下文本必须防止窥探未来。而图像本质上是一个静止瞬间，因此其内部的所有 patch 之间天然应当互相可见。

### 逐位置的损失路由

- **文本位置**：在整个词表投影头上计算预测下一个 token 的标准交叉熵损失。
- **图像位置**：随机采样时间步 t，按权重 t 在干净 patch 和噪声之间插值，得到带噪 patch，送入模型后通过均方误差（MSE）回归其速度向量（即噪声减去干净 patch 的物理差值）。

两项损失直接相加构成单体总损失标量，执行单次反向传播，共享的 Transformer 骨干网络同时接收来自两套目标的梯度流。

### 推理生成流程

文本生成采用标准的逐 token 自回归解码。一旦模型输出图像起始标签，解码器立即无缝切换为针对图像 patch 的多步扩散去噪采样循环（以迄今生成的文本上下文为条件引导）迭代数十步，待图像渲染完成后再切回文本自回归。

### 损失平衡难题

两种损失的尺度不同。课程练习模拟了一个由 70% 文本位置与 30% 图像位置组成的混合序列，其中图像损失的数值绝对量级达到了文本损失的约 10 倍；若不施加手动权重调平，图像梯度会主导共享参数的更新。权重以及两个目标在调度上的任何不匹配，需要单独搜索，这是避开量化器的代价。回报是图像质量高于同等规模的离散模型，在论文标准图像指标上高出 3 到 5 分。

### 兄弟架构

一个知名图像生成器背后的多模态扩散 transformer 保留了跨模态联合注意力，但在每个块内部为文本和图像分别设置了独立的 query、key、value 和 MLP 权重，采用整流流（rectified flow）训练，提供 2B 和 8B 两种参数规模。独立的权重减轻了平衡压力，代价是参数量增加。

### 架构技术全景定位

离散编码方案通过单一损失避开了损失平衡问题，但受制于分词器上限；掩码离散设计维持单损失并实现并行解码。当画质保真度至关重要且可以接受双损失配方时，该设计是合适的选择。

## Follow-ups

- **Level 3:** 为什么图像 patch 之间可以做双向注意力，而文本绝对不行？ Expected: 文本在 teacher forcing 下从左向右生成，因此 token 不能看到预测目标；图像作为一个整体生成，patch 之间没有先后顺序。
- **Level 4:** 在实际工程中你会如何设定两套损失的平衡权重？ Expected: 在独立的验证集 batch 上分别测量两套损失的均值大小与各自反向传播的梯度范数，按比例将其缩放至均衡贡献；随后在纯文本评测集与图像评测集上同时监控验证，因为往往一侧提升时另一侧正在退化。
- **Level 4:** 训练损失中采样的随机时间步 t 起到了什么作用？ Expected: 它决定 patch 中有多少噪声，使模型学会从噪声到干净图像的整条路径；生成时每一步都沿着这条路径前进。
- **Level 4:** 同门架构为各模态分配独立参数集带来了什么好处，付出了什么代价？ Expected: 代价是每个 block 的参数量大幅增加；好处是为统计特性截然不同的文本与图像提供了专用的容量空间并缓解了梯度冲突，同时联合注意力依然能保证模态间深度融合。

## Wrong answers

- "单个 Transformer 只能绑定一个损失函数。" 损失函数是每个位置输出向量的数学计算；将不同位置映射到不同损失并直接求和，构成了单一的优化目标，只需一次反向传播。
- "为追求实现极简，全局一律使用因果掩码。" 在图像内部强加单向因果掩码会严重破坏图像内部二维空间的双向拓扑感知，严重劣化图像生成质量；图像内部必须全双向。
- "因为共享了一套主干权重，两套损失会自动实现动态平衡。" 共享参数正是冲突的根源：数值尺度更大的损失会强力霸占更新梯度，直到你显式引入加权系数为止。

## Taught in

[Transfusion 课程](../../../phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/)构建了双损失训练器与掩码矩阵并指出了同门架构，[Show-o 课程](../../../phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/)将其与离散架构对比。
