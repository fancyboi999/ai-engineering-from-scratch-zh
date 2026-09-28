# 同意与最小权限设计检查清单

面向 MCPA“安全与治理”领域的一页式参考资料，与 MCP 2026-07-28 对齐。请用它审查设计，而不只是背诵。来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 7、11 和 12 节。

## 何时询问用户

- [ ] 只读取或报告信息的调用（只读、封闭世界）可以不经 prompt 直接执行。
- [ ] 写入、删除、发送、购买或以其他方式改变对话外部状态的调用，在运行前需要明确、知情的批准。
- [ ] 访问开放世界（公共互联网、第三方系统）的调用即使只读，也应视为需要批准，因为 openWorldHint 默认为 true。
- [ ] 完全没有注解的工具默认视为具有破坏性且会访问开放世界，绝不默认安全。

## 如何收集同意

- [ ] 同意通过 Multi Round-Trip Request 传递：server 返回 `resultType: "input_required"`、method 为 `elicitation/create` 的 `inputRequests` 条目，通常还带 `requestState`。
- [ ] client retry 使用全新的 JSON-RPC id，按 server 命名的 key 在 `inputResponses` 中携带答案，并精确回传 `requestState`。
- [ ] 用户答案为三种 action 之一：`accept`（form mode 下带匹配的 `content`）、`decline` 或 `cancel`。只有 `accept` 构成同意；后两者都会阻止调用，但不是同一事件。
- [ ] 将 `requestState` 视为攻击者可控输入。必要时进行签名、绑定到签发时的具体调用，并且只接受一次。
- [ ] 未取得或被拒绝的同意报告为 `isError: true` 的普通工具结果，绝不能使用 JSON-RPC error，也不能杜撰 error code。

## 如何限定同意范围

- [ ] 针对一个具名工具记录授权，绝不针对 server、分类或命名模式。
- [ ] 批准一个破坏性工具，绝不代表批准另一个，即使它们位于同一个 server，且调用只相隔片刻。
- [ ] 工具的 `readOnlyHint`、`destructiveHint` 和 `openWorldHint` 可辅助决定何时提示，但它们由 server 声明，除非 server 本身受信，否则均不可信。实际执行边界的是 client 自己保存的人工批准记录，而非 server 对工具的声明。

## Step-up authorization（独立的下层门控）

- [ ] scope 不足时，返回 HTTP `403`，并在一次 `WWW-Authenticate` challenge 中列出全部所需 scope，而不是每轮只给一个。
- [ ] client 的下一次请求使用先前持有 scope 与 challenge scope 的并集，绝不以一组替换另一组。
- [ ] 选择初始 scope（尚无既有授权）遵循另一条规则：首次 challenge 提供 `scope` 时使用它，否则回退到 `scopes_supported` 作为最小起始集合。
- [ ] Step-up retry 限制在少量次数内；超过上限后，将操作视为永久授权失败，而不是继续循环。

## Server 暴露能力时的最小权限

- [ ] `tools/list`（及类似列表结果）可以根据请求携带的授权变化，但绝不能因其他无关请求的副作用而改变。
- [ ] 按调用方授权变化的列表结果使用 `cacheScope: "private"` 缓存，绝不能使用 `"public"`。
- [ ] 调用方只看到当前 scope 实际允许的工具，而不是看到一切，等尝试越权调用时才遭拒。

## 设计审查中应否决的失败模式

- 一个“连接到此 server”的 prompt 悄悄覆盖 server 未来公开的每个工具。
- 杜撰自定义 error code 表示“需要同意”，例如旧版 `-32000` 到 `-32019` 范围中的值，或 `-32020` 到 `-32099` 范围中未定义的 code。
- Step-up retry 只请求新 challenge 的 scope，并丢弃 client 已持有的 scope。
- Scope challenge 跨多轮逐个给出 scope，而不是一次列出操作所需的一切。
- `tools/list` 无视获授 scope，向所有调用方展示每个工具。
- 把工具自身注解当作执行机制，而不是提示策略的参考。
- 没有上限、也没有永久失败路径的 step-up retry 循环。

## 本领域考试要点

- “安全与治理”占 MCPA blueprint 中最大的单项比重。
- 考试以 MCP specification 2026-07-28 为准：无状态协议，没有 `initialize` 握手，也没有 session。
- 工具有两种错误通道：格式错误请求使用 JSON-RPC error；模型可以读取并采取行动的情况（包括未取得同意）使用 `isError: true` 的结果。
