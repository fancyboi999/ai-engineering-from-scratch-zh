# 工具、ToolRuntime 与工具错误

> 工具是带 schema 的类型化函数，`ToolRuntime` 把这次运行对模型隐藏起来，而默认情况下只有错误的参数会变成一条错误消息。

你给 agent 一个读文件的工具，磁盘出了故障，整个运行抛出异常。另一次，模型在工具要整数的地方发来一个字符串，运行却带着对话里的一条错误消息继续往下走。同一个 agent，用两种不同的方式处理了两次失败。

读完本节，你能写出一个模型可以使用的带 schema 的工具，并在工具内部读取这次运行。你还能预测每一种工具失败会对运行造成什么影响。

## 模型看到的 schema {#s-tools-toolruntime-and-tool-errors-the-schema-the-model-sees}

**工具（tool）：** 用 `@tool` 包装的函数，带名称、描述，以及参数的 JSON schema。

工具包定义了 `add`，有两个带类型的参数和一段 docstring：

```listing
title: add 工具
source: capture/common.py
lang: python
---
@tool
def add(a: int, b: int) -> int:
    """Add two integers."""
    return a + b
```

`@tool` 根据类型注解构建 schema，并从 docstring 取描述。模型收到的是下面这些：

```listing
title: add 的 schema
source: capture/out/03-tools.txt
lang: json
---
{
  "description": "Add two integers.",
  "properties": {
    "a": {
      "title": "A",
      "type": "integer"
    },
    "b": {
      "title": "B",
      "type": "integer"
    }
  },
  "required": [
    "a",
    "b"
  ],
  "title": "add",
  "type": "object"
}
```

没有类型注解的工具得不到有用的 schema。工具页说类型注解是必需的，因为它们定义了输入 schema {{docs oss/python/langchain/tools}}。docstring 要写给模型看，因为它是模型得到的唯一说明。

## ToolRuntime {#s-tools-toolruntime-and-tool-errors-toolruntime}

**ToolRuntime：** 一种参数类型，给工具提供状态、上下文、store、流写入器，以及当前工具调用的 id。

名为 `runtime`、类型为 `ToolRuntime` 的参数由 agent 填入，模型永远看不到它。文档也这么说 {{docs oss/python/langchain/tools}}。工具包里的工具 `lookup_order` 有两个参数，它的 schema 里只有一个：

```listing
title: lookup_order 及其 schema
source: capture/out/03-tools.txt
lang: json
note: 先是工具的参数列表，然后是模型看到的 schema。
---
lookup_order.args:
[
  "order_id"
]

tool_call_schema:
{
  "description": "Look up an order by its id.",
  "properties": {
    "order_id": {
      "title": "Order Id",
      "type": "string"
    }
  },
```

`runtime` 和 `config` 是保留名。工具页警告说，工具参数用了这两个名字之一，会在运行时出错 {{docs oss/python/langchain/tools}}。

在 agent 内部，`lookup_order` 读取 `runtime.context` 和 `runtime.tool_call_id`，并用 `runtime.stream_writer` 写出一个值。这个值在 `ToolMessage` 之前，通过 `custom` 流模式到达：

```listing
title: create_agent 内部的 ToolRuntime
source: capture/out/43-tool-runtime-agent.txt
lang: json
note: custom 块和工具的更新。两次模型更新已截去。
---
custom:
{
  "lookup": "A-17"
}

updates tools:
[
  {
    "type": "ToolMessage",
    "content": "order A-17: shipped (asked by ada, tool_call_id=<uuid-2>)",
```

把 `runtime.stream_writer(value)` 当作函数调用。`ToolRuntime` 的 docstring 里的示例调用的是 `stream_writer.write(...)` {{code libs/prebuilt/langgraph/prebuilt/tool_node.py:1746}}。这个方法并不存在，因为 `StreamWriter` 只是一个普通的可调用对象 {{code libs/langgraph/langgraph/types.py}}。本手册把这处分歧记为冲突 D3。

带 `ToolRuntime` 的工具不能在 agent 之外运行。只传参数去调用它，会因为缺少 `runtime` 而抛出 `ValidationError`：

```listing
title: 手动调用的 ToolRuntime 工具
source: capture/out/03-tools.txt
lang: text
note: pydantic 的帮助行已截去。
---
lookup_order.invoke({'order_id': 'A-17'}):

raised pydantic_core._pydantic_core.ValidationError: 1 validation error for lookup_order
runtime
  Field required [type=missing, input_value={'order_id': 'A-17'}, input_type=dict]
```

