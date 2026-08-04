# Prompt 缓存与语义缓存经济学

> **定价快照截至 2026-04。** 下面的数字反映本课发布时抓取的厂商费率表；在向下游引用前，对照所链接的文档核实。

> 缓存发生在两层。L2（供应商层）prompt/前缀缓存为重复前缀复用注意力 KV —— Anthropic 的 prompt-caching 文档宣称长 prompt 上最多降 90% 成本、降 85% 延迟；对 Claude 3.5 Sonnet，缓存读取是 $0.30/M，对比全新的 $3.00/M，带 5 分钟 TTL，1 小时 TTL 选项有 2x 写入溢价（docs.anthropic.com，2026-04）。OpenAI prompt 缓存对 ≥1024 token 的 prompt 自动生效，缓存输入定价相比全新大约打 1 折（platform.openai.com，2026-04）；每模型确切的缓存费率取决于实时费率表。L1（应用层）语义缓存在嵌入相似命中时完全跳过 LLM。厂商的"95% 准确率"指的是匹配的正确性，不是命中率 —— 报告的生产命中率从 10%（开放式聊天）到 70%（结构化 FAQ）不等；两家供应商都没发布官方基线，所以把这些当社区遥测，而不是保证。生产陷阱：并行化会杀死缓存（在第一次缓存写入前发出的 N 个并行请求会把开销膨胀好几倍），以及前缀里的动态内容会彻底阻止缓存命中。ProjectDiscovery 报告通过把动态文本移出可缓存前缀，把命中率从 7% 提到 74%（2025-11）。

**类型：** Learn
**语言：** Python（标准库，一个玩具级两层缓存模拟器）
**前置要求：** 阶段 17 · 04（推理服务引擎内部机制）、阶段 17 · 06（SGLang RadixAttention）
**预计时间：** ~60 分钟

## 学习目标

- 区分 L2 prompt/前缀缓存（供应商处的 KV 复用）和 L1 语义缓存（相似 prompt 时绕过 LLM）。
- 解释 Anthropic 的 `cache_control` 显式标记和两个 TTL 选项（5 分钟 vs 1 小时）及其价格乘数。
- 给定命中率、prompt/响应组合和 token 价格，算出预期月度节省。
- 说出那个把账单膨胀 5-10 倍的并行化反模式，和那个让命中率崩塌的动态内容反模式。

## 问题背景

你给 RAG 服务加了 prompt 缓存。账单纹丝不动。你量命中率；是 7%。你的 prompt 看起来是静态的，其实不是 —— 系统 prompt 里包含精确到分钟的当前日期、一个请求 ID，以及为多样性而随机重排的示例。每个请求写一条新缓存项，读取零次。

另一边，你的 agent 对每个用户问题跑十个并行工具调用。十个都在第一次缓存写入完成之前到达供应商。十次写入，零次读取。你的账单是"带缓存"本该花费的 5-10 倍。

缓存是个协议，不是个 flag。两层，两种不同的故障模式。

## 核心概念

### L2 —— 供应商 prompt/前缀缓存

供应商为一个可缓存的前缀存下注意力 KV，在下一个匹配该前缀的请求上复用它。你付一次写入成本，读取近乎免费。

**Anthropic（Claude 3.5 / 3.7 / 4 系列）**：请求里显式的 `cache_control` 标记。你标出哪些 block 可缓存。TTL：5 分钟（写入花基础价 1.25x）或 1 小时（写入花基础价 2x）。缓存读取：Claude 3.5 Sonnet 上 $0.30/M，对比全新的 $3.00/M —— 便宜 10 倍（docs.anthropic.com，截至 2026-04）。各模型费率不同（Opus/Haiku 单独发布）；永远交叉核对实时定价页。

**OpenAI**：对 ≥1024 token 的 prompt 自动缓存（platform.openai.com，2026-04）。没有显式 flag。在当前 gpt-4o/gpt-5 费率表上，缓存输入比全新大约便宜 10 倍。文档和 release notes 都没发布官方命中率基线；社区报告在精心设计 prompt 时聚在 30-60% 附近。监控 `usage.cached_tokens` 来量你自己的。

**Google（Gemini）**：经由显式 API 的上下文缓存；1M token 上下文意味着缓存更划算。

**自托管（vLLM、SGLang）**：阶段 17 · 06 讲 RadixAttention —— 在你自己的算力上同样的模式。

### L1 —— 应用层语义缓存

在完全调 LLM 之前，哈希 prompt、嵌入它，找一个相似的已缓存请求（余弦相似度超过阈值，通常 0.95+）。命中就返回缓存的响应。未命中就调 LLM 并缓存结果。

开源：Redis Vector Similarity、GPTCache、Qdrant。商用：Portkey Cache、Helicone Cache。

厂商的准确率说法指的是返回的缓存响应在语义上恰当的频率 —— 不是你命中的频率。生产命中率：

