---
id: modernize-a-2017-block
title: 对照当今默认做法审查一个 2017 风格的 block
card: transformers
kind: design
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [design-review, ml-depth]
tags: [transformer-block, rmsnorm, swiglu, rope, grouped-query-attention, design-review]
minutes: 12
lessons: [phases/07-transformers-deep-dive/05-full-transformer, phases/07-transformers-deep-dive/14-build-a-transformer-capstone, phases/07-transformers-deep-dive/04-positional-encoding]
manuals: []
practice: [layer-norm-rms-norm, rope]
cheatsheet: [transformers-attention]
related: [transformers/pre-norm-vs-post-norm, transformers/residual-stream-and-dropout]
updated: 2026-11-03
---

你接手了一个按 2017 年风格写的解码器 block：残差相加之后做层归一化，宽度四倍的 ReLU 前馈网络，正弦绝对位置直接加到输入上，每个线性层都带偏置，注意力是完整的多头注意力。请对照当今生产解码器的做法审查它，并说明你要求的每项修改的理由。

## Short answer

把归一化移到每个子层前面并换成 RMSNorm；把 ReLU 网络换成宽度约 2.6 倍的 SwiGLU，让它的三个矩阵和原来的参数量持平；把正弦编码换成对查询和键的旋转；去掉偏置；用分组查询注意力缩小解码时的 cache。每项修改都只是换一个函数，张量形状都不动。依据是：pre-norm 不靠 warmup 技巧也能训练深层网络，SwiGLU 在公开的模型论文里让困惑度改善约半个点，旋转编码提供相对位置和一个用于长上下文的旋钮，分组查询注意力按查询头与键值头之比缩小 cache 显存。

## Full answer

### 审查表

| 组件 | 现状 | 要求改为 | 原因 |
|---|---|---|---|
| 归一化 | 相加之后的 LayerNorm | 子层之前的 RMSNorm | pre-norm 不用 warmup 就能训练深层堆叠；RMSNorm 去掉了减均值，稳定性相当 |
| FFN 激活 | ReLU | SwiGLU | 公开的对比中困惑度改善约 0.5 个点 |
| FFN 扩展倍数 | 4，两个矩阵 | 约 2.6，三个矩阵 | 参数预算相同 |
| 位置 | 加在 embedding 上的正弦编码 | 对 Q 和 K 做旋转 | 白得相对位置，还有一个可缩放的基数用于长上下文 |
| 注意力 | 完整多头 | 分组查询，或潜在注意力 | cache 里的键值头更少，质量几乎不损失 |
| 偏置项 | 有 | 无 | 困惑度略好，模型更小 |

### 保留什么

骨架不变：embedding，一组 block，每个 block 把注意力和 FFN 加到残差流上，最后一个 norm 和一个输出头。错开一位的交叉熵不变。因果 mask 不变。课程综合项目里的架构正是这副骨架插上现代组件，它的输出头和 token embedding 共享权重。

### 怎样稳妥地落地这些修改

1. 每项替换都放在一个开关后面，每换一项就确认输出形状，做法和课程的构建步骤一样。
2. 在一个小的复制任务上，把旧 block 和新 block 各训练固定步数，比较损失；课程练习用的是一个玩具任务的 100 步。
3. 使用框架提供的融合注意力调用，这样输入条件允许时会调度分块 kernel。
4. 在输出头之前保留最后一个 norm；pre-norm 需要它，post-norm 不需要。

### 哪些需要重新训练

这些修改都改变了 block 计算的函数，所以用旧 block 训练的检查点不能靠改代码就用上它们。分组查询是文献里单独对待的例外：训练好的多头检查点可以转换后再微调。

## Follow-ups

- **Level 3:** SwiGLU 的扩展倍数为什么约是 2.6，而不是 4？ Expected: 它有三个矩阵而不是两个，选这个倍数是为了让总参数和旧网络持平。
- **Level 3:** 这六项修改里，哪些能不重新训练就用到已有检查点上？ Expected: 没有一项能干净地直接用上；分组查询可以转换后微调，其余的都改变了函数，需要训练。
- **Level 4:** 审查中你会拒绝改什么？ Expected: 残差骨架、因果 mask 和下一个 token 的损失；现代 block 改进的是组件，不是框架。
- **Level 4:** 团队想保留正弦编码，理由是它没有参数。你怎么回答？ Expected: 旋转编码同样没有参数，作用在注意力内部，编码相对距离，还能通过缩放基数延伸到更长的上下文。

## Wrong answers

- "RMSNorm 是更便宜的近似，会损失精度。" 课程记录它少一步运算，稳定性至少一样好。
- "SwiGLU 让前馈网络的参数翻倍。" 宽度约 2.6 倍时，它的三个矩阵和旧的两个矩阵参数量持平。
- "用了 pre-norm 就不需要最后的归一化了。" 恰恰相反：残差流没有归一化，所以输出头之前需要最后一个 norm。

## Taught in

[完整 transformer 一课](../../../phases/07-transformers-deep-dive/05-full-transformer/)给出 2017 与 2026 的对比表，[综合项目一课](../../../phases/07-transformers-deep-dive/14-build-a-transformer-capstone/)组装了现代 block，[位置编码一课](../../../phases/07-transformers-deep-dive/04-positional-encoding/)讲解了旋转编码。
