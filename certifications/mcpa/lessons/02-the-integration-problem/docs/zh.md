# MCP 解决的集成难题

> 你接入 AI 应用的每个系统都是一份契约。MCP 让这些契约处处采用相同形状，因此一个客户端可以使用从未见过的服务端。

**类型：** Reference
**语言：** Python
**前置要求：** 第 01 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释 N×M 集成难题，以及共享协议如何把它降为 N+M
- 说明 MCP 在 AI 应用与外部系统之间标准化了什么，又刻意把什么留在协议之外
- 用一句话分别说清 MCP 系统的参与者和三种服务端 primitive
- 把发现请求、工具列表和工具调用读成携带逐请求元数据的普通 JSON-RPC 消息
- 区分协议错误与工具执行错误，并解释这种区别为什么会影响模型

## 问题背景

过去，把 AI 应用接到外部系统上就意味着编写胶水代码。一个助手若要访问文件、工单队列和数据库，就需要三套集成；每套集成都自行发明能力描述方式、参数格式、错误形状，以及谁有权调用的规则。增加第四个系统，就要增加第四套集成。再增加一个 AI 应用，则所有集成都要重写，因为为第一个应用编写的代码无法直接用于第二个。

这就是 N×M 难题。四个应用连接六个系统需要二十四套集成，每一套都可能发生格式漂移、模糊安全假设。真正昂贵的不是第一套集成，而是第二十套，以及必须同时推理全部二十套实现的评审工作。

Model Context Protocol 把 N×M 变成 N+M。每个应用只需学会一次 MCP，每个系统只需暴露一次 MCP 服务端。此后，任何现代客户端都能使用任何现代服务端，因为双方约定了统一的消息格式、能力描述方式，以及调用工具和读取返回结果的方式。四个应用加六个系统只需十套实现，每增加一个系统也只增加一套。

## 核心概念

MCP 是协议，不是产品。它标准化 AI 应用与提供上下文、执行操作的系统之间如何对话：服务端如何描述自己，客户端如何询问服务端提供什么，工具如何调用，结果与错误如何返回。它刻意不规定模型本身、不规定 host 使用哪个模型、不规定 host 如何构建 prompt，也不规定用户界面长什么样。这些仍由应用决定。

参与者很少。**host** 是用户直接使用的应用，比如聊天助手或编辑器。host 内部的一个 **client** 管理与一个 **server** 的对话；host 每使用一个 server，就运行一个对应的 client。server 暴露三种 **primitive**。**Tools** 是有名称、描述和 schema 类型的操作，由模型决定是否调用。**Resources** 是通过 URI 标识的可读数据，由应用选择是否放进上下文。**Prompts** 是用户明确选择的可复用模板。三者的控制方不同：tools 由模型控制，resources 由应用驱动，prompts 由用户控制。

所有消息都使用 JSON-RPC 2.0。请求包含 `id`、`method` 和 `params`。响应使用相同 `id`，并携带 `result` 或 `error`。在 MCPA 考试所依据的 2026-07-28 修订版中，每个请求还要在 `params._meta` 中携带自己的协议元数据：键 `io.modelcontextprotocol/protocolVersion` 表示协议版本，`io.modelcontextprotocol/clientCapabilities` 表示客户端能力；此外还建议通过 `io.modelcontextprotocol/clientInfo` 提供客户端名称和版本。协议没有开场握手，也没有 session。每个请求都独立成立，因此服务端任意一个 replica 都能回答。

每个结果都包含 `resultType`。目前你会看到 `complete`，表示结果已经包含最终内容。后面的课程会介绍 `input_required`，即服务端需要先从用户获取更多信息才能完成请求时给出的答案。

发现过程是数据交换，不是编译进代码的逻辑。客户端可以调用 `server/discover`，了解服务端支持哪些协议版本、提供哪些能力以及服务端名称；也可以调用 `tools/list`，获取每项工具的名称、描述和输入 schema。客户端无需预先编译任何服务端信息。这就是互操作性的完整论证：今天编写的客户端可以驱动明年编写的服务端，因为服务端会在协议中描述自己。

