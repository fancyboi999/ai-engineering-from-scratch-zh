---
id: multimodal-rag
title: 多模态与视觉原生 RAG
code: MV
subtitle: 嵌入页面图像，用 MaxSim 评分，融合模态并引用证据区域。代码来自课程的 Python 与 TypeScript 实现。
hue: 285
sources: phases/12-multimodal-ai/23-colpali-vision-native-rag, phases/12-multimodal-ai/24-multimodal-rag-cross-modal, phases/19-capstone-projects/04-multimodal-document-qa, projects/visual-evidence-library
source_hash: b85cd8d412d94a80
---

## 视觉优先的文档问答流水线
type: architecture
from: phases/19-capstone-projects/04-multimodal-document-qa/docs/zh.md

```arch
node | pdf | 1,1 | PDF | 页面渲染器，180 DPI | client
node | emb | 2,1 | ColQwen2.5-v0.2 | 每页约 2048 个图块 | model
node | prune | 3,1 | DocPruner | 压缩 50% | process
node | idx | 4,1 | 多向量索引 | Vespa 或 Qdrant | store
node | query | 1,2 | 查询 | token 嵌入 | client
node | ret | 2,2 | 检索 top-k | MaxSim | process
node | vlm | 3,2 | VLM 回答器 | 查询 + 页面图像 | model
node | view | 4,2 | 查看器 | 在源页面上画框 | client
edge | pdf | emb | 页面图像
edge | emb | prune | 图块
edge | prune | idx |
edge | query | ret |
edge | idx | ret | MaxSim
edge | ret | vlm | top-k 页面
edge | vlm | view | 引用页面与区域
```

## 代码任务
type: task-table
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/code/main.py, phases/19-capstone-projects/04-multimodal-document-qa/code/main.py, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/code/main.py, projects/visual-evidence-library/solution/main.py

| 任务 | 代码 |
|---|---|
| 给一个页面评分 | `maxsim(query_tokens, patches)` |
| 对示例页面排名 | `retrieve(query, pages, k=3)` |
| 裁剪图块 | `doc_prune(patches, keep_fraction=0.5)` |
| 建立带裁剪的索引 | `build_index(prune=True)` |
| 融合三种模态 | `fuse([t, i, a], [0.3, 0.4, 0.3])` |
| 低置信度时重试 | `agentic_loop(query, confidence_floor=0.8)` |
| 检查清单 | `validate_manifest(manifest, root)` |
| 搜索文本区域 | `search(assets, query, limit=20)` |

## 运行课程与项目
type: command-table
from: phases/19-capstone-projects/04-multimodal-document-qa/code/main.py, phases/19-capstone-projects/04-multimodal-document-qa/code/ts/README.md, phases/19-capstone-projects/04-multimodal-document-qa/code/ts/package.json, projects/visual-evidence-library/README.md
span: 2

| 命令 | 作用 |
|---|---|
| `python main.py` | 综合项目 MaxSim 骨架与裁剪消融实验 |
| `npm start` | 用 `--demo` 通过查看器自检，退出码为 0 |
| `npm run serve` | 在 127.0.0.1 启动 HTTP 查看器。未设置 `PORT` 时选择空闲端口 |
| `npm test` | 测试夹具、HTML 转义与路由 |
| `python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library` | 创建尚未完成的工作区 |
| `python3 scripts/project_test.py visual-evidence-library --stage 1 --path my-visual-evidence-library` | 对阶段 1 评分 |
| `python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output` | 写入 index.html 与 evidence.json |
| `python3 demo.py` | 在原始夹具上运行搜索 |

## MaxSim 后期交互
type: annotated-code
lang: python
from: phases/19-capstone-projects/04-multimodal-document-qa/code/main.py

```python
def max_sim_score(query_tokens, doc_patches):
    total = 0.0
    for q in query_tokens:            # 每个查询 token 一个向量
        best = -1e9
        for p in doc_patches:         # 页面上的每个图块
            s = dot(q, p)
            if s > best:
                best = s
        total += best                 # 将各 token 的最佳匹配相加
    return total
idx = build_index(prune=True)         # DocPruner 保留 50% 的图块
hits = idx.retrieve(q, k=3)           # (Page, score) 列表
```

## 分数融合与 agent 式重试
type: flow
from: phases/12-multimodal-ai/24-multimodal-rag-cross-modal/code/main.py, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/docs/zh.md

1. **分解**：“安静”交给音频，“纯素早午餐”交给文本，“自然光”交给图像。
2. **text_retrieve**：评论文本中的关键词命中数除以关键词总数。
3. **image_retrieve**：将查询线索映射为 `natural_light` 和 `airy` 等标签。
4. **audio_retrieve**：“安静”对应 `1.0 - r.ambient_db / 80.0`，否则为 0.5。
5. **fuse**：按 0.3、0.4、0.3 加权求和，`top_k` 保留 3 项。
6. **检查**：最高分低于 `confidence_floor` 时，添加“ bright windows low noise”。
7. **第 2 轮**：用 0.3、0.5、0.2 权重再次融合。
8. **grounded_generate**：每项命中引用评论、图像标签和环境分贝。

## 方案对比
type: comparison
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md

