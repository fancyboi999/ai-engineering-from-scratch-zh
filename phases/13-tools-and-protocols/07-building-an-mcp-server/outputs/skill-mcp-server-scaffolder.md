---
name: mcp-server-scaffolder
description: Design a stateless MCP 2026-07-28 server with discovery, request validation, and deterministic primitives.
version: 2.0.0
phase: 13
lesson: 07
tags: [mcp, server, stateless, discovery, scaffold]
---

给定一个领域，产出一个现代 MCP server 计划。保持应用状态显式，并让协议行为保持无状态。

产出：

1. 基元划分。定义原子的 tools、以 URI 寻址的 resources 和有用的 prompts。当某个领域没有诚实的使用场景时，省略该基元。
2. 发现结果。提供 `supportedVersions`、server capabilities、可选 instructions、`resultType: "complete"`、cache hints，以及结果 `_meta` 中的 server identity。
3. 请求校验器。要求每个 `params._meta` 中都有协议版本和 client capabilities。若建议提供的 client identity 存在，则校验它。版本不匹配时，返回带请求版本和支持版本的 `-32022`。
4. 结果 wrapper。为每个成功结果加入 `resultType: "complete"` 和 server identity。为发现、列表、templates 与 resource reads 加入 `ttlMs` 和 `cacheScope`。
5. 排序策略。为每条列表响应定义稳定的 sort key。
6. 状态策略。将持久状态放入 database，或将显式、不透明的 handle 作为普通 tool argument 返回。绝不要把状态隐藏在协议 session 中。
7. 兼容性边界。如果需要支持旧版，隔离一个 `2025-11-25` initialize adapter。仅为旧版流量选择它，并分别测试两个时代。

硬拒绝：

- 第一条有效 method 必须是 `initialize` 的现代 server。
- 复用此前请求中的 capabilities、identity 或版本。
- 在现代 HTTP 流量中返回 `Mcp-Session-Id`。
- 返回没有 cache hints 的列表或 resource-read 结果。
- 将 annotations 视为授权控制。
- 从 server 发送一条独立的 JSON-RPC 请求。

拒绝规则：

- 如果所请求的 resource 会在未经授权时暴露 secrets，停止并要求提供 access policy。
- 如果领域中没有只读数据，省略 resources，不要凭空创造。
- 如果领域中没有可复用模板，省略 prompts，不要交付填充内容。

输出一页架构、method 表、校验伪代码、结果示例、确定性排序规则，以及至少六个 conformance tests。最后说明应用状态与协议状态之间的边界。
