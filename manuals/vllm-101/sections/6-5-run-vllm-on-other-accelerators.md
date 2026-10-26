# 在其他加速器上运行 vLLM

> vLLM 通过插件支持其他加速器，每个插件都有自己的发布周期。

你的硬件不是 NVIDIA GPU。读完本节，你可以找到适合自己硬件的插件及其版本。

## 了解内置支持和插件 {#s-run-vllm-on-other-accelerators-know-what-is-built-in-and-what-is-a-plugin}

vLLM 0.31.0 内置支持 NVIDIA GPU、通过 ROCm 支持 AMD GPU、Intel GPU，以及 CPU。其他硬件通过插件运行。插件是一个独立的 Python 包，安装时会向 vLLM 注册平台。将插件与 vLLM 安装在同一个环境中，vLLM 就会发现它。

插件设计来自 2024 年 12 月的一份 RFC。此后，多个原先位于 vLLM 内部的 backend 已迁移到独立插件。

## 查找插件 {#s-run-vllm-on-other-accelerators-find-your-plugin}

| 硬件 | 插件 | 与 vLLM 的版本关系 |
|---|---|---|
| Google TPU | tpu-inference，正在改名为 vllm-jax | 每个 vLLM 版本都有对应发布和镜像 |
| Huawei Ascend NPU | vllm-ascend | 为近期 vLLM 版本发布候选版本，正式版约每三个月发布一次 |
| Intel Gaudi | vllm-gaudi | 根据指定的 vLLM 版本发布 |
| AWS Trainium 和 Inferentia | vllm-neuron | 发布记录会注明基于哪个 vLLM 版本 |
| IBM Spyre | sendnn-inference | 使用自己的版本号 |
| Apple silicon GPU | 社区维护的 MLX 插件 vllm-metal | 使用自己的发布周期 |

## 规划前先检查版本 {#s-run-vllm-on-other-accelerators-check-the-version-before-you-plan}

插件支持的 vLLM 版本经常落后于最新版本。2026 年 10 月，vllm-ascend 的最新正式版本针对 vLLM 0.23.0，而 vLLM 本身已经达到 0.32.0。TPU 插件则在 vLLM 0.31.0 发布后的几天内提供了对应版本。

为你的硬件规划功能前：

1. 找到最新插件版本，查看它针对的 vLLM 版本。
2. 阅读该版本的 vLLM 文档，不要直接阅读最新版本文档。
3. 检查插件的功能表。CUDA 路径中的部分功能，例如某些量化格式和 attention backend，可能没有适用于其他硬件的版本。

我们没有在自己的硬件上测量，只运行过 NVIDIA GPU。

```takeaways
- 其他硬件需要在 vLLM 环境旁安装对应的插件包。
- 插件可能落后最新 vLLM 多个版本，先查看它支持的版本。
- 阅读该版本的文档，不要使用最新版文档推断行为。
```

来源：vLLM 0.31.0 源码（vllm/platforms/、vllm/plugins/），vLLM 0.31.0 文档（docs/design/plugin_system.md、docs/getting_started/installation/），vLLM RFC 11162（Hardware pluggable，2024 年 12 月），tpu-inference、vllm-ascend、vllm-gaudi、vllm-neuron、sendnn-inference 和 vllm-metal 的发布页面（2026-10-21 查阅）。
