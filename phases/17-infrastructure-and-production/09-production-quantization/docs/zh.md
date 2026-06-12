# 生产量化 —— AWQ、GPTQ、GGUF K-quant、FP8、MXFP4/NVFP4

> 量化格式不是一个放之四海皆准的选择 —— 它是硬件、服务引擎和工作负载的函数。GGUF Q4_K_M 或 Q5_K_M 统治 CPU 和边缘，经由 llama.cpp 和 Ollama 交付。当你需要在同一个基座上跑多 LoRA 时，GPTQ 在 vLLM 里胜出。带 Marlin-AWQ kernel 的 AWQ 在一个 7B 量级模型上跑到约 741 tok/s，并在 INT4 上拿到最好的 Pass@1 —— 数据中心生产的 2026 默认选。FP8 在 Hopper、Ada 和 Blackwell 上仍是中间地带 —— 近乎无损且广受支持。NVFP4 和 MXFP4（Blackwell 微缩放）很激进，需要按 block 验证。两个陷阱咬团队：校准数据集必须匹配部署领域，以及 KV cache 和权重量化是分开的 —— "我的模型现在只有 4 GB 了"这条 AWQ 教训忘了生产批大小下那 10-30 GB 的 KV cache。

**类型：** Learn
**语言：** Python（标准库，跨格式的玩具级内存与吞吐对比）
**前置要求：** 阶段 10 · 13（量化基础）、阶段 17 · 04（vLLM 服务内部机制）
**预计时间：** ~75 分钟

## 学习目标

- 说出六种生产量化格式及其在 2026 年的最佳适用点。
- 给定硬件（CPU vs GPU、Hopper vs Blackwell）、引擎（vLLM、TRT-LLM、llama.cpp）和工作负载（日常聊天、推理、多 LoRA），挑一个格式。
- 算出选定格式省下的权重内存，以及没动到的 KV cache。
- 说出那个会让量化模型在领域流量上退化的校准数据集陷阱。

## 问题背景

量化降低内存和 HBM 带宽，这正是 decode 需要的。一个 FP16 的 70B 模型有 140 GB 权重。把权重量化到 INT4（AWQ 或 GPTQ），模型就是 35 GB —— 装得进一块 H100，还给 KV cache 留了地方，这很重要，因为在 128 并发序列、2k 上下文下，光 KV cache 就是 20-30 GB。

但量化不是免费的。激进的量化会降质，尤其在推理重的任务上。不同格式配不同引擎。不同硬件原生支持不同精度。2026 年的格式动物园是真实存在的，你没法照搬别人的选择 —— 你得基于自己的栈来挑。

## 核心概念

### 六种格式

| 格式 | 比特 | 最佳适用点 | 引擎 |
|--------|------|-----------|---------|
| GGUF Q4_K_M / Q5_K_M | 4-5 | CPU、边缘、笔记本 | llama.cpp、Ollama |
| GPTQ | 4-8 | vLLM 上的多 LoRA | vLLM、TGI |
| AWQ | 4 | 数据中心 GPU 生产 | vLLM（Marlin-AWQ）、TGI |
| FP8 | 8 | Hopper/Ada/Blackwell 数据中心 | vLLM、TRT-LLM、SGLang |
| MXFP4 | 4 | Blackwell 多用户 | TRT-LLM |
| NVFP4 | 4 | Blackwell 多用户 | TRT-LLM |

### GGUF —— CPU/边缘默认选

GGUF 是一种文件格式，本身不算量化方案 —— 它把多种 K-quant 变体（Q2_K、Q3_K_M、Q4_K_M、Q5_K_M、Q6_K、Q8_0）打包进一个容器。Q4_K_M 和 Q5_K_M 是生产默认 —— 4-5 比特下近 BF16 质量。CPU 或边缘服务的最佳选择，因为 llama.cpp 是迄今最快的 CPU 推理引擎。

在 vLLM 里的吞吐惩罚：7B 上约 93 tok/s —— 这格式没为 GPU kernel 优化。部署目标是 CPU/边缘时用 GGUF。其他情况别用。

### GPTQ —— vLLM 里的多 LoRA

GPTQ 是一种带校准 pass 的训练后量化算法。Marlin kernel 让它在 GPU 上快（相比非 Marlin GPTQ 提速 2.6 倍）。7B 上约 712 tok/s。

独有的优势：GPTQ-Int4 在 vLLM 里支持 LoRA adapter。如果你在服务一个基座加 10-50 个微调变体（每个作为一个 LoRA），GPTQ 是你的路。截至 2026 年初 NVFP4 还不支持 LoRA。

### AWQ —— 数据中心 GPU 默认选

激活感知权重量化（Activation-aware Weight Quantization）。量化时保护约 1% 最显著的权重。Marlin-AWQ kernel：相比朴素提速 10.9 倍。7B 上约 741 tok/s，INT4 格式里最好的 Pass@1。

新的 GPU 服务挑 AWQ，除非你需要多 LoRA（GPTQ）或激进的 Blackwell FP4（NVFP4）。

### FP8 —— 可靠的中间地带

8 比特浮点。近乎无损。广受支持。Hopper Tensor Core 原生加速 FP8。Blackwell 继承。当质量不可妥协时（推理、医疗、代码生成），FP8 是 2026 年的安全默认选。内存节省是 INT4 的一半，但质量风险低得多。

### MXFP4 / NVFP4 —— Blackwell 激进派

