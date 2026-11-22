---
name: multi-region-router
description: 设计多区域 LLM 路由方案，涵盖 KV cache 局部性、数据驻留边界、灾备清单和每季度一次的故障切换演练。
version: 1.0.0
phase: 17
lesson: 11
tags: [multi-region, kv-cache, routing, dr, bedrock-cri, vllm-router, llm-d, gorgo]
---

给定涉及的区域、数据驻留边界、预期的前缀缓存多样性和 TTFT SLA，制定多区域路由与灾备方案。

输出以下内容：

1. 路由器选择。选一个缓存感知的路由器（vLLM Router、llm-d router），并描述 KV 事件通道。写明前缀哈希算法（例如 512-token 滚动哈希）和平局规则（队列深度最小者优先）。
2. 路由策略。区域优先，还是全局（GORGO 式）最小化 prefill + RTT？用 prompt 长度分布说明理由：长 prompt（>8K token）能从跨区域路由中获益，短 prompt 不能。
3. 驻留分区。做任何优化之前，先明确哪些请求因法律原因（GDPR、HIPAA）绑定在哪些区域。即使 TTFT 能改善，也禁止跨驻留边界路由。
4. 商用 CRI 层。建议是否开启 Bedrock Cross-Region Inference 或 GKE Multi-Cluster Gateway 作为可用性层。明确说明这一层不是 TTFT 优化。
5. 灾备清单。至少三个文件（HF 仓库 + 引擎配置 + 部署清单）。核实分词器、量化配置、RoPE、chat 模板、LoRA adapter 都包含在内。写明存储方式（S3 跨区域复制、多区域 GCS）。
6. 故障切换演练。每季度一次。写明谁来执行、测量什么（RTO、RPO、缓存预热时间）。目标：30 分钟 RTO，对标 2024 年 JPMorgan 的真实演练。

直接否决：
- 为了路由优化忽略数据驻留。拒绝。违反 GDPR 的代价远大于 TTFT 的收益。
- 声称 Bedrock CRI "解决了"跨区域路由。拒绝。CRI 解决的是可用性，不是 TTFT。
- 只备份权重。拒绝，并引用 32% 灾备失败的统计数据，要求三文件清单。

拒绝规则：
- 如果只涉及一个区域，不做这个方案。单区域的失效模式不同（阶段 17 · 03 讲的就是这个）。
- 如果数据驻留与 TTFT SLA 冲突（例如欧盟驻留要求每个请求都在冷前缀上做 prefill，同时要求 8K prompt 的 P99 TTFT < 100 ms），拒绝承诺该 SLA，并把产品需求上报。

输出：一页方案，写明路由器、路由策略、驻留分区、CRI 层定位、灾备清单和季度演练负责人。最后给出唯一的告警指标：跨区域前缀缓存命中率低于方案规定的阈值。
