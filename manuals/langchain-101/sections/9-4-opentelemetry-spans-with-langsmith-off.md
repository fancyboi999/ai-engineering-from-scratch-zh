# 关闭 LangSmith，用 OpenTelemetry span 做追踪

> 用自己的 OpenTelemetry span 追踪模型调用和工具调用，按提供方返回的用量统计 token，并确认只要开关不为 true，LangSmith 就收不到任何数据。

客户说助手在 10:42 又慢又答错了。你需要看到这次运行的模型调用、各自的 token 数、超时的那个工具，以及日志行，并且它们要靠同一个 id 串起来。数据不能离开你的网络，所以托管的追踪服务不能用。

读完本节，你能给 agent 加上三类 span，并把它们与日志关联起来。你还能找出这些 span 漏掉的模型调用，并证明没有任何追踪数据发往 LangSmith。

## 三类 span {#s-opentelemetry-spans-with-langsmith-off-three-spans}

**span：** 一次有计时的操作，带有名称、属性、状态和父 span。服务产生三类 span。`agent.run` 包住[第 9.1 节](#s-the-run-endpoint-and-its-stream)运行任务中的一次运行。中间件在每次模型调用外产生 `model.call`，在每次工具尝试外产生 `tool.<name>`。

```listing
title: 包在每次模型调用外的 span
source: capture/lab/prodapp-mac/code/app/middleware.py
lang: python
---
class Tracing(AgentMiddleware):
    async def awrap_model_call(self, request, handler):
        with tracer.start_as_current_span("model.call") as span:
            span.set_attribute("gen_ai.request.model", model_id(request.model))
            span.set_attribute("gen_ai.request.message_count", len(request.messages))
            response = await handler(request)
            message = response.result[-1]
            usage = message.usage_metadata or {}
            span.set_attribute("gen_ai.response.model", message.response_metadata.get("model_name", ""))
            span.set_attribute("gen_ai.usage.input_tokens", usage.get("input_tokens", 0))
            span.set_attribute("gen_ai.usage.output_tokens", usage.get("output_tokens", 0))
            span.set_attribute("gen_ai.response.tool_calls", len(message.tool_calls))
            return response
```

属性名遵循 OpenTelemetry 的生成式 AI 约定。token 数直接取自提供方。Ollama 的是 `prompt_eval_count` 和 `eval_count`，由模型自己的分词器计数。Anthropic 的是响应里的 `usage`。

**我们测得**在 Mac 上，prompt 已在 Ollama 缓存中时，它是否仍报告完整的 prompt 长度。对 Qwen3 4B 发出三次相同的调用，每次报告的 `prompt_eval_count` 都是 65。prompt 评估第一次耗时 1401.9 ms，其中包含加载模型的时间，之后分别是 68.6 ms 和 28.7 ms。所以这个计数就是 prompt 长度，缓存命中只体现在耗时上。

导出器把每个 span 写成文件里的一行 JSON。换成 collector 或任何 OTLP 导出器，中间件都不用改。

```listing
title: 一次 Qwen3 14B 运行中的一个 model.call span
source: capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/test-spans.jsonl
lang: json
note: 文件中的第一个 model.call span，占一行。
---
{"name": "model.call", "context": {"trace_id": "0xc31ff4d300b6481cedfbf16e6295dbf5", "span_id": "0x2d0efd6deeee8df4", "trace_state": "[]"}, "kind": "SpanKind.INTERNAL", "parent_id": "0x37bcefff7e3ac78d", "start_time": "2026-11-15T10:28:39.576564Z", "end_time": "2026-11-15T10:28:42.578468Z", "status": {"status_code": "UNSET"}, "attributes": {"gen_ai.request.model": "qwen3:14b", "gen_ai.request.message_count": 1, "gen_ai.response.model": "qwen3:14b", "gen_ai.usage.input_tokens": 454, "gen_ai.usage.output_tokens": 22, "gen_ai.response.tool_calls": 1}, "events": [], "links": [], "resource": {"attributes": {"telemetry.sdk.language": "python", "telemetry.sdk.name": "opentelemetry", "telemetry.sdk.version": "1.45.2", "service.instance.id": "a07d9619-8c5e-4163-a075-4db5bf1372bf", "service.name": "support-assistant"}, "schema_url": ""}}
```

## span 里有什么 {#s-opentelemetry-spans-with-langsmith-off-what-the-spans-held}

**我们测得**在 Mac 上第一次 Qwen3 14B 套件运行的 span。文件里共有 234 个 span：34 个 `agent.run`、65 个 `model.call`、36 个工具 span 和 99 个 HTTP 请求 span。65 个 `model.call` span 的父 span 都是某个 `agent.run`。有 7 个 span 的状态是 `ERROR`，每一个都对应一个注入的故障：一次 `search_faq`、三次 `read_order` 超时、一次 `create_ticket`，以及两次主模型调用。

FastAPI 0.162.7 通过全局 tracer provider 自己加了 span，每个请求一个。服务用 `telemetry={"operation_spans": False}` 关掉了它的操作 span，请求 span 仍保留。它们有用：一个慢的 `POST /threads/{thread_id}/runs` 和它的 `agent.run` 共享同一个 trace id。

## span 漏掉的模型调用 {#s-opentelemetry-spans-with-langsmith-off-the-model-calls-that-the-spans-miss}

`SummarizationMiddleware` 在自己的钩子里调用模型，不经过 `awrap_model_call`。所以没有 `model.call` span 包住这次调用 {{code libs/langchain_v1/langchain/agents/middleware/summarization.py:520-557}}，用 span 生成的成本报告也就漏掉了它。

服务还通过 LangChain 回调记录每一次模型调用，同时记下提供方的用量和当时所在 span 的名称。**我们测得**用这种方式统计 Claude Haiku 5.5 的 20 项评估，并与成本账本里的 Anthropic 用量对照。账本有 64 次调用、76,076 个输入 token，回调日志有同样的 64 次调用和同样的总数。去掉故障案例（它的调用走了备用模型）后，`model.call` span 只含其中 60,354 个 token。

另外 15,722 个 token 来自两处。摘要器在六轮线程和失控循环中共发出 3 次调用，含 3,966 个输入 token。在失控循环的案例里，测试中间件在调用之后替换了每条模型回复，所以 span 对 8 次计费调用、11,756 个输入 token 记录的是 0 个 token。第二处缺口来自测试本身。第一处缺口存在于每个启用摘要的 agent 的每次运行中。

```figure
id: fig-9-4
kind: chart
title: 每次对话的输入 token：model.call span 内与 span 外
claim: model.call span 只含 76,076 个计费输入 token 中的 60,354 个，其余来自摘要器调用和被替换的回复。
caption: 每根柱是 Claude Haiku 5.5 的一次评估对话，按案例编号排列。梅紫色是 model.call span 内的输入 token，玫红色是 span 外的计费 token。案例 9 没有调用模型，案例 16 只用了备用模型。数据来自 capture/lab/prodapp-mac/summary/cost-mac.json。
```

## 带 trace id 的日志 {#s-opentelemetry-spans-with-langsmith-off-logs-that-carry-the-trace-id}

每行日志都是 JSON，格式化器会加上当前 span 的 trace id 和 span id。下面两行来自 Qwen3 14B 上工具卡死案例的一次运行。`tool.error` 行带的是 `agent.run` 的 span id，不是工具 span 的。`ToolErrorMiddleware` 在重试之外、最后一个工具 span 结束之后才写它。请按 trace id 把日志行与工具 span 关联起来。

```listing
title: 一次运行的两行日志，通过 trace_id 关联到它的 span
source: capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/test-log.jsonl
lang: json
---
{"ts": 1794738671.926, "level": "INFO", "event": "run.start", "thread_id": "7d6ee462-aeeb-43be-bdc1-320a22f92ee8", "user_id": "e14", "trace_id": "f3619cebe3ac7755ec6e9392b2581a61", "span_id": "5226b37abac5ab4b"}
{"ts": 1794738678.029, "level": "INFO", "event": "tool.error", "tool": "read_order", "error": "TimeoutError", "trace_id": "f3619cebe3ac7755ec6e9392b2581a61", "span_id": "5226b37abac5ab4b"}
```

## 关闭 LangSmith {#s-opentelemetry-spans-with-langsmith-off-langsmith-off}

当 `LANGSMITH_TRACING` 为 true 时，LangChain 会把运行记录发给 LangSmith。我们把 `LANGSMITH_ENDPOINT` 指向一个本地记录器，并给了一个假密钥，这样任何上传都会表现为一次请求。然后我们分别在开关为 `true`、`false` 和未设置时各跑一次对话。每次对话先问一个 FAQ 问题，再请求退款并给出金额和原因，最后拒绝审批。

**我们测得**在 Mac 上用 Qwen3 4B 每种设置各跑一次。三次对话里模型都调用了 `search_faq` 和 `refund_order`。

| `LANGSMITH_TRACING` | 发往记录器的请求数 | 字节数 | 路径 |
|---|---|---|---|
| `true` | 10 | 337,363 | `/info`, `/runs/multipart` |
| `false` | 0 | 0 | 无 |
| 未设置 | 0 | 0 | 无 |

对照运行证明记录器能看到上传：一次简短对话就产生了 10 个请求和 337,363 字节。另外两种设置什么都没发。环境里有密钥并不足以发出数据，开关才决定是否发送。

```takeaways
- 用自己的 span 包住模型调用和工具尝试，并带上 gen_ai 的 token 属性。
- token 数取自提供方的用量，并且 span 之外的调用也要记录。
- 每行日志都带上 trace id 和 span id。
- 生产环境不设置 LANGSMITH_TRACING，并用测试确认记录器什么都收不到。
```

来源：capture/lab/prodapp-mac/code/app/middleware.py, capture/lab/prodapp-mac/code/app/telemetry.py, capture/lab/prodapp-mac/code/app/usage.py, capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/scripts/service_real.py, capture/lab/prodapp-mac/code/tests/test_smith_off.py, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/test-spans.jsonl, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/test-log.jsonl, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/usage.jsonl, capture/lab/prodapp-mac/runs/service/service-properties.json, capture/lab/prodapp-mac/runs/ollama-cache-probe.txt, capture/lab/prodapp-mac/runs/suite/haiku/rep-1/usage.jsonl, capture/lab/prodapp-mac/code/scripts/cost_real.py, capture/lab/prodapp-mac/summary/cost-mac.json, capture/lab/prodapp-mac/summary/service-mac.json；libs/langchain_v1/langchain/agents/middleware/summarization.py（langchain==1.5.0）。
