---
name: skill-pytorch-patterns
description: PyTorch 训练、评估和部署的参考模式
version: 1.0.0
phase: 03
lesson: 11
tags: [pytorch, training, deep-learning, gpu, patterns]
---

## 标准训练循环

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = Model().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)

for epoch in range(num_epochs):
    model.train()
    for inputs, targets in train_loader:
        inputs, targets = inputs.to(device), targets.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

    model.eval()
    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
```

## 混合精度训练

```python
from torch.amp import autocast, GradScaler

scaler = GradScaler()
for inputs, targets in train_loader:
    inputs, targets = inputs.to(device), targets.to(device)
    optimizer.zero_grad()
    with autocast(device_type="cuda"):
        outputs = model(inputs)
        loss = criterion(outputs, targets)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

适用场景：在支持 float16 的 GPU 硬件（V100、A100、H100、RTX 3090+）上训练。预计提速约 1.5-2 倍，显存占用减少约 50%。

## 梯度累积

```python
accumulation_steps = 4
optimizer.zero_grad()
for i, (inputs, targets) in enumerate(train_loader):
    inputs, targets = inputs.to(device), targets.to(device)
    outputs = model(inputs)
    loss = criterion(outputs, targets) / accumulation_steps
    loss.backward()
    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

适用场景：需要的有效 batch size 超出了 GPU 显存的容纳能力。把损失除以 accumulation_steps，可以保持梯度尺度不变。

## 保存与加载

```python
torch.save({
    "epoch": epoch,
    "model_state_dict": model.state_dict(),
    "optimizer_state_dict": optimizer.state_dict(),
    "loss": loss.item(),
}, "checkpoint.pt")

checkpoint = torch.load("checkpoint.pt", weights_only=True)
model.load_state_dict(checkpoint["model_state_dict"])
optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
```

要恢复训练，一定要保存优化器状态。只做推理的话，保存 `model.state_dict()` 就够了。

## 自定义 Dataset

```python
class CustomDataset(torch.utils.data.Dataset):
    def __init__(self, data_dir, transform=None):
        self.samples = self._load_samples(data_dir)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        x, y = self.samples[idx]
        if self.transform:
            x = self.transform(x)
        return x, y

    def _load_samples(self, data_dir):
        ...
```

## DataLoader 配置

```python
train_loader = torch.utils.data.DataLoader(
    dataset,
    batch_size=64,
    shuffle=True,
    num_workers=4,
    pin_memory=True,
    drop_last=True,
    persistent_workers=True,
)
```

| 参数 | 作用 | 何时使用 |
|-----------|-------------|-------------|
| num_workers=4 | 并行加载数据 | 多核机器上一律开启 |
| pin_memory=True | 使用页锁定的 CPU 内存 | 在 GPU 上训练时 |
| drop_last=True | 丢弃最后一个不完整的 batch | 使用 BatchNorm 时 |
| persistent_workers=True | 跨 epoch 保持 worker 进程存活 | num_workers > 0 时 |

## 学习率调度

```python
scheduler = torch.optim.lr_scheduler.OneCycleLR(
    optimizer,
    max_lr=1e-3,
    total_steps=num_epochs * len(train_loader),
    pct_start=0.1,
)

for epoch in range(num_epochs):
    for inputs, targets in train_loader:
        ...
        optimizer.step()
        scheduler.step()
```

OneCycleLR：大多数任务的最佳默认选择。先预热到 max_lr，再按余弦衰减。每个 batch 之后都要调用 `scheduler.step()`，而不是每个 epoch 调一次。

## 权重初始化

```python
def init_weights(module):
    if isinstance(module, nn.Linear):
        nn.init.kaiming_normal_(module.weight, nonlinearity="relu")
        if module.bias is not None:
            nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Conv2d):
        nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")

model.apply(init_weights)
```

## 推理模式

```python
model.eval()

with torch.inference_mode():
    outputs = model(inputs)
```

`torch.inference_mode()` 比 `torch.no_grad()` 更快，因为它直接整体关闭 autograd，而不只是屏蔽梯度计算。

## 常见错误清单

1. 在 CrossEntropyLoss 之前做 softmax（它内部已经包含 log_softmax）
2. 验证时忘了调用 model.eval()
3. 忘了把张量移到模型所在的设备上
4. 没有调用 optimizer.zero_grad()（梯度默认会累积）
5. 训练时用了 torch.no_grad()（会关闭梯度计算）
6. num_workers 设得太高（进程开太多，内存频繁换页）
7. 在 GPU 上训练却没开 pin_memory=True
8. 保存整个模型对象而不是 state_dict（代码一重构就加载不了）
