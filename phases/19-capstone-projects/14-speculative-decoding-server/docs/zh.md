# 顶点项目 14 —— 推测解码推理服务器

> 推测解码让廉价 draft 提议 token，再由目标模型一次性验证；它已经是生产级优化，不再只是研究技巧。vLLM 0.7 里的 EAGLE-3 在真实流量上交出 2.5-3 倍吞吐。P-EAGLE（AWS 2026）把并行推测又往前推了一截，SGLang 的 SpecForge 大规模训练 draft 头，Red Hat 的 Speculators hub 为常见开源模型发布对齐 draft，TensorRT-LLM 则让推测解码在 NVIDIA 上成为一等公民。2026 年的生产服务栈是带 EAGLE 系列 draft、FP8 或 INT4 量化、按 queue-wait 做 HPA 的 vLLM 或 SGLang。本顶点项目要用两个开源模型达到基线 2.5 倍以上吞吐，并附一份完整的尾延迟报告。

**类型：** Capstone
**语言：** Python（服务）、C++ / CUDA（kernel 检视）、YAML（配置）
**前置要求：** 第 3 阶段（深度学习）、第 7 阶段（transformer）、第 10 阶段（从零做 LLM）、第 17 阶段（基础设施）
**涉及阶段：** P3 · P7 · P10 · P17
**预计时间：** 30 小时

## 问题背景

推测解码在 2026 年成了大路货。EAGLE-3 draft 头在目标模型的隐藏状态上训练，预测往前 N 个 token；目标模型一遍验证。60-80% 的接受率换来 2-3 倍的端到端吞吐。vLLM 0.7 原生集成了它。SGLang + SpecForge 给你训练流水线。Red Hat 的 Speculators 为 Llama 3.3 70B、Qwen3-Coder-30B MoE、GPT-OSS-120B 发布对齐的 draft。

手艺在服务运维上，不在模型。接受率随流量分布漂移（ShareGPT vs 代码 vs 领域数据）。被拒时的尾延迟比不做推测还差——你必须报告多个批大小下的 p99，而不只是稳态的 tokens/秒。每 100 万 token 成本 vs Anthropic / OpenAI API 是那根可信度杠杆。

## 核心概念

推测解码有两层。一个 **draft** 模型（EAGLE-3 头、ngram，或更小的、与目标对齐的模型）每步提出 k 个候选 token。**target（目标）**模型一遍验证全部 k 个；任何被接受的前缀替换贪心路径。接受率取决于 draft-target 对齐度和输入分布。

EAGLE-3 在大多数流量上胜过 ngram draft。P-EAGLE 跑并行推测以得到更深的 draft 树。代价：被拒时的 P99 延迟更高，因为验证遍更大。服务配置必须报告按批大小分桶的延迟来暴露这一点。

部署是 Kubernetes。vLLM 0.7 每个 GPU 或张量并行分片跑一个副本。HPA 按 queue-wait 而不是 CPU 自动扩缩。FP8（Marlin）和 INT4（AWQ）量化把 GPU 内存控制在 H100 / H200 的范围内。端到端报告是吞吐、接受率、批 1/8/32 下的 p50/p99，以及 $/100 万 token。

## 架构

```
request ingress
    |
    v
vLLM server (0.7) or SGLang (0.4)
    |
    +-- draft: EAGLE-3 heads | P-EAGLE parallel | ngram fallback
    +-- target: Llama 3.3 70B | Qwen3-Coder-30B | GPT-OSS-120B
    |     quantized FP8-Marlin or INT4-AWQ
    |
    v
verify pass: batch k draft tokens through target
    |
    v (accept prefix; resample for rejected suffix)
    v
token stream back to client
    |
    v
Prometheus metrics: throughput, acceptance rate, queue wait, latency p50/p99
    |
    v
HPA on queue-wait metric
```

## 技术栈

- 服务：vLLM 0.7 或 SGLang 0.4
- 推测方法：EAGLE-3 draft 头、P-EAGLE 并行推测、ngram 兜底
- draft 训练：SpecForge（SGLang）或 Red Hat Speculators
- 目标模型：Llama 3.3 70B、Qwen3-Coder-30B MoE、GPT-OSS-120B
- 量化：FP8（Marlin）、INT4 AWQ
- 部署：Kubernetes + NVIDIA device plugin；按 queue-wait 指标做 HPA
- 评测：ShareGPT、MT-Bench-v2、GSM8K、HumanEval，用于跨领域分布的接受率测量
- 参考：TensorRT-LLM 推测解码作为厂商基线

```figure
cf-spec-decode
```

## 动手构建

1. **目标模型准备。** 选 Llama 3.3 70B。经 Marlin 量化到 FP8。在 vLLM 0.7 下部署到 1 卡 H100（或 2 卡张量并行）。

