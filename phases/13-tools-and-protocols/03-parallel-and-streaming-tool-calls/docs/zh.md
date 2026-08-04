# 并行工具调用与带工具的流式

> 三次相互独立的天气查询串行起来就是三个来回。把它们并行跑，总耗时塌缩到最慢的那一次调用。如今每家前沿 provider 都能在一轮里吐出多个工具调用。收益是实打实的；管线却很微妙。本课走两半：并行扇出，以及流式参数的重组，重点放在 id 关联这个陷阱上。

**类型：** Build
**语言：** Python（标准库，线程池 + 流式脚手架）
**前置要求：** 阶段 13 · 02（function calling 深入剖析）
**预计时间：** ~75 分钟

## 学习目标

- 解释 `parallel_tool_calls: true` 为何存在，以及何时该关掉它。
- 在并行扇出过程中，把流式参数分块关联到正确的工具调用 id 上。
- 把部分的 `arguments` 字符串重组为完整 JSON，且不提前解析。
- 跑一个三城市天气基准，演示串行 vs 并行的延迟。

## 问题背景

没有并行调用时，一个 agent 回答"班加罗尔、东京、苏黎世天气怎么样"会这样做：

```
user -> LLM
LLM -> 调用 get_weather(Bengaluru)
host -> 运行执行器，带结果回复
LLM -> 调用 get_weather(Tokyo)
host -> 运行执行器，带结果回复
LLM -> 调用 get_weather(Zurich)
host -> 运行执行器，带结果回复
LLM -> 最终文本答案
```

三个 LLM 来回，每一个还要付执行器延迟。大约是理想墙钟时间的 4 倍。

有并行调用时：

```
user -> LLM
LLM -> 调用 get_weather(Bengaluru); 调用 get_weather(Tokyo); 调用 get_weather(Zurich)
host -> 并发跑完三个执行器，带三个结果回复
LLM -> 最终文本答案
```

一个 LLM 来回。执行器时间是三者的最大值，不是总和。OpenAI、Anthropic、Gemini 上的生产基准显示，扇出工作负载的墙钟时间减少 60% 到 70%。

代价是关联的复杂度。当三个调用乱序完成时，你的结果必须携带匹配的 `tool_call_id`，模型才能把它们对上号。当结果以流式返回时，你必须先把部分参数片段拼成完整 JSON 再执行。Gemini 3 加上唯一 id，部分就是为了解决一个真实问题：对同一个工具的两次并行调用无法区分。

## 核心概念

### 开启并行

- **OpenAI。** `parallel_tool_calls: true` 默认开启。设为 `false` 强制串行。
- **Anthropic。** 经由 `disable_parallel_tool_use: false` 并行（Claude 3.5 及以上默认）。设为 `true` 串行。
- **Gemini。** 始终具备并行能力；`tool_config.function_calling_config.mode = "AUTO"` 让模型决定。

当工具有顺序依赖（先 `create_file` 再 `write_file`）、当一个调用的输出决定另一个的输入、或当限流器扛不住扇出时，关掉并行。

### id 关联

模型吐出的每个调用都有一个 `id`。宿主返回的每个结果都必须带上同一个 id。没有它，结果就有歧义。

- **OpenAI。** 每条 tool 角色消息上的 `tool_call_id`。
- **Anthropic。** 每个 `tool_result` block 上的 `tool_use_id`。
- **Gemini。** 每个 `functionResponse` 上的 `id`（Gemini 3 及以上；Gemini 2 按名字匹配，对同名并行调用就崩了）。

### 并发地跑调用

宿主把每个调用的执行器跑在各自的线程、协程或远程 worker 上。最简单的脚手架用线程池；生产环境用 asyncio 配 `asyncio.gather` 或结构化并发。完成顺序不可预测——id 才是标识符。

一个常见 bug：按调用清单顺序而非完成顺序回复结果。这通常能行，因为模型只在乎 `tool_call_id`，但如果某个结果被丢了或重复了，乱序提交会让调试更难。优先按完成顺序、带显式 id 回复。

### 流式工具调用

当模型流式输出时，`arguments` 是一片片到达的。三个并行调用的三股分块流在线上交错。你需要每个 id 一个累加器。

按 provider 的形状：

- **OpenAI。** 每个分块是 `choices[0].delta.tool_calls[i].function.arguments`（部分字符串）。分块携带 `index`（在调用清单里的位置）。你按 index 累积，在 `id` 首次出现时读它，并在 `finish_reason = "tool_calls"` 时解析 JSON。
- **Anthropic。** 流事件是 `message_start`，然后每个 block 一个类型为 `tool_use` 的 `content_block_start`（含 id、name、空 input）。`content_block_delta` 事件携带 `input_json_delta` 分块。`content_block_stop` 关闭每个 block。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 及以上）吐出带 `functionCallId` 的分块，使调用干净地交错。Gemini 3 之前，流式一次返回一个完整调用。

### 部分 JSON 与提前解析陷阱

`arguments` 没完整之前你不能解析它。像 `{"city": "Beng` 这样的部分 JSON 不合法，会抛错。正确的门槛是 provider 的调用结束信号：OpenAI 的 `finish_reason = "tool_calls"`、Anthropic 的 `content_block_stop`，或 Gemini 的流结束事件。只有到那时才尝试 `json.loads`。更稳健的做法是用一个增量 JSON 解析器，在结构补全时逐步产出事件；OpenAI 的流式指南为展示实时"思考中"指示器的 UX 推荐这么做。数括号作为完整性测试并不可靠（引号字符串内或转义内容里的括号会造成误判），只应作为非正式的调试启发式来用。

