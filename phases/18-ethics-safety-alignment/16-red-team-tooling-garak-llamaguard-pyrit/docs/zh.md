# 红队工具 —— Garak、Llama Guard、PyRIT

> 三个生产工具框定了 2026 年的红队技术栈。Llama Guard（Meta）——一个在 14 个 MLCommons 危害类别上微调的 Llama-3.1-8B 分类器；2025 年的 Llama Guard 4 是一个从 Llama 4 Scout 剪枝而来的 12B 原生多模态分类器。Garak（NVIDIA）——开源 LLM 漏洞扫描器，带静态、动态、自适应探针，针对幻觉、数据泄露、提示注入、毒性、越狱。PyRIT（Microsoft）——多轮红队战役，带 Crescendo、TAP，以及用于深度利用的自定义转换器链。Llama Guard 3 记录在 Meta 的「Llama 3 Herd of Models」（arXiv:2407.21783）里；Llama Guard 3-1B-INT4 在 arXiv:2411.17713；Garak 的探针架构在 github.com/NVIDIA/garak。这些工具是 2026 年红队研究（第 12-15 课）与部署（第 17 课起）之间的生产接口。

**类型：** Build
**语言：** Python（标准库，工具架构模拟器和 Llama Guard 风格分类器的模拟）
**前置要求：** 阶段 18 · 12-15（越狱与 IPI）
**预计时间：** ~75 分钟

## 学习目标

- 描述 Llama Guard 3/4 在安全栈里的位置：输入分类器、输出分类器、还是两者皆是。
- 说出 14 个 MLCommons 危害类别，并说出一个不那么显眼的类别（代码解释器滥用）。
- 描述 Garak 的探针架构：探针、检测器、测试台。
- 描述 PyRIT 的多轮战役结构，以及它如何与 Garak 探针组合。

## 问题背景

第 12-15 课呈现了攻击面。生产部署需要可重复、可规模化的评估。三个工具主导 2026 年：Llama Guard（防御分类器）、Garak（扫描器）、PyRIT（战役编排器）。每个瞄准红队生命周期的不同层。

## 核心概念

### Llama Guard（Meta）

Llama Guard 3 是一个为输入/输出分类微调的 Llama-3.1-8B 模型，覆盖 MLCommons AILuminate 的 14 个类别：
- 暴力犯罪、非暴力犯罪、性相关、CSAM、诽谤
- 专业建议、隐私、知识产权、无差别武器、仇恨
- 自杀/自残、性内容、选举、代码解释器滥用

支持 8 种语言。用法：放在 LLM 之前（输入审核）、之后（输出审核），或两者皆有。这两种用法生成不同的训练分布——Llama Guard 3 以单个模型同时处理两者交付。

Llama Guard 3-1B-INT4（arXiv:2411.17713，440MB，移动 CPU 上约 30 tokens/s）是量化的边缘变体。

Llama Guard 4（2025 年 4 月）是 12B、原生多模态、从 Llama 4 Scout 剪枝而来。它用一个能同时摄入文本 + 图像的分类器，取代了 8B 文本版和 11B 视觉版两个前身。

### Garak（NVIDIA）

开源漏洞扫描器。架构：
- **探针（Probes）。** 针对幻觉、数据泄露、提示注入、毒性、越狱的攻击生成器。静态（固定提示）、动态（生成的提示）、自适应（响应目标输出）。
- **检测器（Detectors）。** 对照预期失败模式给输出打分——有毒、被泄露、被越狱。
- **测试台（Harnesses）。** 管理「探针-检测器」对、跑战役、生成报告。

TrustyAI 把 Garak 与 Llama-Stack 护盾（Prompt-Guard-86M 输入分类器、Llama-Guard-3-8B 输出分类器）集成，做端到端的护盾目标评估。基于分层的打分（TBSA）取代了二元的通过/失败——一个模型在同一探针上可以在严重度第 3 层通过、在第 5 层失败。

### PyRIT（Microsoft）

