# 压测 LLM API —— 为什么 k6 和 Locust 会骗你

> 传统压测工具不是为流式响应、可变输出长度、token 级指标或 GPU 饱和设计的。两个陷阱咬大多数团队。GIL 陷阱：Locust 的 token 级测量在 Python GIL 下跑分词，重并发时它和请求生成抢资源；分词积压随后膨胀报告的 token 间延迟 —— 瓶颈是你的客户端，不是服务器。prompt 一致性陷阱：循环里发相同的 prompt 只测了 token 分布上的一个点；真实流量长度多变、前缀匹配多样。LLMPerf 用 `--mean-input-tokens` + `--stddev-input-tokens` 修这点。2026 年的工具映射：LLM 专用（GenAI-Perf、LLMPerf、LLM-Locust、guidellm）用于 token 级精度；**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）** —— 流式感知、经由 TestRun/PrivateLoadZone CRD 的 Kubernetes 原生分布式，最适合 CI/CD 闸门；Vegeta 用于 Go 恒速饱和；Locust 2.43.3 只有配 LLM-Locust 扩展才能做流式。负载模式：稳态、爬坡、尖峰（自动扩缩测试）、浸泡（内存泄漏）。

**类型：** Build
**语言：** Python（标准库，一个玩具级真实 prompt 生成器 + 延迟采集器）
**前置要求：** 阶段 17 · 08（推理指标）、阶段 17 · 03（GPU 自动扩缩）
**预计时间：** ~75 分钟

## 学习目标

- 解释那两个让通用压测工具在 LLM API 上撒谎的反模式（GIL 陷阱、prompt 一致性陷阱）。
- 为给定目的挑工具：LLMPerf（基准跑）、k6 + 流式扩展（CI 闸门）、guidellm（大规模合成）、GenAI-Perf（NVIDIA 参考）。
- 设计四种负载模式（稳态、爬坡、尖峰、浸泡），并说出每种抓的故障模式。
- 用输入 token 的均值 + 标准差而不是固定长度，构建一个真实的 prompt 分布。

## 问题背景

你用 k6 在 500 并发用户下压测了 LLM 端点。它扛住了。你上线了。生产里在实际 200 用户时服务垮了 —— P99 TTFT 爆炸，GPU 钉死。

发生了两件事。第一，k6 发了 500 个相同的 prompt —— 你的请求合并和前缀缓存让它看起来在处理 500 个并发 decode，而你实际只在处理一个。第二，k6 不会像眼睛体验的那样跟踪流式响应上的 token 间延迟；它看到的是一个 HTTP 连接，不是 500 个以不同间隔到达的 token。

LLM 的压测是它自己的一门学科。

## 核心概念

### GIL 陷阱（Locust）

Locust 用 Python，在 GIL 下客户端跑分词。高并发下分词器排在请求生成后面。报告的 token 间延迟包含了客户端分词积压。你以为服务器慢；其实是测试工具。

修法：LLM-Locust 扩展把分词移到独立进程，或者用编译语言的工具（k6、用 tokenizers.rs 的 LLMPerf）。

### prompt 一致性陷阱

所有已知的压测工具都让你配一个 prompt。在 10,000 次迭代的循环测试里，每次发的都是同一个 prompt。服务器每次看到相同前缀 —— 前缀缓存命中接近 100%，吞吐看起来很棒。

修法：从一个 prompt 分布里采样。LLMPerf 用 `--mean-input-tokens 500 --stddev-input-tokens 150` —— 长度多样、内容多样。

### 四种负载模式

1. **稳态** —— 恒定 RPS 跑 30-60 分钟。抓：基线性能回退。
2. **爬坡** —— 15 分钟内 RPS 从 0 线性增到目标。抓：容量断点、预热异常。
3. **尖峰** —— 突然 3-10x RPS 持续 2 分钟再回落。抓：自动扩缩延迟、队列饱和、冷启动影响。
4. **浸泡** —— 稳态跑 4-8 小时。抓：内存泄漏、连接池漂移、可观测性溢出。

### 2026 工具映射

**LLMPerf**（Anyscale）—— Python 但 Rust 支撑分词。均值/标准差 prompt。流式感知。性能跑的最佳默认。

**NVIDIA GenAI-Perf** —— NVIDIA 的参考。用 Triton 客户端；指标覆盖全面。注意它的 ITL 排除 TTFT；LLMPerf 的包含它。两个工具对同一服务器给出不同 TPOT。

