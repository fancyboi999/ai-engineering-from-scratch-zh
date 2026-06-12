# 激活函数

> 没有非线性，你那 100 层的网络只是一个花哨的矩阵乘法。激活函数是那些让神经网络能用曲线思考的门。

**类型：** Build
**语言：** Python
**前置要求：** 第 03.03 课（反向传播）
**预计时间：** ~75 分钟

## 学习目标

- 从零实现 sigmoid、tanh、ReLU、Leaky ReLU、GELU、Swish、softmax 以及它们的导数
- 通过测量信号穿过 10+ 层不同激活函数后的幅度，诊断梯度消失问题
- 检测 ReLU 网络里的死亡神经元，并解释为什么 GELU 能避开这种失败模式
- 为给定架构（transformer、CNN、RNN、输出层）选对激活函数

## 问题背景

把两个线性变换叠起来：y = W2(W1x + b1) + b2。展开它：y = W2W1x + W2b1 + b2。这就只是 y = Ax + c——单个线性变换。无论你叠多少个线性层，结果都塌缩成一次矩阵乘。你那 100 层的网络，表示能力和单层一模一样。

这不是理论上的奇谈。它意味着一个纯线性的深层网络真的学不会 XOR、分不了螺旋数据集、认不出一张脸。没有激活函数，深度只是个幻觉。

激活函数打破线性。它们把每一层的输出通过一个非线性函数扭一下，赋予网络弯曲决策边界、逼近任意函数、真正学习的能力。但选错激活函数，你的梯度要么消失到零（深层网络里的 sigmoid），要么爆炸到无穷（没有谨慎初始化的无界激活），要么神经元永久死亡（带很大负偏置的 ReLU）。激活函数的选择直接决定了你的网络到底能不能学。

## 核心概念

### 为什么非线性是必需的

矩阵乘法是可组合的。一个向量先乘矩阵 A 再乘矩阵 B，等同于乘 AB。这意味着叠十个线性层在数学上等价于一个用大矩阵的线性层。所有那些参数、所有那些深度——全浪费了。你需要点东西来打破这条链。这正是激活函数干的事。

这是证明。一个线性层算 f(x) = Wx + b。叠两个：

```
Layer 1: h = W1 * x + b1
Layer 2: y = W2 * h + b2
```

代入：

```
y = W2 * (W1 * x + b1) + b2
y = (W2 * W1) * x + (W2 * b1 + b2)
y = A * x + c
```

就一层。在层之间插入一个非线性激活 g()：

```
h = g(W1 * x + b1)
y = W2 * h + b2
```

现在代入就行不通了。W2 * g(W1 * x + b1) + b2 没法约化成单个线性变换。网络能表示非线性函数了。每多加一个带激活的层，就增加一份表示能力。

### Sigmoid

神经网络最初用的激活函数。

```
sigmoid(x) = 1 / (1 + e^(-x))
```

输出范围：(0, 1)。平滑、可导，把任意实数映射成一个类概率的值。

它的导数：

```
sigmoid'(x) = sigmoid(x) * (1 - sigmoid(x))
```

这个导数的最大值是 0.25，在 x = 0 处取到。反向传播里，梯度沿着层相乘。十层 sigmoid 意味着梯度最多被 0.25 乘了十次：

```
0.25^10 = 0.000000953674
```

不到原始信号的百万分之一。这就是梯度消失问题。靠前的层的梯度变得太小，权重几乎不更新。网络看起来像在学——靠后的层损失在下降——但前面几层冻住了。深层 sigmoid 网络根本训练不动。

还有个附加问题：sigmoid 的输出永远是正的（0 到 1），这意味着权重上的梯度永远是同一个符号。这导致梯度下降时来回锯齿状摆动。

### Tanh

sigmoid 的中心化版本。

```
tanh(x) = (e^x - e^(-x)) / (e^x + e^(-x))
```

输出范围：(-1, 1)。零中心，消除了锯齿问题。

它的导数：

```
tanh'(x) = 1 - tanh(x)^2
```

最大导数在 x = 0 处为 1.0——比 sigmoid 好四倍。但梯度消失问题依然存在。对很大的正输入或负输入，导数趋近于零。十层照样把梯度碾碎，只是没那么凶。

### ReLU：突破

修正线性单元（Rectified Linear Unit）。Nair 和 Hinton 在 2010 年让它在深度学习里流行起来（函数本身可追溯到 Fukushima 1969 年的工作），它改变了一切。

```
relu(x) = max(0, x)
```

输出范围：[0, infinity)。导数简单得可笑：

