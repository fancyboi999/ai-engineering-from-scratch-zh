# 量化：把模型塞进去

> 一个 70B 模型在 FP16 下要 140GB。光权重就要两张 A100。量化到 FP8：一张 80GB GPU。INT4：一台 MacBook。

**类型：** Build
**语言：** Python（配合 numpy）
**前置要求：** 阶段 10，第 01-10 课（从零构建 LLM）
**预计时间：** ~120 分钟

## 学习目标

- 实现从 FP16 到 INT8 和 INT4 的对称和非对称量化，包括 per-tensor 和 per-channel 缩放
- 计算量化带来的显存节省，并判断哪种精度能塞进给定 GPU 的显存
- 解释训练后量化（PTQ）和量化感知训练（QAT）的区别
- 用 GPTQ 或 AWQ 量化一个真实模型，并在基准上测量精度-显存的权衡

## 问题背景

Llama 3 70B 有 700 亿参数。每个参数是一个 16 位浮点数。那是 1400 亿字节。140GB。单张 A100 有 80GB 显存。你连权重都加载不进去，更别说在单张 GPU 上推理了。光是服务一个模型，你就需要两张各 2 美元/小时的 A100。

但每个参数 16 位是浪费的。神经网络里大多数权重都聚在零附近。FP16 的完整动态范围（从 0.000000059 到 65,504）几乎完全没用上。如果你测量 Llama 3 70B 里权重的实际分布，95% 落在 -0.1 和 +0.1 之间。你在烧 16 位去表示本可以塞进 4 位的值。

量化用低精度数字替换高精度数字。FP16 到 FP8 把显存砍一半。FP16 到 INT4 砍到四分之一。那个 140GB 的模型变成 35GB。它能塞进单张消费级 GPU。推到 2 位量化（激进、有损，但对某些任务可用），同一个模型就跑在一台 16GB 笔记本上。

代价是精度。你每去掉一位都摧毁信息。问题是你损失多少精度、损失在哪。一个量化得当的 INT4 模型在大多数基准上保留原模型 95-99% 的质量。一个朴素量化到 INT4 的模型能把整个模型毁掉。差别在于技术。

社区用 GPTQ 把 Llama 3 量化到 INT4 的结果显示，在 WikiText 上大约损失 1-2 个困惑度点。Mistral 发布了 Mixtral 8x22B 的 FP8 checkpoint，在 MMLU 上没有可测量的质量损失。GGUF 格式驱动 llama.cpp，在 M 系列芯片的 MacBook 上跑 70B 模型。量化不是个 hack。它是每个大于 7B 的模型的标准部署路径。

## 核心概念

### 数字格式：每一位干什么

每个浮点数有三部分：符号、指数和尾数（也叫有效数字）。符号是一位。指数决定范围（数能多大或多小）。尾数决定精度（你能得到多少位小数）。

```
FP32:  [1 sign] [8 exponent] [23 mantissa]  = 32 bits
FP16:  [1 sign] [5 exponent] [10 mantissa]  = 16 bits
BF16:  [1 sign] [8 exponent] [7  mantissa]  = 16 bits
FP8:   [1 sign] [4 exponent] [3  mantissa]  = 8  bits (E4M3)
FP8:   [1 sign] [5 exponent] [2  mantissa]  = 8  bits (E5M2)
INT8:  [1 sign] [7 value]                   = 8  bits (uniform steps)
INT4:  [1 sign] [3 value]                   = 4  bits (16 levels total)
```

**FP32** 是全精度。23 个尾数位给你大约 7 位十进制精度。范围：大约 1.2 x 10^-38 到 3.4 x 10^38。训练曾经只在 FP32 里进行。对累加（矩阵乘法时的滑动求和）它仍然如此。

**FP16** 把位数减半。10 个尾数位给约 3.3 位十进制。指数缩到 5 位，大幅减小范围（最大值 ~65,504）。这对权重（聚在零附近）没问题，但对训练时可能飙升的激活和梯度很危险。FP16 训练需要损失缩放来防止下溢。

**BF16**（Brain Float 16）保留 FP32 的 8 位指数，但把尾数缩到 7 位。和 FP32 相同的范围，比 FP16 更低的精度。Google 专门为深度学习设计了它。直觉是：对神经网络而言，范围比精度更重要。一个 10^-20 的梯度在 FP16 里下溢到零，在 BF16 里能存活。一个 0.07342 的权重在 BF16 里舍入到 0.0734，足够接近。每次现代训练都用 BF16 或 BF16/FP32 混合。

**FP8** 有两种口味。E4M3（4 指数，3 尾数）用于推理时的权重和激活。E5M2（5 指数，2 尾数）用于训练时的梯度，那里范围比精度更重要。在 H100 GPU 上的 FP8 推理相比 FP16 实现 30-50% 加速，质量损失可忽略。

**INT8** 是整数格式。没有指数，没有尾数。就是从 -128 到 127 的 256 个均匀间隔的值。你需要一个缩放因子把浮点权重映射进这个范围。优点：整数运算比浮点运算更快、更省电。INT8 矩阵乘法在 A100 上跑 624 TOPS，对比 FP16 的 312 TFLOPS。

**INT4** 推得更远。只有 16 个可能的值。缩放因子挑大梁。质量完全取决于你怎么选缩放、量化哪些权重。最先进的 INT4 方法（GPTQ、AWQ）保留 95%+ 的原模型质量。

```mermaid
graph LR
    subgraph Formats["数值格式全景"]
        direction TB
        FP32["FP32\n32 位\n4 字节/参数\n训练黄金标准"]
        BF16["BF16\n16 位\n2 字节/参数\n训练默认"]
        FP16["FP16\n16 位\n2 字节/参数\n推理基线"]
        FP8["FP8\n8 位\n1 字节/参数\n快 30-50%"]
        INT8["INT8\n8 位\n1 字节/参数\n吞吐量 2 倍"]
        INT4["INT4\n4 位\n0.5 字节/参数\n压缩 4 倍"]
    end

    FP32 -->|"训练"| BF16
    BF16 -->|"推理"| FP16
    FP16 -->|"H100 原生"| FP8
    FP16 -->|"服务器部署"| INT8
    FP16 -->|"边缘/笔记本"| INT4

    style FP32 fill:#1a1a2e,stroke:#0f3460,color:#fff
    style BF16 fill:#1a1a2e,stroke:#0f3460,color:#fff
    style FP16 fill:#1a1a2e,stroke:#ffa500,color:#fff
    style FP8 fill:#1a1a2e,stroke:#51cf66,color:#fff
    style INT8 fill:#1a1a2e,stroke:#51cf66,color:#fff
    style INT4 fill:#1a1a2e,stroke:#e94560,color:#fff
```

