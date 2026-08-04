# 心智理论与涌现式协调

> Li 等人（arXiv:2310.10701）表明，合作文字游戏里的 LLM agent 表现出**涌现的高阶心智理论（Theory of Mind，ToM）**——推理「另一个 agent 对第三个 agent 信念的看法」——但因上下文管理和幻觉而在长视野规划上失败。Riedl（arXiv:2510.05174）跨一个群体测量高阶协同，发现**只有**在 ToM-prompt 条件下才产生身份关联的分化和目标导向的互补；能力较低的 LLM 只表现出虚假涌现。也就是说，协调涌现是依赖 prompt、依赖模型的，不是白来的。本课实现一个最小的 ToM 感知 agent，在有和没有 ToM 提示的情况下跑一个合作任务，并对照 Riedl 2025 协议测量协调增量。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 07（心智社会与辩论）、Phase 16 · 17（生成式 agent）
**预计时间：** ~75 分钟

## 问题背景

多 agent 协调常常看着很神奇：agent 分工、彼此预判、避免重复。通常这种「涌现」是 prompt 工程的产物——有人告诉 agent 去「协调」。撤掉 prompt，协调也没了。

Riedl 2025 年的发现更严格：在受控条件下，只有当 agent 被提示去推理**其他 agent 的心智**（ToM）时，协调才涌现。没有 ToM 提示，连强模型表现出的协调模式也熬不过统计检验。这对生产很要紧：团队发布的「多 agent 协调」功能依赖 prompt 且脆弱。

本课把 ToM 当成一项具体能力（推理「关于信念的信念」），构建一个最小的 ToM 感知 agent，并测量真正的协调长什么样、prompt 装点又长什么样。

## 核心概念

### ToM 是什么意思

发展心理学：3 岁孩子以为任何人的内心世界都和自己一样。5 岁孩子理解别人有不同的信念。7 岁孩子能推理「关于信念的信念」（「她以为我以为球在杯子下面」）。这分别是零阶、一阶、二阶 ToM。

对 LLM agent，ToM 的阶数对应到：

- **零阶：** 没有对他人的模型。agent 只按自己的观察行动。
- **一阶：** agent 有一个关于每个其他 agent 信念的模型。「Alice 相信 X。」
- **二阶：** agent 对递归信念建模。「Alice 相信 Bob 相信 X。」

Li 等人 2023 年发现，一阶和二阶 ToM 在合作游戏的 LLM agent 里涌现，但随长视野和不可靠通信而退化。

### Sally-Anne 测试，简述

一个 1985 年的错误信念测试：Sally 把一颗弹珠放进篮子 A，离开。Anne 把它移到篮子 B。Sally 回来时会去哪里找？有一阶 ToM 的孩子说篮子 A（Sally 的信念与现实不同）。没有的孩子说篮子 B。

GPT-4 时代的 LLM 在平直提问时通过 Sally-Anne 式测试。在叙述很长、场景变换多次、或问题间接措辞时则失败。这就是 2026 年生产 LLM 里 ToM 的实际状态。

### Riedl 的协调测量

Riedl（arXiv:2510.05174）搭了一个群体规模的测试：N 个 agent、一个合作目标、可变的 prompt 条件。测量：

1. **身份关联的分化。** agent 是否随时间发展出稳定的角色区分？
2. **目标导向的互补。** agent 的行动是否互补（不同子任务）而非重复？
3. **高阶协同。** 一个衡量「群体是否达成了任何子集都达不成的成就」的统计量。

结果：只有在 ToM prompt 条件下，三个指标才产出高于基线的信号。没有 ToM 提示时，中等能力模型的指标在随机水平附近徘徊。大模型在没有显式 ToM 提示时表现出一些协调，但效应比显式提示时小。

### 协调幻觉

没有统计检验时，演示里的「涌现协调」常常反映的是：

- 把协调烤进去的 prompt 工程（system prompt 里写着「一起工作」）。
- 观察者偏差（我们看到了我们期望看到的模式）。
- 对成功运行的事后挑选。

那些不带可测信号就宣传「涌现协调」的生产系统，应当被当作营销看待。先测量，再声称。

### 一个最小的 ToM 感知 agent

结构：

```
agent state:
  own_beliefs:    {facts the agent believes}
  other_models:   {other_agent_id -> {beliefs_the_agent_attributes_to_them}}
  actions_last_N: [history of others' actions]

observation update:
  - 从直接观察更新 own_beliefs
  - 从对方的行动 + 先前信念更新 other_models[agent_id]

action selection:
  - 枚举候选行动
  - 对每个候选，根据建模的信念预测每个其他 agent 接下来会做什么
  - 选在那些预测下使联合结果最大化的行动
```

`other_models` 这个属性就是 ToM 状态。一阶 ToM 只保留一层。二阶加上 `other_models[i][other_models_of_j]`——我认为 agent i 认为 agent j 相信什么。

### 为什么长视野有害

Li 等人记录：上下文限制导致 agent 忘记哪个信念属于谁。幻觉给其他 agent 模型添上虚假信念。两者都产生「我以为他以为 X」的错误，随时间累积。

论文及 2024-2026 年后续工作记录的缓解手段：

