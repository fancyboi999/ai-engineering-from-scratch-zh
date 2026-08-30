---
name: elicitation-form-designer
description: Design explicit resource scope and stateless MCP 2026-07-28 elicitation with authorization, safe forms, and signed retry state.
version: 2.0.0
phase: 13
lesson: 12
tags: [mcp, elicitation, mrtr, scope, authorization]
---

为面向协议 revision `2026-07-28` 的 MCP operation 设计一个 user-input step。

产出：

1. Scope 契约。将 workspace、directory 或 resource URI 放入可见 tool arguments 或 server configuration。说明哪些 authenticated principals 可以使用它。
2. Boundary checks。定义 URI normalization、path-component containment、symbolic-link policy 和 operating-system sandbox。
3. Trigger condition。说明需要用户 input 的精确 ambiguity、confirmation 或 external interaction。
4. Discovery 与 capability gate。从 `server/discover` 返回精确的 `supportedVersions`、capabilities、`ttlMs` 和 `cacheScope`。如果声明 tools，包含必需的确定性 `tools/list` descriptors，且有有效 object `inputSchema`、server identity metadata 和 cache hints。将 `elicitation: {}` 和显式 `elicitation.form` 视为 form support。以 `-32021` 和 `data.requiredCapabilities.elicitation.form` 拒绝缺失或仅 URL support；对于不支持 version，以精确 `supported` 与 `requested` data 使用 `-32022`。
5. MRTR result。返回带稳定 `inputRequests` key 和 `elicitation/create` request 的 `resultType: "input_required"`。
6. Interaction design。对 form mode 提供纯文本 message 和受限 flat schema；对 URL mode 展示 HTTPS destination 与 out-of-band completion rule。
7. Retry 契约。要求新的 JSON-RPC id、原始 method 与 arguments、当前 `inputResponses`、逐请求 `_meta` 和精确 `requestState` echo。无 id notification 绝不接收 JSON-RPC result 或 error；已接受 Streamable HTTP notification 返回无 body 的 `202`。
8. Branch handling。将 `accept`、`decline` 和 `cancel` 映射到不同安全 outcomes。
9. State protection。将 HMAC 或 authenticated encryption 绑定到 authenticated principal、原始 argument digest、candidate set、operation phase、expiry 与 one-time nonce。在由所有 handler instances 共享的有界、TTL-pruned replay store 中原子消费 nonce。
10. Final revalidation。在 mutation 前立即重新检查 authorization、live record state 与 containment。

硬拒绝：

- 将已弃用 Roots 视为 authorization、containment 或 sandboxing。
- 在新的 2026-07-28 design 中使用 `roots/list` 或 `notifications/roots/list_changed`。
- 发送反向 `elicitation/create` request，而非通过 MRTR 返回它。
- 在 form mode 中收集 passwords、API keys、access tokens 或 payment credentials。
- 发送当前逐请求 capabilities 中缺少的 elicitation mode。
- 将 `clientInfo` 视为 authenticated user identity。
- 在 validated acceptance 与最终 authorization checks 前执行破坏性 action。
- 使用携带 candidates 或 permission-relevant data 的未签名 `requestState`。

拒绝规则：

- 在明确 decline 后拒绝重复 prompts。
- 对 server 可以不借助用户就能派生或校验的 value，拒绝 elicitation。
- 拒绝包含 credentials、user secrets 或 pre-authenticated bearer value 的 URL。
- 拒绝使用隐藏协议-session state、`initialize` 或 `Mcp-Session-Id` 的 request。

输出一页设计，包含 scope、authorization、containment、interaction mode、schema 或 URL、MRTR wire shape、state fields、response branches、replay policy 与最终 revalidation checklist。
