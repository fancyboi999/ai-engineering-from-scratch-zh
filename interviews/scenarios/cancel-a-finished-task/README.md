---
id: cancel-a-finished-task
title: 关停流程陷入取消操作的无限重试
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [a2a, task-states, cancel, terminal-states, retries]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: [a2a, agent-failure-modes]
related: [scenarios/task-not-found-in-two-bindings]
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/capture/out/10-cancel.http
  - manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md
  - manuals/a2a-101/sections/5-5-errors.md
  - manuals/a2a-101/sections/r-3-task-states.md
---

## Situation

一个主管服务驱动着一组远程 agent。每次运行结束时，它列出自己启动的所有任务，向每个任务发送 `CancelTask`。它对每次调用的规则很简单：报错就表示“还没好”，于是再发一次，直到返回一个任务为止。昨晚关停一直没有结束。`test-runner` agent 上有两个任务，整晚每次尝试都返回错误。

值班工程师读了主管服务的日志。两个任务中的一个，在这次运行早些时候已被操作员通过同一个 agent 手动停止。关停例程取消它失败后，工程师给它发了一条消息“Try again”想唤醒它，又收到另一种错误。工单说 agent 卡住了，要求重启 agent。你手上有采集套件针对同一组调用顺序录下的四次交互。

## Evidence

- [启动测试套件的那次发送，以及任务返回时的状态](evidence/the-send.txt)
- [第一次 CancelTask 的回复](evidence/first-cancel.txt)
- [对同一个 id 的第二次 CancelTask：状态码和错误码](evidence/second-cancel.txt)
- [第二次取消错误里的详情](evidence/second-cancel-reason.txt)
- [发给已取消任务的消息，以及它收到的错误码](evidence/message-after-cancel.txt)
- [这条消息的错误里的详情](evidence/message-after-cancel-reason.txt)
- [规范和各实现对重复取消的说法](evidence/after-a-cancel-that-errors.txt)

## Questions

1. 第一次取消返回了什么？任务当时还带着哪些内容？
2. 第二次取消和后来的消息收到两个不同的错误码。它们的详情有什么共同点？
3. 重复取消是错误还是空操作？规范怎么说？采集套件和参考实现又怎么做？
4. 哪个调用能告诉主管服务要不要继续？它可能有哪三种结果？
5. 被取消的任务原来在做的工作，主管服务怎样接着做？

## Walkthrough

1. **读发送请求。** 规划器请求跑完整测试套件，并设置了 `returnImmediately`，任务返回时处于 `TASK_STATE_SUBMITTED`。任务已经存在，客户端不在时它也在运行。
2. **读第一次取消。** 回复就是任务本身，现在处于 `TASK_STATE_CANCELED`，状态消息是“Canceled at the client's request.”。历史里有这次请求和 agent 的进度消息，产物里有测试套件已写出的两段日志。取消是一个服务端可以拒绝的请求，这一次成功了。
3. **读第二次取消。** HTTP 状态码是 200，因为 JSON-RPC 错误放在 200 响应里返回。响应体里有一个 `error`，错误码 -32002，消息是“Task cannot be canceled”。详情给出原因 `TASK_NOT_CANCELABLE`，并在 `metadata` 里给出状态 `TASK_STATE_CANCELED`。这个错误说的不是“稍后再试”。它说的是任务已经结束，以及以什么状态结束。
4. **读消息。** “Try again”这条消息带着已取消任务的任务 id 和上下文 id。错误码是 -32004，原因是 `UNSUPPORTED_OPERATION`。元数据给出的是同一个状态。终态任务拒绝消息、取消和订阅。只有 `GetTask` 还会回答。
5. **读规则。** 规范有一节为已结束的任务列出 `TaskNotCancelableError`，另一节又说取消是幂等的。这个服务端和参考 SDK 都返回 -32002，对已删除任务的取消可能返回未找到。客户端无法知道自己遇到的是哪种服务端，所以取消报错之后，它调用 `GetTask`。状态是已取消，说明之前的某次取消成功了。是其他终态，说明任务先自己结束了。还在运行，说明服务端停不下它。
6. **核对停止集合。** 终态有四个：completed、failed、canceled 和 rejected。一个以“返回任务”为成功条件的循环，遇到已经处于其中某个状态的任务，永远不会结束。

## Resolution

没有任何东西卡住。主管服务的重试规则把一个永久状态当成了临时错误，工程师的“Try again”又用一条消息重复了同一个错误。修复在客户端。`CancelTask` 返回错误时，主管服务调用一次 `GetTask`，读取状态。终态就关闭这一项。错误码 -32004 要结合元数据读，因为同一个错误码还涵盖 agent 名片不支持流式和不提供扩展名片这两种情况。要继续工作，主管服务在同一个上下文里新建任务，并在 `referenceTaskIds` 里写上已结束的任务。它从不给终态任务发消息。在这份采集里，取消之后的每次调用都是一个请求、一个确定的回答；关停现在需要的也正是这样：把列表过一遍。

## Wrong turns

- "一直重试取消，直到它返回任务。" 第二次取消每次都返回 -32002，它的元数据已经给出了最终状态。重试只有在客户端停下它时才会停。
- "给任务发消息让它重新开始。" 终态任务不会再变化。这条消息会收到 -32004。新的工作就是新的任务，把旧 id 写进 `referenceTaskIds`。
- "把 -32004 理解为这个服务端不支持取消。" 这个错误码覆盖三种情况：不支持流式、没有扩展名片、任务已处于终态。消息和元数据，或者一次 `GetTask`，能把它们区分开。
- "循环在 completed、failed 和 canceled 时停止。" rejected 也是终态。漏掉它的循环会对一个被拒绝的任务永远轮询下去。
- "重启 agent。" agent 对每次调用都立即返回了正确的错误。重启会丢掉任务存储，让下一次查询变成未找到。

## Generalize

一次修改操作报错，不构成重复这次修改的理由。读出错误里给出的状态，或者把状态查出来，再按状态做决定。把时间会改变的错误，和以后任何调用都改变不了的错误分开；让状态机的终态集合结束每一个循环，包括你没预料到的那些状态。

## Taught in

[A2A 101 的取消页面](../../../manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md)逐一讲解了这四次交互，[状态表](../../../manuals/a2a-101/sections/r-3-task-states.md)给出了客户端在每种状态下的下一步，[错误页面](../../../manuals/a2a-101/sections/5-5-errors.md)解释了一个错误码为什么覆盖三种情况，[失败模式这一课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)描述了客户端分不清“我失败了”和“这件事做不到”时引发的连锁故障。
