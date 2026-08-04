# 顶点项目 15 —— 宪法式安全外壳 + 红队靶场

> Anthropic 的 Constitutional Classifiers、Meta 的 Llama Guard 4、Google 的 ShieldGemma-2、NVIDIA 的 Nemotron 3 Content Safety，以及做多语种覆盖的 X-Guard，定义了 2026 年的安全分类器栈。garak、PyRIT、NVIDIA Aegis、promptfoo 成了标准的对抗评测工具。NeMo Guardrails v0.12 把它们串进一条生产流水线。这个顶点项目把这一切都接到一起：围着一个目标应用的分层安全外壳、一个跑 6+ 攻击家族的自主红队 agent，以及一次产出可测量无害性差值的宪法式自我批评运行。

**类型：** Capstone
**语言：** Python（安全流水线、红队）、YAML（策略配置）
**前置要求：** 第 10 阶段（从零做 LLM）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（agent）、第 18 阶段（伦理、安全、对齐）
**涉及阶段：** P10 · P11 · P13 · P14 · P18
**预计时间：** 25 小时

## 问题背景

2026 年 LLM 安全的前沿，不是分类器灵不灵（大体是灵的），而是怎么围着一个生产应用正确地组合它们，既不过度拒答，也不留明显的窟窿。Llama Guard 4 处理英文的策略违例。X-Guard（132 种语言）处理多语种越狱。ShieldGemma-2 抓基于图像的 prompt 注入。NVIDIA Nemotron 3 Content Safety 覆盖企业类别。Anthropic 的 Constitutional Classifiers 是一种单独的方法，用在训练期而非服务期。

攻击的演化也很重要。PAIR 和 TAP 把越狱发现自动化了。GCG 跑基于梯度的后缀攻击。多轮和语码转换攻击利用 agent 记忆。任何部署的 LLM 都需要一个红队靶场——garak 和 PyRIT 是标准驱动器——加上有文档的缓解措施和 CVSS 打分的发现。

你将加固一个目标应用（要么一个 8B 指令微调模型，要么其他顶点项目里的某个 RAG 聊天机器人），对它跑 6+ 攻击家族，并产出一份前后无害性测量。

## 核心概念

安全流水线有五层。**输入净化**：去掉零宽字符、解码 base64/rot13、归一化 Unicode。**策略层**：NeMo Guardrails v0.12 的 rail（域外、毒性、PII 抽取）。**分类器闸门**：输入上跑 Llama Guard 4、非英文上跑 X-Guard、图像输入上跑 ShieldGemma-2。**模型**：目标 LLM。**输出过滤**：输出上跑 Llama Guard 4、Presidio PII 擦洗、适用时做引用强制。**HITL 层**：被标为高风险的输出进 Slack 队列。

红队靶场跑在一个调度器上。PAIR 和 TAP 自主发现越狱。GCG 跑基于梯度的后缀攻击。ASCII / base64 / rot13 编码攻击。多轮攻击（人设采纳、记忆利用）。语码转换攻击（把英文跟斯瓦希里语或泰语混在一起）。每次运行产出一份结构化发现文件，带 CVSS 打分和披露时间线。

宪法式自我批评运行是一个训练期干预。拿 1k 个有害尝试 prompt，让模型起草一个响应，对照一部成文宪法（不可作恶规则）批评它，再在批评循环上重训。在一个留出评测上衡量前后无害性差值。

## 架构

```
request (text / image / multilingual)
      |
      v
input sanitize (strip zero-width, decode, normalize)
      |
      v
NeMo Guardrails v0.12 rails (off-domain, policy)
      |
      v
classifier gate:
  Llama Guard 4 (English)
  X-Guard (multilingual, 132 langs)
  ShieldGemma-2 (image prompts)
  Nemotron 3 Content Safety (enterprise)
      |
      v (allowed)
target LLM
      |
      v
output filter: Llama Guard 4 + Presidio PII + citation check
      |
      v
HITL tier for flagged outputs

parallel:
  red-team scheduler
    -> garak (classic attacks)
    -> PyRIT (orchestrated red team)
    -> autonomous jailbreak agent (PAIR + TAP)
    -> GCG suffix attacks
    -> multilingual / code-switch
    -> multi-turn persona adoption

output: CVSS-scored findings + disclosure timeline + before/after harmlessness delta
```

## 技术栈

- 安全分类器：Llama Guard 4、ShieldGemma-2、NVIDIA Nemotron 3 Content Safety、X-Guard
- 护栏框架：NeMo Guardrails v0.12 + OPA
- 红队驱动器：garak（NVIDIA）、PyRIT（Microsoft Azure）、NVIDIA Aegis、promptfoo
- 越狱 agent：PAIR（Chao 等，2023）、Tree-of-Attacks（TAP）、GCG 后缀
- 宪法式训练：Anthropic 风格的自我批评循环 + 在批评上做 SFT
- PII 擦洗：Presidio
- 目标：一个 8B 指令微调模型，或其他顶点项目里的某个 RAG 聊天机器人

```figure
cf-safety-stack
```

## 动手构建

1. **目标搭建。** 在 vLLM 上立起一个 8B 指令微调模型（或复用另一个顶点项目的 RAG 聊天机器人）。这就是被测应用。

