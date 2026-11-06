---
id: draft-lost-across-replicas
title: 在第二个副本上消失的草稿
card: protocols
kind: debug
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [mcp, stateless, replicas, state-handle, load-balancer]
minutes: 10
lessons: [phases/13-tools-and-protocols/09-mcp-transports, phases/19-capstone-projects/13-mcp-server-with-registry]
manuals: []
practice: []
cheatsheet: [mcp-server-build]
related: [protocols/post-only-streamable-http, protocols/stateless-request-metadata]
updated: 2026-11-03
---

一个文档 MCP 服务端作为两个副本运行在负载均衡器后面。其 `draft_create` 工具在进程内部的字典中保存新草稿并返回 `{"ok": true}`。下一次调用 `draft_append` 大约有一半时间因“没有草稿”而失败，而当运维人员开启会话保持时失败停止了。请解释该故障，说明为什么运维人员的修复是错误的，并重新设计这两个工具。

## Short answer

第一次调用在单台副本的内存中创建了草稿且未返回其名称，因为设计假定连接可以标识草稿。第二次调用是一个全新的 POST，可能会落到另一台副本上，后者拥有有效的协议元数据但无法加载该草稿。会话保持掩盖了该 bug，直到重启、发布或故障转移移动下一次请求。应从 `draft_create` 返回服务端生成的不透明句柄，将草稿保存在共享的持久化存储中，并使 `draft_append` 将该句柄作为普通参数接收。

## Full answer

### 机制层面的失败

1. 请求 A 到达副本 1 并在该进程中创建草稿。
2. 响应未返回草稿句柄。
3. 请求 B 是新的 POST 并到达副本 2。
4. 副本 2 无法命名或加载草稿，因此调用失败或读取错误的本地对象。
5. 会话保持看似修复了症状，直到下一次请求发生移动。

一半的追加失败是因为一半的请求落到了另一台副本上。当前修订版中没有任何东西将两个请求绑定在一起：没有 `Mcp-Session-Id`，且每个请求都是可独立解释的。

### 正确的边界

协议上下文留在每个请求中。持久化的应用状态保存在共享存储中，置于服务端生成并返回给客户端的句柄之后。下一次调用提供该句柄，任何副本都能加载相同的记录，且鉴权将记录绑定至已认证的主体和租户。副本内存可以缓存该记录。它不能成为正确性所需的唯一副本。

### 重新设计的一对工具

- `draft_create` 从共享存储返回 `{"draftId": "<unguessable>"}`，绑定至主体，并带有过期时间。
- `draft_append` 接收 `draftId` 作为参数，在每次调用时检查该主体是否有权操作草稿，并对追加应用并发控制与幂等性。

### 按生命周期选择机制

| 生命周期 | 机制 |
|---|---|
| 单次调用 | 请求局部变量 |
| 短暂的 MRTR 延续 | 客户端回传的完整性受保护的 `requestState` |
| 草稿或持久化任务 | 显式句柄加上共享持久化、过期时间、并发控制与幂等性 |

这些都不是 MCP 协议会话。

### 证明它

在单个负载均衡器后放置两个无状态副本，并发送至少 `100` 个并发请求。将连续调用路由到交替的副本，并证明正确性不依赖于会话亲和性。只要工作流需要持久性，就用显式句柄替换隐藏的进程内存。

## Follow-ups

- **Level 3:** 副本内存还可以用于何处？ Expected: 作为已存储记录的缓存，绝不能作为正确性所需的唯一副本。
- **Level 3:** 如何测试修复有效？ Expected: 对连续调用交替使用副本并运行多次并发请求；每次追加都必须在无亲和性的情况下找到其草稿。
- **Level 4:** 句柄除了随机之外还需要什么？ Expected: 绑定至已认证的主体和租户、过期时间、每次使用的鉴权，以及用于追加的并发控制和幂等规则。
- **Level 4:** 为什么不在 `requestState` 中携带草稿而要用存储？ Expected: `requestState` 适用于短暂的 input-required 延续；持久草稿需要共享持久化，且客户端回传的值不是存储。

## Wrong answers

- "会话保持修复了它，所以可以上线。" 亲和性在重启、发布、重新调度或故障转移时失效。正确性绝不能取决于哪个副本做出应答。
- "在两个进程之间复制字典。" 这将协议上下文隐藏在存储中以替代移除的会话。修复方法是显式句柄和客户端可以命名的共享存储。
- "使用 `Mcp-Session-Id` 查找草稿。" 当前修订版忽略该请求头，且从不生成它。

## Taught in

[传输课程](../../../phases/13-tools-and-protocols/09-mcp-transports/)逐步推演了隐藏副本本地状态导致的失败，[综合项目](../../../phases/19-capstone-projects/13-mcp-server-with-registry/)要求在无亲和性的情况下运行两个副本。
