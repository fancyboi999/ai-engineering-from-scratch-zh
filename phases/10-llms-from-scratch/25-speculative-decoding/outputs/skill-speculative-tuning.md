---
name: speculative-tuning
description: 剖析 decode 负载，为投机解码选择草稿模型、草稿长度 K、temperature 门控和回退策略。
version: 1.0.0
phase: 10
lesson: 25
tags: [speculative-decoding, draft-model, alpha, throughput, inference, decode-latency]
---

用户会给你目标模型（规模、家族、分词器）、负载遥测（任务构成、prompt 与 decode 的 token 比、p50/p99 decode 延迟、加速器和 HBM 余量、平均 batch 大小、采样 temperature 分布），以及可用的草稿 checkpoint。你需要输出：

1. 草稿模型选择。从以下选项中选：同家族的小模型（Llama-70B 配 Llama-3.2-1B）、在目标模型输出上训练的蒸馏草稿、挂在目标模型上的 Medusa 头；如果没有任何草稿的 FLOP 成本比低于 30%，就选“不用投机解码”。逐字节确认分词器与目标模型一致；分词器不一致的直接拒绝。
2. 草稿长度 K。取使 E[tokens] / (1 + K x c) 最大的 K，其中 c 是草稿与目标模型的成本比。用在 5_000 个同分布 token 上校准测得的 alpha，写出 K 取 2、3、4、5、6 时的计算过程。默认：对话 K=4，代码 K=6，高 temperature 的创意写作 K=2。
3. Temperature 门控。设一个 temperature 阈值，超过就关闭投机解码。默认 0.8；如果校准显示 alpha 更早崩掉，降到 0.6。门控若依赖逐请求检查、且额外耗时超过 50 微秒，一律否决。
4. 树预算。如果服务技术栈支持树式草稿，batch 小于 8 时选一棵固定的小树（深度 2，分支 3-2）；batch 大于 32 时用扁平链。写明验证模型 KV scratch 的字节数，并确认 HBM 余量放得下。
5. 回退策略。写明指标（最近 1_000 次验证的滑动窗口实测 alpha）和阈值（alpha 低于 0.4）：达到阈值时，服务器对该请求流退回普通自回归 decode。说明这个回退决定对每个请求的有效期。

batch 大小超过验证模型进入计算受限的临界点时，拒绝投机解码。超过这个点，投机器本该利用的闲置 FLOPs 就不存在了，吞吐会下降。实测 alpha 低于 0.4 的任务类型拒绝投机解码；草稿开销会占主导，墙钟延迟反而更差。没有在留出的 1_000 token 样本上对照目标模型验证过的草稿，一律拒绝：未经验证的草稿就是悄无声息的 KL 漂移。

示例输入：“Llama-3.3-70B，8xH100，对话负载，batch 16，p50 decode 28 ms，p99 60 ms，temperature 分布均值 0.4 / 最大 1.2，校准显示对话 alpha 0.78、代码 0.61。”

示例输出：
- 草稿：Llama-3.2-1B-Instruct。分词器相同，家族相同，成本比 c 约 0.03。
- K：4。对话 E[tokens/verify] = 3.4，代码 2.5。K=5 在对话上只多 0.1 个 token，却要多付 0.03 的 c；否决。
- Temperature 门控：0.8。在校准集上，超过 0.8 后 alpha 跌到 0.45 以下。
- 树预算：深度 2，分支 (3, 2)。batch 16 时 KV scratch 为 480 MB，放得下。
- 回退：最近 1_000 次验证的滑动窗口 alpha 低于 0.40 时，对该请求流关闭投机解码 30 s，然后重新探测。
