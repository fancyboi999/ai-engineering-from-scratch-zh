# 自托管服务选型 —— llama.cpp、Ollama、TGI、vLLM、SGLang

> 2026 年四个引擎主导自托管推理。基于硬件、规模和生态来挑。**llama.cpp** 在 CPU 上最快 —— 模型支持最广，对量化和线程完全掌控。**Ollama** 是开发笔记本上的一条命令安装，比 llama.cpp 慢约 15-30%（Go + CGo + HTTP 序列化），在类生产负载下吞吐差 3 倍。**TGI 于 2025 年 12 月 11 日进入维护模式** —— 只修 bug，裸吞吐比 vLLM 慢约 10%，但历来可观测性和 HF 生态集成顶尖。那个维护状态让它成为一个长期上有风险的押注 —— 新项目用 SGLang 或 vLLM 是更安全的默认。**vLLM** 是通用生产默认 —— v0.15.1（2026 年 2 月）加了 PyTorch 2.10、RTX Blackwell SM120、H200 优化。**SGLang** 是 agentic 多轮 / prefix 重的专家 —— 生产里 400,000+ 块 GPU（xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS）。硬件约束：仅 CPU → 只能 llama.cpp。AMD / 非 NVIDIA → 只能 vLLM（TRT-LLM 锁死 NVIDIA）。2026 流水线模式：开发 = Ollama，预发 = llama.cpp，生产 = vLLM 或 SGLang。全程同一套 GGUF/HF 权重。

**类型：** Learn
**语言：** Python（标准库，引擎决策树遍历器）
**前置要求：** 阶段 17 里所有讲引擎的课（04、06、07、09、18）
**预计时间：** ~45 分钟

## 学习目标

- 给定硬件（CPU / AMD / NVIDIA Hopper / Blackwell）、规模（1 用户 / 100 / 10,000）和工作负载（通用聊天 / agent / 长上下文），挑一个引擎。
- 说出 2026 年 TGI 的维护模式状态（2025 年 12 月 11 日），以及为什么它让新项目偏向 vLLM 或 SGLang。
- 描述全程用同一套 GGUF 或 HF 权重的 开发/预发/生产 流水线。
- 解释为什么"仅 CPU"逼向 llama.cpp，"AMD"排除 TRT-LLM。

## 问题背景

你的团队开始一个新的自托管 LLM 项目。一个工程师说 Ollama，另一个说 vLLM，第三个说"TGI 不是开箱即用吗？"三个在不同场景下都对。没一个对所有场景都对。

2026 年这棵选择树很重要：硬件第一、规模第二、工作负载第三。还有一个特定的 2025 年事件 —— TGI 在 12 月 11 日进入维护模式 —— 改变了新项目的默认。

## 核心概念

### 五个引擎

| 引擎 | 最适合 | 备注 |
|--------|----------|-------|
| **llama.cpp** | CPU / 边缘 / 最少依赖 / 模型支持最广 | CPU 上最快，完全掌控 |
| **Ollama** | 开发笔记本、单用户、一条命令安装 | 比 llama.cpp 慢 15-30%；生产吞吐差 3 倍 |
| **TGI** | HF 生态、受监管行业 | **2025 年 12 月 11 日维护模式** |
| **vLLM** | 通用生产、100+ 用户 | 广泛的生产默认；v0.15.1 2026 年 2 月 |
| **SGLang** | agentic 多轮、prefix 重的工作负载 | 生产里 400,000+ 块 GPU |

### 硬件优先的决策

**仅 CPU** → llama.cpp。Ollama 也行但更慢。CPU 上没有其他引擎有竞争力。

**AMD GPU** → vLLM（AMD ROCm 支持）。SGLang 也行。TRT-LLM 锁死 NVIDIA，所以出局。

**NVIDIA Hopper（H100 / H200）** → vLLM 或 SGLang 或 TRT-LLM。三个都是顶级。

**NVIDIA Blackwell（B200 / GB200）** → TRT-LLM 是吞吐领头羊（阶段 17 · 07）。vLLM 和 SGLang 紧随其后。

**Apple Silicon（M 系列）** → llama.cpp（Metal）。Ollama 是对它的封装。

### 规模第二的决策

**1 用户 / 本地开发** → Ollama。一条命令，几秒出首 token。

**10-100 用户 / 小团队** → vLLM 单 GPU。

**100-10k 用户 / 生产** → vLLM production-stack（阶段 17 · 18）或 SGLang。

**10k+ 用户 / 企业** → vLLM production-stack + 分离式（阶段 17 · 17）+ LMCache（阶段 17 · 18）。

### 工作负载第三的决策

**通用聊天 / 问答** → vLLM 凭广泛的默认胜出。

