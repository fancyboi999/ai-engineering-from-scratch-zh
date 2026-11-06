---
id: a2a-stream-drop-resubscribe
title: 不靠重放，恢复断开的 A2A 流
card: protocols
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, debugging]
tags: [a2a, streaming, subscribe, artifacts, reconnect]
minutes: 10
lessons: []
manuals: [a2a-101#s-streaming-and-subscribe-to-task, a2a-101#s-artifact-and-chunks]
practice: []
cheatsheet: [a2a, a2a-and-agent-messaging]
related: [protocols/a2a-rejected-task-loop, protocols/a2a-webhook-at-least-once]
updated: 2026-11-03
---

你的客户端通过 `SendStreamingMessage` 盯着一次耗时很长的测试运行。收到四帧之后连接断了，而 agent 还在继续工作，并往日志产物里追加了更多行。设计恢复方案：客户端怎么知道自己错过了什么，怎么重建日志，又怎么知道何时停止重连。

## Short answer

什么都不会重放，因为流是实时视图，规范也没有定义游标。客户端用任务 id 调用 `SubscribeToTask`，第一帧必须是一个 `Task` 快照，里面已经包含客户端离开期间写入的所有分块。客户端用快照里的副本替换自己手上不完整的产物，再追加后续帧。之后某次订阅返回 `UnsupportedOperationError` 时，说明任务已到终态，客户端停止重连，用 `GetTask` 读取最终任务。

## Full answer

### 流是什么

每个事件携带一个 `StreamResponse`，其中 `task`、`message`、`statusUpdate`、`artifactUpdate` 恰好有一个。每个实现都必须按事件产生的顺序，把事件发给该任务的每一个打开的流。任务的生命周期不依赖任何一个流的生命周期。

在录制的运行里，客户端收到四帧后关闭了连接。agent 随后又追加了两个分块，没有任何连接把它们送出去。这些事件丢了，但存储的任务里有这两个分块。

### 快照才是准的

```text
SubscribeToTask {id}
  frame 1: task snapshot, state WORKING, artifact test-log with parts 01 to 04
  frames 2 to 5: artifactUpdate, chunks 05 to 08, append true
  frame 6: statusUpdate, TASK_STATE_COMPLETED, "96 passed"
```

按 `artifactId` 重建。不带 `append` 的分块会替换或创建该产物；带 `append: true` 的分块会把自己的 part 追加到同一 id 的已存产物上。快照只包含当前的 `status`，所以重连的客户端可能错过状态更新。正因如此，结果应该放在产物里。

### 流什么时候结束

1.0 版本去掉了 `final` 标志，所以没有哪一帧会宣布结束。任务进入终态时，流必须关闭。到了中断状态，各方说法不一：录制用的套件在 `TASK_STATE_INPUT_REQUIRED` 时关闭，在 `TASK_STATE_AUTH_REQUIRED` 时保持打开，六个 SDK 也分成同样的两派。所以单凭关闭，只能说明这次读取结束了。调用 `GetTask`；如果任务不在终态，就按它的状态处理，然后重新订阅。

### 什么时候停

对已完成的任务调用 `SubscribeToTask`，会以 `UnsupportedOperationError`（`-32004`）失败，返回的是普通 JSON，没有流。这就是停止信号。用 `GetTask` 读取最终任务，把其中的产物当作结果。

### 录制结果里的另外两条规则

- 每个产物的第一个分块都不带 `append` 发送，因为服务器对未知 id 上的 `append: true` 处理不一：一个让任务失败，一个丢掉分块，两个新建产物。
- 走 HTTP+JSON 时，向 `/tasks/{id}:subscribe` 发 `POST`，因为有两个 SDK 服务器没有为 `GET` 配路由；服务器应该两种都接受。

## Follow-ups

- **Level 3:** 为什么用快照替换产物，而不是合并？ Expected: 错过的分块永远不会重放，快照就是存储的副本，合并会让 part 重复。
- **Level 3:** 流在一个 `TASK_STATE_INPUT_REQUIRED` 状态帧之后立刻关闭了。任务结束了吗？ Expected: 没有；关闭只是结束了读取，所以要调用 `GetTask`，并在同一个任务上回答那个问题。
- **Level 4:** 最后一条状态消息写着“done”，但关闭前没有收到终态。你信什么？ Expected: 信 `GetTask` 返回的状态；只有记录了终态，任务才算结束，绝不能凭关闭或一段文字判断。
- **Level 4:** `lastChunk` 和任务结束有什么关系？ Expected: 它只结束一个产物；录制的流在一个 `lastChunk` 之后又发了两帧，被取消的任务也可能存着一个从没收到它的产物。

## Wrong answers

- "带上最后的事件 id 重连，让服务器重放。" 规范没有定义游标，也没有重放。`SubscribeToTask` 改为先发一个快照。
- "连接关闭说明任务结束了。" 不同服务器在不同状态下关闭。停之前先用 `GetTask` 确认状态。
- "保留已有的分块，再追加快照里的分块。" 这样会让 part 重复。快照替换你的副本，之后的帧再追加。

## Taught in

[SendStreamingMessage 与 SubscribeToTask 一节](../../../manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md)记录了断开的流和快照，[Artifact 与分块一节](../../../manuals/a2a-101/sections/3-3-artifact-and-chunks.md)给出了重建规则。
