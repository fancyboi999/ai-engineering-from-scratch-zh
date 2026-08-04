# 顶点项目 17 —— 个人 AI 导师（自适应、多模态、带记忆）

> Khanmigo（Khan Academy）、Duolingo Max、Google LearnLM / Gemini for Education、Quizlet Q-Chat、Synthesis Tutor，全都在 2026 年大规模交付了自适应多模态辅导。共同的形态是：一套苏格拉底式策略（绝不直接甩出答案）、一个每次交互后都更新的学习者模型（贝叶斯知识追踪风格）、语音 + 文本 + 拍照解题的输入、课程图检索、间隔重复排程，以及针对适龄内容的硬性安全过滤。这个顶点项目就是交付一个学科专属的导师（K-12 代数或 Python 入门），用 10 个学习者做一项为期两周的成效研究，并通过一次内容安全审计。

**类型：** Capstone
**语言：** Python（后端、学习者模型）、TypeScript（web 应用）、SQL（课程图，经 Postgres + Neo4j）
**前置要求：** 第 5 阶段（NLP）、第 6 阶段（语音）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 14 阶段（agent）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P5 · P6 · P11 · P12 · P14 · P17 · P18
**预计时间：** 30 小时

## 问题背景

自适应辅导过去是教育科技的研究小众。到 2026 年它成了消费级产品。Khanmigo 部署在美国大多数学区。Duolingo Max 拿下了数千万月活。Google 的 LearnLM / Gemini for Education 给 Google Classroom 里的辅导供能。Quizlet Q-Chat 跟闪卡并排坐着。Synthesis Tutor 凭“给好奇孩子的导师”火了一把。共同要素：多模态输入（打字、说话、给方程拍照）、苏格拉底式教学法（先问，后解释）、一个每次交互后更新的学习者模型，以及严格的适龄安全。

你将为一个特定群体做一个这样的产品。衡量线是一项真实的成效研究：10 个学习者两周内的前测和后测分数。语音环路必须感觉自然（复用顶点项目 03 的子栈）。记忆必须尊重隐私。安全过滤必须通过 K-12 的 COPPA 感知红队。

## 核心概念

四个组件。**导师策略**是一个苏格拉底式环路：学习者要答案时，策略问一个引导性问题；答对时，移到下一个概念；卡住时，给一个有脚手架的提示。**学习者模型**是贝叶斯知识追踪（或一个简单变体），每次交互后更新每个课程节点的掌握概率。**课程图**是一个概念的 Neo4j，带前置依赖边；策略走这张图来挑下一个概念。**记忆**是一个情节式 + 语义式存储（agentmemory 风格），存着过去的交互、错误和偏好。

体验是多模态的。打字答案用文本输入。语音输入经 LiveKit + Whisper（复用顶点项目 03）。数学题的拍照输入经 dots.ocr 或 PaliGemma 2。语音输出经 Cartesia Sonic-2。安全用 Llama Guard 4 加一个适龄过滤器（拦截成人内容、暴力、自残），以及一套 COPPA 感知的记忆保留策略。

成效研究就是交付物。10 个学习者，前测和后测，两周。报告学习增益差值和置信区间。跟一个非自适应基线对比（同样的内容线性给出，不带导师策略）。

## 架构

```
learner device
  |
  +-- text         -> web app
  +-- voice        -> LiveKit Agents (ASR + TTS)
  +-- photo math   -> dots.ocr / PaliGemma 2
       |
       v
  tutor policy (LangGraph)
       - Socratic decision head
       - next-concept chooser (curriculum graph walk)
       - hint scaffolder
       - mastery update
       |
       v
  learner model (BKT / item-response theory)
       - per-concept mastery probability
       - spaced-repetition scheduler (SM-2 or FSRS)
       |
       v
  memory (agentmemory-style)
       - episodic: every interaction
       - semantic: learned mistakes, preferences
       - retention policy: COPPA / GDPR aware
       |
       v
  curriculum graph (Neo4j)
       - prerequisite edges
       - OER content attached
       |
       v
  safety:
    Llama Guard 4 + age-appropriate filter
    memory access guarded by learner ID scope
```

## 技术栈

- 学科选择：K-12 代数或 Python 入门（挑一个做深）
- 导师策略：基于 Claude Sonnet 4.7 的 LangGraph（带 prompt caching）
- 学习者模型：贝叶斯知识追踪（经典）或用 FSRS 做间隔
- 课程图：概念 + 前置依赖边 + OER 内容的 Neo4j
- 记忆：agentmemory 风格的持久向量 + 情节式 + 语义式存储
- 语音：LiveKit Agents 1.0 + Cartesia Sonic-2（复用顶点项目 03 子栈）
- 拍照解题：方程识别用 dots.ocr 或 PaliGemma 2
- 安全：Llama Guard 4 + 自定义适龄过滤器
- 评测：Bloom 层级题目生成、前/后测外壳、成效研究工具

```figure
cf-tutor-loop
```

## 动手构建

1. **课程图。** 建一个 50-150 个概念节点的 Neo4j（如 K-12 代数从“数轴”到“求根公式”），带前置依赖边。每个节点挂上 OER 内容（Open Textbook、OpenStax）。

