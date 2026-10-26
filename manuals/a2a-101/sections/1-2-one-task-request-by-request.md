# 逐个请求看一个任务

> test-runner 的一次流式运行按顺序展示协议的每个环节，从读取卡片直到服务器关闭流。

你的 planner 要在提交 `9f3c2e1` 上运行 `payments-api` 的单元测试，还想实时查看增长的日志。它已有 `test-runner` 的卡片，能力包含 `"streaming": true`，因此用 `SendStreamingMessage` 发送请求。

本节逐帧跟踪 `capture/out/05-streaming.http` 中的运行，[图中](#fig-one-streamed-task)也有展示。读完本节后，你可以阅读任意任务流，说明每帧如何改变已存储的任务。

```figure
id: fig-one-streamed-task
kind: sequence
title: 从读取卡片到关闭流的一个任务
claim: 流式任务以任务本身开头，用状态帧和产物帧报告工作，终态之后服务器关闭流，运行结束。
caption: 从上到下读。无编号行在流之前，每个编号行是一个数据帧，编号与 capture/out/05-streaming.http 一致。右侧时间戳来自套件时钟，任务 ID 缩短至 8 个字符。
```

## 第一帧之前 {#s-one-task-request-by-request-before-the-first-frame}

如果卡片没有将 `capabilities.streaming` 设为 `true`，agent 必须以 `UnsupportedOperationError` 拒绝 `SendStreamingMessage` {{spec §3.3.4}}，见[发现](#s-discovery-and-supported-interfaces)一节。请求本身很短：

```listing
title: 打开流的请求
source: capture/out/05-streaming.http
lang: http
note: JSON-RPC 包装的开头几行和闭合括号已省略。
---
POST /a2a/jsonrpc HTTP/1.1
Host: localhost:41241
Content-Type: application/json
A2A-Version: 1.0
Accept: text/event-stream
…
  "method": "SendStreamingMessage",
  "params": {
    "message": {
      "messageId": "5bc8fbbc-bde5-4099-8164-d8399f767c45",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "Run the unit tests for payments-api at commit 9f3c2e1"
        }
      ]
…
```

客户端自行生成 `messageId`，没有发送 `taskId` 或 `contextId`，因此 agent 创建二者。响应头为 `HTTP/1.1 200 OK` 和 `Content-Type: text/event-stream`。此后每个事件是一行 `data:`，包含完整 JSON-RPC 响应，`id` 与请求相同，为 `1` {{spec §9.4.2}}。

## 第 1 帧：任务出现 {#s-one-task-request-by-request-frame-1-the-task-appears}

任务流必须先发送 `Task` 对象 {{spec §3.1.2}}。这个任务已处于 `TASK_STATE_SUBMITTED`：

```listing
title: 第 1 帧，新任务
source: capture/out/05-streaming.events.json
lang: json
note: JSON-RPC 包装、消息 parts 和闭合括号已省略。
---
"task": {
  "id": "728ba084-97eb-422b-b94b-b0fe9153ce2c",
  "contextId": "c026046c-6890-4830-9618-8fffa35cb080",
  "status": {
    "state": "TASK_STATE_SUBMITTED",
    "timestamp": "2026-10-06T09:00:01.750Z"
  },
  "history": [
    {
      "messageId": "5bc8fbbc-bde5-4099-8164-d8399f767c45",
      "contextId": "c026046c-6890-4830-9618-8fffa35cb080",
      "taskId": "728ba084-97eb-422b-b94b-b0fe9153ce2c",
      "role": "ROLE_USER",
      …
```

服务器生成任务 `728ba084` 和上下文 `c026046c`，把两个 ID 写入它保存的 planner 消息副本。此后 planner 将每帧与这两个 ID 匹配。套件填写首个状态中可选的 `timestamp` {{proto TaskStatus}}，SDK 则省略它，见[套件 README](manuals/a2a-101/capture/README.md)。

## 第 2 帧：开始工作 {#s-one-task-request-by-request-frame-2-the-work-starts}

第 2 帧是 `statusUpdate`，把任务移到 `TASK_STATE_WORKING`，状态消息为原始记录 "Checking out 9f3c2e1 and starting the suite"（检出提交并开始测试）。每个状态事件都指定任务和上下文，因为 `taskId`、`contextId` 和 `status` 均为 REQUIRED {{proto TaskStatusUpdateEvent}}。

## 第 3 至第 8 帧：结果分块到达 {#s-one-task-request-by-request-frames-3-to-8-the-results-arrive-in-pieces}

接下来六帧是 `artifactUpdate` 事件，此类型没有时间戳字段 {{proto TaskArtifactUpdateEvent}}。第 3 至第 7 帧逐行构建一个产物 `test-log`：

- 第 3 帧携带 `artifactId` 为 `test-log`、`name` 为 `test-log.txt`，以及第一个 part。没有 `append`，因此开始该产物。
- 第 4、5、6 帧重复 `artifactId`，省略 `name`，设置 `append: true`。
- 第 7 帧同时设置 `append: true` 和 `lastChunk: true`，日志完整了。
- 第 8 帧用一个分块开始第二个产物 `summary`：媒体类型为 `application/json` 的 data part，且 `lastChunk: true`。

`lastChunk` 只结束一个产物：第 8 帧也带有自己的标记，而任务仍在运行。[产物与分块](#s-artifact-and-chunks)展示客户端如何拼接分块，以及规范未规定的部分。

## 第 9 帧与关闭 {#s-one-task-request-by-request-frame-9-and-the-close}

第 9 帧是最后一个 `statusUpdate`。它在 `09:00:02.250Z` 将任务移到 `TASK_STATE_COMPLETED`，状态消息为 "1 failed, 11 passed"（1 项失败，11 项通过）。尽管有测试失败，任务仍完成，因为失败是结果的一部分。

随后服务器关闭连接，没有帧宣告关闭，因为 1.0 删除了 `final` 标志 {{docs whats-new-v1}}。任务到达终态时，服务必须关闭流 {{spec §3.1.2}}。中断态是否关闭流，规范自相矛盾（[冲突 D3](#s-ref-sources)）。[中断态](#s-input-required-and-auth-required)一节列出关闭时机，其[图表](#fig-auth-required)跟踪一个保持打开的流。

## 流结束后的任务 {#s-one-task-request-by-request-the-task-after-the-stream}

关闭后任务仍保存在存储中，客户端通过 `GetTask` 读取。客户端可以在收到推送通知或流结束后调用此操作，读取任务最终状态 {{spec §3.1.3}}。[GetTask 与 ListTasks](#s-get-task-and-list-tasks)介绍其返回内容。

```takeaways
- 从第一帧取出任务 ID 和上下文 ID，并让后续每帧与它们匹配。
- 将 `lastChunk` 视为单个产物的结束，绝不是任务的结束。
- 流关闭后，用 `GetTask` 确认任务状态。
```

Sources: spec §3.1.2, §3.1.3, §3.3.4, §9.4.2 (research/sources/specification.md); proto TaskStatus, TaskStatusUpdateEvent, TaskArtifactUpdateEvent (research/sources/a2a.proto); docs whats-new-v1 (research/sources/docs.md); capture/README.md, capture/a2a_ref.py; capture/out/01-agent-cards.http, 05-streaming.http, 05-streaming.events.json
