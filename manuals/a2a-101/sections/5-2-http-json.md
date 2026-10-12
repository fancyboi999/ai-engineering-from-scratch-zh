# HTTP+JSON

> HTTP+JSON 通过 proto 的 `google.api.http` 注解中的动词和路径指定操作，以普通 JSON 体发送请求和响应消息。

planner 通过 `test-runner` 的第二个接口 `http://localhost:41241/a2a/rest`（绑定 `HTTP+JSON`）重复首次测试。`16-rest-binding.http` 中，同一 agent 和任务存储回答，与 `03-blocking-task.http` 只有包装不同。

读完本节后，你可以将任意操作映射到路由、设置内容类型，并在卡片要求时发送 `tenant`。

## proto 定义的路由 {#s-http-json-routes-from-the-proto}

`A2AService` 每个 rpc 都有带动词和路径模板的 `option (google.api.http)`，§11.3 列出相同路由。带请求体的操作用 `POST` 和 `body: "*"`：`/message:send`、`/message:stream`、`/tasks/{id}:cancel`、`/tasks/{task_id}/pushNotificationConfigs`。读取用 `GET`，删除配置用 `DELETE`。[按绑定列出的操作](#s-ref-operations-by-binding)给出十一种路由及消息。 {{proto A2AService}} {{spec §11.3}}

订阅在 proto 中写 `get: "/tasks/{id=*}:subscribe"`，§5.3 和 §11.3.2 写 `POST /tasks/{id}:subscribe`（[冲突 D1](#s-ref-sources)）。参考 SDK 服务器接受两个动词，客户端发送 `POST`。Java 和 .NET 服务器只接受 `POST`。因此服务器接受两者，客户端发送 `POST`。 {{proto A2AService}} {{spec §5.3}} {{spec §11.3.2}} {{sdk src/a2a/server/routes/rest_routes.py}} {{sdk src/a2a/client/transports/rest.py}} {{sdk-java reference/rest/src/main/java/org/a2aproject/sdk/server/rest/quarkus/A2AServerRoutes.java at v1.4.0.Final}} {{sdk-dotnet src/A2A.AspNetCore/A2AEndpointRouteBuilderExtensions.cs at v1.0.0-preview2}}

```listing
title: 没有包装的 HTTP+JSON SendMessage
source: capture/out/16-rest-binding.http
lang: http
note: Host 和两个响应体的余下内容已省略。JSON-RPC 中同样回复在 result 下，见 03-blocking-task.http。
---
POST /a2a/rest/message:send HTTP/1.1
A2A-Version: 1.0
Content-Type: application/a2a+json

{
  "message": {
    "messageId": "48f165d5-7b00-47f4-b81e-f86f5c8cc1ab",
    "role": "ROLE_USER",
…
HTTP/1.1 200 OK
Content-Type: application/a2a+json

{
  "task": {
    "id": "bbfb9ea5-50ea-4441-b991-2a8ba0d6f3f3",
    "contextId": "41c0d462-fed8-4f6b-8569-6c9afe9497c3",
…
```

## 查询参数与内容类型 {#s-http-json-query-parameters-and-content-types}

`GET` 和 `DELETE` 不带体，请求字段以 camelCase 放在路径或查询参数中。`GetTask` 把任务 `id` 放入路径、`historyLength` 放入查询。`ListTasks` 接收 `contextId`、`status`、`pageSize`、`pageToken`、`historyLength`、`statusTimestampAfter`、`includeArtifacts`。嵌套对象不能放入查询字符串，这种请求必须用 `POST`。[此图](#fig-two-json-bindings)将两种操作与 JSON-RPC 形式并列。 {{spec §11.5}} {{proto ListTasksRequest}}

```figure
id: fig-two-json-bindings
kind: comparison
title: 两种 JSON 绑定中的 SendMessage 和 GetTask
claim: JSON-RPC 将所有操作 POST 到同一 URL 并在体中指定操作，HTTP+JSON 用动词和路径，gRPC 调用 rpc。
caption: 每行一个操作，开头是 a2a.proto 的 rpc 行。粗体标记各绑定指定操作的位置，斜体类型名表示该处填入的消息。左侧来自 capture/out/03-blocking-task.http 和 04-polling.http，右侧来自 capture/out/16-rest-binding.http。ID 缩短至 8 个字符。
```

请求和响应 `SHOULD` 使用 application/a2a+json，套件所有体都使用它。参考 SDK 的错误用 `application/json`，Java 和 Go 服务器所有体都如此。因此发送 `application/a2a+json`，读取时接受两种类型。 {{spec §11.1}} {{sdk src/a2a/utils/error_handlers.py}} {{sdk-java transport/rest/src/main/java/org/a2aproject/sdk/transport/rest/handler/RestHandler.java at v1.4.0.Final}} {{sdk-go a2asrv/rest.go at v2.6.0}}

## 流与错误 {#s-http-json-streams-and-errors}

流是与 JSON-RPC 相同的 `text/event-stream` 响应，每行 `data:` 只带 `StreamResponse`，没有包装。没有采集记录此绑定的流，因此[流式传输与订阅](#s-streaming-and-subscribe-to-task)展示 JSON-RPC 帧。 {{spec §11.7}}

错误使用 HTTP 状态码，以及 `error` 对象内 JSON 形式的 `google.rpc.Status`。记录第 3、4 次交换展示两例，[错误](#s-errors)解读响应体。 {{spec §11.6}}

## tenant 字段 {#s-http-json-the-tenant-field}

**Tenant：** 接口上的可选字符串，是将请求路由到特定 agent 的不透明字符串，也可用于多个 agent 共享端点时指定租户。十种请求消息，从 `SendMessageRequest` 到 `GetExtendedAgentCardRequest`，都有相同 `tenant` 字段。客户端将卡片值复制到每个请求，条目未设置 `tenant` 时必须省略。协议不规定格式，套件卡片都未设置。 {{proto AgentInterface}} {{proto SendMessageRequest}} {{proto GetExtendedAgentCardRequest}} {{spec §8.3.2}}

此绑定也可通过路径传值。每个 rpc 有第二种带 `/{tenant}` 前缀的 `google.api.http` 形式，如 `post: "/{tenant}/message:send"`。只有 proto 列出这些路由，§5.3、§11.3、§11.5 只展示普通路由。JSON-RPC 值在 `params.tenant`，gRPC 值在消息字段。迁移指南仅称其为 gRPC 请求的原生租户范围，描述不全。 {{proto A2AService}} {{spec §11.3}} {{docs whats-new-v1}}

项目指南列出同一主机多个 agent 的三种路由依据：URL 前缀、凭据、`tenant` 字段。三种方式并不互斥。 {{docs multi-tenancy}}

参考 SDK 客户端在选中接口设 tenant 时用 `TenantTransportDecorator` 包装传输。HTTP+JSON 传输把值放入路径前缀。服务器在 `/{tenant}` 下再挂载全部路由，将值复制到调用上下文，从不与卡片比较。agent 读取 `RequestContext.tenant` 自行决定其含义。 {{sdk src/a2a/client/client_factory.py}} {{sdk src/a2a/client/transports/tenant_decorator.py}} {{sdk src/a2a/client/transports/rest.py}} {{sdk src/a2a/server/routes/rest_routes.py}} {{sdk src/a2a/server/routes/rest_dispatcher.py}} {{sdk src/a2a/server/agent_execution/context.py}}

```takeaways
- 按 proto 的 `google.api.http` 注解构建各路由，在 `:subscribe` 接受 `GET` 和 `POST`。
- 发送 `application/a2a+json`，读取时也接受 `application/json`。
- 将 `GET` 或 `DELETE` 字段以 camelCase 放入路径或查询字符串。
- 每次请求复制接口 `tenant`，卡片未设置时省略。
```

Sources: spec §5.3, §8.3.2, §11.1, §11.3, §11.3.2, §11.5, §11.6, §11.7 (research/sources/specification.md); proto A2AService, AgentInterface, SendMessageRequest, GetTaskRequest, ListTasksRequest, GetExtendedAgentCardRequest (research/sources/a2a.proto); docs multi-tenancy, whats-new-v1 (research/sources/docs.md); sdk src/a2a/server/routes/rest_routes.py, src/a2a/server/routes/rest_dispatcher.py, src/a2a/server/agent_execution/context.py, src/a2a/client/client_factory.py, src/a2a/client/transports/tenant_decorator.py, src/a2a/client/transports/rest.py, src/a2a/utils/error_handlers.py (a2a-python 1.2.2); sdk-java reference/rest/src/main/java/org/a2aproject/sdk/server/rest/quarkus/A2AServerRoutes.java, transport/rest/src/main/java/org/a2aproject/sdk/transport/rest/handler/RestHandler.java at v1.4.0.Final; sdk-dotnet src/A2A.AspNetCore/A2AEndpointRouteBuilderExtensions.cs at v1.0.0-preview2; sdk-go a2asrv/rest.go at v2.6.0; capture/out/16-rest-binding.http, 03-blocking-task.http, 04-polling.http; capture/a2a_ref.py
