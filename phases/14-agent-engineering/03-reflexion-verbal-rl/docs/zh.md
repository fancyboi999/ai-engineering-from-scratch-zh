# Reflexion：言语强化学习

> 基于梯度的 RL 要修一个失败模式得跑上千次试验加一个 GPU 集群。Reflexion（Shinn 等人，NeurIPS 2023）用自然语言搞定：每次失败试验后，agent 写一段反思、存进情景记忆、把下一次试验建立在这段记忆之上。这就是 Letta 的 sleep-time compute、Claude Code 的 CLAUDE.md learnings、以及 pro-workflow 的 learn-rule 背后的模式。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 02（ReWOO）
**预计时间：** ~60 分钟

## 学习目标

- 说出 Reflexion 的三个组件（Actor、Evaluator、Self-Reflector）以及情景记忆的作用。
- 用标准库实现一个 Reflexion 循环，带二值评估器、反思缓冲区和全新重试。
- 为给定任务在标量、启发式和自评三种反馈来源之间做选择。
- 解释为什么言语强化能抓到那些基于梯度的 RL 要跑上千次试验才能修的错误。

## 问题背景

一个 agent 把任务做砸了。在标准 RL 里你会再跑上千次试验、算梯度、更新权重。又贵又慢，而且大多数生产 agent 不可能为每一次失败都备一份训练预算。

Reflexion（Shinn 等人，arXiv:2303.11366）问的是另一个问题：要是 agent 只是想一想自己为什么失败，然后带着这个想法再试一次呢？不更新权重。不算梯度。只在试验之间存一段自然语言。

结果是：在 ALFWorld 上它打败了 ReAct 和其他未微调的基线。在 HotpotQA 上它比 ReAct 有提升。在代码生成（HumanEval/MBPP）上它创下了当时的 state of the art。全程一步梯度都没动。

## 核心概念

### 三个组件

```
Actor         : generates a trajectory (ReAct-style loop)
Evaluator     : scores the trajectory — binary, heuristic, or self-eval
Self-Reflector: writes a natural-language reflection on the failure
```

外加一个数据结构：

```
Episodic memory: list of prior reflections, prepended to the next trial's prompt
```

一次试验跑 Actor。Evaluator 给它打分。如果分低，Self-Reflector 产出一段反思（「我挑错了工具，因为我把问题误读成在问 X，其实它问的是 Y」）。这段反思进入情景记忆。下一次试验从头开始，但看得到这段反思。

### 三种评估器类型

1. **标量** —— 一个外部二值信号。ALFWorld 成功或失败。HumanEval 测试通过或失败。最简单、信号最强。
2. **启发式** —— 预定义的失败特征。「如果 agent 连续两次产出同一个动作，标记为卡住。」「如果轨迹超过 50 步，标记为低效。」
3. **自评** —— LLM 给自己的轨迹打分。没有 ground truth 时才需要。信号偏弱；和工具锚定的验证（第 05 课 —— CRITIC）搭配得很好。

2026 年的默认做法是混用：有标量就用标量，没有就用自评，启发式当安全护栏。

### 为什么它能泛化

Reflexion 与其说是个新算法，不如说是个命名了的模式。几乎每个生产级「自愈」agent 都跑着某个变体：

- Letta 的 sleep-time compute（第 08 课）：一个独立 agent 反思过往对话，写进 memory block。
- Claude Code 的 `CLAUDE.md` /「保存记忆」模式：反思被捕获为 learnings，前置到未来会话。
- pro-workflow 的 `/learn-rule` 命令：纠正被捕获为显式规则。
- LangGraph 的反思节点：一个节点给输出打分，必要时路由去 refine。

它们都源自同一个洞见：自然语言是个足够丰富的媒介，能在多次运行之间承载「我从失败里学到了什么」。

### 什么时候有效、什么时候没用

Reflexion 有效，当：

- 有清晰的失败信号（测试失败、工具报错、答案错误）。
- 任务类别可复现（同一类问题能被再问一遍）。
- 反思有改进轨迹的余地（动作预算够）。

Reflexion 帮不上忙，当：

