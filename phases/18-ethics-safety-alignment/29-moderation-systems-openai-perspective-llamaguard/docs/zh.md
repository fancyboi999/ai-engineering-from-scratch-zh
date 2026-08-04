# 审核系统 —— OpenAI、Perspective、Llama Guard

> 生产审核系统把第 12-16 课定义的安全政策操作化。OpenAI Moderation API：`omni-moderation-latest`（2024）建在 GPT-4o 上，一次调用即可分类文本 + 图像；在多语言测试集上比上一版好 42%；响应模式返回 13 个类别布尔值——骚扰、骚扰/威胁、仇恨、仇恨/威胁、违法、违法/暴力、自残、自残/意图、自残/指导、性、性/未成年人、暴力、暴力/血腥；对大多数开发者免费。分层模式：输入审核（生成前）、输出审核（生成后）、自定义审核（领域规则）。异步并行调用隐藏延迟；命中标记时返回占位响应。Llama Guard 3/4（第 16 课）：14 个 MLCommons 危害、代码解释器滥用、8 种语言（v3）、多图（v4）。Perspective API（Google Jigsaw）：早于「LLM 当审核者」浪潮的毒性打分；主要是单维度毒性，带 severe-toxicity/insult/profanity 变体；内容审核研究的基线。弃用：Azure Content Moderator 于 2024 年 2 月弃用、2027 年 2 月退役，由 Azure AI Content Safety 取代。

**类型：** Build
**语言：** Python（标准库，三层审核测试台）
**前置要求：** 阶段 18 · 16（Llama Guard / Garak / PyRIT）
**预计时间：** ~60 分钟

## 学习目标

- 描述 OpenAI Moderation API 的类别分类法，以及它与 Llama Guard 3 的 MLCommons 集有何不同。
- 描述三审核层模式（输入、输出、自定义），并说出每个的一个失败模式。
- 描述 Perspective API 作为「LLM 时代之前」基线的位置，以及为什么它在研究中仍被使用。
- 说出 Azure 的弃用时间线。

## 问题背景

第 12-16 课描述攻击和防御工具。第 29 课讲那些在用户接触产品的表面把防御操作化的、已部署的审核系统。三层模式是 2026 年的默认配置。

## 核心概念

### OpenAI Moderation API

`omni-moderation-latest`（2024）。建在 GPT-4o 上。一次调用即可分类文本 + 图像。对大多数开发者免费。

类别（响应模式里的 13 个布尔值）：
- harassment、harassment/threatening
- hate、hate/threatening
- self-harm、self-harm/intent、self-harm/instructions
- sexual、sexual/minors
- violence、violence/graphic
- illicit、illicit/violent

多模态支持适用于 `violence`、`self-harm`、`sexual`，但不含 `sexual/minors`；其余仅文本。

在 `code/main.py` 的代码测试台里，为了教学简洁，我们把 `/threatening`、`/intent`、`/instructions`、`/graphic` 这些子类折叠进它们的顶级父类。生产代码应使用完整的 13 类模式。

在多语言测试集上比上一代审核端点好 42%。每类一个分数；应用自行设阈值。

### Llama Guard 3/4

在第 16 课讲过。14 个 MLCommons 危害类别（组织方式与 OpenAI 的 13 个响应模式布尔值不同）。支持 8 种语言（v3）。Llama Guard 4（2025 年 4 月）原生多模态、12B。

OpenAI 和 Llama Guard 的分类法有重叠但有分歧。OpenAI 把「illicit」作为一个宽类别；Llama Guard 则把「暴力犯罪」和「非暴力犯罪」分开。部署方根据自己政策分类法的契合度来选。

### Perspective API（Google Jigsaw）

早于「LLM 当审核者」浪潮（2020 年前）的毒性打分系统。类别：TOXICITY、SEVERE_TOXICITY、INSULT、PROFANITY、THREAT、IDENTITY_ATTACK。单维度主分数（TOXICITY）带子维度变体。

被广泛用作内容审核研究基线，因为这个 API 稳定、有文档、且有多年的校准数据。对现代与 LLM 相邻的用例，Llama Guard 或 OpenAI Moderation 通常更契合。

