---
name: production-rag
description: 部署受监管领域的 RAG 聊天机器人，支持按角色和司法辖区过滤、prompt 缓存、护栏，以及在线漂移监控。
version: 1.0.0
phase: 19
lesson: 08
tags: [capstone, rag, chatbot, regulated, llama-guard, nemo-guardrails, ragas, langfuse]
---

给定一个受监管领域的语料库（法律合同、临床试验方案、保险条款等），部署一个聊天机器人：回答附带可验证的引用，遵守按角色和司法辖区划分的访问策略，并对漂移进行监控。

构建计划：

1. 用 docling 或 Unstructured 解析语料；视觉内容丰富的文档走 ColPali。产出带角色和司法辖区标签的分块。
2. 稠密索引（Voyage-3 或 Nomic-embed-v2）存进 pgvector + pgvectorscale；稀疏 BM25 用 Tantivy。
3. 接入 LangGraph 对话 agent：retrieve（按角色 + 司法辖区过滤，稠密 + BM25 混合检索，倒数排名融合）、rerank（bge-reranker-v2-gemma-2b 或 Voyage rerank-2）、synth（Claude Sonnet 4.7，开启 prompt 缓存）。
4. 用稳定前缀拼装 prompt：system 前言 -> 策略块 -> 重排后的上下文 -> 用户查询。目标 prompt 缓存命中率 60-80%。
5. 护栏：输入和输出都过 Llama Guard 4；用 NeMo Guardrails v0.12 的 rail 拦截越界和策略禁止的问题；输出做 Presidio PII 清洗；最后用后置过滤强制引用。
6. 构建一套 200 道题、由专家标注（答案、引用）的黄金集。按引用精确匹配、答案正确性、RAGAS 忠实度打分。
7. 构建一套 50 条 prompt 的红队集（PAIR、TAP、PII 提取、越界提问、跨司法辖区探测）。
8. 用 Arize Phoenix 做漂移看板，每周跟踪检索 nDCG 和引用忠实度；下降 5% 时告警。
9. Langfuse 成本报告：prompt 缓存命中率、每次查询的 token 数、各阶段的 $/query。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | RAGAS 忠实度 + 答案相关性 | 200 道题黄金集上的在线分数 |
| 20 | 引用正确性 | 带可验证来源锚点的回答比例 |
| 20 | 护栏覆盖 | Llama Guard 4 通过率 + 越狱测试集结果 |
| 20 | 成本 / 延迟工程 | prompt 缓存命中率、p95 延迟、$/query |
| 15 | 漂移监控看板 | 在线 Phoenix 看板，展示每周检索质量趋势 |

直接否决：

- 聊天机器人泄漏了跨司法辖区的数据。角色 + 司法辖区过滤必须在检索前执行，而不是检索后。
- 合成 prompt 破坏了缓存前缀（把策略块挪到 system 和上下文之间）。这会毁掉缓存带来的成本优势。
- 护栏配置没有红队运行日志。
- 回答没有引用；或者引用没有可验证的锚点。

拒绝规则：

- 不是每个分块都带司法辖区标签时，拒绝在受监管领域部署。
- 拒绝用专家标注的黄金集题目训练检索。污染会毁掉评估的可信度。
- README 里没有明确的 SOC2/HIPAA/GDPR 适用性矩阵时，拒绝声称"合规"。

输出：一个仓库，包含摄取流水线、LangGraph 对话 agent、200 道题的黄金集、50 条 prompt 的红队集、Phoenix 漂移看板、Langfuse 成本看板，以及一份说明文档，写出你观察到的前三种引用失效模式，以及针对每种的检索或 prompt 修复。
