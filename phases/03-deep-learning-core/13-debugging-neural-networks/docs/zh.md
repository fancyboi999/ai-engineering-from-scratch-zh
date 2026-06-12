# 调试神经网络

> 你的网络编译通过了。它跑起来了。它产出了一个数字。这个数字是错的，可什么都没崩。欢迎来到最难的那种调试——没有任何错误信息的那种。

**类型：** Build
**语言：** Python、PyTorch
**前置要求：** 阶段 03 第 01-10 课（尤其是反向传播、损失函数、优化器）
**预计时间：** ~90 分钟

## 学习目标

- 用系统性的调试策略诊断常见的神经网络故障（NaN 损失、损失曲线平掉、过拟合、振荡）
- 用"在一个批次上过拟合"的技术来验证你的模型架构和训练循环是对的
- 检查梯度幅度、激活分布和权重范数，识别梯度消失/爆炸问题
- 构建一份覆盖数据流水线、模型架构、损失函数、优化器和学习率问题的调试清单

## 问题背景

传统软件坏了就会崩。空指针抛异常。类型不匹配在编译期失败。差一错误产出明显错误的输出。

神经网络不给你这份奢侈。

一个坏掉的神经网络会跑到结束、打印一个损失值、输出预测。损失可能在下降。预测可能看起来像那么回事。但模型在悄无声息地错着——学到了捷径、记住了噪声，或者收敛到一个没用的局部极小值。Google 的研究人员估计，机器学习调试时间的 60-70% 花在那些不报错却拉低模型质量的"静默"bug 上。

一个能用的模型和一个坏掉的模型之间的区别，往往就是放错地方的一行：一个漏掉的 `zero_grad()`、一个转置反了的维度、一个差了 10 倍的学习率。经典的《Recipe for Training Neural Networks》（2019）开篇就这么说：「最常见的神经网络错误是那些不崩溃的 bug。」

这一课教你找到那些 bug。

## 核心概念

### 调试心态

忘掉那种打印加祈祷的调试。神经网络调试需要系统性的方法，因为反馈循环很慢（每次训练几分钟到几小时），而且症状很模糊（坏的损失可能意味着 20 件不同的事）。

黄金法则：**从简单开始，一次加一块复杂度，并独立验证每一块。**

```mermaid
flowchart TD
    A["损失不下降"] --> B{"检查学习率"}
    B -->|"太高"| C["损失振荡或爆炸"]
    B -->|"太低"| D["损失几乎不动"]
    B -->|"合理"| E{"检查梯度"}
    E -->|"全为零"| F["死亡 ReLU 或梯度消失"]
    E -->|"NaN/Inf"| G["梯度爆炸"]
    E -->|"正常"| H{"检查数据流水线"}
    H -->|"标签被打乱"| I["准确率停在随机水平"]
    H -->|"预处理 bug"| J["模型在学噪声"]
    H -->|"数据没问题"| K{"检查架构"}
    K -->|"太小"| L["欠拟合"]
    K -->|"太深"| M["优化困难"]
```

### 症状 1：损失不下降

这是最常见的抱怨。训练循环在跑，一个个 epoch 过去，损失保持平直或者剧烈振荡。

**学习率错了。** 太高：损失振荡或跳成 NaN。太低：损失降得太慢，看起来像平的。Adam 从 1e-3 起步。SGD 从 1e-1 或 1e-2 起步。在断定别的地方出错之前，永远先试三个相差 10 倍的学习率（如 1e-2、1e-3、1e-4）。

**死亡 ReLU。** 如果一个 ReLU 神经元收到很大的负输入，它输出 0、梯度为 0，再也不会激活。如果死掉的神经元够多，网络就学不动了。检查：在每个 ReLU 层之后打印恰好为 0 的激活的比例。如果超过 50% 死了，换成 LeakyReLU 或者降低学习率。

**梯度消失。** 在用 sigmoid 或 tanh 激活的深层网络里，梯度反向传播时指数级缩小。等它们到达第一层时，已经约等于 0。第一批层停止学习。修法：用 ReLU/GELU、加残差连接、或者用批归一化。