### 量化怎么工作

核心操作很简单。拿一个浮点值的张量，找一个缩放因子，相乘，舍入到最近的整数，然后存整数加缩放因子。

**量化：**
```
scale = max(abs(tensor)) / max_int_value
quantized = round(tensor / scale)
```

**反量化：**
```
reconstructed = quantized * scale
```

对对称范围（-127 到 127）的 INT8：
```
scale = max(abs(tensor)) / 127
quantized = clamp(round(tensor / scale), -128, 127)
```

误差是舍入误差。每个值最多偏 `scale / 2`。一层的总误差取决于你有多少权重，以及模型对那些权重扰动有多敏感。

**Per-tensor vs per-channel 量化。** Per-tensor 对整个权重矩阵用一个缩放因子。简单但有损：如果一列有大值、另一列有小值，小值就丢了大部分精度。Per-channel 每个输出通道（权重矩阵的每行或每列）用一个缩放因子。开销更大（你存 N 个缩放因子而不是 1 个），但质量好得多。每个生产量化方法都用 per-channel 或更细的粒度。

**非对称量化**加一个零点偏移：`quantized = round(tensor / scale) + zero_point`。这处理不以零为中心的分布。比如 ReLU 激活总是非负的。对称量化把整数范围的一半浪费在永远不出现的负值上。非对称量化把实际范围 [min, max] 映射到完整的整数范围。

### 敏感度层级

模型里不是每样东西都同等耐受量化。有一个清晰的层级。

**权重（最鲁棒）。** 模型权重在训练时变化缓慢，遵循一个大致以零为中心的高斯分布。它们量化得好。带 per-channel 缩放的 INT8 权重产出几乎无损的结果。INT4 需要更精巧的方法，但能用。

**激活（中等敏感）。** 激活是推理时流过网络的中间值。它们的动态范围比权重宽，并且含离群值。单个注意力头可能产出比均值大 100 倍的激活值。这些离群值对模型质量至关重要。朴素地量化它们会摧毁信息。解决办法：把离群通道保留在更高精度（LLM.int8()）、用 per-token 或 per-channel 激活缩放。

**KV cache（高敏感）。** 键值缓存为之前所有 token 存注意力状态。在长 context 长度下，KV cache 主导显存。对一个 32K context 的 70B 模型，光 KV cache 在 FP16 下就是 40GB。把 KV cache 量化到 FP8 或 INT8 省下巨量显存，但任何误差都会在所有未来的注意力计算里累积。质量影响随序列长度放大。

**注意力 logits（最敏感）。** 注意力里的 softmax 对它输入的小变化高度敏感。pre-softmax logit 上 0.01 的量化误差就能显著移动注意力分布。大多数量化方案即使其他一切都量化了，也把注意力计算保留在更高精度（FP16 或 BF16）。

```mermaid
graph TD
    subgraph Sensitivity["量化敏感度（低 → 高）"]
        direction LR
        W["权重\n高斯分布，接近零\nINT4 效果好"]
        A["激活\n范围更宽，有离群值\nINT8 需谨慎"]
        KV["KV Cache\n误差会累积\nFP8 或 INT8"]
        ATT["注意力 logits\nSoftmax 放大误差\n保留 FP16"]
    end

    W -->|"安全"| A
    A -->|"谨慎"| KV
    KV -->|"危险"| ATT

    style W fill:#1a1a2e,stroke:#51cf66,color:#fff
    style A fill:#1a1a2e,stroke:#ffa500,color:#fff
    style KV fill:#1a1a2e,stroke:#e94560,color:#fff
    style ATT fill:#1a1a2e,stroke:#ff0000,color:#fff
```

### PTQ vs QAT

**训练后量化（PTQ）**量化一个已训练好的模型。不重训。你拿 FP16 权重，计算缩放因子，舍入，部署。快（几分钟到几小时）且便宜。对 INT8 和 FP8 效果好。对 INT4，朴素 PTQ 常常败得很惨，因为舍入误差累积。高级 PTQ 方法（GPTQ、AWQ）用校准数据来最小化量化误差。

**量化感知训练（QAT）**在训练时的前向传播里插入伪量化操作。模型学会把权重放在舍入误差小的地方。梯度用直通估计器（STE）流过伪量化：假装舍入操作的梯度是 1。QAT 产出比 PTQ 更好的 INT4 和 INT2 模型，但需要一次完整训练。Google 用 QAT 做 Gemini 的高效服务。Meta 为某些 Llama 部署目标用了 QAT。

| 方面 | PTQ | QAT |
|--------|-----|-----|
| 成本 | 几分钟到几小时 | 一次完整训练 |
| INT8 下的质量 | 优秀（< 0.1% 损失） | 优秀 |
| INT4 下的质量 | 用 GPTQ/AWQ 良好（1-3% 损失） | 更好（< 1% 损失） |
| INT2 下的质量 | 差 | 对某些任务可用 |
| 校准数据 | 128-1024 个例子 | 完整训练数据集 |
| 何时用 | 部署、迭代 | 在低位宽下追求最高质量 |

### GPTQ、AWQ、GGUF

**GPTQ（GPT Quantization）**是一种一次性 PTQ 方法。它一次量化一层权重，用一个小校准数据集（典型 128 个例子）来测量 Hessian（关于输出对每个权重有多敏感的二阶信息）。Hessian 说重要的权重得到更仔细的量化。GPTQ 是第一个让 INT4 量化对 LLM 实用的方法。Hugging Face 上的 TheBloke 通过发布数百个模型的量化版本让 GPTQ 流行起来。

**AWQ（Activation-Aware Weight Quantization）**观察到一小部分权重（约 1%）因为和大激活值相乘而格外重要。AWQ 用校准数据识别这些显著权重，在量化前把它们放大（然后把对应的激活缩小）。这让重要权重处于一个 INT4 量化准确的范围。AWQ 通常匹配或略胜 GPTQ 质量，同时应用起来快 1.5-2 倍。

