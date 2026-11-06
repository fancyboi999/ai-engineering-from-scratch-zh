---
id: softmax-cross-entropy-gradient
title: 计算交叉熵损失导数的三行代码
card: deep-learning
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [cross-entropy, softmax, gradient, loss-functions]
minutes: 8
lessons: [phases/03-deep-learning-core/05-loss-functions]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [deep-learning-training]
related: [deep-learning/mse-predicts-half-for-everything, deep-learning/loss-stuck-at-log-classes]
updated: 2026-11-03
---

该函数声称能够针对每个 logit，精确返回交叉熵损失的导数：

```python
def cce_gradient(logits, target_index):
    probs = softmax(logits)
    grads = list(probs)
    grads[target_index] -= 1.0
    return grads
```

请解释为什么三行代码就足够了。然后分别描述模型置信度极高且预测正确、以及置信度极高且预测错误时的梯度向量形态。

## Short answer

在单热标签下，Softmax 后接交叉熵损失时，损失关于第 i 个 logit 的偏导数精确等于类别 i 的预测概率减去类别 i 的真实目标值。该函数拷贝了所有预测概率并在正确类别所在索引处减去 1，所得向量正是该解析梯度。当模型置信度高且预测正确时，所有项均接近于零。当模型置信度高且预测错误时，真实类别处的梯度接近 -1，而错误选中的类别处的梯度接近 +1。

## Full answer

### 形式为何如此精简

损失定义为真实类别预测概率的负对数，而该概率为真实 logit 的指数值除以所有 logits 指数值的总和。对其关于 logit i 求偏导：分母的对数项对每一个 i 贡献了 +p_i，而分子的对数项仅对真实类别目标贡献了 -1。单纯 Softmax 算子自身的雅可比导数是一个完整的稠密矩阵；但一旦与交叉熵的对数复合，复杂矩阵立即塌缩为预测概率向量减去单热标签向量 (p - y)。课程特别强调，Softmax 与交叉熵在数学上是天生配对的。

### 解读具体的梯度向量

- 置信度极高且预测正确：真实类别处的概率 p 极度接近 1，对应项 (p - 1) 接近 0；所有其他类别处的概率 p 均接近 0。整个梯度向量几乎全为零，网络参数几乎不发生更新。
- 置信度极高且预测错误：真实类别处的概率 p 接近 0，该项接近 -1；而错误选中的类别其概率 p 接近 1，对应项接近 +1。这构成极大的校正步长，强力压低错误类别的 logit，同时大幅拉高真实类别的 logit。
- 梯度向量各元素之和恒严格等于零，因为所有预测概率之和为 1，单热标签之和也为 1。这为手写代码的单元测试提供了一个极为便捷的恒等式核验手段。

### 三行代码背后的前置依赖

所调用的 softmax 函数必须是数值安全版本（在求指数前从所有 logits 中减去最大值），否则大数值 logits 会直接导致 exp 溢出。主流工业框架正是出于这一原因将 log-softmax 与负对数似然（NLLLoss）融合成一个直接接收 logits 的算子；课程明确建议优先调用这种融合后的损失算子，而非先算 softmax 再单独求对数。

### 引入标签平滑（Label Smoothing）时的形态

将单热标签替换为平滑向量：例如在 10 分类任务中 alpha 设为 0.1，真实类别的目标标签变为 0.91，其余 9 个类别各分配 0.01。梯度依然是 p 减去该目标向量，因此梯度在预测概率达到 0.91 时即归零，而非逼近极限 1.0，从而有效遏制了 logits 无休止地盲目膨胀。

## Follow-ups

- **Level 2:** 该梯度向量所有元素相加的总和是多少？ Expected: 严格等于零；所有类别的预测概率之和为 1，单热目标标签之和也为 1。
- **Level 2:** 为什么把 Softmax 与交叉熵搭配，而不是与平方误差搭配？ Expected: 对数运算完美抵消了指数函数的非线性饱和，使得导数关于预测误差呈简洁的线性形式且永不饱和消失。
- **Level 3:** 在 10 分类任务中引入 0.1 的标签平滑，梯度形式会发生什么变化？ Expected: 目标向量变为真实类为 0.91、其余类为 0.01；梯度为 p 减去该向量，在真实类概率为 0.91 而非 1.0 时梯度归零。
- **Level 3:** 深度学习框架同时提供接收 logits 的损失和接收对数概率的损失，你调用哪一个？ Expected: 优先调用接收 logits 的算子，它在一个数值稳定的算子中融合了 log-softmax 与负对数似然计算。

## Wrong answers

- "真实类别处的梯度是 -1 / p，就像二元交叉熵那样。" -1 / p 是关于概率 p 的导数；通过复合 Softmax 后，关于未激活 logit 的导数已经简化为 (p - target)。
- "只有真实类别所在维度才有梯度，因为损失公式里只有真实类别项。" 所有 logits 均出现在 Softmax 的归一化分母中，因此每个 logit 都会分得其对应预测概率 p 作为梯度贡献。
- "计算得到的梯度还必须除以类别总数。" 单样本梯度直接就是 (p - target)；批次平均除以的是批次大小（batch size），绝不是类别总数。

## Taught in

[损失函数课程](../../../phases/03-deep-learning-core/05-loss-functions/)手写了该求导函数，并深入剖析了 Softmax 与交叉熵天然配对的代数原理。
