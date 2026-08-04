# Show-o 与离散扩散统一模型

> Transfusion 混合了连续和离散表示。Show-o（Xie 等人，2024 年 8 月）走了另一条路：文本 token 用因果下一 token 预测，图像 token 用 MaskGIT 精神下的掩码离散扩散。两者都坐在一个 transformer 里，配一个混合注意力掩码。结果是在一个骨干、每种模态一个分词器、一种损失表述（下一 token 扩展为掩码预测）上，统一了 VQA、文生图、图像修复和混合模态生成。本节课走一遍 Show-o 设计——为什么掩码离散扩散是一个并行的、少步的图像生成器——并与 Transfusion 和 Emu3 作对比。

**类型：** Learn
**语言：** Python（标准库，掩码离散扩散采样器）
**前置要求：** Phase 12 · 13（Transfusion）
**预计时间：** ~120 分钟

## 学习目标

- 解释掩码离散扩散：先均匀掩掉 token、再让 transformer 恢复它们的那套调度。
- 在速度和质量上把并行图像解码（Show-o、MaskGIT）与自回归图像解码（Chameleon、Emu3）作比较。
- 说出 Show-o 在一个 checkpoint 里处理的三个任务：T2I、VQA、图像修复。
- 挑一个掩码调度（cosine、linear、truncated）并就它对样本质量的影响作推理。

## 问题背景

Transfusion 的双损失训练能work，但动态更棘手——连续扩散损失与离散 NTP 损失活在不同的数值尺度上。平衡损失权重是一场超参搜索。这个架构有效但复杂。

Show-o 的答案：让两种模态都保持离散（像 Chameleon），但通过掩码离散扩散并行生成图像，而非顺序生成。训练目标就变成一个能自然泛化下一 token 预测的单一掩码 token 预测。

## 核心概念

### 掩码离散扩散（MaskGIT）

Chang 等人（2022）原版的 MaskGIT 戏法很优雅。从一张全掩码图像起步（每个 token 都是特殊的 `<MASK>` id）。每一步，并行预测所有被掩的 token，然后保留置信度最高的 top-K 个预测，把其余重新掩上。约 8-16 次迭代后，所有 token 都填上了。每步解掩多少 token 的调度是调过的——cosine 调度效果好。

训练很简单：从 [0, 1] 均匀采一个掩码比例，应用到图像的 VQ token 上，训 transformer 去恢复被掩的那些。和 BERT 对文本做的事一模一样，放大到图像生成。

### Show-o：一个 transformer，混合掩码

Show-o 把 MaskGIT 放进一个因果语言模型 transformer 里。注意力掩码是：

- 文本 token：因果（标准 LLM）。
- 图像 token：图像块内部完全双向（这样被掩 token 在预测时能看到其他每个图像 token）。
- 文生图：文本关注先前的图像，图像关注先前的文本。

训练在以下之间交替：
1. 文本序列上的标准 NTP。
2. T2I 样本：文本 → 带掩码图像 token 的图像，掩码 token 预测损失。
3. VQA 样本：图像 → 带掩码文本 token 的文本（其实就是 NTP）。

统一损失是 `<MASK>` token 上的交叉熵，它同时涵盖文本 NTP（只有最后一个 token 被"掩"）和图像掩码扩散（随机子集被掩）。

### 并行采样

Show-o 用约 16 步生成一张图，而非约 1000 步（逐 token 自回归）或约 20 步（扩散）。每一步，并行预测所有被掩 token；提交置信度高的 top-K；重复。

对比：
- Chameleon / Emu3（跨 token 自回归）：N_tokens 次前向，每张图通常 1024-4096。
- Transfusion（连续扩散）：约 20 步，每步一次完整 transformer 前向。
- Show-o（掩码离散扩散）：约 16 步，每步一次完整 transformer 前向。

在相近规模模型上，Show-o 比 Chameleon 快，步数大致与 Transfusion 持平但每步成本更低（离散词表 logit vs 连续 MSE 损失）。

### 一个 checkpoint 里的任务

Show-o 在推理时支持四个任务，由 prompt 格式选定：

- 文本生成：标准自回归文本输出。
- VQA：图像进，文本出。
- T2I：文本进，经掩码离散扩散图像出。
- 修复：带部分掩码 token 的图像，填补。

