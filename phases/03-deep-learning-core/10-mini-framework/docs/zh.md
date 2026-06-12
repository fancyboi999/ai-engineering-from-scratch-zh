# 搭一个你自己的迷你框架

> 你已经造好了神经元、层、网络、反向传播、激活、损失函数、优化器、正则化、初始化和学习率调度。全是一块块散件。现在把它们接成一个框架。不是 PyTorch。不是 TensorFlow。是你自己的。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 03 全部（第 01-09 课）
**预计时间：** ~120 分钟

## 学习目标

- 构建一个完整的深度学习框架（约 500 行），含 Module、Linear、ReLU、Sigmoid、Dropout、BatchNorm、Sequential、损失函数、优化器和 DataLoader
- 解释 Module 抽象（forward、backward、parameters），以及为什么需要切换训练/评估模式
- 把所有组件接成一个能用的训练循环，在圆形分类上训练一个 4 层网络
- 把你框架里的每个组件对应到它的 PyTorch 等价物（nn.Module、nn.Sequential、optim.Adam、DataLoader）

## 问题背景

你有十节课的积木，散落在一个个独立文件里。这里一个 `Value` 类，那里一个训练循环，权重初始化在另一个文件，学习率调度又在另一个里。要训练一个网络，你得从五个不同的课里复制粘贴，再手工接起来。

这正是框架要解决的。PyTorch 给你 `nn.Module`、`nn.Sequential`、`optim.Adam`、`DataLoader`，还有一个把它们串起来的训练循环套路。TensorFlow 给你 `keras.Layer`、`keras.Sequential`、`keras.optimizers.Adam`。这些不是魔法。它们是组织模式，让你能定义、训练、评估网络，而不用每次都重新发明那套管道。

你要用约 500 行 Python 把同样的东西造出来。不用 numpy。不依赖外部库。一个能定义任意前馈网络、用 SGD 或 Adam 训练它、给数据分批、施加 dropout 和批归一化、用任意激活、调度学习率的框架。

做完之后，你会确切理解在 PyTorch 里写 `model = nn.Sequential(...)` 时发生了什么。你会理解 `model.train()` 和 `model.eval()` 为什么存在。你会理解 `optimizer.zero_grad()` 为什么是单独一个调用。你会全都理解，因为这一切都是你造的。

## 核心概念

### Module 抽象

PyTorch 里每个层都继承自 `nn.Module`。一个 Module 有三项职责：

1. **forward()** —— 给定输入算出输出
2. **parameters()** —— 返回所有可训练的权重
3. **backward()** —— 算梯度（PyTorch 里由 autograd 处理，我们这里是显式的）

一个 Linear 层是 Module。一个 ReLU 激活是 Module。一个 dropout 层是 Module。一个批归一化层是 Module。它们都有相同的接口。

### Sequential 容器

`nn.Sequential` 把 Module 串起来。前向传播：把数据喂过 Module 1，然后 Module 2，再 Module 3。反向传播：把这条链反过来。容器本身也是一个 Module——它有 forward()、parameters() 和 backward()。这就是组合模式：一串 Module 本身也是一个 Module。

### 训练模式 vs 评估模式

Dropout 训练时随机把神经元置零，评估时则让所有东西原样通过。批归一化训练时用批统计量，评估时用滑动平均。`train()` 和 `eval()` 方法切换这个行为。每个 Module 都有一个 `training` 标志。

### 优化器

优化器用参数的梯度更新它们。SGD：`param -= lr * grad`。Adam：维护动量和方差估计，再更新。优化器不知道网络架构——它只看到一个扁平的参数列表和它们的梯度。

### DataLoader

分批之所以重要，有两个原因。第一，对大问题你没法把整个数据集塞进内存。第二，小批量梯度下降提供的噪声有助于逃离局部极小值。DataLoader 把数据切成批，并可选地在 epoch 之间打乱。

### 框架架构

```mermaid
graph TD
    subgraph "模块"
        Linear["Linear<br/>W*x + b"]
        ReLU["ReLU<br/>max(0, x)"]
        Sigmoid["Sigmoid<br/>1/(1+e^-x)"]
        Dropout["Dropout<br/>随机置零掩码"]
        BatchNorm["BatchNorm<br/>归一化激活"]
    end

    subgraph "容器"
        Sequential["Sequential<br/>串联模块"]
    end

    subgraph "损失函数"
        MSE["MSELoss<br/>(pred - target)^2"]
        BCE["BCELoss<br/>二元交叉熵"]
    end

    subgraph "优化器"
        SGD["SGD<br/>param -= lr * grad"]
        Adam["Adam<br/>自适应矩"]
    end

    subgraph "数据"
        DataLoader["DataLoader<br/>分批 + 打乱"]
    end

    Sequential --> |"包含"| Linear
    Sequential --> |"包含"| ReLU
    Sequential --> |"前向/反向"| MSE
    SGD --> |"更新"| Sequential
    DataLoader --> |"喂给"| Sequential
```

