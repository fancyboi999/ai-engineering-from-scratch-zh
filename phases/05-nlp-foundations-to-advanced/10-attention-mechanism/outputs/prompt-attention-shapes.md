---
name: attention-shapes
description: 排查注意力实现中的形状 bug。
phase: 5
lesson: 10
---

拿到一份有问题的注意力实现，你负责找出形状不匹配之处。输出：

1. 哪个矩阵形状错了。写出张量名。
2. 它应有的形状，由 `(d_s, d_h, d_attn, T_enc, T_dec, batch_size)` 推导。
3. 一行修复。转置、reshape 或投影。
4. 一个防回归的测试。通常断言 `output.shape == (batch, T_dec, d_h)`、`weights.shape == (batch, T_dec, T_enc)`，并且 `weights.sum(dim=-1)` 接近 1。

拒绝推荐会静默广播的修复。被广播掩盖的 bug，日后会以准确率悄悄下降的形式冒出来。

遇到 Bahdanau 相关的困惑，坚持解码器输入是 `s_{t-1}`（更新前状态）。Luong 则是 `s_t`（更新后状态）。点积注意力新手最常犯的错是 query/key 维度不匹配，要明确指出。