2. **draft 来源。** 从 Red Hat Speculators 拉一个对齐的 EAGLE-3 draft 头（或经 SpecForge 训一个）。加载进 vLLM 的推测解码配置。

3. **基线数字。** 推测之前：批 1/8/32 下的 tokens/秒、p50/p99 延迟、GPU 利用率。发布。

4. **开启 EAGLE-3。** 翻配置；重跑同一基准。报告加速、接受率、p99 尾延迟差值。

5. **P-EAGLE。** 开启并行推测；衡量更深的 draft 树 vs 串行 EAGLE-3。报告 P-EAGLE 帮忙 vs 帮倒忙的拐点。

6. **领域流量。** 让 ShareGPT vs HumanEval vs 领域专属流量过同一个服务器。衡量每种分布的接受率。识别 draft 何时漂移。

7. **第二个目标模型。** 在 Qwen3-Coder-30B MoE 上跑同样的流水线。draft 更棘手（MoE 路由噪声）。报告。

8. **K8s HPA。** 在 K8s 下部署，HPA 追踪 `queue_wait_ms`。演示负载翻三倍时的横向扩展。

9. **成本对比。** 在同一份评测上算 $/100 万 token vs Anthropic Claude Sonnet 4.7 和 OpenAI GPT-5.4。发布。

## 实际使用

```
$ curl https://infer.example.com/v1/chat/completions -d '{"messages":[...]}'
[serve]     vLLM 0.7, Llama 3.3 70B FP8, EAGLE-3 active
[decode]    bs=8, accepted_tokens_per_step=3.2, acceptance_rate=0.76
[latency]   first-token 42ms, full-response 980ms (620 tokens)
[cost]      $0.34 per 1M output tokens at sustained throughput
```

## 拿去用

`outputs/skill-inference-server.md` 描述交付物。一个带推测解码、有实测的服务栈、一份完整基准报告，以及一个 K8s 部署。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 对比基线的实测加速 | 在两个模型上质量持平时 2.5 倍以上吞吐 |
| 20 | 真实流量上的接受率 | 逐分布的接受率报告 |
| 20 | P99 尾延迟纪律 | 有无推测时批 1/8/32 下的 p99 |
| 20 | 运维 | K8s 部署、按 queue-wait 做 HPA、上线平滑 |
| 15 | 撰写与方法论 | 清楚解释改了什么、为什么 |
| **100** | | |

## 练习

1. 衡量当 draft 比目标落后一个版本时（如 Llama 3.3 -> 3.4 漂移）的接受率退化。搭一个监控告警。

2. 实现 ngram 兜底：如果 EAGLE-3 接受率跌破阈值，切到 ngram draft。报告可靠性提升。

3. 跑一个受控的 MoE 实验：同一个 Qwen3-Coder-30B，注入路由噪声 vs 不注入。衡量 draft 接受率的敏感度。

4. 扩展到 H200（141 GB）。报告每副本得到的模型大小余量，以及你能否服务一个未量化的 Llama 3.3 70B。

5. 在同样的 H100 硬件上给 TensorRT-LLM 推测解码跑基准。报告它在哪里胜过 vLLM。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Draft model（draft 模型） | “推测器” | 提出 N 个 token 让目标验证的小模型 |
| EAGLE-3 | “2026 draft 架构” | 在目标隐藏状态上训练的 draft 头；约 75% 接受率 |
| P-EAGLE | “并行推测” | 在一遍目标验证里验证的 draft 分支树 |
| Acceptance rate（接受率） | “命中率” | 无需重采样就被接受的 draft token 占比 |
| Quantization（量化） | “FP8 / INT4” | 更低精度的权重，让 GPU 内存里塞下更多模型 |
| Queue wait（队列等待） | “HPA 指标” | 请求在挂起队列里等到推理开始的时间 |
| Speculators hub | “对齐的 draft” | Red Hat Neural Magic 为常见开源模型出的 EAGLE draft 中心 |

## 延伸阅读

- [vLLM EAGLE and P-EAGLE documentation](https://docs.vllm.ai) —— 参考服务栈
- [P-EAGLE (AWS 2026)](https://aws.amazon.com/blogs/machine-learning/p-eagle-faster-llm-inference-with-parallel-speculative-decoding-in-vllm/) —— 并行推测解码论文 + 集成
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge) —— draft 头训练流水线
- [Red Hat Speculators](https://github.com/neuralmagic/speculators) —— 对齐 draft 中心
- [TensorRT-LLM speculative decoding](https://nvidia.github.io/TensorRT-LLM/) —— 厂商替代方案
- [Fireworks.ai serving architecture](https://fireworks.ai/blog) —— 商业参考
- [EAGLE-3 paper (arXiv:2503.01840)](https://arxiv.org/abs/2503.01840) —— 方法论文
- [vLLM repository](https://github.com/vllm-project/vllm) —— 代码与基准