### 三层模式

1. **输入审核。** 在生成前分类用户的提示。命中标记则拒绝。延迟：一次分类器调用。
2. **输出审核。** 在交付前分类模型的输出。命中标记则替换为拒绝。延迟：生成后一次分类器调用。
3. **自定义审核。** 领域特定规则（正则、allowlist、业务政策）。在输入或输出处运行。

这三层按设计是顺序的：输入审核必须在生成前完成，输出审核在生成后运行。并行发生在一层之内——在同一段文本上并发跑多个分类器（比如 OpenAI Moderation + Llama Guard + Perspective）能隐藏每个分类器的延迟。作为一项可选优化，可在输入审核完成期间展示一个占位响应（「稍等，检查中……」）并推迟首 token 流式输出。命中标记的行为可配置：拒绝、净化、升级到人工审核。

### 失败模式

- **仅输入。** 抓不到输出幻觉（第 12-14 课的编码攻击绕过输入分类器）。
- **仅输出。** 允许任意输入到达模型；增加成本；把内部推理暴露给攻击者。
- **仅自定义。** 跨类别不鲁棒；正则很脆。

分层是默认。双保险。

### Azure 弃用

Azure Content Moderator：2024 年 2 月弃用，2027 年 2 月退役。由 Azure AI Content Safety 取代，后者基于 LLM 并与 Azure OpenAI 集成。这次迁移对 Azure 部署是一个 2024-2027 的实战级项目。

### 这在阶段 18 里的位置

第 16 课在红队语境下讲审核工具。第 29 课讲已部署的审核。第 30 课用当前两用能力证据收尾。

```figure
an-moderation-layers
```

## 实际使用

`code/main.py` 造了一个三层审核测试台：输入审核器（关键词 + 类别分数）、输出审核器（在输出上跑同一个分类器）、自定义审核器（领域规则）。你可以把输入跑一遍，观察哪一层抓到了什么。

## 拿去用

本课产出 `outputs/skill-moderation-stack.md`。给定一个部署，它推荐一个审核栈配置：输入处用哪个分类器、输出处用哪个、哪些自定义规则、以及边缘情况用什么裁判。

## 练习

1. 运行 `code/main.py`。把一个无害、一个边缘、一个有害的输入跑过全部三层。报告每个分别由哪一层发作。

2. 给测试台扩展一个针对特定类别的 Perspective-API 风格毒性打分。把它的阈值行为与类别分数对比。

3. 读 OpenAI Moderation API 文档和 Llama Guard 3 类别列表。把每个 OpenAI 类别映射到最接近的 Llama Guard 类别。指出三个无法干净映射的类别。

4. 为一个代码助手部署（比如 GitHub Copilot）设计一个审核栈。指出最相关和最不相关的类别，并提出自定义规则。

5. Azure Content Moderator 在 2027 年 2 月退役。规划一次迁移到 Azure AI Content Safety。指出迁移中风险最高的环节。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| OpenAI Moderation | 「omni-moderation-latest」 | 基于 GPT-4o、13 类（文本）、带部分多模态支持的分类器 |
| Perspective API | 「Google Jigsaw 毒性」 | LLM 时代之前的毒性打分基线 |
| Llama Guard | 「MLCommons 14 类」 | Meta 的危害分类器（v3：8B 文本、8 语言；v4：12B 多模态） |
| 输入审核 | 「生成前过滤」 | 在模型调用前对用户提示的分类器 |
| 输出审核 | 「生成后过滤」 | 在交付前对模型输出的分类器 |
| 自定义审核 | 「领域规则」 | 部署特定规则（正则、allowlist、政策） |
| 分层审核 | 「全部三层」 | 标准的生产部署模式 |

## 延伸阅读

- [OpenAI Moderation API docs](https://platform.openai.com/docs/api-reference/moderations) —— omni-moderation 端点
- [Meta PurpleLlama + Llama Guard](https://github.com/meta-llama/PurpleLlama) —— Llama Guard 仓库
- [Google Jigsaw Perspective API](https://perspectiveapi.com/) —— 毒性打分
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/) —— Azure 替代品
