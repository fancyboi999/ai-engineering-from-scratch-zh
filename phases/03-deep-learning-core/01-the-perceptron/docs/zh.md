# 感知机

> 感知机是神经网络的原子。把它剖开，里面只有权重、偏置和一个决策。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1（线性代数直觉）
**预计时间：** ~60 分钟

## 学习目标

- 用 Python 从零实现一个感知机，包括权重更新规则和阶跃激活函数
- 解释为什么单个感知机只能解决线性可分问题，并演示 XOR 失败的案例
- 用 OR、NAND、AND 三种门组合出一个多层感知机来解决 XOR
- 训练一个带 sigmoid 激活和反向传播的两层网络，让它自动学会 XOR

## 问题背景

你懂向量和点积，也知道矩阵把输入变换成输出。但机器是怎么*学会*该用哪种变换的？

感知机回答了这个问题。它是可能存在的最简单的学习机器：拿一些输入，乘上权重，加个偏置，做一个二元决策。然后调整。就这么简单。有史以来造出的每一个神经网络，都是把这个想法一层层叠起来的产物。

理解感知机，就是理解代码里的"学习"到底是什么意思：不断调整数字，直到输出和现实对上。

## 核心概念

### 一个神经元，一个决策

一个感知机接收 n 个输入，每个乘上一个权重，求和，加上偏置，再把结果送进激活函数。

```mermaid
graph LR
    x1["x1"] -- "w1" --> sum["Σ(wi*xi) + b"]
    x2["x2"] -- "w2" --> sum
    x3["x3"] -- "w3" --> sum
    bias["偏置"] --> sum
    sum --> step["step(z)"]
    step --> out["输出 (0 或 1)"]
```

阶跃函数很粗暴：如果加权和加偏置 >= 0，输出 1；否则输出 0。

```
step(z) = 1  if z >= 0
           0  if z < 0
```

这是一个线性分类器。权重和偏置定义了一条线（在更高维度里是一个超平面），把输入空间切成两块。

### 决策边界

对于两个输入，感知机在二维空间里画出一条线：

```
  x2
  ┤
  │  Class 1        /
  │    (0)          /
  │                /
  │               / w1·x1 + w2·x2 + b = 0
  │              /
  │             /     Class 2
  │            /        (1)
  ┼───────────/──────────── x1
```

线一侧的一切都输出 0，另一侧的一切都输出 1。训练就是挪动这条线，直到它正确地把两类分开。

### 学习规则

感知机的学习规则很简单：

```
For each training example (x, y_true):
    y_pred = predict(x)
    error = y_true - y_pred

    For each weight:
        w_i = w_i + learning_rate * error * x_i
    bias = bias + learning_rate * error
```

如果预测正确，error = 0，什么都不变。如果预测成 0 但应该是 1，权重增大。如果预测成 1 但应该是 0，权重减小。学习率控制每次调整的幅度。

### XOR 问题

问题就出在这里。看这几个逻辑门：

```
AND gate:           OR gate:            XOR gate:
x1  x2  out         x1  x2  out         x1  x2  out
0   0   0           0   0   0           0   0   0
0   1   0           0   1   1           0   1   1
1   0   0           1   0   1           1   0   1
1   1   1           1   1   1           1   1   0
```

AND 和 OR 是线性可分的：你可以画一条线把 0 和 1 分开。XOR 不行。没有任何一条线能把 [0,1] 和 [1,0] 从 [0,0] 和 [1,1] 里分出来。

```
AND (separable):        XOR (not separable):

  x2                      x2
  1 ┤  0     1            1 ┤  1     0
    │     /                 │
  0 ┤  0 / 0              0 ┤  0     1
    ┼──/──────── x1         ┼──────────── x1
       line works!          no single line works!
```

这是一个根本性的限制。单个感知机只能解决线性可分问题。Minsky 和 Papert 在 1969 年证明了这一点，差点让神经网络研究停滞了整整十年。

解法：把感知机叠成多层。一个多层感知机可以把两个线性决策组合成一个非线性决策，从而解决 XOR。

```figure
perceptron-boundary
```

## 动手构建

### 第 1 步：Perceptron 类

```python
class Perceptron:
    def __init__(self, n_inputs, learning_rate=0.1):
        self.weights = [0.0] * n_inputs
        self.bias = 0.0
        self.lr = learning_rate

    def predict(self, inputs):
        total = sum(w * x for w, x in zip(self.weights, inputs))
        total += self.bias
        return 1 if total >= 0 else 0

    def train(self, training_data, epochs=100):
        for epoch in range(epochs):
            errors = 0
            for inputs, target in training_data:
                prediction = self.predict(inputs)
                error = target - prediction
                if error != 0:
                    errors += 1
                    for i in range(len(self.weights)):
                        self.weights[i] += self.lr * error * inputs[i]
                    self.bias += self.lr * error
            if errors == 0:
                print(f"Converged at epoch {epoch + 1}")
                return
        print(f"Did not converge after {epochs} epochs")
```

