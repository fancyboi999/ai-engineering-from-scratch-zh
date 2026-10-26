---
id: ocr-documents
title: OCR 与文档理解
code: OD
subtitle: 训练 CTC OCR，选择文档处理栈，用 MaxSim 检索页面，并对照精确原文片段批准字段。
hue: 165
sources: phases/04-computer-vision/19-ocr-document-understanding, phases/12-multimodal-ai/22-document-diagram-understanding, phases/12-multimodal-ai/23-colpali-vision-native-rag, phases/19-capstone-projects/04-multimodal-document-qa, projects/document-extraction-desk
source_hash: 7002a9a5cbd27f82
---

## 经典 OCR 流水线
type: architecture
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md

```arch
node | img | 1,1 | 图像 | | client
node | det | 2,1 | 文本检测 | DB、EAST、CRAFT | model
node | box | 3,1 | 边界框 | 单词或行 | store
node | crop | 4,1 | 裁剪各区域 | 固定高度 | process
node | rec | 4,2 | 识别 | CRNN + CTC | model
node | txt | 3,2 | 文本字符串 | | store
node | lay | 2,2 | 版面排序 | 阅读顺序 | process
node | out | 1,2 | 按阅读顺序排列的文本 | | client
edge | img | det |
edge | det | box |
edge | box | crop |
edge | crop | rec |
edge | rec | txt |
edge | txt | lay |
edge | lay | out |
```

## 代码任务
type: task-table
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/04-computer-vision/19-ocr-document-understanding/code/main.py, phases/12-multimodal-ai/22-document-diagram-understanding/code/main.py, phases/12-multimodal-ai/23-colpali-vision-native-rag/code/main.py, phases/19-capstone-projects/04-multimodal-document-qa/code/main.py

| 任务 | 代码 |
|---|---|
| CTC 损失 | `ctc_loss(log_probs, targets, ...)` |
| 贪心 CTC 解码 | `greedy_ctc_decode(log_probs, blank=0)` |
| 行识别器 | `TinyCRNN(vocab_size=40, hidden=128, feat=32)` |
| 生产 OCR | `PaddleOCR(lang="en").ocr(image_path)` |
| LayoutLMv3 输入 | `layoutlm_input(tokens)` |
| Donut JSON 模式 | `donut_schema("invoice")` |
| MaxSim 排名前 k 的页面 | `retrieve(query, pages, k=3)` |

## 用 CTC 训练 CRNN
type: annotated-code
lang: python
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/04-computer-vision/19-ocr-document-understanding/code/main.py

```python
vocab = ["_"] + list("0123456789abcdefghijklmnopqrstuvwxyz")  # 索引 0 为 blank
model = TinyCRNN(vocab_size=len(vocab))
opt = torch.optim.Adam(model.parameters(), lr=1e-3)
imgs, targets, target_lens = build_batch(strings, vocab)    # 高度 32
log_probs = model(imgs)                                     # (W', N, vocab)
input_lens = torch.full((8,), log_probs.size(0), dtype=torch.long)
loss = F.ctc_loss(log_probs, targets, input_lens, target_lens,
                  blank=0, reduction="mean", zero_infinity=True)
opt.zero_grad(); loss.backward(); opt.step()                # 200 步内从约 3 降到约 0.2
```

## MaxSim 后期交互
type: annotated-code
lang: python
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/code/main.py, phases/19-capstone-projects/04-multimodal-document-qa/code/main.py

```python
def maxsim(query_tokens, patches):
    s = 0.0
    for q in query_tokens:                      # 每个查询 token 一个向量
        best = max(cosine(q, p) for p in patches)  # 最匹配的页面图块
        s += best                               # 对查询 token 求和
    return s
scored = [(p.doc_id, maxsim(query.tokens, p.patches)) for p in pages]
scored.sort(key=lambda x: -x[1])                # 排名前 k 的页面
idx = build_index(prune=True)                   # 开启 DocPruner，保留 50% 图块
hits = idx.retrieve(q, k=3)
```

## 命令
type: command-table
span: 2
from: projects/document-extraction-desk/README.md, projects/document-extraction-desk/solution/cli.py, phases/19-capstone-projects/04-multimodal-document-qa/code/ts/README.md, phases/19-capstone-projects/04-multimodal-document-qa/code/main.py

| 命令 | 作用 |
|---|---|
| `python3 cli.py sample.txt --schema schema.json --output output/review.html` | 构建 HTML 审核台和 JSON 报告 |
| `--proposals <file>` | 加载外部 OCR 或模型候选 |
| `--approve <file>` | 应用从 HTML 审核台下载的决定 |
| `python3 scripts/project_test.py document-extraction-desk --all --solution --strict` | 评分参考实现 |
| `python main.py` | 运行综合项目的 MaxSim 与 DocPruner 骨架 |
| `npm start` | 运行一次查看器自检，以 0 退出 |
| `npm run serve` | 在 127.0.0.1 启动查看器 HTTP 服务 |

## 视觉优先的文档问答
type: flow
from: phases/19-capstone-projects/04-multimodal-document-qa/docs/zh.md

