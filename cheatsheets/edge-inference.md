---
id: edge-inference
title: 边缘推理目标平台
code: EI
subtitle: 选择边缘平台与量化格式：带宽上限、格式、导出步骤和设备端测量。
hue: 262
sources: phases/17-infrastructure-and-production/12-edge-inference, phases/04-computer-vision/15-real-time-edge, phases/10-llms-from-scratch/11-quantization
source_hash: 5245f8dad0c9a07f
---

## 四种边缘平台对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/17-infrastructure-and-production/12-edge-inference/code/main.py

| 因素 | Apple ANE | Qualcomm Hexagon | WebGPU / WebLLM | NVIDIA Jetson |
|---|---|---|---|---|
| 峰值 | 38 TOPS，M4 / A18 | 45 TOPS，X Elite / 8 Gen 4 | 浏览器 GPU，无需安装 | Orin Nano Super、AGX Orin、Thor |
| 内存 | 统一内存，无复制 | 独立内存域 | 浏览器开销约 25% | Nano 受内存带宽限制 |
| 接入 | Core ML 或 MPS | QNN SDK、AI Hub | WebGPU 计算着色器 | vLLM、TensorRT Edge-LLM |
| 格式 | INT4 权重 + FP16 激活 | QNN INT8 / INT4 | Q4 MLC（`q4f16_1`） | Q4 GGUF、TRT-LLM INT4、NVFP4 |
| 观测值 | 估计 8 tok/s，A18，8B Q4 | 7 tok/s，8 Gen 3，8B Q4 | ~41 tok/s，M3 Max，8B Q4 | ~40 tok/s，AGX Orin，gpt-oss-20b |
| 限制 | 原生 ANE 需要 Core ML | 从 PyTorch 或 ONNX 转换 | 移动端覆盖约 70-75% | Nano 可容纳 3B 模型 |

## 各平台适用场景
type: concepts
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

- **Apple ANE**：iOS 应用。用 Core ML 转换，使用 INT4 权重加 FP16 激活。
- **Qualcomm Hexagon**：Snapdragon 手机和 Windows ARM 笔记本，用 QNN 或 AI Hub 转换。
- **WebGPU / WebLLM**：无需安装的浏览器应用，通过同一 OpenAI 兼容 API 保留服务端兜底。
- **Jetson Orin Nano Super**：在 8GB 内存运行 Llama 3.2 3B 或 Phi-3。
- **Jetson AGX / Thor**：更大的模型、NVFP4 加 FP8 KV、EAGLE-3。
- **GGUF Q4_K_M**：CPU 与 Apple Silicon 笔记本。
- **GPTQ 或 AWQ INT4**：使用 CUDA 或 ROCm 的 GPU 推理。

## 解码上限
type: annotated-code
lang: python
from: phases/17-infrastructure-and-production/12-edge-inference/code/main.py

```python
def ceiling(target: Target, model_gb: float) -> float:
    seconds_per_token = model_gb / target.bandwidth_gb_s  # 每个 token 读取全部权重
    return 1 / seconds_per_token  # tok/s 上限
model_gb = 4.7  # Llama 3.1 8B Q4
Target("Apple A18 (iPhone 16)",   60,   8,  "phone with ANE")  # GB/s，实测 tok/s
Target("Snapdragon 8 Gen 3",      77,   7,  "mid/high Android")
Target("WebGPU on M3 Max",       400,  41,  "browser penalty ~25%")
Target("Jetson AGX Orin",        205,  45,  "edge-datacenter bridge")
```

## 带宽计算
type: concepts
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

- **规则**：解码每个 token 都读取完整权重。
- **7B Q4**：3.5 GB。在 50 GB/s 下每个 token 需 70 ms，约 14 tok/s。
- **高端移动设备**：90 GB/s 带来约 25 tok/s。
- **3 TB/s 的 HBM3**：每个 token 为 1.2 ms，上限 830 tok/s。
- **差距**：数据中心与移动端 DRAM 相差 30-50x。
- **长上下文**：8 GB 手机上，4 GB 模型加 32K 上下文的 2 GB KV 会 OOM。
- **边缘端上下文**：除非接受 Q4 KV，否则保持在 4K-8K。

## Llama 3 70B 的量化格式
type: comparison
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 因素 | FP16 | FP8 | AWQ INT4 | GGUF Q4_K_M |
|---|---|---|---|---|
| 大小 | 140GB | 70GB | 35GB | 40GB |
| 困惑度 | 3.12 | 3.14 | 4.18 | 4.25 |
| MMLU | 79.5% | 79.3% | 78.1% | 77.9% |
| token/秒 | 38，A100 | 55，A100 | 75，A100 | 28，CPU |
| 最适合 | 基线 | H100 部署 | GPU 推理 | CPU、Metal |

