# ColPali 与视觉原生文档 RAG

> 传统 RAG 把 PDF 解析成文本、切成块、嵌入块、存向量。每一步都丢信号：OCR 丢掉图表数据，分块拆散表格行，文本嵌入无视图。ColPali（Faysse 等人，2024 年 7 月）问了个更简单的问题：为什么要抽文本？经 PaliGemma 直接嵌入页面图像，用 ColBERT 式的晚交互做检索，保留文档携带的所有版面、图、字体和格式信号。公布的基准：在视觉丰富的文档上端到端准确率比文本 RAG 高 20-40%。ColQwen2、ColSmol 和 VisRAG 拓展了这个模式。本节课通读视觉原生 RAG 论点，并搭一个微型 ColPali 式索引器。

**类型：** Build
**语言：** Python（标准库，多向量索引器 + MaxSim 打分器）
**前置要求：** Phase 11（LLM 工程——RAG 基础）、Phase 12 · 05（LLaVA）
**预计时间：** ~180 分钟

## 学习目标

- 解释双编码器检索（每文档一个向量）与晚交互检索（每文档多个向量）的区别。
- 描述 ColBERT 的 MaxSim 操作，以及 ColPali 如何把它从文本 token 泛化到图像 patch。
- 搭一个微型 ColPali 式索引器：页面 → patch 嵌入 → 对查询词嵌入做 MaxSim → top-k 页面。
- 在发票 / 财务报告用例上把 ColPali + Qwen2.5-VL 生成器与文本 RAG + GPT-4 作比较。

## 问题背景

PDF 上的文本 RAG 扔掉了文档的大部分。一份财务报告的 Q3 营收增长通常在图表里；一份医疗报告的发现在标注图像里；一份法律合同的签名块是个版面事实，不是文本事实。

文本 RAG 流水线：

1. PDF → 经 OCR / pdftotext 转文本。
2. 文本 → 300-500 token 的块。
3. 块 → 双编码器嵌入（一个向量）。
4. 用户查询 → 嵌入 → 余弦相似度 → top-k 块。
5. 块 + 查询 → LLM。

五个有损步骤。图表没捕到。表格跨块拆散。多栏版面被压平。图注消失。

ColPali 的解法：跳过 OCR，直接嵌入页面图像。用 ColBERT 式晚交互做检索，让模型在查询时能关注细粒度的 patch。

## 核心概念

### ColBERT（2020）

ColBERT（Khattab & Zaharia，arXiv:2004.12832）是一种文本检索方法。它不是每文档一个向量，而是每 token 一个向量。查询时：

- 查询 token 拿到自己的嵌入（N_q 个向量）。
- 文档 token 拿到嵌入（N_d 个向量，通常缓存）。
- 分数 = 对每个查询 token，取它与文档 token 余弦相似度的最大值，再求和：Σ_i max_j cos(q_i, d_j)。

这就是 MaxSim 操作。每个查询 token "挑"它最匹配的文档 token。最终分数是求和。

优点：召回强，处理词级语义。缺点：每文档 N_d 个向量，存储昂贵。

### ColPali

ColPali（Faysse 等人，arXiv:2407.01449）把 ColBERT 模式应用到图像。

- 每页被 PaliGemma（ViT + 语言）编码成 patch 嵌入：每页 N_p 个向量。
- 每个用户查询（文本）被编码成查询 token 嵌入：N_q 个向量。
- 分数 = Σ_i max_j cos(q_i, p_j)，即对查询文本 token 和页面图像 patch 做 MaxSim。
- 按总分检索 top-k 页面。

文档摄入时：用 PaliGemma 嵌入每页，存所有 patch 嵌入。查询时：嵌入查询 token，对所有存好的页面嵌入算 MaxSim，返回 top-k 页面。

优点：在视觉丰富的文档上端到端比文本 RAG 高 20-40%。每个 patch 向量捕捉局部版面和内容。

缺点：每页 N_p 个 patch × 4 字节浮点 × D 维向量 = 存储增长快。用 PQ / OPQ 量化缓解。

### ColQwen2 与 ColSmol

ColQwen2（illuin-tech，2024-2025）把 PaliGemma 换成 Qwen2-VL。更好的基座编码器，更好的检索。

ColSmol 是面向本地 / 边缘使用的更小规模变体。一个约 1B 参数的 ColSmol 检索器能跑在消费级 GPU 上。

### VisRAG

VisRAG（Yu 等人，arXiv:2410.10594）是个不同的变体：不是对 patch 做 MaxSim，而是用一个 VLM 把每页池化成单个向量，再做双编码器检索。索引更快 + 存储更小，召回更弱。

质量 vs 成本的取舍：求质量用 ColPali，求规模用 VisRAG。

