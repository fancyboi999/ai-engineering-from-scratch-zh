---
name: trtllm-blackwell-advisor
description: 针对给定负载和预算，判断 Blackwell + TensorRT-LLM + Dynamo 是否值得接受 NVIDIA 绑定。
version: 1.0.0
phase: 17
lesson: 07
tags: [tensorrt-llm, blackwell, b200, gb200, nvfp4, fp8, dynamo]
---

给定负载（模型规模、激活参数量、年度 token 量、对质量的敏感度：推理密集还是常规任务）、当前基础设施（H100/H200/B200 GPU、服务引擎）和预算，给出迁移到 Blackwell + TRT-LLM 的建议。

输出以下内容：

1. 当前基线。根据上报的用量和每 GPU 小时价格，算出当前每百万 token 的美元成本和年度支出。如果基线已经在 Blackwell + TRT-LLM 上，标出来。
2. 目标技术栈。推荐具体的精度组合（权重：NVFP4 或 FP8；KV cache：FP8；激活：NVFP4；累加器：FP32）。推理密集型负载先推荐 FP8 权重，只有在评估集上验证过逐 block 校准后才用 NVFP4。
3. 预期节省。按 2026 年的成本结构：H100 + vLLM 约 $0.09/M → B200 + TRT-LLM 约 $0.02/M → GB200 NVL72 + Dynamo 约 $0.012/M。按该负载的 token 量估算年度节省。
4. 迁移成本。工程时间（首次迁移需要 10-30 人周）。一轮质量验证。GPU 资本支出或租用承诺。
5. 回本周期。需要在生产上跑多少个月才能摊平迁移成本。超过 18 个月就标为收益有限。
6. 锁定风险。TRT-LLM 只支持 NVIDIA。给出两个退出策略（双栈：迭代层在 H100 上跑 vLLM；保持权重可导出为 GGUF/HF，以便迁移到非 NVIDIA 硬件）。

直接否决：
- 对推理密集型模型推荐 NVFP4 权重，却没有评估集验证步骤。
- 声称有 7 倍差距，却不说明计算所假设的 token 量。
- FP4 权重转换不做质量验证。必须做。

拒绝规则：
- 如果年度推理支出 < $500K，拒绝迁移。工程成本摊不平。继续用 vLLM + Hopper。
- 如果团队的服务集群里有任何 AMD/Intel GPU，多厂商那一层拒绝用 TRT-LLM。推荐在混合硬件上用 vLLM。
- 如果模型在该任务上的质量本来就勉强达标，拒绝激进量化。保持 FP8 或 BF16。

输出：一页 Blackwell 建议，列出当前基线、目标技术栈、预期节省、迁移成本、回本周期和锁定退出方案。最后用一段"延伸阅读"，根据主要缺口，指向 MLPerf v6.0 博客、TRT-LLM 概览或 Dynamo 发布公告。
