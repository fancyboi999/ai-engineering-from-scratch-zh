# 梯度检查点与激活重算

> 反向传播保留每个中间激活。在 70B 参数、128K context 下，那是每 rank 3 TB 的激活。检查点用 FLOPs 换内存：重算而不保存。问题是丢哪些段，答案不是 "全部"。

**类型：** Build
**语言：** Python（配合 numpy，可选 torch）
**前置要求：** 阶段 10 第 04 课（预训练 Mini-GPT），阶段 10 第 05 课（规模化与分布式）
**预计时间：** ~70 分钟

## 问题背景

训练一个 transformer 为每一层存反向时被微分的每个操作的输入：注意力输入、Q/K/V 投影、softmax 输出、FFN 输入、norm 输出和残差流。对一个 hidden size 为 `d`、序列长度 `L`、batch `B` 的层，这是每层约 `12 * B * L * d` 个 float 的量级。

对 `d=8192, L=8192, B=1`，那是 BF16 下每层 800 MB。一个 64 层模型是 51 GB 激活——而且这还没乘以微批次大小、没加上注意力 softmax 的中间量（每头 `L^2`）、没算上张量并行的部分拷贝。

两面夹击的账单：BF16 权重加优化器状态也许能塞进 80GB，但激活把你推过去了。梯度检查点（即激活重算）是标准修法。丢掉大部分激活；反向时重做前向把它们取回来。代价：额外 FLOPs。收益：内存按检查点段数对总层数的比例下降。

朴素地做，检查点每步大约多花 33% 的前向 FLOPs。做得好——按 Korthikanti et al. 的 "智能选择" 做选择性检查点——你以低于 5% 的 FLOP 开销省下 5 倍内存。而有了 FP8 matmul、FSDP 卸载和专家并行 MoE，这真的要紧：内存和浪费的算力你都付不起。

## 核心概念

### 反向实际需要什么

`output = layer(input)`。反向想要 `grad_input` 和 `grad_params`。要算它们它需要：

- `input`（对线性层算 `grad_params = input.T @ grad_output`）
- 一些激活导数中间量（ReLU/GELU/softmax 的导数取决于激活值）

前向传播自动把这些存进 autograd 图。每个 `tensor.retain_grad()` 和每个需要其输入的操作都保留一个引用。

### 朴素的全检查点

把网络切成 `N` 段。前向时，只存每段的 *输入*。反向需要中间量时，重跑那段的前向把它们物化出来，再微分。

例子：32 层 transformer 切成 32 段，每段 1 层。

- 内存：32 个层输入（小）vs 32 * （每层激活体积）（巨大）。
- 额外计算：每段多一次前向，即总共多约 33% 的前向 FLOPs（因为反向是 2 倍前向，完整步骤变成 1 + 1 + 2 = 4 个单位而不是 1 + 2 = 3）。

这是最初 Chen et al. 2016 的配方：每 `sqrt(L)` 层一个检查点来平衡内存和计算。对 L=64，那是 8 个检查点。

### 选择性检查点（Korthikanti 2022）

不是所有激活成本一样。注意力 softmax 输出是 `B*L*L*heads`，随序列长度 *二次* 增长。FFN 隐藏激活是 `B*L*4d`，线性增长。对长序列，softmax 主导。

选择性检查点保留存储便宜的激活（线性投影、残差），只重算昂贵的（注意力）。你付最少的 FLOPs 去重算，但省下 O(L^2) 的内存。

Megatron-Core 把这实现为 "选择性" 激活重算。在大多数 2024+ 前沿训练运行里使用。

### 卸载

重算的替代方案：在前向和反向之间把激活运到 CPU 内存。需要 PCIe 带宽；当空闲带宽超过重物化成本时有益。混合策略很常见：一些层检查点，另一些卸载。

FSDP2 把卸载作为一流选项。卸载在 GPU 被内存瓶颈卡住但 CPU-GPU 传输有余量时大放异彩。

### 重算成本模型

在 `L` 层中每 `k` 层做朴素检查点的每步 FLOPs：

```
flops_fwd_normal = L * f_layer
flops_bwd_normal = 2 * L * f_layer
flops_total_normal = 3 * L * f_layer

flops_fwd_ckpt = L * f_layer
flops_recompute = L * f_layer  # 段里每层一次额外前向
flops_bwd_ckpt = 2 * L * f_layer
flops_total_ckpt = 4 * L * f_layer
overhead = 4 / 3 - 1 = 0.33 = 33%
```

用选择性检查点你只重算注意力核，不是整层：

```
flops_recompute_selective = L * f_attention ~= L * f_layer * 0.15
overhead_selective = (3 + 0.15) / 3 - 1 = 0.05 = 5%
```

