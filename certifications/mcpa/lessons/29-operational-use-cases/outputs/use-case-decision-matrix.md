# 用例决策矩阵

这是一份面向 MCPA“Use Cases and Ecosystem”领域、与 MCP 2026-07-28 对齐的一页式参考资料。先回答四个问题，再查找匹配的行。

## 四个问题

1. 谁发起动作：模型、应用、用户，还是无人值守系统？
2. 背后的数据有多敏感：公开，还是仅限某个用户或组织？
3. 工作需要多久：一次请求-响应，还是数分钟乃至更久？
4. 结果是否需要交互界面？是否有人在场授权或同意？

## 矩阵

| 用例 | Primitive | Transport | Auth path | Extension | Cache scope |
|---|---|---|---|---|---|
| 开发者工具（本地代码搜索、本地文件访问） | Tool | stdio | 环境凭据，无 OAuth 流程 | 无 | private |
| 数据访问（只读上下文：工单、文档、记录） | Resource | Streamable HTTP | 使用 PKCE 的交互式 OAuth 2.1 | 无 | 用户专属时 private，否则 public |
| 企业记录系统 | Tool 或 resource | Streamable HTTP | Enterprise-Managed Authorization | `io.modelcontextprotocol/enterprise-managed-authorization` | private |
| 工作流自动化与长任务 | Tool | Streamable HTTP | 交互式 OAuth 2.1；无人值守时使用 client credentials | `io.modelcontextprotocol/tasks` | private |
| 交互式 UI（dashboard、表单、查看器） | Tool | Streamable HTTP | 交互式 OAuth 2.1 | `io.modelcontextprotocol/ui`，带文本回退 | private |
| 可复用工作流（skills） | Prompt，由 Skills over MCP 支持 | Streamable HTTP | 交互式 OAuth 2.1 | `io.modelcontextprotocol/skills` | 按内容选择 public 或 private |
| 机器对机器集成 | Tool | Streamable HTTP | OAuth client credentials，无人在场 | `io.modelcontextprotocol/oauth-client-credentials` | private |

## 何时 MCP 不是正确工具

没有外部系统和第二个消费者的能力——字符串格式化、算术、根据本地变量组合 prompt——不需要协议边界。只有 client 和 server 确实需要跨进程或组织边界互操作时，JSON-RPC 信封、发现往返和授权决策才物有所值。若没有任何内容跨越边界，就使用普通函数调用。

## 每个用例都要考虑的四项运维问题

| 关注点 | 需要决定什么 |
|---|---|
| Auth path | 环境凭据（stdio）、交互式 OAuth 2.1（有人在场）、client credentials（无人值守、机器对机器），或 enterprise-managed（中央 IdP 策略） |
| Cache scope | 数据不含用户专属敏感信息时用 `public`，否则用 `private`；只适用于六种可缓存操作，本身绝不是访问控制 |
| 同意 | 有人在场处理敏感或缓慢动作时使用 MRTR elicitation；无人可询问时，在预先授权的 scope 内运行且不 elicitation |
| 可观测性 | 在 `_meta` 中传播 trace context（`traceparent`、`tracestate`）；审计记录以已认证 principal 为键，绝不用自行报告的 `clientInfo` |

## 考试要点

- Tool 由模型控制，resource 由应用驱动，prompt 由用户控制：决定 primitive 的是这一划分，而不是 transport 或数据格式。
- 扩展需要选择加入，默认禁用；服务器即使提供扩展，也必须为未声明它的调用方优雅降级。
- cacheScope 限制跨授权上下文共享，本身不是访问控制。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10、14 节。
