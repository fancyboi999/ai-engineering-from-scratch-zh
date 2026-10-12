# GetTask 与 ListTasks

> `GetTask` 和 `ListTasks` 是恢复途径，两者都严格规定任务的哪些部分省略。

planner 到 `deployer` 的流断开。webhook 通知测试结束。planner 重启时日志中只有任务 ID。每种情况的下一步都一样：向 agent 请求它存储的任务。

读完本节后，你可以获取所需历史，逐页列出 agent 的任务，并解释缺失的字段。

## GetTask 返回存储任务 {#s-get-task-and-list-tasks-gettask-returns-the-stored-task}

`GetTask` 接收任务 `id` 和可选 `historyLength`，返回服务器保存的 `Task`：状态、产物和历史。 {{proto GetTaskRequest}}

无权查看的 ID 返回 `TaskNotFoundError`，因此未找到不证明任务已消失。 {{spec §3.1.3}}

## historyLength {#s-get-task-and-list-tasks-historylength}

**历史：** 任务保存的消息，不含当前状态消息。`historyLength` 决定响应携带几条，各操作含义相同： {{spec §3.2.4}}

- 未设置：不施加限制，服务器返回默认数量的历史，由实现决定，可能是全部。 {{spec §3.2.4}}
- 大于零：最多返回指定数量的近期历史消息。 {{spec §3.2.4}}
- 零：不返回历史，`SHOULD` 省略 history 字段。 {{spec §3.2.4}}

`historyLength` 为 1 时，套件只返回审查任务最新一条历史消息：

```listing
title: historyLength 为 1 的 GetTask
source: capture/out/13-history.http
lang: json
note: JSON-RPC 包装、回复的 ID、状态、产物，以及消息内的 ID 已省略。
---
  "method": "GetTask",
  "params": {
    "id": "e5c95b09-6d4b-4b3b-8693-91e81472d12f",
    "historyLength": 1
  }
…
    "history": [
      {
        "messageId": "8f9ee658-e185-409a-9294-8d4d97ef77bb",
        …
        "role": "ROLE_AGENT",
        "parts": [
          {
            "text": "Comparing the diff against main"
          }
        ]
      }
    ],
```

这条消息不是 agent 最新的话。最终状态消息 "2 findings"（两项发现）仍在 `status.message`。套件与参考 SDK 中，只有被更新消息替换时，状态消息才加入 `history`。一起读取 `history` 和 `status.message`。 {{sdk src/a2a/server/tasks/task_manager.py}}

服务器也可以施加更低上限，并非所有 Message 都保证持久化进 Task 历史。未设置的行为由实现决定，SDK 对 0 和负值也各不相同： {{proto GetTaskRequest}} {{spec §3.7}}

| SDK | 未设置 `historyLength` | 0 | 小于 0 |
|---|---|---|---|
| a2a-python 1.2.2 | 两操作都返回全部历史 | 空 `history` 数组 | `InvalidParamsError`  {{sdk src/a2a/utils/task.py}} |
| a2a-go | `GetTask` 全部，`ListTasks` 最近 100 条 | 省略字段 | 省略字段  {{sdk-go a2asrv/handler.go at v2.6.0}} |
| a2a-java | `GetTask` 全部，`ListTasks` 无历史 | 空列表 | `InvalidParamsError`  {{sdk-java requesthandlers/DefaultRequestHandler.java at v1.4.0.Final}} |
| a2a-js | 两操作都返回全部历史 | 省略字段 | JSON-RPC 省略，REST 返回 HTTP 400  {{sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0}} |
| a2a-dotnet | 两操作都返回全部历史 | `GetTask` 空数组，`ListTasks` 无字段 | JSON-RPC 返回 `InvalidParamsError`  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| a2a-rs | 两操作都返回全部历史 | 空历史 | 空历史  {{sdk-rust a2a-server/src/task_store/mod.rs at a2a-server-lf-v0.5.1}} |

## ListTasks 返回分页，最新优先 {#s-get-task-and-list-tasks-listtasks-returns-pages-newest-first}

`ListTasks` 按 `contextId`、`status`、`statusTimestampAfter` 过滤，用 `pageSize`、`pageToken`、`historyLength`、`includeArtifacts` 决定页面内容。它只返回已认证客户端可见的任务，遵守四条规则： {{proto ListTasksRequest}} {{spec §3.1.4}}

- 大小：未指定时最多返回 50 个任务，上限是 100。 {{proto ListTasksRequest}}
- 顺序：实现 `MUST` 按状态时间戳降序返回任务，最近更新的优先。 {{spec §3.1.4}}
- token：响应 `MUST` 始终包含 `nextPageToken`。末页是空字符串。 {{spec §3.1.4}}
- 产物：`includeArtifacts` 为默认 false 时，`MUST` 完全省略 artifacts 字段。 {{spec §3.1.4}}

套件向保存五个任务的 `test-runner` 请求 `pageSize` 2、`historyLength` 0：

