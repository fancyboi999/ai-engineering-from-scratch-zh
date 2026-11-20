# 用 langchain.mcp 接入 MCP

> `MCPAdapter` 把 MCP 服务器的工具变成 LangChain 工具，会拒绝不是 URL 的字符串，并且服务器崩溃会让整次运行结束。

你找到了一个问题追踪系统的 MCP 服务器，想把它的工具放进你的 agent。你找到的每个示例都从 `langchain_mcp_adapters` 导入 `MultiServerMCPClient`。你把这个包装在 `langchain[mcp]` 旁边，pip 就把新适配器下面的 `mcp` 降了级。

读完本节，你能用 `langchain.mcp` 把 MCP 工具加载进 agent。你还能预测工具错误、慢工具和服务器崩溃会对一次运行造成什么后果。你也能设置适配器缺少的超时，并回答服务器提出的输入请求。

## 包与它的 beta 警告 {#s-mcp-with-langchain-mcp-the-package-and-its-beta-warning}

**MCP 适配器：** `langchain.mcp` 里的 `MCPAdapter` 类。它通过 FastMCP 连接 MCP 服务器，并把该服务器的工具作为 LangChain 工具返回。

`langchain` 1.4.0 添加了 `langchain.mcp`，取代已归档的 `langchain-mcp-adapters` 包 {{docs oss/python/releases/changelog}}。安装时使用附加项 `langchain[mcp]`，它要求 `fastmcp` 4.0.11 或更高版本。录制工具包解析出 `fastmcp` 4.2.0 和 `mcp` 2.3.0。第一次导入时，每个进程会警告一次：

```listing
title: 导入 langchain.mcp
source: capture/out/40-mcp.txt
lang: text
---
warning LangChainBetaWarning: `langchain.mcp` is in beta. It is actively being worked on, so the API may change.
```

这个包导出三个名字：`MCPAdapter`、`MCPToolArtifact` 和 `as_langchain_tool`。不要把旧适配器装在同一个环境里。`langchain-mcp-adapters` 0.3.2 要求 `mcp` 低于 2.0 {{code langchain-mcp-adapters pyproject.toml}}，而 `fastmcp` 4.2.0 需要 `mcp` 2.3.0。在旧适配器的环境里，解析器选了 `mcp` 1.30.0。

## 从服务器到 agent {#s-mcp-with-langchain-mcp-from-a-server-to-an-agent}

录制工具包在同一个进程里构建了一个名为 `calc` 的 FastMCP 服务器，并把服务器对象传给 `MCPAdapter`。进程内的服务器不需要端口，也不需要子进程。`list_tools()` 为每个 MCP 工具返回一个 LangChain 工具：

```listing
title: list_tools 返回的三个工具之一
source: capture/out/40-mcp.txt
lang: json
note: 第一个工具。divide 和 stats 已截掉。
---
  {
    "name": "multiply",
    "description": "Multiply two integers.",
    "args": {
      "a": {
        "type": "integer"
      },
      "b": {
        "type": "integer"
      }
    },
    "response_format": "content_and_artifact"
  },
```

每个工具的 `response_format` 都设为 `content_and_artifact`。模型看到的是内容，也就是一个文本块列表。调用成功时，服务器的结构化结果保留在 artifact 里，你的代码可以读它，模型读不到：

```listing
title: multiply 的 ToolMessage
source: capture/out/40-mcp.txt
lang: json
---
    "type": "ToolMessage",
    "content": [
      {
        "type": "text",
        "text": "42",
        "id": "lc_<uuid-5>"
      }
    ],
    "name": "multiply",
    "id": "<uuid-6>",
    "tool_call_id": "<uuid-2>",
    "status": "success",
    "artifact": {
      "structured_content": {
        "result": 42
      }
    }
```

`langchain.mcp` 没有面向 MCP 资源或 prompt 的 API。迁移指南把两者都列为不支持 {{docs oss/python/migrate/langchain-mcp-adapters}}。录制工具包通过 `adapter.client`（底层的 FastMCP 客户端）读取了一个资源，得到 `calc server: multiply, divide, stats`。

## 字符串目标必须是 URL {#s-mcp-with-langchain-mcp-a-string-target-must-be-a-url}