**梯度爆炸。** 相反的问题——梯度指数级增长。RNN 和非常深的网络里常见。损失跳成 NaN。修法：梯度裁剪（`torch.nn.utils.clip_grad_norm_`）、降低学习率，或者加归一化。

### 症状 2：损失在降但模型很烂

损失在往下走。训练准确率到了 99%。但测试准确率 55%。或者模型在真实数据上产出莫名其妙的输出。

**过拟合。** 模型记住了训练数据而不是学到规律。训练损失和验证损失的差距随时间拉大。修法：更多数据、dropout、权重衰减、早停、数据增强。

**数据泄漏。** 测试数据泄进了训练。准确率高得可疑。常见原因：在切分之前打乱、用整个数据集的统计量做预处理、各切分之间有重复样本。修法：先切分，后预处理，检查重复。

**标签错误。** 大多数真实数据集里 5-10% 的标签是错的（Northcutt 等人，2021——《Pervasive Label Errors in Test Sets》）。模型学到了噪声。修法：用置信学习（confident learning）找出并修正打错标的样本，或者用损失截断忽略高损失样本。

### 症状 3：损失里出现 NaN 或 Inf

损失值变成 `nan` 或 `inf`。训练死了。

**学习率太高。** 梯度更新过冲太远，权重爆炸。修法：降 10 倍。

**log(0) 或 log(负数)。** 交叉熵损失算 `log(p)`。如果你的模型输出恰好 0 或一个负概率，log 就炸了。修法：把预测钳到 `[eps, 1-eps]`，其中 `eps=1e-7`。

**除以零。** 批归一化除以标准差。一个全是常量的批次 std=0。修法：在分母上加 epsilon（PyTorch 默认这么做，但自定义实现可能没有）。

**数值溢出。** 很大的激活喂进 `exp()` 会产出 Inf。Softmax 尤其容易。修法：在求指数前减去最大值（log-sum-exp 技巧）。

### 技术 1：梯度检查

把你的解析梯度（来自反向传播）和数值梯度（来自有限差分）做对比。如果它们对不上，你的反向传播有 bug。

参数 `w` 的数值梯度：

```
grad_numerical = (loss(w + eps) - loss(w - eps)) / (2 * eps)
```

一致性度量（相对差异）：

```
rel_diff = |grad_analytical - grad_numerical| / max(|grad_analytical|, |grad_numerical|, 1e-8)
```

如果 `rel_diff < 1e-5`：正确。如果 `rel_diff > 1e-3`：几乎肯定有 bug。

```mermaid
flowchart LR
    A["参数 w"] --> B["w + eps"]
    A --> C["w - eps"]
    B --> D["前向传播"]
    C --> E["前向传播"]
    D --> F["loss+"]
    E --> G["loss-"]
    F --> H["(loss+ - loss-) / 2eps"]
    G --> H
    H --> I["与反向传播梯度对比"]
```

### 技术 2：激活统计量

训练时监控每一层之后激活的均值和标准差。健康的网络维持着均值接近 0、标准差接近 1（归一化之后）或者至少有界的激活。

| 健康指标 | 均值 | 标准差 | 诊断 |
|-----------------|------|-----|-----------|
| 健康 | ~0 | ~1 | 网络在正常学习 |
| 饱和 | >>0 或 <<0 | ~0 | 激活卡在极端值上 |
| 死亡 | 0 | 0 | 神经元死了（全是零） |
| 爆炸 | >>10 | >>10 | 激活无界增长 |

### 技术 3：梯度流可视化

把每一层的平均梯度幅度画出来。在健康的网络里，各层的梯度幅度应该大致接近。如果靠前的层梯度比靠后的层小 1000 倍，你就有梯度消失问题。

```mermaid
graph LR
    subgraph "健康的梯度流"
        L1["第 1 层<br/>grad: 0.05"] --- L2["第 2 层<br/>grad: 0.04"] --- L3["第 3 层<br/>grad: 0.06"] --- L4["第 4 层<br/>grad: 0.05"]
    end
```

