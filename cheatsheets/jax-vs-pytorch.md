---
id: jax-vs-pytorch
title: JAX 与 PyTorch 对比
code: JP
subtitle: 即时执行的磁带式自动微分，对比经追踪和编译的纯函数。用两者实现相同的 MNIST MLP，掌握 API 与常见坑。
hue: 280
sources: phases/03-deep-learning-core/10-mini-framework, phases/03-deep-learning-core/11-intro-to-pytorch, phases/03-deep-learning-core/12-intro-to-jax
source_hash: 6155c9ed1505aefd
---

## 并排对比
type: comparison
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

| 比较项 | PyTorch | JAX |
|---|---|---|
| 自动微分 | 基于磁带的 autograd | 函数式变换 |
| 执行 | 即时执行（C++ 内核） | 追踪 + JIT 编译 |
| 模型 | `nn.Module` | 纯函数：`f(params, x) -> y` |
| TPU 支持 | 社区维护（torch_xla） | 原生重点支持 |
| GPU 支持 | 一流水平（原生 CUDA） | 良好（通过 XLA 使用 CUDA） |
| 调试 | 容易（即时、逐行） | 困难（追踪 + 编译） |
| 速度（MNIST MLP） | 约 0.5s/epoch | 约 0.3s/epoch |
| 多设备 | `FSDP` | `jax.pmap(f)` |

## 相同任务，两套 API
type: comparison
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

| 任务 | PyTorch | JAX |
|---|---|---|
| 获取梯度 | `loss.backward()` | `jax.grad(loss_fn)(params, x, y)` |
| 清空梯度 | `optimizer.zero_grad()` | 不需要。梯度是返回值 |
| 更新参数 | `optimizer.step()` | `optax.apply_updates(params, updates)` |
| Adam | `torch.optim.Adam(model.parameters(), lr=1e-3)` | `optax.adam(learning_rate=1e-3)` |
| 批量处理样本 | `for x in batch:` | `jax.vmap(f)` |
| 保存参数结构 | `model.parameters()` | 不可变数组 pytree |
| 设置随机种子 | `torch.manual_seed` | `jax.random.PRNGKey(42)` |
| 保存权重 | `torch.save(model.state_dict(), "model.pt")` | `checkpointer.save('/tmp/model', params)` |

## 两种执行模型
type: architecture
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

```arch
node | call | 1,1 | model(x) | 即时执行 | process
node | tape | 2,1 | 磁带 | 记录每个操作 | store
node | bwd | 3,1 | loss.backward() | 反向重放磁带
node | step | 4,1 | optimizer.step() | 原地修改参数
node | fn | 1,2 | 纯函数 | f(params, x) -> y
node | grad | 2,2 | jax.grad | 返回梯度函数
node | jit | 3,2 | jax.jit | 首次调用时追踪
node | xla | 4,2 | XLA | 融合的机器码 | gpu
edge | call | tape | 操作
edge | tape | bwd |
edge | bwd | step | .grad
edge | fn | grad |
edge | grad | jit |
edge | jit | xla | 追踪
```

## 一个 JAX 训练步骤
type: flow
from: phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/code/jax_intro.py

1. **init_params**：`random.split(key, 3)` 产生三个 key。He 缩放为 `jnp.sqrt(2.0 / 784)`。
2. **optimizer.init**：`opt_state = optimizer.init(params)` 保存 Adam 状态。
3. **jax.value_and_grad**：一次计算返回损失与梯度。
4. **optimizer.update**：将梯度转换为更新量和新的 `opt_state`。
5. **optax.apply_updates**：返回新参数，不做原地修改。
6. **首次调用**：JAX 追踪 `train_step` 并编译为 XLA。首个 epoch 较慢。
7. **后续调用**：跳过 Python。第 2-10 个 epoch 较快。10 个 epoch 的测试准确率约为 97%。

## PyTorch：MNIST MLP 循环
type: annotated-code
lang: python
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/11-intro-to-pytorch/code/pytorch_intro.py

```python
model = MNISTModel().to(device)                  # 784, 256, 128, 10
criterion = nn.CrossEntropyLoss()                # 接收原始 logits
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
for epoch in range(10):
    model.train()                                # 开启 dropout
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()                    # 梯度会累积
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()                          # 重放磁带
        optimizer.step()
torch.save(model.state_dict(), "mnist_mlp.pt")   # 测试准确率约 97.8%
```