### 训练循环

```mermaid
sequenceDiagram
    participant DL as DataLoader
    participant M as 模型
    participant L as 损失
    participant O as 优化器

    loop 每个 Epoch
        DL->>M: 一批输入
        M->>M: 前向传播（逐层）
        M->>L: 预测
        L->>L: 计算损失
        L->>M: 反向传播（梯度）
        M->>O: 参数 + 梯度
        O->>M: 更新后的参数
        O->>O: 清零梯度
    end
```

### Module 层次结构

```mermaid
classDiagram
    class Module {
        +forward(x)
        +backward(grad)
        +parameters()
        +train()
        +eval()
    }

    class Linear {
        -weights
        -biases
        +forward(x)
        +backward(grad)
    }

    class ReLU {
        +forward(x)
        +backward(grad)
    }

    class Sequential {
        -modules[]
        +forward(x)
        +backward(grad)
        +parameters()
    }

    Module <|-- Linear
    Module <|-- ReLU
    Module <|-- Sequential
    Sequential *-- Module
```

```figure
gradient-clipping
```

## 动手构建

### 第 1 步：Module 基类

每个层都要实现的抽象接口。

```python
class Module:
    def __init__(self):
        self.training = True

    def forward(self, x):
        raise NotImplementedError

    def backward(self, grad):
        raise NotImplementedError

    def parameters(self):
        return []

    def train(self):
        self.training = True

    def eval(self):
        self.training = False
```

### 第 2 步：Linear 层

最基础的积木。存权重和偏置，前向算 Wx + b，反向算权重/输入的梯度。

```python
import math
import random


class Linear(Module):
    def __init__(self, fan_in, fan_out):
        super().__init__()
        std = math.sqrt(2.0 / fan_in)
        self.weights = [[random.gauss(0, std) for _ in range(fan_in)] for _ in range(fan_out)]
        self.biases = [0.0] * fan_out
        self.weight_grads = [[0.0] * fan_in for _ in range(fan_out)]
        self.bias_grads = [0.0] * fan_out
        self.fan_in = fan_in
        self.fan_out = fan_out
        self.input = None

    def forward(self, x):
        self.input = x
        output = []
        for i in range(self.fan_out):
            val = self.biases[i]
            for j in range(self.fan_in):
                val += self.weights[i][j] * x[j]
            output.append(val)
        return output

    def backward(self, grad):
        input_grad = [0.0] * self.fan_in
        for i in range(self.fan_out):
            self.bias_grads[i] += grad[i]
            for j in range(self.fan_in):
                self.weight_grads[i][j] += grad[i] * self.input[j]
                input_grad[j] += grad[i] * self.weights[i][j]
        return input_grad

    def parameters(self):
        params = []
        for i in range(self.fan_out):
            for j in range(self.fan_in):
                params.append((self.weights, i, j, self.weight_grads))
            params.append((self.biases, i, None, self.bias_grads))
        return params
```

### 第 3 步：激活模块

把 ReLU、Sigmoid 和 Tanh 做成 Module。每个都缓存反向传播所需的东西。

```python
class ReLU(Module):
    def __init__(self):
        super().__init__()
        self.mask = None

    def forward(self, x):
        self.mask = [1.0 if v > 0 else 0.0 for v in x]
        return [max(0.0, v) for v in x]

    def backward(self, grad):
        return [g * m for g, m in zip(grad, self.mask)]


class Sigmoid(Module):
    def __init__(self):
        super().__init__()
        self.output = None

    def forward(self, x):
        self.output = []
        for v in x:
            v = max(-500, min(500, v))
            self.output.append(1.0 / (1.0 + math.exp(-v)))
        return self.output

    def backward(self, grad):
        return [g * o * (1 - o) for g, o in zip(grad, self.output)]


class Tanh(Module):
    def __init__(self):
        super().__init__()
        self.output = None

    def forward(self, x):
        self.output = [math.tanh(v) for v in x]
        return self.output

    def backward(self, grad):
        return [g * (1 - o * o) for g, o in zip(grad, self.output)]
```

### 第 4 步：Dropout 模块

训练时随机把元素置零。把剩下的元素按 1/(1-p) 缩放，让期望值保持不变。评估时什么都不做。