- agent 第一次就成功了。
- 失败是外部的（网络挂了、工具坏了）—— 反思「网络挂了」对未来运行没帮助。
- 反思变成了迷信 —— 给一次偶发的不稳定运行存下一套叙事。

2026 年的坑：记忆腐烂。反思越攒越多；有些已经过时或错误；随着情景缓冲区增长，重试变慢。缓解办法：周期性压实（第 06 课）、给反思加 TTL，或一个独立的 sleep-time 清理 agent（Letta）。

```figure
react-trace
```

## 动手构建

`code/main.py` 在一个玩具谜题上实现 Reflexion：产出一个和为目标值的 3 元素列表。Actor 吐出候选列表；Evaluator 检查和；Self-Reflector 写一行说明哪里出错了。这段反思进入情景记忆供下一次试验用。

组件：

- `Actor` —— 一个脚本化策略，看到反思就会改进。
- `Evaluator.binary()` —— 对目标和做通过/失败判定。
- `SelfReflector` —— 生成一行失败诊断。
- `EpisodicMemory` —— 一个带 TTL 语义的有界列表。

运行它：

```
python3 code/main.py
```

轨迹展示三次试验。第 1 次失败，存下一段反思，第 2 次看到反思有改进但仍失败，第 3 次成功。和一次基线运行（无反思）对比 —— 它会一直卡在第 1 次的答案上。

## 实际使用

LangGraph 把反思作为一种节点模式提供。Claude Code 的 `/memory` 命令和 pro-workflow 的 `/learn-rule` 把情景缓冲区外化成一个 markdown 文件。Letta 的 sleep-time compute 在空闲时跑 Self-Reflector，让主 agent 保持延迟可控。OpenAI Agents SDK 不直接提供 Reflexion；你用一个按分数拒绝轨迹的自定义 Guardrail 加一个跨运行存活的记忆 `Session` 把它搭出来。

## 拿去用

`outputs/skill-reflexion-buffer.md` 创建并维护一个情景缓冲区，带反思捕获、TTL 和去重。给定一个任务类别和一次失败，它产出一段真能帮到下一次试验的反思（而不是泛泛的「再小心点」）。

## 练习

1. 从二值评估器切换到返回距离度量（离目标多远）的标量评估器。它收敛得更快吗？
2. 给反思加一个 10 次试验的 TTL。过了那个点之后，更老的反思是帮忙还是添乱？
3. 实现启发式评估器：如果同一个动作重复出现就把这次试验标记为卡住。它和 Self-Reflector 怎么相互作用？
4. 用一个无视反思的对抗式 Actor 跑 Reflexion。逼 Actor 注意到反思所需的最小反思 prompt 工程是什么？
5. 读 Reflexion 论文第 4 节关于 AlfWorld 的内容。在概念上复现那 130% 的成功率提升：相比原版 ReAct，关键差异是什么？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Reflexion | 「自我纠正」 | Shinn 等人 2023 —— Actor、Evaluator、Self-Reflector 外加情景记忆 |
| Verbal reinforcement | 「无梯度学习」 | 前置到下一次试验 prompt 的自然语言反思 |
| Episodic memory | 「按任务的反思」 | 某个任务类别下既往反思的有界缓冲区 |
| Scalar evaluator | 「二值成功信号」 | 来自 ground truth 的通过/失败或数值分数 |
| Heuristic evaluator | 「基于模式的检测器」 | 预定义的失败特征（如卡住循环、步数过多） |
| Self-evaluator | 「LLM 给自己轨迹当裁判」 | 没有 ground truth 时的弱信号兜底 —— 配工具锚定验证使用 |
| Memory rot | 「过时的反思」 | 情景缓冲区被过时条目填满；用压实/TTL 修 |
| Sleep-time reflection | 「异步自反思」 | 把 Self-Reflector 挪出热路径，让主 agent 保持快 |

## 延伸阅读

- [Shinn et al., Reflexion: Language Agents with Verbal Reinforcement Learning (arXiv:2303.11366)](https://arxiv.org/abs/2303.11366) —— 那篇标准论文
- [Letta, Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute) —— 生产环境里的异步反思
- [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) —— 把情景缓冲区作为上下文的一部分来管理
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 反思节点模式
