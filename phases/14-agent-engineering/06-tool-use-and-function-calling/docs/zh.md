# 工具使用与函数调用

> Toolformer（Schick 等人，2023）开启了自监督的工具标注。Berkeley Function Calling Leaderboard V4（Patil 等人，2025）定下了 2026 年的标杆：40% agentic、30% 多轮、10% live、10% non-live、10% 幻觉。单轮已经搞定了。记忆、动态决策、长跨度工具链还没有。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 13 · 01（函数调用深入）
**预计时间：** ~60 分钟

## 学习目标

- 解释 Toolformer 的自监督训练信号：只在执行能降低下一 token 损失时才保留工具标注。
- 说出 BFCL V4 的五个评估类别，以及每个类别衡量什么。
- 用标准库实现一个工具注册表，带 schema 校验、参数强制转换和执行沙箱化。
- 诊断 2026 年的三个开放问题：长跨度工具链、动态决策、记忆。

## 问题背景

早期的工具使用问的是：模型能预测出一个正确的函数调用吗？现代的工具使用问的是：模型能跨 40 步串联工具吗 —— 带记忆、带部分可观测性、能从工具失败中恢复、又不幻觉出不存在的工具？

Toolformer 立起了基线：模型能用自监督学会何时调工具。BFCL V4 定义了 2026 年的评估目标。两者之间的鸿沟，正是生产 agent 所在的空间。

## 核心概念

### Toolformer（Schick 等人，NeurIPS 2023）

思路：让模型用候选 API 调用标注自己的预训练语料。对每个候选，执行它。只有在「带上工具结果」能降低下一个 token 的损失时才保留这条标注。在过滤后的语料上微调。

覆盖的工具：计算器、QA 系统、搜索引擎、翻译器、日历。自监督信号纯粹关乎工具是否帮助预测文本 —— 没有人工标注。

规模化结果：工具使用能力随规模涌现。小模型被工具标注拖累；大模型从中获益。这就是为什么 2026 年的前沿模型自带强工具使用能力，而大多数 7B 模型需要显式的工具使用微调才靠谱。

### Berkeley Function Calling Leaderboard V4（Patil 等人，ICML 2025）

BFCL 是 2026 年事实上的评估标准。V4 的构成：

- **Agentic（40%）** —— 完整的 agent 轨迹：记忆、多轮、动态决策。
- **Multi-Turn（30%）** —— 带工具链的交互式对话。
- **Live（10%）** —— 用户提交的真实 prompt（更难的分布）。
- **Non-Live（10%）** —— 合成测试用例。
- **Hallucination（10%）** —— 检测出什么时候不该调用任何工具。

V3 引入了基于状态的评估：在一个工具序列之后，检查 API 的实际状态（例如「文件创建了吗？」），而不是去匹配工具调用的 AST。V4 加了网页搜索、记忆和格式敏感性类别。

2026 年的关键发现：单轮函数调用近乎搞定。失败集中在记忆（跨轮承载上下文）、动态决策（基于既往结果选工具）、长跨度链（20+ 步后漂移）、以及幻觉检测（没有合适工具时拒绝调用）。

### 工具 schema

每个厂商都有一套 schema。它们在细节上不同，但共享同一个形态：

```
name: string
description: string (what it does, when to use it)
input_schema: JSON Schema (properties, required, types, enums)
```

Anthropic 直接用 `input_schema`。OpenAI 用 `function.parameters`。两者都接受 JSON Schema。描述是承重的 —— 模型读它来挑对工具。糟糕的工具描述是「挑错工具」类失败的头号根因。

### 参数校验

别信任何工具调用。校验：

1. **类型强制转换。** schema 说是 int，模型可能返回字符串 "5"。无歧义就转换；有歧义就拒绝。
2. **枚举校验。** 如果 schema 说 `status in {"open", "closed"}`，模型却吐出 `"in_progress"`，用一条描述性错误拒绝它。
3. **必填字段。** 缺必填字段 -> 立刻把一个错误观察回喂给模型，而不是崩溃。
4. **格式校验。** 日期、邮箱、URL —— 用具体的解析器校验，别用正则。

