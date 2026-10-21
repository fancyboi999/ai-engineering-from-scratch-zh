---
id: pytorch-essentials
title: PyTorch 基础
code: PT
subtitle: 课程中的张量、自动求导、nn.Module、训练循环、DataLoader 与设备管理。
hue: 60
sources: phases/03-deep-learning-core/11-intro-to-pytorch, phases/03-deep-learning-core/13-debugging-neural-networks, phases/00-setup-and-tooling/03-gpu-setup-and-cloud, phases/00-setup-and-tooling/12-debugging-and-profiling
source_hash: 892e4c151d3c313a
---

## 任务
type: task-table
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md

| 任务 | 代码 |
|---|---|
| 选择设备 | `device = torch.device("cuda" if torch.cuda.is_available() else "cpu")` |
| 在设备上创建张量 | `x = torch.randn(3, 4, device=device)` |
| 移动模型与批次 | `model = model.to(device)` |
| 统计参数 | `sum(p.numel() for p in model.parameters())` |
| 保存权重 | `torch.save(model.state_dict(), "model.pt")` |
| 加载权重 | `model.load_state_dict(torch.load("model.pt", weights_only=True))` |
| 无计算图评估 | 先 `model.eval()`，再 `with torch.no_grad():` |
| 检查 GPU | `torch.cuda.get_device_name(0)` |

## 训练步骤
type: flow
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

1. **DataLoader**：产出一批输入与目标。
2. **设备**：`inputs.to(device), targets.to(device)` 移动批次。
3. **优化器**：`optimizer.zero_grad()` 清除旧梯度。
4. **模型**：`outputs = model(inputs)` 执行前向传播。
5. **损失函数**：`criterion(outputs, targets)` 返回一个标量。
6. **自动求导**：`loss.backward()` 逆序回放运算记录。
7. **优化器**：`optimizer.step()` 更新参数。

## 训练流水线
type: architecture
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

```arch
node | ds | 1,1 | Dataset | __len__, __getitem__
node | dl | 2,1 | DataLoader | 批次、打乱、工作进程
node | model | 3,1 | nn.Module | forward(), parameters()
node | loss | 3,2 | 损失函数 | logits 与目标
node | tape | 4,2 | 自动求导 | loss.backward()
node | opt | 4,1 | 优化器 | step(), zero_grad()
edge | ds | dl | 样本
edge | dl | model | 批次
edge | model | loss | 输出
edge | loss | tape | 反向传播
edge | tape | opt | 梯度
edge | opt | model | 更新
```

## 训练与评估
type: annotated-code
lang: python
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

```python
criterion = nn.CrossEntropyLoss()                 # 接收原始 logits
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
for epoch in range(num_epochs):
    model.train()                                 # 开启 dropout 与 batch norm
    for inputs, targets in train_loader:
        inputs, targets = inputs.to(device), targets.to(device)
        optimizer.zero_grad()                     # 默认会累积梯度
        outputs = model(inputs)                   # 前向传播
        loss = criterion(outputs, targets)
        loss.backward()                           # 计算梯度
        optimizer.step()                          # 更新权重
model.eval()                                      # 测试时切换评估模式
with torch.no_grad():                             # 不构建图，减少内存
    outputs = model(images)
```

## 数据与混合精度
type: annotated-code
lang: python
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

```python
class MNISTDataset(Dataset):
    def __len__(self):
        return len(self.labels)                   # 样本数
    def __getitem__(self, idx):
        return self.images[idx], self.labels[idx]  # 一个样本
loader = DataLoader(dataset, batch_size=64, shuffle=True, num_workers=4)
scaler = GradScaler()                             # 来自 torch.amp
for inputs, targets in loader:
    with autocast(device_type="cuda"):            # float16 前向传播
        outputs = model(inputs)
        loss = criterion(outputs, targets)
    scaler.scale(loss).backward()                 # 缩放后的反向传播
    scaler.step(optimizer)
    scaler.update()
    optimizer.zero_grad()
```

## 张量操作
type: command-table
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