```python
class Dropout(Module):
    def __init__(self, p=0.5):
        super().__init__()
        self.p = p
        self.mask = None

    def forward(self, x):
        if not self.training:
            return x
        self.mask = [0.0 if random.random() < self.p else 1.0 / (1 - self.p) for _ in x]
        return [v * m for v, m in zip(x, self.mask)]

    def backward(self, grad):
        if self.mask is None:
            return grad
        return [g * m for g, m in zip(grad, self.mask)]
```

### 第 5 步：BatchNorm 模块

跨批把激活按每个特征归一化到零均值、单位方差。为评估模式维护滑动统计量。

```python
class BatchNorm(Module):
    def __init__(self, size, momentum=0.1, eps=1e-5):
        super().__init__()
        self.size = size
        self.gamma = [1.0] * size
        self.beta = [0.0] * size
        self.gamma_grads = [0.0] * size
        self.beta_grads = [0.0] * size
        self.running_mean = [0.0] * size
        self.running_var = [1.0] * size
        self.momentum = momentum
        self.eps = eps
        self.x_norm = None
        self.std_inv = None
        self.batch_input = None

    def forward_batch(self, batch):
        batch_size = len(batch)
        output_batch = []

        if self.training:
            mean = [0.0] * self.size
            for sample in batch:
                for j in range(self.size):
                    mean[j] += sample[j]
            mean = [m / batch_size for m in mean]

            var = [0.0] * self.size
            for sample in batch:
                for j in range(self.size):
                    var[j] += (sample[j] - mean[j]) ** 2
            var = [v / batch_size for v in var]

            self.std_inv = [1.0 / math.sqrt(v + self.eps) for v in var]

            self.x_norm = []
            self.batch_input = batch
            for sample in batch:
                normed = [(sample[j] - mean[j]) * self.std_inv[j] for j in range(self.size)]
                self.x_norm.append(normed)
                output = [self.gamma[j] * normed[j] + self.beta[j] for j in range(self.size)]
                output_batch.append(output)

            for j in range(self.size):
                self.running_mean[j] = (1 - self.momentum) * self.running_mean[j] + self.momentum * mean[j]
                self.running_var[j] = (1 - self.momentum) * self.running_var[j] + self.momentum * var[j]
        else:
            std_inv = [1.0 / math.sqrt(v + self.eps) for v in self.running_var]
            for sample in batch:
                normed = [(sample[j] - self.running_mean[j]) * std_inv[j] for j in range(self.size)]
                output = [self.gamma[j] * normed[j] + self.beta[j] for j in range(self.size)]
                output_batch.append(output)

        return output_batch

    def forward(self, x):
        result = self.forward_batch([x])
        return result[0]

    def backward(self, grad):
        if self.x_norm is None:
            return grad
        for j in range(self.size):
            self.gamma_grads[j] += self.x_norm[0][j] * grad[j]
            self.beta_grads[j] += grad[j]
        return [grad[j] * self.gamma[j] * self.std_inv[j] for j in range(self.size)]

    def parameters(self):
        params = []
        for j in range(self.size):
            params.append((self.gamma, j, None, self.gamma_grads))
            params.append((self.beta, j, None, self.beta_grads))
        return params
```

### 第 6 步：Sequential 容器

把模块串起来。前向从左到右，反向从右到左。

```python
class Sequential(Module):
    def __init__(self, *modules):
        super().__init__()
        self.modules = list(modules)

    def forward(self, x):
        for module in self.modules:
            x = module.forward(x)
        return x

    def backward(self, grad):
        for module in reversed(self.modules):
            grad = module.backward(grad)
        return grad

    def parameters(self):
        params = []
        for module in self.modules:
            params.extend(module.parameters())
        return params

    def train(self):
        self.training = True
        for module in self.modules:
            module.train()

    def eval(self):
        self.training = False
        for module in self.modules:
            module.eval()
```

### 第 7 步：损失函数

MSE 和二元交叉熵。每个返回损失值，并提供一个返回梯度的 backward()。

```python
class MSELoss:
    def __call__(self, predicted, target):
        self.predicted = predicted
        self.target = target
        n = len(predicted)
        self.loss = sum((p - t) ** 2 for p, t in zip(predicted, target)) / n
        return self.loss

    def backward(self):
        n = len(self.predicted)
        return [2 * (p - t) / n for p, t in zip(self.predicted, self.target)]


class BCELoss:
    def __call__(self, predicted, target):
        self.predicted = predicted
        self.target = target
        eps = 1e-7
        n = len(predicted)
        self.loss = 0
        for p, t in zip(predicted, target):
            p = max(eps, min(1 - eps, p))
            self.loss += -(t * math.log(p) + (1 - t) * math.log(1 - p))
        self.loss /= n
        return self.loss

    def backward(self):
        eps = 1e-7
        n = len(self.predicted)
        grads = []
        for p, t in zip(self.predicted, self.target):
            p = max(eps, min(1 - eps, p))
            grads.append((-t / p + (1 - t) / (1 - p)) / n)
        return grads
```

