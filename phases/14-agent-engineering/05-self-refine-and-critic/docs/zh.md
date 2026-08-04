# Self-Refine 与 CRITIC：迭代式输出改进

> Self-Refine（Madaan 等人，2023）让一个 LLM 在循环里扮演三个角色 —— 生成、反馈、精修。平均收益：7 个任务上绝对值 +20。CRITIC（Gou 等人，2023）通过把验证步骤路由到外部工具来加固反馈环节。2026 年这个模式在每个框架里都以「evaluator-optimizer」（Anthropic）或 guardrail 循环（OpenAI Agents SDK）的形式出现。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 03（Reflexion）
**预计时间：** ~60 分钟

## 学习目标

- 说出 Self-Refine 的三个 prompt（生成、反馈、精修），并解释为什么历史对精修 prompt 很重要。
- 解释 CRITIC 的关键洞见：LLM 在没有外部锚定时做自我验证并不可靠。
- 用标准库实现一个带历史和可选外部验证器的 Self-Refine 循环。
- 把这个模式映射到 Anthropic 的「evaluator-optimizer」工作流和 OpenAI Agents SDK 的输出 guardrail。

## 问题背景

一个 agent 产出了一个差不多对的答案。也许某行代码有语法错误。也许一段摘要太长。也许一个计划漏了某个边界情况。你想要的是：agent 批判自己的输出，然后修好它。

Self-Refine 表明这件事用单个模型就能做到，不要训练数据、不要 RL。但有个坑：LLM 在硬事实上做自我验证很差劲。CRITIC 给出了修法 —— 把验证步骤路由到外部工具（搜索、代码解释器、计算器、测试运行器）。

这两篇论文合起来定义了 2026 年迭代改进的默认做法：生成、验证（尽量用外部）、精修、验证器通过时停止。

## 核心概念

### Self-Refine（Madaan 等人，NeurIPS 2023）

一个 LLM，三个角色：

```
generate(task)            -> output_0
feedback(task, output_0)  -> critique_0
refine(task, output_0, critique_0, history) -> output_1
feedback(task, output_1)  -> critique_1
refine(task, output_1, critique_1, history) -> output_2
...
stop when feedback says "no issues" or budget exhausted.
```

关键细节：`refine` 看得到完整历史 —— 之前所有的输出和批判 —— 所以它不会重犯错误。论文做了消融：去掉历史，质量陡降。

要点：跨 7 个任务（数学、代码、首字母缩写、对话）平均绝对值 +20，含 GPT-4。不训练、不用外部工具、单个模型。

### CRITIC（Gou 等人，arXiv:2305.11738，v4，2024 年 2 月）

Self-Refine 的弱点：反馈步骤是 LLM 给自己打分。对事实性论断这并不可靠（一个幻觉对产出它的模型来说往往看着挺像那么回事）。CRITIC 把 `feedback(task, output)` 换成 `verify(task, output, tools)`，其中 `tools` 包括：

- 用于事实性论断的搜索引擎。
- 用于代码正确性的代码解释器。
- 用于算术的计算器。
- 领域专用验证器（单元测试、类型检查器、linter）。

验证器产出一份锚定在工具结果上的结构化批判。精修器随后基于这份批判进行。

要点：CRITIC 在事实性任务上胜过 Self-Refine，因为批判是有锚定的。在没有外部验证器的任务上（创意写作、格式化），CRITIC 退化成 Self-Refine。

### 停止条件

两种常见形态：

1. **验证器通过。** 外部测试返回成功。有得用时优先（单元测试、类型检查器、guardrail 断言）。
2. **没发出反馈。** 模型说「输出没问题」。更便宜但不可靠；配一个最大迭代上限。

2026 年的默认做法：把它们组合起来。「若验证器通过 或 模型说没问题 且 迭代 >= 2 或 迭代 >= max_iterations 则停止。」

### Evaluator-Optimizer（Anthropic，2024）

Anthropic 2024 年 12 月那篇帖子把这个列为五种工作流模式之一。两个角色：

- Evaluator：给输出打分并产出一份批判。
- Optimizer：基于批判修订输出。

循环直到 evaluator 通过。这就是 Anthropic 框架下的 Self-Refine/CRITIC。Anthropic 加的关键工程细节：evaluator 和 optimizer 的 prompt 应该差异显著，免得模型只是盖个橡皮图章。

### OpenAI Agents SDK 输出 guardrail

