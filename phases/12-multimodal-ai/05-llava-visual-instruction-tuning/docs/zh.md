# LLaVA 与视觉指令微调

> LLaVA（2023 年 4 月）是这个星球上被抄得最多的多模态架构。它用一个 2 层 MLP 换掉了 BLIP-2 的 Q-Former，用朴素的 token 拼接换掉了 Flamingo 的门控交叉注意力，并在 15.8 万轮视觉指令上训练——这些指令是 GPT-4 从纯文本 caption 里生成的。2023 到 2026 年间搭过 VLM 的任何从业者，搭的都是某个 LLaVA 变体。LLaVA-1.5 加了 AnyRes。LLaVA-NeXT 提了分辨率。LLaVA-OneVision 用一套配方统一了图像、多图、视频。本节课通读这套配方，实现投影器，并解释为什么"更简单的赢了"。

**类型：** Build
**语言：** Python（标准库，投影器 + 指令模板构建器）
**前置要求：** Phase 12 · 02（CLIP）、Phase 11（LLM 工程——指令微调）
**预计时间：** ~180 分钟

## 学习目标

- 搭一个 2 层 MLP 投影器，把 ViT patch 嵌入（维度 1024）映射到 LLM 的嵌入维度（维度 4096）。
- 走一遍 LLaVA 两阶段配方：(1) 在 55.8 万对 caption 上做投影器对齐，(2) 在 15.8 万轮 GPT-4 生成的对话上做视觉指令微调。
- 用图像 token 占位符、系统 prompt 和 user/assistant 轮次构造一个 LLaVA 格式的 prompt。
- 解释为什么尽管 Q-Former 在 token 预算上占优，社区还是从 Q-Former 转向了 MLP。

## 问题背景

BLIP-2 的 Q-Former（第 12.03 课）把一张图压缩成 32 个 token。干净、高效、刷榜好用。但它有两个问题。

第一，Q-Former 可训练，但它的损失不是最终任务。阶段 1 训 ITC+ITM+ITG。阶段 2 训 LM 损失。query 学到的是某种中间表示，之后 LLM 还得去解码它。信息在瓶颈处丢失。

第二，Q-Former 占 188M 参数，而在 LLaVA 那个 2023 年的规模上，你得和你的目标 LLM 协同设计它。换 LLM，重训 Q-Former。换视觉编码器，重训。每种组合都是一个独立的研发项目。

LLaVA 的答案简单到令人难堪：拿 ViT 的 576 个 patch token，每个过一个 2 层 MLP（`1024 → 4096 → 4096`），把全部 576 个倒进 LLM 的输入序列。没有瓶颈。没有在奇怪目标上做阶段 1 预训练。就直接拿一个 LM 损失训这个 MLP。

数据从哪来？LLaVA 的第二个洞见：用 GPT-4（纯文本）来生成指令数据。把一张图的 COCO caption 和边界框数据喂给 GPT-4，让它产出对话、描述和复杂推理问题。15.8 万轮指令-回应免费到手。没有人工标注。

结果是：一个在 8 张 A100 上跑一天的 VLM，在 MMMU 上打败了 Flamingo，并出货了一个社区能扩展的开放 checkpoint。到 2023 年底，它已经衍生出 50+ 个分叉。

## 核心概念

### 架构

13B 的 LLaVA-1.5：
- 视觉编码器：CLIP ViT-L/14 @ 336（阶段 1 冻结，阶段 2 可选解冻）。
- 投影器：带 GELU 激活的 2 层 MLP，`1024 → 4096 → 4096`。
- LLM：Vicuna-13B（后来是 Llama-3.1-8B）。

图像 + 文本 prompt 的前向：

```
img -> ViT -> 576 patches of dim 1024
patches -> MLP -> 576 tokens of dim 4096
prompt: system + "<image>" placeholder + user question
replace <image> token with the 576 projected tokens
feed the full sequence to the LLM
decode response
```

图像占 LLM 上下文的 576 个 token。在 2048 上下文下，留给文本 1472 个。在 32k 上下文下，这就是个舍入误差。

### 阶段 1：投影器对齐

