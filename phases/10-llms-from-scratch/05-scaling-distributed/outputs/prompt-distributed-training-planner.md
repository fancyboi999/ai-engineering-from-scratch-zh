---
name: prompt-distributed-training-planner
description: 根据模型规模和可用硬件规划分布式训练任务
version: 1.0.0
phase: 10
lesson: 5
tags: [distributed-training, fsdp, deepspeed, tensor-parallelism, pipeline-parallelism, scaling]
---

# 分布式训练规划

为大语言模型规划分布式训练时，用这套框架确定并行策略、内存预算、通信开销和预期吞吐。

## 输入要求

请提供：
- **模型规模**（参数量，单位十亿）
- **目标训练 token 数**（单位万亿）
- **可用 GPU**（型号：A100/H100/H200，数量，互连：NVLink/InfiniBand）
- **GPU 显存**（A100/H100 为 80GB，H200 为 141GB）
- **节点**（每节点 GPU 数、节点数）
- **预算约束**（最高花费（美元）、最长墙钟时间）

## 第 1 步：内存预算

计算每张 GPU 上各组件占用的显存：

| 组件 | 公式 | FP16 | FP32 |
|-----------|---------|------|------|
| 权重 | params x bytes_per_param | params x 2 | params x 4 |
| Adam 优化器（m + v） | params x 4 x 2 | 始终 8 字节/参数 | 8 字节/参数 |
| 梯度 | params x bytes_per_param | params x 2 | params x 4 |
| 激活值（估算） | seq_len x batch x hidden x layers x 2 | 视情况而定 | 视情况而定 |

总量超过 GPU 显存时就需要切分。按以下顺序尝试：
1. ZeRO-1（只切分优化器状态）：通信开销最低
2. ZeRO-2（再加梯度）：通信开销中等
3. FSDP/ZeRO-3（再加权重）：通信开销最高，但最省显存
4. 激活值仍然太大时，加上激活检查点
5. 单层放不进一张 GPU 时，加上张量并行

## 第 2 步：并行策略

### 决策树

1. **一层能放进一张 GPU 吗？**
   - 不能：需要张量并行。设 TP = 2、4 或 8（限于节点内）。
   - 能：跳过张量并行。

2. **完整模型（切分后）能放进单个节点的 GPU 吗？**
   - 不能：需要流水线并行。设 PP = 节点数 / 分组数。
   - 能：跳过流水线并行。

3. **剩下多少 GPU 用于数据并行？**
   - DP = total_gpus / (TP x PP)

4. **数据并行组内用哪一级切分？**
   - 从 FSDP（ZeRO-3）开始。通信成为瓶颈时，降到 ZeRO-2 或 ZeRO-1。

### 典型配置

| 模型规模 | GPU 总数 | TP | PP | DP | 切分方式 |
|-----------|-----------|----|----|-----|----------|
| 7B | 8 | 1 | 1 | 8 | FSDP |
| 13B | 16 | 2 | 1 | 8 | FSDP |
| 70B | 64 | 8 | 1 | 8 | FSDP |
| 70B | 128 | 8 | 2 | 8 | FSDP |
| 405B | 16,384 | 8 | 16 | 128 | FSDP |

## 第 3 步：通信分析

估算每个训练步的通信量：

- **数据并行（all-reduce）**：每步 2 x gradient_size x (N-1)/N
- **FSDP（all-gather + reduce-scatter）**：每步约 3 x weight_size x (N-1)/N（比 DP 高）
- **张量并行（每层 all-reduce）**：每步 2 x activation_size x num_layers（需要 NVLink）
- **流水线并行（点对点）**：每个 stage 边界 activation_size（最少）

通信时间超过计算时间的 20%，说明策略受通信限制。解决办法：
- 梯度累积（降低 all-reduce 频率）
- 通信与计算重叠（FSDP 默认这样做）
- 增大 micro-batch（改善计算与通信的比例）
- 换到通信量更小的切分级别

## 第 4 步：吞吐与成本估算

**每个训练步的 FLOPS：**
- 前向：约 2 x params x tokens_per_batch
- 反向：约 4 x params x tokens_per_batch（前向的 2 倍）
- 合计：约 6 x params x tokens_per_batch

**训练时间：**
- total_flops = 6 x params x total_tokens
- time_seconds = total_flops / (num_gpus x gpu_tflops x 1e12 x utilization)
- 典型利用率：35-45%（计入通信、流水线气泡和内存开销）

**成本：**
- total_gpu_hours = num_gpus x time_seconds / 3600
- cost = total_gpu_hours x cost_per_gpu_hour

## 第 5 步：验证检查清单

启动前确认：

1. 每张 GPU 的显存占用在硬件上限以内（留 10% 余量）
2. 有效 batch 大小符合目标（per_gpu_batch x DP x gradient_accumulation_steps）
3. 通信与计算的比例低于 20%
4. 流水线气泡占比低于 15%（micro-batch 足够多）
5. 学习率已按有效 batch 大小缩放
6. checkpoint 频率考虑了故障概率（大规模训练每 1-2 小时保存一次）
7. 已设置梯度裁剪（大模型通常为 1.0）
8. warmup 步数与总步数成比例（通常为总步数的 0.1-1%）

## 危险信号

- **TP > 8**：跨节点（走 InfiniBand）的张量并行几乎总比流水线并行慢
- **流水线 stage > 32**：即使 micro-batch 很多，气泡开销也会很明显
- **有效 batch 大小 > 10M token**：收益递减，还可能损害收敛
- **利用率低于 30%**：受通信限制，重新评估并行策略
- **13B 以上没用激活检查点**：反向传播时会显存不足
- **单卡 batch 很小却没做梯度累积**：梯度噪声变大；累积到 256+ 样本的有效 batch
