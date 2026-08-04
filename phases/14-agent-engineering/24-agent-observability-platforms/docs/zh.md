# Agent 可观测性：Langfuse、Phoenix、Opik

> 三个开源 agent 可观测性平台主导 2026 年。Langfuse（MIT）—— 每月 600 万+ 次安装，tracing + prompt 管理 + 评估 + 会话回放。Arize Phoenix（Elastic 2.0）—— 深度的 agent 专用评估、RAG 相关性、OpenInference 自动 instrumentation。Comet Opik（Apache 2.0）—— 自动化 prompt 优化、guardrail、LLM 裁判幻觉检测。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 23（OTel GenAI）
**预计时间：** ~45 分钟

## 学习目标

- 说出三个顶级开源 agent 可观测性平台及其许可证。
- 区分每个最擅长什么：Langfuse（prompt 管理 + 会话）、Phoenix（RAG + 自动 instrumentation）、Opik（优化 + guardrail）。
- 解释为什么到 2026 年 89% 的组织报告已经部署了 agent 可观测性。
- 用标准库实现一条「trace 到仪表盘」的流水线，带 LLM 裁判评估。

## 问题背景

OTel GenAI（第 23 课）给你 schema。你仍然需要那个摄入 span、跑评估、存 prompt 版本、暴露回归的平台。三个竞争者各自强调生命周期的不同部分。

## 核心概念

### Langfuse（MIT）

- 每月 600 万+ 次 SDK 安装，19k+ GitHub star。
- 功能：tracing、带版本管理 + playground 的 prompt 管理、评估（LLM 当裁判、用户反馈、自定义）、会话回放。
- 2025 年 6 月：原先的商业模块（LLM-as-a-judge、标注队列、prompt 实验、Playground）以 MIT 开源。
- 最强项：端到端可观测性，带紧密的 prompt 管理循环。

### Arize Phoenix（Elastic License 2.0）

- 更深的 agent 专用评估：trace 聚类、异常检测、RAG 的检索相关性。
- 原生 OpenInference 自动 instrumentation。
- 与托管的 Arize AX 配套用于生产。
- 没有 prompt 版本管理 —— 定位为一个漂移/行为回归工具，与更广的平台并用。
- 最强项：RAG 相关性、行为漂移、异常检测。

### Comet Opik（Apache 2.0）

- 通过 A/B 实验做自动化 prompt 优化。
- guardrail（PII 脱敏、话题约束）。
- LLM 裁判幻觉检测。
- 来自 Comet 自己测量的基准：Opik 记录 + 评估用 23.44s vs Langfuse 327.15s（约 14 倍差距）—— 厂商基准只当方向性参考。
- 最强项：优化循环、自动化实验、guardrail 强制。

### 行业数据

据 Maxim（2026 年实地分析）：89% 的组织已部署 agent 可观测性；质量问题是头号生产障碍（32% 的受访者提到它们）。

### 挑一个

| 需求 | 挑 |
|------|------|
| 带 prompt 管理的一站式 | Langfuse |
| 深度 RAG 评估 + 漂移 | Phoenix |
| 自动化优化 + guardrail | Opik |
| 开放许可、不要 ELv2 | Langfuse（MIT）或 Opik（Apache 2.0） |
| Datadog / New Relic 集成 | 都行 —— 它们都导出 OTel |

### 这个模式在哪里会出错

- **没有评估策略。** 只 tracing 不评估，就只是昂贵的日志记录。
- **没有锚定的自搓 LLM 裁判。** CRITIC 模式（第 05 课）适用 —— 裁判做事实验证需要外部工具。
- **prompt 版本没绑到 trace。** 当生产回归时，你没法二分定位到引发它的那个 prompt。

```figure
wb-trace-ingest
```

## 动手构建

`code/main.py` 用标准库实现一个 trace 收集器 + LLM 裁判评估器：

- 摄入 GenAI 形态的 span。
- 按会话分组，给失败运行打标（guardrail 触发、低置信度评估）。
- 一个脚本化的 LLM 裁判，按一套评分标准给 agent 响应打分。
- 一个仪表盘式汇总：失败率、头部失败原因、评估分数分布。

运行它：

```
python3 code/main.py
```

输出：每会话评估分数和失败分类，匹配 Langfuse/Phoenix/Opik 会展示的东西。

## 实际使用

- **Langfuse** 自托管或云；通过 OTel 或它们的 SDK 接入。
- **Arize Phoenix** 自托管；自动 instrument OpenInference。
- **Comet Opik** 自托管或云；自动化优化循环。
- **Datadog LLM Observability** 用于已经在跑 Datadog 的混合 ops+ML 团队。

## 拿去用

`outputs/skill-obs-platform-wiring.md` 挑一个平台，并把 trace + 评估 + prompt 版本接进一个现有 agent。

## 练习

1. 把一周的 OTel trace 导出到 Langfuse 云（免费档）。哪些会话失败了？为什么？
2. 为你的领域写一套 LLM 裁判评分标准（事实正确性、语气、范围遵循）。在 50 条 trace 上测试。
3. 把 Langfuse 的 prompt 版本管理和 Phoenix 的 trace 聚类做对比。哪个更快告诉你什么坏了？
4. 读 Opik 的 guardrail 文档。给你的一次 agent 运行接一个 PII 脱敏 guardrail。
5. 在你的语料上给三个做基准。忽略厂商公布的数字；测你自己的。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Tracing | 「span 收集器」 | 摄入 OTel / SDK span；按会话索引 |
| Prompt management | 「prompt CMS」 | 绑到 trace 的带版本 prompt |
| LLM-as-judge | 「自动化评估」 | 单独的 LLM 按评分标准给 agent 输出打分 |
| Session replay | 「trace 回放」 | 单步过往运行用于调试 |
| RAG relevancy | 「检索质量」 | 检索到的上下文是否匹配查询 |
| Trace clustering | 「行为分组」 | 把相似运行聚类用于漂移检测 |
| Guardrail enforcement | 「记录时的策略」 | 对被记录内容做 PII/毒性/范围检查 |

## 延伸阅读

- [Langfuse docs](https://langfuse.com/) —— tracing、评估、prompt 管理
- [Arize Phoenix docs](https://docs.arize.com/phoenix) —— 自动 instrumentation、漂移
- [Comet Opik](https://www.comet.com/site/products/opik/) —— 优化 + guardrail
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— 三者都消费的 schema
