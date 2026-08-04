# Function Calling 深入剖析——OpenAI、Anthropic、Gemini

> 三家前沿 provider 在 2024 年收敛到了同一个工具调用循环上，然后在其他一切上各自发散。OpenAI 用 `tools` 和 `tool_calls`。Anthropic 用 `tool_use` 和 `tool_result` block。Gemini 用 `functionDeclarations` 和唯一 id 关联。本课把三者并排做 diff，让在一家 provider 上跑通的代码，移植时不至于直接崩掉。

**类型：** Build
**语言：** Python（标准库，schema 翻译器）
**前置要求：** 阶段 13 · 01（工具接口）
**预计时间：** ~75 分钟

## 学习目标

- 说出 OpenAI、Anthropic、Gemini 的 function-calling 载荷之间三处形状差异（声明、调用、结果）。
- 把一个工具声明跨三种 provider 格式翻译一遍，并预测严格模式约束会在哪里出现分歧。
- 在每家 provider 里用 `tool_choice` 来强制、禁止或自动挑选工具调用。
- 知道每家 provider 的硬上限（工具数量、schema 深度、参数长度），以及越限时各自抛出的错误特征。

## 问题背景

function-calling 请求的形状因 provider 而异。来自 2026 年生产栈的三个具体例子：

**OpenAI Chat Completions / Responses API。** 你传 `tools: [{type: "function", function: {name, description, parameters, strict}}]`。模型的响应里包含 `choices[0].message.tool_calls: [{id, type: "function", function: {name, arguments}}]`，其中 `arguments` 是一个你必须解析的 JSON 字符串。严格模式（`strict: true`）通过受约束解码强制 schema 合规。

**Anthropic Messages API。** 你传 `tools: [{name, description, input_schema}]`。响应回来是 `content: [{type: "text"}, {type: "tool_use", id, name, input}]`。`input` 已经解析好了（是对象，不是字符串）。你用一条新的 `user` 消息回复，里面装一个 `{type: "tool_result", tool_use_id, content}` block。

**Google Gemini API。** 你传 `tools: [{functionDeclarations: [{name, description, parameters}]}]`（嵌在 `functionDeclarations` 下）。响应到达时是 `candidates[0].content.parts: [{functionCall: {name, args, id}}]`，其中 `id` 从 Gemini 3 起为并行调用关联而唯一。你用 `{functionResponse: {name, id, response}}` 回复。

同一个循环。不同的字段名、不同的嵌套、不同的字符串 vs 对象约定、不同的关联机制。一个在 OpenAI 上写了天气 agent 的团队，光是为了管线本身，就得付出两天移植到 Anthropic、再一天移植到 Gemini 的代价。

本课构建一个翻译器，把三种格式统一为一份规范化的工具声明，并在边缘做路由。阶段 13 · 17 把同样的模式一般化为一个 LLM 网关。

## 核心概念

### 共通结构

每家 provider 都需要五样东西：

1. **工具清单。** 每个工具的 name、description 和输入 schema。
2. **工具选择。** 强制某个特定工具、禁止工具，或让模型决定。
3. **调用发射。** 指明工具和参数的结构化输出。
4. **调用 id。** 把响应关联到正确的调用（对并行很重要）。
5. **结果注入。** 一条消息或一个 block，把结果系回到调用上。

### 形状差异，逐字段对照

| 方面 | OpenAI | Anthropic | Gemini |
|--------|--------|-----------|--------|
| 声明外壳 | `{type: "function", function: {...}}` | `{name, description, input_schema}` | `{functionDeclarations: [{...}]}` |
| schema 字段 | `parameters` | `input_schema` | `parameters` |
| 响应容器 | assistant 消息上的 `tool_calls[]` | 类型为 `tool_use` 的 `content[]` | 类型为 `functionCall` 的 `parts[]` |
| arguments 类型 | 字符串化 JSON | 已解析对象 | 已解析对象 |
| id 格式 | `call_...`（OpenAI 生成） | `toolu_...`（Anthropic） | UUID（Gemini 3+） |
| 结果 block | 角色 `tool`，`tool_call_id` | 带 `tool_result` 的 `user`，`tool_use_id` | 带匹配 `id` 的 `functionResponse` |
| 强制某工具 | `tool_choice: {type: "function", function: {name}}` | `tool_choice: {type: "tool", name}` | `tool_config: {function_calling_config: {mode: "ANY"}}` |
| 禁止工具 | `tool_choice: "none"` | `tool_choice: {type: "none"}` | `mode: "NONE"` |
| 严格 schema | `strict: true` | schema 即 schema（始终强制） | 请求层面的 `responseSchema` |

