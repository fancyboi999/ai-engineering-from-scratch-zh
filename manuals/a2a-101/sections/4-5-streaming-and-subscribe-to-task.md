# SendStreamingMessage 与 SubscribeToTask

> 流是单个任务的实时视图，连接断开只让你丢失离线期间发送的帧，不会丢失任务本身。

planner 请 `test-runner` 在提交 `9f3c2e1` 上运行 `payments-api` 全套测试，通过流观察日志。四帧之后客户端关闭连接，测试继续运行，planner 仍想获取余下日志。

读完本节后，你可以用两种操作打开流，判断它何时结束，并在断开后恢复。

## 流承载什么 {#s-streaming-and-subscribe-to-task-what-a-stream-carries}

**流：** 类型为 `text/event-stream` 的 HTTP 响应，响应体是一系列 Server-Sent Events。每个事件带一个 `StreamResponse`，恰好包含 `task`、`message`、`statusUpdate`、`artifactUpdate` 之一。 {{spec §9.4.2}} {{spec §11.7}} {{proto StreamResponse}}

两种操作打开流：`SendStreamingMessage` 发送消息并观察它启动的工作，`SubscribeToTask` 观察已有任务。 {{spec §3.5.1}}

```listing
title: 首条流，客户端在四帧后关闭
source: capture/out/14-resubscribe.http
lang: sse
note: 每帧在行内删节。最后一行是客户端断开时套件写入记录的注释。
---
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"jsonrpc": "2.0", "id": 1, "result": {"task": {… "state": "TASK_STATE_SUBMITTED", …

data: {"jsonrpc": "2.0", "id": 1, "result": {"statusUpdate": {… "state": "TASK_STATE_WORKING", …

data: {"jsonrpc": "2.0", "id": 1, "result": {"artifactUpdate": {… "name": "test-log.txt", …

data: {"jsonrpc": "2.0", "id": 1, "result": {"artifactUpdate": {… "append": true}}}

# the client closes the connection after 4 events
```

流式指南把负载称为 JSON-RPC 2.0 Response 对象，通常为 `SendStreamingMessageResponse`，但 proto 不定义该类型（[冲突 D33](#s-ref-sources)）。迁移指南称更新成员为 `taskStatusUpdate` 和 `taskArtifactUpdate`，proto 和这些帧则用 `statusUpdate`、`artifactUpdate`（[冲突 D9](#s-ref-sources)）。按 proto 名称匹配。 {{docs streaming-and-async}} {{proto A2AService}} {{docs whats-new-v1}}

规范不定义 `event:` 类型、`id:` 行、`retry:` 值或 keep-alive。参考 SDK 发送保活注释，并用 `event: error` 标记迟发错误，因此跳过注释并检查每个负载的 `error`。 {{spec §11.7}} {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}}

## 顺序与关闭 {#s-streaming-and-subscribe-to-task-order-and-the-close}

所有实现 `MUST` 按生成顺序交付事件，`MUST` 将事件广播给该任务的所有活跃流。没有任何流拥有任务： {{spec §3.5.2}}

```rule
label: 流不是任务
source: spec §3.5.2
---
任务生命周期与任一单独流的生命周期相互独立
```

1.0 没有结束标记：TaskStatusUpdateEvent 的 `final` 布尔字段已删除。任务流 `MUST` 在任务进入终态时关闭，`SubscribeToTask` 流也一样。`message` 帧后立即关闭。 {{docs whats-new-v1}} {{spec §3.1.2}} {{spec §3.1.6}}