这样的工具要放在 agent 里测试，工具包就是用 Qwen3 4B 这样做的。

## 工具错误 {#s-tools-toolruntime-and-tool-errors-tool-errors}

**工具错误（tool error）：** agent 执行工具调用时发生的失败。它的种类决定运行是抛出异常还是继续。

agent 用 `ToolNode` 运行工具。`create_agent` 使用 `ToolNode` 的默认错误处理器，它把无效的调用变成一条消息，其他所有异常都会抛出 {{code libs/prebuilt/langgraph/prebuilt/tool_node.py}}。[图](#fig-3-4)画出了工具包里的四种情况。

```figure
id: fig-3-4
kind: decision
title: 每一种工具失败对运行造成什么影响
claim: 错误的参数和未知的工具名会变成一条错误的 ToolMessage，工具内部的异常会结束运行，除非中间件把它转换掉。
caption: 每一行从左边的失败读到右边的结果。绿色行继续进入下一次模型调用，玫红色行从 invoke 里抛出。来自 capture/out/04-tool-errors.txt 和 capture/out/19-mw-shell-files.txt。
```

错误的参数会变成 `status` 为 `error` 的 `ToolMessage`，模型得到第二次机会。工具包没能让 Qwen3 4B 给 `add` 发送错误的参数。让它算 `2.5 + 3`，它发送了 2 和 3，然后告诉用户这个工具只接受整数。让它把 0 到 10 的音量设为 11，它没有调用任何工具，只说 10 是最大值。

错误的参数来自[第 4.6 节](#s-the-built-in-middleware)的 shell 工具。模型把命令作为对象而不是字符串发送，连续六次：

```listing
title: 模型发送了错误的参数
source: capture/out/19-mw-shell-files.txt
lang: json
note: 请求 ls 的那次运行的第一条 ToolMessage。
---
    "content": "Error invoking tool 'shell' with kwargs {'command': {'command': 'ls'}} with error:\n command: Input should be a valid string\n Please fix the error and try again.",
    "name": "shell",
…
    "status": "error"
```

模型重复同一个错误时，第二次机会没有帮助，所以要设置递归上限或工具调用上限。

真实的模型很少说出一个没有给它的工具名。告诉 Qwen3 4B 有一个并不存在的 `subtract` 工具，它调用的是 `add`，参数为 5 和 -3。未知的名称出现在工具随线程变化的时候。工具包让一个拥有 `subtract` 的 agent 暂停，然后用一个只有 `add` 的 agent 恢复这个线程。已保存的调用变成了一条错误消息：`Error: subtract is not a valid tool, try one of [add].`。

工具内部的异常则不同。没有中间件时，`invoke` 抛出了 `RuntimeError: disk on fire`，运行就此结束。

`ToolErrorMiddleware` 把这个异常变成一条消息。它的 `on_error` 函数返回文本，运行继续：

```listing
title: ToolErrorMiddleware 把异常变成一条消息
source: capture/out/04-tool-errors.txt
lang: json
note: 只保留 ToolMessage。
---
    "type": "ToolMessage",
    "content": "RuntimeError in flaky_disk: disk on fire",
    "name": "flaky_disk",
    "id": "<uuid-11>",
    "tool_call_id": "<uuid-10>",
    "status": "error"
```

不带 `on_error` 的 `ToolErrorMiddleware()` 在构建时就会抛出 `ValueError`。重试是另一种选择：`ToolRetryMiddleware` 会再次运行工具，第 4 部分会数它的尝试次数。

## 工具名与工具调用 id {#s-tools-toolruntime-and-tool-errors-tool-names-and-tool-call-ids}

**工具调用 id（tool call id）：** 模型给每个工具调用的 id，该调用的 `ToolMessage` 会把它带回来。

**我们测得**三种情形，用的是 Qwen3 4B。重名情形在 x86 服务器客户机上跑了 3 次，3 次结果相同。调用次数情形每种次数各跑一次。无 id 情形是 Mac 上的桩（stub），每种情形一行。

两个同名的工具，在 `create_agent` 里不会报错。我们传入 `safe_lookup` 和 `privileged_delete`，两者都叫 `account_action`。列表中靠后的工具胜出：模型只拿到它的 schema，每次调用也只运行这一个工具。当 `privileged_delete` 排第二时，`account_action` 的调用运行的就是 `privileged_delete`。

用真实模型时，模型的选择跟随靠后那个工具的描述。看到 `Delete an account.` 时，它拒绝了查询请求。对删除请求，它运行了 `privileged_delete`。langgraph#7988 报告了这个问题 {{issue langgraph#7988}}。给每个工具起一个唯一的名字。

服务器发来不带 id 的工具调用，会以两种方式破坏运行。我们从一个桩向 `ChatOpenAI` 和 `create_agent` 发送了两个没有 id 的并行调用。在 `invoke` 和 `stream_mode="messages"` 下，两个工具都运行了，随后运行抛出 `TypeError: Tool lookup returned unexpected type: <class 'str'>`。也就是说，副作用发生了，运行却失败了。在 `stream_events` v3 下，每个 id 都变成了 `""`，两个工具都运行了，两条 `ToolMessage` 的 id 都是 `""`。langchain#40531 报告了这种强制转换 {{issue langchain#40531}}。

没有任何真实模型产生过无 id 的调用：Ollama 0.31.1 在两条路径上都发送 id，所以这些行来自 Mac 上的桩。

让 Qwen3 4B 做 1、2、4、8、16 个调用的请求，它分别发出了 2、2、4、8、16 个调用。每种次数在 x86 服务器客户机上各跑一次。两条路径上，每个调用都有 id。这两条路径是 `ChatOllama`，以及 Ollama 的 `/v1` 路径上的 `ChatOpenAI`。

在 v3 下，流的最后一个块上的工具调用片段会丢失。带 `chunk_position="last"` 的块，从 `content_blocks` 里上报解析好的工具调用，而且只上报带 id 的调用，不上报块内容块 {{code libs/core/langchain_core/messages/ai.py}}。参数片段单独无法解析，所以 `chunks_to_events` 拿不到它的增量 {{code libs/core/langchain_core/language_models/_compat_bridge.py}}。在假模型里（真实模型不会产生这种情况），第二个调用变成了无效的工具调用，并得到一条错误的 `ToolMessage`。没有 id 时，两个调用中有一个从未运行。

`ChatOpenAI` 用一个空块结束它的流，所以是安全的。请让自定义模型也这样做。

## 每个工具调用一条 ToolMessage {#s-tools-toolruntime-and-tool-errors-one-toolmessage-for-each-tool-call}

工具页说，历史里的每个工具调用都需要一条回答它的 `ToolMessage` {{docs oss/python/langchain/tools}}。在上面所有情形里，包括出错的情形，agent 都替你遵守了这条规则。编辑消息的代码，例如裁剪或摘要，也必须遵守。

```takeaways
- 给每个工具参数加类型注解，并把 docstring 写给模型看。
- 用类型为 ToolRuntime 的 runtime 参数获取上下文、状态和流写入器。
- 把 runtime.stream_writer(value) 当作函数调用。
- 工具内部的异常不该结束运行时，加入 ToolErrorMiddleware。
- 编辑消息时，让每个工具调用保持一条 ToolMessage。
- 给每个工具起唯一的名字，因为重名时最后一个静默胜出，不报错。
- 自定义模型的流，要以标记为 last 的空块结尾。
```

来源：capture/common.py, capture/s_start.py, capture/out/03-tools.txt, capture/out/43-tool-runtime-agent.txt, capture/out/04-tool-errors.txt, capture/out/19-mw-shell-files.txt; capture/lab/summary/parallel-tools-x86.json, capture/lab/T08-parallel-tools-x86/01-counts.jsonl, capture/lab/T08-parallel-tools-x86/02-raw-ollama.jsonl, capture/lab/T08-parallel-tools-x86/03-dupnames.jsonl, capture/lab/T08-parallel-tools-x86/t08_real.py; capture/lab/summary/parallel-tools-mac.json, capture/lab/T08-parallel-tools-mac/02-idless-and-dupnames.jsonl, capture/lab/T08-parallel-tools-mac/t08_ids.py; issue langgraph#7988, issue langchain#40531; libs/core/langchain_core/messages/ai.py and libs/core/langchain_core/language_models/_compat_bridge.py at langchain-core 1.8.0; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/tools); libs/prebuilt/langgraph/prebuilt/tool_node.py and libs/langgraph/langgraph/types.py at langgraph 1.2.22; libs/core/langchain_core/tools at langchain==1.5.0.