1. **导入**：将每页 PDF 渲染为 1536x2048 PNG，保留 `{doc_id, page_num, image_path}`。
2. **嵌入**：运行 ColQwen2.5-v0.2，每页得到约 2048 个 128 维图块向量。
3. **剪枝**：DocPruner 保留信号最强的一半图块。
4. **查询**：嵌入查询 token，运行 MaxSim，返回前 k 页。
5. **综合**：将查询和前 5 页图像交给 VLM，引用 (doc_id, page)。
6. **证据**：在查看器中以覆盖层绘制引用边界框。
7. **OCR 兜底**：公式密集页面使用 Nougat 或 dots.ocr。
8. **评估**：报告 ViDoRe v3 nDCG@5 和 M3DocVQA，对比先 OCR 再文本的方案。

## 公式与数字
type: concepts
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md

- **CTC 折叠**：先合并重复，再移除 blank。"h h h _ _ e e l l _ l l o _ _" 得到 "hello"。
- **CER**：Levenshtein 距离除以参考文本长度，WER 则按单词计算。
- **MaxSim**：对查询 token $q_i$ 和页面图块 $p_j$ 计算 $\sum_i \max_j \cos(q_i, p_j)$。
- **ColPali 存储**：50 页 x 729 图块 x 128 维 x 4 字节 = 原始约 18 MB，8 倍 PQ 压缩后约 2.3 MB。
- **Text-RAG 存储**：50 块 x 768 维 x 4 字节 = 约 150 kB，ColPali 原始存储约大 120x，PQ 后约大 15x。
- **ViDoRe**：ColPali-v1 的 nDCG@5 约 80%，Text-RAG 约 50-60%。

## 默认值与限制
type: defaults
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/19-capstone-projects/04-multimodal-document-qa/docs/zh.md, projects/document-extraction-desk/solution/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| CER 目标 | < 2% | 清晰扫描件 |
| CRNN 输入高度 | 32 | CNN 将高度池化为 1，宽度即时间 |
| 页面渲染 | 180 DPI | 综合项目中使用 PyMuPDF |
| DocPruner | 50% | 准确率损失低于 0.5% |
| 模式字段 | 1 至 30 | 小写名称，标签唯一 |
| 文档大小 | 100000 | 最大字符数 |
| 候选数 | 300 | 每次审核的候选上限 |

## 选择文档处理栈
type: concepts
from: phases/12-multimodal-ai/22-document-diagram-understanding/docs/zh.md, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md

- **大规模印刷发票**：LayoutLMv3 + 规则，成本较低。
- **混合内容、手写和表单**：原生 VLM（PaliGemma 2 或 Qwen2.5-VL）。
- **arXiv 论文**：数学用 Nougat，图表用 VLM。
- **受监管场景**：OCR 流水线加 VLM 校验器交叉检查。
- **结构固定的收据**：微调 Donut。
- **纯文本文档**：text-RAG，更简单且存储更少。
- **视觉丰富的 PDF**：重质量用 ColPali，重规模用 VisRAG。

## 常见问题排查
type: troubleshooting
from: projects/document-extraction-desk/solution/main.py, projects/document-extraction-desk/solution/cli.py, projects/document-extraction-desk/stages/03-review-and-approve/docs/zh.md, phases/12-multimodal-ai/22-document-diagram-understanding/docs/zh.md, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "Approval belongs to another document version" | 文本变化，`sourceSha256` 不同 | 重新审核新版本 |
| "Proposal does not match its exact source span" | 引文不在 `start`、`end` 位置 | 修正候选偏移量 |
| "Use an ISO date: YYYY-MM-DD" | 日期字段不是 ISO 文本 | 修正源文本 |
| 字段状态有歧义 | 有两处 Seats 引文 | 使用 `--approve` 选择一个片段 |
| Donut 处理论文失败 | 无 OCR 模型专用性强 | 论文用 Nougat |
| RAG 缺少图表数据 | OCR 丢失图表信息 | 用 ColPali 嵌入页面图像 |

## 缩写
type: glossary
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/12-multimodal-ai/22-document-diagram-understanding/docs/zh.md, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md

- **CTC**：连接时序分类，无需逐时间步标签即可训练。
- **CRNN**：卷积特征 + BiLSTM + CTC，2015 年基线。
- **VLM-OCR**：经训练或 prompt 引导执行 OCR 的视觉语言模型。
- **DocVQA**：文档视觉问答标准，是引用最多的分数。
- **ViDoRe**：视觉文档检索评估，指标为 nDCG@5。
- **PQ**：乘积量化，将存储缩小约 8x。

## 问答
type: qa
from: phases/04-computer-vision/19-ocr-document-understanding/docs/zh.md, phases/12-multimodal-ai/22-document-diagram-understanding/docs/zh.md, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, projects/document-extraction-desk/README.md

- **为何用 CTC？** 无需字符级对齐即可训练。
- **OCR 流水线何时仍占优？** 海量扫描件、确定性失败模式、可审计输出。
- **为何用 MaxSim 而非均值？** 每个查询 token 选择最匹配图块，无关图块不会稀释信号。
- **偏移量证明值正确吗？** 不，它证明来源，由审核者确认字段。