```
relu'(x) = 1  if x > 0
            0  if x <= 0
```

对正输入没有梯度消失。梯度恰好是 1，直接穿过去。这就是深层网络变得可训练的原因——ReLU 在层与层之间保住了梯度的幅度。

但它有个失败模式：死亡神经元问题。如果一个神经元的加权输入永远是负的（因为很大的负偏置或者倒霉的权重初始化），它的输出永远是零，梯度永远是零，再也不更新。它永久死亡。实践中，ReLU 网络里 10-40% 的神经元会在训练中死掉。

### Leaky ReLU

针对死亡神经元最简单的修法。

```
leaky_relu(x) = x        if x > 0
                alpha * x if x <= 0
```

其中 alpha 是一个小常数，通常取 0.01。负的那一侧有一个小斜率而不是零，所以死掉的神经元还能拿到梯度信号、得以复活。

### GELU：现代默认选项

高斯误差线性单元（Gaussian Error Linear Unit）。由 Hendrycks 和 Gimpel 在 2016 年提出。是 BERT、GPT 和大多数现代 transformer 的默认激活。

```
gelu(x) = x * Phi(x)
```

其中 Phi(x) 是标准正态分布的累积分布函数。实践中用的近似：

```
gelu(x) ~= 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
```

GELU 处处平滑，允许小的负值（不像 ReLU 把负值硬截到零），还有一个概率解释：它按每个输入在高斯分布下为正的可能性给它加权。这种平滑的门控在 transformer 架构里胜过 ReLU，因为它提供更好的梯度流，并彻底避开死亡神经元问题。

### Swish / SiLU

自门控激活，Ramachandran 等人在 2017 年通过自动搜索发现。

```
swish(x) = x * sigmoid(x)
```

Swish 形式上就是 x * sigmoid(x)。Google 通过在激活函数空间上做自动搜索发现了它——一个神经网络在设计神经网络的零件。

和 GELU 一样，它平滑、非单调、允许小的负值。区别很微妙：Swish 用 sigmoid 做门控，GELU 用高斯 CDF。实践中两者性能几乎一致。Swish 用在 EfficientNet 和一些视觉模型里，GELU 则在语言模型里占主导。

### Softmax：输出层的激活

不用在隐藏层。Softmax 把一个原始分数向量（logits）转换成一个概率分布。

```
softmax(x_i) = e^(x_i) / sum(e^(x_j) for all j)
```

每个输出都在 0 和 1 之间。所有输出加起来等于 1。这让它成为多分类的标准最终激活。最大的 logit 拿到最高的概率，但不像 argmax，softmax 是可导的，还保留了相对置信度的信息。

### 形状对比

```mermaid
graph LR
    subgraph "激活函数"
        S["Sigmoid<br/>范围：(0,1)<br/>两端饱和"]
        T["Tanh<br/>范围：(-1,1)<br/>零中心"]
        R["ReLU<br/>范围：[0,inf)<br/>死亡神经元"]
        G["GELU<br/>范围：~(-0.17,inf)<br/>平滑门控"]
    end
    S -->|"梯度消失"| Problem["深层网络<br/>训练不动"]
    T -->|"程度较轻但<br/>仍然消失"| Problem
    R -->|"x > 0 时<br/>梯度 = 1"| Solution["深层网络<br/>训练快"]
    G -->|"处处平滑梯度"| Solution
```

### 梯度流对比

```mermaid
graph TD
    Input["输入信号"] --> L1["第 1 层"]
    L1 --> L5["第 5 层"]
    L5 --> L10["第 10 层"]
    L10 --> Output["输出"]

    subgraph "第 1 层的梯度"
        SigGrad["Sigmoid: ~0.000001"]
        TanhGrad["Tanh: ~0.001"]
        ReluGrad["ReLU: ~1.0"]
        GeluGrad["GELU: ~0.8"]
    end
```

### 什么时候用哪个激活

```mermaid
flowchart TD
    Start["你在搭什么？"] --> Hidden{"隐藏层<br/>还是输出层？"}

    Hidden -->|"隐藏层"| Arch{"架构？"}
    Hidden -->|"输出层"| Task{"任务类型？"}

    Arch -->|"Transformer / NLP"| GELU["用 GELU"]
    Arch -->|"CNN / 视觉"| ReLU["用 ReLU 或 Swish"]
    Arch -->|"RNN / LSTM"| Tanh["用 Tanh"]
    Arch -->|"简单 MLP"| ReLU2["用 ReLU"]

    Task -->|"二分类"| Sigmoid["用 Sigmoid"]
    Task -->|"多分类"| Softmax["用 Softmax"]
    Task -->|"回归"| Linear["用线性（无激活）"]
```