### 内存节省模型

每层激活体积：`A`。对 `L` 层，总激活内存：`L * A`。

全检查点（段大小 1）：只存 `L * input_volume`（标准 transformer 约 `L * 1/10 A`）。省下约 `9 * L * A * 1/10`。

每 `k` 层检查点：存 `L/k * A` 加活跃段内 `k-1` 层的量。

在 `k = sqrt(L)` 时，内存和重算成本都随 `sqrt(L)` 缩放——对等成本层的最优权衡。

### 什么时候不检查点

- 一个已在途的流水线阶段的最内层。它们反正得完成。
- 如果第一层和最后一层主导该阶段的计算（在 transformer 里罕见）。
- 已经用 FlashAttention 的注意力核——Flash 已经快速重算 softmax 了，所以额外的层级检查点在它之上加不了多少。

### 实现模式

1. **函数封装：** 把一段包进 `torch.utils.checkpoint.checkpoint(fn, input)`。PyTorch 只存 `input`，反向时重算其他一切。

2. **基于装饰器：** 把层标为可检查点；训练器在配置时决定哪些段被包装。

3. **手动显式重算：** 自己写反向传播，调一个用存下的输入复制前向的自定义 `recompute_forward`。

三者给出相同的功能结果。封装是标准惯用法。

### 和 TP / PP / FP8 的交互

- **张量并行：** 检查点输入在重算时必须被收集或重新分散；处理通信成本。
- **流水线并行：** 典型模式是检查点每个流水线阶段的前向，这样逆序微批次能复用激活内存。
- **FP8 重算：** 重算时更新的 amax 历史必须和原始前向的匹配，否则 FP8 缩放漂移。大多数框架快照这个缩放。

```figure
activation-recompute
```

## 动手构建

### 第 1 步：一个带段的玩具模型

```python
import numpy as np


def linear_forward(x, w, b):
    return x @ w + b


def relu(x):
    return np.maximum(x, 0)


def layer_forward(x, w1, b1, w2, b2):
    h = relu(linear_forward(x, w1, b1))
    return linear_forward(h, w2, b2)


def model_forward(x, params):
    activations = [x]
    h = x
    for w1, b1, w2, b2 in params:
        h = layer_forward(h, w1, b1, w2, b2)
        activations.append(h)
    return h, activations
```

### 第 2 步：需要所有激活的朴素反向

```python
def model_backward(grad_output, activations, params):
    grads = [None] * len(params)
    g = grad_output
    for i in range(len(params) - 1, -1, -1):
        w1, b1, w2, b2 = params[i]
        x_in = activations[i]
        h_pre = linear_forward(x_in, w1, b1)
        h = relu(h_pre)
        gh = g @ w2.T
        gw2 = h.T @ g
        gb2 = g.sum(axis=0)
        g_pre = gh * (h_pre > 0)
        gx = g_pre @ w1.T
        gw1 = x_in.T @ g_pre
        gb1 = g_pre.sum(axis=0)
        grads[i] = (gw1, gb1, gw2, gb2)
        g = gx
    return g, grads
```

### 第 3 步：每 k 层检查点的内存

```python
def model_forward_checkpointed(x, params, k=4):
    saved_inputs = [x]
    h = x
    for i, (w1, b1, w2, b2) in enumerate(params):
        h = layer_forward(h, w1, b1, w2, b2)
        if (i + 1) % k == 0:
            saved_inputs.append(h)
    return h, saved_inputs


def model_backward_checkpointed(grad_output, saved_inputs, params, k=4):
    grads = [None] * len(params)
    g = grad_output
    segments = [(j * k, min((j + 1) * k, len(params))) for j in range(len(saved_inputs))]
    for seg_idx in range(len(saved_inputs) - 1, -1, -1):
        start, end = segments[seg_idx]
        if start >= end:
            continue
        x_in = saved_inputs[seg_idx]
        _, seg_acts = model_forward(x_in, params[start:end])
        g, seg_grads = model_backward(g, seg_acts, params[start:end])
        for j, gr in enumerate(seg_grads):
            grads[start + j] = gr
    return g, grads
```

### 第 4 步：成本模型

```python
def checkpoint_cost(n_layers, segment_size, flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }


def selective_checkpoint_cost(n_layers, attention_fraction=0.15,
                              flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * attention_fraction * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }
```

### 第 5 步：内存估算器

```python
def activation_memory_mb(n_layers, hidden=8192, seq=8192,
                        batch=1, bytes_per_value=2):
    per_layer = 12 * batch * seq * hidden * bytes_per_value
    return n_layers * per_layer / 1e6


def memory_after_checkpoint(n_layers, segment_size, hidden=8192,
                           seq=8192, batch=1, bytes_per_value=2):
    n_seg = max(1, n_layers // segment_size)
    saved = (n_seg + segment_size) * 1 * batch * seq * hidden * bytes_per_value
    return saved / 1e6
```

