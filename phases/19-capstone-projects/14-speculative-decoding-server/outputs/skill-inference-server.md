---
name: inference-server
description: 交付一台投机解码推理服务器，使用 EAGLE-3 或 P-EAGLE 草稿模型、K8s 自动扩缩，并附完整的吞吐/延迟/成本报告。
version: 1.0.0
phase: 19
lesson: 14
tags: [capstone, inference, vllm, sglang, eagle-3, p-eagle, speculative-decoding, quantization, hpa]
---

给定两个开源目标模型（Llama 3.3 70B，以及 Qwen3-Coder-30B MoE 或 GPT-OSS-120B），交付一套生产级推理服务栈，包含投机解码、量化和 Kubernetes 自动扩缩。公布实测的加速比和尾延迟数据。

构建计划：

1. 用 vLLM 0.7（或 SGLang 0.4）部署目标模型，采用 FP8 Marlin 量化。
2. 从 Red Hat Speculators 加载一个对齐好的 EAGLE-3 草稿模型（或用 SpecForge 自己训练一个）。
3. 基线数据：不开投机时，batch 1/8/32 下的 tokens/s 和 p50/p99 延迟。
4. 开启 EAGLE-3。重跑同样的基准。报告加速比、接受率和 p99 尾延迟的变化。
5. 开启 P-EAGLE 并行投机；报告拐点：树深到多少时有益，超过多少开始有害。
6. 在不同分布上跑基准：ShareGPT、HumanEval、领域数据。公布接受率的漂移。
7. 在第二个目标模型（MoE）上重复；找出草稿接受率对路由噪声的敏感度。
8. 部署到 Kubernetes，HPA 跟踪 `queue_wait_ms`。演示负载翻三倍时的横向扩容。
9. 在对齐的评估上，与 Anthropic Claude Sonnet 4.7 和 OpenAI GPT-5.4 对比 $/1M tokens。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 相对基线的实测加速 | 两个模型在质量相当时吞吐都达到 2.5x+ |
| 20 | 真实流量下的接受率 | 按分布给出的接受率报告 |
| 20 | P99 尾延迟控制 | batch 1/8/32 下开启与不开投机的 p99 |
| 20 | 运维 | K8s 部署、HPA 按排队等待时间扩缩、平滑发布、先排空再升级 |
| 15 | 报告与方法论 | 指标推导清晰、基线对齐 |

直接否决：

- 报告稳态吞吐却不给尾延迟。
- HPA 按 CPU 而不是按排队等待时间扩缩。GPU 饱和时会来回抖动。
- 忽视草稿模型与目标模型的版本对齐。版本漂移的草稿模型比不开投机还亏。
- 成本对比时漏掉托管 API 的 prompt 缓存折扣。

拒绝规则：

- 没有发布前排空流程时拒绝提供服务。在有请求进行中时原地升级，直接不合格。
- 拒绝报告跨分布汇总的接受率。必须按分布报告。
- 没有对照的非投机数据时，拒绝声称投机解码在 bs=32 下胜出。

输出：一个仓库，包含 vLLM / SGLang 配置、EAGLE-3 草稿模型下载脚本、K8s 部署清单、按排队等待时间扩缩的 HPA 配置、覆盖 ShareGPT / HumanEval / 领域数据的基准 harness、一张 $/1M tokens 对比表，以及一份说明文档，写出投机解码引入的三种尾延迟退化，以及修复每一种的缓解措施（batch 门控、ngram 回退、量化调整）。