Python Risk Identification Toolkit。多轮红队战役。围绕以下构建：
- **转换器（Converters）。** 变换一个种子提示——改写、编码、翻译、角色扮演。
- **编排器（Orchestrators）。** 跑战役：Crescendo（逐步升级）、TAP（分叉）、RedTeaming（自定义循环）。
- **打分（Scoring）。** LLM 当裁判，或分类器当裁判。

PyRIT 是 Garak 较重的表亲。Garak 跑成千上万个单轮探针；PyRIT 跑为攻破特定失败模式而设计的深度多轮战役。

### 这套栈

把 Llama Guard 放在模型两侧。每晚跑 Garak 做回归。发布前跑 PyRIT 做战役。这是 2026 年大多数生产部署的默认配置。

### 评估的坑

- **裁判身份。** 这三个工具都能用 LLM 裁判；裁判校准驱动着报告出来的 ASR（第 12 课）。报告时连同裁判一起说明。
- **探针陈旧。** 模型被针对性打补丁后，Garak 探针会老化。自适应探针（PAIR 形态）比静态探针老化得慢。
- **Llama Guard 对良性内容的假阳性率。** 早期 Llama Guard 版本过度标记政治和 LGBTQ+ 内容；Llama Guard 3/4 的校准有改进，但没有按部署逐一校准。

### 这在阶段 18 里的位置

第 12-15 课是攻击家族。第 16 课是生产工具。第 17 课（WMDP）是两用能力的评估。第 18 课是把这些工具包进政策结构里的前沿安全框架。

```figure
al-guard-stack
```

## 实际使用

`code/main.py` 造了一个玩具 Llama Guard 风格分类器（覆盖 14 类的关键词 + 语义特征）、一个玩具 Garak 测试台（探针-检测器循环），以及一个 PyRIT 风格的多轮转换器链。你可以拿这三个工具攻打一个模拟目标，观察不同的覆盖签名。

## 拿去用

本课产出 `outputs/skill-red-team-stack.md`。给定一段部署描述，它指出这三个工具里哪些合适、在每个里配置什么、以及跑什么回归节奏。

## 练习

1. 运行 `code/main.py`。对比 Llama Guard 风格分类器在单轮 vs 多轮攻击上的检测率。

2. 实现一个新的 Garak 探针：一个 base64 编码的有害请求。测量 Llama Guard 风格分类器对它的检测。

3. 给 PyRIT 风格转换器链扩展一个「翻译成法语、再改写」的转换器。重新测量攻击成功率。

4. 读 Llama Guard 3 的危害类别清单。指出两个类别，在那里训练数据会真实地对合法的开发者内容产生高假阳性率。

5. 对比 Garak 和 PyRIT 的设计原则。论证一个各自是正确工具的部署。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Llama Guard | 「那个分类器」 | 微调的 Llama-3.1-8B/4-12B 安全分类器，带 14 个危害类别 |
| Garak | 「那个扫描器」 | NVIDIA 开源漏洞扫描器；探针、检测器、测试台 |
| PyRIT | 「那个战役工具」 | Microsoft 多轮红队编排器；转换器、编排器、打分 |
| Prompt-Guard | 「那个小分类器」 | Meta 的 86M 提示注入分类器，与 Llama Guard 配对 |
| TBSA | 「基于分层的打分」 | Garak 取代二元结果的分层式通过/失败 |
| 转换器链 | 「改写 + 编码 + ……」 | PyRIT 用于构建多步攻击的组合原语 |
| MLCommons 危害类别 | 「那 14 个分类法」 | Llama Guard 瞄准的行业标准分类法 |

## 延伸阅读

- [Meta — Llama Guard 3 (in Llama 3 Herd paper, arXiv:2407.21783)](https://arxiv.org/abs/2407.21783) —— 8B 分类器
- [Meta — Llama Guard 3-1B-INT4 (arXiv:2411.17713)](https://arxiv.org/abs/2411.17713) —— 量化移动分类器
- [NVIDIA Garak — GitHub](https://github.com/NVIDIA/garak) —— 扫描器仓库与文档
- [Microsoft PyRIT — GitHub](https://github.com/Azure/PyRIT) —— 战役工具包
