---
id: weight-matrix-rows-and-columns
title: 从 Layer 类实现推导 2-3-1 网络的张量形状
card: deep-learning
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, screen]
tags: [forward-pass, shapes, weight-matrix, debugging]
minutes: 8
lessons: [phases/03-deep-learning-core/02-multi-layer-networks]
manuals: []
practice: []
cheatsheet: [neural-net-basics]
related: [deep-learning/xor-needs-a-hidden-layer, deep-learning/missing-zero-grad]
updated: 2026-11-03
---

该 Layer 类来自一个纯 Python 实现的前向传播：

```python
class Layer:
    def __init__(self, n_inputs, n_neurons, weights=None, biases=None):
        if weights is not None:
            self.weights = weights
        else:
            self.weights = [
                [random.uniform(-1, 1) for _ in range(n_inputs)]
                for _ in range(n_neurons)
            ]
        self.biases = biases if biases is not None else [0.0] * n_neurons

    def forward(self, inputs):
        self.last_output = []
        for neuron_idx in range(len(self.weights)):
            z = sum(w * x for w, x in zip(self.weights[neuron_idx], inputs))
            z += self.biases[neuron_idx]
            self.last_output.append(sigmoid(z))
        return self.last_output
```

对于一个 2-3-1 结构的网络，请给出每个权重矩阵与偏置向量的形状。然后说明若有人误将隐藏层实例化为 `Layer(n_inputs=3, n_neurons=2)`，程序会发生什么。

## Short answer

隐藏层权重为一个 3 乘 2 的矩阵（每个神经元对应一行，每个输入对应一列），配有长度为 3 的偏置；输出层权重为一个 1 乘 3 的矩阵，配有长度为 1 的偏置。如果误写了调用的参数顺序，则会构建出一个 2 乘 3 的矩阵：前向传播中的 zip 将每行的 3 个权重与传入的 2 个输入配对并在较短处截断，隐藏层只返回 2 个输出值而非 3 个，紧接着输出层的 zip 也会截断。整个程序不会抛出任何异常，但网络默默计算着完全错误的函数。

## Full answer

### 维度规则与推导表格

网络层的权重矩阵形状为 (当前层神经元数, 上一层神经元数)。行数严格对应当前层的输出节点，列数严格对应上一层的输入节点。

| 步骤 | 操作说明 | 张量形状 | 输出结果 |
|---|---|---|---|
| 输入 | x | | (2,) |
| 隐藏层线性运算 | W1 x + b1 | W1 (3, 2), b1 (3,) | (3,) |
| 隐藏层非线性激活 | sigmoid | | (3,) |
| 输出层线性运算 | W2 h + b2 | W2 (1, 3), b2 (1,) | (1,) |
| 输出层非线性激活 | sigmoid | | (1,) |

在给出的类实现中，`len(self.weights)` 是当前层的神经元总数，且每一行包含 `n_inputs` 个权重元素。前向循环对每一行计算点积，加上该行的偏置标量，随后应用 Sigmoid。前一层的输出列表作为后一层的输入列表直接传入。

### 参数调反时的执行破坏

若调用 `Layer(n_inputs=3, n_neurons=2)`，代码分配了包含两行、每行三个权重的结构。前向传播接收长度为 2 的输入向量。Python 原生内置的 zip 函数会在较短的输入序列耗尽时自动终止，因此每一行只计算了前两个权重的乘积，第三个权重被静默彻底忽略。隐藏层仅返回两个输出值。由于输出层原本是按照接收 3 个输入构建的，输出层的 zip 同样会自动丢弃其最后一个权重。没有任何异常报错，没有任何警告日志，模型参数部分处于坏死状态。专业的矩阵计算库会在内侧维度不匹配时抛出硬异常；而纯 Python 循环的这种静默截断极为危险，这也是课程将追踪张量形状视作深度学习最基础最重要的调试技能的原因。

### 保证快速失败的加固手段

在前向传播开头添加断言，确保输入列表的长度严格等于当前权重矩阵的列数；或者在 Network 容器构建时自动校验前一层的神经元数与后一层的输入数完全相等。

## Follow-ups

- **Level 2:** 这个 2-3-1 网络总共有多少个可学习参数？ Expected: 隐藏层 9 个参数（6 个权重加 3 个偏置），输出层 4 个参数（3 个权重加 1 个偏置）。
- **Level 2:** 为什么 Python 循环在参数形状颠倒时不会抛出异常？ Expected: Python 的 zip 在较短序列耗尽时静默终止，多余的权重被直接忽略而没有触发越界；而正规矩阵乘法库会报错。
- **Level 3:** 应该在何处增加防线使得该错误能够立即暴露？ Expected: 在 forward 方法中增加断言校验输入长度是否等于列数，或在 Network 初始化时自动对比相邻层的维度。
- **Level 3:** 文本模型的隐藏状态维度为 768，输入为一个 token id，上述维度规则依然成立吗？ Expected: 完全成立；Embedding 层将 token id 映射为 768 维向量，后续每个权重矩阵的行数等于自身输出宽度、列数等于前一层宽度。

## Wrong answers

- "权重矩阵形状是输入数乘神经元数，因此隐藏层是 2 乘 3。" 在该类实现中，每一行代表一个神经元在所有输入上的权重，因此矩阵维度为神经元数乘输入数（3 乘 2）。
- "张量形状一旦配错，代码肯定会抛出报错中断。" 矩阵库的 matmul 确实会抛异常，但带有 zip 的纯 Python 循环会静默截断，且框架中的广播机制同样可能静默掩盖错误。
- "每个输入对应一个独立的偏置项。" 偏置是绑定在神经元输出上的，因此偏置的数量严格等于当前网络层的输出神经元数。

## Taught in

[多层神经网络课程](../../../phases/03-deep-learning-core/02-multi-layer-networks/)构建了该 Layer 类，并完整推导了 2-3-1 网络的张量维度流转。
