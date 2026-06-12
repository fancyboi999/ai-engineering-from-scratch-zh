# JAX 入门

> PyTorch 原地修改张量。TensorFlow 构建图。JAX 编译纯函数。最后这一条改变了你思考深度学习的方式。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 03 第 01-10 课、基础 NumPy
**预计时间：** ~90 分钟

## 学习目标

- 用 JAX 的函数式 API（jax.numpy、jax.grad、jax.jit、jax.vmap）写纯函数的神经网络代码
- 解释 PyTorch 的即时原地修改和 JAX 的函数式编译模型之间的关键设计差异
- 用 jit 编译和 vmap 向量化加速训练循环，对比朴素的 Python
- 在 JAX 里训练一个简单网络，把显式的状态管理和 PyTorch 的面向对象做法做对比

## 问题背景

你知道怎么在 PyTorch 里搭神经网络。你定义一个 `nn.Module`，调 `.backward()`，让优化器走一步。它管用。几百万人在用它。

但 PyTorch 的 DNA 里刻着一个约束：它即时地、一次一个、在 Python 里追踪操作。每个 `tensor + tensor` 都是一次单独的内核启动。每个训练步都重新解释同样的 Python 代码。这在你需要跨 2048 张 TPU 训练一个 5400 亿参数模型之前都还行。到那时，开销就要了你的命。

Google DeepMind 在 JAX 上训练 Gemini。Anthropic 在 JAX 上训练了 Claude。这些不是小活——它们是地球上最大的神经网络训练。它们选 JAX，是因为它把你的训练循环当成一个可编译的程序，而不是一连串 Python 调用。

JAX 是带三种超能力的 NumPy：自动微分、JIT 编译到 XLA、自动向量化。你写一个处理单个样本的函数。JAX 给你一个能处理一个批次、算梯度、编译成机器码、跨多个设备运行的函数。全程都不用改原来那个函数。

## 核心概念

### JAX 哲学

JAX 是个函数式框架。没有类，没有可变状态，没有 `.backward()` 方法。取而代之：

| PyTorch | JAX |
|---------|-----|
| 带状态的 `nn.Module` 类 | 纯函数：`f(params, x) -> y` |
| `loss.backward()` | `jax.grad(loss_fn)(params, x, y)` |
| 即时执行 | 通过 XLA 做 JIT 编译 |
| `for x in batch:` 手动循环 | `jax.vmap(f)` 自动向量化 |
| `DataParallel` / `FSDP` | `jax.pmap(f)` 自动并行 |
| 可变的 `model.parameters()` | 不可变的数组 pytree |

这不是风格偏好。这是编译器约束。JIT 编译要求纯函数——同样的输入永远产出同样的输出，没有副作用。正是那条限制让 100 倍的提速成为可能。

### jax.numpy：熟悉的表层

JAX 在加速器上重新实现了 NumPy API：

```python
import jax.numpy as jnp

a = jnp.array([1.0, 2.0, 3.0])
b = jnp.array([4.0, 5.0, 6.0])
c = jnp.dot(a, b)
```

同样的函数名。同样的广播规则。同样的切片语义。但数组活在 GPU/TPU 上，每个操作都能被编译器追踪。

一个关键区别：JAX 数组是不可变的。没有 `a[0] = 5`。而是：`a = a.at[0].set(5)`。这会别扭一个礼拜，然后就开窍了——正是不可变性让 `grad`、`jit`、`vmap` 这些变换可以组合。

### jax.grad：函数式自动微分

PyTorch 把梯度挂在张量上（`.grad`）。JAX 把梯度挂在函数上。

```python
import jax

def f(x):
    return x ** 2

df = jax.grad(f)
df(3.0)
```

`jax.grad` 接收一个函数，返回一个计算梯度的新函数。没有 `.backward()` 调用。没有存在张量上的计算图。梯度就是另一个你可以调用、组合或 JIT 编译的函数。

它能任意组合：

```python
d2f = jax.grad(jax.grad(f))
d2f(3.0)
```

二阶导。三阶导。雅可比。海森。全靠组合 `grad`。PyTorch 也能做（`torch.autograd.functional.hessian`），但那是硬贴上去的。在 JAX 里，这是根基。

约束是：`grad` 只对纯函数管用。里面不能有 print 语句（它们在追踪时跑，而不是执行时）。不能修改外部状态。不能在没有显式 key 管理的情况下生成随机数。

