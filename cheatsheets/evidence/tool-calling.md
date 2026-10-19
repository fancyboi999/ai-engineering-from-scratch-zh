# 证据对照：工具调用与结构化输出

中文主题：[工具调用与结构化输出](../tool-calling.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 函数调用任务

对应主题区块：**函数调用任务**（`task-table`）。

来源文件：

- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)

构建器核对的标识与数值：

- `input_schema`
- `tool_choice`
- `message.tool_calls`
- `tool_calls`
- `b.type`
- `tool_use`
- `tool_result`
- `tool_use_id`

## 结构化输出任务

对应主题区块：**结构化输出任务**（`task-table`）。

来源文件：

- [`phases/11-llm-engineering/03-structured-outputs/docs/zh.md`](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)

构建器核对的标识与数值：

- `json_object`
- `json_schema`
- `response_format`
- `message.parsed`
- `instructor.from_openai`
- `from_openai`
- `OpenAI`

## 工具循环

对应主题区块：**工具循环**（`architecture`）。

来源文件：

- [`phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md`](../../phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md)
- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 一次工具调用

对应主题区块：**一次工具调用**（`flow`）。

来源文件：

- [`phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md`](../../phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md)
- [`phases/13-tools-and-protocols/01-the-tool-interface/code/main.py`](../../phases/13-tools-and-protocols/01-the-tool-interface/code/main.py)
- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)

构建器核对的标识与数值：

- `MAX_TURNS`

## OpenAI 一次往返

对应主题区块：**OpenAI 一次往返**（`annotated-code`）。

来源文件：

- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)

构建器核对的标识与数值：

- `client.chat.completions.create`
- `create`
- `tool_choice`
- `response.choices`
- `message.tool_calls`
- `tool_call`
- `tool_calls`
- `json.loads`
- `tool_call.function.arguments`
- `loads`
- `get_weather`
- `tool_call.id`
- `tool_call_id`
- `json.dumps`
- `dumps`

## 先校验，再修复或拒绝

对应主题区块：**先校验，再修复或拒绝**（`annotated-code`）。

来源文件：

- [`phases/13-tools-and-protocols/04-structured-output/code/main.py`](../../phases/13-tools-and-protocols/04-structured-output/code/main.py)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)

构建器核对的标识与数值：

- `process_model_output`
- `raw.startswith`
- `startswith`
- `raw.removeprefix`
- `ParsedResult`
- `removeprefix`
- `strip`
- `json.loads`
- `loads`
- `json.JSONDecodeError`
- `parse_error`
- `ValidationError`
- `str`
- `validate`

## 各提供商的结构

对应主题区块：**各提供商的结构**（`concepts`）。

来源文件：

- [`phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md`](../../phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md)

构建器核对的标识与数值：

- `input_schema`
- `tool_calls`
- `tool_use`
- `tool_call_id`
- `tool_use_id`
- `tool_choice`

## 并行与流式调用

对应主题区块：**并行与流式调用**（`concepts`）。

来源文件：

- [`phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md`](../../phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md)
- [`phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/code/main.py`](../../phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/code/main.py)

构建器核对的标识与数值：

- `parallel_tool_calls`
- `finish_reason`
- `tool_calls`
- `input_json_delta`
- `content_block_stop`

## Schema 设计规则

对应主题区块：**Schema 设计规则**（`concepts`）。

来源文件：

- [`phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md`](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)

构建器核对的标识与数值：

- `snake_case`
- `get_weather`

## 限制与默认值

对应主题区块：**限制与默认值**（`defaults`）。

来源文件：

- [`phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md`](../../phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md)
- [`phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md`](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)
- [`phases/13-tools-and-protocols/01-the-tool-interface/code/main.py`](../../phases/13-tools-and-protocols/01-the-tool-interface/code/main.py)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)
- [`phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py`](../../phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py)

构建器核对的标识与数值：

- `128`
- `64`
- `5`
- `8192`
- `1024`
- `MAX_TURNS`
- `3`
- `timeout_ms`
- `30_000`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md`](../../phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)
- [`phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md`](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)
- [`phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md`](../../phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md)
- [`phases/11-llm-engineering/03-structured-outputs/docs/zh.md`](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)
- [`phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md`](../../phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md)

构建器核对的标识与数值：

- `json.loads`

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)
- [`phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md`](../../phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md)
- [`phases/13-tools-and-protocols/04-structured-output/docs/zh.md`](../../phases/13-tools-and-protocols/04-structured-output/docs/zh.md)
- [`phases/11-llm-engineering/03-structured-outputs/docs/zh.md`](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/11-llm-engineering/09-function-calling/docs/zh.md`](../../phases/11-llm-engineering/09-function-calling/docs/zh.md)
- [`phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md`](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)
- [`phases/11-llm-engineering/03-structured-outputs/docs/zh.md`](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)
- [`phases/19-capstone-projects/21-tool-registry-schema-validation/docs/zh.md`](../../phases/19-capstone-projects/21-tool-registry-schema-validation/docs/zh.md)

构建器核对的标识与数值：

- `CITY_NOT_FOUND`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/tool-calling.md

