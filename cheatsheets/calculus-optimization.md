---
id: calculus-optimization
title: 微积分、梯度与凸优化
code: CG
subtitle: 导数、自动微分、梯度下降、动量、Adam、牛顿法与凸性检验。包含从零实现的 Python 和 PyTorch 示例。
hue: 30
sources: phases/01-math-foundations/04-calculus-for-ml, phases/01-math-foundations/05-chain-rule-and-autodiff, phases/01-math-foundations/08-optimization, phases/01-math-foundations/18-convex-optimization
source_hash: dfb1282c4741dc72
---

## 单个神经元的前向与反向传播
type: architecture
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md

```arch
node | x | 1,1 | x | 输入
node | z1 | 2,1 | z1 = w*x | 乘法
node | z2 | 3,1 | z2 = w*x + b | 加偏置
node | a | 4,1 | a = sigmoid(z2) | 激活
node | dw | 1,2 | dL/dw | dL/dz2 * x
node | db | 2,2 | dL/db | dL/dz2 * 1
node | dz2 | 3,2 | dL/dz2 | dL/da * a(1-a)
node | loss | 4,2 | L | 交叉熵损失
edge | x | z1 | *w
edge | z1 | z2 | +b
edge | z2 | a |
edge | a | loss |
edge | loss | dz2 | 反向传播
edge | dz2 | dw | x
edge | dz2 | db | 1
```

## Value.backward 中的反向模式自动微分
type: flow
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/05-chain-rule-and-autodiff/code/autodiff.py

1. **记录**：每次运算创建新的 `Value`，记录子节点和 `_backward` 闭包。
2. **排序**：`build_topo` 将每个节点放在其依赖节点之后。
3. **设种子**：将输出的 `self.grad = 1.0`。这就是 dy/dy = 1。
4. **反向遍历**：按逆拓扑顺序对每个节点调用 `v._backward()`。
5. **累加**：各闭包通过 `+=` 累加 `.grad`。使用两次的值会得到两条路径之和。
6. **重置**：下次 `loss.backward()` 前，将每个参数的 `p.grad = 0.0`。
7. **更新**：对每个参数执行 `p.data -= lr * p.grad`。

## 代码任务
type: task-table
from: phases/01-math-foundations/04-calculus-for-ml/code/derivatives.py, phases/01-math-foundations/05-chain-rule-and-autodiff/code/autodiff.py, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/code/optimizers.py, phases/01-math-foundations/18-convex-optimization/code/convex.py

| 任务 | 代码 |
|---|---|
| 中心差分 | `numerical_derivative(f, x, h=1e-7)` |
| 多输入梯度 | `numerical_gradient(f, point, h=1e-7)` |
| f(x, y) 的 Hessian | `hessian_2d(f, x, y, h=1e-5)` |
| 检查自动微分梯度 | `gradient_check(build_expr, x_val, h=1e-7)` |
| 隐层为 4 的 XOR 网络 | `model = MLP([2, 4, 1])` |
| 运行优化器 | `optimize(optimizer, func, grad_func, start)` |
| 采样检验凸性 | `check_convexity(f, dim)` |
| 二维牛顿迭代 | `newtons_method(grad_f, hessian_f, x0)` |

## 从零实现优化器
type: annotated-code
lang: python
from: phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/08-optimization/code/optimizers.py

```python
GradientDescent(lr=0.001)  # w = w - lr * gradient
SGDMomentum(lr=0.001, momentum=0.9)  # v = beta * v + gradient
Adam(lr=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8)  # 每个权重保留两个矩
m_hat = [m / (1 - self.beta1 ** self.t) for m in self.m]  # 偏差修正
p - self.lr * mh / (vh ** 0.5 + self.epsilon)  # 每个权重独立的步长
adam_history = optimize(Adam(lr=0.01), rosenbrock, rosenbrock_gradient, start)
```

## PyTorch 中的 Autograd 与优化器
type: annotated-code
lang: python
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md

```python
x = torch.tensor(2.0, requires_grad=True)
y = x ** 2 + 3 * x + 1
y.backward()  # 沿已记录的图执行反向模式微分
print(x.grad)  # 7.0 = 2*x + 3
sgd = torch.optim.SGD(model.parameters(), lr=0.01, momentum=0.9)
adam = torch.optim.Adam(model.parameters(), lr=0.001)
adamw = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(adam, T_max=100)
```

## 关键公式
type: concepts
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/18-convex-optimization/docs/zh.md

