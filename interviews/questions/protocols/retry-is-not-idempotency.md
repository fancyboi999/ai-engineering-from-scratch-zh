---
id: retry-is-not-idempotency
title: 超时后执行了两次扣款
card: protocols
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, debugging]
tags: [mcp, idempotency, retry, cancellation, timeout, backpressure]
minutes: 12
lessons: [phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control]
manuals: []
practice: []
cheatsheet: [mcp-gateways-operations]
related: [protocols/cancel-signal-per-transport, protocols/draft-lost-across-replicas]
updated: 2026-11-03
---

在 Streamable HTTP 上，客户端调用了 `charge_account`。反向代理缓冲了响应流，客户端达到超时并断开连接，服务端片刻之后提交了扣款。客户端使用全新的 JSON-RPC ID 再次发送调用，导致客户被收取了两次费用。团队提议基于 JSON-RPC ID 去重。请设计修复方案。

## Short answer

JSON-RPC ID 关联单条消息，绝不标识业务操作，因此对服务端而言两个 ID 就是两笔扣款。在参数中添加应用幂等键，并让服务端在单个原子持久化事务中存储该键、参数指纹和已提交的结果。具有相同参数的相同键返回已存储的结果，而具有不同参数的相同键将被拒绝。

## Full answer

### 依赖键而非消息 ID

```json
{
  "name": "charge_account",
  "arguments": {"account": "acct-7", "cents": 1200, "idempotencyKey": "checkout-7"}
}
```

课程展示了双 ID 案例：ID 为 `41` 的扣款丢失了响应，重试携带 ID `42`，服务端看到了两条不同的消息。没有应用键，它无法知道它们属于同一笔结账。

### 账本边界必须是原子且持久的

以下顺序是不安全的：

```text
check key
run mutation
store result
```

两个 worker 都可能观察到键不存在并都执行修改。在副作用生效之后、存储之前发生崩溃，在重试时会造成同样的歧义。课程使用带有 `BEGIN IMMEDIATE` 的基于文件持久化的 SQLite 账本，因此键检查、业务副作用、执行计数器和已存储结果作为一个单元提交，在同一键上竞态的两个连接只产生一次执行。返回已存储结果的防御性副本，以便调用方的修改不会损坏后续重放。

本地表无法使真实的支付具备原子性。生产环境需要共享的持久化事务、事务性发件箱，或者强制执行相同键的上游提供商。进程锁既不能保护副本，也不能防范重启。

### 在重试前对修改分类

| 类别 | 范例 | 规则 |
|---|---|---|
| 安全 | 确定性读取 | 一旦理解失败边界，就使用新 ID 重试 |
| 有条件 | 带有持久键的修改 | 使用相同键和相同参数重试 |
| 不安全 | 没有去重的修改 | 不要自动重试；先对账 |

`idempotentHint` 和 `readOnlyHint` 是不可信的提示。应用契约和服务端实现才是决定因素。

### 同时也修复超时

使用两个时钟：进度可以重置的空闲超时，以及从请求开始起算且任何机制都不能重置的最大超时。在课程的示例中，在 `400`、`800` 和 `1200` 毫秒的进度保持了 `500` 毫秒的空闲时钟活跃，而 `2000` 毫秒的最大超时仍能取消请求。对于缓冲代理，发送 `Content-Type: text/event-stream`、`Cache-Control: no-cache` 和 `X-Accel-Buffering: no`，并在安静的流上发出 SSE 注释保活帧。保活帧不是进度，绝不能重置空闲时钟。

### 修复方案必须尊重的竞态

取消与完成存在竞态。如果取消获胜，服务端不再发送响应。如果完成获胜，客户端忽略滞后的取消，服务端忽略滞后的通知。在 HTTP 上，取消信号是关闭请求的响应流，因此场景中的断开连接是服务端感知过晚而未能阻止提交的取消。幂等键使这种竞态变得无害。

## Follow-ups

- **Level 3:** 相同的键带有不同的 `cents` 值到达，会发生什么？ Expected: 服务端比较参数指纹并拒绝该调用，因为一个键绝不能代表两个业务意图。
- **Level 3:** 两个 worker 在同一瞬间看到键缺失，如何防止两次扣款？ Expected: 键占用、副作用和结果在单个原子持久化事务中提交；先查后写的序列无法做到。
- **Level 4:** 扣款由外部支付提供商执行。本地账本能让它原子化吗？ Expected: 不能；要么提供商接受相同的幂等键，要么事务性发件箱将本地提交桥接至远程副作用。
- **Level 4:** 客户端重新连接中断的 `subscriptions/listen` 流。它是否重发丢失的扣款？ Expected: 否；它打开新的 listen 请求，重新获取权威状态，按稳定标识符去重，且绝不因为丢失响应而重放不安全修改。

## Wrong answers

- "基于 JSON-RPC ID 去重。" ID 关联消息，而重试按设计携带新 ID。
- "设置 `idempotentHint` 并让客户端自由重试。" 注解是不可信的提示。应用契约和账本决定重试安全性。
- "检查键，执行扣款，然后存储结果。" 两个 worker 都可能错过该键，且副作用与存储之间的崩溃会使重试产生歧义。

## Taught in

[可靠性课程](../../../phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/)构建了原子账本、双时钟和重试矩阵。
