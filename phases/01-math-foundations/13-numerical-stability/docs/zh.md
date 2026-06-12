# 数值稳定性

> 浮点是一个会漏的抽象。它会在训练时咬你一口，而你压根看不到它来。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1，第 01-04 课
**预计时间：** ~120 分钟

## 学习目标

- 用减最大值技巧实现数值稳定的 softmax 和 log-sum-exp
- 识别浮点计算中的上溢、下溢和灾难性抵消
- 用中心有限差分对照数值梯度验证解析梯度
- 解释为什么训练偏好 bfloat16 而非 float16，以及损失缩放如何防止梯度下溢

## 问题背景

你的模型训练了三个小时，然后损失变成了 NaN。你加一句 print。在第 9,000 步 logits 还好好的。第 9,001 步它们成了 `inf`。到第 9,002 步每个梯度都是 `nan`，训练死了。

或者：你的模型训练完了，但准确率比论文宣称的低 2%。你检查了一切。架构对得上。超参数对得上。数据对得上。问题是论文用的是 float32，而你用了 float16 却没有正确的缩放。三十二位累积的舍入误差悄悄吃掉了你的准确率。

或者：你从零实现交叉熵损失。它在小 logits 上能跑。当 logits 超过 100 时，它返回 `inf`。softmax 上溢了，因为 `exp(100)` 比 float32 能表示的还大。每个 ML 框架都用一个两行的技巧处理这个。你根本不知道有这个技巧。

数值稳定性不是理论上的担忧。它是一次成功的训练和一次悄无声息失败的训练之间的分水岭。你将调试的每个严肃 ML bug，最终都归结到浮点。

## 核心概念

### IEEE 754：计算机怎么存实数

计算机按 IEEE 754 标准把实数存为浮点值。一个浮点数有三部分：符号位、指数和尾数（有效数字）。

```
Float32 layout (32 bits total):
[1 sign] [8 exponent] [23 mantissa]

Value = (-1)^sign * 2^(exponent - 127) * 1.mantissa
```

尾数决定精度（多少位有效数字）。指数决定范围（一个数能多大或多小）。

```
Format     Bits   Exponent  Mantissa  Decimal digits  Range (approx)
float64    64     11        52        ~15-16          +/- 1.8e308
float32    32     8         23        ~7-8            +/- 3.4e38
float16    16     5         10        ~3-4            +/- 65,504
bfloat16   16     8         7         ~2-3            +/- 3.4e38
```

float32 给你大约 7 位十进制精度。这意味着它能分辨 1.0000001 和 1.0000002，却分不清 1.00000001 和 1.00000002。7 位之后，一切都是舍入噪声。

float16 给你大约 3 位。它能表示的最大数是 65,504。这对 ML 来说小得可怕，因为 logits、梯度和激活值动不动就超过它。

bfloat16 是 Google 对 float16 范围问题的回应。它有和 float32 一样的 8 位指数（同样的范围，到 3.4e38），但只有 7 位尾数（精度不如 float16）。训练神经网络时，范围比精度更重要，所以 bfloat16 通常胜出。

### 为什么 0.1 + 0.2 != 0.3

数字 0.1 在二进制浮点里没法精确表示。在二进制下，它是一个循环小数：

```
0.1 in binary = 0.0001100110011001100110011... (repeating forever)
```

float32 把它截断到 23 位尾数。存下的值约是 0.100000001490116。同样，0.2 存为约 0.200000002980232。它们的和是 0.300000004470348，不是 0.3。

```
In Python:
>>> 0.1 + 0.2
0.30000000000000004

>>> 0.1 + 0.2 == 0.3
False
```

这对 ML 重要，因为：

1. 像 `if loss < threshold` 这样的损失比较可能给出错误答案
2. 累积许多小值（数千步的梯度更新）会偏离真正的和
3. 如果你用 `==` 比较浮点，校验和与可复现性测试会失败

修复办法：永远别用 `==` 比较浮点。用 `abs(a - b) < epsilon` 或 `math.isclose()`。

### 灾难性抵消

当你减去两个几乎相等的浮点数时，有效数字相消，你剩下的是被提升到首位的舍入噪声。

```
a = 1.0000001    (stored as 1.00000011920929 in float32)
b = 1.0000000    (stored as 1.00000000000000 in float32)

True difference:  0.0000001
Computed:         0.00000011920929

Relative error: 19.2%
```

