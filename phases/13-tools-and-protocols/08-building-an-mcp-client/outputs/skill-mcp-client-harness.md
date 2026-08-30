---
name: mcp-client-harness
description: Scaffold a multi-server MCP client with modern metadata, safe era negotiation, deterministic merge, and routing.
version: 2.1.0
phase: 13
lesson: 08
tags: [mcp, client, stateless, compatibility, routing]
---

给定一组 MCP server transports，产出一个优先使用 MCP `2026-07-28` 且隔离旧版兼容性的 client harness。

产出：

1. Peer configuration。将稳定 server name 映射到固定的 command 或 endpoint、arguments、environment allowlist、authorization context、transport kind 和默认 false 的显式 `allow_legacy` flag。
2. 现代请求构建器。在序列化前，立即在每个 `params._meta` 中盖上协议版本、当前 client capabilities 和建议提供的 client identity。
3. stdio era probe。先发送 `server/discover`。接受有效 DiscoverResult；在双方支持的现代版本上重试 `-32022`；并将 `-32020` 与 `-32021` 视为可纠正的现代 errors。
4. 旧版兼容性 probe。将未识别 error、timeout、connection close 或空响应视为歧义。只有该确切 peer 设有 `allow_legacy: true` 时才发送一次受 deadline 约束的 `initialize`。仅在收到含配置旧版 revision、object capabilities 和非空 server identity 的可关联 JSON-RPC success 后选择旧版；否则 fail closed。
5. Tool cache。在协商的 authorization context 中遵守 `ttlMs` 和 `cacheScope`。将缺失的旧版 `resultType` 视为 `"complete"`。
6. 命名空间合并。对 peers 和 tools 排序。加前缀或拒绝冲突。禁止静默覆盖。
7. Router。将 canonical tool names 映射到 peer 和 local name，创建新的请求 id，发送符合 era 的请求，并校验 response id。
8. Recovery。transport 丢失时，使 in-flight work 失败，重启或重连，重复 discovery 和 lists，重新打开 subscriptions，并仅重试安全 policy 允许的操作。

硬拒绝：

- 发送没有当前 `_meta` 的现代请求。
- 在已识别的现代 error 后回退到初始化。
- 向未明确 allowlisted 用于旧版兼容性的 peer 发送 `initialize`。
- 将 timeout、connection close、空响应、未识别 error、格式错误 result 或不受支持 revision 视作旧版行为的证明。
- 将 process、connection 或 `Mcp-Session-Id` 视为现代协议状态。
- 跨授权上下文共享私有缓存列表。
- 静默覆盖重复 tool name。
- 接受缺少 `resultType` 的现代 success。

拒绝规则：

- 拒绝启动固定 allowlist 之外的 command。
- 当 owner 有歧义时，拒绝路由 tool。
- 没有应用 idempotency key 或用户决定时，拒绝自动重试非幂等 call。

输出一个完整 Python harness、至少六个 conformance tests，以及一份启动报告，列出 peer、选定 era、选定版本、cache scope 和 canonical tool names。