```mermaid
graph LR
    subgraph "梯度消失的梯度流"
        V1["第 1 层<br/>grad: 0.0001"] --- V2["第 2 层<br/>grad: 0.003"] --- V3["第 3 层<br/>grad: 0.02"] --- V4["第 4 层<br/>grad: 0.08"]
    end
```

### 技术 4：过拟合一个批次测试

深度学习里最重要的单项调试技术。

拿一个小批次（8-32 个样本）。在它上面训练 100 次以上。损失应该降到接近零，训练准确率应该到 100%。如果做不到，你的模型或训练循环有根本性的 bug——别急着进行完整训练。

这个测试能抓出：
- 坏掉的损失函数
- 坏掉的反向传播
- 架构太小、表示不了数据
- 优化器没接到模型参数上
- 数据和标签没对齐

它跑起来 30 秒，省下你调试完整训练几小时的时间。

### 技术 5：学习率查找器

Leslie Smith（2017）提出在一个 epoch 里把学习率从极小（1e-7）扫到极大（10），同时记录损失。画损失对学习率的图。最优学习率大约比损失下降最快那个点小 10 倍。

```mermaid
graph TD
    subgraph "学习率查找器图"
        direction LR
        A["1e-7: loss=2.3"] --> B["1e-5: loss=2.3"]
        B --> C["1e-3: loss=1.8"]
        C --> D["1e-2: loss=0.9 -- 最陡"]
        D --> E["1e-1: loss=0.5"]
        E --> F["1.0: loss=NaN -- 太高"]
    end
```

这个例子里最佳 LR：约 1e-3（在最陡那个点之前一个数量级）。

### 常见的 PyTorch bug

这些是在 PyTorch 社区里浪费掉最多集体工时的 bug：

| Bug | 症状 | 修法 |
|-----|---------|-----|
| 忘了 `optimizer.zero_grad()` | 梯度跨批次累积，损失振荡 | 在 `loss.backward()` 之前加 `optimizer.zero_grad()` |
| 测试时忘了 `model.eval()` | dropout 和批归一化行为不同，测试准确率每次运行都变 | 加 `model.eval()` 和 `torch.no_grad()` |
| 张量形状错误 | 静默广播产出错误结果，不报错 | 调试时在每个操作之后打印形状 |
| CPU/GPU 不匹配 | `RuntimeError: expected CUDA tensor` | 对模型**和**数据都用 `.to(device)` |
| 没有 detach 张量 | 计算图无限增长，OOM | 用 `.detach()` 或 `with torch.no_grad()` |
| 原地操作破坏 autograd | `RuntimeError: modified by in-place operation` | 把 `x += 1` 换成 `x = x + 1` |
| 数据没归一化 | 损失卡在随机水平 | 把输入归一化到 mean=0、std=1 |
| 标签 dtype 错误 | 交叉熵期望 `Long`，拿到 `Float` | 转换标签：`labels.long()` |

### 调试总表

| 症状 | 可能原因 | 第一个该试的 |
|---------|-------------|-------------------|
| 损失卡在 -log(1/num_classes) | 模型预测均匀分布 | 检查数据流水线，确认标签和输入对得上 |
| 几步之后损失 NaN | 学习率太高 | 把 LR 降 10 倍 |
| 立刻就 NaN | log(0) 或除以零 | 给 log/除法操作加 epsilon |
| 损失剧烈振荡 | LR 太高或批太小 | 降 LR，增大批大小 |
| 损失先降后停滞 | 微调阶段 LR 太高 | 加 LR 调度（余弦或阶梯衰减） |
| 训练准确率高、测试准确率低 | 过拟合 | 加 dropout、权重衰减、更多数据 |
| 训练准确率 = 测试准确率 = 随机水平 | 模型什么都没学到 | 跑过拟合一个批次测试 |
| 训练准确率 = 测试准确率但都低 | 欠拟合 | 更大的模型、更多层、更多特征 |
| 梯度全是零 | 死亡 ReLU 或计算图被 detach 了 | 换成 LeakyReLU，检查 `.requires_grad` |
| 训练时内存溢出 | 批太大或图没释放 | 减小批大小，评估时用 `torch.no_grad()` |

