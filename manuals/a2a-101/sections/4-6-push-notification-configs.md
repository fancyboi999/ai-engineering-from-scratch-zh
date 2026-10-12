# 推送通知配置

> TaskPushNotificationConfig 指定请求返回后 agent 向何处 POST 流中的同类 StreamResponse 对象，并使用你选择的凭据。

测试运行可能超过 planner 愿意保持连接的时间。于是 planner 在 `SendMessage` 中设置 `returnImmediately: true` 和 webhook，得到 `TASK_STATE_SUBMITTED` 的任务后关闭连接。此后 `test-runner` 向 `http://localhost:41250/a2a-events` POST 八次通知。

读完本节后，你可以注册 webhook，认证到达的内容，并构建在通知重复时仍正确的接收器。

## 配置对象 {#s-push-notification-configs-the-configuration-object}

**TaskPushNotificationConfig：** 告诉 agent 向何处推送某任务更新及如何认证的对象。只有 `url` 为 REQUIRED。可选 `token` 是任务或会话唯一的 token，可选 `authentication` 包含如 `Bearer` 的 `scheme` 及其 `credentials`。服务器分配配置 `id`。规范正文称它 `PushNotificationConfig`，proto 没有该类型，因此用 proto 名称（[冲突 D4](#s-ref-sources)）。 {{proto TaskPushNotificationConfig}} {{proto AuthenticationInfo}} {{spec §4.3.1}}

```listing
title: 在 SendMessage 中注册 webhook
source: capture/out/15-push.http
lang: http
note: 头和消息 parts 已省略。配置没有任务 ID，因为任务尚未存在。
---
POST /a2a/jsonrpc HTTP/1.1
…
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "85750621-02fb-4d4f-b57f-bc5af71a1bfc",
…
    "configuration": {
      "returnImmediately": true,
      "taskPushNotificationConfig": {
        "url": "http://localhost:41250/a2a-events",
        "token": "planner-run-0006",
        "authentication": {
          "scheme": "Bearer",
          "credentials": "hook_secret_91d2"
        }
```

内联时，配置在 `configuration.taskPushNotificationConfig` 中传输。套件和参考 SDK 在首个事件前存储它，不留空档。已有任务用 `CreateTaskPushNotificationConfig` 接收带 `taskId` 的配置本身。正文和附录 A 却指定 proto 没有定义的 `CreateTaskPushNotificationConfigRequest`（[冲突 D5](#s-ref-sources)）。 {{proto SendMessageConfiguration}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} {{proto A2AService}} {{spec §10.4.7}}

agent `SHOULD` 验证 `url`，见[安全要求](#s-security-requirements)。 {{spec §13.2}}

## webhook 收到什么 {#s-push-notification-configs-what-arrives-at-the-webhook}

每个通知是 HTTP POST，体为一个 `StreamResponse`。无论 agent 使用什么绑定，JSON 始终是 HTTP+JSON 形式。因此 `test-runner` 推送不带 JSON-RPC 包装的普通 `statusUpdate`，见[此图](#fig-push-webhook)。 {{spec §4.3.3}} {{spec §3.5.1}}

```figure
id: fig-push-webhook
kind: sequence
title: 通过 webhook 报告的测试运行
claim: 注册 webhook 后，test-runner 在 SendMessage 已返回之后，向 planner 接收器推送八个 StreamResponse 响应体。
caption: 按套件运行顺序从上到下读。采集文件把八次交付打印在最后，但它们在配置调用之前到达。来自 capture/out/15-push.http，ID 缩短至 8 个字符。
```

```listing
title: 接收器看到的首个通知
source: capture/out/15-push.http
lang: http
note: 状态消息已删节。套件接收器只记录这三个头。
---
POST /a2a-events HTTP/1.1
Content-Type: application/a2a+json
Authorization: Bearer hook_secret_91d2
X-A2A-Notification-Token: planner-run-0006

{
  "statusUpdate": {
    "taskId": "d7d3dceb-7333-4676-90ce-36542116a45c",
    "contextId": "e051d022-3c39-4f5c-bd9c-7a902ae474cd",
    "status": {
      "state": "TASK_STATE_WORKING",
…
      "timestamp": "2026-10-06T09:00:05.000Z"
```

agent `MUST` 按 `PushNotificationConfig.authentication` 在请求头中携带认证凭据。规范未规定 `token` 的传输方式，套件通过参考 SDK 的 `X-A2A-Notification-Token` 头发送。 {{spec §4.3.3}} {{sdk src/a2a/server/tasks/base_push_notification_sender.py}}

规范请求格式用 `application/a2a+json`，参考 SDK 推送 `application/json`，见套件 README。SDK 的 token 头和超时也不同，且都不重试： {{spec §4.3.3}} {{sdk src/a2a/server/tasks/base_push_notification_sender.py}}

| SDK | Content-Type | token 头 | 超时 | 重试 |
|---|---|---|---|---|
| a2a-python 1.2.2 | `application/json` | `X-A2A-Notification-Token` | 由服务器传入的 `httpx` 客户端设置 | 无  {{sdk src/a2a/server/tasks/base_push_notification_sender.py}} |
| a2a-go | `application/json` | `A2A-Notification-Token` | 30 s | 无  {{sdk-go a2asrv/push/sender.go at v2.6.0}} |
| a2a-java | `application/json` | `X-A2A-Notification-Token` | 未设置 | 无  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/tasks/BasePushNotificationSender.java at v1.4.0.Final}} |
| a2a-js | `application/a2a+json` | `X-A2A-Notification-Token`，只在 `authentication` 为空时 | 5 s | 无  {{sdk-js src/server/push_notification/default_push_notification_sender.ts at v1.3.0}} |
| a2a-dotnet | 无发送器：所有配置操作返回 `-32003` | | |  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| a2a-rs | `application/json` | `A2A-Notification-Token` | 30 s | 无  {{sdk-rust a2a-server/src/push/sender.rs at a2a-server-lf-v0.5.1}} |

表中每个发送器每事件推送一个 `StreamResponse`。因此接受两种内容类型，读取任一种 token 头，把真正依赖的秘密放在 `authentication`。规范未规定推送哪些事件，参考 SDK 也推送首个 `Task`，所以处理全部 `StreamResponse` 成员。 {{sdk src/a2a/server/tasks/push_notification_sender.py}}

## 至少尝试一次交付 {#s-push-notification-configs-delivery-is-attempted-at-least-once}

```rule
label: 交付
source: spec §4.3.3
---
"Agents MUST attempt delivery at least once for each configured webhook"
```

至少一次意味着通知可能重复，接收器也有职责：客户端 `MUST` 用 HTTP 2xx 确认接收成功，`SHOULD` 幂等处理通知以应对重复交付，`MUST` 验证任务 ID 是预期任务。 {{spec §4.3.3}}

按 `taskId` 和 `timestamp` 识别的状态更新可安全应用两次。带 `append: true` 的 `artifactUpdate` 不行，规范又没有交付 ID。因此把通知视为信号，用 `GetTask` 读取任务，项目指南也这样建议。 {{docs streaming-and-async}}

重试可选：agent `MAY` 对失败交付使用指数退避重试。表中没有 SDK 重试，因此接收器停机后恢复时需用 `GetTask` 读取任务。 {{spec §4.3.3}}

## 管理配置 {#s-push-notification-configs-managing-configurations}

四种操作管理任务保存的配置：创建、获取、列出、删除。采集在运行后列出、读取并删除配置，见[此图](#fig-push-webhook)。配置 `MUST` 保留到任务完成或显式删除，删除 `MUST` 幂等。 {{proto A2AService}} {{spec §3.1.7}} {{spec §3.1.10}}

套件与参考 SDK 的获取和列出原样返回已存储 `credentials`，因此能调用它们的人能读取 webhook 秘密。四种操作都要求卡片有 `pushNotifications`，否则返回 `PushNotificationNotSupportedError`。 {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} {{spec §3.3.4}}

```takeaways
- 在 `SendMessage` 中内联注册 webhook，不让事件在配置存在前发出。
- 接收器检查的秘密放在 `authentication`，因为 `token` 没有标准头。
- 根据通知行动前用 `GetTask` 读取任务，因为通知可能重复。
- 限制四种配置操作的调用权限，因为读取会返回 webhook 凭据。
```

Sources: spec §3.1.7, §3.1.10, §3.3.4, §3.5.1, §4.3.1, §4.3.3, §10.4.7, §13.2, Appendix A (research/sources/specification.md); proto TaskPushNotificationConfig, AuthenticationInfo, SendMessageConfiguration, A2AService (research/sources/a2a.proto); docs streaming-and-async (research/sources/docs.md); sdk src/a2a/server/tasks/base_push_notification_sender.py, src/a2a/server/tasks/push_notification_sender.py, src/a2a/server/request_handlers/default_request_handler_v2.py (a2a-python 1.2.2); sdk-go a2asrv/push/sender.go (a2a-go v2.6.0); sdk-java server-common/src/main/java/org/a2aproject/sdk/server/tasks/BasePushNotificationSender.java (a2a-java v1.4.0.Final); sdk-js src/server/push_notification/default_push_notification_sender.ts (a2a-js v1.3.0); sdk-dotnet src/A2A/Server/A2AServer.cs (a2a-dotnet v1.0.0-preview2); sdk-rust a2a-server/src/push/sender.rs (a2a-rs a2a-server-lf-v0.5.1); capture/out/15-push.http; capture/run.py, capture/a2a_ref.py, capture/README.md
