---
id: genai-observability
title: OpenTelemetry GenAI 与 agent 可观测性
code: OG
subtitle: 发出 gen_ai.* span、采样 trace、导出指标、选择平台并调试 trace。代码来自课程，仅用标准库。
hue: 25
sources: phases/13-tools-and-protocols/20-opentelemetry-genai, phases/14-agent-engineering/23-otel-genai-conventions, phases/14-agent-engineering/24-agent-observability-platforms, phases/17-infrastructure-and-production/13-llm-observability, phases/19-capstone-projects/11-llm-observability-dashboard, phases/19-capstone-projects/28-observability-otel-traces, projects/agent-trace-debugger
source_hash: a922d82fee017dda
---

## Agent span 层级
type: architecture
from: phases/13-tools-and-protocols/20-opentelemetry-genai/docs/zh.md, phases/13-tools-and-protocols/20-opentelemetry-genai/code/main.py

```arch
node | agent | 1,1 | agent.invoke_agent | INTERNAL，根 span | process
node | llm | 2,1 | llm.chat | CLIENT，LLM 提供方 | model
node | tool | 2,2 | tool.execute | INTERNAL | process
node | mcp | 3,2 | mcp.call | CLIENT, traceparent | process
node | sub | 2,3 | subagent.invoke | INTERNAL | process
node | exp | 3,1 | 导出器 | OTLP 发往任意后端 | store
edge | agent | llm | parentSpanId
edge | agent | tool | parentSpanId
edge | tool | mcp | _meta.traceparent
edge | agent | sub | parentSpanId
edge | llm | exp | span
```

## 应设置的属性
type: concepts
from: phases/13-tools-and-protocols/20-opentelemetry-genai/docs/zh.md, phases/14-agent-engineering/23-otel-genai-conventions/docs/zh.md

- **`gen_ai.operation.name`**：`chat`、`embeddings`、`execute_tool`、`invoke_agent`。
- **`gen_ai.provider.name`**：`openai`、`anthropic`、`aws.bedrock`、`google.vertex`。
- **`gen_ai.request.model`**：请求的模型。
- **`gen_ai.response.model`**：实际处理调用的模型，路由可能改变它。
- **`gen_ai.usage.input_tokens`**：输入 token 数。`gen_ai.usage.output_tokens` 为输出 token 数。
- **`gen_ai.response.id`**：用于关联的提供方响应标识。
- **`gen_ai.tool.name`**：工具名称。`gen_ai.tool.call.id` 标识一次调用。
- **`gen_ai.data_source.id`**：RAG 步骤读取的语料或存储。

## 在代码中埋点
type: task-table
from: phases/13-tools-and-protocols/20-opentelemetry-genai/code/main.py, phases/14-agent-engineering/23-otel-genai-conventions/code/main.py, phases/19-capstone-projects/28-observability-otel-traces/code/main.py, phases/17-infrastructure-and-production/13-llm-observability/code/main.ts

| 任务 | 代码 |
|---|---|
| 启动子 span | `start_span(name, kind, parent=root)` |
| 构建 traceparent | `f"00-{mcp_span.trace_id}-{mcp_span.span_id}-01"` |
| 以引用形式保存内容 | `tracer.add_content(chat, key, prompt)` |
| 用 span 包裹工作 | `with builder.span(name, attributes=..., parent=...)` |
| 每行写入一个 span | `JSONLExporter(path=trace_path)` |
| 统计工具调用次数 | `metrics.counter("tools_called_total")` |
| 输出 Prometheus 文本 | `prometheus_exposition(registry)` |
| 在导出器中采样 | `makeSamplingExporter(consoleExporter, 0.05)` |

## 带指标的 span 构建器
type: annotated-code
lang: python
from: phases/19-capstone-projects/28-observability-otel-traces/code/main.py, phases/19-capstone-projects/28-observability-otel-traces/docs/zh.md

```python
metrics = MetricsRegistry()
builder = SpanBuilder(exporters=[jsonl, in_mem], metrics=metrics)
with builder.span("gen_ai.chat", attributes={GEN_AI_SYSTEM: "anthropic",
        GEN_AI_OPERATION_NAME: "chat"}, kind="CLIENT") as chat_span:
    chat_span.attributes[GEN_AI_USAGE_INPUT_TOKENS] = 412
    with builder.span("gen_ai.tool.execution", parent=chat_span,
            attributes={GEN_AI_TOOL_NAME: "read_file"}) as tool1:
        tool1.attributes[GEN_AI_TOOL_RESULT_BYTES] = 1024
print(prometheus_exposition(metrics))  # tools_called_total, tool_latency_ms
```

