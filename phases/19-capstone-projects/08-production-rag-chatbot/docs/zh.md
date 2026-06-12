# 顶点项目 08 —— 受监管垂直领域的生产级 RAG 聊天机器人

> 2026 年，Harvey、Glean、Mendable、LlamaCloud 都跑着同一套生产形态。用 docling 或 Unstructured 摄入、视觉内容用 ColPali。混合搜索。用 bge-reranker-v2-gemma 重排。用带 prompt caching、命中率 60-80% 的 Claude Sonnet 4.7 合成。用 Llama Guard 4 和 NeMo Guardrails 把关。用 Langfuse 和 Phoenix 盯着。用 RAGAS 在 200 问金标准集上打分。在一个受监管领域（法律、临床、保险）里做一个出来，这个顶点项目就是通过金标准集、红队，以及漂移看板。

**类型：** Capstone
**语言：** Python（流水线 + API）、TypeScript（聊天 UI）
**前置要求：** 第 5 阶段（NLP）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P5 · P7 · P11 · P12 · P17 · P18
**预计时间：** 30 小时

## 问题背景

受监管领域的 RAG（法律合同、临床试验方案、保险保单）是 2026 年出货最多的生产形态，因为 ROI 一目了然、风险也很具体。Harvey（Allen & Overy）为法律做了它。Mendable 出的是开发者文档那一味。Glean 覆盖企业搜索。范式是：高保真摄入、带重排的混合检索、带引用强制和 prompt caching 的合成、多层安全把关、持续监控漂移。

难的不是模型。难在司法辖区感知的合规（HIPAA、GDPR、SOC2）、引用级的可审计性、成本控制（命中率高时 prompt caching 买来 60-90% 折扣）、通过 RAGAS 忠实度做幻觉检测，以及源文档被更新而索引没跟上时的漂移检测。这个顶点项目要求你把这一切都在一个 200 问金标准集上交付出来，旁边再配一套红队套件。

## 核心概念

流水线有两侧。**Ingestion（摄入）**：docling 或 Unstructured 解析结构化文档；ColPali 处理视觉丰富的；chunk 拿到摘要、标签和基于角色的访问标签。向量进 pgvector + pgvectorscale（5000 万向量以下）或 Qdrant Cloud；稀疏 BM25 并行跑着。**Conversation（对话）**：LangGraph 处理记忆和多轮；每个查询跑混合检索、用 bge-reranker-v2-gemma-2b 重排、用 Claude Sonnet 4.7（做 prompt cache）合成、让输出过 Llama Guard 4 和 NeMo Guardrails，再吐出一个带引用锚点的响应。

评测栈有四层。**Golden set（金标准集）**（200 条带引用的标注 Q/A）查正确性。**Red team（红队）**（越狱、PII 抽取尝试、域外问题）查安全。**RAGAS** 逐轮自动测忠实度 / 答案相关性 / 上下文精确度。**Drift dashboard（漂移看板）**（Arize Phoenix）每周盯检索质量和幻觉分。

prompt caching 是那根成本杠杆。Claude 4.5+ 和 GPT-5+ 支持缓存 system prompt + 检索到的上下文。在 60-80% 命中率下，每次查询成本降 3-5 倍。流水线必须为稳定的前缀而设计（system prompt + 重排后的上下文在前），才能拿到高缓存命中率。

## 架构

```
documents (contracts, protocols, policies)
      |
      v
docling / Unstructured parse + ColPali for visuals
      |
      v
chunks + summaries + role-labels + jurisdiction tags
      |
      v
pgvector + pgvectorscale  +  BM25 (Tantivy)
      |
query + role + jurisdiction
      |
      v
LangGraph conversational agent
   +--- retrieve (hybrid)
   +--- filter by role + jurisdiction
   +--- rerank (bge-reranker-v2-gemma-2b or Voyage rerank-2)
   +--- synthesize (Claude Sonnet 4.7, prompt cached)
   +--- guard (Llama Guard 4 + NeMo Guardrails + Presidio output PII scrub)
   +--- cite + return
      |
      v
eval:
  RAGAS faithfulness / answer_relevance / context_precision (online)
  Langfuse annotation queue (sampled)
  Arize Phoenix drift (weekly)
  red team suite (pre-release)
```

## 技术栈

- 摄入：结构化文档用 Unstructured.io 或 docling；视觉丰富的 PDF 用 ColPali
- 向量库：5000 万向量以下用 pgvector + pgvectorscale；否则用 Qdrant Cloud
- 稀疏：带字段权重的 Tantivy BM25
- 编排：LlamaIndex Workflows（摄入）+ LangGraph（对话）
- 重排器：自托管 bge-reranker-v2-gemma-2b 或托管 Voyage rerank-2
- LLM：带 prompt caching 的 Claude Sonnet 4.7；兜底用自托管 Llama 3.3 70B
- 评测：在线用 RAGAS 0.2，幻觉和越狱套件用 DeepEval
- 可观测性：带标注队列的自托管 Langfuse；漂移用 Arize Phoenix
- 护栏：Llama Guard 4 输入/输出分类器、NeMo Guardrails v0.12 策略、Presidio PII 擦洗
- 合规：chunk 上基于角色的访问标签；为 GDPR/HIPAA 打的司法辖区标签

```figure
canary-rollout
```

## 动手构建

