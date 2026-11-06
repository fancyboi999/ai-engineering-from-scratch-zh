---
id: grad-accumulate-plus-equals
title: 为什么自动微分引擎对梯度累加而不是直接赋值
card: math-classical-ml
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, ml-depth]
tags: [autodiff, chain-rule, gradient-accumulation, gradient-checking]
minutes: 8
lessons: [phases/01-math-foundations/05-chain-rule-and-autodiff]
manuals: []
practice: [mlp-backprop]
cheatsheet: [calculus-optimization]
related: [math-classical-ml/reverse-mode-one-pass, math-classical-ml/gradient-check-step-size]
updated: 2026-11-03
---

这是一个小型自动微分引擎中的乘法操作：

```python
def __mul__(self, other):
    other = other if isinstance(other, Value) else Value(other)
    out = Value(self.data * other.data, (self, other), '*')
    def _backward():
        self.grad += other.data * out.grad
        other.grad += self.data * out.grad
    out._backward = _backward
    return out
```

一位贡献者将两处 `+=` 替换为 `=`，并在注释中称梯度应该被直接赋值而非累加。XOR 训练循环依然能够运行且损失也在下降。这次修改破坏了什么？如何用一个微型测试证明这一点？

## Short answer

当一个变量输入到两个或多个后续操作中时，它会从各个使用节点分别接收梯度，链式法则规定这些贡献必须相加。如果改为直接赋值，最后执行的反向传播会覆盖前面的计算，导致每个被复用的节点都得到错误的梯度，包括在求和损失中每个样本复用一次的权重。通过一次数值梯度检验即可立即暴露该错误。

## Full answer

### 链式法则对复用节点的规定

当 y 通过两条路径依赖于 x 时，y 关于 x 的导数等于两条路径导数的和。在该引擎中，被使用两次的节点会有两个写入其 `grad` 的闭包。拓扑排序确保在节点将梯度传递给自身子节点之前，该节点的所有使用方均已执行完毕，因此两个闭包都会运行，且后一个必须累加到前一个之上。

### 为什么循环依然能够运行

在 XOR 训练循环中，总损失是 4 个样本各自平方误差的和，每个权重都参与了全部 4 次前向传播。若使用直接赋值，每个权重只保留了最后一个计算样本的梯度贡献。这个方向通常依然指向下坡，因此损失仍会下降。然而，每个参数所计算出的梯度实际上全都是错误的。

### 单行测试用例

```python
x = Value(3.0)
y = x * x
y.backward()
```

此处 `self` 和 `other` 是同一个对象。x 平方在 3 处的正确梯度为 6.0。两个闭包分别累加 3.0，最终得到 6.0。若改为直接赋值，结果仅为 3.0。课程中的 `gradient_check` 对任意表达式做同样的检验：它对比自动微分引擎与中心差分并报告差值，该差值必须远低于 1e-5。

### 累加规则的另一面

正是因为梯度需要累加，训练循环在每次调用 backward 之前必须将所有 `grad` 重置为 0.0。课程通过遍历参数列表做到这一点。各类框架则调用 zero_grad 完成。这两种习惯都源于同一个事实：梯度存储空间本质上是一个累加器。

## Follow-ups

- **Level 2:** 为什么训练循环在反向传播前必须将所有梯度归零？ Expected: 梯度是累加的，第二次 backward 会直接叠加在第一次之上；训练循环需将每个参数的 grad 重置为 0.0。
- **Level 3:** 写出在直接赋值下出错的最简表达式。 Expected: 变量与自身相乘；在 3 处的正确梯度必须是 6.0，而直接赋值会输出 3.0。
- **Level 3:** 为什么拓扑排序与该缺陷密切相关？ Expected: 节点的所有使用方必须在该节点继续传递梯度之前执行；使用直接赋值时，最终结果取决于哪个消费方最后执行。
- **Level 4:** 相同的累加规则在你常用的深度学习框架中体现在何处？ Expected: 张量的 grad 会在多次计算和多次 backward 调用之间累加，因此优化器在每一步更新前都要调用 zero_grad。

## Wrong answers

- "直接赋值没问题，因为每个节点只有一个父节点。" 输入到两个操作的节点在计算图中拥有两个消费方，而求和损失中的每个权重在每个样本中都有一个消费方。
- "损失依然在下降，说明梯度是正确的。" 错误的梯度仍然可能指向下坡方向；只有数值梯度检验才能证明其正确性。
- "应该使用累积平均而非累加求和。" 链式法则要求对所有路径贡献求和；平均操作会使真实梯度除以消费方的数量。

## Taught in

[链式法则与自动微分课程](../../../phases/01-math-foundations/05-chain-rule-and-autodiff/)构建了 Value 类以及能捕获该缺陷的梯度检验工具。
