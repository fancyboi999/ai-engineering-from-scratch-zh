# 边缘推理 —— Apple Neural Engine、Qualcomm Hexagon、WebGPU/WebLLM、Jetson

> 边缘的核心约束是内存带宽，不是算力。移动 DRAM 在 50-90 GB/s；数据中心 HBM3 越过 2-3 TB/s —— 30-50 倍的差距。Decode 受内存限制，所以这差距是决定性的。2026 年版图分成四块。Apple M4/A18 Neural Engine 峰值 38 TOPS，带统一内存（无 CPU↔NPU 拷贝）。Qualcomm Snapdragon X Elite / 8 Gen 4 Hexagon 达到 45 TOPS。WebGPU + WebLLM 在 M3 Max 上以约 41 tok/s 跑 Llama 3.1 8B（Q4）（大约是原生的 70-80%）；17.6k GitHub star，OpenAI 兼容 API，约 70-75% 移动端覆盖。NVIDIA Jetson Orin Nano Super（8GB）装得下 Llama 3.2 3B / Phi-3；AGX Orin 通过 vLLM 以约 40 tok/s 跑 gpt-oss-20b；Jetson T4000（JetPack 7.1）是 AGX Orin 的 2 倍。TensorRT Edge-LLM 支持 EAGLE-3、NVFP4、chunked prefill —— 由 Bosch、ThunderSoft、MediaTek 在 CES 2026 上展示。

**类型：** Learn
**语言：** Python（标准库，一个玩具级带宽受限 decode 模拟器）
**前置要求：** 阶段 17 · 04（推理服务引擎内部机制）、阶段 17 · 09（生产量化）
**预计时间：** ~60 分钟

## 学习目标

- 解释为什么移动 LLM 推理受内存带宽限制，算力是次要的。
- 列举四个边缘目标（Apple ANE、Qualcomm Hexagon、WebGPU/WebLLM、NVIDIA Jetson），并把每个对应到一个用例。
- 说出 2026 年 WebGPU 的覆盖缺口（Firefox Android 在追赶）和 Safari iOS 26 的落地。
- 为每个目标挑一个量化格式（ANE 用 Core ML INT4 + FP16，Hexagon 用 QNN INT8/INT4，浏览器用 WebGPU Q4，Jetson Thor 用 NVFP4）。

## 问题背景

一个客户想要一个设备端聊天机器人：语音优先、默认私密、离线可用。在 MacBook Pro M3 Max 上，Llama 3.1 8B Q4 跑约 55 tok/s —— 还行。在 iPhone 16 Pro 上，同一个模型跑 3 tok/s —— 不行。在搭载 Snapdragon 8 Gen 3 的中端 Android 上，7 tok/s。在 Chrome Android v121+ 上经由 WebGPU 在浏览器里跑，4-8 tok/s，取决于设备。

吞吐的方差不是个移植问题。它是带宽差距乘以量化格式乘以 NPU 能否从用户态访问。2026 年的边缘推理是四个不同的问题，配四个不同的解。

## 核心概念

### 带宽是真正的天花板

Decode 为每个 token 读取整套权重。一个 Q4 的 7B 模型是 3.5 GB。以 50 GB/s 读 3.5 GB 要 70 ms —— 理论天花板约 14 tok/s。在 90 GB/s（高端移动 DRAM）天花板挪到约 25 tok/s。低于这个数，再多算力也帮不上。

数据中心 HBM3 以 3 TB/s 在 1.2 ms 内读完同样的 3.5 GB —— 天花板是 830 tok/s。同模型、同权重。不同的内存子系统。

### Apple Neural Engine（M4 / A18）

- 最高 38 TOPS。统一内存（CPU 和 ANE 共享同一个池）—— 无拷贝开销。
- 经由 Core ML + `.mlmodel` 编译模型访问，或经由 Metal Performance Shaders（MPS）通过 PyTorch 访问。
- Llama.cpp Metal 后端用 MPS，不直接用 ANE；原生 ANE 需要 Core ML 转换。
- 2026 年 iOS 应用的最佳实践路径：Core ML 配 INT4 权重 + FP16 激活。

### Qualcomm Hexagon（Snapdragon X Elite / 8 Gen 4）

- 最高 45 TOPS。在 SoC 里与 CPU 和 GPU 集成，但内存域分开。
- QNN（Qualcomm Neural Network）SDK 和 AI Hub 提供从 PyTorch/ONNX 的转换。
- 聊天模板、Llama 3.2、Phi-3 都作为一等产物在 AI Hub 上发布。

### Intel / AMD NPU（Lunar Lake、Ryzen AI 300）

- 40-50 TOPS。软件落后于 Apple/Qualcomm；OpenVINO 在改善但小众。
- 最适合 Windows ARM copilot 应用；在 AMD/Intel 桌面上原生支持本地优先。

### WebGPU + WebLLM

- 经由 WebGPU 计算着色器在浏览器里跑模型；无需安装。
- M3 Max 上 Llama 3.1 8B Q4 跑约 41 tok/s —— 经同后端大约是原生的 70-80%。
- WebLLM 在 GitHub 上 17.6k star；OpenAI 兼容 JS API；Apache 2.0。
- 2026 年覆盖：Chrome Android v121+、Safari iOS 26 GA、Firefox Android 仍在追赶。整体约 70-75% 移动端覆盖。

### NVIDIA Jetson 家族