```figure
learning-curves
```

## 动手构建

一个监控激活、梯度和损失曲线的诊断工具箱。你会故意把一个网络弄坏，再用这个工具箱诊断每个问题。

### 第 1 步：NetworkDebugger 类

挂钩到一个 PyTorch 模型上，按层记录激活和梯度的统计量。

```python
import torch
import torch.nn as nn
import math


class NetworkDebugger:
    def __init__(self, model):
        self.model = model
        self.activation_stats = {}
        self.gradient_stats = {}
        self.loss_history = []
        self.lr_losses = []
        self.hooks = []
        self._register_hooks()

    def _register_hooks(self):
        for name, module in self.model.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d, nn.ReLU, nn.LeakyReLU)):
                hook = module.register_forward_hook(self._make_activation_hook(name))
                self.hooks.append(hook)
                hook = module.register_full_backward_hook(self._make_gradient_hook(name))
                self.hooks.append(hook)

    def _make_activation_hook(self, name):
        def hook(module, input, output):
            with torch.no_grad():
                out = output.detach().float()
                self.activation_stats[name] = {
                    "mean": out.mean().item(),
                    "std": out.std().item(),
                    "fraction_zero": (out == 0).float().mean().item(),
                    "min": out.min().item(),
                    "max": out.max().item(),
                }
        return hook

    def _make_gradient_hook(self, name):
        def hook(module, grad_input, grad_output):
            if grad_output[0] is not None:
                with torch.no_grad():
                    grad = grad_output[0].detach().float()
                    self.gradient_stats[name] = {
                        "mean": grad.mean().item(),
                        "std": grad.std().item(),
                        "abs_mean": grad.abs().mean().item(),
                        "max": grad.abs().max().item(),
                    }
        return hook

    def record_loss(self, loss_value):
        self.loss_history.append(loss_value)

    def check_loss_health(self):
        if len(self.loss_history) < 2:
            return "NOT_ENOUGH_DATA"
        recent = self.loss_history[-10:]
        if any(math.isnan(v) or math.isinf(v) for v in recent):
            return "NAN_OR_INF"
        if len(self.loss_history) >= 20:
            first_half = sum(self.loss_history[:10]) / 10
            second_half = sum(self.loss_history[-10:]) / 10
            if second_half >= first_half * 0.99:
                return "NOT_DECREASING"
        if len(recent) >= 5:
            diffs = [recent[i+1] - recent[i] for i in range(len(recent)-1)]
            if max(diffs) - min(diffs) > 2 * abs(sum(diffs) / len(diffs)):
                return "OSCILLATING"
        return "HEALTHY"

    def check_activations(self):
        issues = []
        for name, stats in self.activation_stats.items():
            if stats["fraction_zero"] > 0.5:
                issues.append(f"DEAD_NEURONS: {name} has {stats['fraction_zero']:.0%} zero activations")
            if abs(stats["mean"]) > 10:
                issues.append(f"EXPLODING_ACTIVATIONS: {name} mean={stats['mean']:.2f}")
            if stats["std"] < 1e-6:
                issues.append(f"COLLAPSED_ACTIVATIONS: {name} std={stats['std']:.2e}")
        return issues if issues else ["HEALTHY"]

    def check_gradients(self):
        issues = []
        grad_magnitudes = []
        for name, stats in self.gradient_stats.items():
            grad_magnitudes.append((name, stats["abs_mean"]))
            if stats["abs_mean"] < 1e-7:
                issues.append(f"VANISHING_GRADIENT: {name} abs_mean={stats['abs_mean']:.2e}")
            if stats["abs_mean"] > 100:
                issues.append(f"EXPLODING_GRADIENT: {name} abs_mean={stats['abs_mean']:.2e}")
        if len(grad_magnitudes) >= 2:
            first_mag = grad_magnitudes[0][1]
            last_mag = grad_magnitudes[-1][1]
            if last_mag > 0 and first_mag / last_mag > 100:
                issues.append(f"GRADIENT_RATIO: first/last = {first_mag/last_mag:.0f}x (vanishing)")
        return issues if issues else ["HEALTHY"]

    def print_report(self):
        print("\n=== NETWORK DEBUGGER REPORT ===")
        print(f"\nLoss health: {self.check_loss_health()}")
        if self.loss_history:
            print(f"  Last 5 losses: {[f'{v:.4f}' for v in self.loss_history[-5:]]}")
        print("\nActivation diagnostics:")
        for item in self.check_activations():
            print(f"  {item}")
        print("\nGradient diagnostics:")
        for item in self.check_gradients():
            print(f"  {item}")
        print("\nPer-layer activation stats:")
        for name, stats in self.activation_stats.items():
            print(f"  {name}: mean={stats['mean']:.4f} std={stats['std']:.4f} zero={stats['fraction_zero']:.1%}")
        print("\nPer-layer gradient stats:")
        for name, stats in self.gradient_stats.items():
            print(f"  {name}: abs_mean={stats['abs_mean']:.2e} max={stats['max']:.2e}")

    def remove_hooks(self):
        for hook in self.hooks:
            hook.remove()
        self.hooks.clear()
```