### jit：编译到 XLA

```python
@jax.jit
def train_step(params, x, y):
    loss = loss_fn(params, x, y)
    return loss

fast_step = jax.jit(train_step)
```

第一次调用时，JAX 追踪这个函数——它记录发生了哪些操作，但不执行它们。然后把这份追踪交给 XLA（Accelerated Linear Algebra，Google 为 TPU 和 GPU 写的编译器）。XLA 融合操作、消除冗余的内存拷贝、生成优化过的机器码。

后续调用完全跳过 Python。编译后的代码以 C++ 速度在加速器上跑。

JIT 何时有帮助：
- 训练步（同样的计算重复几千次）
- 推理（同一个模型，不同输入）
- 任何被以相似形状的输入调用一次以上的函数

JIT 何时反而拖累：
- 含有依赖于值的 Python 控制流的函数（`if x > 0`，而 x 是个被追踪的数组）
- 一次性计算（编译开销超过运行时间）
- 调试（追踪藏起了实际执行）

控制流限制是真实的。`jax.lax.cond` 替换 `if/else`。`jax.lax.scan` 替换 `for` 循环。这些不是可选的——它们是编译的代价。

### vmap：自动向量化

你写一个处理单个样本的函数：

```python
def predict(params, x):
    return jnp.dot(params['w'], x) + params['b']
```

`vmap` 把它提升为处理一个批次：

```python
batch_predict = jax.vmap(predict, in_axes=(None, 0))
```

`in_axes=(None, 0)` 意思是：不在 `params` 上分批（共享），在 `x` 的第 0 轴上分批。没有手动 `for` 循环。没有 reshape。没有手动穿引批维度。JAX 自己搞清楚批维度并把整个计算向量化。

这不是语法糖。`vmap` 生成融合后的向量化代码，比 Python 循环快 10-100 倍。而且它和 `jit`、`grad` 能组合：

```python
per_example_grads = jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0))
```

逐样本梯度。一行。这在 PyTorch 里不靠 hack 几乎做不到。

### pmap：跨设备的数据并行

```python
parallel_step = jax.pmap(train_step, axis_name='devices')
```

`pmap` 把函数复制到所有可用设备（GPU/TPU）上、并切分批次。函数内部，`jax.lax.pmean` 和 `jax.lax.psum` 跨设备同步梯度。

Google 用 `pmap`（及其继任者 `shard_map`）跨数千张 TPU v5e 芯片训练 Gemini。编程模型是：写单设备版本，用 `pmap` 一包，搞定。

### Pytree：通用数据结构

JAX 操作的是"pytree"——列表、元组、字典和数组的嵌套组合。你的模型参数就是一个 pytree：

```python
params = {
    'layer1': {'w': jnp.zeros((784, 256)), 'b': jnp.zeros(256)},
    'layer2': {'w': jnp.zeros((256, 128)), 'b': jnp.zeros(128)},
    'layer3': {'w': jnp.zeros((128, 10)),  'b': jnp.zeros(10)},
}
```

每个 JAX 变换——`grad`、`jit`、`vmap`——都知道怎么遍历 pytree。`jax.tree.map(f, tree)` 把 `f` 施加到每个叶子上。优化器就是这么一次更新所有参数的：

```python
params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
```

没有 `.parameters()` 方法。没有参数注册。树结构就是模型。

### 函数式 vs 面向对象

PyTorch 把状态存在对象里：

```python
class Model(nn.Module):
    def __init__(self):
        self.linear = nn.Linear(784, 10)

    def forward(self, x):
        return self.linear(x)
```

JAX 用带显式状态的纯函数：

```python
def predict(params, x):
    return jnp.dot(x, params['w']) + params['b']
```

params 是传进来的。什么都不存。什么都不改。这让每个函数都可测试、可组合、可编译。这也意味着你自己管理 params——或者用 Flax、Equinox 这类库。

### JAX 生态

JAX 给你原语。库给你人体工学：

| 库 | 角色 | 风格 |
|---------|------|------|
| **Flax**（Google） | 神经网络层 | 带显式状态的 `nn.Module` |
| **Equinox**（Patrick Kidger） | 神经网络层 | 基于 pytree、Python 风 |
| **Optax**（DeepMind） | 优化器 + LR 调度 | 可组合的梯度变换 |
| **Orbax**（Google） | 检查点 | 保存/恢复 pytree |
| **CLU**（Google） | 指标 + 日志 | 训练循环工具 |