仅仅一次减法就有 19% 的相对误差。在 ML 里，这在你做以下事情时发生：

- 计算均值很大的数据的方差：当 E[x] 很大时的 `E[x^2] - E[x]^2`
- 减去几乎相等的对数概率
- 用过小的 epsilon 计算有限差分梯度

修复办法：重排公式，避免减去两个很大且几乎相等的数。对方差，用 Welford 算法或先把数据中心化。对对数概率，全程在对数空间里工作。

### 上溢和下溢

上溢发生在结果大到无法表示时。下溢发生在结果太小时（比最小可表示正数更接近零）。

```
Float32 boundaries:
  Maximum:  3.4028235e+38
  Minimum positive (normal): 1.175e-38
  Minimum positive (denorm): 1.401e-45
  Overflow:  anything > 3.4e38 becomes inf
  Underflow: anything < 1.4e-45 becomes 0.0
```

`exp()` 函数是 ML 里上溢的主要来源：

```
exp(88.7)  = 3.40e+38   (barely fits in float32)
exp(89.0)  = inf         (overflow)
exp(-87.3) = 1.18e-38   (barely above underflow)
exp(-104)  = 0.0         (underflow to zero)
```

`log()` 函数撞向另一个方向：

```
log(0.0)   = -inf
log(-1.0)  = nan
log(1e-45) = -103.3      (fine)
log(1e-46) = -inf        (input underflowed to 0, then log(0) = -inf)
```

在 ML 里，`exp()` 出现在 softmax、sigmoid 和概率计算里。`log()` 出现在交叉熵、对数似然和 KL 散度里。组合 `log(exp(x))` 没有正确的技巧就是个雷区。

### Log-Sum-Exp 技巧

直接计算 `log(sum(exp(x_i)))` 在数值上很危险。如果任何 `x_i` 很大，`exp(x_i)` 就上溢。如果所有 `x_i` 都非常负，每个 `exp(x_i)` 都下溢到零，而 `log(0)` 是 `-inf`。

技巧：在做指数前减去最大值。

```
log(sum(exp(x_i))) = max(x) + log(sum(exp(x_i - max(x))))
```

它为什么有效：减去 `max(x)` 后，最大的指数是 `exp(0) = 1`。不可能上溢。和里至少有一项是 1，所以和至少是 1，而 `log(1) = 0`。不可能下溢到 `-inf`。

证明：

```
log(sum(exp(x_i)))
= log(sum(exp(x_i - c + c)))                    (add and subtract c)
= log(sum(exp(x_i - c) * exp(c)))               (exp(a+b) = exp(a)*exp(b))
= log(exp(c) * sum(exp(x_i - c)))               (factor out exp(c))
= c + log(sum(exp(x_i - c)))                    (log(a*b) = log(a) + log(b))
```

令 `c = max(x)`，上溢就被消除了。

这个技巧在 ML 里无处不在：
- Softmax 归一化
- 交叉熵损失计算
- 序列模型里的对数概率求和
- 高斯混合
- 变分推断

### 为什么 Softmax 需要减最大值技巧

Softmax 把 logits 转成概率：

```
softmax(x_i) = exp(x_i) / sum(exp(x_j))
```

不用这个技巧，logits 为 [100, 101, 102] 会导致上溢：

```
exp(100) = 2.69e43
exp(101) = 7.31e43
exp(102) = 1.99e44
sum      = 2.99e44

These overflow float32 (max ~3.4e38)? No, 2.69e43 < 3.4e38? Actually:
exp(88.7) is already at the float32 limit.
exp(100) = inf in float32.
```

用上技巧，减去 max(x) = 102：

```
exp(100 - 102) = exp(-2) = 0.135
exp(101 - 102) = exp(-1) = 0.368
exp(102 - 102) = exp(0)  = 1.000
sum = 1.503

softmax = [0.090, 0.245, 0.665]
```

概率完全相同。计算安全了。这不是优化。它是正确性的必要条件。

### NaN 和 Inf：检测与预防

`nan`（非数）和 `inf`（无穷）像病毒一样在计算中传播。梯度更新里一个 `nan` 就让权重变 `nan`，进而让后续每个输出变 `nan`。一步之内训练就死了。

`inf` 怎么出现：
- 一个大正数的 `exp()`
- 除以零：`1.0 / 0.0`
- 累加中的 `float32` 上溢

