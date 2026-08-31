---
name: find-your-level
version: 1.0.0
description: >
  交互式测验，将你的 AI/ML 知识映射到 523 节课、20 个阶段的 AI Engineering from Scratch 课程起点。
  触发短语：“我应该从哪里开始”、“帮我定位水平”、“我懂什么”、“哪个阶段”、
  “评估我的知识”、“分级测试”、“跳过前面内容”，或 "where should I start", "find my level",
  "what do I know", "which phase", "assess my knowledge", "placement test", "skip ahead"
tags: [assessment, onboarding, curriculum, ai-engineering]
---

# 找到你的水平

你正在为 **AI Engineering from Scratch** 课程（20 个阶段、523 节课）进行分级测验。你的任务是找出学习者应从哪里开始，让他们跳过已掌握的材料，恰好从有挑战的地方起步。适用于任何 agent。

## 测验结构

共有 5 个知识领域，每个领域 2 道题，共 10 题。每轮展示 2 道题（每个领域一轮）。学习者答完一轮的两题后，为该领域评分再进入下一轮。

## 评分

每题 1 分（0 = 错误或空白，1 = 正确）。每个领域得分 0-2。总分范围为 0-10。

## 进行测验

先简短问候学习者，随即进入第 1 轮。环境有结构化问题/选项工具时，每题都使用它；否则用纯文本展示带字母的选项并等待回复。每轮后，先告知该领域得分（例如“数学与统计：2/2”）再进入下一轮。说明保持简短。所有答案解释都留到最后。

### 答案隔离

答案键特意存放在本测验正文之外的 `references/answer-key.md`。学习者提交当前轮两题答案之前，不要读取该引用。之后只读取当前轮的答案键、进行评分，并在五轮全部完成前保持解释私密。不要预加载后续轮次。

回复格式示例中绝不放入真实答案字母、可能答案或答案分布。纯文本时必须严格使用中性提示：`请按此格式回复：Q1: <letter>, Q2: <letter>。`替换当前题号，但两个值均保留为 `<letter>`。

---

### 第 1 轮 —— 数学与统计

**Q1.** 有两个向量，a = [1, 2, 3] 和 b = [4, 5, 6]。它们的点积是多少？

- A) 32
- B) 21
- C) 15
- D) 27

**Q2.** 一枚公平硬币抛掷 3 次。恰好出现 2 次正面的概率是多少？

- A) 1/4
- B) 1/2
- C) 1/8
- D) 3/8

---

### 第 2 轮 —— 经典机器学习

**Q3.** 在一个含 90% 负样本和 10% 正样本的分类任务中，模型把所有样本都预测为负类。它的准确率是多少？

- A) 50%
- B) 90%
- C) 10%
- D) 0%

**Q4.** 下列哪一项是 Random Forest 的超参数？

- A) 学得的划分阈值
- B) 叶节点预测值
- C) 树的数量
- D) 每个节点的 Gini impurity

---

### 第 3 轮 —— 深度学习

**Q5.** 在反向传播中，链式法则计算什么？

- A) 每个可训练权重的损失梯度
- B) 当前优化器的最佳学习率
- C) 网络所需层数的精确值
- D) 每个训练步骤使用的 batch size

**Q6.** ResNet 中的 residual connections（skip connections）主要解决什么问题？

- A) 小型训练数据集上的泛化不佳
- B) 从持久化存储加载 batch 很慢
- C) 模型推理时 activation memory 很高
- D) 在极深网络中的 gradient flow 太弱

---

### 第 4 轮 —— NLP 与 Transformer

**Q7.** 在 Transformer 架构中，attention mechanism 在什么之间计算？

- A) 像素和标签
- B) 仅 Encoder 和 Decoder
- C) Queries、Keys 和 Values
- D) 仅 Embeddings 和 positions

**Q8.** 使用 LoRA（Low-Rank Adaptation）微调大型语言模型的主要益处是什么？

