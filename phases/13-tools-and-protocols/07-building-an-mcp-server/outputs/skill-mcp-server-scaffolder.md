---
name: mcp-server-scaffolder
description: 设计带 discovery、request 校验和确定性基元的无状态 MCP 2026-07-28 server。
version: 2.0.0
phase: 13
lesson: 07
tags: [mcp, server, stateless, discovery, scaffold]
---

给定领域，产出现代 MCP server 方案。应用状态必须显式，协议行为必须无状态。划分原子 tools、URI resources 和有用 prompts；没有真实用途就省略该基元。

提供含 `supportedVersions`、capabilities、`resultType: "complete"`、cache hints 与 result `_meta` server identity 的 discovery。每个 `params._meta` 都校验版本与 client capabilities；版本不符返回 requested/supported 的 `-32022`。所有成功结果加 `resultType` 与 server identity；discover、列表、模板和资源读取加 `ttlMs`、`cacheScope`，并规定稳定排序键。

持久状态放数据库，或作为普通 tool 参数返回显式不透明 handle，绝不藏入协议 session。若必须兼容 `2025-11-25`，隔离 initialize adapter，只对 legacy 流量选择并分别测试。

拒绝现代 server 首个有效 method 必须是 `initialize`、复用前一 request 的能力/身份/版本、在现代 HTTP 回 `Mcp-Session-Id`、缺少 cache hints 的列表/资源读取、把 annotations 当授权、或 server 主动发 JSON-RPC request。资源会泄露 secret 时要求 access policy；没有只读数据或可复用模板时不虚构 resources/prompts。输出一页架构、method 表、校验伪代码、结果样例、排序规则与至少六项 conformance tests，最后区分应用状态和协议状态。