- 开放式聊天：10-15%。
- 结构化 FAQ / 支持：40-70%。
- 代码问题：20-30%（小变体杀死命中）。
- 重复 prompt 的语音 agent：50-80%（语音归一化到固定集合）。

### 并行化反模式

你的 agent 并行发 10 个工具调用。10 个都有相同的 4K token 系统 prompt。Anthropic 缓存写入是按请求的；第一次缓存写入在供应商看到 prompt 后约 300 ms 完成。请求 2-10 在同一毫秒窗口内到达，每个都看到缓存未命中。你付 10 次写入溢价、0 次读取折扣。

修法：用顺序优先的批处理 —— 先单独发请求 1，等 1 的缓存填好后再放 2-10。给第一个工具调用加 300 ms；省下 5-10 倍的账单。

### 动态内容反模式

你的系统 prompt 长这样：

```
You are a helpful assistant. The current time is 14:32:17.
User ID: abc123. Today is Tuesday...
```

每个请求都是唯一的。每个请求都写入。零命中。

修法：把真正静态的一切移到可缓存前缀里；把动态内容追加到缓存边界之后：

```
[cacheable]
You are a helpful assistant. [rules, examples, instructions]
[/cacheable]
[dynamic, not cached]
Current time: 14:32:17. User: abc123.
```

ProjectDiscovery 用这个办法把缓存命中率从 7% 提到 74%，并公布了拆解。

### 为夜间工作负载叠加 batch + 缓存

Batch API（阶段 17 · 15）以 24 小时周转给 50% 折扣。在上面叠缓存输入又给你约 10 倍。夜间分类、标注和报告生成工作负载，通过叠加能降到同步未缓存成本的约 10%。

### 你该记住的数字

定价点截至 2026-04 抓自所链接的厂商文档，每隔几个月就会漂移 —— 依赖它们之前重新核对。

- Anthropic 缓存读取：Claude 3.5 Sonnet 上 $0.30/M，大约比全新输入便宜 10 倍（docs.anthropic.com）。
- Anthropic 缓存写入溢价：1.25x（5 分钟 TTL）或 2x（1 小时 TTL）。
- OpenAI 自动缓存：对 ≥1024 token 的 prompt 生效；在当前费率表上缓存输入定价约为全新输入的 10%（platform.openai.com）。
- 语义缓存命中率（社区报告）：开放聊天约 10%；结构化 FAQ 最高约 70%。不是厂商文档化的基线。
- ProjectDiscovery：把动态移出前缀，命中率 7% → 74%（项目博客，2025-11）。
- 并行化反模式：N 个并行请求都错过第一次缓存写入时，典型报告账单膨胀 5-10 倍。

```figure
semantic-cache-hit
```

## 实际使用

`code/main.py` 在混合工作负载上模拟 L1 + L2 缓存。报告命中率、账单，并展示并行化惩罚。

## 拿去用

这一课产出 `outputs/skill-cache-auditor.md`。给定 prompt 模板和流量，审计可缓存性并建议重构。

## 练习

1. 跑 `code/main.py`。切换并行化 flag。账单变了多少？
2. 你的系统 prompt 里有个日期。把它移出去。给出前后命中率的算账。
3. 给定你的请求到达速率，算 1 小时 TTL（2x 写入）vs 5 分钟 TTL（1.25x 写入）的盈亏平衡。
4. 0.95 阈值的语义缓存命中 20%。0.85 时命中 50%，但你看到错误的缓存响应。挑对阈值并论证。
5. 你给每个用户问题批量发 10 个并行子查询。在不增加端到端延迟的前提下重写得对缓存友好。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| L2 prompt 缓存 | "前缀缓存" | 供应商为重复前缀存 KV |
| `cache_control` | "Anthropic 缓存标记" | 标记可缓存 block 的显式属性 |
| 缓存写入溢价 | "写入税" | 第一次未命中到入缓存的额外成本（1.25x 或 2x） |
| L1 语义缓存 | "嵌入缓存" | 调 LLM 前的应用层哈希加嵌入 |
| GPTCache | "LLM 缓存库" | 流行的 OSS L1 缓存库 |
| 缓存命中率 | "命中 / 总数" | 由缓存服务的请求比例 |
| 并行化反模式 | "N 次写入陷阱" | N 个并行请求 N 次错过缓存 |
| 动态内容陷阱 | "时间塞 prompt 陷阱" | 前缀里的动态字节杀死命中率 |
| RadixAttention | "副本内缓存" | SGLang 的前缀缓存实现 |

## 延伸阅读

- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) —— 官方 `cache_control` 语义和 TTL。
- [OpenAI Prompt Caching](https://platform.openai.com/docs/guides/prompt-caching) —— 自动缓存行为和适用条件。
- [TianPan — Semantic Caching for LLMs Production](https://tianpan.co/blog/2026-04-10-semantic-caching-llm-production)
- [ProjectDiscovery — Cut LLM Costs 59% With Prompt Caching](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)
- [DigitalOcean / Anthropic — Prompt Caching](https://www.digitalocean.com/blog/prompt-caching-with-digital-ocean)
