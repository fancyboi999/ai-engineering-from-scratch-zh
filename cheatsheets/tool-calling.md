---
id: tool-calling
title: 工具调用与结构化输出
subtitle: 声明工具、读取调用、返回结果、并行执行、流式接收参数，并约束输出为通过校验的 JSON。
hue: 30
sources: phases/11-llm-engineering/03-structured-outputs, phases/11-llm-engineering/09-function-calling, phases/13-tools-and-protocols/01-the-tool-interface, phases/13-tools-and-protocols/02-function-calling-deep-dive, phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls, phases/13-tools-and-protocols/04-structured-output, phases/13-tools-and-protocols/05-tool-schema-design, phases/19-capstone-projects/21-tool-registry-schema-validation, phases/19-capstone-projects/23-function-call-dispatcher
code: TC
source_hash: 1407bd7b6c38ea4a
---

## 函数调用任务
type: task-table
from: phases/11-llm-engineering/09-function-calling/docs/zh.md

| 任务 | 代码 |
|---|---|
| 声明 OpenAI 工具 | `{"type": "function", "function": {...}}` |
| 声明 Anthropic 工具 | `{"name": ..., "input_schema": {...}}` |
| 让模型决定 | `tool_choice="auto"` |
| 必须调用工具 | `tool_choice="required"` |
| 强制指定工具 | `tool_choice={"type":"function", ...}` |
| 读取 OpenAI 调用 | `message.tool_calls` |
| 查找 Anthropic 调用 | `b.type == "tool_use"` |
| 返回 Anthropic 结果 | `{"type": "tool_result", "tool_use_id": ...}` |

## 结构化输出任务
type: task-table
from: phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md

| 任务 | 代码 |
|---|---|
| 有效 JSON，无 schema | `{ type: "json_object" }` |
| 符合 schema 的 JSON | `{type: "json_schema", strict: true}` |
| 解析为 Pydantic 模型 | `response_format=Product` |
| 读取类型化结果 | `message.parsed` |
| 校验失败时重试 | `instructor.from_openai(OpenAI())` |

## 工具循环
type: architecture
from: phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md, phases/11-llm-engineering/09-function-calling/docs/zh.md

```arch
node | user | 1,1 | 用户 | 消息
node | host | 2,1 | 宿主 | 注册表、循环上限
node | model | 3,1 | 模型 | 文本、调用或拒绝
node | result | 1,2 | 工具结果 | 工具消息、相同标识
node | exec | 2,2 | 执行器 | 由你的代码运行
node | valid | 3,2 | 校验器 | JSON Schema 2020-12
edge | user | host | 消息
edge | host | model | 工具
edge | model | valid | 工具调用
edge | valid | exec | 有效参数
edge | exec | result | 结果
edge | result | host | 观察
```

## 一次工具调用
type: flow
from: phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md, phases/13-tools-and-protocols/01-the-tool-interface/code/main.py, phases/11-llm-engineering/09-function-calling/docs/zh.md

1. **宿主**：声明名称、描述与输入 schema。
2. **模型**：回答、调用工具或拒绝。
3. **模型**：每个调用都带 `id`、`name`、`arguments`。
4. **宿主**：按 schema 校验参数。
5. **执行器**：运行代码，返回可序列化结果。
6. **宿主**：追加携带相同 id 的 `tool` 消息。
7. **宿主**：重复，直到无调用或达到 `MAX_TURNS`。

## OpenAI 一次往返
type: annotated-code
lang: python
from: phases/11-llm-engineering/09-function-calling/docs/zh.md

```python
response = client.chat.completions.create(
    model="gpt-4o", messages=messages,
    tools=tools, tool_choice="auto",           # 模型选择工具或文本
)
tool_call = response.choices[0].message.tool_calls[0]
args = json.loads(tool_call.function.arguments)  # 参数是字符串
result = get_weather(**args)                   # 你的代码执行工具
messages += [
    response.choices[0].message,               # 保留助手轮次
    {"role": "tool", "tool_call_id": tool_call.id,  # 与调用相同的标识
     "content": json.dumps(result)},
]
final = client.chat.completions.create(model="gpt-4o", messages=messages)
```

## 先校验，再修复或拒绝
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/04-structured-output/code/main.py, phases/13-tools-and-protocols/04-structured-output/docs/zh.md

```python
def process_model_output(raw: str, schema: dict) -> ParsedResult:
    if raw.startswith("__REFUSAL__"):            # 模型拒绝，不重试
        return ParsedResult("refusal", raw.removeprefix("__REFUSAL__").strip(), [])
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:            # 失败类型 1：不是 JSON
        return ParsedResult("parse_error", None, [ValidationError("$", str(e))])
    errs = validate(schema, parsed)              # 路径与消息列表
    if errs:
        return ParsedResult("violation", parsed, errs)  # 注入错误后重试
    return ParsedResult("ok", parsed, [])
```