### 你真的会撞上的上限

- **OpenAI。** 每请求 128 个工具。schema 深度 5。参数字符串 <= 8192 字节。严格模式要求没有 `$ref`、没有重叠的 `oneOf`/`anyOf`/`allOf`、每个 property 都列进 `required`。
- **Anthropic。** 每请求 64 个工具。schema 深度实际上无界但实用上限为 10。没有严格模式标志；schema 是一份契约，模型倾向于遵守。
- **Gemini。** 每请求 64 个 function。schema 类型是 OpenAPI 3.0 子集（与 JSON Schema 2020-12 略有分歧）。并行调用从 Gemini 3 起带唯一 id。

### `tool_choice` 行为

三种人人都支持的模式，只是命名不同。

- **Auto。** 模型挑工具或文本。默认。
- **Required / Any。** 模型必须至少调用一个工具。
- **None。** 模型不得调用工具。

外加每家 provider 各自独有的一种模式：

- **OpenAI。** 按名字强制某个特定工具。
- **Anthropic。** 按名字强制某个特定工具；`disable_parallel_tool_use` 标志把单调用和多调用分开。
- **Gemini。** `mode: "VALIDATED"` 不管模型意图如何，都让每个响应过一遍 schema 校验器。

### 并行调用

OpenAI 的 `parallel_tool_calls: true`（默认）在一条 assistant 消息里吐出多个调用。你把它们全跑掉，然后用一条批量的 tool 角色消息回复，每个 `tool_call_id` 对应一条。Anthropic 历史上是单调用；`disable_parallel_tool_use: false`（自 Claude 3.5 起为默认）开启多调用。Gemini 2 允许并行调用但没给稳定 id；Gemini 3 加上了 UUID，让乱序响应能干净地关联。

### 流式

三家都支持流式工具调用。线上格式各异：

- **OpenAI。** `tool_calls[i].function.arguments` 的增量分块逐步到达。你累积到 `finish_reason: "tool_calls"` 为止。
- **Anthropic。** block-start / block-delta / block-stop 事件。`input_json_delta` 分块携带部分参数。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 新增）吐出带 `functionCallId` 的分块，使多个并行调用能交错。

阶段 13 · 03 深入讲并行 + 流式重组。本课聚焦于声明和单调用的形状。

### 错误与修复

参数非法的错误看起来也各不相同。

- **OpenAI（非严格）。** 模型返回 `arguments: "{bad json}"`，你的 JSON 解析失败，你注入一条错误消息并重新调用。
- **OpenAI（严格）。** 校验在解码期间发生；非法 JSON 不可能出现，但 `refusal` 可能出现。
- **Anthropic。** `input` 可能含有意料之外的字段；schema 是建议性的。在服务端做校验。
- **Gemini。** OpenAPI 3.0 的怪癖：对象字段上的 `enum` 会被静默忽略；自己校验。

### 翻译器模式

你代码里一份规范化的工具声明长这样（形状由你定）：

```python
Tool(
    name="get_weather",
    description="Use when ...",
    input_schema={"type": "object", "properties": {...}, "required": [...]},
    strict=True,
)
```

三个小函数把它翻译成三种 provider 形状。`code/main.py` 里的脚手架正是这么做的，然后让一个假工具调用经由每家 provider 的响应形状走一个来回。不需要网络——本课教的是形状，不是 HTTP。

