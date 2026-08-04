# 文档与图表理解

> 文档不是照片。一份 PDF、科学论文、发票或手填表单，有版面、表格、图示、脚注、页眉和语义结构，是纯图像理解捕捉不到的。VLM 之前的栈是一条流水线：Tesseract OCR + LayoutLMv3 + 表格抽取启发式。VLM 浪潮用免 OCR 模型替换了它——Donut（2022）、Nougat（2023）、DocLLM（2023）——它们直接吐出结构化标记。到 2026 年，前沿就只是"把页面图像以原生 2576px 喂给 Claude Opus 4.7"，结构化标记输出免费送上。本节课通读文档 AI 的三时代弧线。

**类型：** Build
**语言：** Python（标准库，版面感知文档解析器骨架）
**前置要求：** Phase 12 · 05（LLaVA）、Phase 5（NLP）
**预计时间：** ~180 分钟

## 学习目标

- 解释文档 AI 的三个时代：OCR 流水线、免 OCR、VLM 原生。
- 描述 LayoutLMv3 的三条输入流：文本、版面（bbox）、图像 patch，配统一掩码。
- 比较 Donut（免 OCR，图像 → 标记）、Nougat（科学论文 → LaTeX）、DocLLM（版面感知生成式）、PaliGemma 2（VLM 原生）。
- 为新任务挑一个文档模型（发票、科学论文、手填表单、中文收据）。

## 问题背景

"理解这份 PDF"难得有点骗人。信息坐落在：

- 文本内容（信号的 90%）。
- 版面（页眉、脚注、侧栏、双栏格式）。
- 表格（行、列、合并单元格）。
- 图与图示。
- 手写标注。
- 字体与排版（标题 vs 正文）。

原始 OCR 倒出文本、丢掉其余。一个在乎发票的系统需要知道"Total: $1,245"来自右下角，不是来自脚注。

## 核心概念

### 时代 1 —— OCR 流水线（2021 年前）

经典栈：

1. PDF → 每页一张图。
2. Tesseract（或商业 OCR）抽出文本，带逐词边界框。
3. 版面分析器识别块（页眉、表格、段落）。
4. 表格结构识别器解析表格。
5. 领域规则 + 正则抽出字段。

对干净印刷文本能用。在手写、倾斜扫描、复杂表格、非英语脚本上崩。每种失败模式都要一条定制的异常路径。

### TrOCR（2021）

TrOCR（Li 等人，arXiv:2109.10282）用一个 transformer 编码器-解码器替换了 Tesseract 的经典 CNN-CTC，在合成 + 真实文本图像上训练。在手写和多语言文本上是一记干净的胜利。仍是流水线（检测器再 TrOCR 再版面），但 OCR 步骤大幅改善。

### 时代 2 —— 免 OCR（2022-2023）

第一批免 OCR 模型说：完全跳过检测，把图像像素直接映射到结构化输出。

Donut（Kim 等人，arXiv:2111.15664）：
- 编码器-解码器 transformer，编码器是 Swin-B。
- 输出是表单理解的 JSON、摘要的 markdown，或任何任务专属 schema。
- 无 OCR、无版面、无检测。

Nougat（Blecher 等人，arXiv:2308.13418）：
- 专门在科学论文上训练。
- 输出是 LaTeX / markdown。
- 处理公式、多栏版面、图。
- 是每个 arXiv 解析器都会调的模型。

它们是专家，不是通才。Donut 在科学论文上失败；Nougat 在发票上失败。

### LayoutLMv3（2022）

另一条赛道。LayoutLMv3（Huang 等人，arXiv:2204.08387）保留 OCR 但加入版面理解：

- 三条输入流：OCR 文本 token、逐 token 二维边界框、图像 patch。
- 跨全部三种模态的掩码训练目标（掩文本、掩 patch、掩版面）。
- 下游：分类、实体抽取、表格 QA。

LayoutLMv3 是基于 OCR 的文档理解的巅峰。在表单和发票上强。需要上游 OCR。在标准化文档基准上有 VLM 之前最好的准确率。

### DocLLM（2023）

DocLLM（Wang 等人，arXiv:2401.00908）是 LayoutLM 的生成式兄弟。以版面 token 为条件生成自由形式答案。在文档 QA 上更好；仍依赖 OCR 输入。

### 时代 3 —— VLM 原生（2024+）

2024 年的 VLM 好到足以彻底取代流水线。把整页图像以高分辨率喂给 VLM，问问题，得答案。

- LLaVA-NeXT 336-tile AnyRes 对小文档能用。
- Qwen2.5-VL 动态分辨率原生处理 2048+ 像素。
- Claude Opus 4.7 支持 2576px 文档。
- PaliGemma 2（2025 年 4 月）专为文档 + 手写训练。

VLM 原生与 OCR 流水线之间的差距迅速缩小。到 2026 年，VLM 原生在以下方面取胜：

