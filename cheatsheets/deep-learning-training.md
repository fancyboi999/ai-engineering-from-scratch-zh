---
id: deep-learning-training
title: 神经网络训练
subtitle: 选择优化器、初始化、归一化、正则化与学习率调度，再排查损失异常的训练过程。
hue: 270
sources: phases/03-deep-learning-core/03-backpropagation, phases/03-deep-learning-core/04-activation-functions, phases/03-deep-learning-core/06-optimizers, phases/03-deep-learning-core/07-regularization, phases/03-deep-learning-core/08-weight-initialization, phases/03-deep-learning-core/09-learning-rate-schedules, phases/03-deep-learning-core/13-debugging-neural-networks
code: TN
---

## 一步 AdamW
type: architecture
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md

```arch
node | loss | 1,1 | 损失 | 前向传播输出
node | bwd | 2,1 | loss.backward() | 链式法则填充梯度
node | clip | 3,1 | clip_grad_norm_ | max_norm=1.0
node | m | 2,2 | 一阶矩 m_t | 均值，beta1 0.9
node | v | 3,2 | 二阶矩 v_t | 方差，beta2 0.999
node | hat | 3,3 | 偏差修正 | 除以 1 - beta^t
node | upd | 2,3 | Adam 更新 | lr · m̂ / (√v̂ + ε)
node | wd | 1,3 | 解耦衰减 | 减去 lr · λ · w
edge | loss | bwd |
edge | bwd | clip |
edge | clip | m |
edge | clip | v |
edge | m | hat |
edge | v | hat |
edge | hat | upd |
edge | upd | wd | AdamW
```

## 训练步骤
type: flow
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md

1. **zero_grad**：清除上一批的梯度。
2. **前向传播**：在当前批次上运行模型。
3. **损失**：比较模型输出与目标。
4. **backward**：计算每个参数的梯度。
5. **裁剪**：限制全局梯度范数，此步可选。
6. **step**：优化器更新权重。
7. **调度**：先 `optimizer.step()`，再 `scheduler.step()`。

## AdamW 与余弦调度训练循环
type: annotated-code
lang: python
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md

```python
optimizer = optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.01)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)
for epoch in range(100):
    optimizer.zero_grad()                  # 清除旧梯度
    output = model(torch.randn(32, 784))   # 前向传播
    loss = torch.nn.functional.cross_entropy(output, torch.randint(0, 10, (32,)))
    loss.backward()                        # 按链式法则填充 .grad
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    optimizer.step()                       # 更新权重
    scheduler.step()                       # 在 optimizer.step() 之后
# 先预热再余弦衰减，来自 HuggingFace 库
scheduler = get_cosine_schedule_with_warmup(
    optimizer, num_warmup_steps=2000, num_training_steps=100000)
```

## 关键公式
type: concepts
from: phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/07-regularization/docs/zh.md, phases/03-deep-learning-core/08-weight-initialization/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md

- **链式法则**：$\frac{dy}{dx} = f'(g(x)) \cdot g'(x)$
- **Adam 矩估计**：$m_t = \beta_1 m_{t-1} + (1 - \beta_1) \cdot \text{gradient}$ 与 $v_t = \beta_2 v_{t-1} + (1 - \beta_2) \cdot \text{gradient}^2$
- **偏差修正**：$\hat{m} = \frac{m_t}{1 - \beta_1^t}$ 与 $\hat{v} = \frac{v_t}{1 - \beta_2^t}$
- **AdamW 更新**：$w = w - \text{lr} \cdot \frac{\hat{m}}{\sqrt{\hat{v}} + \epsilon} - \text{lr} \cdot \lambda w$
- **余弦衰减**：$\text{lr}(t) = \text{lr}_{\min} + 0.5 \cdot (\text{lr}_{\max} - \text{lr}_{\min}) \cdot \left(1 + \cos\left(\frac{\pi t}{T}\right)\right)$
- **线性预热**：$\text{lr}(t) = \text{lr}_{\max} \cdot \frac{t}{\text{warmup\_steps}} \quad \text{for } t < \text{warmup\_steps}$
- **初始化方差**：Kaiming 为 $\mathrm{Var}(w) = \frac{2}{\text{fan}_{\text{in}}}$，Xavier 为 $\mathrm{Var}(w) = \frac{2}{\text{fan}_{\text{in}} + \text{fan}_{\text{out}}}$
- **反向缩放 dropout**：训练时 $\text{output} = \text{activation}(z) \cdot \text{mask} / (1 - p)$

## 按场景选择
type: command-table
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/08-weight-initialization/docs/zh.md

| 场景 | 选择 |
|---|---|
| Transformer 或 LLM | AdamW, lr=1e-4, wd=0.01-0.1 |
| CNN 或 ResNet | SGD + Momentum, lr=0.1, momentum=0.9 |
| GAN | Adam, lr=2e-4, beta1=0.5 |
| 微调 | AdamW, lr=2e-5, wd=0.01 |
| 暂不确定 | AdamW, lr=3e-4, wd=0.01 |
| Sigmoid 或 tanh 层 | Xavier 初始化 |
| ReLU、GELU 或 Swish 层 | Kaiming 初始化 |
| Transformer 残差层 | 按 1/sqrt(2N) 缩放，N 为层数 |