```figure
softmax-temperature
```

## 动手构建

### 第 1 步：实现所有激活函数及其导数

每个函数接收一个浮点数、返回一个浮点数。每个导数函数接收同样的输入、返回梯度。

```python
import math

def sigmoid(x):
    x = max(-500, min(500, x))
    return 1.0 / (1.0 + math.exp(-x))

def sigmoid_derivative(x):
    s = sigmoid(x)
    return s * (1 - s)

def tanh_act(x):
    return math.tanh(x)

def tanh_derivative(x):
    t = math.tanh(x)
    return 1 - t * t

def relu(x):
    return max(0.0, x)

def relu_derivative(x):
    return 1.0 if x > 0 else 0.0

def leaky_relu(x, alpha=0.01):
    return x if x > 0 else alpha * x

def leaky_relu_derivative(x, alpha=0.01):
    return 1.0 if x > 0 else alpha

def gelu(x):
    return 0.5 * x * (1 + math.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))

def gelu_derivative(x):
    phi = 0.5 * (1 + math.erf(x / math.sqrt(2)))
    pdf = math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)
    return phi + x * pdf

def swish(x):
    return x * sigmoid(x)

def swish_derivative(x):
    s = sigmoid(x)
    return s + x * s * (1 - s)

def softmax(xs):
    max_x = max(xs)
    exps = [math.exp(x - max_x) for x in xs]
    total = sum(exps)
    return [e / total for e in exps]
```

### 第 2 步：可视化梯度在哪里死掉

在 -5 到 5 之间均匀取 100 个点，计算各点的梯度。打印一个文本直方图，显示每个激活函数的梯度在哪里接近零。

```python
def gradient_scan(name, derivative_fn, start=-5, end=5, n=100):
    step = (end - start) / n
    near_zero = 0
    healthy = 0
    for i in range(n):
        x = start + i * step
        g = derivative_fn(x)
        if abs(g) < 0.01:
            near_zero += 1
        else:
            healthy += 1
    pct_dead = near_zero / n * 100
    print(f"{name:15s}: {healthy:3d} healthy, {near_zero:3d} near-zero ({pct_dead:.0f}% dead zone)")

gradient_scan("Sigmoid", sigmoid_derivative)
gradient_scan("Tanh", tanh_derivative)
gradient_scan("ReLU", relu_derivative)
gradient_scan("Leaky ReLU", leaky_relu_derivative)
gradient_scan("GELU", gelu_derivative)
gradient_scan("Swish", swish_derivative)
```

### 第 3 步：梯度消失实验

让一个信号分别用 sigmoid 和 ReLU 前向穿过 N 层。测量激活幅度如何变化。

```python
import random

def vanishing_gradient_experiment(activation_fn, name, n_layers=10, n_inputs=5):
    random.seed(42)
    values = [random.gauss(0, 1) for _ in range(n_inputs)]

    print(f"\n{name} through {n_layers} layers:")
    for layer in range(n_layers):
        weights = [random.gauss(0, 1) for _ in range(n_inputs)]
        z = sum(w * v for w, v in zip(weights, values))
        activated = activation_fn(z)
        magnitude = abs(activated)
        bar = "#" * int(magnitude * 20)
        print(f"  Layer {layer+1:2d}: magnitude = {magnitude:.6f} {bar}")
        values = [activated] * n_inputs

vanishing_gradient_experiment(sigmoid, "Sigmoid")
vanishing_gradient_experiment(relu, "ReLU")
vanishing_gradient_experiment(gelu, "GELU")
```

### 第 4 步：死亡神经元探测器

建一个 ReLU 网络，喂随机输入进去，数有多少神经元从不激活。

```python
def dead_neuron_detector(n_inputs=5, hidden_size=20, n_samples=1000):
    random.seed(0)
    weights = [[random.gauss(0, 1) for _ in range(n_inputs)] for _ in range(hidden_size)]
    biases = [random.gauss(0, 1) for _ in range(hidden_size)]

    fire_counts = [0] * hidden_size

    for _ in range(n_samples):
        inputs = [random.gauss(0, 1) for _ in range(n_inputs)]
        for neuron_idx in range(hidden_size):
            z = sum(w * x for w, x in zip(weights[neuron_idx], inputs)) + biases[neuron_idx]
            if relu(z) > 0:
                fire_counts[neuron_idx] += 1

    dead = sum(1 for c in fire_counts if c == 0)
    rarely_fire = sum(1 for c in fire_counts if 0 < c < n_samples * 0.05)
    healthy = hidden_size - dead - rarely_fire

    print(f"\nDead Neuron Report ({hidden_size} neurons, {n_samples} samples):")
    print(f"  Dead (never fired):     {dead}")
    print(f"  Barely alive (<5%):     {rarely_fire}")
    print(f"  Healthy:                {healthy}")
    print(f"  Dead neuron rate:       {dead/hidden_size*100:.1f}%")

    for i, c in enumerate(fire_counts):
        status = "DEAD" if c == 0 else "WEAK" if c < n_samples * 0.05 else "OK"
        bar = "#" * (c * 40 // n_samples)
        print(f"  Neuron {i:2d}: {c:4d}/{n_samples} fires [{status:4s}] {bar}")

dead_neuron_detector()
```