OpenAI Agents SDK 把这个模式作为「输出 guardrail」提供。一个 guardrail 是跑在 agent 最终输出上的校验器。如果 guardrail 被触发（抛出 `OutputGuardrailTripwireTriggered`），输出被拒，agent 可以重试。guardrail 可以调用工具（CRITIC 式）或是纯函数（Self-Refine 式）。

### 2026 年的坑

- **橡皮图章循环。** 同一个模型用同样的 prompt 风格做生成和批判，会收敛到「我看挺好」。用结构上不同的 prompt，或用一个更小更便宜的模型做批判。
- **过度精修。** 每一遍精修都增加延迟和 token。预算 1-3 遍；超出后升级到人工审查。
- **在琐碎任务上用 CRITIC。** 如果没有外部验证器，CRITIC 退化成 Self-Refine；别为一个桩验证器付延迟。

```figure
self-refine
```

## 动手构建

`code/main.py` 在一个玩具任务上实现 Self-Refine 和 CRITIC：给定一个主题，产出一个简短的项目符号列表。验证器检查格式（3 个项目符号，每个不超过 60 字符）。CRITIC 加了一个外部「事实验证器」，惩罚已知的幻觉。

组件：

- `generate` —— 脚本化生产者。
- `feedback` —— LLM 式自我批判。
- `verify_external` —— CRITIC 式有锚定的验证器。
- `refine` —— 基于历史重写输出。
- 停止条件 —— 验证器通过或最多 4 次迭代。

运行它：

```
python3 code/main.py
```

对比 Self-Refine 和 CRITIC 两次运行。CRITIC 抓到了一个 Self-Refine 漏掉的事实错误，因为外部验证器有自我批判者所没有的锚定。

## 实际使用

Anthropic 的 evaluator-optimizer 就是这个模式的 Claude 友好版表述。OpenAI Agents SDK 的输出 guardrail 是 CRITIC 形态（guardrail 可以调工具）。LangGraph 提供一个读起来像 Self-Refine 的反思节点。Google 的 Gemini 2.5 Computer Use 加了一个逐步安全评估器，它是 CRITIC 变体：每个动作在提交前都被验证。

## 拿去用

`outputs/skill-refine-loop.md` 在给定任务形态、验证器可用性和迭代预算的情况下配置一个 evaluator-optimizer 循环。产出生成器、评估器/验证器和优化器的 prompt，外加一个停止策略。

## 练习

1. 用 max_iterations=1 跑这个玩具。CRITIC 还有帮助吗？
2. 把外部验证器换成一个有噪声的（随机 30% 假阳性）。循环会怎么做？这就是 2026 年大多数 guardrail 栈的现实。
3. 实现一个「生成器-批判者用不同模型」的变体：大模型生成，小模型批判。它能打败同模型方案吗？
4. 读 CRITIC 第 3 节（arXiv:2305.11738 v4）。说出三类验证工具，并各举一例。
5. 把 OpenAI Agents SDK 的 `output_guardrails` 映射到 CRITIC 的验证器角色。这个 SDK 哪里搞错了，哪里搞对了？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Self-Refine | 「会自己修的 LLM」 | 在单个模型里的「生成 -> 反馈 -> 精修」循环，带历史 |
| CRITIC | 「工具锚定的验证」 | 把反馈换成外部验证器（搜索、代码、计算、测试） |
| Evaluator-Optimizer | 「Anthropic 工作流模式」 | 两个角色 —— evaluator 打分、optimizer 修订 —— 循环到收敛 |
| Output guardrail | 「事后检查」 | OpenAI Agents SDK 在 agent 产出输出后运行的校验器 |
| Verify step | 「批判阶段」 | 承重的那个决定：有锚定还是自评 |
| Refine history | 「模型已经试过什么」 | 之前的输出 + 批判前置到精修 prompt；去掉它质量就崩 |
| Rubber-stamp loop | 「自我认同失败」 | 同 prompt 的批判返回「看着挺好」；用结构不同的 prompt 修 |
| Stop condition | 「收敛测试」 | 验证器通过 或 无反馈 且 迭代上限；绝不用单一条件 |

## 延伸阅读

- [Madaan et al., Self-Refine (arXiv:2303.17651)](https://arxiv.org/abs/2303.17651) —— 那篇标准论文
- [Gou et al., CRITIC (arXiv:2305.11738)](https://arxiv.org/abs/2305.11738) —— 工具锚定的验证
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— evaluator-optimizer 工作流模式
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) —— 作为 CRITIC 形态验证器的输出 guardrail
