# 部署推理模型

> 推理模型会在答案之前先输出思考内容；reasoning parser 会将思考内容从答案文本中分离出来。

Qwen3 服务器返回一大段思考内容，而你只希望得到简短答案。读完本节，你可以分离思考和答案、关闭思考过程并限制其长度。

本手册没有测量推理模型的速度。我们在 L4 上使用 Qwen3-8B-FP8 检查了本节介绍的字段和开关，包括 `reasoning` 字段、按请求或服务器设置 `enable_thinking`、思考预算和流式顺序。其余内容来自 vLLM 0.31.0 文档和源码。

## 了解模型会输出什么 {#s-serve-reasoning-models-know-what-the-model-writes}

**推理模型：**会先在 `<think>`、`</think>` 等标记之间输出推理步骤，再给出最终答案的模型。Qwen3、DeepSeek-R1 和 QwQ 都是推理模型。Qwen3 默认会思考。

没有 reasoning parser 时，vLLM 会将完整输出放在 `content` 中，因此答案开头会包含思考内容。思考内容也会消耗 `max_tokens`，限制太短时，请求可能在答案开始前就结束。

## 启用 parser {#s-serve-reasoning-models-turn-on-the-parser}

使用与模型系列匹配的 parser 启动服务器。Qwen3 使用 `qwen3`：

```bash
vllm serve Qwen/Qwen3-8B --reasoning-parser qwen3 2>&1 | tee server.log
```

默认不启用 parser，vLLM 不会根据模型名称自动选择。vLLM 文档列出了各受支持系列的 parser 名称，例如 DeepSeek-R1 和 QwQ 使用 `deepseek_r1`。

启用 parser 后，chat 响应会包含两个文本字段：

| 字段 | 内容 |
|---|---|
| `choices[0].message.reasoning` | 思考内容，不包含标记 |
| `choices[0].message.content` | 最终答案 |

在流式响应中，每个 chunk 会在 `delta.reasoning` 或 `delta.content` 中包含新增文本。旧版本将字段命名为 `reasoning_content`。0.31.0 响应字段为 `reasoning`，需要更新仍读取旧字段的客户端。

## 关闭思考或限制思考长度 {#s-serve-reasoning-models-turn-the-thinking-off-or-limit-it}

有三种控制方式：

- **针对单个请求。** 在请求体中设置 `"chat_template_kwargs": {"enable_thinking": false}`。使用 OpenAI client 时，将它放在 `extra_body` 中。
- **针对整个服务器。** 启动时设置 `--default-chat-template-kwargs '{"enable_thinking": false}'`。请求仍可以通过自己的 `chat_template_kwargs` 重新开启思考。
- **设置思考预算。** 在请求中发送 `thinking_token_budget`。思考达到 token 上限后，vLLM 会让模型关闭思考并开始作答。此功能需要启用 parser。

`enable_thinking` 这个名称来自 Qwen3 chat template。其他模型系列可能使用不同名称，应检查对应的 chat template。

## 了解 JSON 和工具调用的变化 {#s-serve-reasoning-models-know-what-changes-for-json-and-tools}

启用 reasoning parser 后，结构化输出只约束思考结束后的答案。思考本身是自由文本。Qwen3 parser 也支持工具调用，所以一个请求可以同时返回 `reasoning` 和 `tool_calls`。要使用工具调用，还需使用 `--enable-auto-tool-choice` 和工具调用 parser；例如 Qwen3 使用 `--tool-call-parser hermes`。[JSON](#s-return-valid-json-and-tool-calls)一节会说明如何提供 schema。

带思考的请求应设置较大的 `max_tokens`。如果思考尚未结束就达到上限，`content` 会为空，`finish_reason` 为 `length`。被上限截断的响应不是有效 JSON。

## 检查设置 {#s-serve-reasoning-models-check-the-setup}

分别发送一个开启思考和一个关闭思考的请求：

```bash
curl -s http://localhost:8000/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-8B", "messages": [{"role": "user", "content": "Is 91 a prime number?"}], "max_tokens": 2048}'
```

第一个响应会在 `reasoning` 和 `content` 中都有文本。在请求体中加入 `"chat_template_kwargs": {"enable_thinking": false}` 后再发送一次。第二个响应的 `reasoning` 字段为空或不存在，`content` 会更短。

```takeaways
- 使用 --reasoning-parser 启动推理模型，将思考内容从答案文本中分离。
- 从 content 读取答案，从 reasoning 读取思考内容。
- 用 enable_thinking 关闭思考，或用 thinking_token_budget 限制思考长度。
```

来源：vLLM 0.31.0 文档（docs/features/reasoning_outputs.md、docs/features/structured_outputs.md），vLLM 0.31.0 源码（vllm/reasoning/、vllm/config/structured_outputs.py、vllm/config/reasoning.py、vllm/entrypoints/launchers/cli_args.py、vllm/entrypoints/openai/chat_completion/protocol.py、vllm/sampling_params.py），capture/gpu/out-l4/livecheck-2026-10-22.txt。
