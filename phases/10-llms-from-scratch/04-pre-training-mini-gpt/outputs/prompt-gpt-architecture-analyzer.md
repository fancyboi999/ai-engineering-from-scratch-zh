---
name: prompt-gpt-architecture-analyzer
description: 分析任意 GPT 式 transformer 模型的架构选择
version: 1.0.0
phase: 10
lesson: 4
tags: [gpt, transformer, architecture, attention, kv-cache, scaling, pre-training]
---

# GPT 架构分析

根据技术报告、模型卡或训练日志评估 GPT 式模型时，用这套框架拆解架构，找出设计上的取舍。

## 分析流程

### 1. 参数分布拆解

精确计算每个组件的参数量：

- **Token 嵌入**：vocab_size x embed_dim
- **位置嵌入**：max_seq_len x embed_dim
- **每个 block 的注意力**：4 x embed_dim x embed_dim（Q、K、V 和输出投影）
- **每个 block 的 FFN**：2 x embed_dim x ff_dim + embed_dim + ff_dim（两个线性层 + 偏置）
- **每个 block 的 LayerNorm**：4 x embed_dim（两个归一化层，各有 scale + bias）
- **最终 LayerNorm**：2 x embed_dim
- **输出头**：vocab_size x embed_dim（如果与 token 嵌入共享权重则为 0）

任何单个组件超过总参数 40% 时要标出来。小模型里嵌入矩阵占大头，大模型里注意力和 FFN 占大头。

### 2. 注意力设计分析

评估注意力配置：

- **头维度**：embed_dim / num_heads。标准值是 64（GPT-2）或 128（Llama 3）。低于 32 会限制每个头的表达能力，高于 128 浪费算力且收益很小。
- **每层头数**：头越多，注意力模式越多样，但 KV cache 占的内存也越多。
- **分组查询注意力（GQA）**：模型是否让多个 Q 头共享 K/V 头？Llama 3 用 GQA，32 个 Q 头配 8 个 KV 头，KV cache 减少到 1/4。
- **上下文长度**：最大位置嵌入数。RoPE 可以外推到训练长度之外，绝对位置嵌入不行。

### 3. 内存预算

在模型最大上下文长度下推理时：

- **权重（FP16）**：total_params x 2 字节
- **KV Cache（FP16）**：2 x num_layers x num_kv_heads x head_dim x max_seq_len x 2 字节
- **激活值**：batch_size x seq_len x embed_dim x 2 字节 x num_layers（近似值）

KV cache 超过权重内存时要标出来。长上下文模型（128K+）会出现这种情况，说明模型在解码阶段受内存限制。

### 4. 计算特征

- **每个 token 的 prefill FLOPS**：约 2 x total_params（前向传播中每个参数一次乘加）
- **每个 token 的 decode FLOPS**：与 prefill 相同，但只针对单个 token
- **Prefill 瓶颈**：受计算限制（GPU TFLOPS）
- **Decode 瓶颈**：受内存限制（GPU 显存带宽）
- **算术强度**：每访问一字节内存对应的 FLOPS。低于 100 即受内存限制。

### 5. 缩放决策

对照已知的缩放律评估：

- **Chinchilla 最优**：给定算力预算 C，最优模型规模 N 和 token 数 D 满足 N ~ D（大致等比缩放）。7B 模型需要约 140B token。
- **Llama 3 过度训练**：Meta 用 15T token 训练 Llama 3 8B（Chinchilla 最优值的 100 倍）。在更多数据上过度训练小模型，可以换来更低的单 token 推理成本。
- **宽度与深度**：参数量相同时，更深的模型（层数多）通常比更宽的模型（embed_dim 大）样本效率更高。

## 危险信号

- **FFN 比例不是 4x**：标准是 ff_dim = 4 x embed_dim。Llama 配合 SwiGLU 用的是 8/3 x embed_dim。偏离标准要有理由。
- **没有权重共享**：除非 vocab_size 相对 embed_dim 非常大，否则输出头应与 token 嵌入共享权重。
- **13B 以上没用 GQA**：13B 以上的模型不用分组查询注意力，KV cache 会大得离谱。
- **长上下文没用 RoPE**：绝对位置嵌入无法外推到训练长度之外。目标上下文 32K+ 的模型应使用旋转位置嵌入。
- **学习率相对模型规模过高**：模型越大，峰值学习率应越低。GPT-2 Small 用 6e-4，Llama 3 405B 用 8e-5。

## 输出格式

1. **参数表**：逐组件列出参数量及占比
2. **内存预算**：最大上下文长度下的权重、KV cache 和激活值内存
3. **计算特征**：A100/H100 上 prefill 和 decode 的吞吐估算
4. **设计评估**：模型哪些地方做得对，哪些地方不标准
5. **缩放结论**：模型规模与训练数据量是否匹配
