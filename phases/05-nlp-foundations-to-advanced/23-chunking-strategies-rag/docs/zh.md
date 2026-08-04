# RAG 的分块策略

> 分块配置对检索质量的影响，和嵌入模型的选择一样大（Vectara NAACL 2025）。分块搞错了，再多重排也救不了你。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 14（信息检索）、Phase 5 · 22（嵌入模型）
**预计时间：** ~60 分钟

## 问题背景

你把一份 50 页的合同放进 RAG 系统。用户问："What is the termination clause?"。检索器返回封面页。为什么？因为模型是在 512-token 块上训练的，而终止条款埋在 20 页之后、跨页断开，本地又没有把它和查询挂上钩的关键词。

修法不是"买个更好的嵌入模型"。修法是分块。多大？要重叠吗？在哪里切？带不带周围上下文？

2026 年 2 月的基准给出意外的结果：

- Vectara 的 2026 研究：递归 512-token 分块打赢了语义分块，准确率 69% → 54%。
- SPLADE + Mistral-8B 在 Natural Questions 上：重叠提供了零个可测量的好处。
- 上下文悬崖：响应质量在约 2500 token 的上下文附近急剧下降。

"显而易见"的答案（语义分块、20% 重叠、1000 token）往往是错的。这节课为六种策略建立直觉，告诉你何时该抓哪个。

## 核心概念

![六种分块策略在同一段文字上的可视化](../assets/chunking.svg)

**固定分块。** 每 N 个字符或 token 切一刀。最简单的基线。会在句子中间切断。压缩好，连贯差。

**递归。** LangChain 的 `RecursiveCharacterTextSplitter`。先试着按 `\n\n` 切，再 `\n`，再 `.`，再空格。回退得干净。2026 年的默认。

**语义。** 给每个句子做 embedding。算相邻句子之间的余弦相似度。在相似度跌破阈值处切。保住主题连贯性。更慢；有时产出 40-token 的小碎片，伤害检索。

**句子。** 按句子边界切。每块一句，或一个 N 句的窗口。在约 5k token 以内追平语义分块，成本只是零头。

**父文档。** 既存小的子块用于检索，*又*存更大的父块用于上下文。按子块检索；返回父块。优雅退化：糟糕的子块仍返回合理的父块。

**后期分块（2024）。** 先在 token 级给整篇文档做 embedding，再把 token embedding 池化成块 embedding。保住跨块上下文。配长上下文嵌入器（BGE-M3、Jina v3）用。算力更高。

**上下文检索（Anthropic，2024）。** 给每个块前置一段 LLM 生成的、说明它在文档中位置的摘要（"This chunk is section 3.2 of the termination clauses..."）。在 Anthropic 自己的基准里有 35-50% 的检索提升。索引起来贵。

### 打败一切默认的那条规则

把块大小匹配到查询类型：

| 查询类型 | 块大小 |
|------------|-----------|
| 事实型（"what is the CEO's name?"） | 256-512 token |
| 分析型 / 多跳 | 512-1024 token |
| 整章理解 | 1024-2048 token |

NVIDIA 的 2026 基准。块要大到足以容纳答案加本地上下文，又小到让检索器的 top-K 聚焦在答案上而非上下文噪声上。

```figure
n5-chunk-cuts
```

## 动手构建

### 第 1 步：固定和递归分块

```python
def chunk_fixed(text, size=512, overlap=0):
    step = size - overlap
    return [text[i:i + size] for i in range(0, len(text), step)]


def chunk_recursive(text, size=512, seps=("\n\n", "\n", ". ", " ")):
    if len(text) <= size:
        return [text]
    for sep in seps:
        if sep not in text:
            continue
        parts = text.split(sep)
        chunks = []
        buf = ""
        for p in parts:
            if len(p) > size:
                if buf:
                    chunks.append(buf)
                    buf = ""
                chunks.extend(chunk_recursive(p, size=size, seps=seps[1:] or (" ",)))
                continue
            candidate = buf + sep + p if buf else p
            if len(candidate) <= size:
                buf = candidate
            else:
                if buf:
                    chunks.append(buf)
                buf = p
        if buf:
            chunks.append(buf)
        return [c for c in chunks if c.strip()]
    return chunk_fixed(text, size)
```