### 第 2 步：过拟合一个批次测试

```python
def overfit_one_batch(model, x_batch, y_batch, criterion, lr=0.01, steps=200):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    model.train()
    print("\n=== OVERFIT ONE BATCH TEST ===")
    print(f"Batch size: {x_batch.shape[0]}, Steps: {steps}")

    for step in range(steps):
        optimizer.zero_grad()
        output = model(x_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()

        if step % 50 == 0 or step == steps - 1:
            with torch.no_grad():
                preds = (output > 0).float() if output.shape[-1] == 1 else output.argmax(dim=1)
                targets = y_batch if y_batch.dim() == 1 else y_batch.squeeze()
                acc = (preds.squeeze() == targets).float().mean().item()
            print(f"  Step {step:3d} | Loss: {loss.item():.6f} | Accuracy: {acc:.1%}")

    final_loss = loss.item()
    if final_loss > 0.1:
        print(f"\n  FAIL: Loss did not converge ({final_loss:.4f}). Model or training loop is broken.")
        return False
    print(f"\n  PASS: Loss converged to {final_loss:.6f}")
    return True
```

### 第 3 步：学习率查找器

```python
def find_learning_rate(model, x_data, y_data, criterion, start_lr=1e-7, end_lr=10, steps=100):
    import copy
    original_state = copy.deepcopy(model.state_dict())
    optimizer = torch.optim.SGD(model.parameters(), lr=start_lr)
    lr_mult = (end_lr / start_lr) ** (1 / steps)

    model.train()
    results = []
    best_loss = float("inf")
    current_lr = start_lr

    print("\n=== LEARNING RATE FINDER ===")

    for step in range(steps):
        optimizer.zero_grad()
        output = model(x_data)
        loss = criterion(output, y_data)

        if math.isnan(loss.item()) or loss.item() > best_loss * 10:
            break

        best_loss = min(best_loss, loss.item())
        results.append((current_lr, loss.item()))

        loss.backward()
        optimizer.step()

        current_lr *= lr_mult
        for param_group in optimizer.param_groups:
            param_group["lr"] = current_lr

    model.load_state_dict(original_state)

    if len(results) < 10:
        print("  Could not complete LR sweep -- loss diverged too quickly")
        return results

    min_loss_idx = min(range(len(results)), key=lambda i: results[i][1])
    suggested_lr = results[max(0, min_loss_idx - 10)][0]

    print(f"  Swept {len(results)} steps from {start_lr:.0e} to {results[-1][0]:.0e}")
    print(f"  Minimum loss {results[min_loss_idx][1]:.4f} at lr={results[min_loss_idx][0]:.2e}")
    print(f"  Suggested learning rate: {suggested_lr:.2e}")

    return results
```