## 各提供商的结构
type: concepts
from: phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md

- **Schema 字段**：`parameters`、`input_schema`、Gemini 的 `parameters`。
- **调用**：`tool_calls[]`、`tool_use` 块、`functionCall` 内容块。
- **参数**：OpenAI 发送字符串，其他提供商发送对象。
- **结果关联**：`tool_call_id`、`tool_use_id`、`functionResponse` id。
- **禁止工具**：`tool_choice: "none"`、`{type: "none"}`、`mode: "NONE"`。
- **严格模式**：`strict: true`、始终开启、`responseSchema`。

## 并行与流式调用
type: concepts
from: phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md, phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/code/main.py

- **开启**：OpenAI 默认 `parallel_tool_calls: true`。
- **串行**：调用相互依赖时关闭并行。
- **关联**：每个结果携带调用标识，返回顺序不限。
- **OpenAI 流**：按 `index` 拼接分块，直到 `finish_reason = "tool_calls"`。
- **Anthropic 流**：接收 `input_json_delta`，直到 `content_block_stop`。
- **延迟解析**：不完整 JSON 会报错，在结束信号后解析。
- **延迟**：400、600、800 ms 的调用，串行为 1800 ms，并行为 800 ms。

## Schema 设计规则
type: concepts
from: phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md

- **名称**：使用 `snake_case`，先动词后名词，如 `get_weather`。名称中不放参数。
- **描述**：“在 {条件} 时使用。不要用于 {相近但不适用的场景}。”
- **枚举**：封闭集合都放入 `enum`。
- **原子工具**：`action` 超过三个值时拆分工具。
- **严格模式**：所有属性加入 `required`，设置 `additionalProperties: false`，不使用 `$ref`。

## 限制与默认值
type: defaults
from: phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md, phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md, phases/13-tools-and-protocols/01-the-tool-interface/code/main.py, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| OpenAI 每请求工具数 | 128 | 硬上限 |
| Anthropic 每请求工具数 | 64 | 硬上限 |
| OpenAI schema 深度 | 5 | 严格模式 |
| OpenAI 参数字符串 | 8192 字节 | 最大大小 |
| 描述长度 | 1024 字符 | 更长的文本会截断 |
| `MAX_TURNS` | 5 | 课程循环上限 |
| 修复重试 | 3 次 | 更多次数通常表示 schema 有问题 |
| `timeout_ms` | 30_000 | 每个工具记录的限制 |

## 故障排查
type: troubleshooting
from: phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md, phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 流中途 `json.loads` 报错 | 参数尚未形成完整 JSON | 调用结束信号后解析 |
| 严格模式下请求返回 400 | 违反严格 schema 规则 | 全部加入 `required`，不使用 `$ref` |
| 选错工具 | 两个工具描述重叠 | 增加“不要用于”说明 |
| 值不在 `enum` 中 | 仅靠 prompt 约束输出 | 使用约束解码 |
| 响应包含 `refusal` | 输入不适合该 schema | 按类型化结果处理 |
| `input` 包含额外字段 | Anthropic schema 只作提示 | 服务端校验 |
| schema 错误被重试 | 错误是确定性的 | 修正参数，不重试 |
| 结果关联到错误调用 | 按名称而非 id 匹配 | 每个结果返回自己的 id |

## 问答
type: qa
from: phases/11-llm-engineering/09-function-calling/docs/zh.md, phases/13-tools-and-protocols/01-the-tool-interface/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md

- **结构化输出还是调用？** 输出是最终数据，调用是请求执行动作。
- **为何不直接要求 JSON？** 这种方式有 5% 至 15% 的失败率。
- **为何需要调用标识？** 并行结果可能乱序返回。
- **Schema 能识别错误值吗？** 不能，类型正确的值仍可能是编造的。

## 提示
type: tips
from: phases/11-llm-engineering/09-function-calling/docs/zh.md, phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/19-capstone-projects/21-tool-registry-schema-validation/docs/zh.md

- 将错误作为结果返回：`{"error": true, "code": "CITY_NOT_FOUND"}`。
- 编写模型可理解的错误，如“缺少必填字段 city”。
- 使用 JSON pointer 路径报告错误，如 `/user/email`。
- 将关键字段设为必填，模型仍可能写入 `null`。
- 只暴露用户需要的函数。
