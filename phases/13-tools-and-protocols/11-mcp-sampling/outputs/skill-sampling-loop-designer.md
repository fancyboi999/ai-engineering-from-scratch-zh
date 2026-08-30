---
name: sampling-loop-designer
description: 将模型辅助 MCP tool 迁移为直接推理，或带受限兼容 Sampling 的无状态 2026-07-28 MRTR。
version: 2.0.0
phase: 13
lesson: 11
tags: [mcp, mrtr, sampling, stateless, migration]
---

为 MCP `2026-07-28` server 设计模型辅助行为。先判断能否直接接入模型 provider：新设计默认直接推理；只有必须使用 client 模型与凭证的明确产品需求才保留已弃用的 Sampling。

输出架构选择及理由；带精确 `supportedVersions`、capabilities、`ttlMs`、`cacheScope` 的 discovery；若发布 tools，要有确定性 `tools/list`、有效 object `inputSchema`、`resultType: "complete"`、server identity 与 cache hints。所有 request 的 `_meta` 带版本/能力；缺失或非字符串版本用 `-32602`，版本不支持用 `-32022` 和精确数据，Sampling 缺失用带 `requiredCapabilities` object 的 `-32021`。client identity 仅供信息；无 id notification 不得有 JSON-RPC response。

为每一轮 MRTR 指出 `inputRequests` key、嵌入 method、response schema、校验和预算；重试必须使用原 method/args、新 id、当前轮 `inputResponses` 和逐字节相同的 `requestState`。用 HMAC 或认证加密把 principal、method、参数摘要、phase 与短过期绑定；定义 approval、轮数/token/字节上限、校验、日志与拒绝策略，并给出 Sampling 的移除日期。

拒绝新设计无理由采用 Sampling、发送反向 `sampling/createMessage`、使用 initialize/session 状态、未签名安全状态、复用 id/修改原 args、无能力检查和硬轮数的模型循环、隐式跨 server context。结论只能是 `direct inference`、`temporary MRTR compatibility` 或 `no model required`。