中断态下，§11.7 和流式指南要求关闭，§7.6.1 却要求在 `TASK_STATE_AUTH_REQUIRED` 保持打开（[冲突 D3](#s-ref-sources)）。[中断态](#s-input-required-and-auth-required)列出各 SDK 的关闭时机，因此关闭本身只表示读取结束。 {{spec §11.7}} {{docs streaming-and-async}} {{spec §7.6.1}}

## 连接断开与 SubscribeToTask {#s-streaming-and-subscribe-to-task-a-dropped-connection-and-subscribetotask}

```figure
id: fig-stream-resubscribe
kind: sequence
title: 四帧后断开，再接续的流
claim: 流断开会丢失关闭期间发送的帧，SubscribeToTask 以已包含这些内容的 Task 快照恢复。
caption: 从上到下读。步骤 1 至 5 是首条流，只将无人看到的写入画到任务存储。帧编号在每条流内计数。来自 capture/out/14-resubscribe.http，ID 缩短至 8 个字符。
```

第 4 帧之后，agent 将分块 03、04 追加到 `test-log.txt`，没有打开的连接承载它们的 `artifactUpdate`，见[此图](#fig-stream-resubscribe)。事件已消失，存储任务包含两个分块。

**SubscribeToTask：** 给定已有任务 `id`，打开新流的操作。首帧是快照，操作 `MUST` 将 `Task` 对象作为流的首个事件返回。 {{proto SubscribeToTaskRequest}} {{spec §3.1.6}}

```listing
title: SubscribeToTask 后的首帧，完整 Task 快照
source: capture/out/14-resubscribe.events.json
lang: json
note: 状态消息、历史及日志 part 02、03 已省略。
---
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "task": {
      "id": "25239d4c-798b-4754-be06-d1f94d0645b1",
…
      "status": {
        "state": "TASK_STATE_WORKING",
…
      "artifacts": [
        {
          "artifactId": "test-log",
          "name": "test-log.txt",
          "parts": [
            {
              "text": "tests/test_suite_01.py ........\n"
…
              "text": "tests/test_suite_04.py ........\n"
```

第 2 至第 5 帧追加分块 05 至 08，第 6 帧携带 `TASK_STATE_COMPLETED` 和原始消息 `96 passed`。没有重放，规范也不定义游标。因此先用快照产物替换不完整 `test-log.txt`，再追加后续帧。

快照只有当前 `status`，重连客户端可能收不到所有状态更新消息，因此结果要放在产物里。 {{spec §3.7}}

任务完成后的第二次 `SubscribeToTask` 以 `UnsupportedOperationError`、`-32004` 失败，返回普通 JSON，没有流。因此停止重连，用 `GetTask` 读取最终任务，见 [GetTask 与 ListTasks](#s-get-task-and-list-tasks)。 {{spec §3.1.6}} {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}}

## HTTP+JSON 的订阅动词 {#s-streaming-and-subscribe-to-task-the-subscribe-verb-over-http-json}

HTTP+JSON 路由为 `/tasks/{id}:subscribe`，规范却给它两个动词。proto 绑定 `GET`，方法表和 URL 列表显示 `POST`（[冲突 D1](#s-ref-sources)）。2026-09-29 项目指导委员会在 [PR #2068](https://github.com/a2aproject/A2A/pull/2068)选择与 proto 一致的 `GET`。此变更在 `dev-1.1`，尚未发布，main 上选择 `POST` 的 [PR #1891](https://github.com/a2aproject/A2A/pull/1891)仍开放。SDK 分为三类： {{proto A2AService}} {{spec §5.3}} {{spec §11.3.2}}

| SDK | 服务器接受 | 客户端发送 |
|---|---|---|
| a2a-python 1.2.2 | `GET` 和 `POST` | `POST`  {{sdk src/a2a/server/routes/rest_routes.py}} |
| a2a-go | `GET` 和 `POST` | `POST`  {{sdk-go a2asrv/rest.go at v2.6.0}} |
| a2a-java | `POST` | `POST`  {{sdk-java reference/rest/src/main/java/org/a2aproject/sdk/server/rest/quarkus/A2AServerRoutes.java at v1.4.0.Final}} |
| a2a-js | `GET` 和 `POST` | `POST`  {{sdk-js src/server/express/rest_handler.ts at v1.3.0}} |
| a2a-dotnet | `POST` | `POST`  {{sdk-dotnet src/A2A.AspNetCore/A2AEndpointRouteBuilderExtensions.cs at v1.0.0-preview2}} |
| a2a-rs | `GET` 和 `POST` | `GET`  {{sdk-rust a2a-server/src/rest.rs at a2a-server-lf-v0.5.1}} |

`POST` 能到达全部六台服务器，`GET` 只能到达四台。因此像六个客户端中的五个一样发送 `POST`，服务器应同时接受两者。

```takeaways
- 只有最后一帧含终态时才视为任务结束，不要仅凭关闭判断。
- 断开后调用 `SubscribeToTask`，从首帧 `Task` 快照重建本地副本。
- `SubscribeToTask` 返回 `-32004` 时，停止重连并用 `GetTask` 读取结果。
- 向 `/tasks/{id}:subscribe` 发送 `POST`，因为两个 SDK 服务器没有 `GET` 路由。
```

Sources: spec §3.1.2, §3.1.6, §3.5.1, §3.5.2, §3.7, §5.3, §7.6.1, §9.4.2, §11.3.2, §11.7 (research/sources/specification.md); proto StreamResponse, SubscribeToTaskRequest, A2AService (research/sources/a2a.proto); docs whats-new-v1, streaming-and-async (research/sources/docs.md); a2aproject/A2A PR #2068 and PR #1891, checked 2026-10-06; sdk src/a2a/server/routes/jsonrpc_dispatcher.py, src/a2a/server/routes/rest_routes.py, src/a2a/client/transports/rest.py (a2a-python 1.2.2); sdk-go a2asrv/rest.go, a2aclient/rest.go (a2a-go v2.6.0); sdk-java reference/rest/src/main/java/org/a2aproject/sdk/server/rest/quarkus/A2AServerRoutes.java, client/transport/rest/src/main/java/org/a2aproject/sdk/client/transport/rest/RestTransport.java (a2a-java v1.4.0.Final); sdk-js src/server/express/rest_handler.ts, src/client/transports/rest_transport.ts (a2a-js v1.3.0); sdk-dotnet src/A2A.AspNetCore/A2AEndpointRouteBuilderExtensions.cs, src/A2A/Client/A2AHttpJsonClient.cs (a2a-dotnet v1.0.0-preview2); sdk-rust a2a-server/src/rest.rs, a2a-client/src/rest.rs (a2a-rs a2a-server-lf-v0.5.1); capture/out/14-resubscribe.http, 14-resubscribe.events.json
