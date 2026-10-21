---
id: nn-debugging
title: 神经网络训练调试
code: DN
subtitle: 根据现象发现隐蔽训练错误。检查、阈值、初始化规则、裁剪与 AMP 顺序、性能分析工具。
hue: 12
sources: phases/03-deep-learning-core/08-weight-initialization, phases/03-deep-learning-core/13-debugging-neural-networks, phases/00-setup-and-tooling/12-debugging-and-profiling, phases/19-capstone-projects/45-gradient-clipping-amp
source_hash: e8af0bdb8d355e2f
---

## 现象、原因与首选修正
type: troubleshooting
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失停在 -log(1/num_classes) | 模型预测均匀分布 | 检查数据流水线与标签 |
| 几步后损失变 NaN | 学习率太高 | 将 LR 降低 10x |
| 损失立即变 NaN | log(0) 或除零 | 在对数与除法中加入 epsilon |
| 损失剧烈震荡 | LR 太高或批次太小 | 降低 LR、增大批次 |
| 损失先下降再停滞 | 微调阶段 LR 太高 | 加入余弦或阶梯衰减调度 |
| 训练准确率高，测试准确率低 | 过拟合 | 加入 dropout、权重衰减、更多数据 |
| 训练准确率 = 测试准确率 = 随机水平 | 模型什么都没学到 | 运行单批次过拟合测试 |
| 梯度全为零 | ReLU 死亡或计算图已分离 | 改用 LeakyReLU，检查 `.requires_grad` |

## 常见 PyTorch 错误
type: troubleshooting
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失震荡，梯度累积 | 未调用 `optimizer.zero_grad()` | 在 `loss.backward()` 前调用 |
| 各次运行测试准确率不同 | 测试时未用 `model.eval()` | 加入 `model.eval()` 与 `torch.no_grad()` |
| 结果错误但不报错 | 形状被静默广播 | 每次操作后打印形状 |
| `RuntimeError: expected CUDA tensor` | CPU 与 GPU 不匹配 | 模型和数据都调用 `.to(device)` |
| 计算图不断增长，内存不足 | 张量未分离 | 使用 `.detach()` 或 `with torch.no_grad()` |
| `RuntimeError: modified by in-place operation` | 原地操作破坏自动微分 | 将 `x += 1` 改为 `x = x + 1` |
| 损失停在随机水平 | 输入未归一化 | 将输入归一化为 mean=0、std=1 |
| 交叉熵要求 `Long`，却收到 `Float` | 标签 dtype 错误 | 转换标签：`labels.long()` |

## 损失不下降：按此顺序检查
type: flow
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

1. **学习率**：太高会使损失震荡或爆炸。太低则损失几乎不变。
2. **学习率**：尝试相差 10x 的 3 个值，如 1e-2、1e-3、1e-4。
3. **梯度**：全零意味着 ReLU 死亡或梯度消失。
4. **梯度**：NaN 或 Inf 意味着梯度爆炸。
5. **数据流水线**：打乱标签会得到随机水平的准确率。
6. **数据流水线**：预处理错误会使模型学习噪声。
7. **架构**：太小会欠拟合，太深则难以优化。

## 诊断函数
type: task-table
from: phases/00-setup-and-tooling/12-debugging-and-profiling/code/debug_tools.py, phases/03-deep-learning-core/13-debugging-neural-networks/code/debug_neural_nets.py

| 任务 | 代码 |
|---|---|
| 张量的形状、dtype、设备与 NaN | `debug_print(name, tensor)` |
| 映射各层形状 | `check_shapes(model, sample_input)` |
| 查找 NaN 或 Inf 梯度 | `detect_nan(model, loss, step)` |
| 查找其他设备上的张量 | `check_devices(model, *tensors)` |
| 总范数、大梯度或零梯度 | `check_gradient_health(model)` |
| 证明训练循环能学习 | `overfit_one_batch(model, x_batch, y_batch, criterion)` |
| 扫描学习率 | `find_learning_rate(model, x_data, y_data, criterion)` |
| 比较反向传播与有限差分 | `gradient_check(model, x, y, criterion, eps=1e-4)` |

## 为模型接入调试器
type: annotated-code
lang: python
from: phases/03-deep-learning-core/13-debugging-neural-networks/code/debug_neural_nets.py, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

```python
debugger1 = NetworkDebugger(model1)        # 挂接 Linear、Conv2d、ReLU、LeakyReLU
debugger1.record_loss(loss.item())          # 每步调用一次
debugger1.print_report()                    # 检查损失、激活和梯度
debugger1.remove_hooks()
with torch.autograd.detect_anomaly():       # 内置 NaN 与 Inf 检测
    loss.backward()
```

## 检查所用阈值
type: defaults
from: phases/03-deep-learning-core/13-debugging-neural-networks/code/debug_neural_nets.py, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/code/debug_tools.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `fraction_zero` | > 0.5 | 神经元死亡。使用 LeakyReLU 或更低 LR |
| 激活 `std` | < 1e-6 | 激活坍缩 |
| 梯度 `abs_mean` | < 1e-7 | 该层梯度消失 |
| 梯度 `abs_mean` | > 100 | 该层梯度爆炸 |
| 首层 / 末层梯度比 | > 100 | 深度方向梯度消失 |
| `rel_diff` | < 1e-5 | 梯度检查通过。> 1e-3 表示错误 |
| 过拟合 `final_loss` | > 0.1 | 失败：模型或循环有问题 |
| `start_lr` | 1e-7 | LR 查找器扫描至 `end_lr=10` |

