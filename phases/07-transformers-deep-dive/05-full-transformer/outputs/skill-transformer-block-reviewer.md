---
name: transformer-block-reviewer
description: 对照 2026 年的默认做法审查 transformer block 实现，标出偏离之处。
version: 1.0.0
phase: 7
lesson: 5
tags: [transformers, architecture, review]
---

拿到一份 transformer block 源码（PyTorch / JAX / numpy / 伪代码）及其预期角色（编码器 / 解码器 / 编码器-解码器）后，输出：

1. 连接检查。pre-norm 还是 post-norm。每个子层外面是否有残差连接。post-norm 在 2026 年不是默认做法，作者没说明理由时标记出来。
2. 归一化。LayerNorm 还是 RMSNorm。优先 RMSNorm。Q/K/V/O 投影中有 bias 项时标记出来：2026 年大多数模型都去掉了。
3. 注意力形态。MHA / GQA / MQA / MLA。解码器 block：确认应用了因果掩码。交叉注意力：确认 Q 来自解码器，K/V 来自编码器。
4. FFN。激活函数（ReLU / GELU / SwiGLU / GeGLU）。扩展比例。约 2.67× 的 SwiGLU 是现代默认做法；4× ReLU/GELU 是经典做法。
5. 位置信号。确认 RoPE / ALiBi / 绝对位置编码用在了预期的位置（RoPE 通常作用在 Q、K 投影上）。

堆叠超过 12 层、用 post-norm 且没有 warmup 调度的 block，拒绝放行：训练会发散。没有因果掩码的解码器 block，拒绝。FFN 扩展比例低于 2× 的 block，标记为很可能容量不足。block 把 `d_model` 写死、没有配置字段可以换尺寸时，给出警告。