### M3DocRAG

M3DocRAG（Cho 等人，arXiv:2411.04952）把多模态检索扩展到多页多文档推理。跨文档检索页面，为 VLM 组织一个多页上下文。

### ViDoRe —— 基准

ColPali 的配套基准。视觉文档检索评测。任务包括财务报告、科学论文、行政文档、医疗记录、手册。指标：nDCG@5。

ColPali-v1 在 ViDoRe 上拿到约 80% nDCG@5；同样文档上的文本 RAG 拿到约 50-60%。

### 端到端 RAG 流水线

对一个视觉原生 RAG：

1. 摄入：PDF → 页面图像 → PaliGemma 编码 → 存所有 patch 嵌入。
2. 查询：用户文本 → 查询 token 嵌入 → 对所有索引页面做 MaxSim → top-k 页面。
3. 生成：top-k 页面图像 + 查询 → VLM（Qwen2.5-VL 或 Claude）→ 答案。

哪儿都没有 OCR。图、图表、字体、版面全流入答案。

### 存储的数学

一份 50 页财务报告，每页 729 个 patch、128 维嵌入：

- ColPali：50 * 729 * 128 * 4 字节 = 约 18 MB 原始，PQ 后约 4 MB。
- 文本 RAG：50 块 * 768 维 * 4 字节 = 约 150 kB。

ColPali 每文档存储约多 30 倍。规模化时，OPQ / PQ 把它降到约 5-10 倍，通常可接受。

### 文本 RAG 仍取胜的情况

- 无版面信号的纯文本文档（wiki 文章、聊天记录）。文本 RAG 更简单、存储更便宜。
- 存储主导成本的数百万页档案。
- 严格的监管要求，要求检索之外还有可抽取的 OCR 文本。

到 2026 年，其余一切——财务报告、科学论文、法律合同、医疗记录、UX 文档——视觉原生 RAG 取胜。

```figure
mm-maxsim
```

## 实际使用

`code/main.py`：

- 玩具 patch 编码器：把一个"页面"（特征向量的小网格）映射成一个 patch 嵌入数组。
- MaxSim 打分器：在一组查询 token 嵌入和一个页面 patch 集之间算 ColBERT 式分数。
- 索引 5 个玩具页面，跑 3 个查询，返回带分数的 top-k。

## 拿去用

本节课产出 `outputs/skill-vision-rag-designer.md`。给定一个文档 RAG 项目，它挑选 ColPali / ColQwen2 / VisRAG / 文本 RAG 并为存储定规格。

## 练习

1. 一份 200 页年报，每页 729 个 patch、128 维嵌入、4 字节浮点。算原始存储和 PQ 压缩（8 倍）后的存储。

2. MaxSim 是 Σ_i max_j cos(q_i, p_j)。它捕捉到了什么是简单均值相似度做不到的？

3. ColPali 把页面索引为 patch 集。如果我们改在词级索引（像 ColBERT 那样）会怎样？有什么取舍？

4. 为一个 100 万页语料、每查询 500ms 延迟预算设计端到端流水线。挑 ColQwen2 / VisRAG 并辩护。

5. 读 M3DocRAG（arXiv:2411.04952）。描述多页注意力模式，以及它与单页 ColPali 检索有何不同。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 晚交互 | "ColBERT 式" | 用逐 token 或逐 patch 嵌入 + MaxSim 检索，而非单个文档向量 |
| MaxSim | "对 patch 取最大" | 对每个查询 token，挑相似度最高的文档 token；跨查询求和 |
| 双编码器 | "单向量" | 每文档一个向量；更快但丢粒度 |
| 多向量 | "每文档多向量" | 每文档 / 页面存 N_p 个向量；存储成本涨但召回提升 |
| patch 嵌入 | "页面特征" | 来自 VLM 编码器的每个图像 patch 一个向量，按页缓存 |
| ViDoRe | "视觉文档基准" | ColPali 的视觉文档检索基准套件 |
| PQ 量化 | "乘积量化" | 在保持向量相似度的同时把存储缩小约 8 倍的压缩 |

## 延伸阅读

- [Faysse et al. — ColPali (arXiv:2407.01449)](https://arxiv.org/abs/2407.01449)
- [Khattab & Zaharia — ColBERT (arXiv:2004.12832)](https://arxiv.org/abs/2004.12832)
- [Yu et al. — VisRAG (arXiv:2410.10594)](https://arxiv.org/abs/2410.10594)
- [Cho et al. — M3DocRAG (arXiv:2411.04952)](https://arxiv.org/abs/2411.04952)
- [illuin-tech/colpali GitHub](https://github.com/illuin-tech/colpali)