**GGUF（GPT-Generated Unified Format）**是 llama.cpp 及其生态用的文件格式。它支持混合量化：不同层用不同位宽。第一层和最后一层（embedding 和输出头）通常保留在更高精度。中间层用 INT4 或 INT3。GGUF 文件是自包含的：权重、tokenizer、元数据全在一个文件里。这个格式为 CPU 推理和 Apple Silicon 设计，把整个模型加载进内存、在 CPU 或 Metal GPU 上跑矩阵乘法是标准路径。Q4_K_M 是最流行的 GGUF 量化变体，平衡质量和大小。

```mermaid
graph TD
    subgraph Methods["量化方法"]
        direction TB
        GPTQ_["GPTQ\nHessian 引导\n逐层优化\nHuggingFace 上流行"]
        AWQ_["AWQ\n激活感知\n显著权重缩放\n比 GPTQ 快 1.5-2 倍"]
        GGUF_["GGUF\n混合精度\nCPU + Metal 优化\nllama.cpp 生态"]
    end

    subgraph Use["最适合"]
        GPU["GPU 推理\n(CUDA, ROCm)"]
        EDGE["边缘 / 笔记本\n(CPU, Metal)"]
    end

    GPTQ_ --> GPU
    AWQ_ --> GPU
    GGUF_ --> EDGE

    style GPTQ_ fill:#1a1a2e,stroke:#ffa500,color:#fff
    style AWQ_ fill:#1a1a2e,stroke:#51cf66,color:#fff
    style GGUF_ fill:#1a1a2e,stroke:#0f3460,color:#fff
```

### 质量度量

你怎么知道你量化后的模型还好不好？

**困惑度。** 最常见的指标。越低越好。在一个留出数据集上（WikiText-2 是标准）为原模型和量化模型都计算困惑度。差值告诉你量化摧毁了多少信息。经验法则：delta < 0.5 优秀，0.5-1.0 良好，1.0-2.0 对大多数任务可接受，> 2.0 意味着出问题了。

**任务特定基准。** 在 MMLU、HumanEval、GSM8K 或你自定义的 eval 套件上跑量化模型。和原模型对比。量化对不同能力影响不均。数学和代码任务对精度损失比通用知识更敏感。

**输出对比。** 用两个模型在相同 prompt 上生成回复并对比。LLM-as-judge（第 10 课）在这里效果好。计算一个胜率：量化模型在多大比例的 prompt 上匹配或超过原模型？

**延迟和吞吐。** 量化的存在就是为了让模型更快更便宜。测量每秒 token 数、首 token 时间和显存用量。一个比原模型还慢的量化模型，比没用还糟。

| 模型 | 格式 | 大小 | 困惑度（WikiText-2） | MMLU | Tokens/sec（A100） |
|-------|--------|------|------------------------|------|-------------------|
| Llama 3 70B | FP16 | 140GB | 3.12 | 79.5% | 38 |
| Llama 3 70B | FP8 | 70GB | 3.14 | 79.3% | 55 |
| Llama 3 70B | GPTQ INT4 | 35GB | 4.32 | 77.8% | 72 |
| Llama 3 70B | AWQ INT4 | 35GB | 4.18 | 78.1% | 75 |
| Llama 3 70B | GGUF Q4_K_M | 40GB | 4.25 | 77.9% | 28（CPU） |

模式是：FP8 几乎免费。INT4 花 1-2 个 MMLU 点，但吞吐翻倍、显存减到四分之一。对几乎每个部署，这笔权衡都值。

### 真实数字

H100 上 FP16 到 FP8：推理加速 30-50%，质量损失 < 0.1%。这是想都不用想的量化。每个 H100 部署都该用它。

FP16 到 INT8（LLM.int8()）：显存减半，质量损失 < 0.5%。这种混合精度方法把离群特征保留在 FP16，其他一切量化到 INT8。

FP16 到 INT4（GPTQ/AWQ）：显存减到四分之一，质量损失 1-3%，视模型和方法而定。让 70B 模型能跑在单张 48GB GPU 上。

FP16 到 INT4（GGUF Q4_K_M）：显存减到 1/3.5，质量损失 1-2%。为 CPU 推理优化。Q4_K_M 下的 70B 模型约 40GB，在 64GB 的 M3 Max 上跑 10-15 token/秒。

FP16 到 INT2：显存减到 1/8，质量损失 5-15%。只对你能容忍退化的特定窄任务可行。研究前沿，对通用用途还没到生产就绪。

```figure
quantization
```

## 动手构建

### 第 1 步：数字格式表示

构建每种格式的位级表示，看清符号、指数和尾数到底干什么。