2. **安全流水线封装。** 围着目标接上五层流水线。验证每一层都能单独被观测（Langfuse 里每层一个 span）。

3. **分类器覆盖。** 加载 Llama Guard 4、X-Guard（多语种）、ShieldGemma-2（图像）。在一个小标注集上各跑一遍以建立基线。

4. **红队调度器。** 调度 garak、PyRIT、一个 PAIR agent、一个 TAP agent、一个 GCG 运行器、一个多轮攻击者、一个语码转换攻击者。每个跑在独立队列上。

5. **攻击套件。** 六个攻击家族：(1) PAIR 自动化越狱，(2) TAP tree-of-attacks，(3) GCG 梯度后缀，(4) ASCII / base64 / rot13 编码，(5) 多轮人设，(6) 多语种语码转换。报告每个家族的成功率。

6. **宪法式自我批评。** 整理 1k 个有害尝试 prompt。对每个，目标起草一个响应。一个批评 LLM 对照一部成文宪法打分（“不作恶”“引用证据”“拒绝非法请求”）。批评者反对的 prompt 被重写；目标在批评改进后的对上微调。在一个留出评测上衡量前后无害性。

7. **过度拒答测量。** 在一个良性 prompt 套件（如 XSTest）上追踪假阳性率。目标在良性问题上必须保持有用。

8. **CVSS 打分。** 对每次成功的越狱，按 CVSS 4.0 打分（攻击向量、复杂度、影响）。产出一份披露时间线和缓解计划。

9. **靶场自动化。** 以上一切跑在 cron 上；发现写进队列；过度拒答的回归告警发到 Slack。

## 实际使用

```
$ safety probe --model=target --family=PAIR --budget=50
[attacker]   PAIR agent running on target
[attack]     attempt 1/50: disguise query as academic research ... blocked
[attack]     attempt 2/50: appeal to roleplay ... blocked
[attack]     attempt 3/50: chain-of-thought coax ... SUCCEEDED
[finding]    CVSS 4.8 medium: roleplay bypass on target
[range]      7 successes out of 50 (14% success rate)
```

## 拿去用

`outputs/skill-safety-harness.md` 是交付物。一条生产级的分层安全流水线，加一个可复现的红队靶场，带前后无害性差值。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 攻击面覆盖 | 演练 6+ 攻击家族、2+ 种语言 |
| 20 | 真阳性 / 假阳性权衡 | 攻击拦截率 vs XSTest 良性通过率 |
| 20 | 自我批评差值 | 留出评测上的前后无害性 |
| 20 | 文档与披露 | CVSS 打分的发现，带时间线 |
| 15 | 自动化与可重复 | 一切跑在 cron 上并带告警 |
| **100** | | |

## 练习

1. 在一个 RAG 聊天机器人上跑 garak 的 prompt 注入插件，对比有无输出过滤层时的攻击成功率。

2. 加第七个攻击家族：经检索文档的间接 prompt 注入。衡量需要的额外防御。

3. 实现一个“拒答但帮忙”模式：当护栏拦截时，目标提供一个更安全的相关答案，而不是干巴巴地拒绝。衡量 XSTest 差值。

4. 多语种覆盖缺口：找一种 X-Guard 表现不佳的语言。提议一个针对它的微调数据集。

5. 在一个 30B 模型上跑宪法式自我批评，衡量差值能否随规模放大。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Layered safety（分层安全） | “纵深防御” | 在输入、闸门、输出、HITL 处的多重护栏 |
| Llama Guard 4 | “Meta 的安全分类器” | 2026 年参考级的输入/输出内容分类器 |
| PAIR | “越狱 agent” | 关于 LLM 驱动越狱发现的论文（Chao 等） |
| TAP | “Tree-of-Attacks” | PAIR 的树搜索变体 |
| GCG | “贪心坐标梯度” | 基于梯度的对抗后缀攻击 |
| Constitutional self-critique（宪法式自我批评） | “Anthropic 风格训练” | 目标起草 -> 批评者打分 -> 重写 -> 重训 |
| XSTest | “良性探针集” | 衡量过度拒答回归的基准 |
| CVSS 4.0 | “严重度评分” | 给安全发现用的标准漏洞评分 |

## 延伸阅读

- [Anthropic Constitutional Classifiers](https://www.anthropic.com/research/constitutional-classifiers) —— 训练期参考
- [Meta Llama Guard 4](https://www.llama.com/docs/model-cards-and-prompt-formats/llama-guard-4/) —— 2026 年的输入/输出分类器
- [Google ShieldGemma-2](https://huggingface.co/google/shieldgemma-2b) —— 图像 + 多模态安全
- [NVIDIA Nemotron 3 Content Safety](https://developer.nvidia.com/blog/building-nvidia-nemotron-3-agents-for-reasoning-multimodal-rag-voice-and-safety/) —— 企业参考
- [X-Guard (arXiv:2504.08848)](https://arxiv.org/abs/2504.08848) —— 132 语种多语种安全
- [garak](https://github.com/NVIDIA/garak) —— NVIDIA 红队工具包
- [PyRIT](https://github.com/Azure/PyRIT) —— Microsoft 红队框架
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/) —— rail 框架
- [PAIR (arXiv:2310.08419)](https://arxiv.org/abs/2310.08419) —— 越狱 agent 论文
