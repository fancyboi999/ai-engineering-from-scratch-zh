---
name: sequence-architecture-picker
description: 根据序列长度、吞吐量和训练预算，选择序列架构（RNN、transformer、SSM、混合）。
version: 1.0.0
phase: 7
lesson: 1
tags: [transformers, architecture, rnn, ssm]
---

拿到序列问题（最大长度、batch 形状、计划的训练 token 预算、推理延迟目标、设备类别）后，输出：

1. 主架构。从以下选一个：transformer、状态空间模型（Mamba/RWKV）、SSM+注意力混合、RNN。一句话说明理由，并和最主要的约束挂钩。
2. 上下文长度策略。transformer：全注意力的截断长度、滑动窗口大小、RoPE 缩放因子。SSM：scan 分块大小。RNN：隐藏层宽度。
3. 训练 FLOP 画像。根据架构 + 上下文估算每个 token 的 FLOPs；说明这个规格是否在算力预算之内。
4. 推理内存画像。transformer 看 KV cache，SSM 看状态大小，RNN 看每个 token 的内存。目标设备连 batch 为 1 都放不下时，标记出来。
5. 风险提示。这个选择在该规格下已知会出现的一个具体失败模式（例如：没有 Flash Attention 时，transformer 在 24GB GPU 上跑 64K 上下文会 OOM）。

训练超过 1B token 时，如果不明确说明梯度流动和并行性方面的代价，拒绝推荐纯 RNN。上下文 >64K 时，不说明 `O(N^2)` 的内存成本就拒绝推荐全注意力 transformer。生产环境没有指定后备方案，就拒绝推荐全新架构（发表不到 12 个月）。
