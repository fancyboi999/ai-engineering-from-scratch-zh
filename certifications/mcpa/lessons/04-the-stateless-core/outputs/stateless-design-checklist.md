# 无状态设计检查表

这是一份针对 MCPA「MCP Fundamentals」领域的一页式检查表，与 MCP 2026-07-28 对齐。

## 不变量

每个请求都携带服务端回答它所需的全部信息。服务端不得从任何早先请求推断能力、协议版本或身份，即使该请求通过同一连接发送。

## 无状态性为什么值得

- 任意 replica 都能回答任意请求：无需粘性会话，也无需同步逐实例内存。
- 连接中断后，可以安全地在另一个 replica 上重试，因为原 replica 没有保存所需状态。
- 负载均衡器按普通规则路由，而不是依赖 session affinity。

## 连接与 session

| 问题 | 答案 |
|---|---|
| 开放的 stdio 进程或 HTTP 连接是否构成 session？ | 不构成。客户端可以在同一传输通道上交错发送无关请求。 |
| tools/list、resources/list 或 prompts/list 能否因连接不同而变化？ | 不能。 |
| 这些列表能否因请求携带的授权不同而变化？ | 可以；授权是逐请求输入，不是连接状态。 |
| 服务端能否把更早调用的副作用反映到工具列表中？ | 不能。应无条件暴露工具，再通过 handle 参数实施门控。 |

## 使用服务端签发的 handle 设计有状态工具（SEP-2567）

1. 暴露一个创建工具（例如 create_basket），在 structuredContent 中返回不透明 handle。
2. 所有操作该状态的工具都把 handle 作为普通参数接收。
3. 每次调用都针对 handle 授权调用方；handle 是名称，不是能力凭据。
4. 在创建工具的描述中写明 handle 生命周期，让模型在创建状态前看到策略。
5. handle 已过期、未知或属于其他调用方时，返回说明 handle 的工具执行错误（isError: true），使模型可以创建新 handle 后恢复。

## 发布前检查

- [ ] 每个请求处理器都从 params._meta 读取 protocolVersion 与 clientCapabilities；不从连接上的早先请求读取任何内容。
- [ ] 在授权相同的前提下，tools/list、resources/list 与 prompts/list 不因发起请求的连接不同而变化。
- [ ] 工具调用不会改变后续列表调用的结果；条件工具始终暴露，通过 handle 参数实施门控。
- [ ] 跨调用状态通过显式、不透明、由服务端签发并作为普通参数传回的 handle 引用，绝不从连接身份推断。
- [ ] 创建工具已记录 handle 的授权、不透明性与生命周期策略。
- [ ] 已过期、未知及属于其他 principal 的 handle 返回 isError: true 和解释，而不是 JSON-RPC error。
- [ ] 服务端绝不使用 clientInfo、serverInfo 或其他自报告字段作授权决策。
- [ ] 属于同一已认证 principal 的两条连接，例如 orchestrator 与它的一个 subagent，会看到相同列表结果并能共享缓存。

## 2026-07-28 移除了什么

- initialize 请求与 notifications/initialized：不再有开场握手。
- Mcp-Session-Id header 与协议级 session。
- 连接作用域的能力：能力现在通过 _meta 随每个请求传输。

## 考试要点

- 无状态性是协议默认行为，不是选择加入的模式。
- handle 是工具结果中的普通字符串，也是工具参数中的普通字符串；协议本身没有定义 handle 类型或线上格式。
- 较早材料中的 session 说法描述的是已经移除的概念，不是当前行为。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 4 节。