## 按激活函数选择初始化
type: concepts
from: phases/03-deep-learning-core/08-weight-initialization/docs/zh.md, phases/03-deep-learning-core/08-weight-initialization/code/main.py

- **零初始化**：所有神经元始终相同。无论多宽，都只有一个有效神经元。
- **方差规则**：$\mathrm{Var}(z) = \text{fan}_{\text{in}} \cdot \mathrm{Var}(w) \cdot \mathrm{Var}(x)$
- **Xavier**：$\mathrm{Var}(w) = 2/(\text{fan}_{\text{in}} + \text{fan}_{\text{out}})$，用于 sigmoid 与 tanh。
- **Kaiming**：$\mathrm{Var}(w) = 2/\text{fan}_{\text{in}}$，用于 ReLU、Leaky ReLU、GELU 与 Swish。
- **残差缩放**：$N$ 层时，将残差层按 $1/\sqrt{2N}$ 缩放。
- **随机 N(0,1)**：到第 5 层爆炸。**N(0,0.01)**：到第 10 层消失。
- **检查**：所有层的激活幅度均保持在 0.5 至 2.0。
- **PyTorch**：`nn.Linear(512, 256)` 默认使用 Kaiming 均匀初始化。

## 裁剪与缩放的步骤顺序
type: architecture
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md

```arch
node | fwd | 1,1 | autocast 前向传播 | FP32 损失 | process
node | fin | 2,1 | 损失 isfinite？ | 否：跳过本步 | process
node | bwd | 3,1 | scale(loss).backward | FP16 梯度 | gpu
node | uns | 4,1 | unscale_ optimizer | 真实梯度 | process
node | nan | 4,2 | 梯度为 NaN 或 Inf？ | 是：跳过，update 减半 | process
node | clip | 3,2 | clip_grad_norm_ | max_norm 1.0 | process
node | step | 2,2 | scaler.step | 优化器步进 | process
node | upd | 1,2 | scaler.update | 翻倍或减半 | store
edge | fwd | fin |
edge | fin | bwd | 有限
edge | bwd | uns |
edge | uns | nan |
edge | nan | clip | 无异常
edge | clip | step |
edge | step | upd |
```

## 一次 AMP 训练步骤
type: annotated-code
lang: python
from: phases/19-capstone-projects/45-gradient-clipping-amp/code/main.py, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md

```python
self.optimizer.zero_grad(set_to_none=True)
with torch.amp.autocast(device_type=self.device_type, dtype=self.amp_dtype):
    loss = self._loss_fn(self.model(inputs), targets)
if not torch.isfinite(loss).all().item():   # 跳过，不调用 scaler.update()
    ...
self.scaler.scale(loss).backward()
self.scaler.unscale_(self.optimizer)        # 必须在裁剪前
if has_non_finite_grad(self.model.parameters()):
    self.scaler.update()                    # 缩放系数减半
pre_clip, post_clip = clip_global_l2_norm(list(self.model.parameters()), self.max_norm)
self.scaler.step(self.optimizer)
self.scaler.update()                        # 每步执行
scale = self.scaler.get_scale()             # 与 lr、范数一起记录
```

## 性能分析与检查
type: command-table
from: phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python -m cProfile -s cumtime train.py` | 所有函数调用，按累计时间排序 |
| `kernprof -l -v train.py` | `@profile` 函数的逐行耗时 |
| `python -m memory_profiler your_script.py` | 逐行内存使用量 |
| `tracemalloc.take_snapshot()` | `tracemalloc.start()` 后的逐行 CPU 内存 |
| `torch.cuda.memory_summary()` | GPU 已分配与缓存内存 |
| `tensorboard --logdir=runs` | 损失曲线、权重和梯度直方图 |
| `breakpoint()` | 在 pdb 暂停。`p outputs.shape`，`c` 继续，`q` 退出 |
| `python3 code/main.py` | 裁剪与 AMP 演示。至少一行为 `SKIP` |

## 需要关注的数字
type: qa
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md, phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md

- **健康的 GradScaler 缩放值如何变化？** 按二的幂增长至 `2^17` 或 `2^18` 附近。
- **何时跳步率需要告警？** 1,000 步滚动窗口内超过 5%。
- **缩放值始终不变？** 跳过路径忘记调用 `scaler.update()`。
- **数据加载耗时占 60%？** 在 DataLoader 中设置 `num_workers > 0`。
- **内存不足？** 先减小批次，再使用 `torch.cuda.empty_cache()`。
- **测试准确率 99%？** 检查数据泄漏。先拆分，再预处理。
- **训练损失下降，验证损失上升？** 模型过拟合。

## 完整训练前的检查清单
type: tips
from: phases/03-deep-learning-core/13-debugging-neural-networks/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

- 运行单批次过拟合测试。失败则停止。
- 打印模型摘要，核对参数量。
- 用随机数据执行一次前向传播，检查输出形状。
- 训练 5 个 epoch，确认损失下降。
- 检查激活统计与梯度流。
- 打印 5 个带标签的随机样本。
- 训练期间记录损失、学习率和梯度范数。
