# Chunking 策略横向对比

> Chunking 决定了你的 retriever 究竟能捞出什么。一旦边界切错，再好的 embedding 模型、再强的 reranker、再聪明的 LLM 都无法在下游把伤害补回来。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 11 第 04 课（embedding）、第 06 课（RAG）、第 07 课（advanced RAG）；阶段 19 Track B 基础（第 20-29 课）
**预计时间：** ~90 分钟

## 学习目标
- 从零实现五种 chunking 策略：fixed-window、sentence、recursive-split、semantic clustering，以及 structural markdown header。
- 在一个带 gold 标注答案 span 的 fixture corpus 上测量 recall@k，并解释为什么某一种策略在散文上胜出、另一种却在技术文档上胜出。
- 读懂 chunk 长度分布，识别每种策略各自埋下的失败模式：孤儿句、符号中间被切断、只剩标题的 chunk、语义漂移。
- 不跑 benchmark 就能为一个新 corpus 挑出默认策略——只需检查三个属性：文档类型、平均段落长度、格式是否自带显式结构。

## 问题背景

每条 RAG pipeline 的第一步，都是把源文档切成一块块：小到能塞进 embedding 模型，又大到每一块都承载一个自洽的想法。在哪里下刀，不是一个超参数，而是 retriever 永远能返回什么的上限。

一个问"budget abort threshold 长什么样"的 query，只有在装着这个 abort threshold 的 chunk 可达时才有可能成功。如果 fixed-window 切分器把 threshold 的值从周围上下文里切走了，embedding 就漂到了另一个 cluster，BM25 分数掉下来，reranker 看到的全是噪声，LLM 生成的答案就是错的。2024 年的论文《LongRAG: Enhancing Retrieval-Augmented Generation with Long-context LLMs》测出：仅仅是 chunking 选择不同，检索 recall 就能产生 35 个百分点的绝对差距。2025 年关于 contextual chunk header 的后续工作把这个差距收窄了，但没能抹平。

本课把五种策略并排建起来，在一个带 gold 标注答案 span 的 fixture corpus 上跑一遍，让你自己读这些 recall 数字。

## 核心概念

```mermaid
flowchart LR
  Doc[源文档] --> S1[Fixed Window]
  Doc --> S2[Sentence]
  Doc --> S3[Recursive Split]
  Doc --> S4[Semantic Cluster]
  Doc --> S5[Structural Markdown]
  S1 --> Chunks1[Chunks]
  S2 --> Chunks2[Chunks]
  S3 --> Chunks3[Chunks]
  S4 --> Chunks4[Chunks]
  S5 --> Chunks5[Chunks]
  Chunks1 --> Index[Embedding 索引]
  Chunks2 --> Index
  Chunks3 --> Index
  Chunks4 --> Index
  Chunks5 --> Index
  Index --> Eval[Recall@k vs Gold Span]
```

### Fixed-window

最暴力的 baseline。每 N 个字符切一刀。可选地加上 overlap，这样在位置 N 被切断的句子，会完整出现在从 N - overlap 开始的那个 chunk 里。快、确定、在边界处烂到家。把它当对照组，别当默认值。

### Sentence

用正则或一个简单的状态机在句子边界处切分。把一句或多句打包成一个 chunk，直到逼近目标字符预算。它不会再从单词中间切断，但仍然会从段落中间、章节中间切断。这是很多早期 RAG pipeline 的默认选项，对于没有其他结构的散文也是个合理的选择。

### Recursive split

2023 年那批库带火的层级策略。先尝试在最强的分隔符上切（双换行、段落），不行就退到下一级（单换行），再退到句子，最后退到字符。当 chunk 塞得进预算时递归终止。在结构不一致的文档上很强，因为它能按区域自适应。

### Semantic clustering

把每个句子都 embed 出来。把共享同一个主题 centroid 的连续句子聚成一类。一旦对 centroid 的滑动相似度跌破阈值就切一刀。边界反映的是语义，而非字符。建起来更慢，且依赖 embedding 模型，但对那种段落内部就切换主题的文档很抗造。

### Structural markdown header

对于自带显式结构的文档（markdown、reStructuredText、RFC 风格的编号章节），在标题边界处切。每个 chunk 就是这个标题加上它下面、直到下一个同级或更高级标题之前的所有内容。每个主题的 chunk 最小，但只有在 corpus 格式良好时才用得上。

### recall@k 如何衡量边界选择

一个 gold 标注的 query 携带着答案 span 在源文档里精确的字符偏移量。chunking 之后，你问一句：retriever 返回的 top-k chunk 里，有没有任何一个跟 gold span 有重叠？有，那这条 query 的 recall@k 就是 1；没有，就是 0。在整个 query 集上取平均。对每种策略跑同一套评测，这个分布差就告诉你：哪种边界策略能在你手上的这个 corpus 上活下来。

```figure
ci-chunk-boundaries
```

## 动手构建

`code/main.py` 实现了：