每次校验失败都应返回一个结构化观察，好让模型能用正确的形态重试。

### 并行工具调用

现代厂商支持在一个助手轮里做并行工具调用。循环是：

1. 模型发出 3 个工具调用，各带不同的 `tool_use_id`。
2. 运行时执行它们（相互独立就并行）。
3. 每个结果作为一个 `tool_result` 块返回，按 `tool_use_id` 关联。

工程规则：把关联 ID 当承重部件。把它们搞混，你就会得到「错工具配错结果」的路由。

### 沙箱化

工具执行就是沙箱边界。细节见第 09 课。简而言之：每个工具都应指明读写接触面、网络访问、超时、内存上限。泛泛的 `run_shell(cmd)` 是个危险信号；具体的 `git_status()` 更安全。

```figure
tool-routing
```

## 动手构建

`code/main.py` 实现一个生产形态的工具注册表：

- JSON Schema 子集校验器（仅标准库）。
- 工具注册，带描述、输入 schema、超时和执行器。
- 参数强制转换和枚举校验。
- 带关联 ID 的并行工具分派。
- 把错误观察作为结构化字符串。

运行它：

```
python3 code/main.py
```

轨迹展示一个迷你 agent 在一个轮里调三个工具，其中一个故意做成格式错误的调用，被一条描述性错误拒绝，模型可以据此采取行动。

## 实际使用

每个厂商都有自己的工具 schema —— Anthropic、OpenAI、Gemini、Bedrock。如果你需要多厂商，用一个转换层（OpenAI Agents SDK、Vercel AI SDK、LangChain 工具适配器）。BFCL 是参考基准 —— 如果工具使用是产品核心，上线前拿它跑一遍你的 agent。

## 拿去用

`outputs/skill-tool-registry.md` 为给定任务领域生成一份工具目录、schema 和注册表。包含描述质量检查（每个工具的描述有没有告诉模型何时使用它？）。

## 练习

1. 加一个「no-op」工具，让模型可以显式拒绝使用任何其他工具。在一个类 BFCL 的幻觉测试上度量。
2. 为「int 当字符串」和「float 当字符串」实现参数强制转换。强制转换从哪里开始会掩盖真正的 bug？
3. 加一个每工具超时和一个熔断器（连续 3 次失败后拒绝该工具 60 秒）。这对模型如何恢复有什么改变？
4. 读 BFCL V4 的说明。挑一个类别（如「multi-turn」），用你的 agent 跑 10 个示例 prompt。报告通过率。
5. 把标准库校验器移植到 Pydantic 或 Zod。Pydantic/Zod 抓到了哪些这个玩具漏掉的东西？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Function calling | 「工具使用」 | 带已校验 schema 的结构化输出工具调用 |
| Toolformer | 「自监督工具标注」 | Schick 2023 —— 保留那些结果能降低下一 token 损失的工具调用 |
| BFCL | 「Berkeley Function Calling Leaderboard」 | 2026 基准：40% agentic、30% 多轮、10% live、10% non-live、10% 幻觉 |
| Tool schema | 「给模型看的函数签名」 | name、description、参数的 JSON Schema |
| tool_use_id | 「关联 ID」 | 把一个工具调用和它的结果绑在一起；并行分派必备 |
| Hallucination detection | 「知道何时别调」 | V4 类别：没有合适工具时拒绝调用 |
| Argument coercion | 「字符串转 int 修复」 | 针对可预测的 schema 不匹配做窄修复；有歧义就拒绝 |
| Sandboxing | 「工具执行边界」 | 每工具的读写接触面、网络、超时、内存上限 |

## 延伸阅读

- [Schick et al., Toolformer (arXiv:2302.04761)](https://arxiv.org/abs/2302.04761) —— 自监督工具标注
- [Berkeley Function Calling Leaderboard (V4)](https://gorilla.cs.berkeley.edu/leaderboard.html) —— 2026 评估基准
- [Anthropic, Tool use documentation](https://platform.claude.com/docs/en/agent-sdk/overview) —— Claude Agent SDK 里的生产工具 schema
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) —— 函数工具类型与 Guardrails