`nan` 怎么出现：
- `0.0 / 0.0`
- `inf - inf`
- `inf * 0`
- 负数的 `sqrt()`
- 负数的 `log()`
- 任何涉及已有 `nan` 的算术

检测：

```python
import math

math.isnan(x)       # True if x is nan
math.isinf(x)       # True if x is +inf or -inf
math.isfinite(x)    # True if x is neither nan nor inf
```

预防策略：

1. 给 `exp()` 的输入做钳制：`exp(clamp(x, -80, 80))`
2. 给分母加 epsilon：`x / (y + 1e-8)`
3. 在 `log()` 内部加 epsilon：`log(x + 1e-8)`
4. 用稳定实现（log-sum-exp、稳定 softmax）
5. 梯度裁剪以防权重爆炸
6. 调试时每次前向传播后都检查 `nan`/`inf`

### 数值梯度检查

解析梯度（来自反向传播）可能有 bug。数值梯度检查用有限差分算梯度来验证它们。

中心差分公式：

```
df/dx ~= (f(x + h) - f(x - h)) / (2h)
```

这是 O(h^2) 精度，比只有 O(h) 的前向差分 `(f(x+h) - f(x)) / h` 好得多。

选 h：太大近似就不准。太小灾难性抵消会毁掉答案。`h = 1e-5` 到 `1e-7` 是典型值。

检查：计算解析梯度和数值梯度之间的相对差。

```
relative_error = |grad_analytical - grad_numerical| / max(|grad_analytical|, |grad_numerical|, 1e-8)
```

经验法则：
- relative_error < 1e-7：完美，梯度正确
- relative_error < 1e-5：可接受，大概率正确
- relative_error > 1e-3：有问题
- relative_error > 1：梯度完全错了

实现新层或新损失函数时总要检查梯度。PyTorch 为此提供了 `torch.autograd.gradcheck()`。

### 混合精度训练

现代 GPU 有专门的硬件（Tensor Core），算 float16 矩阵乘法比 float32 快 2-8 倍。混合精度训练利用了这一点：

```
1. Maintain float32 master copy of weights
2. Forward pass in float16 (fast)
3. Compute loss in float32 (prevents overflow)
4. Backward pass in float16 (fast)
5. Scale gradients to float32
6. Update float32 master weights
```

纯 float16 训练的问题：梯度往往非常小（1e-8 或更小）。float16 把任何低于约 6e-8 的值下溢到零。你的模型停止学习，因为所有梯度更新都是零。

修复办法是损失缩放：

```
1. Multiply loss by a large scale factor (e.g., 1024)
2. Backward pass computes gradients of (loss * 1024)
3. All gradients are 1024x larger (pushed above float16 underflow)
4. Divide gradients by 1024 before updating weights
5. Net effect: same update, but no underflow
```

动态损失缩放自动调整缩放因子。从一个大值（65536）开始。如果梯度上溢到 `inf`，就减半。如果 N 步没有上溢，就翻倍。

### bfloat16 vs float16：为什么训练用 bfloat16 胜出

```
float16:   [1 sign] [5 exponent]  [10 mantissa]
bfloat16:  [1 sign] [8 exponent]  [7 mantissa]
```

float16 精度更高（10 位尾数 vs 7），但范围受限（最大约 65,504）。bfloat16 精度更低，但范围和 float32 一样（最大约 3.4e38）。

训练神经网络时：

- 训练尖峰中，激活值和 logits 经常超过 65,504。float16 上溢；bfloat16 扛得住。
- float16 需要损失缩放，但 bfloat16 通常不需要，因为它的范围覆盖了梯度幅度谱。
- bfloat16 是 float32 的简单截断：丢掉尾数底部 16 位。转换轻而易举，且指数无损。

float16 在推理中更受偏好，那里值有界、精度更要紧。bfloat16 在训练中更受偏好，那里范围更要紧。这就是为什么 TPU 和现代 NVIDIA GPU（A100、H100）有原生 bfloat16 支持。

### 梯度裁剪

梯度爆炸发生在梯度穿过许多层指数级增长时（在 RNN、深层网络和 transformer 里常见）。一个大梯度就能在一步里把所有权重弄坏。

两种裁剪：

**按值裁剪：** 独立地钳制每个梯度元素。

```
grad = clamp(grad, -max_val, max_val)
```

简单，但可能改变梯度向量的方向。

**按范数裁剪：** 缩放整个梯度向量，使它的范数不超过阈值。

```
if ||grad|| > max_norm:
    grad = grad * (max_norm / ||grad||)
```

