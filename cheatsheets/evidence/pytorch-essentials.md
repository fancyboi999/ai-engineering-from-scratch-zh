# Evidence: cheatsheets/pytorch-essentials.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：PyTorch 基础

中文主题：[PyTorch 基础](../pytorch-essentials.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: P = phases/03-deep-learning-core/11-intro-to-pytorch/docs/en.md, D = phases/03-deep-learning-core/13-debugging-neural-networks/docs/en.md, G = phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/en.md, X = phases/00-setup-and-tooling/12-debugging-and-profiling/docs/en.md.

## 任务 (task-table)

原始区块：Tasks (task-table, 8)
- device = torch.device("cuda" if ... else "cpu"): P:67, 245, G:94
- torch.randn(3, 4, device=device): P:68
- model = model.to(device): P:246, recursive move P:249
- sum(p.numel() for p in model.parameters()): P:429
- torch.save(model.state_dict(), "model.pt"): P:475
- model.load_state_dict(torch.load("model.pt", weights_only=True)): P:478
- model.eval() then torch.no_grad(): P:385-390, 402
- torch.cuda.get_device_name(0): G:66, 86

## 训练步骤 (flow)

原始区块：Training step (flow, 7)
1. DataLoader yields batch: P:192, 206
2. inputs.to(device), targets.to(device): P:207
3. optimizer.zero_grad(): P:208
4. outputs = model(inputs): P:209
5. criterion(outputs, targets): P:210
6. loss.backward() replays the tape in reverse: P:103, 211
7. optimizer.step(): P:212

## 训练流水线 (architecture)

原始区块：Training pipeline (architecture, 6 nodes)
- Dataset __len__, __getitem__: P:219
- DataLoader batch, shuffle, workers: P:219, 235
- nn.Module forward(), parameters(): P:27, 121, 140
- Loss fn logits and targets: P:164, 194
- Autograd loss.backward(): P:88, 103, 195
- Optimizer step(), zero_grad(): P:196-197
- edges: sequence P:186-198

## 训练与评估 (annotated-code)

原始区块：Train and evaluate (annotated-code, 14 lines)
- nn.CrossEntropyLoss(), raw logits: P:426, 169
- torch.optim.Adam(model.parameters(), lr=1e-3): P:427
- loop lines: P:204-212
- model.eval() / torch.no_grad() / outputs = model(images): P:386, 390, 393
- train mode for dropout and batch norm: D:187

## 数据与混合精度 (annotated-code)

原始区块：Data and mixed precision (annotated-code, 14 lines)
- MNISTDataset __len__ / __getitem__: P:224-233
- DataLoader(dataset, batch_size=64, shuffle=True, num_workers=4): P:235
- GradScaler from torch.amp, autocast(device_type="cuda"), scaler.scale/step/update, zero_grad: P:258-268
- float16 forward: P:255

## 张量操作 (command-table)

原始区块：Tensor ops (command-table, 8)
- x.view(2, 12), contiguous: P:79
- x.reshape(6, 4), works always: P:80
- x.permute(2, 0, 1): P:81
- x.unsqueeze(0), (1, 2, 3, 4): P:82
- x.squeeze(), removes size 1 dimensions: P:83
- x.to("cuda") / x.cpu(): P:69-70
- .detach(): D:190
- labels.long(): D:193

## 模块 (command-table)

原始区块：Modules (command-table, 8)
- nn.Linear(in, out), Wx + b, in*out + out: P:146
- nn.Conv2d(in_ch, out_ch, k), 2D convolution: P:147
- nn.BatchNorm1d(features), 2 * features: P:148
- nn.LayerNorm(dim), 2 * dim: P:153
- nn.Dropout(p), 0 parameters: P:149
- nn.ReLU(): P:150
- nn.Embedding(vocab, dim), vocab * dim: P:152
- nn.Sequential runs modules in order: P:343-351, 462

## 默认值与数值 (defaults)

原始区块：Defaults and numbers (defaults, 8)
- float32 default training: P:59
- bfloat16 LLM training, float32 range: P:61
- Adam 1e-3: P:176, D:57
- SGD 1e-2 or 1e-1: D:57
- batch_size 64: P:235, 419
- num_workers 4: P:235, 238
- Dropout 0.2: P:346, 349
- fp16 bytes per parameter 2, margin: G:139

## 关键概念 (concepts)

原始区块：Key concepts (concepts, 8)
- Tensor shape, dtype, device: P:43
- same device rule: P:73
- Autograd tape: P:88, 103
- leaf requires_grad=True: P:115
- accumulation, zero_grad: P:116
- registration nn.Parameter in __init__, parameters(): P:140
- state_dict portable: P:482, 523
- mixed precision float16 plus float32 master weights: P:255, 527

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (troubleshooting, 8)
- RuntimeError: expected CUDA tensor, .to(device): D:189
- RuntimeError: modified by in-place operation, x += 1: D:191
- no zero_grad, loss oscillates: D:186
- no model.eval(), test accuracy varies: D:187
- OOM, graph not freed, detach or no_grad: D:190, 208
- labels Float, labels.long(): D:193
- softmax into CrossEntropyLoss, wrong gradients silently: P:169
- NaN from exploding gradients, clip_grad_norm_ or lower LR: D:63

## 调试探测 (task-table)

原始区块：Debug probes (task-table, 4)
- torch.autograd.detect_anomaly(): D:610
- torch.isnan(loss): X:67, 262
- clip_grad_norm_(model.parameters(), float("inf")) as grad norm reader: D:632
- torch.cuda.memory_allocated() / 1e9: X:209

## 提示 (tips)

原始区块：Tips (tips, 6)
- overfit-one-batch first: D:659, 700
- 3 learning rates 10x apart: D:57
- print shapes, silent broadcasting: D:188
- normalize mean 0 std 1: D:192
- loss at -log(1/num_classes) means uniform: D:199
- num_workers can double speed on disk bound data: P:238
