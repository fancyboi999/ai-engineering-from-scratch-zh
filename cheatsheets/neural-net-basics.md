---
id: neural-net-basics
title: 神经网络基础
code: NN
subtitle: 感知机、前向传播、反向传播、损失选择与迷你框架。涵盖公式、形状、默认值和修正方法。
hue: 265
sources: phases/03-deep-learning-core/01-the-perceptron, phases/03-deep-learning-core/02-multi-layer-networks, phases/03-deep-learning-core/03-backpropagation, phases/03-deep-learning-core/05-loss-functions, phases/03-deep-learning-core/10-mini-framework
source_hash: 1368af60353c1a91
---

## 两层网络的前向与反向传播
type: architecture
from: phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md

```arch
node | x | 1,1 | 输入 x | 无计算 | client
node | l1 | 2,1 | 隐藏层 | a1 = sigmoid(W1 x + b1) | process
node | l2 | 3,1 | 输出层 | a2 = sigmoid(W2 a1 + b2) | process
node | loss | 4,1 | 损失 | L = (a2 - y)^2 | store
node | g2 | 4,2 | dL/dz2 | 2(a2 - y) a2 (1 - a2) |
node | w2 | 3,2 | dL/dW2 = dL/dz2 a1 | dL/da1 = dL/dz2 W2 |
node | g1 | 2,2 | dL/dz1 | dL/da1 a1 (1 - a1) |
node | w1 | 1,2 | dL/dW1 = dL/dz1 x | dL/db1 = dL/dz1 |
edge | x | l1 | 前向
edge | l1 | l2 | a1
edge | l2 | loss | a2
edge | loss | g2 | 反向
edge | g2 | w2 |
edge | w2 | g1 |
edge | g1 | w1 |
```

## 一次训练步骤
type: flow
from: phases/03-deep-learning-core/10-mini-framework/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md

1. **DataLoader**：产出一批输入和目标。每轮打乱顺序。
2. **模型**：逐层前向传播。每层保存输入与输出。
3. **损失**：比较预测与目标，得到一个标量。
4. **优化器**：`optimizer.zero_grad()` 将所有梯度归零。
5. **损失**：`loss.backward()` 沿图从右向左传播梯度。
6. **优化器**：`optimizer.step()` 更新每个参数；SGD 为 `param -= lr * grad`。
7. **模型**：测试前调用 `model.eval()`。推理仅运行前向传播。

## 公式
type: concepts
from: phases/03-deep-learning-core/01-the-perceptron/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md

- **阶跃**：$z \ge 0$ 时 $\text{step}(z) = 1$，否则为 0。
- **感知机规则**：`w_i = w_i + learning_rate * error * x_i`，其中 error = y_true 减 y_pred。
- **Sigmoid**：$\sigma(z) = \frac{1}{1 + e^{-z}}$，范围 (0, 1)。导数为 $a(1 - a)$。
- **层**：$z = W x + b$，然后 $a = \text{sigmoid}(z)$。
- **MSE**：$\frac{1}{n} \sum (y_{\text{pred}} - y_{\text{true}})^2$，梯度为 $\frac{2}{n}(y_{\text{pred}} - y_{\text{true}})$。
- **BCE**: $-\left(y \log(p) + (1 - y) \log(1 - p)\right)$
- **CCE**：$-\sum_i y_i \log(p_i)$。只有真实类别贡献损失。
- **Softmax 加交叉熵的梯度**：真实类别为概率减 1，其余类别为概率。

## 代码任务
type: task-table
from: phases/03-deep-learning-core/01-the-perceptron/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md, phases/03-deep-learning-core/10-mini-framework/docs/zh.md

| 任务 | 代码 |
|---|---|
| 在 AND 上训练感知机 | `p_and = Perceptron(2)`，然后 `p_and.train(and_data)` |
| 串联各层 | `Network([hidden, output])` |
| 自动微分网络，2-4-1 | `net = Network([2, 4, 1])` |
| 从损失反向传播 | `total_loss.backward()` |
| 稳定的多分类损失 | `F.cross_entropy(logits, labels)` |
| 平滑目标 | `label_smoothing=0.1` |
| 选择优化器 | `Adam(model.parameters(), lr=0.01)` |
| 数据分批 | `DataLoader(train_data, batch_size=16, shuffle=True)` |

## 带反向传播的 Value 节点
type: annotated-code
lang: python
from: phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/code/main.py

```python
out = Value(self.data + other.data, (self, other), '+')
self.grad += out.grad                 # 加法直接传递梯度
other.grad += out.grad
out = Value(self.data * other.data, (self, other), '*')
self.grad += other.data * out.grad    # 乘法交换输入求导
other.grad += self.data * out.grad
self.grad += (s * (1 - s)) * out.grad # sigmoid reuses s
build_topo(self)                      # 对图做拓扑排序
self.grad = 1.0                       # dL/dL = 1
for v in reversed(topo):
    v._backward()                     # 向子节点传播梯度
```

## 迷你框架训练循环
type: annotated-code
lang: python
from: phases/03-deep-learning-core/10-mini-framework/docs/zh.md, phases/03-deep-learning-core/10-mini-framework/code/main.py