修复能力是从掩码预测训练里免费得来的。掩掉 VQ-token 网格的一个区域，把其余加一个文本 prompt 喂进去，预测被掩 token。

### 掩码调度

每步解掩多少 token 的调度塑造质量。Show-o 推荐 cosine：

```
mask_ratio(t) = cos(pi * t / (2 * T))   # t = 0..T
```

第 0 步，所有 token 被掩（比例 1.0）。第 T 步，无掩码。cosine 把质量集中在预测最有信息量的中段比例上。linear 调度也能用，但平台化更快。

### Show-o2

Show-o2（2025 续作，arXiv 2506.15564）缩放 Show-o：更大的 LLM 基座、更好的分词器、改进的掩码调度。同样的架构模式。

### Show-o 的位置

在 2026 年的分类法里：

- 离散 token + NTP：Chameleon、Emu3。简单但推理慢。
- 离散 token + 掩码扩散：Show-o、MaskGIT、LlamaGen、Muse。并行采样，仍受分词器有损限制。
- 连续 + 扩散：Transfusion、MMDiT、DiT。质量最高，训练更复杂。
- VLM 里的连续 + flow matching：JanusFlow、InternVL-U。最新。

按任务挑：想在一个开放模型里以合理速度要 T2I + 修复 + VQA 时选 Show-o；质量至上且你负担得起双损失管路时选 Transfusion。

```figure
masked-diffusion-unmask
```

## 实际使用

`code/main.py` 模拟 Show-o 采样：

- 一个 16 个 VQ token 的玩具网格。
- 一个模拟"transformer"，基于 prompt 和当前未掩 token 预测 logit。
- cosine 调度下 8 步的并行掩码采样。
- 打印中间状态（掩码模式的演化）和最终 token。

跑一下，看掩码一步步消融。

## 拿去用

本节课产出 `outputs/skill-unified-gen-model-picker.md`。给定一个既需要理解（VQA、看图说话）又需要生成（T2I、修复）、且有开放权重约束的产品，它在 Show-o 家族、Transfusion/MMDiT 家族、Emu3 / Chameleon 家族之间挑选，附具体取舍。

## 练习

1. 掩码离散扩散用约 16 步采样。为什么不是 1 步？如果你在第 0 步全部解掩会崩什么？

2. 修复在掩码扩散里是免费的。提出一个产品用例（真实或假设），其中 Show-o 的修复胜过专用模型。

3. cosine 调度 vs linear 调度：对 T=8 追一遍每步未掩 token 数。哪个更均衡？

4. 一张 512x512 的 Show-o 图是 1024 个 token。在词表 K=16384 下，模型吐出 1024 * log2(16384) = 14,336 比特（约 1.75 KiB）数据。Stable Diffusion 输出 512*512*24 比特 = 6,291,456 比特（约 768 KiB）原始像素。压缩比是多少，它买来什么质量？

5. 读 LlamaGen（arXiv:2406.06525）。LlamaGen 的类别条件自回归图像模型与 Show-o 的掩码路线有何不同？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 掩码离散扩散 | "MaskGIT 式" | 训练去预测被掩 token；推理时迭代地解掩置信度最高的预测 |
| cosine 调度 | "解掩调度" | 掩码比例在推理步上的衰减；把置信度增长集中在中段 |
| 并行解码 | "一次所有 token" | 每步在一次前向里预测整条被掩 token 序列，再提交 top-K |
| 混合注意力 | "因果 + 双向" | 跨文本 token 因果、图像块内部双向的掩码 |
| 修复 | "填补式生成" | 以带部分掩码 token 的图像为条件，预测缺失的；从训练目标里免费得来 |
| 提交率 | "每步 top-K" | 每次迭代宣布"完成"多少 token；控制推理 vs 质量的取舍 |

## 延伸阅读

- [Xie et al. — Show-o (arXiv:2408.12528)](https://arxiv.org/abs/2408.12528)
- [Show-o2 (arXiv:2506.15564)](https://arxiv.org/abs/2506.15564)
- [Chang et al. — MaskGIT (arXiv:2202.04200)](https://arxiv.org/abs/2202.04200)
- [Sun et al. — LlamaGen (arXiv:2406.06525)](https://arxiv.org/abs/2406.06525)
- [Chang et al. — Muse (arXiv:2301.00704)](https://arxiv.org/abs/2301.00704)