| 比较项 | ColPali | VisRAG | Text-RAG |
|---|---|---|---|
| 页面向量 | $N_p$ 个图块向量 | 一个池化向量 | 每个分块一个向量 |
| 评分 | MaxSim | 双编码器 | 分块余弦相似度 |
| OCR 步骤 | 无 | 无 | OCR / pdftotext |
| 存储 | PQ 压缩后约为 text-RAG 的 15 倍 | 较小 | 每 50 个分块约 150 kB |
| 召回 | 强 | 较弱 | 丢失图表与表格 |
| 适用重点 | 质量 | 规模 | 纯文本文档 |

## 按场景选择
type: tips
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/docs/zh.md

- 财报、论文、合同和医疗记录使用 ColPali 或 ColQwen2。
- 索引速度和存储比召回更重要时，使用 VisRAG。
- Wiki 文章、聊天日志和数百万页档案使用 text-RAG。
- 法规要求可提取的 OCR 文本时，使用 text-RAG。
- 文本与图像使用 CLIP 或 SigLIP 2，文本与音频使用 CLAP。
- 先用分数融合。A/B 测试显示明显收益后，再升级到 MoE 融合。

## 公式与数值
type: concepts
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, phases/19-capstone-projects/04-multimodal-document-qa/docs/zh.md

- **MaxSim**：对查询 token 和页面图块计算 $\sum_i \max_j \cos(q_i, p_j)$。
- **ColPali 存储**：50 * 729 * 128 * 4 字节，原始约 18 MB，8 倍 PQ 压缩后约 2.3 MB。
- **Text-RAG 存储**：50 个分块 * 768 维 * 4 字节，约 150 kB。
- **PQ**：存储缩小约 8 倍，并保留向量相似性。
- **ViDoRe**：ColPali-v1 的 nDCG@5 约为 80%，Text-RAG 约为 50-60%。
- **ColQwen 页面**：约 2048 个 128 维图块嵌入。
- **DocPruner**：压缩 50%，准确率损失 < 0.5%。
- **综合项目目标**：10k 页，向 VLM 提供前 5 页，回答耗时低于 2s。

## 默认值
type: defaults
from: phases/19-capstone-projects/04-multimodal-document-qa/code/main.py, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/code/main.py, projects/visual-evidence-library/solution/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `EMB_DIM` | 16 | 综合项目中的模拟图块向量 |
| `keep_fraction` | 0.5 | `doc_prune` 至少保留 1 个图块 |
| 检索 k | 5 | 按 MaxSim 排名最高的页面 |
| `confidence_floor` | 0.8 | `main` 传入 0.7 |
| `search` 上限 | 20 | 必须在 1 到 100 之间 |
| `--query` | seed return | 证据库 CLI |
| `--model` | local-vision-model | 与 `--vision-image` 一起使用 |
| `--out` | visual-output | 包含 index.html 和 evidence.json |

## 清单与提案错误
type: troubleshooting
from: projects/visual-evidence-library/solution/main.py, projects/visual-evidence-library/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Asset IDs must be nonempty and unique | `id` 为空或重复 | 为每个资源分配唯一 id |
| Image dimensions must be positive integers at most 20000 | `width` 或 `height` 无效 | 声明整数像素尺寸 |
| Asset must be an image inside the manifest directory | 路径越过根目录或后缀错误 | 使用根目录内的 .svg、.png、.jpg 或 .jpeg |
| Asset exceeds 5 MB | 文件过大 | 缩小图像 |
| Bounding box lies outside the declared image dimensions | x + w 或 y + h 过大 | 修正 `bbox` |
| Model-proposed text needs explicit review before indexing | `reviewed` 不为 true | 检查图像，再设置 reviewed=true |
| Vision extraction requires --provider-url, --width and --height | 缺少标志 | 传入全部三个标志 |
| Image bytes do not match the extension | PNG 或 JPEG 魔数不匹配 | 使用正确扩展名 |

## 缩写
type: glossary
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/docs/zh.md, phases/19-capstone-projects/04-multimodal-document-qa/docs/zh.md

- **MaxSim**：每个查询 token 的最大相似度，再对整个查询求和。
- **ViDoRe**：视觉文档检索评估，指标为 nDCG@5。
- **PQ / OPQ**：乘积量化，压缩图块向量。
- **VisRAG**：用 VLM 将每页池化为一个向量。
- **M3DocRAG**：跨文档检索页面，支持多页推理。
- **MoE 融合**：门控网络路由到各模态专家。
- **MuRAG**：2022 年开启多模态 RAG 研究的论文。
- **证据区域**：源页面上对应答案区间的 bbox。

## 问答
type: qa
from: phases/12-multimodal-ai/23-colpali-vision-native-rag/code/main.py, phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/zh.md, phases/12-multimodal-ai/24-multimodal-rag-cross-modal/docs/zh.md, projects/visual-evidence-library/README.md

- **为何用 MaxSim 而不是平均相似度？** 无关图块会稀释均值。
- **如何引用混合来源？** 文本用 `[1]`，图像用 `[img 3]`，音频用 `[audio 2 at 0:34]`。
- **如何评估跨模态 RAG？** 分别测量各模态 Recall@k 和融合后的 top-k 准确率。
- **证据库会做 OCR 吗？** 不会。它索引提供的文本矩形区域。
- **什么是查询覆盖率？** 匹配词数除以查询词数，不代表置信度。