### 第 8 步：SGD 和 Adam 优化器

两者都接收一个参数列表，用梯度更新权重。

```python
class SGD:
    def __init__(self, parameters, lr=0.01):
        self.params = parameters
        self.lr = lr

    def step(self):
        for container, i, j, grad_container in self.params:
            if j is not None:
                container[i][j] -= self.lr * grad_container[i][j]
            else:
                container[i] -= self.lr * grad_container[i]

    def zero_grad(self):
        for container, i, j, grad_container in self.params:
            if j is not None:
                grad_container[i][j] = 0.0
            else:
                grad_container[i] = 0.0


class Adam:
    def __init__(self, parameters, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.params = parameters
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = [0.0] * len(parameters)
        self.v = [0.0] * len(parameters)

    def step(self):
        self.t += 1
        for idx, (container, i, j, grad_container) in enumerate(self.params):
            if j is not None:
                g = grad_container[i][j]
            else:
                g = grad_container[i]

            self.m[idx] = self.beta1 * self.m[idx] + (1 - self.beta1) * g
            self.v[idx] = self.beta2 * self.v[idx] + (1 - self.beta2) * g * g

            m_hat = self.m[idx] / (1 - self.beta1 ** self.t)
            v_hat = self.v[idx] / (1 - self.beta2 ** self.t)

            update = self.lr * m_hat / (math.sqrt(v_hat) + self.eps)

            if j is not None:
                container[i][j] -= update
            else:
                container[i] -= update

    def zero_grad(self):
        for container, i, j, grad_container in self.params:
            if j is not None:
                grad_container[i][j] = 0.0
            else:
                grad_container[i] = 0.0
```

### 第 9 步：DataLoader

把数据切成批，可选地在每个 epoch 打乱。

```python
class DataLoader:
    def __init__(self, data, batch_size=32, shuffle=True):
        self.data = data
        self.batch_size = batch_size
        self.shuffle = shuffle

    def __iter__(self):
        indices = list(range(len(self.data)))
        if self.shuffle:
            random.shuffle(indices)
        for start in range(0, len(indices), self.batch_size):
            batch_indices = indices[start:start + self.batch_size]
            batch = [self.data[i] for i in batch_indices]
            inputs = [item[0] for item in batch]
            targets = [item[1] for item in batch]
            yield inputs, targets

    def __len__(self):
        return (len(self.data) + self.batch_size - 1) // self.batch_size
```

### 第 10 步：在圆形分类上训练一个 4 层网络

把一切接起来。定义一个模型，挑一个损失，挑一个优化器，跑训练循环。

```python
def make_circle_data(n=500, seed=42):
    random.seed(seed)
    data = []
    for _ in range(n):
        x = random.uniform(-2, 2)
        y = random.uniform(-2, 2)
        label = 1.0 if x * x + y * y < 1.5 else 0.0
        data.append(([x, y], [label]))
    return data


def train():
    random.seed(42)

    model = Sequential(
        Linear(2, 16),
        ReLU(),
        Linear(16, 16),
        ReLU(),
        Linear(16, 8),
        ReLU(),
        Linear(8, 1),
        Sigmoid(),
    )

    criterion = BCELoss()
    optimizer = Adam(model.parameters(), lr=0.01)

    data = make_circle_data(500)
    split = int(len(data) * 0.8)
    train_data = data[:split]
    test_data = data[split:]

    loader = DataLoader(train_data, batch_size=16, shuffle=True)

    model.train()

    for epoch in range(100):
        total_loss = 0
        total_correct = 0
        total_samples = 0

        for batch_inputs, batch_targets in loader:
            batch_loss = 0
            for x, t in zip(batch_inputs, batch_targets):
                pred = model.forward(x)
                loss = criterion(pred, t)
                batch_loss += loss

                optimizer.zero_grad()
                grad = criterion.backward()
                model.backward(grad)
                optimizer.step()

                predicted_class = 1.0 if pred[0] >= 0.5 else 0.0
                if predicted_class == t[0]:
                    total_correct += 1
                total_samples += 1

            total_loss += batch_loss

        avg_loss = total_loss / total_samples
        accuracy = total_correct / total_samples * 100

        if epoch % 10 == 0 or epoch == 99:
            print(f"Epoch {epoch:3d} | Loss: {avg_loss:.6f} | Train Accuracy: {accuracy:.1f}%")

    model.eval()
    correct = 0
    for x, t in test_data:
        pred = model.forward(x)
        predicted_class = 1.0 if pred[0] >= 0.5 else 0.0
        if predicted_class == t[0]:
            correct += 1
    test_accuracy = correct / len(test_data) * 100
    print(f"\nTest Accuracy: {test_accuracy:.1f}% ({correct}/{len(test_data)})")

    return model, test_accuracy
```