```python
model = Sequential(Linear(2, 16), ReLU(), Linear(16, 16), ReLU(),
                   Linear(16, 8), ReLU(), Linear(8, 1), Sigmoid())
criterion = BCELoss()
optimizer = Adam(model.parameters(), lr=0.01)
model.train()                          # 启用 dropout 与批次统计
for batch_inputs, batch_targets in loader:
    for x, t in zip(batch_inputs, batch_targets):
        pred = model.forward(x)
        loss = criterion(pred, t)
        optimizer.zero_grad()
        grad = criterion.backward()    # dL/dpred
        model.backward(grad)           # 逆序遍历模块
        optimizer.step()
model.eval()                           # 使用运行统计，关闭 dropout
```

## 选择损失
type: command-table
from: phases/03-deep-learning-core/05-loss-functions/docs/zh.md

| 命令 | 作用 |
|---|---|
| `F.mse_loss` | 回归；对离群值施加平方惩罚 |
| MAE / Huber | 对离群值稳健的回归 |
| `F.binary_cross_entropy` | 基于概率的二分类 |
| `F.cross_entropy` | 多分类；一步完成 log-softmax 与 NLL |
| 标签平滑 | 多分类交叉熵过于自信时添加 |
| Focal Loss | 类别不平衡；降低简单样本权重 |
| Triplet Loss | 带间隔的锚点、正例、负例 |
| InfoNCE | 大批量自监督嵌入 |

## 课程代码默认值
type: defaults
from: phases/03-deep-learning-core/01-the-perceptron/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md, phases/03-deep-learning-core/10-mini-framework/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 感知机 `learning_rate` | 0.1 | `epochs=100` |
| Adam `lr` | 0.001 | `beta1=0.9`, `beta2=0.999`, `eps=1e-8` |
| SGD `lr` | 0.01 | `param -= lr * grad` |
| Dropout `p` | 0.5 | 保留项按 1/(1-p) 缩放 |
| BatchNorm | `momentum=0.1` | `eps=1e-5`，评估时使用运行统计 |
| BCE 裁剪 `eps` | 1e-15 | 框架中的 `BCELoss` 使用 1e-7 |
| `alpha` | 0.1 | 标签平滑，10 类时目标为 0.91 |
| `temperature` | 0.07 | 对比损失，SimCLR 默认值 |

## 关键数值
type: tips
from: phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md

- sigmoid 导数在 $a = 0.5$ 时达到峰值 0.25。
- 十层 sigmoid 将梯度最多缩放为 $0.25^{10} = 0.000001$。
- 在正负各半的二分类中始终预测 0.5，MSE 为 0.25，什么也学不到。
- 交叉熵给出 $-\log(0.5) = 0.693$ 与 $-\log(0.99) = 0.01$。
- 自信但错误的猜测 $p = 0.01$，代价为 $-\log(0.01) = 4.6$。
- 10 类随机猜测代价为 $-\log(0.1) = 2.3$。
- $\gamma = 2$ 时，focal loss 给简单样本权重 0.01，困难样本权重 0.81。
- 一次反向传播得到全部梯度。逐个扰动权重需要每个权重各做一次前向传播。

## 故障排查
type: troubleshooting
from: phases/03-deep-learning-core/01-the-perceptron/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md, phases/03-deep-learning-core/10-mini-framework/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 感知机在 XOR 上从不收敛 | XOR 非线性可分 | 增加隐藏层 |
| 分类器对所有输入都输出 0.5 | 分类使用 MSE 损失 | 使用交叉熵 |
| 前几层不学习 | Sigmoid 逐层缩小梯度 | 使用 ReLU（第 04 课）与缩放初始化 |
| 损失为 inf 或 NaN | $\log(0) = -\infty$ | 将 p 裁剪到 [eps, 1 - eps] |
| `math.exp(1000)` 溢出 | sigmoid 输入过大 | 限制到 [-500, 500] |
| 复用值的梯度错误 | `=` 覆盖其他路径 | 使用 `+=` 累加 |
| 梯度每步增长 | 旧梯度未清除 | 先调用 `zero_grad()` |
| 测试结果每次都变 | Dropout 仍开启 | 调用 `model.eval()` |

## 问答
type: qa
from: phases/03-deep-learning-core/01-the-perceptron/docs/zh.md, phases/03-deep-learning-core/02-multi-layer-networks/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/05-loss-functions/docs/zh.md, phases/03-deep-learning-core/10-mini-framework/docs/zh.md

- **W 是什么形状？** 行数匹配当前层，列数匹配上一层。
- **训练为何用 sigmoid 而非阶跃？** Sigmoid 平滑，因此存在梯度。
- **为何保存激活值？** 反向传播需要它们，用内存换取一次传播。
- **为何拓扑排序？** 节点收齐梯度后才继续传递。
- **为何用 `F.cross_entropy`，而非先 softmax 再 log？** 合并为一次操作更数值稳定。
- **为何区分 `train()` 与 `eval()`？** Dropout 和 BatchNorm 在两种模式下行为不同。
- **`zero_grad` 为何单独调用？** 梯度用 `+=` 累积，直到被重置。