### 第 5 步：训练对比 —— Sigmoid vs ReLU vs GELU

用三种不同激活，在圆形数据集（圆内的点 = 类别 1，圆外 = 类别 0）上训练同一个两层网络。对比收敛速度。

```python
def make_circle_data(n=200, seed=42):
    random.seed(seed)
    data = []
    for _ in range(n):
        x = random.uniform(-2, 2)
        y = random.uniform(-2, 2)
        label = 1.0 if x * x + y * y < 1.5 else 0.0
        data.append(([x, y], label))
    return data


class ActivationNetwork:
    def __init__(self, activation_fn, activation_deriv, hidden_size=8, lr=0.1):
        random.seed(0)
        self.act = activation_fn
        self.act_d = activation_deriv
        self.lr = lr
        self.hidden_size = hidden_size

        self.w1 = [[random.gauss(0, 0.5) for _ in range(2)] for _ in range(hidden_size)]
        self.b1 = [0.0] * hidden_size
        self.w2 = [random.gauss(0, 0.5) for _ in range(hidden_size)]
        self.b2 = 0.0

    def forward(self, x):
        self.x = x
        self.z1 = []
        self.h = []
        for i in range(self.hidden_size):
            z = self.w1[i][0] * x[0] + self.w1[i][1] * x[1] + self.b1[i]
            self.z1.append(z)
            self.h.append(self.act(z))

        self.z2 = sum(self.w2[i] * self.h[i] for i in range(self.hidden_size)) + self.b2
        self.out = sigmoid(self.z2)
        return self.out

    def backward(self, target):
        error = self.out - target
        d_out = error * self.out * (1 - self.out)

        for i in range(self.hidden_size):
            d_h = d_out * self.w2[i] * self.act_d(self.z1[i])
            self.w2[i] -= self.lr * d_out * self.h[i]
            for j in range(2):
                self.w1[i][j] -= self.lr * d_h * self.x[j]
            self.b1[i] -= self.lr * d_h
        self.b2 -= self.lr * d_out

    def train(self, data, epochs=200):
        losses = []
        for epoch in range(epochs):
            total_loss = 0
            correct = 0
            for x, y in data:
                pred = self.forward(x)
                self.backward(y)
                total_loss += (pred - y) ** 2
                if (pred >= 0.5) == (y >= 0.5):
                    correct += 1
            avg_loss = total_loss / len(data)
            accuracy = correct / len(data) * 100
            losses.append(avg_loss)
            if epoch % 50 == 0 or epoch == epochs - 1:
                print(f"    Epoch {epoch:3d}: loss={avg_loss:.4f}, accuracy={accuracy:.1f}%")
        return losses


data = make_circle_data()

configs = [
    ("Sigmoid", sigmoid, sigmoid_derivative),
    ("ReLU", relu, relu_derivative),
    ("GELU", gelu, gelu_derivative),
]

results = {}
for name, act_fn, act_d_fn in configs:
    print(f"\n=== Training with {name} ===")
    net = ActivationNetwork(act_fn, act_d_fn, hidden_size=8, lr=0.1)
    losses = net.train(data, epochs=200)
    results[name] = losses

print("\n=== Final Loss Comparison ===")
for name, losses in results.items():
    print(f"  {name:10s}: start={losses[0]:.4f} -> end={losses[-1]:.4f} (improvement: {(1 - losses[-1]/losses[0])*100:.1f}%)")
```

## 实际使用

PyTorch 把这些都提供成了函数形式和模块形式两种：

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

x = torch.randn(4, 10)

relu_out = F.relu(x)
gelu_out = F.gelu(x)
sigmoid_out = torch.sigmoid(x)
swish_out = F.silu(x)

logits = torch.randn(4, 5)
probs = F.softmax(logits, dim=1)

