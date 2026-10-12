# JSON-RPC

> JSON-RPC 将所有操作 POST 到同一 URL，以 `method` 指定操作、`params` 携带请求消息，在 200 回复中返回响应消息或错误。

发送 diff 前，planner 先问 `code-reviewer`："What languages can you review?"（能审查哪些语言？）。卡片列出绑定 `JSONRPC` 的 `http://localhost:41242/a2a/jsonrpc`，planner 向该 URL 发送一次 POST。reviewer 回答消息而不创建任务，记录在 `02-message-reply.http`。

读完本节后，你可以将任意 A2A 调用写成 JSON-RPC 请求，读取回复、流帧和错误。

## 包装 {#s-json-rpc-the-envelope}

**协议绑定：** 十一种操作在某种传输上的形式，包括名称、路由、包装、头和错误结构。三种标准绑定为 JSON-RPC、gRPC、HTTP+JSON，卡片通过 `protocolBinding` 指定。核心概念指南仍称 JSON-RPC 2.0 是所有请求和响应的负载格式，实际上只描述三种绑定之一（[冲突 D27](#s-ref-sources)）。 {{spec §9}} {{spec §10}} {{spec §11}} {{proto AgentInterface}} {{docs key-concepts}}

JSON-RPC 请求是含四个成员的 JSON 对象。`jsonrpc` 固定为 `2.0`，客户端选择 `id`，`method` 保存操作名，`params` 保存请求消息。名称遵循与 gRPC 相同的 PascalCase，因此 `method` 写 `SendMessage` 或 `GetTask`，即 `A2AService` 的 rpc 名。§9.3 模板仍使用 0.3 风格 `"method": "category/action"`，从 §9.1 或[按绑定列出的操作](#s-ref-operations-by-binding)复制名称（[冲突 D14](#s-ref-sources)）。`11-errors.http` 第 3 次交换展示套件对旧名 `message/send` 返回 `-32601`。 {{spec §9.3}} {{spec §9.1}} {{proto A2AService}}

回复重复请求 `id`，在 `result` 中保存响应消息。`SendMessage` 的响应是含一个 `task` 或一个 `message` 的 `SendMessageResponse`： {{spec §9.4.1}} {{proto SendMessageResponse}}

```listing
title: JSON-RPC 上的问题与直接回答
source: capture/out/02-message-reply.http
lang: http
note: Host、A2A-Version 头及两条消息的 parts 已省略。[SendMessage](#s-send-message) 解释何时结果是消息、何时是任务。
---
POST /a2a/jsonrpc HTTP/1.1
Content-Type: application/json
…
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "d95bafc8-f2a4-427b-9cf4-bb99f4bea973",
      "role": "ROLE_USER",
…
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "message": {
      "messageId": "3b4b1206-4b6f-467f-b735-2d7e4f7f4bcd",
      "contextId": "dc423c62-d5f4-48e5-82c0-4963b9bc4334",
      "role": "ROLE_AGENT",
…
```

## 一个 URL，一种内容类型 {#s-json-rpc-one-url-one-content-type}

绑定是 HTTP(S) 上的 JSON-RPC 2.0，每个调用都向选中接口 URL POST。路径不带操作名，套件在 `/a2a/jsonrpc` 提供全部十一种操作。请求和回复均用 `application/json`，HTTP+JSON 使用自己的类型，见 [HTTP+JSON](#s-http-json)。 {{spec §9.1}}

请求体旁的头是两个服务参数：`A2A-Version` 和 `A2A-Extensions`，此绑定 `MUST` 通过标准 HTTP 请求头传输。[A2A-Version 与 A2A-Extensions](#s-version-and-extension-headers)介绍规则以及 SDK 在缺少它们时的行为。 {{spec §9.2}}

## 以 SSE 帧承载流 {#s-json-rpc-streams-as-sse-frames}

`SendStreamingMessage` 和 `SubscribeToTask` 用 `Content-Type: text/event-stream` 回答，而非单个 JSON 体。每行 `data:` 是完整 JSON-RPC 响应，`id` 与请求相同，`result` 中放一个 `StreamResponse`。同一解析器可读取单次回复和每个帧。 {{spec §9.4.2}} {{proto StreamResponse}}

```listing
title: 流的前两帧，各为完整 JSON-RPC 响应
source: capture/out/05-streaming.http
lang: sse
note: 请求及各帧内部已删节。文件含全部九帧，05-streaming.events.json 完整打印它们。
---
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"jsonrpc": "2.0", "id": 1, "result": {"task": {"id": "728ba084-97eb-422b-b94b-b0fe9153ce2c", …

data: {"jsonrpc": "2.0", "id": 1, "result": {"statusUpdate": {"taskId": "728ba084-97eb-422b-b94b-b0fe9153ce2c", …
```

HTTP+JSON 帧只带 `StreamResponse`，gRPC 返回服务器流式 rpc，见 [HTTP+JSON](#s-http-json) 和 [gRPC](#s-grpc)。各绑定帧携带相同四种负载，结束原因也相同，见[流式传输与订阅](#s-streaming-and-subscribe-to-task)。

## 同一包装中的错误 {#s-json-rpc-errors-in-the-same-envelope}

失败调用仍是 JSON-RPC 响应：含 `code`、`message`、`data` 的 `error` 替换 `result`。规范未规定此时的 HTTP 状态，套件与参考 SDK 返回 `200`。A2A 错误使用 `-32001` 至 `-32009`，`data` 中的详细信息标识具体错误。[错误](#s-errors)逐绑定解读。 {{spec §9.5}} {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}}

```takeaways
- 将所有操作 POST 到卡片的同一 JSON-RPC URL，在 `method` 写 PascalCase 名称。
- 发送 `Content-Type: application/json`，从 `result` 读取响应消息。
- 将每行 SSE `data:` 解析为带请求 `id` 的完整 JSON-RPC 响应。
- 读取 `result` 前，检查每个回复和帧是否含 `error`。
```

Sources: spec §9, §9.1, §9.2, §9.3, §9.4.1, §9.4.2, §9.5, §10, §11 (research/sources/specification.md); proto AgentInterface, A2AService, SendMessageResponse, StreamResponse (research/sources/a2a.proto); docs key-concepts (research/sources/docs.md); sdk src/a2a/server/routes/jsonrpc_dispatcher.py (a2a-python 1.2.2); capture/out/02-message-reply.http, 05-streaming.http, 05-streaming.events.json, 11-errors.http; capture/a2a_ref.py