Optax 是标准的优化器库。它把梯度变换（Adam、SGD、裁剪）和参数更新分开，让组合变得轻而易举：

```python
optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adam(learning_rate=1e-3),
)
```

### 何时用 JAX vs PyTorch

| 因素 | JAX | PyTorch |
|--------|-----|---------|
| TPU 支持 | 一等公民（Google 两个都造） | 社区维护（torch_xla） |
| GPU 支持 | 好（通过 XLA 用 CUDA） | 业界最佳（原生 CUDA） |
| 调试 | 难（追踪 + 编译） | 简单（即时、逐行） |
| 生态 | 偏研究（Flax、Equinox） | 庞大（HuggingFace、torchvision 等） |
| 招聘 | 小众（Google/DeepMind/Anthropic） | 主流（到处都是） |
| 大规模训练 | 更优（XLA、pmap、mesh） | 好（FSDP、DeepSpeed） |
| 原型速度 | 更慢（函数式开销） | 更快（改完就跑） |
| 生产推理 | TensorFlow Serving、Vertex AI | TorchServe、Triton、ONNX |
| 谁在用 | DeepMind（Gemini）、Anthropic（Claude） | Meta（Llama）、OpenAI（GPT）、Stability AI |

老实说：除非你有具体理由用 JAX，否则用 PyTorch。那些理由是——能用 TPU、需要逐样本梯度、超大规模的多设备训练，或者你在 Google/DeepMind/Anthropic 上班。

### JAX 里的随机数

JAX 没有全局随机状态。每个随机操作都要求一个显式的 PRNG key：

```python
key = jax.random.PRNGKey(42)
key1, key2 = jax.random.split(key)
w = jax.random.normal(key1, shape=(784, 256))
```

一开始很烦。但它保证了跨设备和跨编译的可复现性——这是 PyTorch 的 `torch.manual_seed` 在多 GPU 场景下保证不了的属性。

```figure
batchnorm-effect
```

## 动手构建

我们要用 JAX 和 Optax 在 MNIST 上训练一个 3 层 MLP。784 个输入，两个隐藏层分别 256 和 128 个神经元，10 个输出类。

### 第 1 步：环境与数据

```python
import jax
import jax.numpy as jnp
from jax import random
import optax

def get_mnist_data():
    from sklearn.datasets import fetch_openml
    mnist = fetch_openml('mnist_784', version=1, as_frame=False, parser='auto')
    X = mnist.data.astype('float32') / 255.0
    y = mnist.target.astype('int')
    X_train, X_test = X[:60000], X[60000:]
    y_train, y_test = y[:60000], y[60000:]
    return X_train, y_train, X_test, y_test
```

### 第 2 步：初始化参数

没有类。就一个返回 pytree 的函数：

```python
def init_params(key):
    k1, k2, k3 = random.split(key, 3)
    scale1 = jnp.sqrt(2.0 / 784)
    scale2 = jnp.sqrt(2.0 / 256)
    scale3 = jnp.sqrt(2.0 / 128)
    params = {
        'layer1': {
            'w': scale1 * random.normal(k1, (784, 256)),
            'b': jnp.zeros(256),
        },
        'layer2': {
            'w': scale2 * random.normal(k2, (256, 128)),
            'b': jnp.zeros(128),
        },
        'layer3': {
            'w': scale3 * random.normal(k3, (128, 10)),
            'b': jnp.zeros(10),
        },
    }
    return params
```

He 初始化，手工做的。从一个种子分出三个 PRNG key。每个权重都是嵌套字典里的一个不可变数组。

### 第 3 步：前向传播

```python
def forward(params, x):
    x = jnp.dot(x, params['layer1']['w']) + params['layer1']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer2']['w']) + params['layer2']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer3']['w']) + params['layer3']['b']
    return x

def loss_fn(params, x, y):
    logits = forward(params, x)
    one_hot = jax.nn.one_hot(y, 10)
    return -jnp.mean(jnp.sum(jax.nn.log_softmax(logits) * one_hot, axis=-1))
```

纯函数。params 进，预测出。没有 `self`，没有存下来的状态。`loss_fn` 从零算交叉熵——softmax、log、负均值。