### 第 2 步：语义分块

```python
def chunk_semantic(text, encoder, threshold=0.6, min_chars=200, max_chars=2048):
    sentences = split_sentences(text)
    if not sentences:
        return []
    embs = encoder.encode(sentences, normalize_embeddings=True)
    chunks = [[sentences[0]]]
    for i in range(1, len(sentences)):
        sim = float(embs[i] @ embs[i - 1])
        current_len = sum(len(s) for s in chunks[-1])
        if sim < threshold and current_len >= min_chars:
            chunks.append([sentences[i]])
        else:
            chunks[-1].append(sentences[i])

    result = []
    for group in chunks:
        text_group = " ".join(group)
        if len(text_group) > max_chars:
            result.extend(chunk_recursive(text_group, size=max_chars))
        else:
            result.append(text_group)
    return result
```

在你的领域上调 `threshold`。太高 → 碎片。太低 → 一个巨块。

### 第 3 步：父文档

```python
def chunk_parent_child(text, parent_size=2048, child_size=256):
    parents = chunk_recursive(text, size=parent_size)
    mapping = []
    for p_idx, parent in enumerate(parents):
        children = chunk_recursive(parent, size=child_size)
        for child in children:
            mapping.append({"child": child, "parent_idx": p_idx, "parent": parent})
    return mapping


def retrieve_parent(child_query, mapping, encoder, top_k=3):
    child_embs = encoder.encode([m["child"] for m in mapping], normalize_embeddings=True)
    q_emb = encoder.encode([child_query], normalize_embeddings=True)[0]
    scores = child_embs @ q_emb
    top = np.argsort(-scores)[:top_k]
    seen, parents = set(), []
    for i in top:
        if mapping[i]["parent_idx"] not in seen:
            parents.append(mapping[i]["parent"])
            seen.add(mapping[i]["parent_idx"])
    return parents
```

关键洞见：给父块去重。多个子块可能映射到同一个父块；全返回会浪费上下文。

### 第 4 步：上下文检索（Anthropic 模式）

```python
def contextualize_chunks(document, chunks, llm):
    context_prompts = [
        f"""<document>{document}</document>
Here is the chunk to situate: <chunk>{c}</chunk>
Write 50-100 words placing this chunk in the document's context."""
        for c in chunks
    ]
    contexts = llm.batch(context_prompts)
    return [f"{ctx}\n\n{c}" for ctx, c in zip(contexts, chunks)]
```

索引这些加了上下文的块。查询时，检索受益于额外的周围信号。

### 第 5 步：评估

```python
def recall_at_k(queries, corpus_chunks, encoder, k=5):
    chunk_embs = encoder.encode(corpus_chunks, normalize_embeddings=True)
    hits = 0
    for q_text, gold_idxs in queries:
        q_emb = encoder.encode([q_text], normalize_embeddings=True)[0]
        top = np.argsort(-(chunk_embs @ q_emb))[:k]
        if any(i in gold_idxs for i in top):
            hits += 1
    return hits / len(queries)
```

永远做基准测试。对你的语料而言"最好"的策略，可能和任何博客文章都对不上。

## 坑

- **只在事实型查询上评估分块。** 多跳查询会揭示截然不同的赢家。用按查询类型分层的评估集。
- **没有最小尺寸的语义分块。** 产出 40-token 的碎片，伤害检索。永远强制 `min_tokens`。
- **把重叠当 cargo cult。** 2026 年的研究发现重叠常常提供零好处，却让索引成本翻倍。要测量，别假设。
- **没有最小/最大约束。** 5 token 或 5000 token 的块都会破坏检索。夹住。
- **跨文档分块。** 绝不让一个块跨两篇文档。永远按文档分块，再合并。

