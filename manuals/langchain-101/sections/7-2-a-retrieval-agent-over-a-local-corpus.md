# 基于本地语料的检索 agent

> 检索 agent 有两个会各自出错的部分：检索器找不找得到正确的段落，以及模型调不调用检索器，所以要分别测试。

你的团队想让 agent 用自己的文档回答问题，并在每条论断后面写出文件名。你建了一个向量存储，给 agent 一个搜索工具。最初的几个回答看起来不错。然后有人问了一个文档里逐字写着答案的问题，agent 却说文档没有涉及。

读完本节，你能基于本地嵌入模型构建检索 agent，并记录每个回答的来源。你还能判断一个错误回答来自检索器还是来自模型。

## 演示构建了什么 {#s-a-retrieval-agent-over-a-local-corpus-what-the-demo-builds}

语料是本仓库的六个课程文件，内容涉及嵌入、RAG、LangGraph、agent 框架和持久执行，共约 89,600 个字符。仓库使用 MIT 许可，所以演示直接读取这些文件的原位置，并记录它们的 SHA-256。

演示用到了这几节：

- [嵌入、切分器、向量存储与检索器](#s-embeddings-splitters-vector-stores-and-retrievers)：切分器、存储和 `create_retriever_tool`。
- [工具、ToolRuntime 与工具错误](#s-tools-toolruntime-and-tool-errors)：模型只能看到 `ToolMessage` 的内容，所以来源路径要写进那段文本。
- [系统提示词](#s-the-system-prompt)：每条论断都要引用来源，课程没有涉及某个问题时要说明。

## 流水线 {#s-a-retrieval-agent-over-a-local-corpus-the-pipeline}

`nomic-embed-text` 要求每段文本带一个任务前缀：段落用 `search_document:`，问题用 `search_query:`。`OllamaEmbeddings` 收到什么文本就发送什么 {{code langchain_ollama/embeddings.py}}，所以演示对它做了包装：

```listing
title: 嵌入包装器
source: capture/demos/retrieval-agent/retrieval_agent.py
lang: python
---
class NomicEmbeddings(Embeddings):
    def __init__(self, model="nomic-embed-text"):
        self.inner = OllamaEmbeddings(model=model)

    def embed_documents(self, texts):
        return self.inner.embed_documents([f"search_document: {t}" for t in texts])

    def embed_query(self, text):
        return self.inner.embed_query(f"search_query: {text}")
```

切分器把文件切成最多 1,000 个字符的块，重叠 150 个字符。`add_start_index=True` 保留每个块的偏移量，所以一个命中能指出文件里的位置。存储是 `InMemoryVectorStore`，每次运行都重建。

工具来自 `create_retriever_tool`。它的文档 prompt 在每个段落前面用方括号写出路径。使用 `content_and_artifact` 时，文档还会作为 artifact 保留在消息上，脚本因此可以对照搜索返回的内容检查每条引用：

```listing
title: 作为工具的检索器
source: capture/demos/retrieval-agent/retrieval_agent.py
lang: python
---
    retriever = store.as_retriever(search_kwargs={"k": 4})
    search = create_retriever_tool(
        retriever,
        "search_lessons",
        "Search the engineering lessons. Returns the four best passages, each with its source path.",
        document_prompt=PromptTemplate.from_template("[{source}]\n{page_content}"),
        response_format="content_and_artifact",
    )
    agent = create_agent(model(), tools=[search], system_prompt=SYSTEM_PROMPT)
```

每次 agent 运行之前，脚本都会自己搜索存储，并打印前四个命中。不管模型随后做什么，这一行单独显示了检索器的表现。

## 录制的运行 {#s-a-retrieval-agent-over-a-local-corpus-the-recorded-run}

演示问了五个问题。其中四个在某个课程文件里有答案，一个关于该买哪块 GPU 的问题没有答案。它分别用 Qwen3 4B 和 Qwen3 8B 各运行一次。

切分得到 122 个块，嵌入它们用了 2.2 秒。对于关于 Matryoshka 嵌入的问题，第一个命中就是正确的文件。Qwen3 8B 做了搜索、给出回答，并引用了那个文件：

```listing
title: 一个问题，Qwen3 8B
source: capture/lab/retrieval-agent/run-8b.log
lang: text
---
== matryoshka: How much storage does Matryoshka truncation from 1536 to 256 dimensions save, and what does it cost in accuracy?
  top-4      0.791  phases/11-llm-engineering/04-embeddings/docs/en.md @ 12305
  top-4      0.664  phases/11-llm-engineering/06-rag/docs/en.md @ 4675
  top-4      0.658  phases/11-llm-engineering/04-embeddings/docs/en.md @ 21476
  top-4      0.654  phases/11-llm-engineering/04-embeddings/docs/en.md @ 12982
  search     Matryoshka truncation from 1536 to 256 dimensions
  returned   11-llm-engineering/04-embeddings, 11-llm-engineering/06-rag, 11-llm-engineering/04-embeddings, 11-llm-engineering/04-embeddings
  answer     Requesting 256 dimensions instead of 1536 cuts storage by 6x with roughly 3-5% accuracy loss on MTEB benchmarks [phases/11-llm-engineering/04-embeddings/docs/en.md].
  cited      phases/11-llm-engineering/04-embeddings/docs/en.md
  check      cited an expected source: True; every citation was returned by a search: True
  model calls 2, prompt tokens 1802, 10.3 s
```

Qwen3 4B 得到了同样的前四个命中，因为检索器不依赖聊天模型。但它从没调用过工具：

```listing
title: 同一个问题，Qwen3 4B
source: capture/lab/retrieval-agent/run-4b.log
lang: text
note: 前四个命中已截掉，它们与 Qwen3 8B 那次运行相同。
---
== matryoshka: How much storage does Matryoshka truncation from 1536 to 256 dimensions save, and what does it cost in accuracy?
…
  answer     The lessons do not cover the topic of Matryoshka truncation, storage savings, or accuracy costs. Therefore, the lessons do not cover it [none].
  cited      nothing
  check      cited an expected source: False; every citation was returned by a search: True
  model calls 1, prompt tokens 291, 0.9 s
```

## 这次运行说明了什么 {#s-a-retrieval-agent-over-a-local-corpus-what-the-run-shows}

**我们测量了** Mac 上每个模型的一次运行，机器是 Apple M1 Max，10 核，64 GiB，使用 Ollama 0.31.1，每个模型五个问题。

| 问题 | 第一个命中是正确的文件 | Qwen3 4B | Qwen3 8B |
|---|---|---|---|
| 没有 reducer 的字段 | 是 | 没有搜索，说没有涉及 | 没有搜索，说没有涉及 |
| Matryoshka 截断 | 是 | 没有搜索，说没有涉及 | 搜索了，引用了正确的文件 |
| 可靠性衰减 | 是 | 没有搜索，说没有涉及 | 搜索了，引用了正确的文件 |
| 检查点的键 | 是 | 没有搜索，说没有涉及 | 搜索了，引用了正确的文件 |
| 该买哪块 GPU | 语料里没有 | 说没有涉及 | 说没有涉及 |

对语料能回答的四个问题，检索器都把正确的文件排在第一位。失败全是模型造成的。Qwen3 4B 对每个问题都凭自己对 prompt 的理解作答，从没调用 `search_lessons`。Qwen3 8B 有一次跳过了搜索，就是 reducer 那个问题。两个模型写出的每条引用，都是那次运行中某次搜索返回过的文件。

所以当回答说文档没有涉及某个问题时，先在追踪里查有没有工具调用，再去调检索器。没有搜索的运行是模型问题。有搜索但段落不对的运行是检索器问题。

```takeaways
- 把来源路径写进每个段落的文本，因为模型只能看到这段文本。
- 把文档保留为 artifact，并对照它们检查每条引用。
- 在每个回答旁边记录检索器的前几个命中，这样可以单独测试它。
- 调整块或嵌入之前，先检查有没有工具调用。
- 加上你的嵌入模型所要求的任务前缀。
```

来源：capture/demos/retrieval-agent/retrieval_agent.py, capture/demos/retrieval-agent/run.sh, capture/demos/retrieval-agent/README.md; capture/lab/retrieval-agent/run-4b.log, capture/lab/retrieval-agent/run-8b.log, capture/lab/retrieval-agent/run-4b.jsonl, capture/lab/retrieval-agent/run-8b.jsonl, capture/lab/retrieval-agent/corpus.txt, capture/lab/summary/demos-mac.json; libs/core/langchain_core/tools/retriever.py at langchain-core 1.8.0; langchain_ollama/embeddings.py at langchain-ollama 1.1.0.
