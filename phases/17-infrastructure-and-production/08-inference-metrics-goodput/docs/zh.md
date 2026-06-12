# 推理指标 —— TTFT、TPOT、ITL、Goodput、P99

> 四个指标决定一个推理部署能不能用。TTFT 是 prefill 加队列加网络。TPOT（等价于 ITL）是受内存限制的每 token decode 成本。端到端延迟是 TTFT 加上 TPOT 乘以输出长度。吞吐是跨整个集群聚合的每秒 token 数。但对产品真正重要的是 goodput —— 同时满足每一条 SLO 的请求比例。高吞吐低 goodput 意味着你在处理那些永远没法及时送到用户手里的 token。2026 年 Llama-3.1-8B-Instruct 在 TRT-LLM 上的参考数字：平均 TTFT 162 ms，平均 TPOT 7.33 ms，平均 E2E 1,093 ms。永远报 P50、P90、P99 —— 绝不只报均值。还要当心测量陷阱：GenAI-Perf 把 TTFT 排除在 ITL 计算之外，LLMPerf 把它算进去；两个工具对同一次跑的 TPOT 说法不一致。

**类型：** Learn
**语言：** Python（标准库，一个玩具级分位数计算器与 goodput 报告器）
**前置要求：** 阶段 17 · 04（vLLM 服务内部机制）
**预计时间：** ~60 分钟

## 学习目标

- 精确定义 TTFT、TPOT、ITL、E2E、吞吐和 goodput，并说出每个量测的是哪个组件。
- 解释为什么均值对 LLM 服务是错误的统计量，以及怎么读 P50/P90/P99。
- 构造一个 SLO 多约束（比如 TTFT<500 ms 且 TPOT<15 ms 且 E2E<2 s），并据此算 goodput。
- 说出两个对同一次跑的 TPOT 说法不一致的基准工具，并解释为什么。

## 问题背景

"我们的吞吐是每秒 15,000 token。"那又怎样？如果 40% 的请求端到端飙过了 2 秒，用户就放弃会话了。光看吞吐没法告诉你产品能不能用。

推理有多个延迟维度，每个维度的失败方式都不同。Prefill 受计算限制，随 prompt 长度增长。Decode 受内存限制，随批大小增长。排队延迟是个运维问题。网络是个物理距离问题。你需要为每一个准备不同的指标，需要分位数，还需要一个回答"用户拿到他预期的东西了吗"的单一综合值 —— 那就是 goodput。

## 核心概念

### TTFT —— 首 token 时间

`TTFT = queue_time + network_request + prefill_time`

prompt 长时 prefill 主导。在 H100 上的 Llama-3.3-70B FP8，一个 32k prompt 要约 800 ms 的纯 prefill。队列时间是负载下调度器的行为。网络请求是含 TLS 的线上时间。TTFT 是用户在任何东西流式回来之前看到的延迟。

### TPOT / ITL —— token 间延迟

一个量有很多名字。`TPOT`（每输出 token 的时间）、`ITL`（token 间延迟）、`每 token 的 decode 延迟` —— 都是一回事。它是首 token 之后相邻流式 token 之间的时间。

`TPOT = (decode_forward_time + scheduler_overhead) / tokens_produced`

在同一套带 chunked prefill 的 Llama-3.3-70B H100 栈上，TPOT 均值约 7 ms。不带 chunked prefill，在相邻序列的一次长 prefill 期间，TPOT 能飙到 50 ms。盯 P99，不是均值。

### E2E 延迟

`E2E = TTFT + TPOT * output_tokens + network_response`

对长输出（>500 token），E2E 由 TPOT 主导。对长 prompt 的短输出，E2E 由 TTFT 主导。报告按输出长度分组的 E2E。

### 吞吐

`throughput = total_output_tokens / elapsed_time`

聚合指标。告诉你集群效率。不告诉你单个请求的健康度。

### Goodput —— 你真正在乎的指标

`goodput = 满足 (TTFT <= a) 且 (TPOT <= b) 且 (E2E <= c) 的请求比例`

SLO 是一个多约束。一个请求只有在每条约束都成立时才算"好"。Goodput 是这个比例。60% goodput 下的高吞吐是失败。99% goodput 下的较低吞吐才是目标。

2026 年，goodput 是 MLPerf Inference v6.0 提交里用的指标，也是 AI 平台供应商内部 SLA 跟踪里用的指标。

### 为什么均值是错误的统计量

LLM 延迟分布是右偏的。一个带一个长 prefill 邻居的 decode 批次，可能以约 7 ms 的 TPOT 发出 500 个 token，又以约 60 ms 的 TPOT 发出 20 个 token。均值 TPOT 是 9 ms。P99 TPOT 是 65 ms。用户经常撞上 P99 —— 这就是他们离开的原因。

永远报这三元组（P50、P90、P99）。对用户体验，P99 是你要优化的那个。

### 参考数字 —— Llama-3.1-8B-Instruct 在 TRT-LLM 上，2026

