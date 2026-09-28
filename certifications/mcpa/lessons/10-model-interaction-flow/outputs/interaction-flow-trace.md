# 模型交互流程跟踪表

这是面向 MCPA“架构与组件”领域的一页参考，依据 MCP 2026-07-28 整理。实现 host 时，可用它判断工具调用每一轮应该做什么。

## 五个阶段，依次进行

| 阶段 | 执行方 | 发生什么 | 是否出现在 wire 上 |
|-------|----------|---------------|-------------------|
| 1. 构建上下文 | Host | 缓存的 tools/list 条目变成模型视图：name、description、inputSchema、annotations | 否，这是 host 侧读取缓存结果 |
| 2. 选择并拟定 | 模型 | 模型根据持续对话选择工具并拟定参数 | 否，这是 host 内部的决策 |
| 3. 确认 | Host | 人类查看拟定输入；破坏性工具必须获批才能发送 | 否，除非获批 |
| 4. 调用 | Client | 获批决策变成 tools/call，在 params._meta 中携带协议版本和能力 | 是 |
| 5. 回答 | Host，然后是模型 | 结果 content 反馈到上下文；模型依据工具实际返回内容回答 | 结果在 wire 上，答案不在 |

## 模型在调用前后看到什么

调用前，模型只能看到 `name`、`description`、`inputSchema`，以及服务器提供时的 `annotations`。它看不到服务器代码、凭据或注册表元数据。调用后，模型会看到 `content`、工具定义 `outputSchema` 时的 `structuredContent`，以及 `isError` 标志。它永远看不到 HTTP 状态码或 header 之类的原始传输细节。

## tools/call 结果路由循环的三种方式

| 结果 | resultType | isError | 循环下一步 |
|--------|------------|---------|---------------------------|
| 成功 | complete | false | 把 content（及 structuredContent）交给模型；生成答案 |
| 工具执行错误 | complete | true | 把 content 交给模型；使用修正参数和新 id 重试，不带 inputResponses |
| 需要更多输入 | input_required | 不存在 | Host 收集答案（elicitation/create、sampling/createMessage 或 roots/list），然后用新 id、inputResponses 和原样回显的 requestState 重试 |

`-32602` 未知工具之类的 JSON-RPC error 是第四种结果，而且根本不属于 `tools/call` result。它不含模型可以据此采取行动的内容，因此良好实现的循环不会原样重发请求。

## 确认门

```text
read annotations from the cached tool definition
read_only  = annotations.readOnlyHint     (default false)
destructive = annotations.destructiveHint (default true, meaningful only when not read only)
gate fires when: (not read_only) and destructive
```

依照这些默认值，完全没有 `annotations` 块的工具具有破坏性。client 发送任何内容前，应先向人类展示拟定输入。如果遭到拒绝，client 根本不会构造请求，所以 wire 上没有拒绝记录，只有 host 自身状态中的一条备注。

## 完整示例（来自 code/main.py）

- `get_forecast({})` 返回工具执行错误，指出缺少 `city`；重试 `get_forecast({"city": "Pune"})` 使用新 id 并成功。
- `open_ticket({"title": "..."})` 返回 `input_required`，要求人类确认优先级；重试携带 `inputResponses` 以及服务器发出的原始 `requestState` 字符串。client 不读取该字符串；只有完成重试，工单才真正存在。
- `close_ticket` 没有 `annotations`，所以默认具有破坏性。一个拟定调用获批并进入 wire；另一个被拒绝，从未成为请求。
- 服务器上不存在 `archive_ticket`。调用只发送一次，收到 `-32602` 后，不会用相同名称与参数重试。

## Host 循环检查表

- 从缓存且确定性排序的 tools/list 结果构建模型上下文；不要在多轮之间重排数组，因为大多数模型提供商会缓存它所在的 prompt 前缀。
- 决定调用是否需要人类确认前，要应用注解默认值，而不只是读取服务器明确提供的注解。
- 确认敏感调用前，展示拟定输入，而不只是工具名称。
- 把 isError true 视为修正后重试的信号，绝不能直接终止循环。
- 把 input_required 视为不同于 isError 的机制：始终使用新 id 重试，并原样回显 requestState；inputResponses 的键要和服务器命名一致。
- 把 JSON-RPC error 视为停止原样重试该请求的信号，而不是对模型彻底隐藏失败。
- 根据工具实际返回的 content 回答，不要独立编造摘要。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5、7、10 节。
