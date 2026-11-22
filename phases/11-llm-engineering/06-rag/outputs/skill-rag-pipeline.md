---
name: skill-rag-pipeline
description: 从第一性原理出发构建和调试 RAG 流水线
version: 1.0.0
phase: 11
lesson: 6
tags: [rag, retrieval, embeddings, vector-search, llm-engineering]
---

# RAG 流水线模式

所有 RAG 系统都遵循这个模式：

```
documents -> chunk -> embed -> store
query -> embed -> search(top_k) -> build_prompt -> generate
```

每篇文档只建一次索引。每次用户请求都要走一遍查询。

## 什么时候用 RAG

- LLM 需要访问私有或最新的文档
- 微调太贵，或更新太慢
- 需要为答案标注来源
- 知识库变化频繁

## 什么时候不要用 RAG

- 答案是 LLM 已经掌握的常识
- 任务是创作类（写作、头脑风暴）而非事实类
- 需要模型采用特定的推理风格（用微调）

## 实现清单

1. 把文档切成 256-512 token 的片段，重叠 50 token
2. 用同一个 embedding 模型嵌入每个块
3. 把 embedding 连同原文一起存入向量数据库
4. 查询时用同一个模型嵌入用户问题
5. 通过余弦相似度检索 top-k（5-10）个最相似的块
6. 组装 prompt：系统指令 + 检索到的上下文 + 用户问题
7. 生成答案，让答案以检索到的上下文为依据
8. 返回答案并附上来源引用

## 常见错误

- 建索引和查询用了不同的 embedding 模型（向量不兼容）
- 块太小（丢失上下文）或太大（稀释相关性）
- 块之间没有重叠（句子在边界处被切开）
- 文档变了却忘了重建索引
- 直接把检索块丢给用户，而没有生成连贯的答案
- 事实类 RAG 查询没有设置 temperature=0（temperature 越高，幻觉越多）

## 调试检索

如果没有检索到正确的块：
1. 打印查询 embedding，确认它不是零向量
2. 对一个已知相关的块手动计算余弦相似度
3. 换个说法改写查询，使其贴近文档用词
4. 确认建索引和查询时用的是同一个 embedding 模型
5. 检查相关内容是否在分块时丢失

## 生产参数

- 块大小：256-512 token
- 重叠：50 token（块大小的 10-20%）
- Top-k：大多数用例取 5-10
- Temperature：事实类答案取 0
- Embedding 模型：text-embedding-3-small（性价比高）或 text-embedding-3-large（准确率更高）
