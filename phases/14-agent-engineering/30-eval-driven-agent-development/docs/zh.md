# 评估驱动的 Agent 开发

> Anthropic 的建议：「从简单 prompt 开始，用全面的评估优化它们，只在需要时才加多步 agent 系统。」评估不是最后一步。它是驱动阶段 14 里每个其他选择的外层循环。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 的全部内容。
**预计时间：** ~60 分钟

## 学习目标

- 说出三个评估层 —— 静态基准、自定义离线、线上生产 —— 各自是干什么的。
- 解释 evaluator-optimizer 的紧密循环。
- 描述 2026 年的最佳实践：评估和代码放在一起、在 CI 里跑、给 PR 设关卡。
- 把阶段 14 的每一课连到它生成的评估用例。

## 问题背景

agent 能过演示。它们在生产里以演示无法预测的方式失败。基准回答「这个模型大体上有能力吗？」而不是「这个 agent 在为我的产品交付正确的补丁吗？」答案：三个层次上的评估，持续运行，每个 guardrail 和习得规则都映射到一个评估用例。

## 核心概念

### 三个评估层

1. **静态基准** —— 代码用 SWE-bench Verified（第 19 课）、浏览 / 桌面用 WebArena/OSWorld（第 20 课）、通才用 GAIA（第 19 课）、工具使用用 BFCL V4（第 06 课）。用于跨模型对比和回归关卡。污染是真实的：SWE-bench+ 发现 32.67% 解法泄露。永远报 Verified / 经审计的分数。

2. **自定义离线评估** —— 你产品的形态：
   - LLM 当裁判（Langfuse、Phoenix、Opik —— 第 24 课）。
   - 基于执行（跑补丁、检查测试）。
   - 基于轨迹（把动作序列与黄金对比；OSWorld-Human 显示顶尖 agent 是黄金的 1.4-2.7 倍）。

3. **线上评估** —— 生产：
   - 会话回放（Langfuse）。
   - guardrail 触发的告警（第 16、21 课）。
   - 逐步成本 / 延迟追踪（第 23 课 OTel span）。

### Evaluator-optimizer（Anthropic）

紧密循环：

1. 提议者生成输出。
2. 评估器判定。
3. 精修直到评估器通过。

这是 Self-Refine（第 05 课）的一般化。任何你在乎的 agent 流程都能包进 evaluator-optimizer 来获得可靠性。

### 2026 年的最佳实践

- 评估和代码放在一起。
- 在每个 PR 上跑 CI。
- 用评估分数给合并设关卡（如「相对 main 无超过 5% 的回归」）。
- 每个 guardrail 映射到一个评估用例。
- 每条习得规则（Reflexion、pro-workflow learn-rule）映射到一个失败用例。

### 把阶段 14 串起来

阶段 14 的每一课都生成评估用例：

| 课 | 它生成的评估用例 |
|--------|------------------------|
| 01 Agent 循环 | 预算耗尽、死循环守卫 |
| 02 ReWOO | 工具失败时规划器正确重规划 |
| 03 Reflexion | 习得的反思在重试时生效 |
| 05 Self-Refine/CRITIC | 裁判通过精修后的输出 |
| 06 工具使用 | 参数强制转换有效；未知工具被拒 |
| 07-10 记忆 | 检索引用匹配来源；过时事实失效 |
| 12 工作流模式 | 每个模式产出正确输出 |
| 13 LangGraph | 恢复精确复现状态 |
| 14 AutoGen actor | DLQ 抓到崩溃的处理器 |
| 16 OpenAI Agents SDK | guardrail 在正确的输入上触发 |
| 17 Claude Agent SDK | 子 agent 结果返回给编排器 |
| 19-20 基准 | SWE-bench Verified 分数、WebArena 成功率、OSWorld 效率 |
| 21 Computer Use | 逐步安全抓到注入的 DOM |
| 23 OTel | span 发出必需属性 |
| 26 失败模式 | 检测器给已知失败打标 |
| 27 Prompt 注入 | PVE 拒绝被投毒的检索 |
| 28 编排 | supervisor 路由到正确的专家 |
| 29 运行时形态 | DLQ 处理 N% 的失败 |

如果你的评估套件对每一项都有用例，你就覆盖了阶段 14。

### 评估驱动开发在哪里会失败

- **没有基线。** 没有上一次已知良好的评估无法解读。存基线。
- **没有锚定的 LLM 裁判。** 裁判也会幻觉。CRITIC 模式（第 05 课）—— 让裁判锚定在外部工具上。
- **对评估过拟合。** 为评估优化会偏离生产有用性。轮换用例。
- **不稳定的评估。** 非确定性用例造成误报。钉住种子，快照状态。

```figure
ae-eval-three-layers
```

## 动手构建

`code/main.py` 是一个标准库评估 harness：

- 带类别的用例注册表（benchmark、custom、online）。
- 一个被测的脚本化 agent。
- evaluator-optimizer 循环：提议、判定、精修直到通过或达到最大轮数。
- CI 关卡：聚合通过率 + 相对基线的回归。

运行它：

```
python3 code/main.py
```

输出：每用例通过/失败、回归标志、CI 关卡裁决。

## 实际使用

- 把评估用例写在和 agent 代码同一个仓库里。
- 通过 CI 在每个 PR 上跑它们。
- 回归时让构建失败。
- 随时间追踪通过率。
- 把每个生产失败绑到一个新用例上。

## 拿去用

`outputs/skill-eval-suite.md` 为一个 agent 产品构建三层评估套件，带 CI 关卡和回归追踪。

## 练习

1. 拿你的一个生产失败。写一个复现它的评估用例。你的 agent 现在能过它吗？
2. 为你的领域构建一个三维度（事实、语气、范围）的 LLM 裁判评分标准。给 50 个会话打分。
3. 把评估套件接进 CI。回归 >=5% 时让构建失败。
4. 加一个轨迹效率指标：agent 走了多少步 vs 一条黄金轨迹？
5. 把阶段 14 的每一课映射到你套件里的一个评估用例。有缺的吗？那就是要补的缺口。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Static benchmark | 「现成评估」 | SWE-bench、GAIA、AgentBench、WebArena、OSWorld |
| Custom offline eval | 「领域评估」 | 在你产品形态上的 LLM 当裁判 / 执行 / 轨迹 |
| Online eval | 「生产评估」 | 会话回放、guardrail 告警、成本/延迟追踪 |
| Evaluator-optimizer | 「提议-判定-精修」 | 迭代到裁判通过 |
| CI gate | 「合并阻断器」 | 评估回归时让构建失败 |
| Baseline | 「上一次已知良好」 | 用来检测回归的参考分数 |
| Trajectory efficiency | 「相对黄金的步数」 | agent 步数除以人类专家最小步数 |

## 延伸阅读

- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 「从简单开始，用评估优化」
- [OpenAI, SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) —— 策划的基准
- [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) —— 工具使用基准
- [Langfuse docs](https://langfuse.com/) —— 实战中的评估 + 会话回放
