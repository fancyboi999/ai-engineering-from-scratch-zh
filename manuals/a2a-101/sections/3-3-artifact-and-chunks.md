# Artifact 与分块

> 任务用产物返回结果，长产物分块到达，按 `artifactId` 拼接，直到 `lastChunk` 标记结束。

`test-runner` 在测试运行时写日志。planner 想实时显示日志，并在运行后保存结论。流中，日志以名为 `test-log.txt` 的单个产物的五个分块到达。第二个产物 `summary.json` 一次到达，保存 planner 据以行动的计数。

读完本节后，你可以重建分块产物，指出规范未规定的内容，并知道该信任哪个副本。

## 结果就是产物 {#s-artifact-and-chunks-results-are-artifacts}

**Artifact：** agent 执行任务生成的输出，如文档、图像或结构化数据，由 `Parts` 构成。两个字段为 REQUIRED：`artifactId` 必须在任务内唯一，`parts` 必须至少包含一个 part。可选字段为 `name`、`description`、`metadata`、`extensions`。 {{spec §2.2}} {{proto Artifact}}

结果放入产物，对话放入消息，这是[核心规则](#s-what-a2a-standardizes)之一：消息 `SHOULD NOT` 用于交付任务输出。 {{spec §3.7}}

## 流中的分块 {#s-artifact-and-chunks-chunks-on-the-stream}

流中，产物位于 `artifactUpdate` 事件内。每个 `TaskArtifactUpdateEvent` 包含 REQUIRED 的 `taskId`、`contextId`、`artifact`，以及两个可选标志。`append` 为 true 时，内容应追加到此前发送的同 ID 产物。`lastChunk` 为 true 表示这是该产物的最后一个分块。 {{proto TaskArtifactUpdateEvent}}

```listing
title: 六个产物帧中的四个
source: capture/out/05-streaming.http
lang: sse
note: 流的第 3、4、7、8 帧。每帧省略 JSON-RPC 包装、taskId 和 contextId。第 5、6 帧整体省略，summary.json 中的失败列表也已省略。
---
data: {…"artifactUpdate": {…"artifact": {"artifactId": "test-log", "name": "test-log.txt", "parts": [{"text": "collected 12 items\n"}]}}}}

data: {…"artifactUpdate": {…"artifact": {"artifactId": "test-log", "parts": [{"text": "tests/test_charges.py ........  [ 66%]\n"}]}, "append": true}}}

…

data: {…"artifactUpdate": {…"artifact": {"artifactId": "test-log", "parts": [{"text": "1 failed, 11 passed in 4.21s\n"}]}, "append": true, "lastChunk": true}}}

data: {…"artifactUpdate": {…"artifact": {"artifactId": "summary", "name": "summary.json", "parts": [{"data": {"passed": 11, "failed": 1, …}, "mediaType": "application/json"}]}, "lastChunk": true}}}
```

[此图](#fig-artifact-chunks)将运行中的九帧与各产物帧对已存储任务的改变对应起来。

```figure
id: fig-artifact-chunks
kind: structure
title: 五个分块成为一个存储产物
claim: `test-log.txt` 的五个分块按帧顺序成为存储产物的五个 part，`lastChunk` 结束该产物，流则继续。
caption: 顶部为套件时钟上的 capture/out/05-streaming.events.json 九帧。第 1、2、9 帧位于其时间戳，第 3 至第 8 帧均匀分布其间。中部显示第 3 至第 8 帧携带的内容及对存储任务的作用。底部为 04-polling.http 中 GetTask 返回的已存储 test-log.txt。part 1、2 是两个测试文件的进度行，采集文件完整保存。
```

`lastChunk` 只结束一个产物，此流后面还有两帧。产物事件没有时间戳字段，因此分块唯一的顺序是流的顺序，每种绑定必须保持它。 {{spec §3.5.2}}

## 拼接分块 {#s-artifact-and-chunks-joining-the-chunks}

套件与参考 SDK 重建方式相同：找到相同 `artifactId` 的已存储产物，`append` 为 true 时将新 part 添加到其 `parts`。没有 `append` 时替换整个产物，ID 是新的则添加产物（[capture/a2a_ref.py](manuals/a2a-101/capture/a2a_ref.py)）。五行日志保持为五个 `text` part，按序连接文本即可得到文件。 {{sdk src/a2a/server/tasks/task_manager.py}}

规范没有说明服务器从未见过的 ID 上 `append` 的含义，各实现不一致：

| 实现 | 未知 `artifactId` 上的 `append: true` | 读取 `lastChunk` |
|---|---|---|
| a2a-python | 抛出 `InvalidAgentResponseError` | 否  {{sdk src/a2a/server/tasks/task_manager.py}} |
| a2a-go | 报错，任务进入 `TASK_STATE_FAILED`，没有原因 | 否  {{sdk-go a2aevent/event.go at v2.6.0}} |
| a2a-java | 丢弃分块，记录警告，任务保持不变 | 否  {{sdk-java sdk/spec/util/Utils.java at v1.4.0.Final}} |
| a2a-js | 将分块存为新产物 | 否  {{sdk-js src/server/result_manager.ts at v1.3.0}} |
| a2a-dotnet | 将分块存为新产物 | 否  {{sdk-dotnet src/A2A/Server/TaskProjection.cs at v1.0.0-preview2}} |
| a2a-rs | 返回 `InvalidAgentResponseError`，任务保持上一个状态 | 否  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |
| 套件 | 开始新产物（[capture/README.md](manuals/a2a-101/capture/README.md)） | 否 |

同一分块可能让任务失败、消失，或成为新产物。每个产物的首块都不要带 `append`。规范也未说明后续元数据是合并还是替换。

不要从迁移指南获取字段名（[冲突 D9 和 D10](#s-ref-sources)）。指南用 `taskArtifactUpdate` 包装事件并为其添加 `index`。proto 的包装名是 `artifactUpdate`，事件没有 `index` 字段。[PR #2056](https://github.com/a2aproject/A2A/pull/2056)在 main 修复包装名，却保留 `index` 说法，修复尚未发布。 {{docs whats-new-v1}} {{proto StreamResponse}} {{proto TaskArtifactUpdateEvent}}

## 信任存储副本 {#s-artifact-and-chunks-trust-the-stored-copy}

`GetTask` 返回含全部五个 part 的 `test-log.txt`，见[图底部](#fig-artifact-chunks)。阻塞 `SendMessage` 返回同样合并后的产物。 {{spec §3.2.2}}

连接断开后，遗漏的分块不会重放。`SubscribeToTask` 改为以已包含它们的 `Task` 快照开头。应用新分块之前，用快照的产物替换各本地副本，见 [SendStreamingMessage 与 SubscribeToTask](#s-streaming-and-subscribe-to-task)。 {{spec §3.1.6}}

产物也可能没有最后一块就结束：`10-cancel.http` 中取消的运行保存两个日志 part，`lastChunk` 从未到达。已存储 `Artifact` 没有标识完成的字段，需根据任务状态判断。

```takeaways
- 用稳定 `artifactId` 的产物返回结果，状态消息留给人阅读。
- 按 `artifactId` 重建：无 `append` 的分块替换产物，有 `append` 的追加 part。
- 产物首块不要带 `append`，因为服务器对未知 ID 的处理不一致。
- 重连后先从 `Task` 快照取出各产物，再应用新分块。
```

Sources: spec §2.2, §3.1.6, §3.2.2, §3.5.2, §3.7 (research/sources/specification.md); proto Artifact, TaskArtifactUpdateEvent, StreamResponse (research/sources/a2a.proto); docs docs/whats-new-v1.md at v1.0.1; sdk src/a2a/server/tasks/task_manager.py at a2a-python 1.2.2; sdk-go a2aevent/event.go and internal/taskupdate/manager.go at v2.6.0; sdk-java spec/src/main/java/org/a2aproject/sdk/spec/util/Utils.java at v1.4.0.Final; sdk-js src/server/result_manager.ts at v1.3.0; sdk-dotnet src/A2A/Server/TaskProjection.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; capture/out/04-polling.http, 05-streaming.http, 05-streaming.events.json, 10-cancel.http, 14-resubscribe.http, 14-resubscribe.events.json; capture/a2a_ref.py, capture/planner.py, capture/README.md