### 第 2 步：在逻辑门上训练

```python
and_data = [
    ([0, 0], 0),
    ([0, 1], 0),
    ([1, 0], 0),
    ([1, 1], 1),
]

or_data = [
    ([0, 0], 0),
    ([0, 1], 1),
    ([1, 0], 1),
    ([1, 1], 1),
]

not_data = [
    ([0], 1),
    ([1], 0),
]

print("=== AND Gate ===")
p_and = Perceptron(2)
p_and.train(and_data)
for inputs, _ in and_data:
    print(f"  {inputs} -> {p_and.predict(inputs)}")

print("\n=== OR Gate ===")
p_or = Perceptron(2)
p_or.train(or_data)
for inputs, _ in or_data:
    print(f"  {inputs} -> {p_or.predict(inputs)}")

print("\n=== NOT Gate ===")
p_not = Perceptron(1)
p_not.train(not_data)
for inputs, _ in not_data:
    print(f"  {inputs} -> {p_not.predict(inputs)}")
```

### 第 3 步：看着 XOR 失败

```python
xor_data = [
    ([0, 0], 0),
    ([0, 1], 1),
    ([1, 0], 1),
    ([1, 1], 0),
]

print("\n=== XOR Gate (single perceptron) ===")
p_xor = Perceptron(2)
p_xor.train(xor_data, epochs=1000)
for inputs, expected in xor_data:
    result = p_xor.predict(inputs)
    status = "OK" if result == expected else "WRONG"
    print(f"  {inputs} -> {result} (expected {expected}) {status}")
```

它永远不会收敛。这就是单个感知机学不会 XOR 的硬证据。

### 第 4 步：用两层解决 XOR

诀窍在于：XOR = (x1 OR x2) AND NOT (x1 AND x2)。组合三个感知机：

```mermaid
graph LR
    x1["x1"] --> OR["OR 神经元"]
    x1 --> NAND["NAND 神经元"]
    x2["x2"] --> OR
    x2 --> NAND
    OR --> AND["AND 神经元"]
    NAND --> AND
    AND --> out["输出"]
```

```python
def xor_network(x1, x2):
    or_neuron = Perceptron(2)
    or_neuron.weights = [1.0, 1.0]
    or_neuron.bias = -0.5

    nand_neuron = Perceptron(2)
    nand_neuron.weights = [-1.0, -1.0]
    nand_neuron.bias = 1.5

    and_neuron = Perceptron(2)
    and_neuron.weights = [1.0, 1.0]
    and_neuron.bias = -1.5

    hidden1 = or_neuron.predict([x1, x2])
    hidden2 = nand_neuron.predict([x1, x2])
    output = and_neuron.predict([hidden1, hidden2])
    return output


print("\n=== XOR Gate (multi-layer network) ===")
for inputs, expected in xor_data:
    result = xor_network(inputs[0], inputs[1])
    print(f"  {inputs} -> {result} (expected {expected})")
```

四种情况全对。把感知机叠成多层，就能造出任何单个感知机都画不出的决策边界。

### 第 5 步：训练一个两层网络

第 4 步是手工接死权重。这对 XOR 管用，但对那些你事先并不知道正确权重的真实问题就不行了。解法：把阶跃函数换成 sigmoid，通过反向传播自动学出权重。

```python
class TwoLayerNetwork:
    def __init__(self, learning_rate=0.5):
        import random
        random.seed(0)
        self.w_hidden = [[random.uniform(-1, 1), random.uniform(-1, 1)] for _ in range(2)]
        self.b_hidden = [random.uniform(-1, 1), random.uniform(-1, 1)]
        self.w_output = [random.uniform(-1, 1), random.uniform(-1, 1)]
        self.b_output = random.uniform(-1, 1)
        self.lr = learning_rate

    def sigmoid(self, x):
        import math
        x = max(-500, min(500, x))
        return 1.0 / (1.0 + math.exp(-x))

    def forward(self, inputs):
        self.inputs = inputs
        self.hidden_outputs = []
        for i in range(2):
            z = sum(w * x for w, x in zip(self.w_hidden[i], inputs)) + self.b_hidden[i]
            self.hidden_outputs.append(self.sigmoid(z))
        z_out = sum(w * h for w, h in zip(self.w_output, self.hidden_outputs)) + self.b_output
        self.output = self.sigmoid(z_out)
        return self.output

    def train(self, training_data, epochs=10000):
        for epoch in range(epochs):
            total_error = 0
            for inputs, target in training_data:
                output = self.forward(inputs)
                error = target - output
                total_error += error ** 2

                d_output = error * output * (1 - output)

                saved_w_output = self.w_output[:]
                hidden_deltas = []
                for i in range(2):
                    h = self.hidden_outputs[i]
                    hd = d_output * saved_w_output[i] * h * (1 - h)
                    hidden_deltas.append(hd)

                for i in range(2):
                    self.w_output[i] += self.lr * d_output * self.hidden_outputs[i]
                self.b_output += self.lr * d_output

                for i in range(2):
                    for j in range(len(inputs)):
                        self.w_hidden[i][j] += self.lr * hidden_deltas[i] * inputs[j]
                    self.b_hidden[i] += self.lr * hidden_deltas[i]
```

