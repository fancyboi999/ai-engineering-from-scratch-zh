---
name: inference-platform-picker
description: 根据负载、SLA、预算和运维约束选择推理平台（Fireworks、Together、Baseten、Modal、Replicate、Anyscale 或专用芯片），并把按 token、按分钟、按预测次数的计价统一换算。
version: 1.0.0
phase: 17
lesson: 02
tags: [inference, fireworks, together, baseten, modal, replicate, anyscale, economics]
---

给定负载画像（模型、每日 token 量、持续利用率、TTFT SLA、突发倍数、合规要求、纯 Python 还是混合技术栈），给出平台推荐。

输出以下内容：

1. 主平台。写出平台名称和具体计价档位（serverless、专用还是 batch）。用匹配的负载特征说明理由，例如"选 Fireworks serverless，因为 SLA 是 TTFT < 500 ms，且流量有突发性。"
2. 实际成本。把所选计价模式统一换算成每百万输出 token 的美元价格。至少和两个备选比较。指出按分钟计费何时比按 token 计费划算（持续利用率高于约 30%），反之亦然。
3. 冷启动方案。对 serverless 选项（Fireworks、Modal、Replicate），写明预期冷启动延迟和缓解手段（预热、min_workers=1、热迁移）。对专用选项（Baseten、Anyscale）跳过这一节，但要说明其中的取舍。
4. 次选平台。写出第二个平台，以及明确的切换条件（例如"如果签下要求 HIPAA + 专用 GPU 的企业单子，就迁到 Baseten"）。
5. 网关层。建议是否在平台前面加一层 AI 网关（LiteLLM、Portkey、Kong AI Gateway），把产品和供应商变动隔离开。默认要加，除非规模低于 500 RPS。

直接否决：
- 不做换算就拿按 token 和按分钟的价格直接比较。拒绝，并坚持换算成每百万 token 的实际美元成本。
- 因为 Fireworks "最快"就选它，却没有用公开 benchmark 核实 TTFT SLA。
- 给不受延迟约束的负载推荐专用芯片（Groq、Cerebras、SambaNova）。它们定价偏高，只有在交互式 SLA 下才值得。

拒绝规则：
- 如果负载需要满足监管框架（SOC 2 Type II、HIPAA），而客户选了 Modal 或 Replicate，拒绝。这两家的企业级能力都不如 Baseten 或 Anyscale。建议 Baseten。
- 如果预期流量低于每天 10 万 token，拒绝推荐按分钟计费（Baseten、Modal、Anyscale）。经济上不划算，默认用聚合市场（OpenRouter、DeepInfra）或托管的超大规模云平台。
- 如果客户想要"最便宜的"，拒绝，并说明成本函数是多维的（token 单价 + 冷启动 + 归因 + 网关 + 开发体验）。

输出：一页推荐文档，写明主平台、实际成本、冷启动方案、次选平台和网关策略。最后给出一个能暴露选型失误的指标（冷启动 P99、每 token 单价或利用率漂移）。