冻结 ViT。冻结 LLM。只训那个 2 层 MLP。数据集：55.8 万图文对（LAION-CC-SBU）。损失：以投影后的图像 token 为条件，对 caption 做语言建模。

batch 128 跑单个 epoch，几小时就能搞定。投影器学会把 ViT 空间映射到 LLM 空间。无任务专属监督。

### 阶段 2：视觉指令微调

解冻投影器（仍可训）。解冻 LLM（通常全量，有时 LoRA）。在 15.8 万轮视觉指令上训练。

指令数据是关键戏法。Liu 等人这么生成它：
1. 拿一张 COCO 图。
2. 抽出文本描述（5 条人工 caption + 边界框列表）。
3. 用三个 prompt 模板发给 GPT-4：
   - 对话："就这张图生成一段用户和助手一来一回的对话。"
   - 详细描述："给出对这张图丰富、详细的描述。"
   - 复杂推理："提一个需要对这张图推理才能答的问题，然后回答它。"
4. 把 GPT-4 的输出解析成 (指令, 回应) 对。

这一切都不直接碰图像——只碰文本描述。GPT-4 会幻觉出看似合理的图像内容。有些噪声，但它成了：15.8 万轮足以解锁对话能力。

### 社区为什么抄了这套

- 没有阶段 1 专属损失要调。从头到尾都是 LM 损失。
- 投影器训练以小时计，而非天计。
- 只需重训投影器，LLM 就能换（LLaVA-Llama2、LLaVA-Mistral、LLaVA-Llama3）。
- 视觉指令数据流水线用 GPT-4，为新领域重新生成很便宜。

### LLaVA-1.5 与 LLaVA-NeXT

LLaVA-1.5（2023 年 10 月）新增：
- 把学术任务数据（VQA、OKVQA、RefCOCO）混进指令微调。
- 更好的系统 prompt。
- 2048 → 32k 上下文。

LLaVA-NeXT（2024 年 1 月）新增：
- AnyRes：把高分辨率图切成 2x2 或 1x3 的 336x336 裁块网格，外加一张全局低分辨率缩略图。每个裁块成为 576 个 token；每张图共约 2880 个视觉 token。OCR 和图表任务大涨。
- 用 ShareGPT4V（高质量 GPT-4V caption）改善了指令数据配比。
- 更强的基座 LLM（Mistral-7B、Yi-34B）。

### LLaVA-OneVision

第 12.08 课深入讲 OneVision。简短版：同样的投影器，但用一套覆盖单图、多图、视频的课程来训，单个模型共享视觉 token 预算。

### 与 Q-Former 的对比

| | Q-Former（BLIP-2） | MLP（LLaVA） |
|---|---|---|
| 每张图的视觉 token | 32 | 576（基础）或 2880（AnyRes） |
| 可训参数 | 188M + LM | 40M + LM |
| 阶段 1 损失 | ITC+ITM+ITG | 仅 LM |
| LLM 即插即换 | 需重训 | 极少量重训即可换 |
| 多图 | 别扭 | 自然（拼接） |
| 视频 | 别扭 | 自然（逐帧拼接） |
| token 预算 | 小 | 大 |

MLP 在简单性和 token 灵活性上赢。Q-Former 在 token 预算上赢。到 2023 年底，token 预算不再是约束瓶颈（LLM 上下文涨到了 32k-128k+），于是简单性占了上风。

### prompt 格式

```
A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the human's questions. USER: <image> Describe this image in detail. ASSISTANT: The image shows ...
```

`<image>` 是个占位 token。分词之前，它被替换成 576 个视觉 token（AnyRes 下是 2880 个）。分词器看到的序列比它训练时略长，但 LLM 能处理这种新输入，因为阶段 1 教过它。

### 参数经济学

LLaVA-1.5-7B 拆解：
- CLIP ViT-L/14 @ 336：303M（阶段 1 冻结，阶段 2 常解冻）。
- 投影器（2 个线性层）：约 22M 可训。
- Llama-7B：7B。
- 总计：7.3B 参数。阶段 2 可训部分：完整 7B + 22M 投影器。

阶段 2 训练成本：8xA100 上约 20 小时。这是关键数字——一天、一个节点、可复现。这就是 LLaVA 扩散开来的原因。

