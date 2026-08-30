---
name: mcp-client-harness
description: 构建带现代 metadata、安全年代协商、确定性合并和路由的多 server MCP client。
version: 2.1.0
phase: 13
lesson: 08
tags: [mcp, client, stateless, compatibility, routing]
---

给定 MCP server transports，产出优先 MCP `2026-07-28` 并隔离 legacy 兼容层的 client harness。每个稳定 server 名绑定固定 command/endpoint、args、环境白名单、授权上下文、传输类型及默认 false 的 `allow_legacy`。序列化前把版本、当前能力和建议的 client identity 写入每个 `_meta`。

stdio 先发 `server/discover`；有效 DiscoverResult 接受，`-32022` 在共同现代版本重试，`-32020`/`-32021` 都是可修正的现代证据。只有明确 `allow_legacy` 的 peer 才能在 deadline 内做一次 `initialize` probe；只在获得带配置 legacy revision、object capabilities 和非空 server identity 的关联 JSON-RPC 成功后选择 legacy，否则 fail closed。timeout、断连、空响应、未知错误或 malformed result 都不是 legacy 证据。

遵守 `ttlMs`/`cacheScope`，legacy 缺少 `resultType` 视为 `complete`。peer 和 tools 排序，冲突必须 prefix 或拒绝。路由把 canonical tool 映到 peer/本地名，使用新 request id 并校验 response id。断连后重新 discover/list、重开 subscriptions，只重试安全操作。

拒绝无 `_meta` 的现代 request、在已识别现代错误后初始化、未 allowlist peer 初始化、跨授权上下文共享 private cache、静默覆盖重复工具、以及无 `resultType` 的现代成功。拒绝启动白名单外 command、歧义 owner 的 tool 与无幂等键/用户决定的非幂等自动重试。输出完整 Python harness、六项以上测试和启动报告。
