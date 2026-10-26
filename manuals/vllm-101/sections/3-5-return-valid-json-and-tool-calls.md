# 返回有效 JSON 和工具调用

> 结构化输出可以让模型生成有效 JSON；它的开销可通过自己的 schema 测量。

你的应用需要始终能解析的 JSON。读完本节，你可以请求结构化输出，并检查它带来的开销。

## 提供 schema {#s-return-valid-json-and-tool-calls-ask-for-a-schema}

使用结构化输出时，vLLM 会限制下一个 token 的可选范围，只保留能让输出符合 schema 的 token。模型无法生成违反 schema 的文本。你需要在请求中提供 schema，不需要设置服务器参数。

使用 OpenAI client 时，配置 `response_format`：

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")
schema = {
    "type": "object",
    "properties": {"city": {"type": "string"}, "days": {"type": "integer"}},
    "required": ["city", "days"],
}
reply = client.chat.completions.create(
    model="Qwen/Qwen3-8B",
    messages=[{"role": "user", "content": "Plan a trip to Lisbon. Answer in JSON."}],
    response_format={"type": "json_schema", "json_schema": {"name": "trip", "schema": schema}},
)
print(reply.choices[0].message.content)
```

要使用其他约束，可在 `extra_body` 中发送 `structured_outputs`。它可接受 `json`、`json_object`、`regex`、`choice`、`grammar` 或 `structural_tag`。0.12.0 已移除旧的 `guided_json` 和 `guided_*` 字段，使用这些字段的示例已经过时。

## 了解服务器端执行方式 {#s-return-valid-json-and-tool-calls-know-what-runs-on-the-server}

默认 backend 设置为 `auto`，会针对请求选择一个 backend。你也可以指定 `xgrammar`、`guidance`、`outlines` 或 `lm-format-enforcer`。服务器首次遇到 schema 时，会将它编译成 grammar 并缓存。之后的每个生成步骤都会创建允许 token 的 mask，并在采样前应用。

由此会产生两项开销：

- 新 schema 的首次请求需要等待编译。
- 每个生成步骤都要创建 mask，因此每个 token 都增加 CPU 时间。

我们没有在自己的硬件上测量。L4 和 GB10 上的编译时间与 mask 开销都未经测量。

## 返回工具调用 {#s-return-valid-json-and-tool-calls-return-tool-calls}

工具调用需要使用与模型格式匹配的 parser 启动服务器：

```bash
vllm serve Qwen/Qwen3-8B --enable-auto-tool-choice --tool-call-parser hermes
```

parser 会将模型文本解析为响应中的 `tool_calls` 字段。选择与你的模型系列匹配的 parser。vLLM 文档列出了支持的 parser。

## 避免两个已知问题 {#s-return-valid-json-and-tool-calls-avoid-two-known-problems}

- **Speculative decoding。** schema 和 speculation 方法可能对下一个 token 有不同约束。0.31 期间有一项 issue 报告，某个模型使用 MTP speculation 时会输出无效 JSON；该 issue 现已关闭。依赖这两个功能前，分别启用和关闭 `--speculative-config` 测试 schema。
- **推理模型。** 推理模型会先思考再作答，schema 只应约束答案。为模型设置 reasoning parser，让约束从思考结束后开始。[推理模型](#s-serve-reasoning-models)一节展示了相应参数。

## 检查响应 {#s-return-valid-json-and-tool-calls-check-the-result}

即使启用了结构化输出，客户端也要解析每个响应。统计解析失败次数，以及在 JSON 闭合前就达到 `max_tokens` 的请求数。因 token 限制而截断的响应不是有效 JSON。

```takeaways
- 在请求中使用 response_format 或 structured_outputs 提供 schema。
- 不要使用 0.12.0 已移除的 guided_* 字段。
- 依赖 schema 前，先结合 speculative decoding 和推理模型测试。
```

来源：vLLM 0.31.0 源码（vllm/config/structured_outputs.py、vllm/v1/structured_output/），vLLM 0.31.0 文档（docs/features/structured_outputs.md、docs/features/tool_calling.md），vLLM issue 60830。
