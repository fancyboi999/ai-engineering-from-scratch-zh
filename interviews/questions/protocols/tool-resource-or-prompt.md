---
id: tool-resource-or-prompt
title: 根据选择者挑选适配的 MCP 原语
card: protocols
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [mcp, tools, resources, prompts, primitives]
minutes: 6
lessons: [phases/13-tools-and-protocols/10-mcp-resources-and-prompts]
manuals: []
practice: []
cheatsheet: [mcp]
related: [protocols/two-error-layers]
updated: 2026-11-03
---

某团队正在为一个项目工单追踪系统构建 MCP 服务端。它具备五项能力：查看单条工单详情、新建工单、迭代复盘模板、项目政策文档，以及关闭工单。一位开发者提议将每项能力同时发布为工具、资源和 prompt，以便每个客户端都能找到它。你会为每项能力分别指定哪种原语，为什么不能三者兼备？

## Short answer

根据做出选择的主体来挑选原语。模型选择工具来执行操作，因此创建和关闭是工具。宿主或用户读取 URI 处的可寻址内容，因此工单详情和政策是资源；用户启动预先准备好的消息工作流，因此复盘模板是 prompt。每个额外的暴露面都需要付出发现、鉴权、缓存、错误处理、测试和文档的代价，因此一项能力只对应一种原语。

## Full answer

### 三种原语，三种选择者

| 原语 | 选择者 | 意图 | 结果 |
|---|---|---|---|
| 工具（Tool） | 模型或应用 | 执行操作 | 结构化动作结果 |
| 资源（Resource） | 宿主、应用或用户 | 读取 URI 处的内容 | 文本或二进制内容 |
| prompt | 用户（通过宿主 UI） | 启动可重用的消息工作流 | 一条或多条消息 |

### 五项能力

- 工单详情：具有稳定地址的内容，例如 `tracker://issues/7`。一种资源。
- 新建工单：改变状态。一种工具。
- 迭代复盘模板：用户从菜单或斜杠命令中挑选并填入参数。一个 prompt。
- 项目政策：宿主读取到上下文中的文档。一种资源。
- 关闭工单：改变状态。一种工具。

### 为什么三重发布是错误的

以三种方式发布的一项能力需要三个发现条目、三次鉴权检查、三套缓存策略、三条错误路径和三套测试集。模型还会看到它针对宿主所读取内容本不应调用的工具。先明确使用方，再编写处理程序。

### 随之而来的设计规则

- 在编写处理程序之前先设计资源 URI。将其限定在服务端的命名空间下，保持其独立于进程或连接，在访问存储之前验证，并对每次读取鉴权。
- `prompts/get` 将参数解析为消息。宿主决定这些消息如何进入模型上下文，并让自身策略始终具有更高优先级。
- 将资源文本和 prompt 模板视为不可信的服务端输出。宿主保留来源并将内容视为数据。

## Follow-ups

- **Level 1:** 什么是好的资源 URI？ Expected: 足够稳定以供添加书签、限定在服务端的命名空间下、独立于进程 ID 或连接、在访问存储前经过验证，并在每次读取时鉴权。
- **Level 2:** 客户端想知道政策文档何时发生变化。当前修订版使用什么机制？ Expected: 客户端打开的 `subscriptions/listen` 请求，在 `resourceSubscriptions` 中指定该 URI；事件表明资源已更改，客户端使用 `resources/read` 再次读取它。
- **Level 2:** 客户端针对不存在的 URI 请求 `resources/read`。是否返回空文档？ Expected: 否，返回 JSON-RPC `-32602`，以便客户端区分缺失与合法的空文档。
- **Level 3:** 什么时候你会发布资源模板而不是列出每个工单？ Expected: 当列表很大或无界时；模板告诉客户端如何形成有效的 URI，而服务端仍会解析变量、鉴权并使用类型化存储查询。

## Wrong answers

- "将所有内容都设为工具，以便模型可以触及它。" 宿主读取的内容不是操作。它失去了 URI 契约、缓存提示和用户控制的面。
- "将模板存储为资源，因为它存在于文件中。" 数据存储在何处并不决定原语。用户启动复盘，因此它是 prompt。
- "prompt 是宿主在用户不知情的情况下注入的策略。" prompt 供用户显式选择。宿主强制执行的策略留在宿主中，具有更高的优先级。

## Taught in

[资源与 prompt 课程](../../../phases/13-tools-and-protocols/10-mcp-resources-and-prompts/)根据消费者的意图对三种原语分类，并展示了订阅流程。
