---
id: cache-scope-private
title: 私有笔记前的共享缓存
card: protocols
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [mcp, caching, cache-scope, ttl, resources]
minutes: 8
lessons: [phases/13-tools-and-protocols/10-mcp-resources-and-prompts, phases/13-tools-and-protocols/07-building-an-mcp-server]
manuals: []
practice: []
cheatsheet: [mcp-server-build]
related: [protocols/tool-resource-or-prompt]
updated: 2026-11-03
---

一个笔记 MCP 服务端希望在其前置链路部署共享缓存层，因此其 `resources/read` 结果携带了公开作用域以及五分钟的新鲜度提示。安全审查员对此提出了反对。潜在的泄露是什么、针对私有笔记你应该配置何种作用域与新鲜度，以及对于绝不应被缓存的结果应该如何表达？

## Short answer

公开作用域让缓存层在其他用户请求相同 URI 时向其提供私有笔记。与用户绑定的内容必须使用 `cacheScope: "private"`（仅为该凭据持有者重用条目），并配置较短的新鲜度（如一分钟）。MCP 只定义了 `public` 和 `private`，因此对于含有秘密或变化很快的结果，应返回 `private` 且 `ttlMs: 0`，并在宿主缓存策略中强制执行 no-store。

## Full answer

### 两个作用域

| 作用域 | 规范定义 | 使用场景 |
|---|---|---|
| `public` | 授权的前提下跨用户共享 | 公共 prompt 目录 |
| `private` | 绑定至请求用户或凭据 | 私有笔记与专属资源 |

缓存提示指示新鲜度与共享策略，而不是授权。服务端仍会独立鉴权每次读取，且缓存的响应绝不应跨越授权边界。

### 哪些结果携带提示

`tools/list`、`resources/list`、`prompts/list`、`resources/templates/list`、`resources/read` 和 `server/discover` 是可缓存的，并包含 `ttlMs` 和 `cacheScope`。渲染后的 `prompts/get` 结果是完整的，不携带缓存提示。安全的回退方案是 `ttlMs: 0` 配合 `cacheScope: "private"`。

### 设定新鲜度

根据数据变动的频次以及陈旧数据的代价来决定 TTL。公共 prompt 列表可以安全地缓存数分钟。私有笔记读取则适合一分钟左右。课程示例中资源列表为 `300000`，prompt 列表为 `600000`，服务发现为 `3600000`。

### 构造缓存键

缓存键必须包含能够改变可见性的每个维度：租户、用户、作用域、区域设置和分页游标。如果共享缓存无法表示这些维度，必须使用 `private` 配合零 TTL，并施加宿主级禁止存储策略。此外，列表接口必须提供确定性的排序保证，以确保等价响应产生稳定的缓存键并向模型提供稳定的上下文。

### 权衡

公共目录的共享缓存能节省算力且风险低。在私密数据前使用共享缓存只减少了几毫秒延迟，却引入了无论多短的 TTL 都无法消除的跨用户数据泄露风险。只缓存公共目录，不缓存私有笔记。

## Follow-ups

- **Level 2:** 为什么 `resources/list` 必须返回稳定的顺序？ Expected: 确保等价响应生成稳定的缓存键与固定的模型输入上下文，防止宿主 UI 在刷新时跳变。
- **Level 2:** 客户端收到了被缓存的列表数据，想要知道何时变动，该怎么做？ Expected: 打开带有列表变更类别的 `subscriptions/listen`，在过期或收到事件后重新拉取。
- **Level 3:** `tools/list` 由于各用户拥有不同权限因人而异，应该配置什么作用域？ Expected: `private`；基于用户鉴权的工具可见性绝不可置于共享公共缓存之后。
- **Level 4:** 团队提议 `cacheScope: "no-store"`，你会怎么回答？ Expected: 该值不是 MCP 枚举值；返回 `private` 且 `ttlMs: 0`，并在宿主缓存策略中应用 no-store。

## Wrong answers

- "短 TTL 能让 public 作用域变得安全。" 作用域决定了谁可以共享条目，而 TTL 决定共享多久。哪怕只共享一秒钟，也已经泄露了笔记。
- "缓存提示就是鉴权。" 它们只是新鲜度与共享提示。服务端自行独立鉴权每次读取。
- "只有工具列表需要缓存提示。" 资源读取和发现也携带它们，且用户专属的读取正是 private 作用域最关键的地方。

## Taught in

[资源与 prompt 课程](../../../phases/13-tools-and-protocols/10-mcp-resources-and-prompts/)将缓存提示作为正确性的一环，[构建 MCP 服务端课程](../../../phases/13-tools-and-protocols/07-building-an-mcp-server/)列出了哪些结果携带缓存提示。
