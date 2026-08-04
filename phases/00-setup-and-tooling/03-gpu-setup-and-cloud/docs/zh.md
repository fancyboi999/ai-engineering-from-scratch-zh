# GPU 配置与云端

> 用 CPU 训练，学习够用了。但真要认真训练，得上 GPU。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 0，第 01 课
**预计时间：** ~45 分钟

## 学习目标

- 用 `nvidia-smi` 和 PyTorch 的 CUDA API 验证本地 GPU 是否可用
- 配置带 T4 GPU 的 Google Colab，免费在云端做实验
- 对比 CPU 与 GPU 上的矩阵乘法，测出加速比
- 用 fp16 经验法则估算你的显存能装下多大的模型

## 问题背景

阶段 1-3 的大多数课程在 CPU 上跑得挺好。但一旦你开始训练 CNN、transformer 或 LLM（阶段 4 往后），就需要 GPU 加速。同一个训练任务，CPU 要跑 8 小时，GPU 只要 10 分钟。

你有三个选择：本地 GPU、云端 GPU，或者 Google Colab（免费）。

## 核心概念

```
你的选择：

1. 本地 NVIDIA GPU
   成本：$0（你已经有了）
   配置：安装 CUDA + cuDNN
   适合：日常使用、大数据集

2. Google Colab（免费档）
   成本：$0
   配置：无
   适合：快速实验、家里没有 GPU

3. 云端 GPU（Lambda、RunPod、Vast.ai）
   成本：$0.20-2.00/小时
   配置：SSH + 安装
   适合：正经训练、大模型
```

```figure
s0-gpu-dispatch
```

## 动手构建

### 选项 1：本地 NVIDIA GPU

先看看你有没有：

```bash
nvidia-smi
```

安装带 CUDA 的 PyTorch：

```python
import torch

print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
```

### 选项 2：Google Colab

1. 打开 [colab.research.google.com](https://colab.research.google.com)
2. Runtime > Change runtime type > T4 GPU
3. 运行 `!nvidia-smi` 验证

把本课程的 notebook 直接上传到 Colab 就行。

### 选项 3：云端 GPU

用 Lambda Labs、RunPod 或 Vast.ai：

```bash
ssh user@your-gpu-instance

pip install torch torchvision torchaudio
python -c "import torch; print(torch.cuda.get_device_name(0))"
```

### 没有 GPU？没问题。

大多数课程在 CPU 上就能跑。需要 GPU 的课程会明确标注，并附上 Colab 链接。

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using: {device}")
```

## 动手构建：GPU 与 CPU 性能对比

```python
import torch
import time

size = 5000

a_cpu = torch.randn(size, size)
b_cpu = torch.randn(size, size)

start = time.time()
c_cpu = a_cpu @ b_cpu
cpu_time = time.time() - start
print(f"CPU: {cpu_time:.3f}s")

if torch.cuda.is_available():
    a_gpu = a_cpu.to("cuda")
    b_gpu = b_cpu.to("cuda")

    torch.cuda.synchronize()
    start = time.time()
    c_gpu = a_gpu @ b_gpu
    torch.cuda.synchronize()
    gpu_time = time.time() - start
    print(f"GPU: {gpu_time:.3f}s")
    print(f"Speedup: {cpu_time / gpu_time:.0f}x")
```

## 练习

1. 跑一遍上面的基准测试，对比 CPU 和 GPU 的耗时
2. 如果你没有 GPU，在 Google Colab 上跑一遍再对比
3. 查一下你有多少显存，估算能装下的最大模型（经验法则：fp16 每个参数占 2 字节）

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| CUDA | "GPU 编程" | NVIDIA 的并行计算平台，让你能把代码跑在 GPU 上 |
| VRAM | "显存" | GPU 上的显存，和系统内存是分开的，决定了模型能多大 |
| fp16 | "半精度" | 16 位浮点，内存占用是 fp32 的一半，精度损失极小 |
| Tensor Core | "矩阵加速硬件" | GPU 上专门做矩阵乘法的核心，比普通核心快 4-8 倍 |