| 命令 | 作用 |
|---|---|
| `x.view(2, 12)` | 改变形状，张量必须连续 |
| `x.reshape(6, 4)` | 改变形状，无连续性限制 |
| `x.permute(2, 0, 1)` | 重排维度 |
| `x.unsqueeze(0)` | 增加一个维度，`(1, 2, 3, 4)` |
| `x.squeeze()` | 移除大小为 1 的维度 |
| `x.to("cuda")` / `x.cpu()` | 在设备间移动张量 |
| `.detach()` | 将张量从计算图分离 |
| `labels.long()` | 转换为交叉熵所需的标签类型 |

## 模块
type: command-table
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

| 命令 | 作用 |
|---|---|
| `nn.Linear(in, out)` | $Wx + b$，参数量 in*out + out |
| `nn.Conv2d(in_ch, out_ch, k)` | 二维卷积 |
| `nn.BatchNorm1d(features)` | 激活归一化，参数量 2 * features |
| `nn.LayerNorm(dim)` | 逐样本归一化，参数量 2 * dim |
| `nn.Dropout(p)` | 随机置零，无参数 |
| `nn.ReLU()` | $\max(0, x)$ |
| `nn.Embedding(vocab, dim)` | 查找表，参数量 vocab * dim |
| `nn.Sequential(...)` | 依次运行模块 |

## 默认值与数值
type: defaults
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 张量 dtype | float32 | 默认训练精度 |
| LLM 训练 dtype | bfloat16 | float32 的范围，精度更低 |
| Adam 学习率 | 1e-3 | 默认起点 |
| SGD 起始学习率 | 1e-2 | 调试课程中也使用 1e-1 |
| DataLoader batch_size | 64 | 课程训练加载器 |
| num_workers | 4 | 并行加载进程数 |
| MNIST MLP 的 Dropout | 0.2 | 每个隐藏 ReLU 之后 |
| fp16 每参数字节数 | 2 | 用显存除以 2，并保留余量 |

## 关键概念
type: concepts
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

- **张量**：带有形状、dtype 与设备的数组。
- **同设备规则**：每个操作需要的全部张量必须位于同一设备。
- **自动求导**：记录操作，再逆序回放。
- **叶子张量**：仅 `requires_grad=True` 的叶子默认累积梯度。
- **累积**：梯度默认累加，每步调用 `zero_grad`。
- **注册**：`parameters()` 会发现 `__init__` 中设置的模块与 `nn.Parameter`。
- **state_dict**：名称到张量的映射，可在代码变化间迁移。
- **混合精度**：float16 前向与反向传播，float32 主权重。

## 故障排查
type: troubleshooting
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `RuntimeError: expected CUDA tensor` | 模型与数据位于不同设备 | 模型和数据均调用 `.to(device)` |
| `RuntimeError: modified by in-place operation` | 原地操作破坏自动求导 | 将 `x += 1` 改为 `x = x + 1` |
| 损失振荡 | 未调用 `optimizer.zero_grad()` | 在 `loss.backward()` 前调用 |
| 每次测试准确率不同 | 测试时未调用 `model.eval()` | 加入 `model.eval()` 与 `torch.no_grad()` |
| 内存不足 | 计算图未释放 | `.detach()` 或 `torch.no_grad()` |
| 交叉熵 dtype 错误 | 标签是 Float | 用 `labels.long()` 转换 |
| 梯度错误却不报错 | 向 `CrossEntropyLoss` 传入 softmax 输出 | 传入原始 logits |
| 损失突变为 NaN | 梯度爆炸 | `torch.nn.utils.clip_grad_norm_` 或降低学习率 |

## 调试探测
type: task-table
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

| 任务 | 代码 |
|---|---|
| 查找产生 NaN 的操作 | `with torch.autograd.detect_anomaly():` |
| 检查损失是否为 NaN | `torch.isnan(loss)` |
| 读取梯度范数 | `torch.nn.utils.clip_grad_norm_(model.parameters(), float("inf"))` |
| 读取 GPU 内存 | `torch.cuda.memory_allocated() / 1e9` |

## 提示
type: tips
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

- 先测试过拟合单个批次，失败说明训练设置有误。
- 先尝试三个相差 10 倍的学习率，再寻找其他问题。
- 每次操作后打印形状，广播会掩盖形状错误。
- 将输入归一化到均值 0、标准差 1。
- 损失停在 -log(1/num_classes) 表示预测接近均匀分布。
- 数据读取受磁盘限制时使用 `num_workers`，速度可能翻倍。