## 量化与反量化
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

```python
scale = max(abs(tensor)) / 127  # 对称 INT8
quantized = clamp(round(tensor / scale), -128, 127)
reconstructed = quantized * scale  # 误差最多为 scale / 2
quantized = round(tensor / scale) + zero_point  # 非对称，用于 ReLU 输出
```

## 任务
type: task-table
span: 2
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/15-real-time-edge/code/main.py, phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 任务 | 代码 |
|---|---|
| 边缘解码上限，第 12 课 | `code/main.py` |
| 在设备上测量 p50、p95、p99 | `measure_latency(model, input_shape, device="cpu", warmup=10, iters=50)` |
| 正确计时 GPU 工作 | 在计时块前后调用 `torch.cuda.synchronize()` |
| 静态 INT8 PTQ 配置 | `model.qconfig = tq.get_default_qconfig(backend)` |
| 导出到 ONNX | `torch.onnx.export(model, sample_input, path, opset_version=17)` |
| GPTQ INT4 | `GPTQConfig(bits=4, group_size=128)` |
| GGUF Q4_K_M | `llama.cpp/build/bin/llama-quantize llama-8b-f16.gguf llama-8b-q4km.gguf Q4_K_M` |
| WebLLM 权重 | `mlc_llm convert_weight` 加编译后的 `.wasm` |

## 视觉部署路径
type: flow
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md

1. **选择骨干**：少于 3M 参数选 MobileNetV3-Small，3-10M 选 EfficientNet-Lite-B0。
2. **测量**：预热 5-10 次，输入尺寸固定为生产分辨率。
3. **量化**：训练后静态 INT8，验证准确率损失低于 1%。
4. **导出**：PyTorch 转 ONNX，`dynamic_axes` 允许任意批次大小。
5. **运行时**：Jetson 用 TensorRT，iOS 用 Core ML，Android 用 TFLite。
6. **决策**：根据设备上实测的模型、延迟、内存与准确率表格选择。

## 常见问题排查
type: troubleshooting
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| iPhone 16 Pro 上 8B Q4 只有 3 tok/s | 移动端带宽差距 | 使用更小模型或更低位宽 |
| 手机长上下文 OOM | 32K 的 KV 缓存占 2 GB | 上下文保持 4K-8K 或用 Q4 KV |
| WebLLM 拒绝 GGUF 文件 | 不支持 GGUF | 转为 Q4 MLC（`q4f16_1`） |
| iOS 上 llama.cpp 不使用 ANE | Metal 后端使用 MPS | 用 Core ML 转换 |
| 旧 Android 浏览器无 WebGPU | 需要 Chrome v121+ | 兜底到服务端 API |
| 初次测量延迟过高 | 冷缓存和 JIT | 用 5-10 次虚拟输入预热 |
| 简单 INT4 输出无意义 | 舍入误差累积 | 用带校准数据的 GPTQ 或 AWQ |
| 困惑度差值大于 2.0 | 某处出错 | 重新检查，低于 0.5 才很优秀 |

## 格式术语表
type: glossary
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

- **BF16**：8 位指数、7 位尾数，范围与 FP32 相同。
- **FP8 E4M3**：用于推理的权重与激活。
- **FP8 E5M2**：用于训练梯度，范围更大。
- **INT8**：从 -128 到 127 的 256 个值，需要缩放因子。
- **INT4**：16 个级别，需要 GPTQ 或 AWQ 保证质量。
- **GGUF**：包含混合精度层的 llama.cpp 文件。
- **PTQ**：训练后量化，使用 128-1024 个校准样本。
- **QAT**：训练时伪量化，在 INT4 和 INT2 上更好。

## 问答
type: qa
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

- **边缘端为何计算能力次要？** 解码受内存带宽限制，带宽决定上限。
- **WebLLM 相对原生有多快？** 同一后端下约为原生的 70-80%。
- **看 FLOPs 还是延迟？** 架构搜索看 FLOPs，部署看设备实测延迟。
- **视觉用 PTQ 还是 QAT？** 静态 PTQ 用 5% 的工作量获得 95% 的收益。
- **FP8 安全吗？** 在 H100 上可以，快 30-50%，质量损失低于 0.1%。