```python
import numpy as np


def float_to_fp32_bits(value):
    bits = np.float32(value).view(np.uint32)
    sign = (bits >> 31) & 1
    exponent = (bits >> 23) & 0xFF
    mantissa = bits & 0x7FFFFF
    return {"sign": int(sign), "exponent": int(exponent), "mantissa": int(mantissa),
            "exponent_bits": format(int(exponent), '08b'),
            "mantissa_bits": format(int(mantissa), '023b'),
            "value": float(value),
            "actual_exponent": int(exponent) - 127}


def float_to_fp16_bits(value):
    fp16 = np.float16(value)
    bits = fp16.view(np.uint16)
    sign = (bits >> 15) & 1
    exponent = (bits >> 10) & 0x1F
    mantissa = bits & 0x3FF
    return {"sign": int(sign), "exponent": int(exponent), "mantissa": int(mantissa),
            "exponent_bits": format(int(exponent), '05b'),
            "mantissa_bits": format(int(mantissa), '010b'),
            "value": float(fp16),
            "actual_exponent": int(exponent) - 15}


def float_to_bf16_bits(value):
    fp32_bits = np.float32(value).view(np.uint32)
    bf16_bits = (fp32_bits >> 16).astype(np.uint16)
    sign = (bf16_bits >> 15) & 1
    exponent = (bf16_bits >> 7) & 0xFF
    mantissa = bf16_bits & 0x7F
    reconstructed = np.uint32(bf16_bits.astype(np.uint32) << 16).view(np.float32)
    return {"sign": int(sign), "exponent": int(exponent), "mantissa": int(mantissa),
            "exponent_bits": format(int(exponent), '08b'),
            "mantissa_bits": format(int(mantissa), '07b'),
            "value": float(reconstructed),
            "actual_exponent": int(exponent) - 127}


def simulate_fp8_e4m3(value):
    sign = 1 if value < 0 else 0
    abs_val = abs(value)
    max_val = 448.0
    abs_val = min(abs_val, max_val)
    if abs_val == 0:
        return {"sign": sign, "exponent": 0, "mantissa": 0, "value": 0.0,
                "exponent_bits": "0000", "mantissa_bits": "000"}
    exp = int(np.floor(np.log2(abs_val)))
    exp = max(-6, min(8, exp))
    mantissa_val = abs_val / (2.0 ** exp) - 1.0
    mantissa_quant = round(mantissa_val * 8) / 8
    mantissa_quant = max(0, min(0.875, mantissa_quant))
    reconstructed = (1.0 + mantissa_quant) * (2.0 ** exp)
    if sign:
        reconstructed = -reconstructed
    mantissa_int = int(round(mantissa_quant * 8))
    return {"sign": sign, "exponent": exp + 7, "mantissa": mantissa_int,
            "exponent_bits": format(exp + 7, '04b'),
            "mantissa_bits": format(mantissa_int, '03b'),
            "value": float(reconstructed),
            "actual_exponent": exp}


def display_format_comparison(value):
    fp32 = float_to_fp32_bits(value)
    fp16 = float_to_fp16_bits(value)
    bf16 = float_to_bf16_bits(value)
    fp8 = simulate_fp8_e4m3(value)

    print(f"\n  Value: {value}")
    print(f"  {'Format':<8} {'Stored Value':>14} {'Error':>12} {'Sign':>5} {'Exp Bits':>10} {'Man Bits':>25}")
    print(f"  {'-'*76}")
    print(f"  {'FP32':<8} {fp32['value']:>14.6f} {abs(fp32['value'] - value):>12.8f} {fp32['sign']:>5} {fp32['exponent_bits']:>10} {fp32['mantissa_bits']:>25}")
    print(f"  {'FP16':<8} {fp16['value']:>14.6f} {abs(fp16['value'] - value):>12.8f} {fp16['sign']:>5} {fp16['exponent_bits']:>10} {fp16['mantissa_bits']:>25}")
    print(f"  {'BF16':<8} {bf16['value']:>14.6f} {abs(bf16['value'] - value):>12.8f} {bf16['sign']:>5} {bf16['exponent_bits']:>10} {bf16['mantissa_bits']:>25}")
    print(f"  {'FP8e4m3':<8} {fp8['value']:>14.6f} {abs(fp8['value'] - value):>12.8f} {fp8['sign']:>5} {fp8['exponent_bits']:>10} {fp8['mantissa_bits']:>25}")
```

### 第 2 步：对称量化（Per-Tensor 和 Per-Channel）

基本的量化操作。Per-tensor 对整个矩阵用一个缩放。Per-channel 每行或每列用一个缩放。

```python
def quantize_symmetric(tensor, num_bits=8):
    qmin = -(2 ** (num_bits - 1))
    qmax = 2 ** (num_bits - 1) - 1
    abs_max = np.max(np.abs(tensor))
    if abs_max == 0:
        return np.zeros_like(tensor, dtype=np.int32), 1.0
    scale = abs_max / qmax
    quantized = np.clip(np.round(tensor / scale), qmin, qmax).astype(np.int32)
    return quantized, float(scale)


def dequantize_symmetric(quantized, scale):
    return quantized.astype(np.float64) * scale


def quantize_per_channel(tensor, num_bits=8, axis=0):
    qmin = -(2 ** (num_bits - 1))
    qmax = 2 ** (num_bits - 1) - 1

    if axis == 0:
        abs_max = np.max(np.abs(tensor), axis=1, keepdims=True)
    else:
        abs_max = np.max(np.abs(tensor), axis=0, keepdims=True)

    abs_max = np.where(abs_max == 0, 1.0, abs_max)
    scales = abs_max / qmax
    quantized = np.clip(np.round(tensor / scales), qmin, qmax).astype(np.int32)
    return quantized, scales.squeeze()


def dequantize_per_channel(quantized, scales, axis=0):
    if axis == 0:
        return quantized.astype(np.float64) * scales.reshape(-1, 1)
    else:
        return quantized.astype(np.float64) * scales.reshape(1, -1)


def quantize_asymmetric(tensor, num_bits=8):
    qmin = 0
    qmax = 2 ** num_bits - 1
    t_min = np.min(tensor)
    t_max = np.max(tensor)
    if t_max == t_min:
        return np.zeros_like(tensor, dtype=np.int32), 1.0, 0
    scale = (t_max - t_min) / (qmax - qmin)
    zero_point = int(np.round(qmin - t_min / scale))
    zero_point = max(qmin, min(qmax, zero_point))
    quantized = np.clip(np.round(tensor / scale + zero_point), qmin, qmax).astype(np.int32)
    return quantized, float(scale), int(zero_point)


def dequantize_asymmetric(quantized, scale, zero_point):
    return (quantized.astype(np.float64) - zero_point) * scale
```

### 第 3 步：质量度量

测量量化摧毁了多少信息。原张量和重建张量之间的均方误差、信噪比和余弦相似度。

