# 心智社会与多 agent 辩论

> Minsky 1986 年的前提——智能是一群专家组成的社会——每隔十年就被重新发现一次。2023 年 Du 等人把它变成了一个具体算法：多个 LLM 实例提出答案、读彼此的答案、批判、更新。经过 N 轮，它们收敛到一个共识，在六项推理和事实性任务上打败了零样本 CoT 和反思（reflection）。两个发现很关键：**多个 agent** 和**多轮**各自独立地带来贡献。社会打败单 agent 的独白；多轮交换打败一次性投票。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 04（原语模型）
**预计时间：** ~60 分钟

## 问题背景

自洽性（self-consistency）——对一个模型采样多次、取多数答案——是你能加上去的最便宜的推理增强。它管用，但很快就饱和。你可以把采样数翻倍，却再也看不到一次有意义的跃升。

辩论打破了这种饱和。不是从一个模型独立采样 N 次，而是 N 个 agent 读彼此的推理再修订。样本之间的相关性下降了（它们不再是 i.i.d. 的），而收敛点往往在 i.i.d. 投票自信地搞错的地方反而正确。

## 核心概念

### Du 等人 2023 年的算法

出自 arXiv:2305.14325（ICML 2024）：

1. N 个 agent 各自对问题产出一个初始答案。
2. 对第 r = 2..R 轮：给每个 agent 看其他 agent 第 r-1 轮的答案，问「考虑到这些，给出你更新后的答案」。
3. R 轮之后，对最终答案做多数投票。

论文在 MMLU、GSM8K、人物传记、MATH 和事实性基准上测试。辩论一致地打败 CoT 和自我反思（Self-Reflection）。

### 两个独立的旋钮

同一篇论文的消融实验：

- **只加 agent 数量**（1 轮，对 N 个做多数投票）在大多数任务上打败单 agent，但会触顶。
- **只加轮数**（1 个 agent 看自己之前的推理）几乎没帮助——这是反思已知的弱点。
- **两个一起**才产生大跃升。多个 agent 之间的多轮交换驱动了收益。

### 它为什么管用

两个机制：

1. **暴露于分歧。** 当一个 agent 看到另一个 agent 的推理链得出不同结论时，它要么得辩护、要么得更新。无论哪种，第 r+1 轮的上下文都比第 r 轮更丰富。
2. **降低相关误差。** 在自洽性里，所有样本都来自同一个模型，于是误差相关——你把它们平均成一个自信的错答案。不同模型或不同种子能去相关。不同的*被辩论过的观点*能进一步去相关。

### 异质辩论

A-HMAD 及相关后续工作给不同的 agent 用*不同的基础模型*。Llama + Claude + GPT 一起辩论能减轻单一栽培塌缩（monoculture collapse，第 26 课），因为一个模型家族的相关误差不被其他家族共享。

坏处：一个弱模型参与辩论可能把共识拖向它的错答案（见《Should we be going MAD?》，arXiv:2311.17371）。

### NLSOM —— 129 agent 的扩展

Zhuge 等人（《Mindstorms in Natural Language-Based Societies of Mind》，arXiv:2305.17066）把这个想法扩展到 129 成员的社会。结果：随着规模增长，专精分工和自组织涌现出来，系统在视觉问答这类任务上超越单 agent。

### 故障模式

- **谄媚级联（Sycophancy cascade）。** 所有 agent 都倒向听起来最自信的那个。辩论塌缩成嗓门最大的那个声音。提示 agent 扮演对抗角色（「必须有一个 agent 论证相反立场」）能缓解。
- **话题漂移。** 多轮辩论会偏离最初的问题。缓解：每一轮都重新注入问题。
- **算力爆炸。** N 个 agent × R 轮 = N·R 次 LLM 调用，每次的上下文都在增长。一场 5 agent、5 轮的辩论就是 25 次调用、上下文不断变大。每个问题的成本可能超过单次 CoT 调用的 10 倍。

```figure
multi-agent-debate
```

## 动手构建

`code/main.py` 在一道数学题上跑一场 3 agent × 3 轮的辩论，每个 agent 一开始持有一个不同（可能错误）的答案。agent 是脚本化的——每个 agent 通过对邻居答案按脚本化置信度加权平均来「更新」。收敛过程在逐轮日志里看得见。

演示展示两个关键效应：

- 单单一轮交换就把 agent 推得更接近正确答案。
- 第 2 轮之后的额外轮次呈现收益递减（与 Du 等人的触顶吻合）。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-debate-configurator.md` 为一个新任务配置一场辩论：agent 数量、轮数、异质性（同模型 vs 混合）、角色分配（对称 vs 一个对抗）。它还在你运行前估算 token 成本。

## 拿去用

如果你要上辩论：

- **把轮数限制在 3。** Du 等人表明 3 轮就拿到了大部分收益。更多只是成本，不是质量。
- **把 agent 数限制在 5。** 超过 5，上下文膨胀和成本就会占主导。
- **默认异质。** 池子里至少放两个不同的基础模型。
- **对抗席位。** 提示一个 agent 无论如何都唱反调。打破谄媚。
- **逐轮记录。** 藏起中间轮次的辩论系统无法调试也无法审计。

## 练习

1. 跑 `code/main.py`，然后把轮数设成 5，看收益递减。从哪一轮起，额外的收敛就停了？
2. 加第四个带对抗角色的 agent：永远跟当前多数唱反调。这是打破还是改善了收敛？
3. 打印（绘制）每轮的一致度分数（处于多数答案上的 agent 比例）。它什么时候触及 1.0，那等同于「正确」吗？
4. 读 Du 等人第 4 节的消融实验。用这份代码复现「只加 agent」对「只加轮数」对「两个都加」的结果。
5. 读《Should we be going MAD?》（arXiv:2311.17371），列出轮询之外的两个辩论变体——比如裁判主导、辩论链（chain-of-debate）、对抗式。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Society of Mind | 「Minsky 的想法」 | 智能即互相交互的专家；1986 年的提法如今通过 LLM 辩论落地。 |
| Multi-agent debate | 「agent 吵架」 | N 个 agent 提出、互相批判、跨 R 轮修订、多数投票。 |
| Consensus | 「它们达成一致」 | 不是认识论上的真理——只是处于多数答案上的比例。可能自信地错。 |
| Rounds | 「交换步」 | 一轮 = 每个 agent 读其他人并更新一次。 |
| Heterogeneous debate | 「混合模型家族」 | 用不同基础模型来给误差去相关。 |
| Sycophancy cascade | 「人人都附和嗓门大的」 | 辩论故障，agent 不顾对错都倒向最自信的那个 agent。 |
| NLSOM | 「129 agent 社会」 | 基于自然语言的心智社会；Zhuge 等人的扩展版本。 |
| Correlated error | 「同一个模型，同一个 bug」 | 自洽性为何饱和；跨不同观点的辩论能去相关。 |

## 延伸阅读

- [Du et al. — Improving Factuality and Reasoning in Language Models through Multiagent Debate](https://arxiv.org/abs/2305.14325) —— 参考论文，ICML 2024
- [Zhuge et al. — Mindstorms in Natural Language-Based Societies of Mind](https://arxiv.org/abs/2305.17066) —— 129 agent 的 NLSOM
- [Should we be going MAD? A Look at Multi-Agent Debate Strategies for LLMs](https://arxiv.org/abs/2311.17371) —— 对各种辩论变体做基准测试
- [Debate project page](https://composable-models.github.io/llm_debate/) —— Du 等人的代码、演示和消融细节
