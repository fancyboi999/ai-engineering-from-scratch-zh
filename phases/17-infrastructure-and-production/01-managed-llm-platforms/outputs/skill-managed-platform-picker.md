---
name: managed-platform-picker
description: 根据负载、SLA 和合规要求，选择一个托管 LLM 平台（Bedrock、Azure OpenAI、Vertex AI）和一个冗余备选平台，并给出 FinOps 埋点计划。
version: 1.0.0
phase: 17
lesson: 01
tags: [bedrock, azure-openai, vertex-ai, ptu, finops, managed-platforms]
---

给定负载画像（需要的模型、每月 token 量、P50/P99 的 TTFT SLA、合规约束、现有云资源分布），给出平台推荐。

输出以下内容：

1. 主平台。写出平台名称、它覆盖的具体模型，以及按利用率看该用按需计费还是预置吞吐单元（PTU）/ Provisioned Throughput。引用盈亏平衡计算（PTU 大约在持续利用率 40-60% 时回本）。
2. 备选平台。写出满足"至少两家供应商"要求的兜底平台。说明搭配理由：冗余必须覆盖模型重叠（常见组合是 Bedrock 上的 Claude + Azure OpenAI 上的 GPT）和区域重叠。
3. FinOps 埋点。写明第一天就要开启的内容：Bedrock Application Inference Profiles，Azure scope + 把 PTU 预留作为成本对象，Vertex 每个团队一个 project + BigQuery Billing Export。写出归因维度：按用户、按任务、按租户。
4. SLA 检查。把目标 TTFT P99 和公开 benchmark 对比（Azure OpenAI PTU ≈ 50 ms P50；Bedrock 按需 ≈ 75 ms P50）。如果 SLA 比按需能达到的更严格，必须用 PTU。
5. 合规检查。按需核实 BAA、SOC 2 Type II、HIPAA、欧盟数据驻留。注意三家都满足基本要求，但数据保留策略和滥用监控的退出机制各不相同。
6. 迁移路径。写出团队本周就能做的一个可回退步骤（例如通过抽象了供应商的 AI 网关部署；加上归因 header），以及一个长期步骤（PTU 承诺；跨区域故障转移）。

直接否决：
- 只推荐单一平台而没有指定兜底。拒绝，并坚持至少两家供应商。
- 没有利用率估算就选 PTU。拒绝，并要求提供持续利用率数据。
- 需求里列了归因，却忽略 Bedrock Application Inference Profiles。它是最干净的原生方案。

拒绝规则：
- 如果负载要求 Claude、Gemini 和 GPT 都是 P0，直接说明需要三个平台（Bedrock + Vertex + Azure OpenAI，前面加一层网关），不要假装一个平台能同时服务三者。
- 如果 SLA 是 TTFT P99 < 100 ms，而预期预算撑不起 PTU，拒绝承诺该 SLA，并解释按需模式的波动上限。
- 如果客户要求"用最便宜的供应商"，拒绝。价格是多维的（token 单价 + 专用容量 + 归因开销 + 锁定成本）。

输出：一页决策文档，包括主平台、备选平台、PTU 还是按需、埋点清单、SLA/合规核查和两个迁移步骤。最后给出一个能发现执行偏离计划的指标（持续利用率、PTU 浪费或归因覆盖率）。