- 平均 TTFT：162 ms
- 平均 TPOT：7.33 ms
- 平均 E2E：1,093 ms
- P99 TPOT：随 chunked prefill 配置在 10-25 ms 之间变化。

这些是 NVIDIA 发布的参考点。它们随模型规模（70B 会显示 3-5 倍）、硬件（H100 vs B200 约 3 倍）和负载变化。

### 测量陷阱

2026 年两个最常用的基准工具对同一次跑的 TPOT 说法不一致：

- **NVIDIA GenAI-Perf**：把 TTFT 排除在 ITL 计算之外。ITL 从第 2 个 token 开始算。
- **LLMPerf**：把 TTFT 算进去。ITL 从第 1 个 token 开始算。

对一个 TTFT 500 ms、100 个输出 token、总 decode 700 ms 的请求，GenAI-Perf 报 `ITL = 700/99 = 7.07 ms`，LLMPerf 报 `ITL = 1200/100 = 12.00 ms`。选哪个工具改变这个数字。

永远说明用的是哪个工具。永远公布定义。

### 构造一个 SLO

2026 年一个 70B 聊天模型面向消费者的合理 SLO：

- TTFT P99 <= 800 ms。
- TPOT P99 <= 25 ms。
- 输出 <300 token 时 E2E P99 <= 3 s。
- Goodput 目标 >= 99%。

企业 SLO 收紧 TTFT（200-400 ms），放松 E2E。要点是把它们写下来、三个都量、把 goodput 作为单一综合值来跟踪。

### 怎么测

- 跑真实流量或贴近真实的合成流量（LLMPerf 配 `--mean-input-tokens 800 --stddev-input-tokens 300 --mean-output-tokens 150`）。
- 基准跑的目标是 2 倍峰值并发。
- 跑 30-50 次迭代，取合并样本的分位数。
- 发布时带上工具名、工具版本、模型、硬件、并发、prompt 分布。

```figure
throughput-latency
```

## 实际使用

`code/main.py` 是个玩具级 goodput 计算器。生成一个合成延迟分布，套一个 SLO，算出 goodput。也展示同一条 trace 上 GenAI-Perf vs LLMPerf 的 TPOT 差异。

## 拿去用

这一课产出 `outputs/skill-slo-goodput-gate.md`。给定一个工作负载和 SLO，它产出一份 CI/CD 就绪的基准配方，用 goodput 而不是吞吐来给部署做闸门。

## 练习

1. 跑 `code/main.py`。生成一个带 1% 尾部尖峰的分布。当你把 P99 TPOT 从 30 ms 收紧到 15 ms 时，goodput 怎么变？
2. 一个厂商报"Llama 3.3 70B H100 上每秒 15,000 token"。说出在相信它之前要问的三个问题。
3. 为什么 chunked prefill 保护 P99 TPOT 而不保护均值 TPOT？
4. 为一个语音助手（首 token 是被听到的，不是被读到的）构造一个消费者 SLO。哪个指标对用户最可见？
5. 读 LLMPerf README 和 GenAI-Perf 文档。找出另外三个两个工具说法不一致的指标。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| TTFT | "首 token 时间" | 队列 + 网络 + prefill；长 prompt 下由 prefill 主导 |
| TPOT | "每输出 token 的时间" | 首 token 之后受内存限制的每 token decode 成本 |
| ITL | "token 间延迟" | 在多数工具里与 TPOT 相同（不是全部 —— 见 GenAI-Perf） |
| E2E | "端到端" | TTFT + TPOT * output_len；外加响应侧网络 |
| 吞吐 | "tok/s" | 集群效率；没有延迟分位数就没用 |
| Goodput | "SLO 达标率" | 同时满足每条 SLO 约束的请求比例 |
| P99 | "尾部" | 百里挑一的最坏延迟；用户体验指标 |
| SLO 多约束 | "联合" | 三条延迟边界的"与"；任一被违反则请求失败 |
| GenAI-Perf vs LLMPerf | "工具陷阱" | 工具对 ITL 是否包含 TTFT 说法不一致 |

## 延伸阅读

- [NVIDIA NIM — LLM Benchmarking Metrics](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html) —— TTFT、ITL、TPOT 的标准定义。
- [Anyscale — LLM Serving Benchmarking Metrics](https://docs.anyscale.com/llm/serving/benchmarking/metrics) —— 替代定义与测量配方。
- [BentoML — LLM Inference Metrics](https://bentoml.com/llm/inference-optimization/llm-inference-metrics) —— 在真实部署上的实测。
- [LLMPerf](https://github.com/ray-project/llmperf) —— 基于 Ray 的开源基准。
- [GenAI-Perf](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/client/src/c++/perf_analyzer/genai-perf/README.html) —— NVIDIA 的基准工具。
- [MLPerf Inference](https://mlcommons.org/benchmarks/inference-datacenter/) —— 业界公认的基于 goodput 的基准。