保留梯度的方向。这是 `torch.nn.utils.clip_grad_norm_()` 做的事。它是标准选择。

典型值：transformer 用 `max_norm=1.0`，RL 用 `max_norm=0.5`，简单网络用 `max_norm=5.0`。

梯度裁剪不是一个偷懒招。它是一道安全机制。没有它，单个离群批次就能产生一个大到毁掉数周训练的梯度。

### 归一化层作为数值稳定器

批归一化、层归一化和 RMS 归一化通常被当作帮助训练收敛的正则器。它们也是数值稳定器。

没有归一化，激活值会穿过各层指数级增长或缩小：

```
Layer 1: values in [0, 1]
Layer 5: values in [0, 100]
Layer 10: values in [0, 10,000]
Layer 50: values in [0, inf]
```

归一化在每一层把激活值重新中心化和重新缩放：

```
LayerNorm(x) = (x - mean(x)) / (std(x) + epsilon) * gamma + beta
```

`epsilon`（通常 1e-5）在所有激活值都相同时防止除以零。学到的参数 `gamma` 和 `beta` 让网络恢复它需要的任何尺度。

这让值贯穿网络始终保持在数值安全的范围里，既防止前向传播中的上溢，也防止反向传播中的梯度爆炸。

### 常见的 ML 数值 bug

**Bug：几个 epoch 后损失变 NaN。**
原因：logits 变得太大，softmax 上溢。或者学习率太高、权重发散了。
修复：用稳定 softmax（减最大值）、降低学习率、加梯度裁剪。

**Bug：损失卡在 log(num_classes)。**
原因：模型输出接近均匀概率。往往意味着梯度消失或模型根本没在学。
修复：检查数据标签是否正确、验证损失函数、检查死掉的 ReLU。

**Bug：验证准确率比预期低 1-3%。**
原因：混合精度没有正确的损失缩放。梯度下溢悄悄把小更新归零。
修复：启用动态损失缩放，或换成 bfloat16。

**Bug：某些层的梯度范数为 0.0。**
原因：死掉的 ReLU 神经元（所有输入为负），或 float16 下溢。
修复：用 LeakyReLU 或 GELU、用梯度缩放、检查权重初始化。

**Bug：模型在一块 GPU 上能跑、在另一块上结果不同。**
原因：非确定性的浮点累加顺序。GPU 并行归约在不同硬件上以不同顺序求和，而浮点加法不满足结合律。
修复：接受微小差异（1e-6），或设 `torch.use_deterministic_algorithms(True)` 并接受速度损失。

**Bug：损失计算里 `exp()` 返回 `inf`。**
原因：原始 logits 没用减最大值技巧就传给了 `exp()`。
修复：用 `torch.nn.functional.log_softmax()`，它内部实现了 log-sum-exp。

**Bug：从 float32 切到 float16 后训练发散。**
原因：float16 表示不了低于 6e-8 的梯度幅度或高于 65,504 的激活值。
修复：用带损失缩放的混合精度（AMP），或改用 bfloat16。

```figure
logsumexp-stability
```

## 动手构建

### 第 1 步：演示浮点精度极限

```python
print("=== Floating Point Precision ===")
print(f"0.1 + 0.2 = {0.1 + 0.2}")
print(f"0.1 + 0.2 == 0.3? {0.1 + 0.2 == 0.3}")
print(f"Difference: {(0.1 + 0.2) - 0.3:.2e}")
```

### 第 2 步：实现朴素 vs 稳定 softmax

```python
import math

def softmax_naive(logits):
    exps = [math.exp(z) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def softmax_stable(logits):
    max_logit = max(logits)
    exps = [math.exp(z - max_logit) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

safe_logits = [2.0, 1.0, 0.1]
print(f"Naive:  {softmax_naive(safe_logits)}")
print(f"Stable: {softmax_stable(safe_logits)}")

dangerous_logits = [100.0, 101.0, 102.0]
print(f"Stable: {softmax_stable(dangerous_logits)}")
# softmax_naive(dangerous_logits) would return [nan, nan, nan]
```

### 第 3 步：实现稳定的 log-sum-exp

```python
def logsumexp_naive(values):
    return math.log(sum(math.exp(v) for v in values))

def logsumexp_stable(values):
    c = max(values)
    return c + math.log(sum(math.exp(v - c) for v in values))

safe = [1.0, 2.0, 3.0]
print(f"Naive:  {logsumexp_naive(safe):.6f}")
print(f"Stable: {logsumexp_stable(safe):.6f}")

large = [500.0, 501.0, 502.0]
print(f"Stable: {logsumexp_stable(large):.6f}")
# logsumexp_naive(large) returns inf
```