### 第 4 步：梯度检查器

```python
def _flat_to_multi_index(flat_idx, shape):
    multi_idx = []
    remaining = flat_idx
    for dim in reversed(shape):
        multi_idx.insert(0, remaining % dim)
        remaining //= dim
    return tuple(multi_idx)


def gradient_check(model, x, y, criterion, eps=1e-4):
    model.train()
    x_double = x.double()
    y_double = y.double()
    model_double = model.double()

    print("\n=== GRADIENT CHECK ===")
    overall_max_diff = 0
    checked = 0

    for name, param in model_double.named_parameters():
        if not param.requires_grad:
            continue

        layer_max_diff = 0

        model_double.zero_grad()
        output = model_double(x_double)
        loss = criterion(output, y_double)
        loss.backward()
        analytical_grad = param.grad.clone()

        num_checks = min(5, param.numel())
        for i in range(num_checks):
            idx = _flat_to_multi_index(i, param.shape)
            original = param.data[idx].item()

            param.data[idx] = original + eps
            with torch.no_grad():
                loss_plus = criterion(model_double(x_double), y_double).item()

            param.data[idx] = original - eps
            with torch.no_grad():
                loss_minus = criterion(model_double(x_double), y_double).item()

            param.data[idx] = original

            numerical = (loss_plus - loss_minus) / (2 * eps)
            analytical = analytical_grad[idx].item()

            denom = max(abs(numerical), abs(analytical), 1e-8)
            rel_diff = abs(numerical - analytical) / denom

            layer_max_diff = max(layer_max_diff, rel_diff)
            checked += 1

        overall_max_diff = max(overall_max_diff, layer_max_diff)
        status = "OK" if layer_max_diff < 1e-5 else "MISMATCH"
        print(f"  {name}: max_rel_diff={layer_max_diff:.2e} [{status}]")

    model.float()

    print(f"\n  Checked {checked} parameters")
    if overall_max_diff < 1e-5:
        print("  PASS: Gradients match (rel_diff < 1e-5)")
    elif overall_max_diff < 1e-3:
        print("  WARN: Small differences (1e-5 < rel_diff < 1e-3)")
    else:
        print("  FAIL: Gradient mismatch detected (rel_diff > 1e-3)")
    return overall_max_diff
```

### 第 5 步：故意弄坏的网络

现在把工具箱应用到坏掉的网络上，逐个诊断。