### 乱序完成

```
call_A: 快的 API，最先返回
call_B: 慢的 API，第二个返回
call_C: 中等的 API，第三个返回
```

宿主回复仍必须引用这些 id：

```
[{role: "tool", tool_call_id: "call_A", content: ...},
 {role: "tool", tool_call_id: "call_B", content: ...},
 {role: "tool", tool_call_id: "call_C", content: ...}]
```

在 OpenAI 或 Anthropic 上，回复里的顺序对正确性无所谓。只要 id 匹配，Gemini 接受任意顺序。

### 基准：串行 vs 并行

`code/main.py` 里的脚手架模拟三个延迟为 400、600、800 ms 的执行器。串行总共跑 1800 ms。并行跑 max(400, 600, 800) = 800 ms。差距是常数，而非比例，所以省下的时间随工具数量增长。

现实告诫：并行调用会给下游 API 加压。对一个限流的服务做 10 路扇出会失败。阶段 13 · 17 讲网关层面的背压；重试语义计划放在后续阶段。

### 流式扇出的墙钟时间

如果模型本身流式输出，你可以在某个调用的参数一完整就开始执行它，而不必等所有调用都敲定。这是 OpenAI 有文档的一项优化，但不是所有 SDK 都暴露它。本课的脚手架做了：模拟流一产出完整参数对象，宿主就启动那个调用。

```figure
tp-parallel-fanout
```

## 实际使用

`code/main.py` 有两半。第一半用 `concurrent.futures.ThreadPoolExecutor` 把三个模拟天气调用串行和并行各跑一遍，并打印墙钟时间。第二半重放一个假的流式响应——三个并行调用的 `arguments` 分块在一股流上交错——并用 `StreamAccumulator` 按 id 把它们重组。没有 LLM、没有网络，只有重组逻辑。

要看什么：

- 串行计时器到 1.8 秒。在同样的假延迟上，并行计时器到 0.8 秒。
- 累加器靠按 id 缓冲、且只在每个调用的 JSON 完整时才解析，来处理乱序到达的分块。
- 执行器在某个 id 的参数敲定时就启动，而非等所有流都结束。

## 拿去用

本课产出 `outputs/skill-parallel-call-safety-check.md`。给定一份工具注册表，这个 skill 审计哪些工具可以安全并行、哪些有顺序依赖、哪些会压垮下游限流——返回一份带每工具 `parallel_safe` 标志的修订注册表。

## 练习

1. 跑 `code/main.py` 并改动那些模拟延迟。确认并行对串行的比值大约是 `max/sum`（真实运行因线程调度、序列化和脚手架开销而略微偏离理想值）。在什么样的延迟分布下，并行就不重要了？

2. 扩展累加器，处理"调用流到一半被取消"的情况：丢掉它的缓冲并发出一个 `cancelled` 事件。哪家 provider 明确为这种情况写了文档？查 Anthropic 的 `content_block_stop` 语义和 OpenAI 的 `finish_reason: "length"` 行为。

3. 把线程池换成 `asyncio.gather`。给两者都做基准。你应该看到 async 因更低的上下文切换成本而有小幅领先，但只有当执行器做真实 I/O 时才会。

4. 挑两个不该并行的工具（比如先 `create_file` 再 `write_file`）。给注册表加一个 `ordering_dependency` 图，并在那张图上为并行扇出设门槛。这是依赖感知调度的最小机制，后续某个 agent 工程阶段会把它正式化。

5. 读 OpenAI 的 parallel-function-calling 章节和 Anthropic 的 `disable_parallel_tool_use` 文档。找出 Anthropic 建议关闭并行的那一种真实工具类型。（提示：对同一资源的有后果的变更。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Parallel tool calls | "一轮内扇出" | 模型在一条 assistant 消息里吐出多个工具调用 |
| `parallel_tool_calls` | "OpenAI 的标志" | 开启或关闭多调用发射 |
| `disable_parallel_tool_use` | "Anthropic 的反向标志" | 退出标志；默认是开启并行 |
| Tool call id | "关联句柄" | 每调用的标识符，结果消息必须回带它 |
| Accumulator | "流缓冲" | 为部分 `arguments` 分块准备的、按 id 的字符串缓冲 |
| Out-of-order completion | "最快的先来" | 并行调用以不可预测的顺序完成；id 是黏合剂 |
| Dependency graph | "顺序约束" | 输出喂进其他工具输入的工具；不能并行 |
| Parse-early trap | "JSON.parse 炸了" | 试图解析一个不完整的 `arguments` 字符串 |
| `streamFunctionCallArguments` | "Gemini 3 特性" | 每调用带唯一 id 的流式参数分块 |
| Completion-order reply | "别等全部" | 结果一到就回复，以 id 为键 |

## 延伸阅读

- [OpenAI — Parallel function calling](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling) — 默认行为与退出标志
- [Anthropic — Tool use: implementing tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implementing-tool-use) — `disable_parallel_tool_use` 与结果批处理
- [Google — Gemini function calling parallel section](https://ai.google.dev/gemini-api/docs/function-calling) — Gemini 3 起的 id 关联并行调用
- [OpenAI — Streaming responses with tools](https://platform.openai.com/docs/api-reference/responses-streaming) — OpenAI 流的分块参数重组
- [Anthropic — Streaming messages](https://docs.anthropic.com/en/api/messages-streaming) — 带 `input_json_delta` 的 `content_block_delta`
