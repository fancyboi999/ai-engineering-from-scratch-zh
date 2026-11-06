---
id: sinusoidal-table-swap
title: 把可学习的位置表换成固定的正弦表
card: coding
kind: take-home
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, take-home]
tags: [positional-encoding, sinusoidal, parameter-count]
minutes: 20
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [sinusoidal-positional-encoding]
cheatsheet: [positional-encoding, gpt-from-scratch-training]
related: [coding/top-k-then-sample]
updated: 2026-11-03
---

参考的小型 GPT 配置用了一个形状为 1024 乘 768 的可学习位置嵌入。把它换成一个在构造时计算好的正弦表，加到一批 token 嵌入上，并说明参数量变化了多少，以及模型为什么仍然能完成前向。

## Short answer

构建一张每个位置一行、每个特征一列的表：第 `2i` 列放正弦，第 `2i + 1` 列放余弦，角度是位置除以底数的幂，指数为 `2i` 除以模型宽度。把它注册成 buffer，每次前向切出前 `T` 行，加到 token 嵌入上，不改调用方的数组。这张表和可学习的表形状相同，所以前向不变；表不再被学习，参数量因此减少 786,432 个。

## Full answer

### 这张表

```python
def sinusoidal_pe(max_len, d_model, base):
    pos = np.arange(max_len)[:, None]
    end = 2 * (d_model // 2)
    i = np.arange(0, end, 2)
    angle = pos / base ** (i / d_model)
    pe = np.zeros((max_len, d_model))
    pe[:, 0:end:2] = np.sin(angle)
    pe[:, 1:end:2] = np.cos(angle)
    return pe


class SinusoidalPositions(nn.Module):
    def __init__(self, max_len, d_model, base):
        super().__init__()
        table = torch.as_tensor(sinusoidal_pe(max_len, d_model, base)).float()
        self.register_buffer("pe", table)

    def forward(self, x):
        return x + self.pe[: x.shape[1]]
```

指数是 `2i` 除以宽度，所以频率在各列之间从一降到底数分之一。各列在正弦和余弦之间交替；把所有正弦放在前半、所有余弦放在后半是另一种排列，和参考实现对不上。位置从零开始。宽度为奇数时，最后一列没有配对，保持为零。这张表用 numpy 构建一次，存为 torch buffer，所以它会跟着模型移到对应设备上，相加的两个张量在同一个设备上。

### 为什么前向不变

组装时，在第一个块之前给每个 token 向量加上一个位置向量。下游没有任何部分知道这个向量来自可学习的表还是固定的表。形状契约相同，所以各个块、最后的 LayerNorm 和共享权重的输出头都照常运行。

### 参数量

可学习的表有 1024 行，每行 768 个值。把它从参数列表里去掉，去重后的参数量减少 786,432。参数计数器必须按唯一张量计数，共享权重的语言模型头才不会被算两次；它也不能把 buffer 算进去。

### 要避免的两个错误

- 用 `+=` 原地加表，会改掉调用方的嵌入，而训练循环还持有它们。
- 指数除以偶数部分的宽度而不是完整宽度，宽度为奇数的模型就会得到一个更窄模型的频率。

## Follow-ups

- **Level 2:** 为什么把正弦和余弦交替排列，而不是分成两半？ Expected: 用交替排列训练的检查点认为每对相邻列构成一次旋转，两种排列不能互换。
- **Level 2:** 底数控制什么？ Expected: 最低频率，也就是变化最慢的列开始重复之前能覆盖的最长位置范围。
- **Level 3:** 组装课说哪种位置方案能把这个模型变成下一个模型家族？ Expected: 在注意力内部应用的旋转方案，它取代加性的表，块和输出头保持不变。
- **Level 3:** 固定的表没有参数，模型失去了什么？ Expected: 从数据中学习位置特征的能力，换来的是一张构造时就能扩展到任意长度的表。

## Wrong answers

- "把表注册成参数，让优化器去细调。" 那它又成了可学习的表，参数量也不会减少。
- "位置从一开始，这样第一行就不全是零和一。" 参考实现从零开始；第零行就是位置零的编码。
- "正弦列和余弦列用相同的指数、不同的底数。" 一对列共享同一个角度，只有函数不同。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)把这次替换作为练习并给出了参数差值，[正弦编码练习](../../../practice/sinusoidal-positional-encoding/)检查交替排列。
