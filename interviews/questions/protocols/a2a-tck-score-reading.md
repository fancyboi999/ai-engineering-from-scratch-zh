---
id: a2a-tck-score-reading
title: 得分 66.7% 的服务器到底有多合规
card: protocols
kind: estimate
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, ai-developer-relations-engineer]
rounds: [ml-depth, design-review]
tags: [a2a, conformance, tck, testing, evidence]
minutes: 12
lessons: []
manuals: [a2a-101#s-conformance-testing, a2a-101#s-ref-errors]
practice: []
cheatsheet: [a2a]
related: [protocols/a2a-version-header-missing]
updated: 2026-11-03
---

你用官方 A2A 合规测试套件对自己的服务器跑了两次。第一次得分 32.3%。对套件自带的 JSON-RPC 客户端改了两行之后，第二次得分 66.7%：129 项要求中，62 项 PASS、31 项 FAIL、11 项 SKIPPED、25 项 NOT TESTED。经理问你服务器的合规程度如何。估算真实数字，并为你做的每一处调整给出理由。

## Short answer

两个百分比都不是只在衡量服务器。第一次运行中，85 条 JSON-RPC 记录丢了 63 条，原因是套件把请求 POST 到了带尾部斜杠的卡片 URL，这是套件的缺陷。第二次运行中，有 21 项失败其实是测试体内部的跳过，被打标签的套件版本记成了 FAIL；按 main 分支的规则，这次运行应读作 62 PASS、10 FAIL、32 SKIPPED，即 86.1%，而这十项失败里只有三项属于服务器：缺少 REST 推送路由，以及 SHOULD 级别上卡片缺少 `Cache-Control` 和 `ETag`。

## Full answer

### 套件怎么打分

这个套件是一个 pytest 项目。它读取卡片，为 `supportedInterfaces` 的每个条目建一个客户端，并在每个声明的绑定上运行每个测试。MUST 测试失败就是硬失败，SHOULD 测试失败是预期失败，MAY 测试在卡片没有声明该能力时跳过。百分比只计 PASS 和 FAIL。72 条 gRPC 记录全部跳过，因为服务器没有 gRPC 接口；这是对的，不算损失。

### 第一次运行：套件的缺陷

规范规定接口就在 `url`。套件多加了一个斜杠，服务器返回 404，63 条记录因为同一个原因失败。改动的是套件的客户端，不是服务器，分数却变了。

### 第二次运行：把失败分开

| 分组 | 数量 | 归属 |
|---|---|---|
| 测试体内部的跳过，在该标签版本里记为 FAIL | 21 | 套件；`main` 把它们记为 SKIPPED |
| 在 HTTP+JSON 上通过、在 JSON-RPC 上失败的推送要求 | 其余大部分 | 套件发送 snake_case 的 `task_id`，而规范要求 camelCase |
| 卡片声明了 `pushNotifications`，却缺少 REST 推送路由 | 1 | 服务器；每个声明的绑定都必须提供相同的操作 |
| 卡片缺少 `Cache-Control` 和 `ETag` | 2 | 服务器，SHOULD 级别 |

服务器修好之后，六条 HTTP+JSON 推送记录通过了，但每项要求仍然因为 JSON-RPC 那一侧而显示 FAIL。

### 套件偏离规范的地方

套件期望 `TaskNotCancelableError` 返回 HTTP `409`，`ContentTypeNotSupportedError` 返回 `415`，`InvalidAgentResponseError` 返回 `502`，还期望三种错误在 gRPC 上返回 `UNIMPLEMENTED`。规范的标准表分别规定的是 `400`、`400`、`500` 和 `FAILED_PRECONDITION`。照规范实现的服务器会在这些检查上失败。套件还在 REST 上要求 `application/json`，而规范说应该使用 `application/a2a+json`；它还把 SHOULD 和 MAY 级别的缓存测试写成了硬断言。

### 套件从不测的东西

有五种让各 SDK 表现不一的行为从来没被测过：REST 的订阅动词、超过一次调用的分页、对未知产物的 `append`、别的调用方的任务，以及重发的 `messageId`。NOT TESTED 集合还包括任务内授权、TLS、卡片签名和客户端的版本头。这些需要你自己测。

### 估算结论

这样说：发现并修复了一个 MUST 缺陷；卡片缓存上有两个 SHOULD 缺口；按 main 分支规则逐项要求计算为 86.1%，其余失败可归因于套件自己的客户端；另附一份未测试行为的明确清单，旁边列出你自己的测试。交出去的是 `compatibility.json`，而不是一个百分比。

## Follow-ups

- **Level 3:** 为什么百分比不计 SKIPPED 和 NOT TESTED 的行？ Expected: 这些行没有结论，把它们算进百分比，会奖励那些声明能力很少的卡片。
- **Level 4:** 推送要求在一个绑定上通过，在另一个上失败。怎么归类？ Expected: 套件缺陷，因为 JSON 字段名必须是 camelCase，而套件发的是 `task_id`；在你自己的台账里把这项记为通过，并附上证据。
- **Level 4:** 那唯一一个真实的失败，说明了卡片的什么？ Expected: 能力标志是对每个声明绑定的承诺，所以 REST 一侧需要卡片宣称的那四个推送路由。
- **Level 4:** 你会补上哪些套件没有的检查？ Expected: 任务的所有者隔离、重发的 `messageId`、对未知产物的 `append`、REST 的订阅动词，以及用返回的 token 做分页。

## Wrong answers

- "把第二次的百分比当作合规数字报上去。" 它把套件的跳过算成失败，把套件的 snake_case 参数算成你的 bug。
- "补上缺失的路由后就报告完全合规。" 两个 SHOULD 缺口还在，而且四分之一的要求从没测过。
- "套件就是规范。" 它在六个地方偏离了标准错误表；以规范为准，套件自己的 README 也把 SHOULD 称为预期失败。

## Taught in

[合规测试一节](../../../manuals/a2a-101/sections/7-3-conformance-testing.md)记录了两次运行，[错误参考](../../../manuals/a2a-101/sections/r-4-errors.md)把套件的状态码表和标准表并排列出。
