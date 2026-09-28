# MCP 范围简报

这是一份针对 MCPA「MCP Fundamentals」领域的一页式参考，与 MCP 2026-07-28 对齐。

## 核心论证

没有共享协议时，N 个 AI 应用与 M 个系统需要 N×M 套定制集成。使用 MCP 后，每个应用只实现一次客户端，每个系统只实现一次服务端：N+M。四个应用和六个系统从 24 套集成降至 10 套，此后每增加一个系统，只需增加一套实现，而不是四套。

## MCP 标准化什么

- 服务端如何描述自己：`server/discover` 返回支持的版本、能力和身份。
- 客户端如何了解服务端提供的内容：`tools/list`、`resources/list`、`prompts/list`。
- 如何调用工具，以及结果与错误如何返回：`tools/call`、`CallToolResult`、JSON-RPC errors。
- 每个请求在 `params._meta` 中携带的逐请求元数据：协议版本和客户端能力（必需），客户端身份（建议）。

## MCP 留给应用决定什么

host 使用哪个模型、如何构建 prompts、如何渲染对话，以及何时请求用户批准。

## 参与者与 primitive

| 部分 | 一句话说明 | 控制方 |
|------|--------------|---------------|
| Host | 用户直接使用的应用 | 用户 |
| Client | 代表 host 与一个 server 通信 | host |
| Server | 暴露 tools、resources 和 prompts | 运营者 |
| Tool | 具有名称、描述和输入 schema 的操作 | 模型 |
| Resource | 通过 URI 标识的可读数据 | 应用 |
| Prompt | 可复用模板 | 用户 |

## 两种错误通道

| 情况 | 通道 | 示例 |
|-----------|---------|---------|
| 请求本身有误 | JSON-RPC error | 未知工具：`-32602` |
| 工具遇到模型可以修正的问题 | `isError: true` 的结果 | 缺少或无效参数 |
| 请求使用服务端不支持的版本 | JSON-RPC error | `-32022`，并在 `data.supported` 中列出支持版本 |

## 考试要点

- 2026-07-28 中没有 `initialize` 握手，也没有 session。
- 每个结果都包含 `resultType`。
- 未知工具使用 `-32602`，不是 `-32601`。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`。