```python
net = TwoLayerNetwork(learning_rate=2.0)
net.train(xor_data, epochs=10000)
for inputs, expected in xor_data:
    result = net.forward(inputs)
    predicted = 1 if result >= 0.5 else 0
    print(f"  {inputs} -> {result:.4f} (rounded: {predicted}, expected {expected})")
```

和第 4 步有两个关键区别。第一，sigmoid 替换了阶跃函数——它是平滑的，所以梯度存在。第二，`train` 方法把误差从输出层向后传播到隐藏层，按每个权重对误差的贡献成比例地调整它。这就是 20 行代码里的反向传播。

这是通往第 03 课的桥梁。`d_output` 和 `hidden_deltas` 背后的数学，就是把链式法则应用到网络这张图上。我们会在那一课里正经地推导它。

## 实际使用

你刚刚从零写出来的一切，一行 import 就有现成的：

```python
from sklearn.linear_model import Perceptron as SkPerceptron
import numpy as np

X = np.array([[0,0],[0,1],[1,0],[1,1]])
y = np.array([0, 0, 0, 1])

clf = SkPerceptron(max_iter=100, tol=1e-3)
clf.fit(X, y)
print([clf.predict([x])[0] for x in X])
```

五行。你那 30 行的 `Perceptron` 类做的是同一件事。sklearn 版本多了收敛检查、多种损失函数和稀疏输入支持——但核心循环完全一样：加权和、阶跃函数、按误差更新权重。

真正的差距在规模上才显现。生产级网络里会变的东西：

- 阶跃函数变成 sigmoid、ReLU 或其他平滑激活函数
- 权重通过反向传播自动学习（第 03 课）
- 层变深：3 层、10 层、100+ 层
- 同一个原理始终成立：每一层都从上一层的输出里造出新特征

单个感知机只能画直线。把它们叠起来，你就能画出任意形状。

## 拿去用

本课产出：
- `outputs/skill-perceptron.md` —— 一个 skill，讲清楚什么时候需要单层架构、什么时候需要多层架构

## 练习

1. 在 NAND 门上训练一个感知机（通用门——任何逻辑电路都能用 NAND 搭出来）。验证它的权重和偏置构成一个有效的决策边界。
2. 修改 Perceptron 类，让它在每个 epoch 追踪决策边界（w1*x1 + w2*x2 + b = 0）。打印出 AND 门训练过程中这条线是怎么移动的。
3. 构建一个 3 输入感知机，只在 3 个输入里至少有 2 个为 1 时才输出 1（多数表决函数）。它线性可分吗？为什么？

## 关键术语

| 术语 | 大家怎么说 | 实际是什么 |
|------|----------------|----------------------|
| 感知机（Perceptron） | "一个假神经元" | 一个线性分类器：输入和权重的点积，加偏置，过阶跃函数 |
| 权重（Weight） | "一个输入有多重要" | 一个乘数，缩放每个输入对决策的贡献 |
| 偏置（Bias） | "阈值" | 一个常数，平移决策边界，让感知机在输入全为零时也能激活 |
| 激活函数（Activation function） | "把值压扁的那个东西" | 在加权和之后施加的函数——感知机用阶跃函数，现代网络用 sigmoid/ReLU |
| 线性可分（Linearly separable） | "你能在它们之间画一条线" | 一个数据集，单个超平面就能把各类完美分开 |
| XOR 问题 | "感知机搞不定的那个东西" | 单层网络无法学习非线性可分函数的证明 |
| 决策边界（Decision boundary） | "分类器切换的地方" | 超平面 w*x + b = 0，把输入空间分成两类 |
| 多层感知机（Multi-layer perceptron） | "一个真正的神经网络" | 感知机叠成多层，每一层的输出喂给下一层的输入 |

## 延伸阅读

- Frank Rosenblatt，《The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain》（1958）—— 开启一切的原始论文
- Minsky & Papert，《Perceptrons》（1969）—— 这本书证明了 XOR 无法被单层网络解决，让感知机研究停滞了整整十年
- Michael Nielsen，《Neural Networks and Deep Learning》第 1 章（http://neuralnetworksanddeeplearning.com/）—— 免费在线，对感知机如何组合成网络讲得最直观