错误分为两类，考试很看重其中差别。**协议错误**是 JSON-RPC error，表示请求本身有问题。例如调用了服务端不存在的工具，应返回代码 `-32602`（Invalid params）。**工具执行错误**则是普通结果，其中 `isError: true`，内容里给出说明：工具遇到了模型可以修正的问题，比如缺少参数。模型可以看到工具执行错误，并用修正后的参数重试；而它从协议错误中能学到的要少得多。

```figure
mcpa-02-n-by-m
```

## 交互实验

图中分别展示相同的四个应用与六个系统。左侧每个应用都与每个系统连线，共有二十四条自定义胶水连接。右侧每个应用和每个系统都只连接一次共享协议，总计十条连接。然后跟随一条从 client 到 server 的请求：请求指定 method，携带自己的版本与能力，返回结果中的 `resultType` 表示已经完成。留意右侧没有什么：第一次有用请求之前不存在任何初始化对话。

## 实践实验

打开 `code/main.py`。这是一个只用标准库、不联网也不使用 SDK 的模型，但消息形状遵循 2026-07-28 schema。它构建两个互不相关的服务端——天气服务和工单服务——以及一个并非为其中任何一个专门编写的客户端类。客户端会发现各个服务端、列出工具并调用它们。

```bash
python3 code/main.py
```

对照核心概念阅读打印出的交互。在每个请求中找到 `_meta` 块，在每个结果中找到 `resultType`。然后找出三个刻意制造的失败。调用 `get_forecast` 时不提供 city，会返回 `isError: true` 的普通结果。调用不存在的工具，会返回 JSON-RPC error `-32602`。请求声称协议版本是 `1999-01-01`，会返回错误 `-32022`，其 `data` 列出服务端实际支持的版本。修改 city，给工单服务端添加第三项工具，再次运行；无需修改客户端，发现过程就会自动获得新工具。

## 交付产物

`outputs/mcp-scope-brief.md` 是一页式说明，可以直接交给队友：其中包含 N+M 论证、MCP 标准化与不标准化的范围、参与者与 primitive 及其控制方，以及两种错误通道。需要解释团队为什么应该暴露一个 MCP 服务端，而不是再写一套定制集成时，就用这份材料。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课中的主张：集成数量计算；一个客户端能够发现两个互不相关的服务端；每个请求都携带版本和能力；发现响应返回缓存提示和服务端身份；未知工具属于协议错误，缺少参数属于工具执行错误；缺少元数据的请求会被拒绝；不支持的版本会列出支持的版本；工具列表顺序稳定。仓库的 wire checker 还会按照 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/02-the-integration-problem
```

## 综合项目关联

综合项目会组装从发现到经审计工具调用的一套完整 2026-07-28 交互。它的基础就是本课这幅图景：一个 host 为每个 server 运行一个 client；server 以数据形式描述自己；请求携带自身元数据；结果说明自己属于哪种类型。当综合项目要求你论证某项设计时，你会从 N+M 模型以及协议错误与工具执行错误的分界出发。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Host | 用户直接使用的应用；它为每个 server 运行一个 client |
| Client | host 内部与一个 server 通信的组件 |
| Server | 通过 MCP 暴露 tools、resources 和 prompts 的程序 |
| Tool | 具有名称、描述和输入 schema，由模型控制的操作 |
| Resource | 通过 URI 标识、由应用驱动的可读数据 |
| Prompt | 由用户明确选择的用户控制模板 |
| `_meta` | 携带版本、能力和客户端身份的逐请求元数据块 |
| `resultType` | 表示结果已完成还是需要更多输入的字段 |
| 协议错误 | 请求本身有误时返回的 JSON-RPC error，例如未知工具（`-32602`） |
| 工具执行错误 | 模型可以读取并修正的普通结果，其中 `isError: true` |

## 延伸阅读

- [MCP specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)，重点阅读 Overview 与 Tools 页面
- [MCP architecture overview](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 2、3、5、10 节
- `phases/13-tools-and-protocols/06-mcp-fundamentals`，深入构建无状态请求模型