- Orin Nano Super（8GB）：装得下 Llama 3.2 3B、Phi-3，tok/s 还不错。
- AGX Orin：通过 vLLM 以约 40 tok/s 跑 gpt-oss-20b。
- Thor / T4000（JetPack 7.1）：AGX Orin 性能的 2 倍，支持 EAGLE-3 和 NVFP4。
- TensorRT Edge-LLM（2026）支持 EAGLE-3 speculative decoding、NVFP4 权重、chunked prefill —— 把数据中心优化移植到边缘。

### 每个目标的量化选择

| 目标 | 格式 | 备注 |
|--------|--------|-------|
| Apple ANE | INT4 权重 + FP16 激活 | Core ML 转换路径 |
| Qualcomm Hexagon | QNN INT8 / INT4 | AI Hub 转换器 |
| WebGPU / WebLLM | Q4 MLC（q4f16_1） | 用 `mlc_llm convert_weight` + 编译好的 `.wasm`；不支持 GGUF |
| Jetson Orin Nano | Q4 GGUF 或 TRT-LLM INT4 | 内存受限 |
| Jetson AGX / Thor | NVFP4 + FP8 KV | Edge-LLM 路径 |

### 边缘上的长上下文陷阱

Llama 3.1 的 128K 上下文是个数据中心特性。在一台 8 GB RAM 的手机上，4 GB 模型 + 32K token 的 2 GB KV cache + 操作系统开销 = OOM。边缘部署把上下文保持在 4K-8K，除非接受激进的 KV 量化（Q4 KV）。

### 语音是杀手级应用

语音 agent 对延迟敏感（首 token < 500 ms）。本地推理完全消除了网络延迟。和语音转文字（Whisper Turbo 变体在边缘上能跑）结合，边缘推理就变成了生产级质量的语音循环。

### 你该记住的数字

- Apple M4 / A18 ANE：38 TOPS。
- Qualcomm Hexagon SD X Elite：45 TOPS。
- WebLLM M3 Max：Llama 3.1 8B Q4 约 41 tok/s。
- AGX Orin：通过 vLLM 跑 gpt-oss-20b 约 40 tok/s。
- 数据中心与边缘的带宽差距：30-50 倍。
- WebGPU 移动端覆盖：约 70-75%（Firefox Android 落后）。

```figure
edge-bandwidth-pipe
```

## 实际使用

`code/main.py` 跨边缘目标用带宽受限数学算出理论 decode 吞吐天花板。和观测到的基准对比，并指出哪里是带宽（而非算力）成为瓶颈。

## 拿去用

这一课产出 `outputs/skill-edge-target-picker.md`。给定平台（iOS/Android/浏览器/Jetson）、模型和延迟/内存预算，挑一个量化格式和转换流水线。

## 练习

1. 跑 `code/main.py`。对一个在 Snapdragon 8 Gen 3（约 77 GB/s 带宽）上的 Q4 7B 模型，算出 decode 天花板。和观测到的 6-8 tok/s 对比 —— 这个运行时高效吗？
2. Android 上的 WebGPU 需要 Chrome v121+。为更老的浏览器设计一个回退 —— 经由同一个 OpenAI 兼容 API 走服务端。
3. 你的 iOS 应用需要 4K 上下文流式。哪个模型/格式组合能让你在 iPhone 16 上保持活动内存低于 4 GB？
4. Jetson AGX Orin 以 40 tok/s 跑 gpt-oss-20b。Jetson Nano 只装得下一个 3B。如果你的产品同时面向两者，怎么统一推理栈？
5. 论证"WebLLM 在 2026 年是否生产就绪"。引用覆盖率、性能和 Firefox Android 缺口。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| ANE | "Apple 神经引擎" | M 系列和 A 系列里的设备端 NPU；统一内存 |
| Hexagon | "Qualcomm NPU" | Snapdragon NPU；用 QNN SDK 访问 |
| WebGPU | "浏览器 GPU" | W3C 标准化的浏览器 GPU API；Chrome/Safari 2026 |
| WebLLM | "浏览器 LLM 运行时" | MLC-LLM 项目；Apache 2.0；OpenAI 兼容 JS |
| Jetson | "NVIDIA 边缘" | Orin Nano / AGX / Thor / T4000 家族 |
| TRT Edge-LLM | "边缘 TensorRT" | TensorRT-LLM 的 2026 边缘移植；EAGLE-3 + NVFP4 |
| 统一内存 | "共享池" | CPU 和 NPU 看到同一份 RAM；无拷贝开销 |
| 带宽受限 | "内存受限" | decode 被读权重的字节/秒卡住 |
| Core ML | "Apple 转换" | Apple 用于 ANE 原生模型的框架 |
| QNN | "Qualcomm 栈" | Qualcomm Neural Network SDK |

## 延伸阅读

- [On-Device LLMs State of the Union 2026](https://v-chandra.github.io/on-device-llms/) —— 版图与基准。
- [NVIDIA Jetson Edge AI](https://developer.nvidia.com/blog/getting-started-with-edge-ai-on-nvidia-jetson-llms-vlms-and-foundation-models-for-robotics/) —— Orin / AGX / Thor。
- [NVIDIA TensorRT Edge-LLM](https://developer.nvidia.com/blog/accelerating-llm-and-vlm-inference-for-automotive-and-robotics-with-nvidia-tensorrt-edge-llm/) —— 2026 边缘移植发布。
- [WebLLM (arXiv:2412.15803)](https://arxiv.org/html/2412.15803v2) —— 设计与基准。
- [Apple Core ML](https://developer.apple.com/documentation/coreml) —— ANE 原生转换。
- [Qualcomm AI Hub](https://aihub.qualcomm.com/) —— Hexagon 的预转换模型。
