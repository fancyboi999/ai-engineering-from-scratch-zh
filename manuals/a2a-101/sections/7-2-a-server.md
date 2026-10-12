# 服务器

> 服务器包括卡片、每种绑定的处理器、工作前的三项检查、执行器、按拥有者隔离的任务存储，以及同时供给流和 webhook 的事件队列。

套件的三个 agent 来自 `capture/a2a_ref.py`，675 行 Python 标准库代码。每个提供卡片、支持两种 JSON 绑定、在线程中运行自身逻辑，用字典存任务。读完本节后，你可以说出服务器必须构建的组件，并在 `a2a_ref.py` 和参考 SDK 找到它们。

[此图](#fig-server-parts)跟踪一个 `SendStreamingMessage` 从 HTTP 请求到流帧、webhook POST 经过的组件。

```figure
id: fig-server-parts
kind: structure
title: 按请求经过顺序排列的服务器组件
claim: 请求在 Agent.send 存储任务前通过认证、版本和能力检查，此后每个事件通过同一个广播发出。
caption: 左列从上到下读。每个框是 capture/a2a_ref.py 中的方法。右侧玫红框是各检查返回的错误，JSON-RPC 代码来自 capture/out/11-errors.http。来自 capture/a2a_ref.py。
```

## 卡片与每种绑定的处理器 {#s-a-server-the-card-and-one-handler-per-binding}

**卡片路由：** `/.well-known/agent-card.json` 上返回卡片的 `GET`。套件 `Handler.do_GET` 从 `published_card` 回答。SDK 的 `create_agent_card_routes` 提供同一路径，由 `AGENT_CARD_WELL_KNOWN_PATH` 命名。 {{spec §8.2}} {{sdk src/a2a/server/routes/agent_card_routes.py}} {{sdk src/a2a/utils/constants.py}}

**绑定处理器：** 每种绑定一个入口，解析请求、运行检查、调用同一组 agent 方法。套件有 `/a2a/jsonrpc` 的 `Handler.jsonrpc` 和 `/a2a/rest/` 下的 `Handler.rest`，没有 gRPC，见 [gRPC](#s-grpc)。SDK 有 `create_jsonrpc_routes`、`create_rest_routes`、`GrpcHandler`，三者调用同一个 `DefaultRequestHandler`，实际为 `DefaultRequestHandlerV2`。 {{sdk src/a2a/server/routes/jsonrpc_routes.py}} {{sdk src/a2a/server/routes/rest_routes.py}} {{sdk src/a2a/server/request_handlers/grpc_handler.py}} {{sdk src/a2a/server/request_handlers/__init__.py}}

```listing
title: 从 token 到前两个方法的 JSON-RPC 处理器
source: capture/a2a_ref.py
lang: python
note: jsonrpc 方法开头及错误分支，其余九个方法分支已省略。
---
    def jsonrpc(self, raw):
        request_id = None
        if not self.authenticate():
            return None
        try:
            try:
                request = json.loads(raw)
            except ValueError:
                raise A2AError("JSONParseError")
            if not isinstance(request, dict) or request.get("jsonrpc") != "2.0" or "method" not in request:
                raise A2AError("InvalidRequestError")
            request_id = request.get("id")
            self.check_version()
            method = request["method"]
            params = request.get("params") or {}
            agent = self.agent
            if method == "SendMessage":
                return self.write_json(200, {"jsonrpc": "2.0", "id": request_id, "result": agent.send(params)}, "application/json")
            if method == "SendStreamingMessage":
                if not agent.card["capabilities"].get("streaming"):
                    raise A2AError("UnsupportedOperationError")
                stream = queue.Queue()
                agent.send(params, stream)
                self.open_stream()
                return self.pump(stream, lambda event: {"jsonrpc": "2.0", "id": request_id, "result": event})
            …
        except A2AError as error:
            return self.write_json(200, {"jsonrpc": "2.0", "id": request_id, "error": error.jsonrpc()}, "application/json")
```

## 工作前的三项检查 {#s-a-server-three-checks-before-any-work}

先认证。套件 `authenticate` 仅在 deployer 上，对每个方法前的无凭据请求返回 HTTP 401 和 `WWW-Authenticate` challenge。SDK 自身不检查凭据，`ServerCallContext.user` 来自网页框架中间件。[安全方案](#s-security-schemes-and-in-task-authorization)说明应检查什么。 {{sdk src/a2a/server/routes/common.py}}

第二步检查版本。`check_version` 只接受 `1.0`，其他值抛出 `VersionNotSupportedError`，因为 agent `MUST` 将空值解释为 0.3。SDK `validate_version` 装饰每个 JSON-RPC 和 REST dispatcher 方法，只比较主版本，不包装 gRPC servicer。[版本头](#s-version-and-extension-headers)给出规则与各 SDK 行为。 {{spec §3.6.2}} {{sdk src/a2a/utils/version_validator.py}}

第三步检查能力。流或推送操作前，套件读取 `card["capabilities"]`，抛出 `UnsupportedOperationError` 或 `PushNotificationNotSupportedError`。SDK 在 `on_message_send_stream` 和推送方法上用 `validate` 装饰器做同样检查。 {{spec §3.3.4}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}}

## 执行器与任务存储 {#s-a-server-the-executor-and-the-task-store}

**执行器：** 为一次请求运行 agent 并发出事件的代码。套件 `Agent.send` 验证消息，创建 `TASK_STATE_SUBMITTED` 任务，在线程中启动 `Agent.work`。`work` 调用 agent 自身逻辑 `behavior`，应用它生成的每个事件。SDK 的 `AgentExecutor.execute` 接收 `RequestContext`、`EventQueue`，在工作完成或任务进入中断态时返回。 {{sdk src/a2a/server/agent_execution/agent_executor.py}} {{sdk src/a2a/server/agent_execution/context.py}}

执行器调用什么对客户端隐藏。[此图](#fig-a2a-and-tools)为三个套件 agent 画出边界。

```figure
id: fig-a2a-and-tools
kind: layers
title: agent 之间用 A2A，各自内部用工具
claim: planner 只看见各 agent 的卡片和端点，agent 在 A2A 从不跨越的边界之下调用自己的逻辑和工具。
caption: 从上到下读。虚线上是 planner 通过 A2A 看到的内容，线下是各 agent 自行运行的内容，套件用 Python 模拟它们。来自 capture/agents.py 和 capture/out/01-agent-cards.http。
```

**任务存储：** 每个任务的记录，由 `GetTask`、`ListTasks` 和每条后续消息读取。套件 `Agent.tasks` 是无拥有者的字典，唯一保护是 deployer 的 bearer token。SDK 的 `TaskStore` 有 `save`、`get`、`list`、`delete`，均接收 `ServerCallContext`。`InMemoryTaskStore` 以拥有者为键，默认 `OwnerResolver` 返回 `context.user.user_name`。另一调用者的任务成为 `TaskNotFoundError`，但无用户名调用者共享范围。服务器 `MUST` 在每个 A2A 操作请求检查授权，集成者须加中间件，[安全方案](#s-security-schemes-and-in-task-authorization)列出各 SDK 情况。 {{sdk src/a2a/server/tasks/task_store.py}} {{sdk src/a2a/server/owner_resolver.py}} {{sdk src/a2a/server/tasks/inmemory_task_store.py}} {{spec §13.1}}

## 一个事件队列供给流与 webhook {#s-a-server-one-event-queue-for-streams-and-webhooks}

套件 `Agent.apply` 更新任务记录，`Agent.broadcast` 将事件副本放入每个订阅者队列，对每个推送配置调用 `deliver`。`Handler.pump` 读取一个订阅者队列，把事件写为 `data:` 帧。`broadcast` 在终态或 `TASK_STATE_INPUT_REQUIRED` 关闭流，`deliver` 用 `X-A2A-Notification-Token` 将事件 POST 到 webhook URL。

SDK `ActiveTask` 用两个队列做同样工作。执行器写入 `_event_queue_agent`，消费者读取、保存任务、将每个事件转到 `_event_queue_subscribers`，并调用 `PushNotificationSender.send_notification`。[流式传输](#s-streaming-and-subscribe-to-task)与[推送通知配置](#s-push-notification-configs)逐帧展示两条路径。 {{sdk src/a2a/server/agent_execution/active_task.py}} {{sdk src/a2a/server/tasks/push_notification_sender.py}}

```takeaways
- 在 `/.well-known/agent-card.json` 提供卡片，每种绑定经过相同检查。
- 执行器启动前检查凭据、`A2A-Version` 头和能力标志。
- 任务存储以拥有者为键，范围之外返回 `TaskNotFoundError`。
- 将每个事件写入同一个队列，供给打开的流和 webhook POST。
```

Sources: spec §3.3.4, §3.6.2, §8.2, §13.1 (research/sources/specification.md); sdk src/a2a/server/routes/agent_card_routes.py, src/a2a/utils/constants.py, src/a2a/server/routes/jsonrpc_routes.py, src/a2a/server/routes/rest_routes.py, src/a2a/server/routes/common.py, src/a2a/server/request_handlers/grpc_handler.py, src/a2a/server/request_handlers/__init__.py, src/a2a/server/request_handlers/default_request_handler_v2.py, src/a2a/utils/version_validator.py, src/a2a/server/agent_execution/agent_executor.py, src/a2a/server/agent_execution/context.py, src/a2a/server/agent_execution/active_task.py, src/a2a/server/tasks/task_store.py, src/a2a/server/tasks/inmemory_task_store.py, src/a2a/server/owner_resolver.py, src/a2a/server/tasks/push_notification_sender.py at a2a-python 1.2.2; capture/a2a_ref.py, capture/agents.py, capture/README.md; capture/out/01-agent-cards.http, 11-errors.http