1. **摄入。** 用 Unstructured 或 docling 解析你的语料（认真做的话 1000-10000 份文档）。扫描 / 视觉为主的页面走 ColPali。产出带摘要、角色标签、司法辖区标签的 chunk。

2. **索引。** dense embedding（Voyage-3 或 Nomic-embed-v2）进 pgvector + pgvectorscale。通过 Tantivy 建 BM25 旁路索引。角色和司法辖区过滤作为 payload。

3. **混合检索。** 先按 角色+司法辖区 过滤；再并行 dense + BM25；用倒数排名融合（RRF）合并；top-20 给重排器；top-5 给合成。

4. **带 prompt caching 的合成。** system prompt + 静态策略放进缓存头；重排后的上下文作为缓存扩展；用户问题作为不缓存的后缀。稳态下目标命中率 60-80%。

5. **护栏。** 输入上跑 Llama Guard 4；NeMo Guardrails 的 rail 拦截域外问题或策略禁止的话题；Presidio 擦掉输出里意外的 PII；引用强制的后置过滤器。

6. **金标准集。** 200 对由领域专家标注 (answer, citations) 的 Q/A。在精确引用匹配、答案正确性、忠实度（RAGAS）上给 agent 打分。

7. **红队。** 50 个对抗 prompt：越狱（PAIR、TAP）、PII 外泄尝试、域外、跨司法辖区泄漏。用通过/失败和严重度打分。

8. **漂移看板。** Arize Phoenix 每周追踪检索质量（nDCG、引用忠实度）。跌 5% 时告警。

9. **成本报告。** Langfuse：prompt 缓存命中率、每查询 token 数、按阶段拆分的 $/查询。

## 实际使用

```
$ chat --role=analyst --jurisdiction=GDPR
> what is the data-retention obligation for EU user profiles under our contract?
[retrieve]  hybrid top-20 filtered to GDPR + analyst-role
[rerank]    top-5 kept
[synth]     claude-sonnet-4.7, cache hit 74%, 0.8s
answer:
  The contract (Section 12.4, Master Services Agreement dated 2024-03-11)
  obligates EU user profile deletion within 30 days of termination per GDPR
  Article 17. The DPA amendment (DPA-v2.1, Section 5) extends this to 14 days
  for "restricted" category data.
  citations: [MSA-2024-03-11 s12.4, DPA-v2.1 s5]
```

## 拿去用

`outputs/skill-production-rag.md` 描述交付物。一个带合规标签部署、通过评分标准、用实时漂移监控盯着的受监管领域聊天机器人。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | RAGAS 忠实度 + 答案相关性 | 金标准集（200 Q/A）上的在线分数 |
| 20 | 引用正确性 | 答案中带可验证来源锚点的占比 |
| 20 | 护栏覆盖 | Llama Guard 4 通过率 + 越狱套件结果 |
| 20 | 成本 / 延迟工程 | prompt 缓存命中率、p95 延迟、$/查询 |
| 15 | 漂移监控看板 | Phoenix 实时看板，带每周检索质量趋势 |
| **100** | | |

## 练习

1. 在另一个司法辖区下建第二片语料切分（如 HIPAA 与 GDPR 并存）。在一个 20 问的跨司法辖区探针上演示 角色+司法辖区 过滤如何防止跨域泄漏。

2. 衡量一周生产流量上的 prompt 缓存命中率。找出哪些查询打断了缓存前缀。重构它们。

3. 加上带 10k token 摘要缓冲区的多轮记忆。衡量随着对话变长忠实度会不会下降。

4. 把 Claude Sonnet 4.7 换成自托管的 Llama 3.3 70B。衡量 $/查询 和忠实度差值。

5. 加一个“不确定”模式：如果重排后的最高分低于阈值，agent 说“我没有有把握的引用”而不是作答。衡量虚假自信被减少了多少。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Prompt caching | “缓存的 system + 上下文” | Claude/OpenAI 的特性：命中时缓存的前缀 token 打 6-9 折 |
| RAGAS | “RAG 评测器” | 对忠实度、答案相关性、上下文精确度的自动化打分 |
| Golden set（金标准集） | “标注评测” | 200+ 条专家标注、带引用的 Q/A；即真值 |
| Jurisdiction tag（司法辖区标签） | “合规标签” | 贴在 chunk 上的 GDPR/HIPAA/SOC2 范围；由检索过滤器强制 |
| Citation faithfulness（引用忠实度） | “有据可循的答案率” | 有可检索来源区间撑着的断言占比 |
| Drift（漂移） | “检索质量衰退” | nDCG 或引用分的每周变化；告警阈值 5% |
| Red team（红队） | “对抗评测” | 发布前的越狱、PII 抽取、域外探针 |

## 延伸阅读

- [Harvey AI](https://www.harvey.ai) —— 参考级法律生产栈
- [Glean enterprise search](https://www.glean.com) —— 企业规模 RAG 参考
- [Mendable documentation](https://mendable.ai) —— 开发者文档 RAG 参考
- [LlamaCloud Parse + Index](https://docs.llamaindex.ai/en/stable/examples/llama_cloud/llama_parse/) —— 托管摄入
- [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) —— 成本杠杆参考
- [RAGAS 0.2 documentation](https://docs.ragas.io/) —— 标准 RAG 评测框架
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) —— 参考级漂移可观测性
- [Llama Guard 4](https://ai.meta.com/research/publications/llama-guard-4/) —— 2026 安全分类器
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/) —— 策略 rail 框架