生产团队把这个翻译器包进 `AbstractToolset`（Pydantic AI）、`UniversalToolNode`（LangGraph）或 `BaseTool`（LlamaIndex）。阶段 13 · 17 交付一个网关，在三者之中任意一个前面暴露一套 OpenAI 形状的 API。

```figure
function-call-args
```

## 实际使用

`code/main.py` 定义一个规范化的 `Tool` dataclass 和三个翻译器，分别吐出 OpenAI、Anthropic、Gemini 的声明 JSON。它接着把每种形状一份手工编造的 provider 响应解析成同一个规范化的调用对象，证明它们皮下的语义是一致的。跑一跑，把三份声明并排 diff。

要看什么：

- 三个声明 block 只在外壳和字段名上不同。
- 三个响应 block 在调用所处的位置上不同（顶层 `tool_calls`、`content[]` block、`parts[]` 条目）。
- 一个 `canonical_call()` 函数从三种响应形状里都提取出 `{id, name, args}`。

## 拿去用

本课产出 `outputs/skill-provider-portability-audit.md`。给定一份针对某家 provider 的 function-calling 集成，这个 skill 产出一份可移植性审计：它依赖了哪些 provider 上限、哪些字段需要改名、移植到另外每家 provider 时会有什么崩掉。

## 练习

1. 跑 `code/main.py`，验证三份 provider 声明 JSON 都序列化自同一个底层 `Tool` 对象。修改规范化工具，加一个 enum 参数，确认只有 Gemini 翻译器需要处理那个 OpenAPI 怪癖。

2. 给每家 provider 加一个 `ListToolsResponse` 解析器，提取模型在一次 `list_tools` 或发现调用后返回的工具清单。OpenAI 原生没有这个；记下这处不对称。

3. 实现 `tool_choice` 转换：把一个规范化的 `ToolChoice(mode="force", tool_name="x")` 映射成三种 provider 形状。然后映射 `mode="any"` 和 `mode="none"`。对照本课的 diff 表。

4. 三家 provider 里挑一家，从头到尾读它的 function-calling 指南。找出它 schema 规范里一个另外两家不支持的字段。候选：OpenAI `strict`、Anthropic `disable_parallel_tool_use`、Gemini `function_calling_config.allowed_function_names`。

5. 写一个测试向量：一个参数违反声明 schema 的工具调用。让它过一遍每家 provider 的校验器（第 01 课里的标准库版本可以当代理用），记录哪些错误触发了。记录你在生产环境中会用哪家 provider 来追求严格性。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Function calling | "工具调用" | provider 层面的结构化工具调用发射 API |
| Tool declaration | "工具规格" | name + description + JSON Schema 输入载荷 |
| `tool_choice` | "强制 / 禁止" | auto / required / none / 指定名字 几种模式 |
| Strict mode | "schema 强制" | OpenAI 的标志，把解码约束到匹配 schema |
| `tool_use` block | "Anthropic 的调用形状" | 内联内容 block，带 id、name、input |
| `functionCall` part | "Gemini 的调用形状" | 一个 `parts[]` 条目，含 name、args 和 id |
| Arguments-as-string | "字符串化 JSON" | OpenAI 把 args 作为 JSON 字符串返回，不是对象 |
| Parallel tool calls | "一轮内扇出" | 一条 assistant 消息里的多个工具调用 |
| Refusal | "模型拒绝" | 仅严格模式下出现的 refusal block，而非调用 |
| OpenAPI 3.0 subset | "Gemini schema 怪癖" | Gemini 用一种类似 JSON Schema 的方言，有细微差异 |

## 延伸阅读

- [OpenAI — Function calling guide](https://platform.openai.com/docs/guides/function-calling) — 权威参考，含严格模式与并行调用
- [Anthropic — Tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) — `tool_use` 与 `tool_result` block 语义
- [Google — Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) — 并行调用、唯一 id 和 OpenAPI 子集
- [Vertex AI — Function calling reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) — Gemini 的企业级表面
- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式 schema 强制的细节