```python
def quantization_error(original, reconstructed):
    diff = original - reconstructed
    mse = float(np.mean(diff ** 2))
    rmse = float(np.sqrt(mse))
    max_error = float(np.max(np.abs(diff)))
    signal_power = float(np.mean(original ** 2))
    snr_db = 10 * np.log10(signal_power / max(mse, 1e-20))

    orig_flat = original.flatten()
    recon_flat = reconstructed.flatten()
    norm_orig = np.linalg.norm(orig_flat)
    norm_recon = np.linalg.norm(recon_flat)
    if norm_orig == 0 or norm_recon == 0:
        cosine_sim = 0.0
    else:
        cosine_sim = float(np.dot(orig_flat, recon_flat) / (norm_orig * norm_recon))

    return {"mse": mse, "rmse": rmse, "max_error": max_error,
            "snr_db": float(snr_db), "cosine_similarity": cosine_sim}


def compare_quantization_methods(tensor, num_bits=8):
    q_pt, s_pt = quantize_symmetric(tensor, num_bits)
    recon_pt = dequantize_symmetric(q_pt, s_pt)
    err_pt = quantization_error(tensor, recon_pt)

    q_pc, s_pc = quantize_per_channel(tensor, num_bits, axis=0)
    recon_pc = dequantize_per_channel(q_pc, s_pc, axis=0)
    err_pc = quantization_error(tensor, recon_pc)

    q_asym, s_asym, zp = quantize_asymmetric(tensor, num_bits)
    recon_asym = dequantize_asymmetric(q_asym, s_asym, zp)
    err_asym = quantization_error(tensor, recon_asym)

    print(f"\n  Quantization Comparison ({num_bits}-bit, tensor shape {tensor.shape}):")
    print(f"  {'Method':<20} {'MSE':>12} {'SNR (dB)':>10} {'Cosine Sim':>12} {'Max Error':>12}")
    print(f"  {'-'*68}")
    print(f"  {'Per-tensor sym':<20} {err_pt['mse']:>12.8f} {err_pt['snr_db']:>10.2f} {err_pt['cosine_similarity']:>12.8f} {err_pt['max_error']:>12.8f}")
    print(f"  {'Per-channel sym':<20} {err_pc['mse']:>12.8f} {err_pc['snr_db']:>10.2f} {err_pc['cosine_similarity']:>12.8f} {err_pc['max_error']:>12.8f}")
    print(f"  {'Asymmetric':<20} {err_asym['mse']:>12.8f} {err_asym['snr_db']:>10.2f} {err_asym['cosine_similarity']:>12.8f} {err_asym['max_error']:>12.8f}")

    return {"per_tensor": err_pt, "per_channel": err_pc, "asymmetric": err_asym}
```

### 第 4 步：位宽扫描

在不同位宽（2、3、4、8、16）下量化同一个张量，测量每个级别的质量。这准确显示出质量悬崖在哪。

```python
def bit_width_sweep(tensor):
    print(f"\n  Bit-Width Sweep (tensor shape {tensor.shape}):")
    print(f"  {'Bits':>6} {'Levels':>8} {'MSE':>14} {'SNR (dB)':>10} {'Cosine Sim':>12} {'Compression':>12}")
    print(f"  {'-'*64}")

    results = []
    for bits in [2, 3, 4, 8, 16]:
        q, s = quantize_per_channel(tensor, bits, axis=0)
        recon = dequantize_per_channel(q, s, axis=0)
        err = quantization_error(tensor, recon)
        levels = 2 ** bits
        compression = 32.0 / bits

        print(f"  {bits:>6} {levels:>8} {err['mse']:>14.8f} {err['snr_db']:>10.2f} {err['cosine_similarity']:>12.8f} {compression:>11.1f}x")
        results.append({"bits": bits, "levels": levels, "error": err, "compression": compression})

    return results
```

### 第 5 步：敏感度实验

模拟量化 transformer 的不同部分，测量哪些组件最敏感。这演示敏感度层级：权重 < 激活 < KV cache < 注意力。

```python
def simulate_transformer_layer(input_data, weights, kv_scale=1.0):
    hidden = input_data @ weights["qkv"]
    seq_len = hidden.shape[1]
    d_model = weights["qkv"].shape[1] // 3
    q, k, v = hidden[:, :, :d_model], hidden[:, :, d_model:2*d_model], hidden[:, :, 2*d_model:]

    attn_scores = (q @ k.transpose(0, 2, 1)) / np.sqrt(d_model) * kv_scale
    attn_max = np.max(attn_scores, axis=-1, keepdims=True)
    attn_exp = np.exp(attn_scores - attn_max)
    attn_weights = attn_exp / np.sum(attn_exp, axis=-1, keepdims=True)

    attn_output = attn_weights @ v
    output = attn_output @ weights["out"]
    return output, {"q": q, "k": k, "v": v, "attn_scores": attn_scores,
                    "attn_weights": attn_weights, "attn_output": attn_output}


def sensitivity_experiment(batch_size=2, seq_len=16, d_model=64, num_bits=8):
    np.random.seed(42)
    input_data = np.random.randn(batch_size, seq_len, d_model) * 0.1

    weights = {
        "qkv": np.random.randn(d_model, 3 * d_model) * (2.0 / d_model) ** 0.5,
        "out": np.random.randn(d_model, d_model) * (2.0 / d_model) ** 0.5,
    }

    baseline_output, baseline_internals = simulate_transformer_layer(input_data, weights)

    experiments = {}

    q_qkv, s_qkv = quantize_per_channel(weights["qkv"], num_bits, axis=0)
    q_out, s_out = quantize_per_channel(weights["out"], num_bits, axis=0)
    quantized_weights = {
        "qkv": dequantize_per_channel(q_qkv, s_qkv, axis=0),
        "out": dequantize_per_channel(q_out, s_out, axis=0),
    }
    weight_quant_output, _ = simulate_transformer_layer(input_data, quantized_weights)
    experiments["Weights only"] = quantization_error(baseline_output, weight_quant_output)

    _, fresh_internals = simulate_transformer_layer(input_data, weights)
    q_act, s_act = quantize_per_channel(
        fresh_internals["attn_output"].reshape(-1, d_model), num_bits, axis=0
    )
    quant_attn_out = dequantize_per_channel(q_act, s_act, axis=0).reshape(batch_size, seq_len, d_model)
    act_quant_output = quant_attn_out @ weights["out"]
    experiments["Activations only"] = quantization_error(baseline_output, act_quant_output)

    q_k, s_k = quantize_per_channel(fresh_internals["k"].reshape(-1, d_model), num_bits, axis=0)
    q_v, s_v = quantize_per_channel(fresh_internals["v"].reshape(-1, d_model), num_bits, axis=0)
    quant_k = dequantize_per_channel(q_k, s_k, axis=0).reshape(batch_size, seq_len, d_model)
    quant_v = dequantize_per_channel(q_v, s_v, axis=0).reshape(batch_size, seq_len, d_model)
    attn_scores_kv = (fresh_internals["q"] @ quant_k.transpose(0, 2, 1)) / np.sqrt(d_model)
    attn_max_kv = np.max(attn_scores_kv, axis=-1, keepdims=True)
    attn_exp_kv = np.exp(attn_scores_kv - attn_max_kv)
    attn_weights_kv = attn_exp_kv / np.sum(attn_exp_kv, axis=-1, keepdims=True)
    kv_quant_output = (attn_weights_kv @ quant_v) @ weights["out"]
    experiments["KV cache only"] = quantization_error(baseline_output, kv_quant_output)

    noise_scale = np.std(fresh_internals["attn_scores"]) * 0.05
    noisy_scores = fresh_internals["attn_scores"] + np.random.randn(*fresh_internals["attn_scores"].shape) * noise_scale
    noisy_max = np.max(noisy_scores, axis=-1, keepdims=True)
    noisy_exp = np.exp(noisy_scores - noisy_max)
    noisy_weights = noisy_exp / np.sum(noisy_exp, axis=-1, keepdims=True)
    attn_quant_output = (noisy_weights @ fresh_internals["v"]) @ weights["out"]
    experiments["Attention logits (5% noise)"] = quantization_error(baseline_output, attn_quant_output)

    print(f"\n  Sensitivity Experiment ({num_bits}-bit quantization):")
    print(f"  {'Component':<30} {'MSE':>14} {'SNR (dB)':>10} {'Cosine Sim':>12}")
    print(f"  {'-'*68}")
    for name, err in sorted(experiments.items(), key=lambda x: x[1]["mse"]):
        print(f"  {name:<30} {err['mse']:>14.8f} {err['snr_db']:>10.2f} {err['cosine_similarity']:>12.8f}")

    return experiments
```

