# 证据对照：PyTorch 基础

中文主题：[PyTorch 基础](../pytorch-essentials.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 任务

对应主题区块：**任务**（`task-table`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)
- [`phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md`](../../phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md)

构建器核对的标识与数值：

- `torch.device`
- `torch.cuda.is_available`
- `is_available`
- `device`
- `torch.randn`
- `randn`
- `model.to`
- `p.numel`
- `model.parameters`
- `sum`
- `numel`
- `parameters`
- `torch.save`
- `model.state_dict`
- `model.pt`
- `state_dict`
- `save`
- `model.load_state_dict`
- `torch.load`
- `load_state_dict`
- `weights_only`
- `load`
- `model.eval`
- `torch.no_grad`
- `no_grad`
- `eval`
- `torch.cuda.get_device_name`
- `get_device_name`

## 训练步骤

对应主题区块：**训练步骤**（`flow`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `inputs.to`
- `targets.to`
- `optimizer.zero_grad`
- `zero_grad`
- `model`
- `criterion`
- `loss.backward`
- `backward`
- `optimizer.step`
- `step`

## 训练流水线

对应主题区块：**训练流水线**（`architecture`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `nn.Module`
- `forward`
- `parameters`
- `loss.backward`
- `backward`
- `zero_grad`
- `step`

## 训练与评估

对应主题区块：**训练与评估**（`annotated-code`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `nn.CrossEntropyLoss`
- `CrossEntropyLoss`
- `torch.optim.Adam`
- `model.parameters`
- `Adam`
- `parameters`
- `num_epochs`
- `range`
- `model.train`
- `train`
- `train_loader`
- `inputs.to`
- `targets.to`
- `optimizer.zero_grad`
- `zero_grad`
- `model`
- `criterion`
- `loss.backward`
- `backward`
- `optimizer.step`
- `step`
- `model.eval`
- `eval`
- `torch.no_grad`
- `no_grad`

## 数据与混合精度

对应主题区块：**数据与混合精度**（`annotated-code`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `MNISTDataset`
- `__len__`
- `self.labels`
- `len`
- `__getitem__`
- `self.images`
- `batch_size`
- `num_workers`
- `DataLoader`
- `GradScaler`
- `device_type`
- `autocast`
- `model`
- `criterion`
- `scaler.scale`
- `scale`
- `backward`
- `scaler.step`
- `step`
- `scaler.update`
- `update`
- `optimizer.zero_grad`
- `zero_grad`

## 张量操作

对应主题区块：**张量操作**（`command-table`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)
- [`phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md`](../../phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md)

构建器核对的标识与数值：

- `x.view`
- `view`
- `x.reshape`
- `reshape`
- `x.permute`
- `permute`
- `x.unsqueeze`
- `unsqueeze`
- `x.squeeze`
- `squeeze`
- `x.to`
- `x.cpu`
- `cpu`
- `detach`
- `labels.long`
- `long`

## 模块

对应主题区块：**模块**（`command-table`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `nn.Linear`
- `Linear`
- `nn.Conv2d`
- `in_ch`
- `out_ch`
- `Conv2d`
- `nn.BatchNorm1d`
- `BatchNorm1d`
- `nn.LayerNorm`
- `LayerNorm`
- `nn.Dropout`
- `Dropout`
- `nn.ReLU`
- `ReLU`
- `nn.Embedding`
- `Embedding`
- `nn.Sequential`
- `Sequential`

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)
- [`phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md`](../../phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md)
- [`phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md`](../../phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md)

构建器核对的标识与数值：

- `float32`
- `bfloat16`
- `1e-3`
- `1e-2`
- `64`
- `4`
- `0.2`
- `2`

## 关键概念

对应主题区块：**关键概念**（`concepts`）。

来源文件：

- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `requires_grad`
- `zero_grad`
- `nn.Parameter`
- `parameters`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md`](../../phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md)
- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `optimizer.zero_grad`
- `loss.backward`
- `zero_grad`
- `backward`
- `model.eval`
- `torch.no_grad`
- `no_grad`
- `eval`
- `detach`
- `labels.long`
- `long`
- `torch.nn.utils.clip_grad_norm_`
- `clip_grad_norm_`

## 调试探测

对应主题区块：**调试探测**（`task-table`）。

来源文件：

- [`phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md`](../../phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md)
- [`phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md`](../../phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md)

构建器核对的标识与数值：

- `torch.autograd.detect_anomaly`
- `detect_anomaly`
- `torch.isnan`
- `isnan`
- `torch.nn.utils.clip_grad_norm_`
- `model.parameters`
- `clip_grad_norm_`
- `parameters`
- `float`
- `torch.cuda.memory_allocated`
- `memory_allocated`

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md`](../../phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md)
- [`phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md`](../../phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md)

构建器核对的标识与数值：

