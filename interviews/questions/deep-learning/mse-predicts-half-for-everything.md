---
id: mse-predicts-half-for-everything
title: 预测 0.5 而损失很低的分类器
card: deep-learning
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [loss-functions, cross-entropy, mse, classification]
minutes: 8
lessons: [phases/03-deep-learning-core/05-loss-functions]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [deep-learning-training]
related: [deep-learning/softmax-cross-entropy-gradient, deep-learning/loss-stuck-at-log-classes]
updated: 2026-11-03
---

一个二分类器在平衡数据集上用均方误差训练，最后对每个输入都输出 0.5 左右。损失低且稳定，优化器也没报任何问题。解释优化器为什么满足于此，以及你要换成哪种损失。

## Short answer

两类各占一半时，恒定输出 0.5 在每一行上的平方误差都是 0.25，课里称之为模型什么也不学所能达到的最小 MSE；而 sigmoid 的平坦区让 MSE 在自信的错误答案附近几乎没有梯度。交叉熵按真实类别预测概率的负对数收费：0.5 收 0.693，0.99 收 0.01，0.01 收 4.6，所以它会把每个预测推向它的标签。换成二元交叉熵。

## Full answer

### MSE 为什么满足

MSE 对预测和标签之差的平方取平均。它对预测的梯度和差值成线性关系。预测要经过 sigmoid，sigmoid 的导数是 p(1 - p)，p 接近 0 或 1 时它接近零。自信的错误答案，比如正样本的 p 接近 0，恰好落在 sigmoid 平坦的地方，所以更新非常小。模型把所有输出往中间挪一点就能让损失降一点，然后停下来，因为梯度已经没什么可说的了。

### 交叉熵为什么不满足

二元交叉熵是负 y log p 减去 (1 - y) log (1 - p)。它对 p 的导数是负 y 除以 p，加上 (1 - y) 除以 (1 - p)。对 p 接近 0 的正样本，这大约是负 1 除以 p，p 越小，它的绝对值越大，没有上界。log 抵消了 sigmoid：损失对 logit 的导数是预测减去目标，和误差成线性，从不平坦。课里给出的量级：正确答案在 0.99 时代价 0.01，错误答案在 0.01 时代价 4.6，比值约为 460。

### 多分类的版本

在 one-hot 目标上，分类交叉熵就是真实类别概率的负对数。10 个类别随机猜时，真实类别的概率是 0.1，代价是 2.3；概率为 0.9 时代价是 0.105。10 分类问题上损失停在 2.3 附近，就是 0.5 这个症状在多分类上的孪生版本。

### 什么时候换损失也没用

只有输入带有关于标签的信号时，换损失才有用。在平衡数据上，如果没有任何预测性特征，两种损失都在恒定 0.5 处最低，交叉熵也会停在那里。怪损失之前，先确认一个简单模型能胜过常数。

### MSE 适合用在哪里

实数值目标的回归，这时你想要的正是和误差成线性的梯度。目标有严重离群值时，课里给的替代方案是 MAE 或 Huber 损失。

## Follow-ups

- **Level 2:** 写出二元交叉熵对 p 的导数。 Expected: 负 y 除以 p，加上 (1 - y) 除以 (1 - p)；正样本的 p 接近 0 时，导数的绝对值没有上界。
- **Level 2:** 交叉熵下预测 0.5 为什么代价是 0.693？ Expected: 它是 0.5 的自然对数取负。
- **Level 3:** 经过 sigmoid 后，对 logit 求交叉熵的导数，得到什么？ Expected: 预测减去目标；log 抵消了 sigmoid 的导数。
- **Level 3:** 什么时候 MSE 是正确的损失？ Expected: 实数值目标的回归；离群值严重时用 MAE 或 Huber 损失。

## Wrong answers

- "降低学习率，让 MSE 正常收敛。" 输出 0.5 正是 MSE 满足的地方；步子小一点，只是更慢地走到那里。
- "MSE 和交叉熵的最小值点相同，所以无所谓。" 它们只在完美拟合时一致。离开那里，MSE 的梯度在交叉熵梯度变大的地方变平。
- "改用准确率作为损失。" 准确率没有可用的梯度；优化器需要平滑的损失。

## Taught in

[损失函数课](../../../phases/03-deep-learning-core/05-loss-functions/)以这个故障开篇，并推导了两种梯度。