```figure
mm-llava-projector
```

## 实际使用

`code/main.py` 实现了：

1. 纯 Python 的 2 层 MLP 投影器（玩具规模下 维度 16 → 32 → 32）。
2. prompt 构建流水线：系统 prompt + `<image>` 替换成 N 个投影 token + 用户轮次 + 助手生成占位符。
3. 一个可视化器，展示 576-token 的视觉块在 LLM 上下文里长什么样（占 2k / 32k / 128k 上下文的百分比）。

## 拿去用

本节课产出 `outputs/skill-llava-vibes-eval.md`。给定一个 LLaVA 家族的 checkpoint，它跑一个 10-prompt 的氛围评测套件（3 个看图说话、3 个 VQA、2 个推理、2 个拒答），输出一张人可读的记分卡。这不是基准；是个冒烟测试，用来确认投影器和 LLM 接得好不好。

## 练习

1. 算一下 `1024 → 4096 → 4096` 这个 2 层 MLP 投影器的可训参数量。带 GELU 和偏置时，它占 LLaVA-13B 的多少？

2. 为一个"拒答"案例构造一个 LLaVA prompt——图里有一个私人个体。写出预期的助手回应。LLaVA 为什么应当零样本拒答这个，以及要强化这种拒答需要什么训练数据？

3. 读 LLaVA-NeXT 博客的 AnyRes 部分。算一张 1344x672 的图在 AnyRes 下的视觉 token 数。和 336x336 下的基础 576 token 作比较。

4. LLaVA 阶段 1 的投影器是在 caption 上用 LM 损失训的。如果你跳过阶段 1 直接进阶段 2（视觉指令微调）会怎样？引用 Prismatic VLMs 的消融实验（arXiv:2402.07865）作答。

5. LLaVA-Instruct-150k 用 GPT-4 配 COCO caption 生成指令。为一个新领域（医学 X 光、卫星影像），描述生成领域指令的四步数据流水线。每一步可能出什么岔子？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|----------------|------------------------|
| 投影器 | "MLP 桥" | 带 GELU 的 2 层 MLP，把 ViT 维度映射到 LLM 维度 |
| 图像 token | "<image> 占位符" | 推理前被替换成 N 个投影视觉 token 的 prompt 标记 |
| 视觉指令微调 | "LLaVA 阶段 2" | 在 GPT-4 生成的 (图像, 指令, 回应) 三元组上训练 |
| 阶段 1 对齐 | "投影器预训练" | 冻结 ViT 和 LLM，用 caption 上的 LM 损失训投影器 |
| AnyRes | "多裁块拼贴" | 把高分辨率图切成裁块网格，拼接每块的视觉 token |
| LLaVA-Instruct | "GPT-4 生成" | 从 COCO caption + GPT-4 合成的 15.8 万对指令-回应 |
| 视觉编码器冻结 | "骨干锁定" | CLIP 权重在阶段 1 不更新，有时阶段 2 也不更新 |
| ShareGPT4V | "更好的 caption" | GPT-4V 生成的 100 万条密集 caption，用于更高质量的对齐 |
| VQA | "视觉问答" | 就一张图回答自由形式问题的任务 |
| Prismatic VLMs | "设计空间论文" | Karamcheti 2024 的消融实验，系统测试投影器和数据选择 |

## 延伸阅读

- [Liu et al. — Visual Instruction Tuning (arXiv:2304.08485)](https://arxiv.org/abs/2304.08485) —— LLaVA 论文。
- [Liu et al. — Improved Baselines with Visual Instruction Tuning (arXiv:2310.03744)](https://arxiv.org/abs/2310.03744) —— LLaVA-1.5。
- [Chen et al. — ShareGPT4V (arXiv:2311.12793)](https://arxiv.org/abs/2311.12793) —— 密集 caption 数据集。
- [Karamcheti et al. — Prismatic VLMs (arXiv:2402.07865)](https://arxiv.org/abs/2402.07865) —— 设计空间消融。
- [Li et al. — LLaVA-OneVision (arXiv:2408.03326)](https://arxiv.org/abs/2408.03326) —— 统一单图、多图、视频。