## 实际使用

2026 年的栈：

| 场景 | 策略 |
|-----------|----------|
| 首次构建、语料未知 | 递归，512 token，无重叠 |
| 事实型 QA | 递归，256-512 token |
| 分析型 / 多跳 | 递归，512-1024 token + 父文档 |
| 大量交叉引用（合同、论文） | 后期分块或上下文检索 |
| 对话 / 对白语料 | 轮次级块 + 说话人元数据 |
| 短话语（推文、评论） | 一篇文档 = 一个块 |

从递归 512 起步。在一个 50 查询的评估集上测 recall@5。再从那里调。

## 拿去用

存为 `outputs/skill-chunker.md`：

```markdown
---
name: chunker
description: Pick a chunking strategy, size, and overlap for a given corpus and query distribution.
version: 1.0.0
phase: 5
lesson: 23
tags: [nlp, rag, chunking]
---

Given a corpus (document types, avg length, domain) and query distribution (factoid / analytical / multi-hop), output:

1. Strategy. Recursive / sentence / semantic / parent-document / late / contextual. Reason.
2. Chunk size. Token count. Reason tied to query type.
3. Overlap. Default 0; justify if >0.
4. Min/max enforcement. `min_tokens`, `max_tokens` guards.
5. Evaluation plan. Recall@5 on 50-query stratified eval set (factoid, analytical, multi-hop).

Refuse any chunking strategy without min/max chunk size enforcement. Refuse overlap above 20% without an ablation showing it helps. Flag semantic chunking recommendations without a min-token floor.
```

## 练习

1. **简单。** 用 fixed(512, 0)、recursive(512, 0)、recursive(512, 100) 给一份 20 页文档分块。对比块数和边界质量。
2. **中等。** 在 5 篇文档上建一个 30 查询的评估集。为递归、语义、父文档测 recall@5。哪个胜出？和那些博客文章对得上吗？
3. **困难。** 实现上下文检索。测量相对基线递归的 MRR 提升。报告索引成本（LLM 调用）对准确率增益。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 块（Chunk） | 文档的一片 | 被 embedding、索引、检索的子文档单元。 |
| 重叠（Overlap） | 安全边距 | 相邻块共享的 N 个 token；2026 年基准里常常无用。 |
| 语义分块 | 聪明分块 | 在相邻句 embedding 相似度跌落处切。 |
| 父文档 | 两级检索 | 检索小的子块，返回更大的父块。 |
| 后期分块 | embedding 之后再分块 | 在 token 级给整篇文档做 embedding，池化成块向量。 |
| 上下文检索 | Anthropic 的戏法 | 索引前给每个块前置一段 LLM 生成的摘要。 |
| 上下文悬崖 | 2500-token 那堵墙 | RAG 里在约 2.5k 上下文 token 附近观测到的质量下降（2026 年 1 月）。 |

## 延伸阅读

- [Yepes et al. / LangChain — Recursive Character Splitting docs](https://python.langchain.com/docs/how_to/recursive_text_splitter/) —— 生产里的默认。
- [Vectara (2024, NAACL 2025). Chunking configurations analysis](https://arxiv.org/abs/2410.13070) —— 分块和嵌入选择一样要紧。
- [Jina AI — Late Chunking in Long-Context Embedding Models (2024)](https://jina.ai/news/late-chunking-in-long-context-embedding-models/) —— 后期分块论文。
- [Anthropic — Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) —— 用 LLM 生成的上下文前缀带来 35-50% 检索提升。
- [NVIDIA 2026 chunk-size benchmark — Premai summary](https://blog.premai.io/rag-chunking-strategies-the-2026-benchmark-guide/) —— 按查询类型选块大小。