## 运行课程
type: command-table
from: phases/13-tools-and-protocols/20-opentelemetry-genai/code/main.py, phases/14-agent-engineering/23-otel-genai-conventions/docs/zh.md, phases/19-capstone-projects/28-observability-otel-traces/docs/zh.md, phases/19-capstone-projects/11-llm-observability-dashboard/code/ts/README.md, phases/19-capstone-projects/11-llm-observability-dashboard/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python code/main.py` | 第 13.20 课，输出一条 trace 的 span |
| `OTEL_CAPTURE_CONTENT=1 python code/main.py` | 添加 prompt 与补全事件 |
| `python3 code/main.py` | 第 14.23 课，输出 span 树与内容存储 |
| `python3 -m pytest code/tests/ -v` | 第 19.28 课，检查往返转换与分桶 |
| `npm start` | 生成 1200 个合成 span，输出汇总 |
| `npm run serve` | 在 `PORT` 上提供摄取服务与仪表板 |

## 调试 trace：agent-trace-debugger
type: flow
from: projects/agent-trace-debugger/solution/main.ts, projects/agent-trace-debugger/solution/cli.ts, projects/agent-trace-debugger/project.json

1. **`parseTrace`**：每行一个 JSON 对象。错误行会使处理停止并报告行号。
2. **`validateTree`**：拒绝重复标识、环、缺失父节点和超出父时间范围的子节点。
3. **`unionDuration`**：合并重叠的子区间，不直接求和。
4. **`analyze`**：独占时间等于包含子节点的时间减去子区间并集。
5. **`analyze`**：`slowest` 标识独占时间最长的 span。
6. **`render`**：写入独立 HTML，对名称转义并用颜色标出错误。
7. **cli.ts**：`--baseline` 添加 `wall_time_delta_ms`、`token_delta`、`error_delta`。

## Trace 调试器命令
type: annotated-code
lang: bash
from: projects/agent-trace-debugger/README.md, projects/agent-trace-debugger/solution/cli.ts

```bash
python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger
python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict
python3 scripts/project_test.py agent-trace-debugger --all --solution --strict
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
node cli.ts --format otlp --input samples/otlp.json --output otlp-trace.html --json otlp-trace.json
```

## 默认值与数值
type: defaults
from: phases/13-tools-and-protocols/20-opentelemetry-genai/code/main.py, phases/19-capstone-projects/11-llm-observability-dashboard/code/main.py, phases/19-capstone-projects/11-llm-observability-dashboard/code/ts/src/spans.ts, phases/19-capstone-projects/11-llm-observability-dashboard/code/ts/src/index.ts, phases/19-capstone-projects/28-observability-otel-traces/docs/zh.md, phases/17-infrastructure-and-production/13-llm-observability/code/main.ts, projects/agent-trace-debugger/solution/cli.ts, projects/agent-trace-debugger/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `OTEL_CAPTURE_CONTENT` | `"0"` | 设为 1 以捕获 prompt 和补全内容 |
| `TailSampler` `sample_rate` | `0.10` | 始终保留错误与 PII 评估 |
| `ObservabilityStore` 容量 | `10_000` | span 环形缓冲区 |
| `PORT` | `8011` | 设置 `SERVE=1` 启动 HTTP 服务 |
| 高成本 span | `totalTokens > 8000` | 采样导出器始终保留 |
| `--format` | `jsonl` | 也支持 `otlp`。基线文件仍为 JSONL |
| `--output` | `trace.html` | `--json` 写入报告文件 |

## 故障排查
type: troubleshooting
from: phases/14-agent-engineering/23-otel-genai-conventions/docs/zh.md, phases/14-agent-engineering/24-agent-observability-platforms/docs/zh.md, phases/17-infrastructure-and-production/13-llm-observability/docs/zh.md, phases/13-tools-and-protocols/20-opentelemetry-genai/docs/zh.md, projects/agent-trace-debugger/solution/main.ts, projects/agent-trace-debugger/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| trace 中含 PII 与秘密 | span 捕获完整 prompt | 在外部保存内容，span 只放引用标识 |
| 多提供方仪表板损坏 | 缺少 `gen_ai.provider.name` | 在每个 LLM span 上设置 |
| 工具 span 成为孤儿 | span 缺少父关联 | 始终传播上下文 |
| 升级后属性改名 | 未选择稳定语义约定 | 设置 `OTEL_SEMCONV_STABILITY_OPT_IN` |
| trace 中没有 MCP 服务端 | 标准输入输出不携带 HTTP 请求头 | 将 traceparent 放入每个请求的 `_meta` |
| 无法二分定位回归 | prompt 版本未关联 trace | 在 trace 上记录 prompt 版本 |
| `child outside parent` | 子区间超出父区间 | 导入前统一时钟 |

## 选择平台
type: comparison
from: phases/14-agent-engineering/24-agent-observability-platforms/docs/zh.md, phases/17-infrastructure-and-production/13-llm-observability/docs/zh.md

| 比较项 | Langfuse | Phoenix | Opik |
|---|---|---|---|
| 许可证 | MIT | Elastic License 2.0 | Apache 2.0 |
| 优势 | prompt 管理、会话 | RAG 相关性、漂移 | 优化、护栏 |
| prompt 版本管理 | 支持 | 不支持 | A/B 实验 |
| 免费额度 | 每月 50K 个事件 | 自托管 | 自托管或云服务 |
| 适用场景 | 含 prompt 的一体化平台 | 深入评估 RAG 与漂移 | 自动优化 |

## 问答
type: qa
from: phases/13-tools-and-protocols/20-opentelemetry-genai/docs/zh.md, phases/14-agent-engineering/23-otel-genai-conventions/docs/zh.md, phases/17-infrastructure-and-production/13-llm-observability/docs/zh.md, phases/19-capstone-projects/11-llm-observability-dashboard/docs/zh.md, phases/14-agent-engineering/24-agent-observability-platforms/docs/zh.md

- **CLIENT 还是 INTERNAL？** CLIENT 跨进程边界。INTERNAL 用于 agent 循环和工具执行。
- **`invoke_agent` 使用哪种类型？** 远程 agent 服务使用 CLIENT，进程内框架使用 INTERNAL。
- **规模扩大后保留什么？** 100% 错误、100% 高成本、5% 成功调用。
- **何时认为存在漂移？** PSI 高于 0.2 通常表示有实质漂移。
- **只有追踪足够吗？** 不。没有评估的追踪只是昂贵的日志。
- **哪些指标是直方图？** `gen_ai.client.token.usage`、`gen_ai.client.operation.duration`、`gen_ai.tool.execution.duration`。
