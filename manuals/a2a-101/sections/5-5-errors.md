# 错误

> 九种 A2A 错误映射到三种绑定，状态码会重合，需靠详情中的 `ErrorInfo` reason 区分。

planner 分别用两种 JSON 绑定向 `test-runner` 请求不存在的任务 ID。JSON-RPC 返回 `HTTP/1.1 200 OK` 和代码 `-32001`，HTTP+JSON 返回 `HTTP/1.1 404 Not Found`。两者含相同 `ErrorInfo`，reason 为 `TASK_NOT_FOUND`，见[此图](#fig-task-not-found)。

读完本节后，你可以读取任意绑定的错误，识别背后的 A2A 错误，并选择下一步。

```figure
id: fig-task-not-found
kind: comparison
title: 两种 JSON 绑定中的 TaskNotFoundError
claim: 同一 TaskNotFoundError 在 JSON-RPC 为 HTTP 200 加代码 -32001，在 HTTP+JSON 为 HTTP 404，携带相同 ErrorInfo。
caption: 左侧为 capture/out/11-errors.http 中 JSON-RPC GetTask，右侧为 capture/out/16-rest-binding.http 中 HTTP+JSON 的同一查找。底框是两个回复共同携带的详情。ID 缩短至 8 个字符。
```

## 指明错误的详情 {#s-errors-the-detail-that-names-the-error}

规范定义九种 A2A 错误，并分别映射到各绑定。JSON-RPC 编号 `-32001` 至 `-32009`，HTTP 七种用 `400`，gRPC 六种用 `FAILED_PRECONDITION`，见[错误表](#s-ref-errors)。 {{spec §3.3.2}} {{spec §5.4}} {{spec §9.5}}

每个错误带代码、消息和可选 `details`，每项详情通过 `@type` 指定类型。A2A 错误中决定性的详情是 `google.rpc.ErrorInfo`： {{spec §3.3.2}}

```rule
label: 指明错误的详情
source: spec §11.6
---
A2A 特定错误的 `details` 数组必须包含 `google.rpc.ErrorInfo` 对象
```

`reason` 是去掉 `Error` 后缀的大写蛇形错误名，如 `TASK_NOT_FOUND`，`domain` 是 `a2a-protocol.org`。gRPC 绑定也有同样 `MUST`，JSON-RPC 只有 `SHOULD`。`metadata` 为自由形式：套件填写，参考 SDK 留空，见套件 README。 {{spec §11.6}} {{spec §10.6}} {{spec §9.5}}

## JSON-RPC 错误随 HTTP 200 到达 {#s-errors-json-rpc-errors-arrive-with-http-200}

JSON-RPC 错误是 HTTP `200` 的普通响应。`error` 成员在原本 `result` 的位置包含 `code`、`message`、`data`。五种标准 JSON-RPC 代码 `-32700` 和 `-32600` 至 `-32603` 保持原义。 {{spec §9.5}}

验证错误用另一详情类型 `google.rpc.BadRequest` 指明字段：

```listing
title: 缺少 messageId 的消息，以 BadRequest 详情拒绝
source: capture/out/11-errors.http
lang: http
note: 请求只保留 message 开头，其中没有 messageId。
---
    "message": {
      "role": "ROLE_USER",
…
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32602,
    "message": "Invalid parameters",
    "data": [
      {
        "@type": "type.googleapis.com/google.rpc.BadRequest",
        "fieldViolations": [
          {
            "field": "message.messageId",
            "description": "messageId is required"
```

不要匹配消息文本：参考 SDK 对同一情况回答原始字面量 "Validation failed"，字段名为 `message.message_id`。 {{sdk src/a2a/utils/proto_utils.py}}

认证可以在 JSON-RPC 运行前失败，规范示例为 HTTP `401`，因此先读状态，见[安全方案](#s-security-schemes-and-in-task-authorization)。 {{spec §3.3.2}}

## HTTP+JSON 错误是 google.rpc.Status {#s-errors-http-json-errors-are-google-rpc-status}

HTTP+JSON 错误使用 HTTP 状态及 JSON `google.rpc.Status`。`error` 对象在 `code` 重复状态，在 `status` 指定 gRPC 状态，另有 `message` 和 `details`： {{spec §11.6}}

```listing
title: HTTP+JSON 上取消已完成任务
source: capture/out/16-rest-binding.http
lang: http
note: 请求头和体已省略。JSON-RPC 中此错误为代码 -32002，见 10-cancel.http。
---
POST /a2a/rest/tasks/bbfb9ea5-50ea-4441-b991-2a8ba0d6f3f3:cancel HTTP/1.1
…
HTTP/1.1 400 Bad Request
Content-Type: application/a2a+json

{
  "error": {
    "code": 400,
    "status": "FAILED_PRECONDITION",
    "message": "Task cannot be canceled",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "TASK_NOT_CANCELABLE",
        "domain": "a2a-protocol.org",
        "metadata": {
          "taskId": "bbfb9ea5-50ea-4441-b991-2a8ba0d6f3f3",
          "state": "TASK_STATE_COMPLETED"
```

规范两个示例仍展示旧 RFC 9457 风格的 `application/problem+json` 体（[冲突 D13](#s-ref-sources)）。[PR #1641](https://github.com/a2aproject/A2A/pull/1641) 和 [PR #1689](https://github.com/a2aproject/A2A/pull/1689)替换示例，两者仍开放。迁移指南写 `application/json`，§11.6 则显示 `application/a2a+json`。SDK 三种都发送，JSON-RPC 错误都返回 HTTP `200`： {{spec §6.4}} {{spec §6.5}} {{docs whats-new-v1}}

| SDK | JSON-RPC 错误 | HTTP+JSON 错误 |
|---|---|---|
| a2a-python 1.2.2 | `application/json` | `application/json`  {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}}  {{sdk src/a2a/utils/error_handlers.py}} |
| a2a-go | `application/json` | `application/json`  {{sdk-go a2asrv/jsonrpc.go at v2.6.0}}  {{sdk-go a2asrv/rest.go at v2.6.0}} |
| a2a-java | `application/json` | `application/json`  {{sdk-java reference/jsonrpc/src/main/java/org/a2aproject/sdk/server/apps/quarkus/A2AServerRoutes.java at v1.4.0.Final}}  {{sdk-java transport/rest/src/main/java/org/a2aproject/sdk/transport/rest/handler/RestHandler.java at v1.4.0.Final}} |
| a2a-js | `application/json` | `application/a2a+json`  {{sdk-js src/server/express/json_rpc_handler.ts at v1.3.0}}  {{sdk-js src/server/express/rest_handler.ts at v1.3.0}} |
| a2a-dotnet | `application/json` | `application/problem+json`，problem-details 体  {{sdk-dotnet src/A2A.AspNetCore/JsonRpcResponseResult.cs at v1.0.0-preview2}}  {{sdk-dotnet src/A2A.AspNetCore/A2AHttpProcessor.cs at v1.0.0-preview2}} |
| a2a-rs | `application/json` | `application/problem+json`  {{sdk-rust a2a-server/src/jsonrpc.rs at a2a-server-lf-v0.5.1}}  {{sdk-rust a2a-server/src/rest.rs at a2a-server-lf-v0.5.1}} |

发送 `application/a2a+json`，读取时接受全部三种类型。无论类型写什么，按 `google.rpc.Status` 解析体。例外是此版本 a2a-dotnet，problem-details 体没有 `ErrorInfo`。gRPC 将相同三部分放在 `status.code`、`status.message`、`status.details`。 {{spec §10.6}}

## 哪些错误该重试 {#s-errors-what-to-retry}

`UnsupportedOperationError` 用同一代码 `-32004` 和 reason `UNSUPPORTED_OPERATION` 覆盖三种问题：卡片缺少 `streaming`、缺少扩展卡片，或任务已终态，如 `10-cancel.http`。只有 `message` 和 `metadata` 能区分，规范都不固定。因此任务操作得到 `-32004` 时，先用 `GetTask` 读取任务再决定。 {{spec §3.3.4}} {{spec §3.1.1}} {{spec §3.1.6}}

多数 A2A 错误描述请求或任务，重发相同字节仍得到相同答案：

- `-32603`、HTTP `500` 或 `503`、连接断开：退避重试，遵守 `Retry-After`。 {{spec §3.3.2}}
- HTTP `401`：获取新凭据再重试。
- `-32600`、`-32602`、`-32005`、`-32009` 及对应 `400`：修正请求再发。
- `-32001`：停止，ID 有误、已清除或对你隐藏。 {{spec §3.3.2}}
- `-32002` 或终态任务上的 `-32004`：启动新任务，见 [CancelTask 与终态](#s-cancel-task-and-terminal-states)。
- `-32003`、`-32007` 或能力检查返回的 `-32004`：重新读取卡片。

重试 `SendMessage` 可能开始第二个任务，因为按 `messageId` 去重是可选的。仍发送相同 `messageId`，见 [Message](#s-message)。 {{spec §3.3.1}}

```takeaways
- 先读 HTTP 状态，再读 JSON-RPC `error` 成员或 `google.rpc.Status` 体。
- 按 `ErrorInfo` 的 `reason` 决策，不要仅看状态码或消息文本。
- 只对传输和系统错误退避重试。
- 重试发送时保持相同 `messageId`。
```

Sources: spec §3.1.1, §3.1.6, §3.3.1, §3.3.2, §3.3.4, §5.4, §6.4, §6.5, §9.5, §10.6, §11.6 (research/sources/specification.md); docs whats-new-v1 (research/sources/docs.md); a2aproject/A2A PR #1641 and PR #1689, checked 2026-10-06; sdk src/a2a/utils/proto_utils.py, src/a2a/utils/error_handlers.py, src/a2a/server/routes/jsonrpc_dispatcher.py (a2a-python 1.2.2); sdk-go a2asrv/jsonrpc.go, a2asrv/rest.go (a2a-go v2.6.0); sdk-java reference/jsonrpc/src/main/java/org/a2aproject/sdk/server/apps/quarkus/A2AServerRoutes.java, transport/rest/src/main/java/org/a2aproject/sdk/transport/rest/handler/RestHandler.java (a2a-java v1.4.0.Final); sdk-js src/server/express/json_rpc_handler.ts, src/server/express/rest_handler.ts (a2a-js v1.3.0); sdk-dotnet src/A2A.AspNetCore/JsonRpcResponseResult.cs, src/A2A.AspNetCore/A2AHttpProcessor.cs (a2a-dotnet v1.0.0-preview2); sdk-rust a2a-server/src/jsonrpc.rs, a2a-server/src/rest.rs (a2a-rs a2a-server-lf-v0.5.1); capture/out/11-errors.http, 16-rest-binding.http, 10-cancel.http, 14-resubscribe.http; capture/README.md