model = nn.Sequential(
    nn.Linear(10, 64),
    nn.GELU(),
    nn.Linear(64, 32),
    nn.GELU(),
    nn.Linear(32, 5),
)
```

transformer 的隐藏层：GELU。CNN 的隐藏层：ReLU。分类的输出层：softmax。回归的输出层：无（线性）。输出概率的输出层：sigmoid。就这些。先从这几个默认值开始。只在你有证据时才去改。

RNN 和 LSTM 用 tanh 处理隐藏状态、用 sigmoid 处理门控，但如果你今天是从零开始搭，多半用不着 RNN。如果你的 ReLU 网络里神经元在死，换成 GELU。别没特定理由就去抓 Leaky ReLU——GELU 既解决了死亡神经元问题，又给出更好的梯度流。

## 拿去用

本课产出：
- `outputs/prompt-activation-selector.md` —— 一个可复用的提示词，帮你为任何架构挑对激活函数

## 练习

1. 实现带参数的 ReLU（PReLU），其中负斜率 alpha 是一个可学习的参数。在圆形数据集上训练它，和固定的 Leaky ReLU 对比。

2. 把梯度消失实验改成 50 层而不是 10 层。把 sigmoid、tanh、ReLU、GELU 在每一层的幅度画出来。每个激活的信号大约在第几层有效地降到零？

3. 实现 ELU（指数线性单元）：elu(x) = x（x > 0 时），alpha * (e^x - 1)（x <= 0 时）。在同一个网络上，对比它和 ReLU 的死亡神经元率。

4. 做一个训练时运行的"梯度健康监视器"：每个 epoch 计算每一层的平均梯度幅度。当任何一层的梯度低于 0.001 或超过 100 时打印一条警告。

5. 把训练对比改成用第 01 课的 XOR 数据集而不是圆形。哪个激活在 XOR 上收敛最快？为什么这和圆形的结果不一样？

## 关键术语

| 术语 | 大家怎么说 | 实际是什么 |
|------|----------------|----------------------|
| 激活函数（Activation function） | "那个非线性的部分" | 施加到每个神经元输出上的函数，打破线性，让网络能学非线性映射 |
| 梯度消失（Vanishing gradient） | "深层网络里梯度没了" | 当激活的导数小于 1 时，梯度穿过层时指数级缩小，让靠前的层没法训练 |
| 梯度爆炸（Exploding gradient） | "梯度炸了" | 当有效乘数超过 1 时，梯度穿过层时指数级增长，导致训练不稳定 |
| 死亡神经元（Dead neuron） | "一个停止学习的神经元" | 一个输入永久为负的 ReLU 神经元，输出零、梯度也零 |
| Sigmoid | "把值压到 0-1" | 逻辑斯蒂函数 1/(1+e^-x)，历史上重要，但在深层网络里导致梯度消失 |
| ReLU | "把负数截到零" | max(0, x)——靠保住梯度幅度让深度学习变得可行的激活 |
| GELU | "transformer 的激活" | 高斯误差线性单元，一个平滑的激活，按输入为正的概率给它加权 |
| Swish/SiLU | "自门控的 ReLU" | x * sigmoid(x)，通过自动搜索发现，用在 EfficientNet 里 |
| Softmax | "把分数变成概率" | 把一个 logit 向量归一化成概率分布，所有值都在 (0,1) 且加起来为 1 |
| Leaky ReLU | "不会死的 ReLU" | max(alpha*x, x)，alpha 很小（0.01），靠允许小的负梯度防止神经元死亡 |
| 饱和（Saturation） | "sigmoid 平掉的那部分" | 激活的导数趋近于零的区域，会阻断梯度流 |
| Logit | "softmax 之前的原始分数" | 最后一层在施加 softmax 或 sigmoid 之前的未归一化输出 |

## 延伸阅读

- Nair & Hinton，《Rectified Linear Units Improve Restricted Boltzmann Machines》（2010）—— 引入 ReLU、让深层网络可训练的那篇论文
- Hendrycks & Gimpel，《Gaussian Error Linear Units (GELUs)》（2016）—— 引入了后来成为 transformer 默认选项的激活函数
- Ramachandran 等人，《Searching for Activation Functions》（2017）—— 用自动搜索发现了 Swish，表明激活函数的设计可以被自动化
- Glorot & Bengio，《Understanding the difficulty of training deep feedforward neural networks》（2010）—— 诊断梯度消失/爆炸并提出 Xavier 初始化的那篇论文
- Goodfellow、Bengio、Courville，《Deep Learning》第 6.3 章（https://www.deeplearningbook.org/）—— 对隐藏单元和激活函数的严谨论述
