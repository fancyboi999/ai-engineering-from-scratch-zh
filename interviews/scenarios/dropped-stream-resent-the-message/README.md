---
id: dropped-stream-resent-the-message
title: 流断开一次，测试套件就跑了两遍
card: scenarios
kind: incident
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [a2a, streaming, sse, subscribe, idempotency, reconnect]
minutes: 25
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: [a2a, agent-failure-modes]
related: [scenarios/cancel-a-finished-task]
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/capture/out/14-resubscribe.http
  - manuals/a2a-101/capture/out/14-resubscribe.events.json
  - manuals/a2a-101/capture/out/05-streaming.http
  - manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md
  - manuals/a2a-101/sections/3-1-message.md
---

## Situation

规划器通过 `test-runner` agent 的流式输出监控一套耗时很长的测试。两者之间隔着一个负载均衡器，会关闭开启过久的连接。规划器的流处理器来自一个 REST 客户端，对于在最终帧之前断开的连接，它只有一条规则：把请求再发一次。昨天，`payments-api` 的测试套件每断一次就多跑一遍。CI 账单翻了一倍，一个不稳定的测试第一次跑通过了，第二次失败，挡住了一次发布。

一位同事改了处理器：断开后调用 `SubscribeToTask`，遇到任何错误就重试这个调用。下一次处理器重连时任务已经结束，调用返回了错误，处理器记下“这个服务端不支持订阅”，并对这个 agent 关掉了流式。你手上有同一顺序的采集：一个客户端在四帧后关闭的流，接上它的调用，以及结束后的第三次调用。

## Evidence

- [第一个流：四帧，然后客户端关闭连接](evidence/first-stream.txt)
- [重新接上流的请求](evidence/subscribe-request.txt)
- [第二个流：六帧，直到结束](evidence/resumed-stream.txt)
- [第二个流第一帧里的产物](evidence/snapshot-artifacts.txt)
- [任务完成后的第三次 SubscribeToTask：状态码和错误码](evidence/subscribe-after-completion.txt)
- [这个错误里的详情](evidence/subscribe-after-completion-reason.txt)
- [各实现对重复 messageId 的处理](evidence/message-id-rule.txt)

## Questions

1. 第一个流在第四帧关闭后，任务怎么样了？agent 接下来发出的事件去了哪里？
2. 两个请求有什么不同？为什么一个会产生新工作，另一个不会？
3. 第二个流的第一帧里有什么？客户端怎样把它和已有的内容合并？
4. 第三次调用返回错误。它是什么意思？下一个调用是什么？
5. 重复的 messageId 在这里能保护规划器吗？为什么？

## Walkthrough

1. **读第一个流。** 到达了四帧：一个处于 `TASK_STATE_SUBMITTED` 的 `task`，一个变为 `TASK_STATE_WORKING` 的 `statusUpdate`，一个打开 `test-log.txt` 并写入第一个测试文件的 `artifactUpdate`，以及一个追加第二个文件的 `artifactUpdate`。然后采集套件的注释说客户端关闭了连接。没有一帧带有终态，所以任务还活着。任务的生命周期不依赖任何一个流。agent 继续工作，又往它存储的产物里追加了两个文件，而这些事件没有打开的连接可以送出去。
2. **读第二个请求。** 方法是 `SubscribeToTask`，参数里只有任务 id。没有消息，也没有 `messageId`。这个调用对已经存在的工作打开一个视图，不创建任何东西。规划器原来的处理器发的却是一个新的 `SendStreamingMessage`，而不带 `taskId` 的消息每次都会启动一个新任务。
3. **读第二个流。** 第 1 帧是一个完整的 `task` 对象，仍处于 `TASK_STATE_WORKING`。它的 `test-log` 产物已经有四部分，`test_suite_01` 到 `test_suite_04`，其中包括第一个流从没送来的那两个文件。第 2 到 5 帧追加 `test_suite_05` 到 `test_suite_08`，其中最后一帧设置了 `lastChunk`。第 6 帧是一个 `statusUpdate`，变为 `TASK_STATE_COMPLETED`，带着 `96 passed`。没有任何事件被重放，协议也没有游标。客户端用快照里的产物替换自己不完整的日志，再追加之后的帧。
4. **读第三次调用。** 回复的头是 `Content-Type: application/json`，不是事件流。它是一个 `error`，错误码 -32004，原因 `UNSUPPORTED_OPERATION`，元数据给出状态 `TASK_STATE_COMPLETED`。这是这个错误码的终态任务情形，不是缺了某个功能。客户端停止重连，用 `GetTask` 读取最终的任务。
5. **核对 id 规则。** 一次没收到回复的发送，重试时可以复用同一个 `messageId`。没有哪个实现会拒绝重复的 id，而不带 `taskId` 的每个副本都会再建一个任务。所以 id 只在“发送可能没到达”时保护规划器。这里任务已经存在，客户端手里有它的 id，正确的调用是订阅，不是发送。

## Resolution

重连规则造成了重复运行。`SendStreamingMessage` 是一条命令加一个视图，重发命令就会重复工作。修复分四部分。连接关闭只结束读取，不结束别的。如果最后一帧不是终态，处理器就用任务 id 调用 `SubscribeToTask`。它用第一帧里的 `task` 快照重建自己的副本，再追加后面的帧。遇到 -32004 时，它停止重连，调用 `GetTask`。采集就是证据：同一个任务 id 贯穿两个流，恢复后的流送来了缺的四个文件和最终的 `96 passed`，agent 只跑了一次测试套件。

## Wrong turns

- "断开后把请求再发一次。" 请求里带着消息，不带任务 id 的消息会启动新任务。测试套件又跑一遍。
- "用同一个 messageId 重发，服务端会丢掉重复的。" 重复检测是可选的，没有哪个实现会拒绝重复的 id，不带任务 id 的每个副本都会新建任务。
- "连接关了，所以任务结束了。" 只有帧里的终态才结束任务。采集套件在请求输入时也会关闭连接，各服务端关闭连接的时机也不一样。任何关闭之后都调用 `GetTask`。
- "-32004 表示这个服务端没有 SubscribeToTask。" 元数据给出的是已完成状态。调用一次 `GetTask` 就能拿到结果。
- "把新帧追加到旧的不完整日志后面。" 没有连接时写入了两个文件。快照里有它们，所以先替换副本，再追加。

## Generalize

把工作和工作的视图分开。产生工作的命令只能发一次，重连必须按工作的 id 打开视图，绝不重复命令。从服务端拥有的快照恢复，让数据里的终态告诉你工作完成了，而不是连接的结束。

## Taught in

[A2A 101 的流式页面](../../../manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md)跟踪了这次断开和恢复它的订阅，[消息页面](../../../manuals/a2a-101/sections/3-1-message.md)说明了各实现怎样处理重复的 `messageId`，[失败模式这一课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)把重复的步骤列为 agent 循环出错的方式之一。