## 实际使用

这是你刚造出来的东西的 PyTorch 等价物：

```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

model = nn.Sequential(
    nn.Linear(2, 16),
    nn.ReLU(),
    nn.Linear(16, 16),
    nn.ReLU(),
    nn.Linear(16, 8),
    nn.ReLU(),
    nn.Linear(8, 1),
    nn.Sigmoid(),
)

criterion = nn.BCELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

for epoch in range(100):
    model.train()
    for inputs, targets in dataloader:
        optimizer.zero_grad()
        predictions = model(inputs)
        loss = criterion(predictions, targets)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        test_predictions = model(test_inputs)
```

结构一模一样。`Sequential`、`Linear`、`ReLU`、`Sigmoid`、`BCELoss`、`Adam`、`zero_grad`、`backward`、`step`、`train`、`eval`。每个概念都一一对应。区别在于 PyTorch 自动处理 autograd（不用在每个模块里实现 backward()）、跑在 GPU 上、被优化了好多年。但骨架是一样的。

现在当你看到 PyTorch 代码时，你确切知道每一行在干什么。那份理解就是这一切的全部意义。

## 拿去用

本课产出：
- `outputs/prompt-framework-architect.md` —— 一个提示词，用框架抽象来设计神经网络架构

## 练习

1. 为多分类加一个 `SoftmaxCrossEntropyLoss` 类。对预测做 softmax，算交叉熵损失，处理合并后的反向传播。在一个 3 类螺旋数据集上测试它。

2. 在优化器里实现学习率调度：加一个 `set_lr()` 方法，把第 09 课的余弦调度接进来。用 warmup + 余弦训练圆形分类器，和常量 LR 对比。

3. 给 Sequential 加一个 `save()` 和 `load()` 方法，把所有权重序列化到一个 JSON 文件再加载回来。验证加载后的模型产出和原模型一样的预测。

4. 在 Adam 优化器里实现权重衰减（L2 正则化）。加一个 `weight_decay` 参数，每步把权重朝零收缩。对比 decay=0 和 decay=0.01 的训练。

5. 把逐样本的训练循环换成正经的小批量梯度累积：累积一个批次里所有样本的梯度，再除以批大小、走一步优化器。测量这是否改变了收敛速度。

## 关键术语

| 术语 | 大家怎么说 | 实际是什么 |
|------|----------------|----------------------|
| Module | "一个层" | 框架里的基础抽象——任何有 forward()、backward()、parameters() 的东西 |
| Sequential | "按顺序叠层" | 一个把模块串起来的容器，前向按序施加、反向逆序施加 |
| 前向传播（Forward pass） | "跑网络" | 把输入按序穿过每个模块来算出输出 |
| 反向传播（Backward pass） | "算梯度" | 把损失梯度逆序传过每个模块来算参数梯度 |
| 参数（Parameters） | "可训练的权重" | 网络里优化器能更新的所有值——权重和偏置 |
| 优化器（Optimizer） | "更新权重的那个东西" | 一个用梯度更新参数的算法，实现 SGD、Adam 或其他规则 |
| DataLoader | "喂数据的那个东西" | 一个迭代器，把数据集切成批，可选地在 epoch 之间打乱 |
| 训练模式（Training mode） | "model.train()" | 一个标志，启用 dropout 和用批统计量的批归一化这类随机行为 |
| 评估模式（Evaluation mode） | "model.eval()" | 一个标志，关掉 dropout 并让批归一化用滑动统计量 |
| Zero grad | "清空梯度" | 在算下一批梯度之前把所有参数梯度重置为零 |

## 延伸阅读

- Paszke 等人，《PyTorch: An Imperative Style, High-Performance Deep Learning Library》（2019）—— 描述 PyTorch 设计决策的论文
- Chollet，《Deep Learning with Python, Second Edition》（2021）—— 第 3 章讲 Keras 内部，用的是同样的 module/layer 抽象
- Johnson，《Tiny-DNN》（https://github.com/tiny-dnn/tiny-dnn）—— 一个纯头文件的 C++ 深度学习框架，用来理解框架内部
