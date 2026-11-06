---
id: gradient-check-step-size
title: 因检验设置不当而失败的梯度检验
card: math-classical-ml
kind: debug
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [gradient-checking, finite-differences, numerical-stability, autodiff]
minutes: 12
lessons: [phases/01-math-foundations/13-numerical-stability, phases/01-math-foundations/05-chain-rule-and-autodiff]
manuals: []
practice: [mlp-backprop]
cheatsheet: [information-numerics]
related: [math-classical-ml/grad-accumulate-plus-equals, math-classical-ml/variance-of-large-numbers]
updated: 2026-11-03
---

你为一个从零构建的神经网络添加了新层并运行梯度检验。某个权重在解析梯度与数值梯度之间的相对误差约为 1e-3。一位同事认为反向传播实现存在 bug。在表示赞同前，你如何判断问题出在反向传播实现本身还是梯度检验自身的设置上？

## Short answer

1e-3 附近的相对误差位于警告区间内，因此首先要确保检验本身的可靠性。采用双侧差分公式，将步长设置在 1e-5 到 1e-7 之间，使用 float64 双精度运行检验，并在相对误差的分母中取两个梯度的绝对值较大者。如果在此条件下误差仍维持在 1e-3 附近或继续增大，说明反向传播实现确实有误；若误差降至 1e-5 以下，则说明原先是检验设置存在缺陷。

## Full answer

### 梯度检验计算的内容

单个权重的数值梯度使用中心差分计算：权重加 h 处的损失减去权重减 h 处的损失，再除以 2h。其截断误差随 h 的平方衰减，而单侧差分仅随 h 线性衰减。相对误差将其与解析梯度对比：

```text
rel_error = |analytical - numerical| / max(|analytical|, |numerical|, 1e-8)
```

课程中给出的阈值基准：低于 1e-7 为精确匹配，低于 1e-5 为可接受，高于 1e-3 提示存在 bug，高于 1 则表明梯度完全错误。

### 导致检验失真的常见原因

1. **步长过大。** 差分计算的是割线斜率而非切线斜率。应缩小步长 h。
2. **步长过小。** 两次计算的损失极其接近，减法会发生严重的灾难性抵消：真实差值小于舍入噪声，噪声成为有效前导数字。在 float32 下该现象极早发生，因此应在 float64 下运行检验，并将 h 控制在 1e-5 到 1e-7 之间。
3. **测试点位于不可导拐点。** ReLU 或 max 操作在零点处无导数，跨越拐点的步长会测出两种不同的斜率。应在远离拐点的测试点检验，或选择激活侧已确定的输入。
4. **随机因素。** 两次损失评估之间如果存在 Dropout 或随机数据打乱，会导致损失因 h 以外的原因发生变动。应固定随机种子并在评估模式下运行。
5. **分母选取错误。** 仅除以解析梯度本身，在其接近零时会使相对误差暴增。应取两者绝对值较大者并设置最小截断阈值。

### 确认检验有效后再排查反向传播

当检验配置可靠时，稳定的 1e-3 误差确实意味着代码 bug。应逐个参数组分别检验以定位问题层，并将每个操作的局部导数实现与理论公式对比。自动微分课程中的引擎在每次添加新操作时都会与有限差分对比测试，这种工程习惯能够有效防范此类问题。

## Follow-ups

- **Level 3:** 为什么优先使用双侧差分公式而非单侧差分？ Expected: 其误差随 h 平方衰减而非线性衰减，因此适中的 h 即可获得精确估计且不会发生灾难性抵消。
- **Level 3:** 为什么不在生产训练的每一步都运行梯度检验？ Expected: 每个参数都需要两次前向传播，运行极其缓慢；它只适合用于单元测试与调试阶段。
- **Level 4:** 大多数权重的误差极小，但某一层的少数权重误差较大，这反映了什么模式？ Expected: 该层的反向传播大体正确但某条分支有误，例如复用输入的梯度被覆盖而非累加，或者这些权重恰好落在了激活拐点上。
- **Level 4:** 如何检验包含随机掩码的层？ Expected: 固定随机种子使两次损失评估使用完全相同的掩码，或在关闭掩码的评估模式下运行检验。

## Wrong answers

- "让 h 尽可能小以获得最精确的导数。" 低于舍入精度时减法会发生有效数字抵消，结果变为纯噪声；h 存在下限，在 float64 中约为 1e-7。
- "1e-3 的相对误差已经足够接近，可以直接交付。" 课程将 1e-3 设为判定 bug 的临界边界；稳定的该量级误差意味着梯度实现有误，会拖慢甚至破坏训练。
- "使用绝对差值代替相对误差。" 较大梯度与微小梯度所需的容差截然不同；带有截断分母的相对误差能够同时应对这两种情况。

## Taught in

[数值稳定性课程](../../../phases/01-math-foundations/13-numerical-stability/)给出了中心差分公式、相对误差及其阈值，[链式法则与自动微分课程](../../../phases/01-math-foundations/05-chain-rule-and-autodiff/)则将该检验内置到了微分引擎中。
