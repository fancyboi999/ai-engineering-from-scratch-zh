---
name: edge-target-picker
description: 根据设备、模型和延迟预算，选择边缘推理目标（Apple ANE、Qualcomm Hexagon、WebGPU/WebLLM、NVIDIA Jetson）及匹配的量化格式。
version: 1.0.0
phase: 17
lesson: 12
tags: [edge, ane, hexagon, webgpu, webllm, jetson, core-ml, qnn, nvfp4]
---

给定部署平台（iOS、Android、浏览器、机器人/汽车/边缘服务器）、模型以及延迟/内存预算，给出边缘推理目标推荐。

输出以下内容：

1. 目标。写出具体的 NPU/GPU（ANE、Hexagon、WebGPU、Jetson Orin Nano / AGX / Thor）。用平台和 2026 年运行时的覆盖情况说明理由。
2. 带宽上限。计算理论 decode 上限：bandwidth_GB_s / model_size_GB。与用户要求的 tok/s 比较。如果上限低于要求，拒绝，或者提出换更小的模型 / 更激进的量化。
3. 量化格式。从 Q4 GGUF（浏览器/边缘 CPU）、Core ML INT4 + FP16（ANE）、QNN INT8/INT4（Hexagon）或 NVFP4 + FP8 KV（Jetson Thor / Edge-LLM）中选一个。
4. 转换流水线。写出具体的转换工具（Core ML converter、Qualcomm AI Hub、WebLLM 用的 MLC-LLM、TensorRT-LLM Edge 编译器）。
5. 上下文预算。写出在设备内存里和权重放在一起时能容纳的最大上下文。长上下文场景要指定 KV 量化（Q4 KV），否则拒绝。
6. 兜底方案。当设备能力不足或 WebGPU 不可用时（Firefox Android、旧浏览器），指定使用相同 OpenAI 兼容接口的服务端 API 兜底。

直接否决：
- 承诺超过带宽上限的 tok/s。拒绝。物理规律摆在那里。
- 2026 年还想通过非 Core ML 运行时直接调用 ANE。只有 Core ML 原生开放 ANE。
- 假设每个浏览器都支持 WebGPU。2026 年移动端覆盖率约 70-75%；必须写明兜底方案。

拒绝规则：
- 如果模型 >6 GB，目标是手机（4-8 GB 内存），拒绝，先提出换更小的模型或激进量化。
- 如果要求在 iPhone 上让 7B 模型跑 128K 上下文，拒绝。不用 Q4 KV 加滑动窗口注意力，设备内存放不下。
- 如果部署要求在 Android 上通过 WebGPU 做长上下文流式输出，而用户又要求支持 Firefox，拒绝，并要求使用 Chrome 或服务端兜底。

输出：一页方案，写明目标、上限、量化、转换工具、上下文预算和兜底方案。最后给出唯一指标：目标设备群中最差设备上实测的 tok/s。