- **在 prompt 里显式写 ToM 状态。** 结构化格式：`{agent_id: belief_list}`。强制检索保住「身份-信念」绑定。
- **更短的推理链。** 每轮更少的 ToM 更新减少累积幻觉。
- **外部 ToM 存储。** 把模型维护在 LLM 上下文之外；每轮只注入相关部分。

### ToM 在生产里何处失败

- **对抗场景。** ToM 好的 agent 更容易被操纵（你能建模它对你的建模，然后利用它）。
- **异质团队。** 模型不同时，对一个对手管用的 ToM 模型不会泛化。
- **依赖 ground truth 的任务。** ToM 是关于信念的；如果正确性取决于事实，ToM 可能是分心。

### 你真正能测量的协调

三个实用信号，表明一个团队的协调是真的、而非 prompt 装点的：

1. **随时间的互补。** 在一个多轮任务里，agent 的行动是否覆盖不相交的子任务？
2. **预判。** agent A 在第 T+1 轮的行动，是否依赖一个关于 B 在第 T+2 轮行动的、后来被证明正确的预测？
3. **纠正。** 当 A 在第 T 轮误读了 B 的信念时，A 是否在第 T+2 轮纠正了？

这些在一个有日志的多 agent 系统里是可测的。它们是「协调」叙事的实质版本。

```figure
sw-theory-of-mind
```

## 动手构建

`code/main.py` 实现：

- `ToMAgent` —— 跟踪自己的信念和对每个其他 agent 的信念模型。
- 一个合作任务：三个 agent 必须从三个盒子里各取一个 token；每个盒子能装一个 token。agent 不能通信；它们从彼此的行动推断意图。
- 两种配置：`zeroth_order`（无 ToM）和 `first_order`（带一层信念模型的 ToM）。
- 在 200 次随机化试验上测量：完成率、重复率（两个 agent 瞄准同一个盒子）、平均完成轮数。

运行：

```
python3 code/main.py
```

预期输出：零阶 agent 以约 35% 的比率重复劳动，在 10 轮内完成约 60% 的试验。一阶 ToM agent 重复率约 5%、完成约 95%。这个增量就是可测的协调效应。

## 实际使用

`outputs/skill-tom-auditor.md` 是一个 skill，它审计一个多 agent 系统关于「涌现协调」的声称。检查 prompt 装点、相对一个对照组的统计显著性、以及实测的互补性。

## 拿去用

协调声称检查清单：

- **对照条件。** 一个去掉协调 prompt 的系统版本。两个都测。
- **统计检验。** 系统与对照在你的指标上的差异，是否在 `p < 0.05` 上显著？
- **互补度量。** 随时间的行动不相交性，而不仅是最终成功。
- **失败案例日志。** agent 协调失误时，ToM 状态长什么样？
- **模型能力披露。** 如果效应在更小的模型上消失，就说出来。

## 练习

1. 跑 `code/main.py`。确认一阶 ToM 把重复率降低约 7 倍。当你扩展到 5 个 agent 和 5 个盒子时，差距还在吗？
2. 实现二阶 ToM（agent A 建模 B 对 C 的看法）。它比一阶有改进吗？在什么任务上？
3. 往 ToM 状态里注入一个**幻觉**：每轮随机翻转一个信念。这把一阶性能降级了多少？
4. 读 Li 等人（arXiv:2310.10701）。复现「长视野退化」发现：当轮数从 10 增到 30，你的一阶 ToM 性能怎么变？
5. 读 Riedl 2025（arXiv:2510.05174）。在你的仿真日志上实现高阶协同统计量。没有 ToM prompt 条件时，效应还在吗？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Theory of Mind | 「理解他人的心智」 | 对另一个 agent 信念建模的能力。按阶（0、1、2+）分级。 |
| Sally-Anne test | 「错误信念测试」 | 1985 年发展心理学；LLM 通过平直版本、在复杂版本上失败。 |
| First-order ToM | 「A 相信 X」 | 建模一个他人对事实的信念。 |
| Second-order ToM | 「A 相信 B 相信 X」 | 再深一层的递归建模。 |
| Identity-linked differentiation | 「随时间稳定的角色」 | Riedl 的指标：角色持续，而非随机。 |
| Goal-directed complementarity | 「不相交的行动」 | agent 瞄准不同子任务，而非同一个。 |
| Higher-order synergy | 「群体超过任何子集」 | Riedl 衡量真实协调的统计量。 |
| Coordination illusion | 「它看着协调」 | 不带可测信号、prompt 装点出的协调假象。 |

## 延伸阅读

- [Li et al. — Theory of Mind for Multi-Agent Collaboration via Large Language Models](https://arxiv.org/abs/2310.10701) —— 合作游戏里的涌现 ToM；长视野失败模式
- [Riedl — Emergent Coordination in Multi-Agent Language Models](https://arxiv.org/abs/2510.05174) —— 群体规模测量；ToM 提示是那个承重条件
- [Premack & Woodruff — Does the chimpanzee have a theory of mind?](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/does-the-chimpanzee-have-a-theory-of-mind/1E96B02CD9850E69AF20F81FA7EB3595) —— ToM 概念 1978 年的起源
- [Baron-Cohen, Leslie, Frith — Does the autistic child have a theory of mind?](https://doi.org/10.1016/0010-0277(85)90022-8) —— Sally-Anne 论文（1985）