### 第 4 步：JIT 编译的训练步

```python
@jax.jit
def train_step(params, opt_state, x, y):
    loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
    updates, opt_state = optimizer.update(grads, opt_state, params)
    params = optax.apply_updates(params, updates)
    return params, opt_state, loss

@jax.jit
def accuracy(params, x, y):
    logits = forward(params, x)
    preds = jnp.argmax(logits, axis=-1)
    return jnp.mean(preds == y)
```

`jax.value_and_grad` 一遍就返回损失值和梯度。`@jax.jit` 装饰器把两个函数都编译到 XLA。第一次调用之后，每个训练步运行起来都不碰 Python。

### 第 5 步：训练循环

```python
optimizer = optax.adam(learning_rate=1e-3)

X_train, y_train, X_test, y_test = get_mnist_data()
X_train, X_test = jnp.array(X_train), jnp.array(X_test)
y_train, y_test = jnp.array(y_train), jnp.array(y_test)

key = random.PRNGKey(0)
params = init_params(key)
opt_state = optimizer.init(params)

batch_size = 128
n_epochs = 10

for epoch in range(n_epochs):
    key, subkey = random.split(key)
    perm = random.permutation(subkey, len(X_train))
    X_shuffled = X_train[perm]
    y_shuffled = y_train[perm]

    epoch_loss = 0.0
    n_batches = len(X_train) // batch_size
    for i in range(n_batches):
        start = i * batch_size
        xb = X_shuffled[start:start + batch_size]
        yb = y_shuffled[start:start + batch_size]
        params, opt_state, loss = train_step(params, opt_state, xb, yb)
        epoch_loss += loss

    train_acc = accuracy(params, X_train[:5000], y_train[:5000])
    test_acc = accuracy(params, X_test, y_test)
    print(f"Epoch {epoch + 1:2d} | Loss: {epoch_loss / n_batches:.4f} | "
          f"Train Acc: {train_acc:.4f} | Test Acc: {test_acc:.4f}")
```

10 个 epoch。约 97% 测试准确率。第一个 epoch 慢（JIT 编译）。第 2-10 个 epoch 快。

注意缺了什么：没有 `.zero_grad()`，没有 `.backward()`，没有 `.step()`。整个更新就是一个组合起来的函数调用。梯度被算出来、被 Adam 变换、被施加到参数上——全在 `train_step` 里面。

## 实际使用

### Flax：Google 的标准

Flax 是最常见的 JAX 神经网络库。它把 `nn.Module` 加了回来，但带显式状态管理：

```python
import flax.linen as nn

class MLP(nn.Module):
    @nn.compact
    def __call__(self, x):
        x = nn.Dense(256)(x)
        x = nn.relu(x)
        x = nn.Dense(128)(x)
        x = nn.relu(x)
        x = nn.Dense(10)(x)
        return x

model = MLP()
params = model.init(jax.random.PRNGKey(0), jnp.ones((1, 784)))
logits = model.apply(params, x_batch)
```

结构和 PyTorch 一样，但 `params` 和模型是分开的。`model.init()` 创建 params。`model.apply(params, x)` 跑前向传播。模型对象没有状态。

### Equinox：Python 风的替代方案

Equinox（Patrick Kidger 写的）把模型表示成 pytree：

```python
import equinox as eqx

model = eqx.nn.MLP(
    in_size=784, out_size=10, width_size=256, depth=2,
    activation=jax.nn.relu, key=jax.random.PRNGKey(0)
)
logits = model(x)
```

模型本身就是个 pytree。不用 `.apply()`。参数就是模型的叶子。这更贴近 JAX 思考问题的方式。

### Optax：可组合的优化器

Optax 把梯度变换和更新解耦：

```python
schedule = optax.warmup_cosine_decay_schedule(
    init_value=0.0, peak_value=1e-3,
    warmup_steps=1000, decay_steps=50000
)

optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adamw(learning_rate=schedule, weight_decay=0.01),
)
```

梯度裁剪、学习率 warmup、权重衰减——全都组合成一串变换。每个变换看到梯度、改它、传给下一个。没有铁板一块的优化器类。

## 拿去用

**安装：**

```bash
pip install jax jaxlib optax flax
```

GPU 支持：

```bash
pip install jax[cuda12]
```

TPU（Google Cloud）：

