---
name: skill-latency-profiler
description: 编写完整的延迟基准测试脚本，包含预热、同步、百分位统计和内存跟踪。
version: 1.0.0
phase: 4
lesson: 15
tags: [edge, deployment, profiling, benchmarking]
---

# 延迟分析器

为任意 PyTorch 模型做一次严谨的延迟基准测试。产出的报告，下游任何人都能真正信得过。

## 何时使用

- 部署前比较多个候选骨干网络。
- 量化或剪枝的前后对比。
- 更换运行时之后（eager、ONNX、TensorRT）。
- 生成部署就绪报告。

## 输入

- `model`：PyTorch `nn.Module`。
- `input_shape`：形如 `(1, 3, 224, 224)` 的元组。
- `device`：`cpu` | `cuda` | `mps`。
- `warmup`：默认 10。
- `iters`：默认 100。

## 检查项

### 1. 预热
先不计时运行模型 `warmup` 次。这样可以排除首次前向传播的 JIT 编译和冷缓存影响。

### 2. 同步
对 `cuda`，在每次计时的前向传播前后调用 `torch.cuda.synchronize()`。
对 `mps`，调用 `torch.mps.synchronize()`。

### 3. 计时器
用 `time.perf_counter()` 测量挂钟时间，换算成毫秒。

### 4. 百分位
对全部计时结果排序。报告 `p50, p90, p95, p99, mean, std`。

### 5. 内存
对 `cuda`，运行结束后调用 `torch.cuda.max_memory_allocated()`，并减去基线。
对 `cpu`，在运行前后使用 `tracemalloc` 或 `psutil.Process().memory_info().rss`。

### 6. Batch size 扫描
可选：对 `batch_size in [1, 4, 16, 32]` 重复基准测试，揭示吞吐量与延迟之间的取舍。

## 输出模板

```python
import time
import torch
import psutil, os

def profile(model, input_shape, device="cpu", warmup=10, iters=100):
    proc = psutil.Process(os.getpid())
    baseline_rss = proc.memory_info().rss / 1e6

    model = model.to(device).eval()
    x = torch.randn(input_shape, device=device)

    def sync():
        if device == "cuda":
            torch.cuda.synchronize()
        elif device == "mps":
            torch.mps.synchronize()

    with torch.no_grad():
        for _ in range(warmup):
            model(x)
        sync()
        if device == "cuda":
            torch.cuda.reset_peak_memory_stats()

        times = []
        for _ in range(iters):
            sync()
            t0 = time.perf_counter()
            model(x)
            sync()
            times.append((time.perf_counter() - t0) * 1000)

    times.sort()
    mean = sum(times) / len(times)
    std  = (sum((t - mean) ** 2 for t in times) / len(times)) ** 0.5

    def pct(p):
        idx = max(0, min(len(times) - 1, int(len(times) * p) - 1))
        return times[idx]

    report = {
        "p50_ms":  pct(0.50),
        "p90_ms":  pct(0.90),
        "p95_ms":  pct(0.95),
        "p99_ms":  pct(0.99),
        "mean_ms": mean,
        "std_ms":  std,
        "rss_mb":  proc.memory_info().rss / 1e6 - baseline_rss,
    }
    if device == "cuda":
        report["peak_cuda_mb"] = torch.cuda.max_memory_allocated() / 1e6

    return report
```

## 规则

- 一律先预热；绝不相信首次前向传播的计时。
- 看百分位，不看均值：一个离群值就能让均值翻倍，p50 却几乎不动。
- 用和生产环境相同的 input_shape；224x224 上的延迟不等于 384x384 上的延迟。
- 对 CUDA，绝不能省略 `torch.cuda.synchronize()`；没有它，数字毫无意义。
- 把 torch 版本、CUDA 版本和设备名称与数字一起记录下来；否则这些数字就没法比较。