**agentic 多轮（工具、规划、记忆）** → SGLang 的 RadixAttention（阶段 17 · 06）碾压。

**前缀重度复用的 RAG** → SGLang。

**代码生成** → vLLM 够用；SGLang 在缓存上略好。

**长上下文（128K+）** → vLLM + chunked prefill；SGLang + 分层 KV。

### TGI 维护陷阱

Hugging Face TGI 于 2025 年 12 月 11 日进入维护模式 —— 今后只修 bug。历来：顶级可观测性、同类最佳的 HF 生态集成（model card、安全工具）、裸吞吐略落后于 vLLM。

对 2026 年的新项目：默认避开 TGI。已有的 TGI 部署可以继续，但终究该迁移。SGLang 和 vLLM 是更安全的默认。

### 流水线模式

开发（Ollama）→ 预发（llama.cpp）→ 生产（vLLM）。全程同一套 GGUF 或 HF 权重。工程师在笔记本上快速迭代；预发镜像生产的量化；生产是服务目标。

### Ollama 注意事项

Ollama 对开发很棒。它对共享生产不棒：Go HTTP 序列化加开销，并发管理比 vLLM 简单，OpenTelemetry 支持落后。在它闪光的地方用它 —— 单用户、一条命令 —— 共享时切到 vLLM。

### 自托管 vs 托管是另一个决策

阶段 17 · 01（托管超大规模厂商）、· 02（推理平台）讲托管。这一课假设你已经决定自托管。自托管的理由：数据驻留、自定义微调、规模上的总拥有成本、托管上没有的领域模型。

### 你该记住的数字

- TGI 维护模式：2025 年 12 月 11 日。
- vLLM v0.15.1：2026 年 2 月；PyTorch 2.10；Blackwell SM120 支持。
- SGLang 生产足迹：400,000+ 块 GPU。
- Ollama 相比 llama.cpp 的吞吐差距：慢 15-30%；生产负载下差 3 倍。

```figure
data-parallel
```

## 实际使用

`code/main.py` 是个决策树遍历器：给定 硬件 + 规模 + 工作负载，挑一个引擎并解释为什么。

## 拿去用

这一课产出 `outputs/skill-engine-picker.md`。给定约束，挑一个引擎并写出迁移方案。

## 练习

1. 用你的 硬件 / 规模 / 工作负载 跑 `code/main.py`。输出和你的直觉吻合吗？
2. 你的基础设施是 12 块 H100 和 8 块 MI300X AMD。用什么引擎？为什么 TRT-LLM 不在桌面上？
3. 一个团队想在 2026 年用 TGI，理由是"我们熟它"。论证迁移的理由。
4. Ollama 开发到 vLLM 生产：量化、配置和可观测性有什么变化？
5. 一个 P99 前缀长度 8K、跨租户高复用的 RAG 产品。挑一个引擎并把它和阶段 17 · 11 + 18 叠起来。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| llama.cpp | "CPU 那个" | 模型支持最广，CPU 上最快 |
| Ollama | "笔记本那个" | 一条命令安装，开发级吞吐 |
| TGI | "HF 的服务" | 自 2025 年 12 月起维护模式 |
| vLLM | "默认那个" | 2026 年广泛的生产基线 |
| SGLang | "agentic 那个" | prefix 重、RadixAttention |
| TRT-LLM | "锁 NVIDIA 的" | Blackwell 吞吐领头羊，仅 NVIDIA |
| GGUF | "llama.cpp 格式" | 打包的 K-quant 变体 |
| Production-stack | "vLLM K8s" | 阶段 17 · 18 的参考部署 |
| 流水线模式 | "开发→预发→生产" | 同一套权重上 Ollama → llama.cpp → vLLM |

## 延伸阅读

- [AI Made Tools — vLLM vs Ollama vs llama.cpp vs TGI 2026](https://www.aimadetools.com/blog/vllm-vs-ollama-vs-llamacpp-vs-tgi/)
- [Morph — llama.cpp vs Ollama 2026](https://www.morphllm.com/comparisons/llama-cpp-vs-ollama)
- [n1n.ai — Comprehensive LLM Inference Engine Comparison](https://explore.n1n.ai/blog/llm-inference-engine-comparison-vllm-tgi-tensorrt-sglang-2026-03-13)
- [PremAI — 10 Best vLLM Alternatives 2026](https://blog.premai.io/10-best-vllm-alternatives-for-llm-inference-in-production-2026/)
- [TGI maintenance announcement](https://github.com/huggingface/text-generation-inference) —— release notes。
- [vLLM v0.15.1 release notes](https://github.com/vllm-project/vllm/releases)