**目标（target）：** `MCPAdapter` 的第一个参数。它可以是 `http` 或 `https` URL、脚本的 `Path`，或 FastMCP 传输。它也可以是进程内的 `FastMCP` 服务器、`MCPConfig` dict 或 `fastmcp.Client`。

目标的类型决定传输方式。`Path` 通过 stdio 把脚本作为子进程启动。`str` 必须是 `http` 或 `https` URL。其他任何字符串都会在你构建适配器时抛出异常：

```listing
title: 指向文件的字符串
source: capture/out/40-mcp.txt
lang: text
---
MCPAdapter('server.py'):

raised builtins.ValueError: MCP target 'server.py' is not a valid URL. To run a local MCP server over stdio, ask for it explicitly with `Path('server.py')`, a `fastmcp` transport, or an `MCPConfig` — a bare string is read as a URL so that it cannot silently become a subprocess.
```

检查由 `_validate_url_target` 完成，它在适配器构建 FastMCP 客户端之前运行 {{code libs/langchain_v1/langchain/mcp/adapter.py}}。它也会拒绝 `file://` URL，因为这个 scheme 不是 `http` 或 `https`。

文档的 MCP 页面警告说，指向已存在的 `.py` 或 `.js` 文件的字符串会把该文件作为子进程启动 {{docs oss/python/langchain/mcp}}。这描述的是 `fastmcp.Client`，同一段还说 `MCPAdapter` 会拒绝这样的字符串。我们的运行在这两点上都与文档一致。

在 Mac 上，我们给 `MCPAdapter` 三个指向已有服务器脚本的字符串：相对路径、绝对路径和 `file://` URL。每个都抛出了 `ValueError`，没有启动任何东西。`fastmcp.Client` 用同一个相对路径则启动了脚本。实验脚本过滤了警告，所以这次运行没有记录警告。因此，只有在你自己用字符串构建 `fastmcp.Client`，再把它传给适配器时，这个危险才是真实的。

来自配置或来自模型的目标是字符串。让它保持为字符串，适配器就只会通过 HTTP 访问它。要启动本地服务器，请在你自己的代码里写 `Path("server.py")`。

## 错误、超时与崩溃 {#s-mcp-with-langchain-mcp-errors-timeouts-and-crashes}

**MCP 工具错误：** `isError` 为 true 的工具结果。当工具抛出 `ToolError` 或其他任何异常时，FastMCP 服务器会发送它。

适配器把工具错误转成 `status` 为 `error` 的 `ToolMessage` {{code libs/langchain_v1/langchain/mcp/tools.py}}。模型读到服务器的文本，运行继续。这里模型报告了每个结果，并说除法得到 `division by zero`。在录制工具包里，Qwen3 4B 在一条回复里调用了 `multiply`、`divide` 和 `stats`。除数为零的 `divide` 抛出了 `ToolError`：

```listing
title: 工具错误变成错误的 ToolMessage
source: capture/out/40-mcp.txt
lang: json
---
    "type": "ToolMessage",
    "content": [
      {
        "type": "text",
        "text": "division by zero",
        "id": "lc_<uuid-7>"
      }
    ],
    "name": "divide",
    "id": "<uuid-8>",
    "tool_call_id": "<uuid-3>",
    "status": "error"
```

传输层的失败则不同。它不是 `ToolException`，所以会跳过错误处理，直接从运行里抛出。文档说的也一样：服务器错误会到达模型，传输或会话失败则会抛出异常 {{docs oss/python/langchain/mcp/tools}}。录制工具包无法让进程内的服务器崩溃，所以其他情况我们在 Mac 上用真实的服务器测试。