### 第 4 步：实现稳定的交叉熵

```python
def cross_entropy_naive(true_class, logits):
    probs = softmax_naive(logits)
    return -math.log(probs[true_class])

def cross_entropy_stable(true_class, logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = math.log(sum(math.exp(s) for s in shifted))
    log_prob = shifted[true_class] - log_sum_exp
    return -log_prob

logits = [2.0, 5.0, 1.0]
true_class = 1
print(f"Naive:  {cross_entropy_naive(true_class, logits):.6f}")
print(f"Stable: {cross_entropy_stable(true_class, logits):.6f}")
```

### 第 5 步：梯度检查

```python
def numerical_gradient(f, x, h=1e-5):
    grad = []
    for i in range(len(x)):
        x_plus = x[:]
        x_minus = x[:]
        x_plus[i] += h
        x_minus[i] -= h
        grad.append((f(x_plus) - f(x_minus)) / (2 * h))
    return grad

def check_gradient(analytical, numerical, tolerance=1e-5):
    for i, (a, n) in enumerate(zip(analytical, numerical)):
        denom = max(abs(a), abs(n), 1e-8)
        rel_error = abs(a - n) / denom
        status = "OK" if rel_error < tolerance else "FAIL"
        print(f"  param {i}: analytical={a:.8f} numerical={n:.8f} "
              f"rel_error={rel_error:.2e} [{status}]")

def f(params):
    x, y = params
    return x**2 + 3*x*y + y**3

def f_grad(params):
    x, y = params
    return [2*x + 3*y, 3*x + 3*y**2]

point = [2.0, 1.0]
analytical = f_grad(point)
numerical = numerical_gradient(f, point)
check_gradient(analytical, numerical)
```

## 实际使用

### 混合精度模拟

```python
import struct

def float32_to_float16_round(x):
    packed = struct.pack('f', x)
    f32 = struct.unpack('f', packed)[0]
    packed16 = struct.pack('e', f32)
    return struct.unpack('e', packed16)[0]

def simulate_bfloat16(x):
    packed = struct.pack('f', x)
    as_int = int.from_bytes(packed, 'little')
    truncated = as_int & 0xFFFF0000
    repacked = truncated.to_bytes(4, 'little')
    return struct.unpack('f', repacked)[0]
```

### 梯度裁剪

```python
def clip_by_norm(gradients, max_norm):
    total_norm = math.sqrt(sum(g**2 for g in gradients))
    if total_norm > max_norm:
        scale = max_norm / total_norm
        return [g * scale for g in gradients]
    return gradients

grads = [10.0, 20.0, 30.0]
clipped = clip_by_norm(grads, max_norm=5.0)
print(f"Original norm: {math.sqrt(sum(g**2 for g in grads)):.2f}")
print(f"Clipped norm:  {math.sqrt(sum(g**2 for g in clipped)):.2f}")
print(f"Direction preserved: {[c/clipped[0] for c in clipped]} == {[g/grads[0] for g in grads]}")
```

### NaN/Inf 检测

```python
def check_tensor(name, values):
    has_nan = any(math.isnan(v) for v in values)
    has_inf = any(math.isinf(v) for v in values)
    if has_nan or has_inf:
        print(f"WARNING {name}: nan={has_nan} inf={has_inf}")
        return False
    return True

check_tensor("good", [1.0, 2.0, 3.0])
check_tensor("bad",  [1.0, float('nan'), 3.0])
check_tensor("ugly", [1.0, float('inf'), 3.0])
```

完整实现见 `code/numerical.py`，里面演示了所有边界情况。

## 拿去用

本节课产出：
- `code/numerical.py`，含稳定 softmax、log-sum-exp、交叉熵、梯度检查和混合精度模拟
- `outputs/prompt-numerical-debugger.md`，用于诊断训练中的 NaN/Inf 和数值问题

这些稳定实现会在阶段 3 构建训练循环时、以及阶段 4 实现注意力机制时再次出现。

## 练习

1. **灾难性抵消。** 在 float32 下用朴素公式 `E[x^2] - E[x]^2` 计算 [1000000.0, 1000001.0, 1000002.0] 的方差。然后用 Welford 的在线算法计算它。把误差和真实方差（0.6667）对比。