```python
def demo_broken_networks():
    torch.manual_seed(42)
    x = torch.randn(64, 10)
    y = (x[:, 0] > 0).long()

    print("\n" + "=" * 60)
    print("BUG 1: Learning rate too high (lr=10)")
    print("=" * 60)
    model1 = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger1 = NetworkDebugger(model1)
    optimizer1 = torch.optim.SGD(model1.parameters(), lr=10.0)
    criterion = nn.CrossEntropyLoss()
    for step in range(20):
        optimizer1.zero_grad()
        out = model1(x)
        loss = criterion(out, y)
        debugger1.record_loss(loss.item())
        loss.backward()
        optimizer1.step()
    debugger1.print_report()
    debugger1.remove_hooks()

    print("\n" + "=" * 60)
    print("BUG 2: Dead ReLUs from bad initialization")
    print("=" * 60)
    model2 = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 32), nn.ReLU(), nn.Linear(32, 2))
    with torch.no_grad():
        for m in model2.modules():
            if isinstance(m, nn.Linear):
                m.weight.fill_(-1.0)
                m.bias.fill_(-5.0)
    debugger2 = NetworkDebugger(model2)
    optimizer2 = torch.optim.Adam(model2.parameters(), lr=1e-3)
    for step in range(50):
        optimizer2.zero_grad()
        out = model2(x)
        loss = criterion(out, y)
        debugger2.record_loss(loss.item())
        loss.backward()
        optimizer2.step()
    debugger2.print_report()
    debugger2.remove_hooks()

    print("\n" + "=" * 60)
    print("BUG 3: Missing zero_grad (gradients accumulate)")
    print("=" * 60)
    model3 = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger3 = NetworkDebugger(model3)
    optimizer3 = torch.optim.SGD(model3.parameters(), lr=0.01)
    for step in range(50):
        out = model3(x)
        loss = criterion(out, y)
        debugger3.record_loss(loss.item())
        loss.backward()
        optimizer3.step()
    debugger3.print_report()
    debugger3.remove_hooks()

    print("\n" + "=" * 60)
    print("HEALTHY NETWORK: Correct setup for comparison")
    print("=" * 60)
    model_good = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger_good = NetworkDebugger(model_good)
    optimizer_good = torch.optim.Adam(model_good.parameters(), lr=1e-3)
    for step in range(50):
        optimizer_good.zero_grad()
        out = model_good(x)
        loss = criterion(out, y)
        debugger_good.record_loss(loss.item())
        loss.backward()
        optimizer_good.step()
    debugger_good.print_report()
    debugger_good.remove_hooks()

    print("\n" + "=" * 60)
    print("OVERFIT-ONE-BATCH TEST (healthy model)")
    print("=" * 60)
    model_test = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    overfit_one_batch(model_test, x[:8], y[:8], criterion)

    print("\n" + "=" * 60)
    print("LEARNING RATE FINDER")
    print("=" * 60)
    model_lr = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    find_learning_rate(model_lr, x, y, criterion)

    print("\n" + "=" * 60)
    print("GRADIENT CHECK")
    print("=" * 60)
    model_grad = nn.Sequential(nn.Linear(10, 8), nn.ReLU(), nn.Linear(8, 2))
    gradient_check(model_grad, x[:4], y[:4], criterion)
```

## 实际使用

### PyTorch 内置工具

```python
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(768, 256),
    nn.ReLU(),
    nn.Linear(256, 10),
)

with torch.autograd.detect_anomaly():
    output = model(input_tensor)
    loss = criterion(output, target)
    loss.backward()

for name, param in model.named_parameters():
    if param.grad is not None:
        print(f"{name}: grad_mean={param.grad.abs().mean():.2e}")
```

### Weights & Biases 集成

```python
import wandb

wandb.init(project="debug-training")

for epoch in range(100):
    loss = train_one_epoch()
    wandb.log({
        "loss": loss,
        "lr": optimizer.param_groups[0]["lr"],
        "grad_norm": torch.nn.utils.clip_grad_norm_(model.parameters(), float("inf")),
    })

    for name, param in model.named_parameters():
        if param.grad is not None:
            wandb.log({f"grad/{name}": wandb.Histogram(param.grad.cpu().numpy())})
```

### TensorBoard

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter("runs/debug_experiment")

for epoch in range(100):
    loss = train_one_epoch()
    writer.add_scalar("Loss/train", loss, epoch)

    for name, param in model.named_parameters():
        writer.add_histogram(f"weights/{name}", param, epoch)
        if param.grad is not None:
            writer.add_histogram(f"gradients/{name}", param.grad, epoch)
