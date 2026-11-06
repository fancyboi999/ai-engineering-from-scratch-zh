---
id: roots-are-not-a-sandbox
title: 根路径仅为提示而非授权
card: protocols
kind: concept
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [ml-depth, design-review]
tags: [mcp, roots, authorization, path-containment, scope]
minutes: 8
lessons: [phases/13-tools-and-protocols/12-mcp-roots-and-elicitation]
manuals: []
practice: []
cheatsheet: [mcp-security-auth]
related: [protocols/mrtr-confirmation-state]
updated: 2026-11-03
---

一个文件系统 MCP 服务端读取了一次客户端的 Roots 列表，并将根路径下的任意路径视为已授权删除。客户端声明了一个工作区目录。随后收到了两次删除请求：一次指向名称以工作区名称开头的同级兄弟目录，另一次则通过编码后的相对路径（..）触及父级目录。该设计有什么问题，你如何替换它？

## Short answer

Roots 只是信息性提示，从不是授权机制，也不是沙箱，当前协议修订版已将其标记为弃用。字符串前缀检查会放行这两条恶意路径，因为两者的开头都与工作区文本相同。用显式的 `workspaceUri` 参数或资源 URI 替代根路径，然后执行三层防护：鉴权主体对该工作区的访问权限、规范化 URI 并按路径组件检查包含关系，并在操作系统沙箱中运行服务端。

## Full answer

### Roots 曾经的作用

早期修订版允许客户端声明 Roots 并发送 `notifications/roots/list_changed`。根路径的作用是告知服务端用户在哪里工作。它并不限制服务端进程可以读取的内容，不为调用方鉴权，也不创建操作系统边界。当前修订版不再推荐新设计使用 `roots/list`。

### 显式替代方案

| 场景 | 替代方案 |
|---|---|
| 作用域因每次调用而异 | `workspaceUri` 或 `directory` 工具参数 |
| 操作已针对特定资源 | 资源 URI |
| 单次部署拥有固定的单个工作区 | 服务端配置 |
| 代码必须无法逃逸 | 进程沙箱或受限文件系统 |

模型可以看见并复用显式句柄。隐藏的会话作用域更难检查、重放、审计和路由。

### 始终坚持的三层防线

1. 鉴权：已认证的主体可以使用该工作区吗？
2. 包含性：规范化后的目标路径是否留在工作区边界之内？
3. 沙箱：如果服务端被攻陷，操作系统是否仍能阻止它？

### 为什么前缀检查会失败

```text
allowed:   file:///work/notes
attacker:  file:///work/notes-evil/secret.md
traversal: file:///work/notes/%2e%2e/private.md
```

两条恶意路径都以允许的文本开头。先规范化百分号编码的片段，再比较路径组件。在变更前紧接着重新检查包含性，因为请求验证后目标可能移动。真实的文件系统服务端还需要符号链接策略和平台特定的路径处理。

### 迁移适配器

如果在废弃过渡期内对端仍需要 `roots/list`，服务端将该请求嵌入到 MRTR 的 `input_required` 结果中。它绝不发送实时的反向请求。将该适配器标记为 legacy，且决不允许 legacy 根路径列表绕过服务端鉴权。

## Follow-ups

- **Level 2:** 什么时候服务端配置是正确的替代方案？ Expected: 当一次部署拥有固定的单个工作区时；每次调用不同的作用域应放在 `workspaceUri` 参数中。
- **Level 3:** 为什么要在删除前紧接着重新检查包含性？ Expected: 验证与变更之间实际记录可能会移动到工作区之外，竞态不能导致删错目标。
- **Level 3:** 为什么单纯的词法包含性检查无法阻止符号链接逃逸？ Expected: 边界内的链接会解析为边界外的路径，因此文件系统层需要符号链接策略并解析真实路径。
- **Level 4:** 一个固定的 legacy 对端仍发送 `roots/list`，如何在不削弱现代处理器安全性的前提下支持它？ Expected: 一个将请求嵌入 MRTR input 请求中、标记为 legacy 的隔离适配器，且服务端依然强制执行鉴权和包含性检查。

## Wrong answers

- "客户端声明了根路径，因此服务端可以信任该作用域。" 根路径是自报的提示。授权来自已认证的主体和服务端策略。
- "在允许的 URI 上检查 `startswith`。" 同级目录和编码后的路径遍历都能通过。先规范化，再比较路径组件。
- "操作系统沙箱让鉴权检查变得没有必要。" 沙箱是被攻陷进程的第三层防线。它无法决定哪个主体可以访问哪个工作区。

## Taught in

[根路径与信息征询课程](../../../phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/)阐述了三层规则，并展示了两种恶意路径未通过包含性检查的情况。
