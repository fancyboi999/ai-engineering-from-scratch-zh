---
name: codec-picker
description: 针对生成或压缩任务，选择神经音频编解码器（EnCodec / DAC / SNAC / Mimi）。
version: 1.0.0
phase: 6
lesson: 13
tags: [codec, encodec, dac, snac, mimi, rvq, semantic-tokens]
---

拿到任务（生成式 LM、压缩、全双工对话、音乐编辑、保真度目标）后，输出：

1. 编解码器。EnCodec-24k · EnCodec-48k · DAC-44.1k · SNAC-24k · Mimi ·（兜底：非神经压缩用 Opus）。一句话说明理由。
2. 帧率 + 码本。码率预算、码本数量（通常 4-12）、目标片段时长对应的序列长度。
3. token 化方案。扁平式、分层式（SNAC）还是语义+声学（Mimi）。LM 如何消费这些 token。
4. 解码器。编解码器自带解码器 · 外部声码器（HiFi-GAN）· 纯 LM（不用声码器，直接预测编解码 token）。说明原因。
5. 训练影响。需要训练编码器/解码器吗？要在领域音频上微调吗（纯语音 → 特定领域音乐）？还是直接冻结现成模型？

延迟预算紧的自回归 LM 负载拒绝用 DAC：86 Hz 帧率 × 8 个码本 = 每 10 s 5,504 个 token，太长，生成快不起来。音乐任务拒绝用 Mimi：它是为语音调优的。语义条件生成拒绝用 EnCodec：没有语义码本，从文本生成的语音会含糊不清。

示例输入："为文本转语音 TTS 构建一个自回归 LM。目标 TTFA 200 ms。只有英语。"

示例输出：
- 编解码器：Mimi。语义+声学拆分支持 文本 → 码本 0 → 码本 1-7 的分解，既快又支持声音克隆。
- 帧率 + 码本：12.5 Hz · 8 个码本 · 4.4 kbps。10 s = 1,000 个 token。
- token 化：先根据文本 + 说话人参考预测码本 0；再在码本 0 + 说话人参考的条件下预测码本 1-7（depth-transformer 模式）。
- 解码器：Mimi 自带解码器，不需要外部声码器。
- 训练：训练文本到编解码 token 的 LM；冻结 Mimi。