- `fixed_window(text, size, overlap)` —— baseline。
- `sentence_chunks(text, target)` —— 简单的句子打包器。
- `recursive_split(text, separators, target)` —— 层级递归。
- `semantic_chunks(text, similarity_threshold)` —— 基于确定性 mock embedding 的 centroid 聚类。
- `structural_markdown(text)` —— 感知标题的切分器。
- `mock_embed(text, dim)` —— 一个基于 hash 的 embedding，让整个循环离线就能跑。
- `DenseIndex` —— 跟阶段 19 Track B 的 hybrid retrieval 那一课形状一致。
- `eval_recall(strategy, corpus, queries, k)` —— 对比循环。
- 一个 `main()`，在 fixture corpus 上把每种策略都跑一遍，打印 recall@k 表格。

运行：

```bash
python3 code/main.py
```

输出是一张小表，每种策略一行、每个 k 一列。Sentence 在带结构的 fixture 上输了。Structural-markdown 在 markdown fixture 上赢了。Recursive 在混合 fixture 上稳住了局面，因为它的递归会自适应。Semantic clustering 在散文 fixture 上赢了——那里压根没有可用的结构线索。

## 表格藏不住的失败模式

**孤儿句。** 句子打包会产出缺了主题句的 chunk。于是 embedding 指向了错误的 cluster。

**符号中间被切断。** Fixed-window 在代码或 YAML 内部会把一个标识符劈成两半。两半各自 embed 成噪声。

**只剩标题的 chunk。** Structural markdown 会吐出一个除了 `## Title` 啥也没有的 chunk。把它们过滤掉，或者把下一个 chunk 的首段拼上去。

**语义漂移。** Semantic clustering 在 corpus 主题高度统一时会切得太少。一个 5000 字符的 chunk 把许多具体答案打包进一个糊成一团的 embedding 里。给 semantic 配一个硬字符上限。

**过期的 embedding。** Semantic clustering 用到一个 embedding 模型。你换了模型，也就换了 chunk。把 chunk 模型跟 retrieval 模型分开钉死，或者干脆一起重建索引。

## 不跑 benchmark 就挑出默认策略

三个属性就能为一个新 corpus 决定默认 chunker。

| 属性 | 取值 | 默认策略 |
|----------|-------|---------|
| 文档类型 | 无结构散文 | Recursive split，target 800 |
| 文档类型 | Markdown / RFC / API 文档 | Structural markdown |
| 文档类型 | 代码 | AST-aware（不在本课范围；见阶段 19 第 02 课） |
| 段落长度 | 长、单一主题 | Sentence，target 500 |
| 段落长度 | 短、主题混杂 | Semantic，threshold 0.6 |

拿不准时，选 recursive split。它是最强的单策略 baseline。

## 投入使用

生产实践：

- 上线一条新 pipeline 之前先跑评测；别盲信你那个库默认给你选的策略。
- 每当你换了 embedding 模型或改了 corpus 构成，就重新跑一遍评测；赢家是依赖 corpus 的。
- 把策略名字持久化进每个 chunk 的 metadata，这样以后才能把回归问题归因到它身上。

## 交付上线

第 69 课的 Track F 端到端 RAG 系统，把这里挑出的 chunker 当作它的第一级。第 68 课的评测框架，读取的 recall@k 跟本课里 `eval_recall` 返回的形状一模一样。挑出在你 corpus 上胜出的那种策略，往下游喂。

## 练习

1. 加上第六种策略：用 `tiktoken` 的 token-window 替代字符计数。在同一个 fixture 上跟 fixed-window 对比。
2. 往散文 fixture 里注入 30% 比例的代码块。重跑表格。解释为什么除了 structural markdown，每种策略都掉了 recall。
3. 把确定性 embedding 换成你项目里真实 provider 提供的那个。测量 semantic-clustering 的 recall 变化。报告各策略之间的差距是变宽了还是变窄了。
4. 给每个 chunk 加一个 `summary` 字段：一句话的 centroid 描述。把 summary 拼到 chunk 正文上重跑评测。测量 recall 的提升。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| Recall@k | "我们拿到对的 chunk 了吗？" | top-k chunk 里有任何一个跟 gold 答案 span 重叠的 query 占比 |
| Chunk overlap | "滑动窗口" | 把上一个 chunk 的最后 N 个字符重新塞进下一个 chunk |
| Structural splitter | "感知标题的 chunk" | 在 H1/H2/H3 边界处切；标题文字算进 chunk |
| Semantic chunker | "感知主题的 chunk" | embed 句子，按 centroid 相似度聚类，在漂移处切 |
| Centroid drift | "主题切换" | 滑动均值跟下一句之间的余弦相似度跌破阈值 |

## 延伸阅读

- [LongRAG: Enhancing Retrieval-Augmented Generation with Long-context LLMs (arXiv 2406.15319)](https://arxiv.org/abs/2406.15319)
- [Anthropic, Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [LlamaIndex, Chunking strategies for production RAG](https://docs.llamaindex.ai/en/stable/optimizing/production_rag/)
- 阶段 11 第 06 课 —— RAG 基础
- 阶段 11 第 07 课 —— advanced RAG
- 阶段 19 第 65 课 —— 对本课产出的 chunk 进行排序的 hybrid retrieval
- 阶段 19 第 68 课 —— 在生产中给策略选择打分的评测框架
