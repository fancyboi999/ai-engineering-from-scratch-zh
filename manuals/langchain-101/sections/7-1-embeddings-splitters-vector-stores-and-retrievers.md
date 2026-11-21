# 嵌入、切分器、向量存储与检索器

> 检索接口在 `langchain-core`，切分器在 `langchain-text-splitters`，每种存储在各自的合作方包里，agent 则通过工具使用检索器。

你抄来一段 2024 年的检索示例。它从 `langchain.chains` 导入 `RetrievalQA`，又从 `langchain_community.vectorstores` 导入向量存储。第一个导入在锁定版本上会失败，第二个来自一个已经停止维护（sunset）的包。

读完本节，你能说出检索流水线的每个部分在锁定版本上放在哪个包里。你还能离线构建这条流水线，并把它作为工具交给 agent。

## 各部分放在哪里 {#s-embeddings-splitters-vector-stores-and-retrievers-where-each-piece-lives}

**检索器（retriever）：** 带有 `invoke(query)` 的对象，返回一个 `Document` 对象列表。它的基类是 `langchain-core` 里的 `BaseRetriever`。

0.x 的命名空间把加载器、切分器、存储和链放在一个包里。在锁定版本上，它们分散在五个地方：

| 部分 | 锁定版本上的包 | 里面有什么 |
|---|---|---|
| `Embeddings`、`VectorStore`、`BaseRetriever`、`Document` | `langchain-core` 1.8.0 | 基类、`InMemoryVectorStore`、`DeterministicFakeEmbedding`、`create_retriever_tool` 和索引 API |
| `init_embeddings` | `langchain` 1.5.0 | 把 `openai:text-embedding-3-small` 这样的模型字符串变成嵌入对象 |
| 文本切分器 | `langchain-text-splitters` 1.1.3 | `RecursiveCharacterTextSplitter`、`CharacterTextSplitter`，以及 Markdown、HTML、代码和 JSON 的切分器 |
| 真实的存储或嵌入模型 | 合作方包 | 例如 `langchain-chroma`、`langchain-qdrant`、`langchain-openai` 和 `langchain-ollama` |
| `MultiQueryRetriever`、`RetrievalQA`、`CacheBackedEmbeddings` | `langchain-classic` 1.0.8 {{code libs/langchain/pyproject.toml}} | 旧的链和检索器，为迁移而保留 |

基类在 core 里 {{code libs/core/langchain_core/retrievers.py}}。`InMemoryVectorStore` 把向量保存在 dict 里，并用 NumPy 的余弦相似度打分 {{code libs/core/langchain_core/vectorstores/in_memory.py}}。`langchain.embeddings` 只导出 `Embeddings` 和 `init_embeddings`，它的 docstring 说其他嵌入模块已迁到 `langchain-classic` {{code libs/langchain_v1/langchain/embeddings/__init__.py}}。v1 发布说明把旧的检索器列在迁移项里 {{docs oss/python/releases/langchain-v1}}。

PyPI 上 `langchain-community` 的最后一个版本是 0.4.2，它的仓库已归档 {{site pypi.org/project/langchain-community}}。0.x 年代的大多数加载器和存储都来自那里。Chroma 和 Qdrant 的包在主仓库的 `libs/partners` 下，各有自己的版本。对其他任何存储，安装社区包之前先找找有没有合作方包。

文档的 LangChain 标签页里没有检索页面。导航里的 Retrieval 条目打开的是一个 Deep Agents 页面 {{docs oss/python/deepagents/retrieval}}。那个页面提到两种风格：固定的“先检索再回答”步骤，以及由 agent 决定何时搜索。语义搜索教程一步步构建了本节的这条流水线 {{docs oss/python/langchain/knowledge-base}}。

## 录制工具包里的流水线 {#s-embeddings-splitters-vector-stores-and-retrievers-the-pipeline-in-the-capture-kit}