2. **精度狩猎。** 在 Python 里找出最小的正 float32 值 `x`，使 `1.0 + x == 1.0`。这就是机器 epsilon。验证它与 `numpy.finfo(numpy.float32).eps` 一致。

3. **Log-sum-exp 边界情况。** 用以下情形测试你的 `logsumexp_stable` 函数：(a) 所有值相等，(b) 一个值远大于其余，(c) 所有值非常负（-1000）。验证它在朴素版本失败处给出正确结果。

4. **给神经网络层做梯度检查。** 实现单个线性层 `y = Wx + b` 及其解析反向传播。用 `numerical_gradient` 对一个 3x2 权重矩阵验证正确性。

5. **损失缩放实验。** 用 float16 模拟训练：创建范围在 [1e-9, 1e-3] 的随机梯度，转成 float16，测量有多少比例变成零。然后应用损失缩放（乘以 1024），转成 float16，缩放回来，再次测量零的比例。

## 关键术语

| 术语 | 人们常说 | 它实际指什么 |
|------|----------------|----------------------|
| IEEE 754 | "浮点标准" | 定义二进制浮点格式、舍入规则和特殊值（inf、nan）的国际标准。每个现代 CPU 和 GPU 都实现了它。 |
| 机器 epsilon | "精度极限" | 在给定浮点格式下使 1.0 + e != 1.0 的最小值 e。对 float32 约为 1.19e-7。 |
| 灾难性抵消 | "减法导致的精度损失" | 减去两个几乎相等的浮点数时，有效数字相消、舍入噪声主导结果。 |
| 上溢 | "数太大" | 结果超过最大可表示值变成 inf。exp(89) 让 float32 上溢。 |
| 下溢 | "数太小" | 结果比最小可表示正数更接近零，变成 0.0。exp(-104) 让 float32 下溢。 |
| Log-sum-exp 技巧 | "先减最大值" | 通过提出 exp(max(x)) 来计算 log(sum(exp(x)))，防止上溢和下溢。用于 softmax、交叉熵和对数概率运算。 |
| 稳定 softmax | "不会爆炸的 softmax" | 在做指数前减去 max(logits)。数值上结果相同，不可能上溢。 |
| 梯度检查 | "验证你的反向传播" | 把反向传播的解析梯度和有限差分的数值梯度对照，逮住实现 bug。 |
| 混合精度 | "前向 float16、反向 float32" | 对速度关键的运算用低精度浮点，对数值敏感的运算用高精度浮点。典型加速 2-3 倍。 |
| 损失缩放 | "防止梯度下溢" | 反向传播前把损失乘以一个大常数，让梯度留在 float16 的可表示范围里，再在更新权重前除以同一常数。 |
| bfloat16 | "Brain floating point" | Google 的 16 位格式，8 位指数（与 float32 同范围）和 7 位尾数（精度不如 float16）。训练首选。 |
| 梯度裁剪 | "给梯度范数封顶" | 缩放梯度向量使其范数不超过阈值。防止爆炸梯度毁掉权重。 |
| NaN | "非数" | 来自未定义运算（0/0、inf-inf、sqrt(-1)）的特殊浮点值。在后续所有算术里传播。 |
| Inf | "无穷" | 来自上溢或除以零的特殊浮点值。可组合产生 NaN（inf - inf、inf * 0）。 |
| 数值梯度 | "暴力求导数" | 通过求值 f(x+h) 和 f(x-h) 再除以 2h 来近似导数。慢，但用于验证可靠。 |

## 延伸阅读

- [What Every Computer Scientist Should Know About Floating-Point Arithmetic (Goldberg 1991)](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html) -- 权威参考，密集但完整
- [Mixed Precision Training (Micikevicius et al., 2018)](https://arxiv.org/abs/1710.03740) -- 为 float16 训练引入损失缩放的 NVIDIA 论文
- [AMP: Automatic Mixed Precision (PyTorch docs)](https://pytorch.org/docs/stable/amp.html) -- PyTorch 混合精度的实用指南
- [bfloat16 format (Google Cloud TPU docs)](https://cloud.google.com/tpu/docs/bfloat16) -- Google 为 TPU 选这个格式的原因
- [Kahan Summation (Wikipedia)](https://en.wikipedia.org/wiki/Kahan_summation_algorithm) -- 减少浮点求和舍入误差的算法
