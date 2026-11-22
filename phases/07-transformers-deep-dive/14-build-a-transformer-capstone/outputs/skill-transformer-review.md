---
name: transformer-review
description: 对照阶段 7 的 13 节课，审查从零实现的 transformer。
version: 1.0.0
phase: 7
lesson: 14
tags: [transformers, review, capstone]
---

拿到一份从零实现 transformer 的代码库（PyTorch / JAX），对照 2026 年的默认做法审查，标出缺失或错误的部分：

1. 注意力。有因果掩码。按 `sqrt(d_head)` 缩放。多头切分正确。可用时使用 Flash Attention。d_model ≥ 1024 时提到 GQA。
2. 位置编码。RoPE（2026 年首选）或可学习绝对位置（小模型可接受）。正弦编码标记为过时做法。
3. Block 连接。pre-norm（不是 post-norm）。RMSNorm（不是 LayerNorm）。SwiGLU FFN（不是 ReLU/GELU）。每个子层外都有残差。线性层去掉 bias（现代默认）。
4. 训练。AdamW（2026 年以后也可用 Muon），带线性 warmup 的余弦学习率调度，梯度裁剪到 1.0，bf16 autocast。token 嵌入与 lm_head 权重绑定。
5. 损失。每个位置都做错位一位的交叉熵。有 padding 就把它屏蔽掉。按固定间隔记录训练和验证损失。

代码库只要有以下任一问题就拒绝放行：没有明确理由的 post-norm、2026 年的生产代码用 LayerNorm 却不说明理由、解码器自注意力缺少因果掩码、小型 LM 的嵌入没有绑定。需要标记的问题：没有验证集划分、没有梯度裁剪、LR > 1e-3 却没有 warmup、block_size 超出位置嵌入范围且没有后备方案。建议端到端运行 `python code/main.py`，检查 nano 配置下 tinyshakespeare 的最终验证损失低于 2.5。
