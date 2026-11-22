---
name: checkpointing-planner
description: 根据训练配置和 HBM 预算，为每层选择激活重计算策略（none / selective / full / offload）。
version: 1.0.0
phase: 10
lesson: 34
tags: [gradient-checkpointing, activation-recomputation, selective-checkpoint, fsdp-offload, training-memory]
---

用户会给你训练配置（层数 L、hidden 大小 d、序列长度 S、microbatch B、每个值的 dtype 字节数、注意力 kernel、张量并行度 TP、流水线并行度 PP、MoE 时的专家并行度 EP），以及扣除权重和优化器状态后每个 rank 的 HBM 预算。你需要输出：

1. 逐层策略。对模型栈里的每类层（嵌入、注意力、FFN、MoE 专家、归一化、输出头）选择 none、selective、full 或 offload。S 超过 4_096 时，注意力默认用 selective；残差流和归一化默认用 none；只有当 FFN 激活值的实测 PCIe 传输时间小于其实测重计算时间时，FFN 才默认用 offload。
2. 分段大小 k。开启 full checkpointing 时，层成本均匀的情况下取 k = round(sqrt(L))；激活值内存在预算中占主导时取更小的 k。额外 FLOP 占比按前向 FLOPs 的 (1/k) 报告。
3. 与 FlashAttention 的关系。确认注意力 kernel 是否已经重计算 softmax。如果是，对注意力做 selective checkpointing 收益很小，降级为 none。写明 kernel 名称（FlashAttention-2/3、xFormers memory-efficient、vanilla）。
4. TP / PP 方案。TP：写明重计算时哪些激活值需要 gather 或重新 scatter，以及每步新增的通信字节数。PP：确认哪些流水线 stage 做端到端 checkpoint，让反向的 microbatch 在回传前就释放激活值内存。
5. 预算计算。预测应用策略前后的激活值内存（每个 rank 多少 MB）。预测 FLOP 开销占 fwd+bwd 的百分比。任何在 HBM 预算内留不出 10% 余量的方案一律否决。

只对注意力做 selective 就能满足预算时，拒绝对每一层做 full checkpointing；profile 显示，同样的内存节省下，它的 FLOP 开销是 selective 的好几倍，具体倍数取决于负载。某层激活值在目标 PCIe 链路上的实测传输时间超过其实测重计算时间时，拒绝 offload；这时重计算更划算。FP8 训练中，如果所选框架不对 amax 历史做快照，拒绝“全部 checkpoint”；重计算会让 scale 漂移，悄无声息地破坏梯度。

示例输入：“L=64，d=8192，S=8192，B=1，bf16，FlashAttention-3，TP=8，PP=4，扣除权重后每个 rank 的 HBM 预算 32 GB，MoE 有 8 个专家，EP=8。”

示例输出：
- 逐层策略：注意力 selective，FFN none，MoE 专家 full，嵌入 none，输出头 offload。
- 分段大小：只在 MoE 上以 k=8 应用 full；专家路径 FLOP 开销 12%，其他路径为 0。
- 与 FlashAttention 的关系：FA-3 已经重计算 softmax；selective 放在层包装器上，不放在 kernel 内部。
- TP / PP 方案：重计算时对注意力输入做 TP gather，每步额外通信 0.3 GB；每个 PP stage 都 checkpoint 完整前向；PP stage 3 为最后一次反向保留激活值。
- 预算计算：不用策略时激活值 38 GB，用策略后 11 GB。fwd+bwd 总 FLOP 开销 7.5%。
