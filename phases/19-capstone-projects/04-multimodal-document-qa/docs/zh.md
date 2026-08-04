# 顶点项目 04 —— 多模态文档问答（视觉优先的 PDF、表格、图表）

> 2026 年文档问答的前沿，从“先 OCR 再处理文本”转向了视觉优先的后期交互（late interaction）。ColPali、ColQwen2.5、ColQwen3-omni 把每一页 PDF 当成图像，用多向量后期交互做 embedding，让查询直接对 patch 做注意力。在财务 10-K、科学论文、手写笔记上，这套范式大幅领先于 OCR 优先。在 1 万页上端到端搭出这条流水线，再发一份跟“先 OCR 再处理文本”并排对比的报告。

**类型：** Capstone
**语言：** Python（流水线）、TypeScript（查看器 UI）
**前置要求：** 第 4 阶段（计算机视觉）、第 5 阶段（NLP）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）
**涉及阶段：** P4 · P5 · P7 · P11 · P12 · P17
**预计时间：** 30 小时

## 问题背景

企业手里压着一堆被 OCR 流水线糟蹋的 PDF：带旋转表格的扫描版 10-K、公式密布的科学论文、只有当成图像才说得通的图表、手写批注。把这些当成文本优先来处理，等于丢掉一半信号。2026 年的答案是在原始页面图像上做后期交互的多向量检索。ColPali（Illuin Tech）提出了它；ColQwen2.5-v0.2 和 ColQwen3-omni 把准确率往上推。在 ViDoRe v3 上，视觉优先检索以可观的幅度领先“先 OCR 再处理文本”——而且在图表、表格、手写上这个差距还会拉大。

代价是存储和延迟。一个 ColQwen embedding 是每页约 2048 个 patch 向量，而不是单个 1024 维向量。原始存储会爆涨。DocPruner（2026）带来 50% 的剪枝且无可测量的准确率损失。你要给 1 万页建索引，衡量 ViDoRe v3 的 nDCG@5，在 2s 内给出答案，并直接跟“先 OCR 再处理文本”的基线对比。

## 核心概念

后期交互意味着每个查询 token 都对每个 patch token 打分，再把每个查询 token 的最大分加起来。你拿到细粒度的匹配，不需要单个池化向量。一个多向量索引（Vespa、Qdrant 多向量，或 AstraDB）存这些逐 patch 的 embedding，检索时跑 MaxSim。

作答器是一个视觉-语言模型，它接收查询加 top-k 个检索到的页面图像，写出一个带证据区域（bounding box 或页面引用）的答案。Qwen3-VL-30B、Gemini 2.5 Pro、InternVL3 是 2026 年的前沿选择。对于公式和科学记号，一个 OCR 兜底（Nougat、dots.ocr）作为可选的文本通道拼进来。

评测是一个二维矩阵。一个轴：内容类型（纯文本段落、密集表格、柱状/折线图、手写笔记、公式）。另一个轴：检索方式（视觉优先后期交互 vs 先 OCR 再处理文本 vs 混合）。每个格子拿到 nDCG@5 和答案准确率。这份报告就是交付物。

## 架构

```
PDFs -> page renderer (PyMuPDF, 180 DPI)
           |
           v
  ColQwen2.5-v0.2 embed (multi-vector per page, ~2048 patches)
           |
           +------> DocPruner 50% compression
           |
           v
   multi-vector index (Vespa or Qdrant multi-vector)
           |
query ----+----> retrieve top-k pages (MaxSim)
           |
           v
  VLM answerer: Qwen3-VL-30B | Gemini 2.5 Pro | InternVL3
    inputs: query + top-k page images + optional OCR text
           |
           v
  answer with cited page numbers + evidence regions
           |
           v
  Streamlit / Next.js viewer: highlighted boxes on source page
```

## 技术栈

- 页面渲染：PyMuPDF（fitz），180 DPI，竖排归一化
- 后期交互模型：ColQwen2.5-v0.2 或 ColQwen3-omni（Hugging Face 上的 vidore 团队）
- 索引：带多向量字段的 Vespa，或 Qdrant 多向量，或带 MaxSim 的 AstraDB
- 剪枝：DocPruner 2026 策略（保留高方差 patch，50% 压缩、准确率损失 < 0.5%）
- OCR 兜底（公式 / 密集表格）：dots.ocr 或 Nougat
- VLM 作答器：自托管 Qwen3-VL-30B 或托管 Gemini 2.5 Pro；InternVL3 作兜底
- 评测：ViDoRe v3 基准、多页推理用 M3DocVQA
- 查看器 UI：Next.js 15，用 canvas 叠加证据区域

```figure
ce-late-interaction
```

## 动手构建

1. **摄入。** 遍历一份横跨 10-K、科学论文、扫描文档的 1 万页 PDF 语料。把每页渲染成 1536x2048 的 PNG。持久化 `{doc_id, page_num, image_path}`。

2. **embedding。** 在每个页面图像上跑 ColQwen2.5-v0.2。输出形状约为 2048 个维度 128 的 patch embedding。用 DocPruner 留下信号最强的一半。写进 Vespa 多向量字段或 Qdrant 多向量。

