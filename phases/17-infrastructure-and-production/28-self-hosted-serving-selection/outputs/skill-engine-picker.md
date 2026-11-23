---
name: engine-picker
description: 根据硬件、规模和负载选择自托管 LLM 引擎（llama.cpp、Ollama、TGI、vLLM、SGLang），并把 2026 年 TGI 进入维护模式列为迁移触发条件。
version: 1.0.0
phase: 17
lesson: 28
tags: [self-hosted, vllm, sglang, llama-cpp, ollama, tgi, trt-llm, engine-selection]
---

给定硬件（CPU / Apple Silicon / AMD / NVIDIA Hopper / NVIDIA Blackwell）、规模（单用户 / 小团队 / 生产 / 企业）和负载（通用聊天 / agent / RAG / 长上下文 / 代码），给出引擎推荐。

输出以下内容：

1. 引擎。写出具体引擎。引用"先看硬件、再看规模、最后看负载"的决策树。
2. 为什么不选其他引擎。对每个备选引擎，说明不选它的原因（TGI 进入维护模式、AMD 不能用 TRT-LLM、Ollama 只适合开发）。
3. 流水线。如果是生产环境，写出流水线模式（开发用 Ollama → 预发用 llama.cpp → 生产用 vLLM/SGLang），并确认权重格式（GGUF 或 HF）能贯穿整条流水线。
4. 生产组合。生产规模下，组合方式参见阶段 17 · 18（production-stack）、· 17（分离部署）、· 11（缓存感知路由器）。
5. TGI 迁移。如果现有引擎是 TGI，写明迁移计划和时间线。不算紧急，但应在 6 个月内启动。
6. 硬件陷阱。点出两条硬约束：只有 CPU → llama.cpp；AMD → 不能用 TRT-LLM。

直接否决：
- 2026 年新项目默认用 TGI。拒绝。它已进入维护模式。
- 共享的生产环境、并发用户 >1 时用 Ollama。拒绝。吞吐差距太大。
- 不确认是否纯 NVIDIA 就建议 TRT-LLM。拒绝。AMD / 非 NVIDIA 硬件直接不能用。

拒绝规则：
- 如果硬件是混合的（部分 AMD、部分 NVIDIA），要求按集群分别选引擎；不要强行统一成一个。
- 如果生产规模下负载是"未知/通用"，默认用 vLLM，并计划在积累 3 个月流量数据后重新评估。
- 如果团队想要"在没有 Blackwell 的情况下单卡最快"，并坚持只用 Hopper，可以确认：TRT-LLM 和 vLLM 都可以接受。

输出：一页推荐，写明引擎、被排除的备选、流水线、生产组合和 TGI 迁移策略。最后给出唯一的季度复查项：负载形态发生实质变化时，重新评估引擎选择。