## JAX：MNIST MLP 循环
type: annotated-code
lang: python
from: phases/03-deep-learning-core/12-intro-to-jax/code/jax_intro.py, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

```python
optimizer = optax.adam(learning_rate=1e-3)
@jax.jit                                           # 编译为 XLA
def train_step(params, opt_state, x, y):
    loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
    updates, opt_state = optimizer.update(grads, opt_state, params)
    params = optax.apply_updates(params, updates)
    return params, opt_state, loss                 # 输出新状态
key = random.PRNGKey(0)
params = init_params(key)                          # 嵌套字典 pytree
opt_state = optimizer.init(params)
for epoch in range(n_epochs):
    key, subkey = random.split(key)                # 每个 epoch 使用新 key
    perm = random.permutation(subkey, len(X_train))
    params, opt_state, loss = train_step(params, opt_state, xb, yb)  # batch_size 为 128
```

## JAX 变换
type: task-table
span: 2
from: phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

| 任务 | 代码 |
|---|---|
| 对函数求导 | `jax.grad(f)` |
| 求二阶导数 | `jax.grad(jax.grad(f))` |
| 批量化单样本函数 | `jax.vmap(predict, in_axes=(None, 0))` |
| 逐样本梯度 | `jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0))` |
| 跨设备拆分批次 | `jax.pmap(train_step, axis_name='devices')` |
| 更新每个叶节点 | `jax.tree.map(lambda p, g: p - lr * g, params, grads)` |
| 设置一个元素 | `a = a.at[0].set(5)` |
| 先裁剪，再 Adam | `optax.chain(optax.clip_by_global_norm(1.0), optax.adam(1e-3))` |

## 安装与运行
type: command-table
from: phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/code/jax_intro.py, phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

| 命令 | 作用 |
|---|---|
| `pip install jax jaxlib optax flax` | 安装 JAX、Optax 和 Flax |
| `pip install jax[cuda12]` | 安装支持 GPU 的 JAX |
| `pip install jax[tpu] -f <url>` | 在 Google Cloud 上安装适用于 TPU 的 JAX |
| `XLA_PYTHON_CLIENT_PREALLOCATE=false` | 停止预分配 75% 的 GPU 显存 |
| `jax.debug.print()` | 在经过 JIT 的函数中打印 |
| `fast_fn(x).block_until_ready()` | 停止计时前等待结果就绪 |
| `torch.load("model.pt", weights_only=True)` | 加载已保存的状态字典 |

## 常见坑
type: troubleshooting
from: phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `Expected all tensors to be on the same device` | 模型和批次位于不同设备 | 对两者使用 `.to(device)` |
| 梯度错误但不报错 | 将 Softmax 输出传入 `CrossEntropyLoss` | 传入原始 logits |
| 第一步很慢 | JIT 在首次调用时编译 | 基准测试前先预热 |
| JIT 内的 `if x > 0` 失败 | 控制流依赖追踪值 | 使用 `jax.lax.cond` |
| JIT 内 Python 循环很慢 | 对 JAX 数组使用循环 | 使用 `jax.lax.scan` 或 `jax.lax.fori_loop` |
| `a[0] = 5` 失败 | JAX 数组不可变 | 写成 `a = a.at[0].set(5)` |

## 按场景选择
type: tips
from: phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md, phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md

- 没有特定理由使用 JAX 时，选择 PyTorch。
- 逐行调试使用 PyTorch，`print()`、`pdb` 和 `breakpoint()` 都可用。
- 快速原型和 HuggingFace 生态使用 PyTorch。
- 有 TPU 资源时使用 JAX。
- 需要逐样本梯度时使用 JAX。
- 超大规模多设备训练使用 JAX。

## 问答
type: qa
from: phases/03-deep-learning-core/10-mini-framework/docs/zh.md, phases/03-deep-learning-core/11-intro-to-pytorch/docs/zh.md, phases/03-deep-learning-core/12-intro-to-jax/docs/zh.md

- **JAX 为何需要纯函数？** JIT 编译要求相同输入产生相同输出。
- **JAX 为何没有 `zero_grad`？** `jax.grad` 把梯度作为值返回，张量不保存计算图。
- **为何保存 `state_dict()` 而不是模型？** 模型对象使用 pickle，重构时容易失效。
- **评估时为何用 `torch.no_grad()`？** 它禁用 autograd，减少内存使用。
- **迷你框架中哪些概念能直接对应？** `Sequential`、`Adam`、`zero_grad`、`backward`、`step`、`train`、`eval`。