```listing
title: ListTasks 的第一页
source: capture/out/12-list-tasks.http
lang: json
note: 每个任务只保留 ID、状态和状态时间戳，token 只保留前 44 个字符。
---
    "tasks": [
      {
        "id": "f22ed7af-848d-4f4d-8cd1-3204d1e1bbaf",
        …
          "state": "TASK_STATE_CANCELED",
          …
          "timestamp": "2026-10-06T09:00:03.750Z"
      …
        "id": "8ae21dcb-7449-4d90-82a6-ac01b20fd782",
        …
          "state": "TASK_STATE_FAILED",
          …
          "timestamp": "2026-10-06T09:00:03.000Z"
      …
    ],
    "nextPageToken": "eyJ0cyI6IjIwMjYtMTAtMDZUMDk6MDA6MDMuMDAwWiIs…",
    "pageSize": 2,
    "totalSize": 5
```

第二页包含已完成运行 `728ba084`、`d0c28826`。两页都没有 `artifacts`，尽管两次完成的运行都存有日志和摘要。第三个请求按 `TASK_STATE_CANCELED` 过滤，得到一个任务、`pageSize` 50 和空 `nextPageToken`。[此图](#fig-history-and-pages)并列展示分页与历史规则。

```figure
id: fig-history-and-pages
kind: structure
title: 历史规则与列表分页
claim: `GetTask` 按请求数量裁剪为最新历史消息，`ListTasks` 返回最新优先的分页，未请求时省略产物。
caption: 顶部为任务 e5c95b09 的存储历史及各 `historyLength` 的返回内容。底部为 test-runner 的五个任务，按列表顺序分成套件请求的页面。ID 缩短至 8 个字符。来自 capture/out/13-history.http、04-polling.http 和 12-list-tasks.http。
```

规范要求基于游标分页，却未规定 token 格式，因此各 SDK 自行决定： {{spec §3.1.4}}

| SDK | token | 页面大小 | 末页 |
|---|---|---|---|
| a2a-python 1.2.2 | 含状态时间戳和任务 ID 的 JSON 游标的 URL-safe base64 | 默认 50，范围 1 至 100，否则错误 -32602 | `""`  {{sdk src/a2a/utils/task.py}} |
| a2a-go | 更新时间和任务 ID 的 URL-safe base64 | 默认 50，范围 1 至 100，否则错误 -32600 | `""`  {{sdk-go a2asrv/taskstore/inmemory.go at v2.6.0}} |
| a2a-java | 纯文本，epoch 毫秒状态时间、冒号和任务 ID | 默认 50，范围 1 至 100，否则错误 -32602 | `""`  {{sdk-java util/PageToken.java at v1.4.0.Final}} |
| a2a-js | 状态时间戳、竖线和任务 ID 的 base64 | 默认 50，范围 1 至 100，否则错误 -32602 | `""`  {{sdk-js src/server/utils.ts at v1.3.0}} |
| a2a-dotnet | 十进制偏移量，如 `50` | 默认 50，只有 JSON-RPC 拒绝 1 至 100 之外的大小 | `""`  {{sdk-dotnet src/A2A/Server/InMemoryTaskStore.cs at v1.0.0-preview2}} |
| a2a-rs | 按 ID 排序任务的十进制偏移量，违反上述顺序规则 | 默认 50，大于 100 截为 100 | `""`  {{sdk-rust a2a-server/src/task_store/inmemory.rs at a2a-server-lf-v0.5.1}} |

## 每个参数都发送 {#s-get-task-and-list-tasks-send-every-parameter}

第三个请求没有 `historyLength`，得到全部历史，参考 SDK 也如此。值为 0 时，SDK 返回空 `history` 数组，而规范要求省略字段。因此将缺失和空历史同等对待。 {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} {{sdk src/a2a/server/routes/common.py}}

原样回传收到的 token。迁移指南称这些字段为 `cursor`、`limit`、`nextCursor`，proto 不定义这些名称（[冲突 D12](#s-ref-sources)）。

`statusTimestampAfter` 的边界包含在内：只返回状态时间大于等于该值的任务。只获取变化时，发送见过的最新状态时间戳，跳过已持有的边界任务。 {{proto ListTasksRequest}}

```takeaways
- 流结束、webhook 到达或进程重启后调用 `GetTask`。
- 每次读取都发送 `historyLength`：状态检查用 0，最新一轮用小数字。
- 用收到的精确 token 翻页，直到它变为空。
- 列表要带结果时设 `includeArtifacts`，或逐任务调用 `GetTask`。
```

Sources: spec §3.1.3, §3.1.4, §3.2.4, §3.7 (research/sources/specification.md); proto GetTaskRequest, ListTasksRequest (research/sources/a2a.proto); sdk src/a2a/server/tasks/task_manager.py, src/a2a/server/request_handlers/default_request_handler_v2.py, src/a2a/server/routes/common.py, src/a2a/utils/task.py (a2a-python 1.2.2); sdk-go a2asrv/handler.go, a2asrv/taskstore/inmemory.go at v2.6.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java, spec/src/main/java/org/a2aproject/sdk/spec/util/PageToken.java at v1.4.0.Final; sdk-js src/server/request_handler/default_request_handler.ts, src/server/utils.ts at v1.3.0; sdk-dotnet src/A2A/Server/A2AServer.cs, src/A2A/Server/InMemoryTaskStore.cs at v1.0.0-preview2; sdk-rust a2a-server/src/task_store/mod.rs, a2a-server/src/task_store/inmemory.rs at a2a-server-lf-v0.5.1; capture/out/04-polling.http, 12-list-tasks.http, 13-history.http