- 场景文本（手写 + 印刷、混合脚本）。
- 带合并单元格的复杂表格。
- 嵌在文本里的数学公式。
- 带文本标注的图。

OCR 流水线仍在以下方面取胜：

- 海量规模、每页延迟要紧的纯扫描工作负载。
- 流水线可靠性（确定性失败 vs VLM 幻觉）。
- 需要可审计 OCR 输出的受监管环境。

### Claude 4.7 / GPT-5 前沿

在 2576 像素原生输入下，前沿 VLM 以接近人类的准确率做文档理解。2026 年初的基准数字：

- DocVQA：Claude 4.7 约 95.1，PaliGemma 2 约 88.4，Nougat 约 77.3，流水线化的 LayoutLMv3 约 83。
- ChartQA：Claude 4.7 约 92.2，GPT-4V 约 78。
- VisualMRC：Claude 4.7 约 94。

闭源模型的差距主要是分辨率和基座 LLM 规模。7B 的开放模型落后几分，但在追赶。

### 数学公式与 LaTeX 输出

科学论文需要公式的精确 LaTeX 输出。Nougat 是在这上面训的。用 LaTeX 目标训练的 VLM（Qwen2.5-VL-Math、Nougat 衍生品）产出可用的 LaTeX。没有显式 LaTeX 训练时，VLM 产出可读但不精确的转录。

2026 年的科学论文流水线：先在 PDF 上链 Nougat，再对棘手页面用 VLM。

### 手写

仍是最难的子任务。混合印刷 + 手写（医生笔记、填好的表单）是 OCR 流水线在成本上仍胜过 VLM 的地方。纯手写 VLM 在改善（Claude 4.7、PaliGemma 2）。

### 2026 配方

为一个新文档 AI 项目：

- 海量纯印刷发票：LayoutLMv3 + 规则，成本高效。
- 混合文档（科学 + 手写 + 表单）：VLM 原生（PaliGemma 2 或 Qwen2.5-VL）。
- 全 arXiv 摄入：数学用 Nougat，图用 VLM。
- 监管场景：OCR 流水线 + VLM 验证器交叉核对。

```figure
mm-doc-layout
```

## 实际使用

`code/main.py`：

- 一个玩具版面感知分词器：给定 (文本, bbox) 对，产出 LayoutLMv3 式输入。
- 一个 Donut 式任务 schema 生成器：表单的 JSON 模板。
- 一份跨 OCR 流水线、Donut、Nougat、VLM 原生的每页 token 预算对比。

## 拿去用

本节课产出 `outputs/skill-document-ai-stack-picker.md`。给定一个文档 AI 项目（领域、规模、质量、监管），它在 OCR 流水线、免 OCR 专家、VLM 原生之间挑选。

## 练习

1. 你的项目是每天 1000 万张发票。哪个栈在不损失准确率的前提下让每页成本最小？

2. 为什么 LayoutLMv3 在表单 QA 上胜过纯 CLIP-VLM、却在场景文本上不及？bbox 流放弃了什么？

3. Nougat 生成 LaTeX。提出一个 VLM 原生输出在 LaTeX 保真度上胜过 Nougat 的测试用例，以及一个 Nougat 取胜的用例。

4. 读 PaliGemma 2 论文（Google，2024）。相对 PaliGemma 1，抬升文档准确率的关键训练数据补充是什么？

5. 设计一个监管安全的混合方案：OCR 流水线为主，VLM 为副交叉核对。你怎么解决分歧？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| OCR 流水线 | "Tesseract 式" | 分阶段的栈：检测 -> OCR -> 版面 -> 规则；确定性，脆弱 |
| 免 OCR | "Donut 式" | 跳过显式 OCR 的图像到输出 transformer；单个模型 |
| 版面感知 | "LayoutLM" | 输入包含逐 token 的 bbox 坐标；跨模态统一掩码 |
| VLM 原生 | "前沿 VLM" | 把页面图像以高分辨率直接喂给 Claude/GPT/Qwen VLM；无流水线 |
| DocVQA | "文档基准" | 文档 VQA 标准；最常被引用的分数 |
| 标记输出 | "LaTeX / MD" | 替代自由形式文本的结构化输出格式；使下游自动化成为可能 |

## 延伸阅读

- [Li et al. — TrOCR (arXiv:2109.10282)](https://arxiv.org/abs/2109.10282)
- [Blecher et al. — Nougat (arXiv:2308.13418)](https://arxiv.org/abs/2308.13418)
- [Huang et al. — LayoutLMv3 (arXiv:2204.08387)](https://arxiv.org/abs/2204.08387)
- [Kim et al. — Donut (arXiv:2111.15664)](https://arxiv.org/abs/2111.15664)
- [Wang et al. — DocLLM (arXiv:2401.00908)](https://arxiv.org/abs/2401.00908)