```bash
pip install jax[tpu] -f https://storage.googleapis.com/jax-releases/libtpu_releases.html
```

**性能坑：**

- 第一次 JIT 调用很慢（编译）。基准测试前先热身。
- 别在 JIT 内部对 JAX 数组做 Python 循环。用 `jax.lax.scan` 或 `jax.lax.fori_loop`。
- `jax.debug.print()` 在 JIT 内部能用。普通 `print()` 不能。
- 用 `jax.profiler` 或 TensorBoard 做剖析。XLA 编译可能藏起瓶颈。
- JAX 默认预分配 75% 的 GPU 内存。设 `XLA_PYTHON_CLIENT_PREALLOCATE=false` 来关掉。

**检查点：**

```python
import orbax.checkpoint as ocp
checkpointer = ocp.PyTreeCheckpointer()
checkpointer.save('/tmp/model', params)
restored = checkpointer.restore('/tmp/model')
```

**本课产出：**
- `outputs/prompt-jax-optimizer.md` —— 一个挑选合适 JAX 优化器配置的提示词
- `outputs/skill-jax-patterns.md` —— 一个讲 JAX 函数式套路的 skill

## 练习

1. 给 MLP 加 dropout。在 JAX 里，dropout 需要一个 PRNG key——把一个 key 穿引过前向传播，并为每个 dropout 层分出 key。对比加和不加的测试准确率。

2. 用 `jax.vmap` 为一批 32 张 MNIST 图像算逐样本梯度。算每个样本的梯度范数。哪些样本梯度最大，为什么？

3. 把手写的前向函数换成一个对任意层数都适用的通用 `mlp_forward(params, x)`。用 `jax.tree.leaves` 自动判断深度。

4. 对带和不带 `@jax.jit` 的训练步做基准测试。各计时 100 步。在你的硬件上提速有多大？第一次调用的编译开销是多少？

5. 通过组合 `optax.chain(optax.clip_by_global_norm(1.0), optax.adam(1e-3))` 实现梯度裁剪。带和不带裁剪各训练一次。把训练过程中的梯度范数画出来看效果。

## 关键术语

| 术语 | 大家怎么说 | 实际是什么 |
|------|----------------|----------------------|
| XLA | "让 JAX 快的那个东西" | Accelerated Linear Algebra——一个编译器，融合操作并从计算图生成优化过的 GPU/TPU 内核 |
| JIT | "即时编译" | JAX 在第一次调用时追踪函数、编译到 XLA，后续调用就跑编译后的版本 |
| 纯函数（Pure function） | "没有副作用" | 输出只依赖输入的函数——没有全局状态、没有原地修改、没有显式 key 之外的随机性 |
| vmap | "自动分批" | 把一个处理单样本的函数变换成处理一个批次的函数，不用重写 |
| pmap | "自动并行" | 把一个函数复制到多个设备上、并切分输入批次 |
| Pytree | "嵌套的数组字典" | 任何 JAX 能遍历和变换的列表、元组、字典、数组的嵌套结构 |
| 追踪（Tracing） | "记录计算" | JAX 用抽象值执行函数来构建计算图，但不计算真实结果 |
| 函数式自动微分 | "函数的 grad" | 通过变换函数来计算导数，而不是给张量挂上梯度存储 |
| Optax | "JAX 的优化器库" | 一个可组合的梯度变换库——Adam、SGD、裁剪、调度——能串在一起 |
| Flax | "JAX 的 nn.Module" | Google 为 JAX 写的神经网络库，加上层抽象的同时让状态保持显式 |

## 延伸阅读

- JAX 文档：https://jax.readthedocs.io/ —— 官方文档，对 grad、jit、vmap 有很棒的教程
- 《JAX: composable transformations of Python+NumPy programs》（Bradbury 等人，2018）—— 解释设计哲学的原始论文
- Flax 文档：https://flax.readthedocs.io/ —— Google 为 JAX 写的神经网络库
- Patrick Kidger，《Equinox: neural networks in JAX via callable PyTrees and filtered transformations》（2021）—— Flax 的 Python 风替代方案
- DeepMind，《Optax: composable gradient transformation and optimisation》—— 标准的优化器库
- 《You Don't Know JAX》（Colin Raffel，2020）—— 一份实用的 JAX 坑与套路指南，出自 T5 作者之一