Paths are relative to /private/tmp/aiefs-cheatsheets/phases/. A = 11-llm-engineering/03-structured-outputs/docs/en.md, F = 11-llm-engineering/09-function-calling/docs/en.md, T1 = 13-tools-and-protocols/01-the-tool-interface, T2 = 13-tools-and-protocols/02-function-calling-deep-dive/docs/en.md, T3 = 13-tools-and-protocols/03-parallel-and-streaming-tool-calls, T4 = 13-tools-and-protocols/04-structured-output, T5 = 13-tools-and-protocols/05-tool-schema-design/docs/en.md, C21 = 19-capstone-projects/21-tool-registry-schema-validation, C23 = 19-capstone-projects/23-function-call-dispatcher

## Function call tasks (task-table, 8)
- declare OpenAI {"type": "function", "function": {...}}: F:63-67, F:582-584
- declare Anthropic {"name", "input_schema"}: F:632-635, F:662
- tool_choice="auto": F:602, F:107
- tool_choice="required": F:96, F:109
- force one tool tool_choice={"type":"function", ...}: F:111
- message.tool_calls: F:605, F:620
- b.type == "tool_use": F:647
- tool_result with tool_use_id: F:657

## Structured output tasks (task-table, 5)
- { type: "json_object" } JSON mode, no schema guarantee: A:55
- {type: "json_schema", strict: true}: T4/docs/en.md:29
- response_format=Product with beta.chat.completions.parse: A:441-447
- message.parsed: A:450
- instructor.from_openai, retries with validation errors: A:493, A:507

## The tool loop (architecture, 6 nodes, 6 edges)
- User, Host holds registry, loop bound: T1/docs/en.md:21, 57, 148; F:40-46
- Model text, call or refuse: T1/docs/en.md:41-45
- Validator JSON Schema 2020-12: T1/docs/en.md:35, 51
- Executor your code: T1/docs/en.md:53; F:57
- Tool result as tool message with same id: T1/docs/en.md:57, 142
- edges message, tools, tool call, valid args, result, observe: F:45-51; T1/docs/en.md:21, 51, 57

## One tool call (flow, 7)
1. declare name, description, input schema: T1/docs/en.md:31-35
2. answer, call, refuse: T1/docs/en.md:41-45
3. id, name, arguments: T1/docs/en.md:47
4. validate arguments: T1/docs/en.md:51
5. executor, serializable result: T1/docs/en.md:53
6. tool message with matching id: T1/docs/en.md:57
7. repeat until no calls or MAX_TURNS: T1/docs/en.md:57; T1/code/main.py:28, 184

## OpenAI round trip (annotated-code, 13 lines)
- create with model, messages, tools, tool_choice="auto": F:598-603
- tool_calls[0]: F:605
- json.loads(tool_call.function.arguments), arguments are a string: F:606; T2:50
- get_weather(**args): F:607
- assistant message, tool message with tool_call_id and json.dumps(result): F:611-615
- final create: F:609-616 (messages list shortened to a variable)

## Validate, then repair or refuse (annotated-code, 11 lines)
- process_model_output body: T4/code/main.py:125-136 (docstring line 126 left out)
- refusal does not retry: T4/docs/en.md:115
- inject errors and retry: T4/docs/en.md:95

## Shapes by provider (concepts, 6)
- schema field: T2:48
- call container: T2:49
- arguments string vs object: T2:50
- result link: T2:52
- forbid tools: T2:54
- strict schema: T2:55

## Parallel and streaming calls (concepts, 7)
- parallel_tool_calls: true default: T3/docs/en.md:51
- serial when dependent: T3/docs/en.md:55
- correlate by id, order free: T3/docs/en.md:59, 101
- OpenAI per index until finish_reason = "tool_calls": T3/docs/en.md:77
- Anthropic input_json_delta, content_block_stop: T3/docs/en.md:78
- partial JSON raises, parse at end signal: T3/docs/en.md:83
- 400, 600, 800 ms: 1800 serial, 800 parallel: T3/docs/en.md:105; T3/code/main.py:25

## Schema design rules (concepts, 5)
- snake_case, verb-noun, no arguments in name: T5:33-38
- Use when ... Do not use for ...: T5:45
- enum every closed set: T5:86
- split when action has more than three values: T5:82
- strict: required, additionalProperties: false, no $ref: T4/docs/en.md:51

## Limits and defaults (defaults, 8)
- OpenAI 128 tools, schema depth 5, 8192 bytes: T2:59
- Anthropic 64 tools: T2:60
- 1024 characters, truncated: T5:57
- MAX_TURNS 5: T1/code/main.py:28
- retries max 3x, more means bad schema: T4/docs/en.md:95, 98
- timeout_ms 30_000: C21/code/main.py:58

## Troubleshooting (troubleshooting, 8)
- json.loads on partial JSON: T3/docs/en.md:83
- 400 at request time in strict mode: T4/docs/en.md:51
- wrong tool, overlapping descriptions, Do not use for: T5:21, 55
- enum confusion, constrained decoding: A:128
- refusal as typed outcome: T4/docs/en.md:72, 88
- extra fields, Anthropic advisory, validate server-side: T2:97
- schema errors deterministic, no retry: C23/docs/en.md:59
- matched by name breaks, return ids: T3/docs/en.md:63

## Questions and answers (qa, 4)
- structured output vs call: F:130-134
- prompt JSON fails 5 to 15 percent: T1/docs/en.md:81
- call id for out-of-order parallel results: T1/docs/en.md:47
- schema cannot catch invented values: A:126

## Tips (tips, 5)
- structured error result with CITY_NOT_FOUND: F:156-162
- errors for the model, 'city' is required: T5:98
- JSON pointer paths /user/email: C21/docs/en.md:68
- make key fields required, explicit null: A:134
- expose only needed functions: F:142
````