### 第 6 步：模拟 GPTQ

GPTQ 一次量化一列，用 Hessian 决定如何分摊舍入误差。这是个简化版本，抓住了核心思想：用校准数据测量权重重要性，然后更激进地量化最不重要的权重。

```python
def simulated_gptq(weight_matrix, calibration_inputs, num_bits=4):
    n_in, n_out = weight_matrix.shape
    qmin = -(2 ** (num_bits - 1))
    qmax = 2 ** (num_bits - 1) - 1

    H = np.zeros((n_in, n_in))
    for x in calibration_inputs:
        x = x.reshape(-1, 1) if x.ndim == 1 else x
        for row in range(x.shape[0]):
            xi = x[row].reshape(-1, 1)
            H += xi @ xi.T
    H /= len(calibration_inputs)
    H += np.eye(n_in) * 1e-4

    weight_importance = np.diag(H)

    quantized = np.zeros_like(weight_matrix, dtype=np.int32)
    scales = np.zeros(n_out)
    errors = np.zeros(n_out)

    W = weight_matrix.copy()

    for col in range(n_out):
        w_col = W[:, col]
        abs_max = np.max(np.abs(w_col))
        if abs_max == 0:
            scales[col] = 1.0
            continue
        scale = abs_max / qmax
        scales[col] = scale

        q_col = np.clip(np.round(w_col / scale), qmin, qmax).astype(np.int32)
        quantized[:, col] = q_col

        quant_error = w_col - q_col * scale
        errors[col] = np.sqrt(np.mean(quant_error ** 2))

        if col < n_out - 1:
            importance_weights = weight_importance / (np.max(weight_importance) + 1e-10)
            for next_col in range(col + 1, min(col + 4, n_out)):
                compensation = quant_error * importance_weights * 0.1
                W[:, next_col] += compensation

    return quantized, scales, {"column_errors": errors,
                               "mean_error": float(np.mean(errors)),
                               "max_error": float(np.max(errors))}


def dequantize_gptq(quantized, scales):
    result = np.zeros_like(quantized, dtype=np.float64)
    for col in range(quantized.shape[1]):
        result[:, col] = quantized[:, col] * scales[col]
    return result
```

### 第 7 步：AWQ 模拟

AWQ 识别显著权重（那些和大激活相乘的），在量化前通过缩放保护它们。

```python
def simulated_awq(weight_matrix, calibration_inputs, num_bits=4, salient_fraction=0.01):
    n_in, n_out = weight_matrix.shape
    qmin = -(2 ** (num_bits - 1))
    qmax = 2 ** (num_bits - 1) - 1

    activation_magnitudes = np.zeros(n_in)
    for x in calibration_inputs:
        if x.ndim == 1:
            activation_magnitudes += np.abs(x)
        else:
            activation_magnitudes += np.mean(np.abs(x), axis=0)
    activation_magnitudes /= len(calibration_inputs)

    n_salient = max(1, int(n_in * salient_fraction))
    salient_indices = np.argsort(activation_magnitudes)[-n_salient:]

    scale_factors = np.ones(n_in)
    for idx in salient_indices:
        col_max = np.max(np.abs(weight_matrix[idx, :]))
        if col_max > 0:
            scale_factors[idx] = min(4.0, 1.0 / (col_max + 1e-8) * np.mean(np.abs(weight_matrix)))

    scaled_weights = weight_matrix * scale_factors.reshape(-1, 1)

    quantized, scales = quantize_per_channel(scaled_weights, num_bits, axis=0)
    dequantized = dequantize_per_channel(quantized, scales, axis=0)

    result = dequantized / scale_factors.reshape(-1, 1)

    err = quantization_error(weight_matrix, result)

    return result, {"salient_indices": salient_indices,
                    "scale_factors": scale_factors[salient_indices],
                    "error": err,
                    "n_salient": n_salient}
```

### 第 8 步：完整流水线

把所有东西接起来。在同一个权重矩阵上对比朴素量化、per-channel、GPTQ 和 AWQ。

