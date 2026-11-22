---
name: skill-jax-patterns
description: JAX 中的函数式编程模式：何时以及如何使用 grad、jit、vmap 和 pmap
version: 1.0.0
phase: 3
lesson: 12
tags: [jax, functional-programming, autodiff, compilation, vectorization]
---

# JAX 函数式模式

JAX 变换的是纯函数。下面每个模式都遵循同一条规则：写一个接收输入、返回输出、没有副作用的函数，然后对它做变换。

## 四种变换

### grad：对函数求导

```python
grads = jax.grad(loss_fn)(params, x, y)
loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
```

适用场景：优化时需要梯度。
约束：函数必须返回标量。输出不是标量时，用 `jax.jacobian`。

### jit：编译函数

```python
fast_fn = jax.jit(f)
```

适用场景：函数会以相同形状的输入被调用不止一次。
约束：不能有依赖追踪值的 Python 控制流。条件分支用 `jax.lax.cond`，循环用 `jax.lax.scan`。

### vmap：向量化函数

```python
batch_fn = jax.vmap(f, in_axes=(None, 0))
```

适用场景：你写的函数处理单个样本，现在需要让它处理整个 batch。
`in_axes` 指定沿参数的哪个轴做批处理。`None` 表示不做批处理（广播）。

### pmap：跨设备并行

```python
parallel_fn = jax.pmap(f, axis_name='devices')
```

适用场景：你有多块 GPU/TPU，想做数据并行。
在函数内部，`jax.lax.pmean(x, 'devices')` 会在各设备间取平均。

## 组合规则

变换可以组合，顺序很重要：

```python
per_example_grads = jax.jit(jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0)))
```

从右往左读：对 loss_fn 求梯度，在样本维度上向量化，再编译结果。

有效的组合：
- `jit(grad(f))`：编译后的梯度计算
- `jit(vmap(f))`：编译后的批量计算
- `vmap(grad(f))`：逐样本梯度
- `pmap(jit(f))`：并行的编译计算
- `grad(jit(f))`：对编译后函数求梯度（等同于 jit(grad(f))）

## 参数管理模式

JAX 的参数是 pytree（由数组组成的嵌套字典）：

```python
params = {
    'layer1': {'w': jnp.zeros((784, 256)), 'b': jnp.zeros(256)},
    'layer2': {'w': jnp.zeros((256, 10)),  'b': jnp.zeros(10)},
}
```

一次性更新所有参数：
```python
params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
```

统计参数量：
```python
n_params = sum(p.size for p in jax.tree.leaves(params))
```

## PRNG 密钥管理

JAX 要求显式传入随机密钥：

```python
key = jax.random.PRNGKey(0)
key, subkey = jax.random.split(key)
noise = jax.random.normal(subkey, shape)
```

需要多个随机操作时，一次性切分：
```python
keys = jax.random.split(key, n)
```

绝不复用密钥。用之前一定先切分。

## 常见错误

1. **在 jit 内修改数组**：JAX 数组不可变。用 `x.at[i].set(v)` 代替 `x[i] = v`。

2. **在 jit 内用 Python 的 print**：`print` 在追踪时运行，而不是在执行时。用 `jax.debug.print("{}", x)`。

3. **在 jit 内对追踪值用 Python 的 if/for**：用 `jax.lax.cond`、`jax.lax.switch`、`jax.lax.scan`、`jax.lax.fori_loop`。

4. **忘了 `.block_until_ready()`**：JAX 采用异步派发。做性能测试时，调用 `.block_until_ready()` 等待计算真正完成。

5. **复用 PRNG 密钥**：用同一个密钥的两次操作会产生相同的"随机"值。一定要切分。

6. **jit 函数中使用全局状态**：全局变量在追踪时就被捕获了，追踪之后的改动看不到。把所有东西都作为参数传入。

## 决策清单

1. 函数会被调用不止一次？加上 `@jax.jit`。
2. 需要梯度？用 `jax.grad` 或 `jax.value_and_grad` 包一层。
3. 函数处理单个样本，但你手上是一个 batch？用 `jax.vmap` 包一层。
4. 有多个设备？用 `jax.pmap` 包一层。
5. 用到了随机性？显式地把 PRNG 密钥一路传下去。
6. 有基于数组值的 Python 控制流？换成 `jax.lax` 原语。

## 什么时候用 JAX

适合用 JAX 的情况：
- 需要逐样本梯度（差分隐私、Fisher 信息）
- 在 TPU 上训练（JAX 是原生框架）
- 需要高阶导数（Hessian、Jacobian）
- 想把整个训练步编译成单个 kernel
- 你的团队在 Google DeepMind 或 Anthropic

适合用 PyTorch 的情况：
- 想要最大的生态（HuggingFace、torchvision、Lightning）
- 更看重调试便利而不是极致速度
- 用 TorchServe/Triton 部署到 NVIDIA GPU
- 要招人（PyTorch 开发者更多）
- 想在新结构上快速迭代
