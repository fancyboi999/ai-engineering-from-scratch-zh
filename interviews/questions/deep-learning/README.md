# 深度学习

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

反向传播、损失函数、优化器、初始化，以及怎样排查学不动的网络。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [没有激活函数的十层网络退化为单层网络](stacked-linear-layers-collapse.md) | 概念 | 1 基础 | 5 |
| [权重相同，测试准确率却在变化](train-mode-and-eval-mode.md) | 概念 | 1 基础 | 5 |
| [为什么单个感知机永远无法学会异或 XOR](xor-needs-a-hidden-layer.md) | 概念 | 1 基础 | 5 |
| [Adam 的偏差校正在最初几步做了什么](adam-bias-correction-first-steps.md) | 概念 | 2 应用 | 8 |
| [权重衰减放在损失里还是优化器里](adamw-not-adam-plus-l2.md) | 权衡 | 2 应用 | 8 |
| [dropout 掩码为什么存 1 除以 (1 减 p)](inverted-dropout-scale.md) | 代码阅读 | 2 应用 | 8 |
| [Kaiming 初始化里的 2 从哪里来](kaiming-factor-of-two.md) | 概念 | 2 应用 | 8 |
| [预测 0.5 而损失很低的分类器](mse-predicts-half-for-everything.md) | 概念 | 2 应用 | 8 |
| [穿透十层 Sigmoid 后残留的梯度比例估算](sigmoid-gradient-after-ten-layers.md) | 估算 | 2 应用 | 8 |
| [计算交叉熵损失导数的三行代码](softmax-cross-entropy-gradient.md) | 代码阅读 | 2 应用 | 8 |
| [从 Layer 类实现推导 2-3-1 网络的张量形状](weight-matrix-rows-and-columns.md) | 代码阅读 | 2 应用 | 8 |
| [行为退化为单个神经元的极宽网络层](zero-init-symmetry.md) | 概念 | 2 应用 | 6 |
| [两层里大多数 ReLU 输出恰好为零](half-the-relus-are-dead.md) | 排障 | 3 高级 | 12 |
| [transformer 为什么跨特征归一化，而不是跨 batch](layernorm-not-batchnorm.md) | 权衡 | 3 高级 | 12 |
| [十分类问题上一直停在 2.3 的损失](loss-stuck-at-log-classes.md) | 排障 | 3 高级 | 12 |
| [几步之后损失开始来回摆动的训练循环](missing-zero-grad.md) | 代码阅读 | 3 高级 | 10 |
| [多天训练之前的 30 秒检查](overfit-one-batch-first.md) | 设计 | 3 高级 | 10 |
| [为什么深层残差堆叠仅靠 Kaiming 初始化是不够的](residual-scaling-deep-transformer.md) | 概念 | 3 高级 | 12 |
| [学习率预热机制保护了什么](warmup-before-the-peak-rate.md) | 概念 | 3 高级 | 10 |
| [边界固定的预热加余弦调度](cosine-warmup-schedule-boundaries.md) | 课后任务 | 4 架构与规模 | 25 |
| [平滑的损失几小时后变成 inf，再变成 NaN](loss-becomes-nan-mid-run.md) | 排障 | 4 架构与规模 | 15 |
| [在数小时算力预算内确定峰值学习率与调度策略](pick-the-peak-rate-and-schedule.md) | 设计 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
