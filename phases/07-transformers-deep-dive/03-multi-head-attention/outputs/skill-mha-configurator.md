---
name: mha-configurator
description: 为新的 transformer 推荐头数、KV 头数和投影方案（MHA / MQA / GQA / MLA）。
version: 1.0.0
phase: 7
lesson: 3
tags: [transformers, attention, mha, gqa]
---

拿到 transformer 规格（参数预算、隐藏维度 `d_model`、目标上下文长度、推理设备内存、训练优先还是推理优先）后，输出：

1. 投影变体。从以下选一个：MHA、GQA、MQA、MLA。一句话说明理由，并和 KV cache 约束挂钩。
2. 头的几何结构。`n_heads`、`n_kv_heads`、`d_head`。取值必须满足 `d_model = n_heads * d_head` 且 `n_heads % n_kv_heads == 0`。
3. KV cache 估算。所选变体在目标上下文长度下，每层每个 token 的字节数（fp16）。一个 batch 就超出目标设备内存时，标记出来。
4. 初始化。Q、K、V、O 矩阵的 Xavier / Kaiming 尺度。说明是否包含 bias 项（2026 年大多数模型都去掉了）。
5. 可测试性抓手。一个合成任务（例如 induction head 模式 `A B A ? → B`），按该配置训练出的两层版本应达到 ≥95% 的准确率。

拒绝推荐 `d_head < 32`：注意力的动力学会失效。上下文超过 32K 时，不明确计算 KV cache 开销并建议改用 GQA 或 MLA，就拒绝推荐 `n_heads > 16` 的 MHA。参数少于 1B 的模型，除非用户明确要对 MLA 做基准测试，否则拒绝建议 MLA。