## 初始化、归一化与正则化代码
type: task-table
from: phases/03-deep-learning-core/08-weight-initialization/docs/zh.md, phases/03-deep-learning-core/07-regularization/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

| 任务 | 代码 |
|---|---|
| ReLU 的 Kaiming 初始化 | `nn.init.kaiming_normal_(layer.weight, nonlinearity='relu')` |
| Xavier 初始化 | `nn.init.xavier_uniform_(layer.weight)` |
| Linear 后的 BatchNorm | `nn.BatchNorm1d(256)` |
| transformer 中的 LayerNorm | `nn.LayerNorm(d_model)` |
| MLP 中的 Dropout | `nn.Dropout(0.3)` |
| 有下限的余弦衰减 | `CosineAnnealingLR(optimizer, T_max=1000, eta_min=1e-5)` |
| 查找首个 NaN 或 Inf | `with torch.autograd.detect_anomaly():` |
| 测量梯度范数 | `torch.nn.utils.clip_grad_norm_(model.parameters(), float("inf"))` |

## 优化器默认值
type: defaults
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Adam lr | 0.001 | 首先调学习率 |
| beta1 | 0.9 | 几乎不需要改变 |
| beta2 | 0.999 | 必要时第二个调它 |
| epsilon | 1e-8 | 几乎不需要改变 |
| AdamW weight_decay | 0.01 | 不随自适应学习率缩放 |
| SGD momentum | 0.9 | 约保留最近 10 次梯度 |
| CNN 的 SGD 权重衰减 | 1e-4 | 配合阶梯或余弦调度 |
| 梯度裁剪 max_norm | 1.0 | 按全局范数裁剪 |

## 正则化与调度默认值
type: defaults
from: phases/03-deep-learning-core/07-regularization/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| transformer 的 Dropout | 0.1 | 使用 LayerNorm 的模型 |
| MLP 的 Dropout | 0.5 | 关闭一半神经元 |
| BatchNorm momentum | 0.1 | 90% 旧值加 10% 新值 |
| BatchNorm eps | 1e-5 | 加在方差上 |
| 预热比例 | 3-5% | 占总步数的比例 |
| 余弦下限 eta_min | 1e-5 | 最低学习率 |
| 阶梯衰减系数 | 0.1 | 在固定 epoch 发生 |
| 对数截断 eps | 1e-7 | 使 log(p) 保持有限 |

## 故障排查
type: troubleshooting
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/03-deep-learning-core/03-backpropagation/docs/zh.md, phases/03-deep-learning-core/08-weight-initialization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失停在 -log(1/num_classes) | 模型预测均匀分布 | 检查数据流水线与标签 |
| 几步后损失变 NaN | 学习率过高 | 学习率降为原来的 1/10 |
| 损失立即变 NaN | log(0) 或除以零 | 将预测截断到 [eps, 1-eps] |
| 损失振荡 | 未调用 `optimizer.zero_grad()` | 在 `loss.backward()` 前调用 |
| 每次测试准确率不同 | 未调用 `model.eval()` | 加入 `model.eval()` 和 `torch.no_grad()` |
| 训练准确率高、测试低 | 过拟合 | dropout、权重衰减、更多数据 |
| 梯度全为零 | ReLU 失活或计算图断开 | LeakyReLU，检查 `.requires_grad` |
| 浅层停止学习 | sigmoid 导数最高为 0.25 | ReLU 或 GELU 配合 Kaiming 初始化 |

## 术语表
type: glossary
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/07-regularization/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

- **SGD**：在小批量上执行的随机梯度下降。
- **AdamW**：使用解耦权重衰减的 Adam。
- **BatchNorm**：在小批量内对每个特征归一化。
- **LayerNorm**：在每个样本内部跨特征归一化。
- **RMSNorm**：省略减均值的 LayerNorm。
- **1cycle**：学习率在一个周期内先升后降。
- **SGDR**：带热重启的余弦退火。
- **学习率范围测试**：短时运行中提高学习率，找到损失开始发散的位置。

## 问答
type: qa
from: phases/03-deep-learning-core/06-optimizers/docs/zh.md, phases/03-deep-learning-core/09-learning-rate-schedules/docs/zh.md, phases/03-deep-learning-core/07-regularization/docs/zh.md, phases/03-deep-learning-core/08-weight-initialization/docs/zh.md

- **为何用 AdamW 而非 Adam 加 L2？** Adam 用自适应学习率缩放 L2 项，AdamW 则按相同比例收缩所有权重。
- **为何预热？** Adam 的矩估计从零开始，初期大步长会依据不准的统计量更新。
- **为何修正偏差？** 第 1 步 beta1 为 0.9 时，m 只有梯度的 0.1 倍。
- **transformer 为何使用 LayerNorm？** 它不依赖批量大小或序列长度。
- **ReLU 为何使用 Kaiming？** ReLU 将一半激活置零，因此方差为 2/fan_in。

## 提示
type: tips
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/03-deep-learning-core/06-optimizers/docs/zh.md

- 先尝试过拟合单个批次，损失必须接近零。
- 先尝试三个相差 10 倍的学习率，再排查其他原因。
- 只调一个超参数时，就调学习率。
- 调试时打印每次操作后的张量形状。
- 检查各层梯度量级是否相近。
- 模型和数据都调用 `.to(device)`。