```python
def full_quantization_comparison(d_in=256, d_out=512, num_bits=4, n_calibration=32):
    np.random.seed(42)

    weight = np.random.randn(d_in, d_out) * 0.02
    outlier_rows = np.random.choice(d_in, size=5, replace=False)
    weight[outlier_rows] *= 10

    calibration = [np.random.randn(8, d_in) * 0.1 for _ in range(n_calibration)]

    q_naive, s_naive = quantize_symmetric(weight, num_bits)
    recon_naive = dequantize_symmetric(q_naive, s_naive)
    err_naive = quantization_error(weight, recon_naive)

    q_pc, s_pc = quantize_per_channel(weight, num_bits, axis=0)
    recon_pc = dequantize_per_channel(q_pc, s_pc, axis=0)
    err_pc = quantization_error(weight, recon_pc)

    q_gptq, s_gptq, gptq_info = simulated_gptq(weight, calibration, num_bits)
    recon_gptq = dequantize_gptq(q_gptq, s_gptq)
    err_gptq = quantization_error(weight, recon_gptq)

    recon_awq, awq_info = simulated_awq(weight, calibration, num_bits)
    err_awq = awq_info["error"]

    print(f"\n  Full Quantization Comparison ({num_bits}-bit, {d_in}x{d_out} matrix)")
    print(f"  Matrix has {len(outlier_rows)} outlier rows (10x scale)")
    print()
    print(f"  {'Method':<20} {'MSE':>14} {'SNR (dB)':>10} {'Cosine Sim':>12}")
    print(f"  {'-'*58}")
    print(f"  {'Naive per-tensor':<20} {err_naive['mse']:>14.8f} {err_naive['snr_db']:>10.2f} {err_naive['cosine_similarity']:>12.8f}")
    print(f"  {'Per-channel':<20} {err_pc['mse']:>14.8f} {err_pc['snr_db']:>10.2f} {err_pc['cosine_similarity']:>12.8f}")
    print(f"  {'Simulated GPTQ':<20} {err_gptq['mse']:>14.8f} {err_gptq['snr_db']:>10.2f} {err_gptq['cosine_similarity']:>12.8f}")
    print(f"  {'Simulated AWQ':<20} {err_awq['mse']:>14.8f} {err_awq['snr_db']:>10.2f} {err_awq['cosine_similarity']:>12.8f}")

    test_input = np.random.randn(4, d_in) * 0.1
    baseline = test_input @ weight
    output_naive = test_input @ recon_naive
    output_pc = test_input @ recon_pc
    output_gptq = test_input @ recon_gptq
    output_awq = test_input @ recon_awq

    print(f"\n  End-to-End Output Error (matmul with test input):")
    print(f"  {'Method':<20} {'Output MSE':>14} {'Output Cosine':>14}")
    print(f"  {'-'*50}")
    for name, output in [("Naive", output_naive), ("Per-channel", output_pc),
                          ("GPTQ", output_gptq), ("AWQ", output_awq)]:
        out_err = quantization_error(baseline, output)
        print(f"  {name:<20} {out_err['mse']:>14.8f} {out_err['cosine_similarity']:>14.8f}")

    return {"naive": err_naive, "per_channel": err_pc, "gptq": err_gptq, "awq": err_awq}


def memory_calculator(num_params_billions, bits_per_param):
    bytes_per_param = bits_per_param / 8
    total_bytes = num_params_billions * 1e9 * bytes_per_param
    total_gb = total_bytes / (1024 ** 3)
    return total_gb


def print_memory_table():
    print("\n  Memory Requirements by Model and Precision:")
    print(f"  {'Model':<15} {'FP32':>8} {'FP16':>8} {'FP8':>8} {'INT8':>8} {'INT4':>8} {'INT2':>8}")
    print(f"  {'-'*64}")
    for name, params in [("7B", 7), ("13B", 13), ("34B", 34), ("70B", 70), ("405B", 405)]:
        fp32 = memory_calculator(params, 32)
        fp16 = memory_calculator(params, 16)
        fp8 = memory_calculator(params, 8)
        int8 = memory_calculator(params, 8)
        int4 = memory_calculator(params, 4)
        int2 = memory_calculator(params, 2)
        print(f"  {name:<15} {fp32:>7.1f}G {fp16:>7.1f}G {fp8:>7.1f}G {int8:>7.1f}G {int4:>7.1f}G {int2:>7.1f}G")


if __name__ == "__main__":
    np.random.seed(42)

    print("=" * 70)
    print("QUANTIZATION: MAKING MODELS FIT")
    print("=" * 70)

    print("\nSTEP 1: Number Format Comparison")
    print("-" * 50)
    for val in [0.1, 3.14159, -0.00073, 42.5, 0.0000012]:
        display_format_comparison(val)

    print("\n\nSTEP 2: Memory Requirements")
    print("-" * 50)
    print_memory_table()

    print("\n\nSTEP 3: Quantization Methods Comparison")
    print("-" * 50)
    weight_matrix = np.random.randn(128, 256) * 0.02
    weight_matrix[0] *= 15
    weight_matrix[42] *= 8
    compare_quantization_methods(weight_matrix, num_bits=8)
    compare_quantization_methods(weight_matrix, num_bits=4)

    print("\n\nSTEP 4: Bit-Width Sweep")
    print("-" * 50)
    sweep_tensor = np.random.randn(64, 128) * 0.05
    bit_width_sweep(sweep_tensor)

    print("\n\nSTEP 5: Sensitivity Experiment")
    print("-" * 50)
    print("\n  INT8:")
    sensitivity_experiment(num_bits=8)
    print("\n  INT4:")
    sensitivity_experiment(num_bits=4)

    print("\n\nSTEP 6: GPTQ vs AWQ vs Naive (INT4)")
    print("-" * 50)
    full_quantization_comparison(d_in=256, d_out=512, num_bits=4)

    print("\n\nSTEP 7: Distribution Analysis")
    print("-" * 50)
    np.random.seed(0)
    simulated_weights = np.random.randn(1000) * 0.02
    abs_vals = np.abs(simulated_weights)
    pct_in_range = np.mean(abs_vals < 0.1) * 100
    print(f"\n  Simulated weight distribution (1000 params, std=0.02):")
    print(f"  Weights in [-0.1, 0.1]: {pct_in_range:.1f}%")
    print(f"  Weights in [-0.05, 0.05]: {np.mean(abs_vals < 0.05) * 100:.1f}%")
    print(f"  Weights in [-0.01, 0.01]: {np.mean(abs_vals < 0.01) * 100:.1f}%")
    print(f"  Max absolute value: {np.max(abs_vals):.6f}")
    print(f"  Mean absolute value: {np.mean(abs_vals):.6f}")

    histogram = np.histogram(simulated_weights, bins=20)
    print(f"\n  Weight histogram:")
    max_count = max(histogram[0])
    for i in range(len(histogram[0])):
        bar_len = int(histogram[0][i] / max_count * 40)
        lo = histogram[1][i]
        hi = histogram[1][i + 1]
        print(f"  [{lo:>7.4f}, {hi:>7.4f}] {'#' * bar_len} ({histogram[0][i]})")

    print("\n\n" + "=" * 70)
    print("DONE")
    print("=" * 70)
```

## 实际使用

### 用 AutoGPTQ 量化