- A) 从全新随机初始化开始，重新训练基础模型中的每一个参数
- B) 冻结基础模型权重，只训练低秩 adapters
- C) 无需带标签的示例或任务专属训练数据
- D) 复制模型层以提高适应容量

---

### 第 5 轮 —— 应用 AI

**Q9.** 在 RAG（Retrieval-Augmented Generation）系统中，LLM 生成答案之前会发生什么？

- A) 检索相关文档并加入模型 prompt
- B) 针对用户当前问题完整重新训练模型
- C) 用户在每次模型请求前选择所有上下文段落
- D) 模型只搜索预训练参数值

**Q10.** 在多 agent 系统中，“coordinator” 或 “orchestrator” agent 的首要职责是什么？

- A) 用一个通用模型替换所有专用 agent
- B) 分派任务、路由消息并协调其他 agent
- C) 最大化每次 agent 交互的 token 用量
- D) 为系统故障准备一份完全相同的备用模型

---

## 五轮全部完成后

展示领域拆分和总分：

```text
数学与统计：           X/2
经典机器学习：         X/2
深度学习：             X/2
NLP 与 Transformer：   X/2
应用 AI：              X/2
----------------------------
总分：                 X/10
```

## 分数到起点的映射

| 总分 | 起点 | 含义 |
|-------------|-------------|---------------|
| 0-3 | 阶段 1：数学基础 | 从基础开始 |
| 4-5 | 阶段 3：深度学习核心 | 已有数学和 ML 基础 |
| 6-7 | 阶段 7：Transformer 深入剖析 | 已懂 DL，该学习 transformer 了 |
| 8-9 | 阶段 11：LLM 工程 | 基础扎实，可直接进入 LLM 应用 |
| 10 | 阶段 14：Agent 工程 | 你全都会，开始构建 agent |

## 个性化学习路径

揭示起点后，生成覆盖全部 20 个阶段的 markdown 表格。用分数决定每阶段状态。起点之前的阶段标记为 `Skip`（学习者已掌握材料）；起点及之后标记为 `Do`。如果学习者在对应可跳过阶段的领域得分为 1/2，则该阶段标记为 `Review` 而不是 `Skip`。

用于检测复习项的领域到阶段映射：
- 数学与统计（1/2） -> 将阶段 1 标为 `Review`
- 经典机器学习（1/2） -> 将阶段 2 标为 `Review`
- 深度学习（1/2） -> 将阶段 3 标为 `Review`
- NLP 与 Transformer（1/2） -> 将阶段 5 和 7 标为 `Review`
- 应用 AI（1/2） -> 将阶段 14 标为 `Review`

从 ROADMAP.md 读取时间估算（规范唯一事实来源）。每个阶段标题都以 `(~N hours)` 格式包含预计小时数。解析这些值，不能使用硬编码数字，以便学习路径始终随路线图估算更新。仓库未在本地克隆时，从下面地址获取：
`https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/ROADMAP.md`。

## 输出格式

按此格式生成表格：

```markdown
| Phase | Name | Status | Est. Hours |
|-------|------|--------|------------|
| 0 | Setup & Tooling | Skip | -- |
| 1 | Math Foundations | Review | 30 |
| 2 | ML Fundamentals | Skip | -- |
| 3 | Deep Learning Core | Do | 20 |
| ... | ... | ... | ... |
```

表格规则：
- `Skip` 阶段的小时数显示 `--`（不计入总数）。
- `Review` 阶段显示完整小时数（学习者应快速复习）。
- `Do` 阶段显示完整小时数。
- 阶段 0（环境设置与工具）无论得分如何都始终为 `Skip`（它是工具设置，不是知识）。
- 汇总 `Review` 与 `Do` 阶段的小时数，并在底部展示总计。

表格后添加一句总时长：`你的个性化路径：约 X 小时，覆盖 Y 个阶段。`

接着给出简短建议：从哪一阶段开始，以及基于最弱领域应首先关注什么。

最后给出下一步：`/start-learning` 会把此次定位保存到持久化的 `LEARNING.md` 学习计划，`/learn` 会开始交互式教授第一课。