- `num_workers`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/pytorch-essentials.md

Paths are relative to /private/tmp/aiefs-cheatsheets/phases/. P = 03-deep-learning-core/11-intro-to-pytorch/docs/en.md, D = 03-deep-learning-core/13-debugging-neural-networks/docs/en.md, G = 00-setup-and-tooling/03-gpu-setup-and-cloud/docs/en.md, X = 00-setup-and-tooling/12-debugging-and-profiling/docs/en.md.

## Tasks (task-table, 8)
- device = torch.device("cuda" if ... else "cpu"): P:67, 245, G:94
- torch.randn(3, 4, device=device): P:68
- model = model.to(device): P:246, recursive move P:249
- sum(p.numel() for p in model.parameters()): P:429
- torch.save(model.state_dict(), "model.pt"): P:475
- model.load_state_dict(torch.load("model.pt", weights_only=True)): P:478
- model.eval() then torch.no_grad(): P:385-390, 402
- torch.cuda.get_device_name(0): G:66, 86

## Training step (flow, 7)
1. DataLoader yields batch: P:192, 206
2. inputs.to(device), targets.to(device): P:207
3. optimizer.zero_grad(): P:208
4. outputs = model(inputs): P:209
5. criterion(outputs, targets): P:210
6. loss.backward() replays the tape in reverse: P:103, 211
7. optimizer.step(): P:212

## Training pipeline (architecture, 6 nodes)
- Dataset __len__, __getitem__: P:219
- DataLoader batch, shuffle, workers: P:219, 235
- nn.Module forward(), parameters(): P:27, 121, 140
- Loss fn logits and targets: P:164, 194
- Autograd loss.backward(): P:88, 103, 195
- Optimizer step(), zero_grad(): P:196-197
- edges: sequence P:186-198

## Train and evaluate (annotated-code, 14 lines)
- nn.CrossEntropyLoss(), raw logits: P:426, 169
- torch.optim.Adam(model.parameters(), lr=1e-3): P:427
- loop lines: P:204-212
- model.eval() / torch.no_grad() / outputs = model(images): P:386, 390, 393
- train mode for dropout and batch norm: D:187

## Data and mixed precision (annotated-code, 14 lines)
- MNISTDataset __len__ / __getitem__: P:224-233
- DataLoader(dataset, batch_size=64, shuffle=True, num_workers=4): P:235
- GradScaler from torch.amp, autocast(device_type="cuda"), scaler.scale/step/update, zero_grad: P:258-268
- float16 forward: P:255

## Tensor ops (command-table, 8)
- view, reshape, permute, unsqueeze, squeeze: P:79-83
- x.to("cuda") / x.cpu(): P:69-70
- .detach(): D:190
- labels.long(): D:193

## Modules (command-table, 8)
- nn.Linear, Conv2d, BatchNorm1d, Dropout, ReLU, Embedding, LayerNorm rows: P:146-153
- nn.Sequential runs modules in order: P:343-351, 462

## Defaults and numbers (defaults, 8)
- float32 default training: P:59
- bfloat16 LLM training, float32 range: P:61
- Adam 1e-3: P:176, D:57
- SGD 1e-2 or 1e-1: D:57
- batch_size 64: P:235, 419
- num_workers 4: P:235, 238
- Dropout 0.2: P:346, 349
- fp16 bytes per parameter 2, margin: G:139

## Key concepts (concepts, 8)
- Tensor shape, dtype, device: P:43
- same device rule: P:73
- Autograd tape: P:88, 103
- leaf requires_grad=True: P:115
- accumulation, zero_grad: P:116
- registration nn.Parameter in __init__, parameters(): P:140
- state_dict portable: P:482, 523
- mixed precision float16 plus float32 master weights: P:255, 527

## Troubleshooting (troubleshooting, 8)
- RuntimeError: expected CUDA tensor, .to(device): D:189
- RuntimeError: modified by in-place operation, x += 1: D:191
- no zero_grad, loss oscillates: D:186
- no model.eval(), test accuracy varies: D:187
- OOM, graph not freed, detach or no_grad: D:190, 208
- labels Float, labels.long(): D:193
- softmax into CrossEntropyLoss, wrong gradients silently: P:169
- NaN from exploding gradients, clip_grad_norm_ or lower LR: D:63

## Debug probes (task-table, 4)
- torch.autograd.detect_anomaly(): D:610
- torch.isnan(loss): X:67, 262
- clip_grad_norm_(model.parameters(), float("inf")) as grad norm reader: D:632
- torch.cuda.memory_allocated() / 1e9: X:209

## Tips (tips, 6)
- overfit-one-batch first: D:659, 700
- 3 learning rates 10x apart: D:57
- print shapes, silent broadcasting: D:188
- normalize mean 0 std 1: D:192
- loss at -log(1/num_classes) means uniform: D:199
- num_workers can double speed on disk bound data: P:238
````