**我们测得** Mac 上每种失败，机器是 Apple M1 Max，10 核，64 GiB，使用 `langchain` 1.5.0 和 `fastmcp` 4.2.0。FastMCP 服务器分别通过 stdio 和 Streamable HTTP 运行，每个用例运行一次。[图](#fig-7-3)展示了每个用例的结果。

```figure
id: fig-7-3
kind: decision
title: 每种 MCP 失败对一次运行造成的后果
claim: 工具错误变成错误的 ToolMessage，运行继续；但慢工具没有超时，服务器崩溃会中止运行。
caption: 请从左边的用例读到右边的结果，逐行阅读。绿色行进入下一次模型调用，灰色行在等待，玫红色行抛出异常。来源：capture/lab/summary/mcp-mac.json。
```

- **抛出异常的工具。** 工具内部的 `ToolError` 和普通的 `RuntimeError` 都变成了 `status` 为 `error` 的 `ToolMessage`。在 `create_agent` 内部，运行继续进入下一次模型调用。
- **慢工具。** `MCPAdapter` 只接受目标，所以它没有超时设置 {{code libs/langchain_v1/langchain/mcp/adapter.py}}。睡眠 2 秒的工具在 2.0 秒后返回。要设置上限，请构建 `fastmcp.Client(target, timeout=1)` 并把客户端传给适配器。睡眠 5 秒的工具随后在 1.0 秒后抛出 `MCPError: Request 'tools/call' timed out`，同一个客户端上的下一次调用正常工作。
- **stdio 上的崩溃。** 服务器在调用中途调用了 `os._exit(3)`。调用在 0.01 秒内抛出 `MCPError: Connection closed`，agent 的运行以这个异常结束。下一次调用重新启动了服务器，用了 1.66 秒。
- **HTTP 上的崩溃。** 直接调用抛出 `RemoteProtocolError`。之后的 agent 运行以及此后每次调用都抛出 `RuntimeError: Client failed to connect`，因为没有任何东西会替你重新启动 HTTP 服务器。

崩溃会结束整次运行，模型永远看不到错误消息。抛出异常的本地工具会以同样的方式结束运行，[第 3.4 节](#s-tools-toolruntime-and-tool-errors)已经展示过。服务器可能死掉时，用你自己的重试包住 agent 调用，并从它的检查点恢复。服务器可能完成了一次写入，却在回答之前死掉。只重试幂等的工具，或者发送持久的幂等键。

## 一次调用的成本 {#s-mcp-with-langchain-mcp-the-cost-of-a-call}

**我们测得** Mac 上每种传输方式 50 次 `add` 工具调用，使用 `langchain` 1.5.0。原始文件保存的是每 50 次调用一块的中位数和 95 分位数，而不是每次调用的时间。笔记本同时还在运行其他工作，所以请把这些时间当作上界来读。

| 传输方式 | 中位数，适配器未打开 | 95 分位数 | 中位数，在 `async with adapter` 内 | 95 分位数 |
|---|---|---|---|---|
| stdio | 9.5 ms | 27.3 ms | 5.9 ms | 15.0 ms |
| Streamable HTTP | 24.7 ms | 52.5 ms | 10.7 ms | 19.6 ms |

stdio 服务器只启动了一次，用于 `list_tools`，花了 1.54 秒。之后所有调用都用同一个进程。当 agent 要发起很多次调用时，用 `async with` 包住整个 agent 运行来打开适配器，这样会话在调用之间保持打开。

已归档的适配器表现不同。我们在单独的环境里运行了 `langchain-mcp-adapters` 0.3.2，使用 `mcp` 1.30.0，对着同一个服务器：

```listing
title: langchain-mcp-adapters 0.3.2 下的服务器启动
source: capture/lab/T12-mcp-mac/03-adapters-launch-count.txt
lang: text
note: 计数的第一、第三和第四行。
---
Server launch markers in T12/_marks after the langchain-mcp-adapters 0.3.2 run: 57.
02 stdio: 1 (get_tools) + 3 single calls + 50 timed calls + crash + call after crash = 56 stdio launches, plus 1 HTTP server process = 57.
So langchain-mcp-adapters 0.3.2 starts one stdio subprocess per tool call (MultiServerMCPClient without an explicit session).
```

每次 stdio 调用都启动了一个新服务器，50 次调用的中位数是 1,887 毫秒。在 HTTP 上，调用中途的服务器崩溃始终没有返回，我们的脚本在 40 秒后把它切断。使用这个适配器的旧代码两种行为都带着。请把它迁移到 `langchain.mcp`。

## 征询输入、结构化错误与进度 {#s-mcp-with-langchain-mcp-elicitation-structured-errors-and-progress}

**征询输入（elicitation）：** MCP 服务器在工具调用期间向用户请求输入，例如一个只有一个字段的表单。

`MCPAdapter` 会让它构建的每个客户端都具备征询输入的能力。对于你传入的客户端，它启用的是用 `client.new()` 创建的副本。如果客户端已经有自己的 `elicitation_handler`，它就不去动这个客户端 {{code libs/langchain_v1/langchain/mcp/adapter.py:173-187}}。当服务器以 `InputRequiredResult` 的形式返回它的问题时，适配器用 LangGraph 的 `interrupt()` 来提问 {{code libs/langchain_v1/langchain/mcp/elicitation.py:311-364}}。所以 MCP 工具可以让 agent 的运行暂停，就像[第 6.4 节](#s-interrupt-and-resume)的审核那样。

**我们测得** Mac 上的这些用例，不用模型，使用 `langchain` 1.5.0、`fastmcp` 4.2.0、`mcp` 2.3.0 和 `langgraph` 1.2.22。每个用例运行 3 次，每次在新进程里，每个用例的 3 次运行结果相同。服务器在同一个进程里运行，其中五个用例还通过 Streamable HTTP 又运行了一遍。服务器工具 `ask_name` 请求一个表单字段 `name`。默认的适配器协商出的协议是 `2026-07-28`。

在带 `InMemorySaver` 的 `create_agent` 内部，运行以 `__interrupt__` 停止，状态里的 `next` 是 `tools`。中断的值写明了工具和每个请求：

```listing
title: MCP 征询输入的中断值
source: capture/lab/summary/mcp-edges-mac.json
lang: json
note: 字段的模式已截掉。
---
       "value": {
        "requests": [
         {
          "key": "name",
          "message": "What is your name?",
          "mode": "form",
          "requested_schema": {
…
        "tool_name": "ask_name",
        "type": "mcp_elicitation"
       }
```

恢复时使用一个 `Command`，它的 `responses` 把每个请求的键映射到一个回答：

```listing
title: 对这个请求的三种回答，以及恢复
source: capture/lab/T20-mcp-edges-mac/t20_mcp.py
lang: python
---
                    action = {"accept": {"action": "accept", "content": {"name": "Ada"}}, "decline": {"action": "decline"}, "cancel": {"action": "cancel"}}
…
                    out = await agent.ainvoke(Command(resume={"responses": {"name": action[which]}}), cfg)
```

- **接受。** 工具返回了带问候语的成功 `ToolMessage`，运行正常结束，进程内和 HTTP 上都是如此。
- **拒绝与取消。** 服务器收到这个动作，并选择自己的回答，`no name (decline)` 或 `no name (cancel)`。适配器在取消时没有结束这次调用。
- **一次恢复的成本。** 一个被回答的问题，服务器运行了 3 次 `ask_name`。恢复时，适配器会从第一轮起重新调用工具 {{code libs/langchain_v1/langchain/mcp/elicitation.py:318-320}}。要求输入的工具，应当在做任何工作之前先提问。
- **没有 checkpointer。** 流产生了 `__interrupt__`，运行结束，没有异常，也没有可恢复的内容。
- **在图之外。** 直接 `ainvoke` 这个工具抛出了 `KeyError: '__pregel_scratchpad'`，因为 `interrupt()` 读取的是正在运行的图的 config {{code libs/langgraph/langgraph/types.py:1030}}。这不是 `ToolException`，所以它不会变成错误的 `ToolMessage`。
- **你自己的处理器。** 带 `elicitation_handler` 的 `fastmcp.Client` 传给 `MCPAdapter` 后，自己回答了问题。处理器运行一次，工具返回成功，没有发生中断，两个协议版本和 HTTP 上都是如此。
- **旧版服务器。** 在协议 `2025-11-25` 上，调用 `ctx.elicit` 的服务器没有从默认适配器得到回答。工具返回了错误的 `ToolMessage`，agent 继续进入下一次模型调用。[错误](#s-ref-errors)一节给出了文本。

另有两个用例让 `MCPError` 从工具里抛出，而没有返回错误的 `ToolMessage`。一个没有处理器的 `fastmcp.Client` 交给 `as_langchain_tool`，在协议 `2026-07-28` 上抛出了 `Elicitation not supported`。一个没有处理器的旧版客户端，通过 `ctx.elicit` 提问，返回了带有该文本的错误 `ToolMessage`。用旧版连接去调用返回 `InputRequiredResult` 的工具也会抛出异常，因为这种结果只存在于 `2026-07-28`。这两个抛出异常的用例，我们都只在 agent 之外运行过。不是 `ToolException` 的异常会结束 agent 的运行，上面的崩溃用例已经说明了这一点。

**错误时的结构化内容。** issue langchain#40471 报告说，错误结果会丢失它的 `structuredContent` {{issue langchain#40471}}。我们的服务器工具返回了 `is_error`，文本是 `quota exceeded, retry in 30 s`，并带有结构化载荷。原始的 `fastmcp` 结果两者都保留了，适配器产生的 `ToolMessage` 只保留了文本：

```listing
title: 一个错误结果，分别经过适配器和 fastmcp
source: capture/lab/summary/mcp-edges-mac.json
lang: json
note: 第一个事件是 ToolMessage，第二个是 fastmcp.Client.call_tool 的原始结果。
---
      {
       "artifact": null,
       "status": "error",
       "step": "direct",
       "text": [
        "quota exceeded, retry in 30 s"
       ],
       "type": "ToolMessage"
      },
      {
       "is_error": true,
       "step": "raw-fastmcp",
       "structured_content": {
        "code": 429,
        "retry_after": 30
       },
```

原因在 `_convert_call_tool_result`，它在构建 artifact 之前就对错误结果抛出异常 {{code libs/langchain_v1/langchain/mcp/tools.py:168-179}}。随后错误处理器只返回内容块 {{code libs/langchain_v1/langchain/mcp/tools.py:104-117}}。不带 `is_error` 的同样结果保留了它的 artifact。这种丢失在两个协议版本和 HTTP 上都一样。所以，只把 `retry_after` 放在结构化内容里的服务器，会让你的代码无从读取。请让服务器在文本里再写一遍。

**进度。** 服务器工具报告了三次进度。使用默认适配器时，没有任何进度到达调用方。在 agent 内部，`stream_mode="custom"` 产生了 0 个块，所以进度不会变成流事件。传给适配器的 `fastmcp.Client(target, progress_handler=...)` 收到了全部 3 次报告，进程内、HTTP 上和 agent 内部都是如此。进度和超时一样，需要你自己构建的客户端。

这一版没有录制 OAuth、URL 模式的征询输入，以及同一轮里的多个输入请求。[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它们。

```takeaways
- 安装 langchain[mcp]，并从同一个环境里移除 langchain-mcp-adapters。
- 远程服务器传 URL 字符串，本地脚本传 Path。
- 传入带超时的 fastmcp.Client，因为 MCPAdapter 没有超时。
- 预期服务器崩溃会从运行里抛出异常，并在你自己的代码里重试这次运行。
- 从成功的 ToolMessage 的 artifact 里读结构化的 MCP 结果，因为错误结果会丢掉它们。
- 给带 MCP 工具的 agent 配上 checkpointer，让会请求输入的服务器可以恢复。
- 需要服务器的进度时，传入带 progress_handler 的 fastmcp.Client。
- 用 async with 让适配器在整个 agent 运行期间保持打开。
```

来源：capture/s_integrations.py, capture/out/40-mcp.txt; capture/lab/summary/mcp-mac.json, capture/lab/T12-mcp-mac/01-langchain-mcp.jsonl, capture/lab/T12-mcp-mac/02-langchain-mcp-adapters-0.3.2.jsonl, capture/lab/T12-mcp-mac/03-adapters-launch-count.txt, capture/lab/T12-mcp-mac/00-venv-adapters-freeze.txt; capture/lab/summary/mcp-edges-mac.json, capture/lab/T20-mcp-edges-mac/01-mcp-edges.jsonl, capture/lab/T20-mcp-edges-mac/t20_mcp.py, capture/lab/T20-mcp-edges-mac/t20_server.py; libs/langchain_v1/langchain/mcp/adapter.py, libs/langchain_v1/langchain/mcp/elicitation.py, libs/langchain_v1/langchain/mcp/tools.py, and libs/langchain_v1/pyproject.toml at langchain==1.5.0; libs/langgraph/langgraph/types.py at langgraph 1.2.22; issue langchain#40471; pyproject.toml of langchain-mcp-adapters 0.3.2 (cc0f2843); docs.langchain.com at docs commit 04d4d4a (oss/python/releases/changelog, oss/python/langchain/mcp, oss/python/langchain/mcp/tools, oss/python/migrate/langchain-mcp-adapters).