微缩放 FP4。每一 block 权重有自己的缩放因子。激进，但在 Blackwell Tensor Core 上硬件加速。相比 FP8 把每 token 字节数减半 —— 阶段 17 · 07 里的经济优势。

注意事项：
- 还不支持 LoRA（2026 年初）。
- 推理重的工作负载上质量下降可见。
- 每个模型在你的 eval 集上验证。

### 校准陷阱

AWQ 和 GPTQ 需要一个校准数据集 —— 通常是 C4 或 WikiText。对领域模型（代码、医疗、法律），用通用网页文本校准会让算法对"该保护哪些权重"做出错误决策。HumanEval 上的 Pass@1 能掉好几个点。

修法：在领域内数据上校准。几百个领域样本通常就够了。上线前在 eval 集上测。

### KV cache 陷阱

AWQ 把权重缩到 4 比特。KV cache 是分开的，仍然是 FP16/FP8。对一个用 AWQ 的 70B 模型：

- 权重：~35 GB（从 140 GB 到 INT4）。
- 128 并发 × 2k 上下文下的 KV cache：~20 GB。
- 激活：~5 GB。
- 合计：~60 GB —— 装得进 H100 80GB。

天真地以为"我把模型量化到 4 GB 了"忘了另外的 30-50 GB。整体地预算 HBM。

另外，KV cache 量化（FP8 KV 或 INT8 KV）是另一个选择，有它自己的权衡 —— 它直接影响注意力精度，不是白捡的便宜。

### AWQ INT4 对推理有风险

思维链、数学、带长上下文的代码生成 —— 这些在激进量化下肉眼可见地受损。AWQ INT4 在 MATH 上掉约 3-5 个点。对推理重的工作负载，上 FP8 或 BF16；接受内存代价。

### 2026 挑选指南

- CPU/边缘服务：GGUF Q4_K_M。搞定。
- GPU 服务、日常聊天、无 LoRA：AWQ。
- GPU 服务、多 LoRA：带 Marlin 的 GPTQ。
- 推理工作负载：FP8。
- Blackwell 数据中心、质量已验证：NVFP4 + FP8 KV。
- 拿不准：在每个候选格式上跑一次 1,000 样本的 eval。

```figure
gpu-memory-breakdown
```

## 实际使用

`code/main.py` 在一段模型规模范围上，跨六种格式算内存占用（权重 + KV + 激活）和相对吞吐。展示 KV cache 在哪里主导、权重压缩在哪里划算、FP8 在哪里是安全选。

## 拿去用

这一课产出 `outputs/skill-quantization-picker.md`。给定硬件、模型规模、工作负载类型和质量容忍度，挑一个格式并产出一份校准/验证方案。

## 练习

1. 跑 `code/main.py`。对一个 70B 模型在 128 并发、2k 上下文下，算每种格式的总 HBM。哪种格式能让你装进一块 H100 80GB？
2. 你有一个 7B 代码模型。挑一个格式并论证。如果你对质量容忍度判断错了，恢复路径是什么？
3. 算一算为一个医疗领域模型校准 AWQ 所需的校准数据集大小。为什么数据更多不总是更好？
4. 读 Marlin-AWQ kernel 论文或 release notes。用三句话解释为什么 AWQ 在 7B 上跑到 741 tok/s 而裸 GPTQ 是约 712。
5. 什么时候把 AWQ 权重和 FP8 KV cache 结合起来有意义，相比把 KV 留在 BF16？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| GGUF | "llama.cpp 格式" | 打包 K-quant 变体的文件格式；CPU/边缘默认选 |
| Q4_K_M | "Q4 K M" | 4 比特 K-quant 中档；生产 GGUF 默认选 |
| GPTQ | "gee pee tee q" | 带校准的训练后 INT4；在 vLLM 里支持 LoRA |
| AWQ | "a w q" | 激活感知 INT4；Marlin kernel；INT4 上最好的 Pass@1 |
| Marlin kernel | "快速 INT4 kernel" | Hopper 上 INT4 的定制 CUDA kernel；提速 10 倍 |
| FP8 | "八位浮点" | Hopper/Ada/Blackwell 上的安全精度默认选 |
| MXFP4 / NVFP4 | "微缩放四" | 带按 block 缩放因子的 Blackwell 4 比特 FP |
| 校准数据集 | "cal 数据" | 用来挑量化参数的输入文本；必须匹配领域 |
| KV cache 量化 | "KV INT8" | 与权重分开的选择；影响注意力精度 |

## 延伸阅读

- [VRLA Tech — LLM Quantization 2026](https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/) —— 对比基准。
- [Jarvis Labs — vLLM Quantization Complete Guide](https://jarvislabs.ai/blog/vllm-quantization-complete-guide-benchmarks) —— 按格式的吞吐数字。
- [PremAI — GGUF vs AWQ vs GPTQ vs bitsandbytes 2026](https://blog.premai.io/llm-quantization-guide-gguf-vs-awq-vs-gptq-vs-bitsandbytes-compared-2026/) —— 逐格式挑选。
- [vLLM docs — Quantization](https://docs.vllm.ai/en/latest/features/quantization/index.html) —— 支持的格式和 flag。
- [AWQ paper (arXiv:2306.00978)](https://arxiv.org/abs/2306.00978) —— 原始 AWQ 表述。
- [GPTQ paper (arXiv:2210.17323)](https://arxiv.org/abs/2210.17323) —— 原始 GPTQ 表述。
