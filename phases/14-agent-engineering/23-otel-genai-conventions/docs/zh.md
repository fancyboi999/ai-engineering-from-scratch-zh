# OpenTelemetry GenAI 语义约定

> OpenTelemetry 的 GenAI SIG（2024 年 4 月成立）定义了 agent 遥测的标准 schema。span 名、属性和内容捕获规则在各厂商间收敛，于是 agent trace 在 Datadog、Grafana、Jaeger 和 Honeycomb 里含义一致。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 13（LangGraph）、阶段 14 · 24（可观测性平台）
**预计时间：** ~60 分钟

## 学习目标

- 说出 GenAI 的 span 类别：model/client、agent、tool。
- 区分 `invoke_agent` CLIENT span 和 INTERNAL span，以及各自何时适用。
- 列出顶层 GenAI 属性：提供方名称、请求模型、数据源 ID。
- 解释内容捕获契约：opt-in、`OTEL_SEMCONV_STABILITY_OPT_IN`、外部引用建议。

## 问题背景

每个厂商都发明自己的 span 名。运维团队最后得为每个框架各建一套仪表盘。OpenTelemetry 的 GenAI SIG 通过定义一个整个生态都对齐的标准来修这个问题。

## 核心概念

### span 类别

1. **Model / client span。** 覆盖原始 LLM 调用。由提供方 SDK（Anthropic、OpenAI、Bedrock）和框架的模型适配器发出。
2. **Agent span。** `create_agent`（agent 被构造时）和 `invoke_agent`（它运行时）。
3. **Tool span。** 每次工具调用一个；通过父子关系连到 agent span。

### Agent span 命名

- span 名：如果有命名就是 `invoke_agent {gen_ai.agent.name}`；回退到 `invoke_agent`。
- span 类型：
  - **CLIENT** —— 用于远程 agent 服务（OpenAI Assistants API、Bedrock Agents）。
  - **INTERNAL** —— 用于进程内 agent 框架（LangChain、CrewAI、本地 ReAct）。

### 关键属性

- `gen_ai.provider.name` —— `anthropic`、`openai`、`aws.bedrock`、`google.vertex`。
- `gen_ai.request.model` —— 模型 ID。
- `gen_ai.response.model` —— 解析后的模型（可能因路由与请求不同）。
- `gen_ai.agent.name` —— agent 标识符。
- `gen_ai.operation.name` —— `chat`、`completion`、`invoke_agent`、`tool_call`。
- `gen_ai.data_source.id` —— 用于 RAG：咨询了哪个语料或存储。

针对 Anthropic、Azure AI Inference、AWS Bedrock、OpenAI 有技术专用的约定。

### 内容捕获

默认规则：instrumentation 默认不应捕获输入/输出。捕获通过以下选项 opt-in：

- `gen_ai.system_instructions`
- `gen_ai.input.messages`
- `gen_ai.output.messages`

推荐的生产模式：把内容外部存储（S3、你的日志存储），在 span 上记录引用（指针 ID，而非散文）。这就是把第 27 课的内容投毒防御接进了可观测性。

### 稳定性

截至 2026 年 3 月，大多数约定还是实验性的。用下面这个选项 opt-in 进稳定预览：

```
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
```

Datadog v1.37+ 把 GenAI 属性原生映射进它的 LLM Observability schema。其他后端（Grafana、Honeycomb、Jaeger）支持原始属性。

### 这个模式在哪里会出错

- **在 span 里捕获完整 prompt。** PII、密钥、客户数据进了运维能读的 trace。外部存储。
- **没有 `gen_ai.provider.name`。** 缺归因时多提供方仪表盘崩掉。
- **没有父链接的 span。** 孤儿工具 span。永远传播 context。
- **没设稳定性 opt-in。** 你的属性可能在后端升级时被重命名。

```figure
ae-genai-span-tree
```

## 动手构建

`code/main.py` 用标准库实现一个匹配 GenAI 约定的 span 发射器：

- 带 GenAI 属性 schema 的 `Span`。
- 带 `start_span`、嵌套 context 的 `Tracer`。
- 一次脚本化 agent 运行，发出：`create_agent`、`invoke_agent`（INTERNAL）、每工具 span、LLM 调用的 `chat` span。
- 一个内容捕获模式，把 prompt 外部存储并在 span 上记录 ID。

运行它：

```
python3 code/main.py
```

输出：一棵带所有必需 GenAI 属性的 span 树，以及一个展示 opt-in 内容引用的「外部存储」。

## 实际使用

- **Datadog LLM Observability**（v1.37+）原生映射属性。
- **Langfuse / Phoenix / Opik**（第 24 课）—— 自动 instrument 整个生态。
- **Jaeger / Honeycomb / Grafana Tempo** —— 原始 OTel trace；从 GenAI 属性建仪表盘。
- **自托管** —— 用带 GenAI processor 的 OTel Collector 跑。

## 拿去用

`outputs/skill-otel-genai.md` 把 OTel GenAI span 接进一个现有 agent，带内容捕获默认值和外部引用存储。

## 练习

1. 给你第 01 课的 ReAct 循环 instrument 上 `invoke_agent`（INTERNAL）+ 每工具 span。发送到一个 Jaeger 实例。
2. 用「仅引用」模式加内容捕获：prompt 进 SQLite，span 属性只带行 ID。
3. 读 `gen_ai.data_source.id` 的规范。把它接进你第 09 课的 Mem0 搜索。
4. 设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，验证你的属性不会被 collector 重命名。
5. 构建一个仪表盘：仅从 GenAI 属性看「哪些工具错误与哪些模型相关」。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| GenAI SIG | 「OpenTelemetry GenAI 组」 | 定义 schema 的 OTel 工作组 |
| invoke_agent | 「agent span」 | 表示一次 agent 运行的 span 名 |
| CLIENT span | 「远程调用」 | 对一个远程 agent 服务调用的 span |
| INTERNAL span | 「进程内」 | 一次进程内 agent 运行的 span |
| gen_ai.provider.name | 「提供方」 | anthropic / openai / aws.bedrock / google.vertex |
| gen_ai.data_source.id | 「RAG 来源」 | 一次检索命中了哪个语料/存储 |
| Content capture | 「prompt 记录」 | 消息的 opt-in 捕获；生产里外部存储 |
| Stability opt-in | 「预览模式」 | 用来钉住实验性约定的环境变量 |

## 延伸阅读

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— 规范
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) —— 默认 GenAI span
- [AutoGen v0.4 (Microsoft Research)](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) —— 内置 OTel span
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) —— W3C trace context 传播