2. **学习者模型。** 用先验初始化贝叶斯知识追踪：猜对、失误、学习率。每次交互后更新每个概念的掌握度。按学习者持久化。

3. **导师策略。** 带节点的 LangGraph：`read_signal`（学习者的答案是对 / 部分对 / 卡住了？）、`select_concept`（走课程图挑优先级最高的概念）、`scaffold`（苏格拉底式 prompt）、`update_mastery`。

4. **记忆。** 每次交互写进情节式存储。错误和偏好提升到语义记忆。COPPA 感知的保留策略：1 年后自动删除、家长可访问。

5. **语音路径。** 挂在导师策略上的 LiveKit Agents worker。ASR 经 Whisper-v3-turbo。TTS 经 Cartesia Sonic-2。支持打断（复用顶点项目 03 的机制）。

6. **拍照解题路径。** 上传或拍摄图像；跑 dots.ocr 或 PaliGemma 2 识别方程；作为结构化输入喂给导师。

7. **安全。** 每个模型输出都过 Llama Guard 4 + 一个适龄过滤器（拦截自残、成人内容、暴力）。记忆访问按学习者 ID 圈定；提供家长访问面用于删除。

8. **成效研究。** 10 个学习者，前测（标准化的 30 题基线）、两周导师互动（每周 3 次会话）、后测。在同样的内容上跟一个 10 人的非自适应基线群体对比。

9. **每周进度报告。** 按学习者，自动生成一份 PDF 摘要：探索过的主题、掌握度轨迹、推荐的下一步。

## 实际使用

```
learner: "I don't understand why 3x + 6 = 12 means x = 2"
[signal]   stuck
[concept]  'isolating variables' (prerequisite: addition-subtraction-equality)
[scaffold] "what number would you subtract from both sides to start?"
learner: "6"
[signal]   correct
[mastery]  addition-subtraction-equality: 0.62 -> 0.77
[concept]  continue 'isolating variables'
[scaffold] "great. now what is 3x / 3 equal to?"
```

## 拿去用

`outputs/skill-ai-tutor.md` 是交付物。一个学科专属的自适应导师，带多模态输入、学习者模型、记忆、安全，以及实测的成效。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 学习增益差值 | 10 人两周研究里的前/后测差值 |
| 20 | 苏格拉底式保真度 | 转写样本上的评分 |
| 20 | 多模态体验 | 语音 + 拍照 + 文本端到端的连贯性 |
| 20 | 安全 + 隐私姿态 | Llama Guard 4 通过率 + COPPA 感知的保留 |
| 15 | 课程广度与图质量 | 概念覆盖 + 前置依赖图一致性 |
| **100** | | |

## 练习

1. 带和不带自适应学习者模型（随机概念顺序）各跑一遍成效研究。报告差值。预期自适应会赢，但差距有多大才是有意思的数字。

2. 加一个多模态探针：同一个概念题以文本、语音、拍照三种形式给出。衡量学习者用他们偏好的模态是否收敛得更快。

3. 做一个家长看板：练过的主题、掌握度轨迹、即将到来的概念、安全事件（任何护栏命中）。与 COPPA 对齐。

4. 加一个语言切换模式：导师接受西班牙语输入并用西班牙语教学。衡量 X-Guard 覆盖。

5. 给记忆隐私加压：验证学习者 A 即使通过语音片段重摄入攻击也看不到学习者 B 的数据。记录这次尝试访问并告警。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Socratic policy（苏格拉底式策略） | “问，别甩” | 导师问一个引导性问题，而不是给答案 |
| Bayesian knowledge tracing（贝叶斯知识追踪） | “BKT” | 给每个概念算掌握概率的经典学习者模型方程 |
| FSRS | “Free Spaced Repetition Scheduler” | 2024 年的间隔重复排程器，比 SM-2 更好 |
| Curriculum graph（课程图） | “概念 DAG” | 概念加前置依赖边的 Neo4j |
| Episodic memory（情节式记忆） | “逐交互日志” | 每次交互都存下来供日后检索 |
| Semantic memory（语义式记忆） | “学到的模式存储” | 从情节式提升上来的、压缩过的错误和偏好 |
| COPPA | “儿童隐私法” | 美国限制收集 13 岁以下儿童数据的法律 |

## 延伸阅读

- [Khanmigo (Khan Academy)](https://www.khanmigo.ai) —— 参考级消费 K-12 导师
- [Duolingo Max](https://blog.duolingo.com/duolingo-max/) —— 参考级语言学习导师
- [Google LearnLM / Gemini for Education](https://blog.google/technology/google-deepmind/learnlm) —— 托管参考模型
- [Quizlet Q-Chat](https://quizlet.com) —— 备选参考
- [Synthesis Tutor](https://www.synthesis.com) —— 初创公司参考
- [FSRS algorithm](https://github.com/open-spaced-repetition/fsrs4anki) —— 间隔重复排程器
- [Bayesian Knowledge Tracing](https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing) —— 学习者模型经典
- [LiveKit Agents](https://github.com/livekit/agents) —— 语音栈