3. **查询。** 对每个进来的查询，用查询塔做 embedding（token 级 embedding）。对索引跑 MaxSim：对每个查询 token，取它对页面 patch embedding 的最大点积，再求和。返回 top-k 个页面。

4. **合成。** 用查询和 top-5 页面图像调用 Qwen3-VL-30B。prompt：“只用提供的页面作答。每条断言都按 (doc_id, page) 引用，并指出区域（图、表、段落）。”

5. **证据区域。** 后处理答案，抽出被引用的区域。如果 VLM 吐出 bounding box（Qwen3-VL 会），就在查看器里把它们渲染成叠加层。

6. **OCR 兜底。** 对被判定为公式密集的页面（基于图像方差的启发式），跑 Nougat 或 dots.ocr，把 OCR 文本作为图像之外的额外通道一并传入。

7. **评测。** 跑 ViDoRe v3（检索 nDCG@5）和 M3DocVQA（多页问答准确率）。同时用同一个合成器在同一份语料上跑“先 OCR 再处理文本”的流水线。产出一个 内容类型 × 方式 的矩阵。

8. **UI。** 先做 Streamlit 原型；再做 Next.js 15 生产查看器，逐页叠加证据区域。

## 实际使用

```
$ doc-qa ask "what was the 2024 operating margin change for segment EMEA?"
[retrieve]   top-5 pages in 320ms (ColQwen2.5, MaxSim, Vespa)
[synth]      qwen3-vl-30b, 1.4s, cited (form-10k-2024, p. 88) + (..., p. 92)
answer:
  EMEA operating margin moved from 18.2% to 16.8%, a 140bp decline.
  cited: 10-K-2024.pdf p.88 (Table 4, Segment Operating Margin)
         10-K-2024.pdf p.92 (MD&A, Operating Performance)
[viewer]     open with highlighted bounding boxes overlaid on p.88 Table 4
```

## 拿去用

`outputs/skill-doc-qa.md` 描述交付物：一个视觉优先的多模态文档问答系统，针对某份具体语料调优，并在 ViDoRe v3 上对照“先 OCR 再处理文本”的基线评测。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | ViDoRe v3 / M3DocVQA 准确率 | 跟 OCR 文本基线和公开榜单对比的基准数字 |
| 20 | 证据区域落地 | 被引用区域中实际包含答案区间的占比 |
| 20 | 存储与延迟工程 | DocPruner 压缩比、索引 p95、答案 p95 |
| 20 | 多页推理 | 在一份手工标注的 100 问多页集上的准确率 |
| 15 | 来源核查体验 | 查看器清晰度、叠加保真度、并排对比工具 |
| **100** | | |

## 练习

1. 在同一份语料上衡量 ColQwen2.5-v0.2 vs ColQwen3-omni。哪些页面是一个对、另一个漏的？给索引加一个“内容类别”标签，按类型路由。

2. 激进地剪枝 embedding（75%、90%）。找到那道压缩悬崖：ViDoRe nDCG@5 跌破 OCR 基线的那个点。

3. 做一个混合：并行跑“先 OCR 再处理文本”和 ColQwen，用 RRF 融合，再用 cross-encoder 重排。混合会不会胜过单独任一种？它在哪里帮助最大？

4. 把 Qwen3-VL-30B 换成更小的 VLM（Qwen2.5-VL-7B）。衡量每美元准确率曲线。

5. 加上手写笔记支持。渲染手写语料，用 ColQwen 做 embedding，衡量检索。跟手写 OCR 流水线对比。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Late interaction（后期交互） | “ColPali 风格的检索” | 查询 token 独立地对页面 patch 打分；MaxSim 做聚合 |
| Multi-vector（多向量） | “逐 patch 的 embedding” | 每个文档有很多向量，而不是一个池化向量 |
| MaxSim | “后期交互打分” | 对每个查询 token，取它对文档向量的最大相似度；再求和 |
| DocPruner | “patch 压缩” | 2026 年的剪枝，保留 50% 的 patch，准确率损失可忽略 |
| ViDoRe v3 | “文档检索基准” | 衡量视觉文档检索的 2026 年标准 |
| Evidence region（证据区域） | “被引用的 bounding box” | 源页面上定位答案区间的一个 bbox |
| OCR fallback（OCR 兜底） | “公式通道” | 对公式或表格密集的页面，跟视觉并用的文本流水线 |

## 延伸阅读

- [ColPali (Illuin Tech) repository](https://github.com/illuin-tech/colpali) —— 后期交互文档检索的参考
- [ColPali paper (arXiv:2407.01449)](https://arxiv.org/abs/2407.01449) —— 奠基性的方法论文
- [ColQwen family on Hugging Face](https://huggingface.co/vidore) —— 生产就绪的 checkpoint
- [M3DocRAG (Adobe)](https://arxiv.org/abs/2411.04952) —— 多页多模态 RAG 基线
- [Vespa multi-vector tutorial](https://docs.vespa.ai/en/colpali.html) —— 参考服务栈
- [Qdrant multi-vector support](https://qdrant.tech/documentation/concepts/vectors/#multivectors) —— 备选索引
- [AstraDB multi-vector](https://docs.datastax.com/en/astra-db-serverless/databases/vector-search.html) —— 备选托管索引
- [Nougat OCR](https://github.com/facebookresearch/nougat) —— 能处理公式的 OCR 兜底