```python
# pip install auto-gptq transformers
# from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig
# from transformers import AutoTokenizer
#
# model_id = "meta-llama/Llama-3.1-8B"
# quantize_config = BaseQuantizeConfig(
#     bits=4,
#     group_size=128,
#     desc_act=False,
# )
#
# tokenizer = AutoTokenizer.from_pretrained(model_id)
# model = AutoGPTQForCausalLM.from_pretrained(model_id, quantize_config)
#
# calibration = [tokenizer(t, return_tensors="pt") for t in calibration_texts[:128]]
# model.quantize(calibration)
# model.save_quantized("llama-8b-gptq-int4")
```

### 用 AutoAWQ 量化

```python
# pip install autoawq
# from awq import AutoAWQForCausalLM
# from transformers import AutoTokenizer
#
# model_id = "meta-llama/Llama-3.1-8B"
# model = AutoAWQForCausalLM.from_pretrained(model_id)
# tokenizer = AutoTokenizer.from_pretrained(model_id)
#
# model.quantize(tokenizer, quant_config={"zero_point": True, "q_group_size": 128, "w_bit": 4})
# model.save_quantized("llama-8b-awq-int4")
```

### 转换成 GGUF

```bash
# pip install llama-cpp-python
# python convert_hf_to_gguf.py meta-llama/Llama-3.1-8B --outtype q4_k_m --outfile llama-8b-q4km.gguf
# llama-server -m llama-8b-q4km.gguf -c 4096 -ngl 99
```

### 用 vLLM 服务

```python
# pip install vllm
# vllm serve model-awq --quantization awq --dtype half --max-model-len 8192
```

vLLM 原生支持 AWQ 和 GPTQ 模型。它在矩阵乘法时处理反量化，并对 KV cache 用分页注意力。H100 上的 FP8，加 `--dtype float8_e4m3fn`。

## 拿去用

本节课产出 `outputs/skill-quantization.md`，一个选择正确量化策略的决策框架。给定你的模型规模、目标硬件和质量要求，它告诉你用哪种格式、方法和验证步骤。它包含显存预算计算、per-component 精度建议，以及 vLLM、llama.cpp 和 TensorRT-LLM 的部署配方。

## 练习

1. 实现分组量化。不用每通道一个缩放，而是在一个通道内每 128 个权重用一个缩放。这是 GPTQ 和 AWQ 实际用的。在同一个权重矩阵上对比组大小 32、64、128、256。更小的组质量更好，但缩放因子的存储开销更大。

2. 做一个混合精度量化器。把多层网络的第一层和最后一层量化到 INT8，中间层量化到 INT4。把端到端输出质量和统一 INT4、统一 INT8 对比。测量相比全 INT8 的显存节省。

3. 为量化感知训练实现直通估计器（STE）。在一个用回归任务训练的简单两层网络的前向传播里插入伪量化/反量化操作。对比一个正常训练（然后 PTQ 到 INT4）的模型 vs 一个从一开始就用 QAT 训练的模型的最终损失。

4. 做一个受 LLM.int8() 启发的离群感知量化器。检测激活幅度超过均值 6 倍的通道。把那些通道保留在 FP16，其他一切量化到 INT8。在第 5 步的 transformer 层上，用不同的离群阈值（3 倍、6 倍、10 倍）测量端到端质量。

5. 实现一个量化质量仪表盘。给定一个权重矩阵，计算并显示：权重分布直方图、量化误差分布、per-channel 缩放因子、量化最差的通道（重建误差最高的），以及跨 100 个随机输入的原始和量化输出之间的余弦相似度。找出哪些通道应该保留在更高精度。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| FP16 | "半精度" | 16 位浮点，5 个指数位、10 个尾数位，最大值 65,504，标准推理格式 |
| BF16 | "Brain float" | 16 位浮点，8 个指数位（和 FP32 相同范围）、7 个尾数位，由 Google 为训练设计 |
| FP8 | "八位浮点" | 两个变体：E4M3（推理，精度更高）和 E5M2（训练，范围更大），H100 原生 |
| INT8 | "八位整数" | 从 -128 到 127 的 256 个均匀间隔值，需要一个缩放因子从浮点映射 |
| INT4 | "四位整数" | 总共 16 个级别，需要精巧方法（GPTQ、AWQ）来维持质量 |
| Per-channel 量化 | "每行一个缩放" | 每个输出通道用一个单独的缩放因子，而不是整个张量一个，大幅减小误差 |
| GPTQ | "Hessian 方法" | 用二阶信息最小化输出误差的训练后量化，一次一层 |
| AWQ | "激活感知" | 在量化前缩放显著权重（那些和大激活相乘的）来保护它们 |
| GGUF | "llama.cpp 格式" | 带混合精度层的自包含模型文件，为 CPU 和 Apple Silicon 推理优化 |
| PTQ | "训练后量化" | 不重训就把已训练模型的权重转成低精度，快但在极端压缩下受限 |
| QAT | "训练时量化" | 在前向传播里插入伪量化让模型学会容忍舍入，在 INT4/INT2 下更好 |
| 校准数据 | "那 128 个例子" | 一个小数据集，过一遍模型来计算激活统计以设置缩放因子 |
| 缩放因子 | "那个乘数" | 在浮点范围和整数范围之间转换：`float_val = int_val * scale` |
| 困惑度 delta | "差了多少" | 原模型和量化模型困惑度之差，< 0.5 优秀，> 2.0 是问题 |

## 延伸阅读

- [Frantar et al., 2022 -- "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers"](https://arxiv.org/abs/2210.17323) -- 用 Hessian 引导的权重舍入让 INT4 量化对 LLM 实用的论文
- [Lin et al., 2023 -- "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration"](https://arxiv.org/abs/2306.00978) -- 通过量化前缩放保护显著权重，匹配或胜过 GPTQ
- [Dettmers et al., 2022 -- "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale"](https://arxiv.org/abs/2208.07339) -- 把离群特征保留在 FP16 的混合精度 INT8，让 INT8 推理无质量损失
- [Xiao et al., 2023 -- "SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models"](https://arxiv.org/abs/2211.10438) -- 把量化难度从激活迁移到权重，用于 W8A8 部署
- [Micikevicius et al., 2022 -- "FP8 Formats for Deep Learning"](https://arxiv.org/abs/2209.05433) -- NVIDIA/ARM/Intel 定义 E4M3 和 E5M2 格式的论文，现已在 H100 原生