```

### 调试清单（完整训练之前）

1. 跑过拟合一个批次测试。如果失败，停。
2. 打印模型摘要——确认参数量合理。
3. 用随机数据跑一次前向传播——检查输出形状。
4. 训练 5 个 epoch——确认损失在降。
5. 检查激活统计量——没有死掉的层、没有爆炸。
6. 检查梯度流——没有消失、没有爆炸。
7. 验证数据流水线——打印 5 个带标签的随机样本。

## 拿去用

本课产出：
- `outputs/prompt-nn-debugger.md` —— 一个诊断神经网络训练故障的提示词
- `outputs/skill-debug-checklist.md` —— 一份用决策树调试训练问题的清单

调试的关键部署模式：
- 给生产训练脚本加监控钩子
- 每 N 步把激活和梯度统计量记到 W&B 或 TensorBoard
- 为 NaN 损失、死亡神经元（>80% 为零）或梯度爆炸实现自动告警
- 换架构或数据流水线时永远跑一遍过拟合一个批次测试

## 练习

1. **加一个梯度爆炸探测器。** 修改 `NetworkDebugger`，让它在梯度超过阈值时检测出来并自动建议一个梯度裁剪值。在一个不带归一化的 20 层网络上测试它。

2. **造一个死亡神经元复活器。** 写一个函数，识别死掉的 ReLU 神经元（总是输出 0）并用 Kaiming 初始化重新初始化它们的入边权重。展示这能让一个 70% 以上神经元死掉的网络恢复。

3. **实现带绘图的学习率查找器。** 扩展 `find_learning_rate`，把结果存成 CSV，再写一个单独的脚本读取 CSV、用 matplotlib 显示 LR 对损失的曲线。为 CIFAR-10 上的 ResNet-18 找出最优 LR。

4. **创建一个数据流水线校验器。** 写一个函数，检查：训练/测试切分之间的重复样本、标签分布不平衡（>10:1 的比例）、输入归一化（均值接近 0、标准差接近 1）、数据里的 NaN/Inf 值。在一个故意弄坏的数据集上跑它。

5. **调试一个真实故障。** 拿第 10 课的迷你框架，引入一个微妙的 bug（比如把反向传播里的权重矩阵转置），用梯度检查精确定位是哪个参数梯度不对。记录调试过程。

## 关键术语

| 术语 | 大家怎么说 | 实际是什么 |
|------|----------------|----------------------|
| 静默 bug（Silent bug） | "它能跑但结果很烂" | 一个不报错却拉低模型质量的 bug——机器学习里的主导失败模式 |
| 死亡 ReLU（Dead ReLU） | "神经元死了" | 一个输入总是负的 ReLU 神经元，所以它永久地输出 0、收到 0 梯度 |
| 梯度消失（Vanishing gradients） | "靠前的层不学了" | 梯度穿过层时指数级缩小，让靠前的层的权重实际上被冻住 |
| 梯度爆炸（Exploding gradients） | "损失变成 NaN 了" | 梯度穿过层时指数级增长，导致权重更新大到溢出 |
| 梯度检查（Gradient checking） | "验证反向传播对不对" | 把反向传播的解析梯度和有限差分的数值梯度做对比 |
| 过拟合一个批次（Overfit-one-batch） | "最重要的调试测试" | 在单个小批次上训练，验证模型*能*学——如果它学不了，就有根本性的问题 |
| LR 查找器（LR finder） | "扫一遍找对的学习率" | 在一个 epoch 里指数级增大学习率，挑损失发散之前的那个值 |
| 数据泄漏（Data leakage） | "测试数据泄进了训练" | 测试集的信息污染了训练，产出人为偏高的准确率 |
| 激活统计量（Activation statistics） | "监控层的健康" | 追踪每层输出的均值、标准差和零占比，检测死亡、饱和或爆炸的神经元 |
| 梯度裁剪（Gradient clipping） | "给梯度幅度封顶" | 当梯度范数超过阈值时把它缩小，防止梯度爆炸式的更新 |

## 延伸阅读

- Smith，《Cyclical Learning Rates for Training Neural Networks》（2017）—— 引入学习率范围测试（LR 查找器）的论文
- Northcutt 等人，《Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks》（2021）—— 证明 ImageNet、CIFAR-10 及其他主流基准里 3-6% 的标签是错的
- Zhang 等人，《Understanding Deep Learning Requires Rethinking Generalization》（2017）—— 证明神经网络能记住随机标签的论文，这也是过拟合一个批次测试为什么管用的原因
- PyTorch 关于 `torch.autograd.detect_anomaly` 和 `torch.autograd.set_detect_anomaly` 的文档，用于内置的 NaN/Inf 检测
