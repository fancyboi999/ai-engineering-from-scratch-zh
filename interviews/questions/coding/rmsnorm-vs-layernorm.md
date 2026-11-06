---
id: rmsnorm-vs-layernorm
title: 把最后的 LayerNorm 换成 RMSNorm 而不出错
card: coding
kind: code-reading
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [layernorm, rmsnorm, normalization]
minutes: 10
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [layer-norm-rms-norm]
cheatsheet: [transformers-attention, gpt-from-scratch-training]
related: [coding/decay-split-param-groups]
updated: 2026-11-03
---

组装课说，换掉激活函数并把 LayerNorm 替换成 RMSNorm，它的模型就变成了下一个开源模型家族。一位候选人提交了这个 RMSNorm：

```python
def rms_norm(x, weight, eps):
    mean = x.mean(axis=-1, keepdims=True)
    var = ((x - mean) ** 2).mean(axis=-1, keepdims=True)
    return weight * (x - mean) / np.sqrt(var) + eps
```

哪里错了？正确的函数计算什么？

## Short answer

这是一个没有平移项的 LayerNorm，不是 RMSNorm，而且它把 epsilon 加在平方根之后，而不是根号里面。RMSNorm 不减均值。它在最后一个轴上用输入除以平方均值的平方根（epsilon 在根号内），再乘以一个可学习的权重。

## Full answer

### 两种归一化

```python
def layer_norm(x, gamma, beta, eps):
    mean = x.mean(axis=-1, keepdims=True)
    var = ((x - mean) ** 2).mean(axis=-1, keepdims=True)
    return gamma * (x - mean) / np.sqrt(var + eps) + beta


def rms_norm(x, weight, eps):
    ms = (x ** 2).mean(axis=-1, keepdims=True)
    return weight * x / np.sqrt(ms + eps)
```

LayerNorm 对每个 token 向量做中心化和缩放，然后应用可学习的缩放和平移。RMSNorm 保留向量的方向，只固定它的幅度。它不减均值，也没有平移，每个 token 省一次归约，每层省一个参数向量。

### epsilon

epsilon 的作用是在方差或平方均值接近零时让除法仍有定义。放在根号里，它给分母设了下界。放在根号外，它对零方差毫无帮助，还给每个输出加了一个常数，两种情况下都是错的。练习针对这两种放法各有一个变异体。

### 在哪个轴上

两种归一化都在最后一个轴（特征轴）上归约，每个 batch 元素里的每个 token 各自独立计算。在 batch 轴上归约，这一层就变成了 batch 统计量，会随 batch 组成而变化，单个样本推理也会出错。

### 有偏方差

LayerNorm 用有偏方差，也就是偏差平方的总和除以特征数。分母少一的无偏估计是统计学的惯例，不属于这里；用了它，输出会和所有标准库版本差一个与宽度有关的系数。

### 为什么在组装中替换是安全的

最后的归一化位于最后一个块和共享权重的输出头之间，两个函数的输入输出形状相同。换掉这个类，去掉平移参数，输出头、嵌入和生成循环都不用动。

## Follow-ups

- **Level 3:** 调用方传入的 epsilon 参数控制什么？函数忽略它会怎样？ Expected: 分母的下限；忽略它而用固定常数，调用方传入别的值时，和参考实现的比较就会失败。
- **Level 3:** RMSNorm 为什么没有平移参数？ Expected: 它不对输入做中心化，没有要恢复的均值；需要平移时，下一个线性层的偏置可以吸收。
- **Level 4:** 预训练检查点里有 LayerNorm 的缩放和平移，你换上了 RMSNorm。什么会坏？ Expected: 平移参数没地方加载，缩放是在中心化后的输入上学到的，所以加载后的模型不再等于训练出的函数。

## Wrong answers

- "RMSNorm 就是去掉平移的 LayerNorm。" 它还去掉了减均值；没有这个区别，它就不是另一种层了。
- "对正常输入来说，epsilon 放在哪里无所谓。" 它恰恰对它要处理的那些输入有影响，也就是方差接近零的输入。
- "用无偏方差，更正确。" 标准库版本用的是有偏形式；这是契约问题，不是统计问题。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)放置了最后的 LayerNorm 并提到换成 RMSNorm，[归一化练习](../../../practice/layer-norm-rms-norm/)检查两个函数。