### 第 6 步：最优段大小

```python
def optimal_segment(n_layers):
    return int(round(np.sqrt(n_layers)))
```

### 第 7 步：选择性检查点决策

```python
def should_recompute(layer_type, activation_bytes, recompute_flops_ratio):
    if layer_type == "attention" and activation_bytes > 100 * 1e6:
        return True
    if layer_type == "ffn" and activation_bytes > 500 * 1e6:
        return recompute_flops_ratio < 0.1
    return False
```

## 实际使用

- **torch.utils.checkpoint**：`from torch.utils.checkpoint import checkpoint`——PyTorch 里的经典封装。包装一个函数；只存输入，反向时重算。
- **Megatron-Core 激活重算**：支持 `selective`、`full` 和 `block` 模式。2024+ 前沿训练的标准。
- **FSDP2 卸载**：在 FSDP2 里用 `module.to_empty(device="cpu")` 配 `offload_policy`，把激活分片到 CPU 而不重算。
- **DeepSpeed ZeRO-Offload**：优化器状态和激活的 CPU 卸载，和检查点互补。

## 拿去用

本节课产出 `outputs/prompt-activation-recompute-policy.md`——一个 prompt，接收你的模型配置（层数、hidden、seq、batch）和可用 GPU 内存，输出一个逐层重算策略（无 / 选择性 / 全 / 卸载）。

## 练习

1. 验证正确性。跑 `model_forward` + `model_backward`（全激活）vs `model_forward_checkpointed` + `model_backward_checkpointed`（分段）。参数梯度必须到机器精度相同。

2. 把段大小 `k` 从 1 扫到 `L`。画出 FLOP 开销和内存。找出曲线的拐点。

3. 实现选择性检查点：存注意力模块的输入但不存它的中间量。对一个 seq=8192 的 32 层模型，测量它相对全层检查点的 FLOP 开销。

4. 加上卸载。把段输入存到一个模拟的 "CPU 缓冲"（一个单独的列表）。把 "PCIe 带宽" 测量为字节/时间，找出卸载和重算之间的平衡点。

5. 用和不用 `torch.utils.checkpoint` 给一个真实的 PyTorch transformer 做基准测试。测量内存（经 `torch.cuda.max_memory_allocated`）和步进时间。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 梯度检查点 | "重做前向来省内存" | 只存段输入；反向时重算中间量以得到支撑梯度的张量 |
| 激活重算 | "和检查点一样" | 同一技术的 HPC 风味名字 |
| 段大小（k） | "每检查点多少层" | 其中间量被一起丢弃并重物化的层数 |
| 选择性检查点 | "Korthikanti 的诀窍" | 只重算存储昂贵的激活（注意力 softmax）；保留便宜的 |
| 全检查点 | "朴素版本" | 在每段重算每层的中间量 |
| 块检查点 | "粗粒度" | 检查点整个 transformer 块；最大粒度 |
| FLOP 开销 | "计算税" | 每步额外 FLOPs = （重算 FLOPs）/（前向 + 反向 FLOPs）；朴素 33%，选择性 5% |
| 激活卸载 | "运到 CPU" | 在前向->反向间把激活移到 CPU 内存；重算的替代方案 |
| sqrt-L 规则 | "经典最优" | 对等成本层，最优检查点间距是 sqrt(L) 层 |
| 注意力-softmax 体积 | "O(L^2) 问题" | L^2 * heads * batch 个 float；在长 context 下主导激活内存 |

## 延伸阅读

- [Chen et al., 2016 -- "Training Deep Nets with Sublinear Memory Cost"](https://arxiv.org/abs/1604.06174) -- 把梯度检查点形式化的原始论文
- [Korthikanti et al., 2022 -- "Reducing Activation Recomputation in Large Transformer Models"](https://arxiv.org/abs/2205.05198) -- 选择性激活重算和形式化成本分析
- [Pudipeddi et al., 2020 -- "Training Large Neural Networks with Constant Memory using a New Execution Algorithm"](https://arxiv.org/abs/2002.05645) -- 经反向模式重物化的替代常数内存方法
- [Ren et al., 2021 -- "ZeRO-Offload: Democratizing Billion-Scale Model Training"](https://arxiv.org/abs/2101.06840) -- 规模化的激活卸载
- [PyTorch torch.utils.checkpoint docs](https://pytorch.org/docs/stable/checkpoint.html) -- 标准 API
- [Megatron-Core activation recomputation documentation](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/features/memory_optimizations.html) -- 选择性、全和块模式
