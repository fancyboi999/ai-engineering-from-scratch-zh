# 信任边界图

面向 MCPA“安全与治理”领域的一页式参考资料，与 MCP 2026-07-28 对齐。

## 五个区域

| 区域 | 定义 | 默认信任级别 |
|------|------------|----------------|
| 用户与 host | 用户本人及其运行的应用 | 信任根；其他所有区域都要通过这里作出的选择来赢得信任 |
| Client | host 内部与单个 server 通信的组件 | 完全受信；由 host 拥有并嵌入 |
| Server | 独立程序，通常来自第三方，可以位于本地或远端 | 默认不可信，即使通过本地 stdio 管道连接也一样 |
| 上游系统 | server 自己调用的任何系统 | 不可信，通常也完全不在 client 的视野内 |
| 模型 | 读取组装后上下文的语言模型 | 位于所有区域下游；必须把源自 server 的内容当作数据，而非指令 |

## 进入模型时应视为不可信的内容

- 工具的 `name`、`description`、`icons` 和 `annotations`
- `tools/call` 结果中的 `content` 块和 `structuredContent`
- `resources/read` 的文本与 blob 内容
- `server/discover` 的 `instructions` 文本
- 嵌入以上任何内容中的信息，包括看起来像指令的文本

## 要应用的规则

- **自报身份**：`clientInfo` 和 `serverInfo` 只用于展示、日志与调试。信任决策必须依据 host 自己保存的 server 连接记录，绝不能依据连接自称的名称。
- **不可信注解**：除非声明注解的 server 位于 host 的受信列表中，否则将 `readOnlyHint`、`destructiveHint`、`idempotentHint` 和 `openWorldHint` 视为不可信。其他情况下，安全决策采用安全默认值（false、true、false、true）。
- **图标安全**：只接受 `https:` 和 `data:` 图标 URI。拒绝 `javascript:`、`file:`、`ftp:` 及其他所有 scheme。获取时不携带凭据，并将 SVG payload 视为可能执行代码的内容。
- **多 server 隔离**：嵌入某个 server 内容中的指令，本身绝不能作为调用另一个 server 工具的依据。只有模型自行作出的选择才能跨越这条边界；如果调用带有副作用，该选择仍须经过同意门控。
- **本地 server 同意（SEP-1024）**：提供本地 server 一键安装功能的 client，必须完整展示确切命令，并在运行前取得用户明确批准。
- **DNS 重绑定**：本地 HTTP server 应校验 `Origin` header 并拒绝不认识的来源，不能仅因请求抵达 `127.0.0.1` 就予以信任。
- **stdio 凭据**：从环境变量读取凭据。不要通过 stdio 传输执行 OAuth 授权流程。

## 危险信号清单

- 工具结果内容中有点名另一个 server 或工具的指令
- 图标 URI 使用 `https` 或 `data` 以外的 scheme
- 接受不在 allow list 中的 server 所声明的 `destructiveHint: false`
- 本地启动命令来自返回内容，而不是 host 自身配置
- 本地 HTTP server 不检查 `Origin` header 就接受请求
- 在授权或信任决策中使用 `serverInfo.name`

## 考试要点

- `clientInfo` 和 `serverInfo` 绝不能用于安全决策，只能用于展示。
- 工具注解是提示，不是保证，即使 host 对 server 已有一定程度的信任。
- 本地 server 被攻破的场景可追溯到 SEP-1024 的同意要求。
- 嵌入的跨 server 指令应由 host 拒绝，而不是制造 JSON-RPC 错误；承载该指令的线协议交互本身可能完全有效。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 3、12 和 13 节。