**LLM-Locust**（TrueFoundry）—— 修复 GIL 陷阱的 Locust 扩展。熟悉的 Locust DSL + 流式指标。

**guidellm** —— 大规模合成基准。

**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）**：
- k6 本身（Go，编译，无 GIL）加了流式感知指标。
- k6 Operator 用 TestRun / PrivateLoadZone CRD 做 Kubernetes 原生分布式测试。
- 最适合 CI/CD 闸门和 SLA 测试。

**Vegeta** —— Go，比 k6 简单。恒速 HTTP 饱和。非 LLM 感知，但适合网关 / 限流测试。

**Locust 2.43.3 原版** —— 对 LLM 有 GIL 陷阱。只有配 LLM-Locust 扩展才行。

### CI 里的 SLA 闸门

在 PR 上跑 k6：

- 各 30-50 次迭代，跑在基线 RPS。
- 闸门：P50/P95 TTFT、5xx < 5%、TPOT 在阈值以下。
- 越界则让构建失败。

### 真实 prompt 分布

从真实流量样本（如果你有）或从已发布的分布（比如聊天用 ShareGPT prompt、代码用 HumanEval）来构建。把均值 + 标准差喂给 LLMPerf。不惜一切代价避开"用一个 prompt 循环"。

### 你该记住的数字

- k6 Operator 1.0 GA：2025 年 9 月。
- k6 v2026.1.0：流式感知指标。
- 典型 LLMPerf 跑：并发 X 下 100-1000 个请求。
- 典型 CI 闸门：每 PR 30-50 次迭代。
- 四种模式：稳态、爬坡、尖峰、浸泡。

```figure
load-pattern-waves
```

## 实际使用

`code/main.py` 用真实 prompt 分布模拟一次压测，测量有效 TPOT，并演示一致性 prompt 陷阱。

## 拿去用

这一课产出 `outputs/skill-load-test-plan.md`。给定工作负载和 SLA，挑工具并设计四种负载模式。

## 练习

1. 跑 `code/main.py`。对比一致 vs 真实分布 —— 差距在哪？
2. 为一个 CI 闸门写 k6 脚本：100 并发下 TTFT P95 < 800 ms，运行时长 5 分钟。
3. 你的浸泡测试显示内存每小时涨 50 MB。说出三个原因，以及用来在它们之间分辨的埋点。
4. 从 10 RPS 尖峰到 100 RPS。如果 Karpenter + vLLM production-stack 都到位（阶段 17 · 03 + 18），预期恢复时间是多少？
5. GenAI-Perf 报 TPOT=6ms；LLMPerf 在同一服务器上报 TPOT=11ms。解释。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| LLMPerf | "LLM 压测工具" | Anyscale 基准工具，流式感知 |
| GenAI-Perf | "NVIDIA 工具" | NVIDIA 参考压测工具 |
| LLM-Locust | "给 LLM 的 Locust" | 修复 GIL 陷阱的 Locust 扩展 |
| guidellm | "合成基准" | 大规模合成工具 |
| k6 Operator | "K8s k6" | 基于 CRD 的分布式 k6 |
| GIL 陷阱 | "Python 客户端开销" | 分词积压膨胀报告的延迟 |
| prompt 一致性陷阱 | "单 prompt 谎言" | 用同一 prompt 循环命中缓存，膨胀吞吐 |
| 稳态 | "恒定负载" | N 分钟平 RPS |
| 爬坡 | "线性上升" | 在时长内从 0 到目标 |
| 尖峰 | "突发测试" | 突然乘数再回落 |
| 浸泡 | "长测试" | 数小时做泄漏检测 |

## 延伸阅读

- [TianPan — Load Testing LLM Applications](https://tianpan.co/blog/2026-03-19-load-testing-llm-applications)
- [PremAI — Load Testing LLMs 2026](https://blog.premai.io/load-testing-llms-tools-metrics-realistic-traffic-simulation-2026/)
- [NVIDIA NIM — Introduction to LLM Inference Benchmarking](https://docs.nvidia.com/nim/large-language-models/1.0.0/benchmarking.html)
- [TrueFoundry — LLM-Locust](https://www.truefoundry.com/blog/llm-locust-a-tool-for-benchmarking-llm-performance)
- [LLMPerf](https://github.com/ray-project/llmperf)
- [k6 Operator](https://github.com/grafana/k6-operator)