[图](#fig-7-1)展示了工具包的流水线。它在索引时运行一次，agent 在查询时每次调用工具都会用到它。

```figure
id: fig-7-1
kind: flow
title: 检索录制的索引时与查询时
claim: 三个文件一次性变成七个块和七个向量，之后每次 search_docs 调用都向一个检索器发问，检索器搜索同一个内存中的存储。
caption: 索引时请从左往右读上面一行，一次工具调用请读下面一行。每个部分所在的包写在它的方框下面。来源：capture/out/39-retrieval.txt 和 capture/s_integrations.py。
```

### 切分器 {#s-embeddings-splitters-vector-stores-and-retrievers-the-splitter}

**文本切分器（text splitter）：** 把文档切成块的对象，每块最多 `chunk_size` 个字符，相邻两块之间重复 `chunk_overlap` 个字符。

`RecursiveCharacterTextSplitter` 先尝试在段落分隔处切，然后是换行处，再然后是空格处。录制工具包用大小 80、重叠 20 切了三个短文件：

```listing
title: checkpoints.md 的前两个块
source: capture/out/39-retrieval.txt
lang: json
note: 七个块中的两个。重叠部分是 keeps it in a 这几个词。
---
  {
    "source": "checkpoints.md",
    "chars": 77,
    "text": "A checkpointer saves graph state after each step. InMemorySaver keeps it in a"
  },
  {
    "source": "checkpoints.md",
    "chars": 75,
    "text": "keeps it in a dict. SqliteSaver writes it to a file, so a thread survives a"
  },
```

切分器在空格处切，所以块会结束在句子中间。第一个块停在 `in a`，下一个块重复了这几个词。每个块都保留了所在文件的 `source` 元数据，因为录制工具包把它传给了 `create_documents`。

### 嵌入模型 {#s-embeddings-splitters-vector-stores-and-retrievers-the-embedding-model}

**嵌入模型：** 带有 `embed_query` 和 `embed_documents` 的对象，把文本变成一个数字向量。

录制工具包使用 `langchain-ollama` 里的 `OllamaEmbeddings(model="nomic-embed-text")`，运行在 x86 服务器客户机的 Ollama 服务器上。嵌入模型是真实的模型，所以用到它的文件都是录制文件，模型写在标题下面一行。

```listing
title: nomic-embed-text 给出的一个向量
source: capture/out/39-retrieval.txt
lang: json
---
{
  "dims": 768,
  "first 4": [
    0.051004,
    -0.024986,
    -0.178736,
    0.040572
  ],
  "repeat equal": true,
  "other text equal": false
}
```

每个向量有 768 个数字。同一段文本在这次运行里两次得到同一个向量，另一段文本得到另一个向量。`run.py --check` 不比较这些数字，因为它们由模型产生。它检查文件里有模型行，以及 `expect.py` 列出的字符串。

### 向量存储 {#s-embeddings-splitters-vector-stores-and-retrievers-the-vector-store}

带显式 id 的 `add_documents` 把七个块存成 `doc-0` 到 `doc-6`。`similarity_search_with_score` 返回由文档和分数组成的二元组。查询文本与某个块完全一致时得分为 1.0：

```listing
title: 用第一个块的原文搜索
source: capture/out/39-retrieval.txt
lang: json
note: 先是查询行，然后是第一个命中。第二个命中已截掉。
---
query 'A checkpointer saves graph state after each step. InMemorySaver keeps it in a':
[
  {
    "id": "doc-0",
    "source": "checkpoints.md",
    "score": 1.0,
…
```

下一个命中是 `doc-2`，得分 0.556317。它是同一个文件的最后一个块。换成别的措辞，查询 `Where does long-term memory live?` 返回了 `doc-3`，即 `stores.md` 的第一个块，得分 0.683653，以及来自 `checkpoints.md` 的 `doc-1`，得分 0.455558。查询 `What does a checkpointer do?` 返回了 `doc-0`，得分 0.68785，以及 `doc-2`，得分 0.507239。

`InMemoryVectorStore` 把一个 Python 函数当作它的 `filter`。录制工具包只保留 `stores.md` 的块，得到 `doc-3` 和 `doc-4`。合作方的存储使用它自己的过滤语法，所以过滤条件不能在不同存储之间通用。`delete(["doc-0"])` 删除了第一个块，之后 `get_by_ids` 只返回了 `doc-1`。对 `memory` 做 `max_marginal_relevance_search`，返回了 `doc-3` 和 `doc-2`。

## 把检索器作为工具 {#s-embeddings-splitters-vector-stores-and-retrievers-a-retriever-as-a-tool}

**向量存储检索器：** `as_retriever()` 返回的检索器。它用你给的 `search_kwargs` 在存储上执行一次搜索。

`create_agent` 没有检索参数。你给 agent 一个工具，工具去调用检索器。录制工具包用一个普通的 `@tool` 包装检索器：

```listing
title: 检索器和工具
source: capture/s_integrations.py
lang: python
---
    retriever = store.as_retriever(search_kwargs={"k": 1})

    @tool
    def search_docs(query: str) -> str:
        """Search the local corpus."""
        return "\n".join(f"[{d.metadata['source']}] {d.page_content}" for d in retriever.invoke(query))
```

录制工具包问 Qwen3 4B：`What does a checkpointer do?`。模型用这个问题调用了一次 `search_docs`，工具返回一个块，来源写在方括号里：

```listing
title: 工具调用及其结果
source: capture/out/47-retrieval-agent.txt
lang: json
note: 只保留 ToolMessage。它之前的模型调用和之后的回答已截掉。
---
    "type": "ToolMessage",
    "content": "[checkpoints.md] A checkpointer saves graph state after each step. InMemorySaver keeps it in a",
    "name": "search_docs",
    "id": "<uuid-3>",
    "tool_call_id": "<uuid-2>",
    "status": "success"
```

检索器返回了七个块里的第 0 块，即 `checkpoints.md` 的第一个块，它回答了这个问题。模型据此作答：`A checkpointer saves the graph state after each step. For example, the InMemorySaver keeps the state in memory.`。`k=1` 时模型只看到一个块。这个块停在 `keeps it in a`，而 `dict` 和 `SqliteSaver` 这两个词在 `doc-1` 里，模型没有拿到。所以答案是对的，但只和这一个块一样完整。

把来源写进结果文本。模型只能看到 `ToolMessage` 的内容，所以只有工具把文件名写进这段文本，它才能引用文件。core 里还有 `create_retriever_tool`，它用检索器、名称和描述构建同一类工具 {{code libs/core/langchain_core/tools/retriever.py}}。设置 `response_format="content_and_artifact"` 后，它还会把文档保存为消息的 artifact。

索引时和查询时做的是不同的工作。录制工具包在 agent 运行之前，把每个块嵌入一次。每次工具调用只嵌入查询。能持久化的存储，例如带服务器的合作方存储，会让索引时的工作跨重启保留。`InMemoryVectorStore` 在进程结束时就丢掉这些工作。

```takeaways
- 从 langchain_core 导入检索基类，从 langchain_text_splitters 导入切分器。
- 安装 langchain-community 之前，先找你的存储有没有合作方包。
- 通过工具把检索器交给 agent，并把来源写进结果文本。
- 评判模型的答案之前，先读检索器返回了哪个块。
- 在索引时、agent 运行之外，把语料嵌入一次。
```

来源：capture/s_integrations.py, capture/out/39-retrieval.txt, capture/out/47-retrieval-agent.txt; libs/core/langchain_core/retrievers.py, libs/core/langchain_core/vectorstores/in_memory.py, libs/core/langchain_core/vectorstores/base.py, libs/core/langchain_core/tools/retriever.py, libs/langchain_v1/langchain/embeddings/__init__.py, and libs/partners at langchain==1.5.0; libs/partners/ollama/langchain_ollama/embeddings.py at langchain-ollama 1.1.0; docs.langchain.com at docs commit 04d4d4a (oss/python/releases/langchain-v1, oss/python/deepagents/retrieval, oss/python/langchain/knowledge-base); the archived langchain-community repository, read 2026-11-14.