- **中心差分**：$f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}$。
- **链式法则**：$\frac{dy}{dx} = f'(g(x)) \cdot g'(x)$。图分支时对各路径求和。
- **梯度下降**：$w = w - \text{lr} \cdot \text{gradient}$。
- **动量**：$v = \beta \cdot v + \text{gradient}$，然后 $w = w - \text{lr} \cdot v$。
- **Adam**：$w = w - \text{lr} \cdot \hat{m} / (\sqrt{\hat{v}} + \epsilon)$，使用偏差修正后的矩。
- **牛顿法**：$x_{\text{new}} = x - H^{-1} \cdot \text{gradient}$。
- **凸性**：对 $t \in [0, 1]$，$f(tx + (1-t)y) \le t f(x) + (1-t) f(y)$。
- **拉格朗日函数**：$L(x, \lambda) = f(x) + \lambda g(x)$。令其梯度为零。

## 常用导数
type: command-table
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md

| 命令 | 作用 |
|---|---|
| x^2 | 2x。MSE 损失 |
| wx + b | 对 w 为 x，对 b 为 1，对 x 为 w。线性层 |
| e^x | e^x。Softmax、注意力 |
| ln(x) | 1/x。交叉熵损失 |
| sigmoid | f(x)(1-f(x))。Sigmoid 激活 |
| tanh | 1 - tanh^2。经典激活 |
| x^n | n x^(n-1)。由 `__pow__` 使用 |
| sin(x^2) | cos(x^2) * 2x。链式法则示例 |

## 选择方法
type: command-table
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/18-convex-optimization/docs/zh.md

| 命令 | 作用 |
|---|---|
| 梯度下降 | 一阶导数。O(n) 内存。基线 |
| 带动量的 SGD | 多调参可取得更好的最终准确率 |
| Adam | 根据梯度矩估计对角曲率。深度学习默认选择 |
| AdamW | 解耦权重衰减的 Adam。用于 transformer |
| 牛顿法 | 完整 Hessian。每步 O(n^3)。适合小型凸问题 |
| L-BFGS | 使用最近 m 次梯度差。适合中型凸问题 |
| K-FAC | Kronecker 分解的 Fisher。用于大批量训练 |

## 数值与默认值
type: defaults
from: phases/01-math-foundations/04-calculus-for-ml/code/derivatives.py, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/08-optimization/code/optimizers.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| Adam `lr` | 0.001 | 大多数问题从此值开始 |
| Adam `beta2` | 0.999 | `beta1` 为 0.9。两者为矩衰减率 |
| Adam `epsilon` | 1e-8 | 防止除零 |
| SGD 动量 `lr` | 0.01 | 配合动量 0.9 |
| AdamW `weight_decay` | 0.01 | 与梯度更新解耦 |
| 小批量大小 | 32-256 | 梯度估计良好，噪声适中 |
| 有限差分 `h` | 1e-7 | 用于 `numerical_derivative` |
| 梯度检查差异 | < 1e-5 | 比较自动微分与数值结果 |

## 故障排查
type: troubleshooting
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/18-convex-optimization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失增大或变成 nan | 学习率过大 | 降低学习率 |
| 训练过慢 | 学习率过小 | 提高学习率，添加调度 |
| 狭窄谷底中来回振荡 | Hessian 条件数高 | 添加动量，或使用牛顿法 |
| 梯度接近 0，无法推进 | 鞍点 | 使用动量和小批量噪声 |
| 每步梯度都增大 | `.grad` 使用 `+=` 累加 | `backward` 前设置 `p.grad = 0.0` |
| 自动微分与数值结果不符 | `_backward` 规则有 bug | 运行 `gradient_check` |
| 二阶导数噪声大 | 步长 h 太小 | 两次调用均使用 `h=1e-4` |
| 大模型使用牛顿法成本过高 | O(n^2) 内存，O(n^3) 求逆 | 使用 L-BFGS 或 Adam |

## 问答
type: qa
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/18-convex-optimization/docs/zh.md

- **网络为何使用反向模式？** 输入多、损失只有一个。一次反向传播得到全部梯度。
- **如何检验凸性？** 一维中 f'' >= 0，多维中 Hessian 半正定。
- **SGD 为何能优化非凸损失？** 多数临界点是鞍点，多数极小值都不错。
- **L1 为何产生稀疏权重？** 菱形在坐标轴上有尖角。
- **什么是互补松弛？** $\lambda_i \, g_i(x) = 0$。支持向量具有 $\lambda > 0$。

## 提示
type: tips
from: phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/18-convex-optimization/docs/zh.md

- 训练超过几个 epoch 时使用学习率调度。
- 余弦退火和预热适合 transformer 与大模型。
- 牛顿法一步就能求解二次函数。
- 梯度检查对每个参数需要 2 次前向传播。不要在生产训练中运行。
- 临界点处 Hessian 特征值正负混合，说明它是鞍点。
- 平坦极小值比尖锐极小值泛化更好。
