# 如何阅读本手册

> 本手册每项论断都有按权威排序的来源，每个请求、响应和流帧都来自可自行运行的采集套件。

本手册通过一个系统讲解 1.0.1 版 Agent2Agent 协议（A2A）：一个 planner 将工作交给三个内部不可见的 agent。

## 本手册适合谁 {#s-front-who-this-manual-is-for}

你已经构建过调用工具或模型 API 的 agent，也熟悉 HTTP 和 JSON。现在，你想把工作交给另一支团队维护的 agent。

读完最后一部分后，你可以：

- 阅读 agent 卡片，说明它提供什么、如何访问、有什么要求。
- 判断运行中任意时刻的任务状态，以及客户端下一步能做什么。
- 根据工作选择阻塞调用、轮询、流式传输或推送通知。
- 逐行读懂任一种 JSON 绑定中的 A2A 请求、响应或流帧。
- 说出客户端必须处理的错误，以及服务器可能无意违反的规则。

[A2A 课程](phases/13-tools-and-protocols/19-a2a-protocol)早于 1.0 版，两者不一致时以本手册为准。

## 编写依据 {#s-front-how-it-was-made}

本手册锁定 A2A 仓库的 `v1.0.1` 标签，提交为 `3303592`。在请求和卡片中，这一发布版的协议版本写作 `1.0`，因为规范规定不应包含补丁版本号："Patch version numbers `SHOULD NOT` be used in requests, responses and Agent Cards" {{spec §3.6}}。事实还对照了 2026-10-05 的 main 分支提交 `679ab3a`，当时 v1.0.1 仍是最新发布版。

事实来自五类来源，按权威排序。两者冲突时以排名更高者为准，正文会说明。

| 排名 | 来源 | 本手册采用的内容 | 引用方式 |
|---|---|---|---|
| 1 | v1.0.1 的 `specification/a2a.proto` | 所有对象、字段、枚举值和方法 | `proto` 加消息或枚举名 |
| 2 | v1.0.1 的 `docs/specification.md` | 所有行为规则，逐字引用 | `spec` 加节号 |
| 3 | v1.0.1 的项目文档页面 | 项目自身的定位，页面过时之处会标明 | `docs` 加页面名 |
| 4 | 参考 SDK，a2a-python 1.2.2 | 规范未规定时，生产实现如何处理 | `sdk` 加源文件 |
| 5 | `capture/` 中的采集套件 | 本手册展示的每个请求、响应和流帧 | 采集文件名 |

proto、规范和文档页面原样保存在 `research/sources/`。

规范内部或规范与 proto 之间，在 [`SubscribeToTask` 的 HTTP 动词](#s-json-rpc)（[冲突 D1](#s-ref-sources)）和[发送是否等待](#s-send-message)（[冲突 D2](#s-ref-sources)）上不一致。[流何时关闭](#s-input-required-and-auth-required)（[冲突 D3](#s-ref-sources)）和[卡片安全字段名](#s-security-schemes-and-in-task-authorization)（[冲突 D6](#s-ref-sources)）也有矛盾。[来源参考](#s-ref-sources)列出全部四十项冲突及各自的讨论章节。

## 采集套件 {#s-front-the-capture-kit}

采集套件只用 Python 标准库，在本机运行三个远程 agent 和一个录制客户端，无需外部网络或密钥。

| agent | 端口 | 工作 | 运行展示的行为 |
|---|---|---|---|
| `test-runner` | 41241 | 运行测试套件并流式传输日志 | 流式传输、分块产物、轮询、取消、推送通知、两种 JSON 绑定 |
| `code-reviewer` | 41242 | 对照基准分支审查 diff | 直接消息回复、`TASK_STATE_INPUT_REQUIRED`、拒绝内容类型、不支持推送 |
| `deployer` | 41243 | 操作员批准后将构建部署到 staging | bearer 认证、通过 A2A 之外的批准进入 `TASK_STATE_AUTH_REQUIRED`、拒绝、扩展卡片和签名卡片 |

[客户端](#s-a-client)一节逐步讲解实际 planner：`capture/planner.py`。

带种子的 ID 和固定时钟让两次运行逐字节一致。[套件 README](manuals/a2a-101/capture/README.md)列出套件与参考 SDK 的区别。

## 约定 {#s-front-conventions}

引用标明具体位置：{{spec §3.7}} 指规范的一节，{{proto TaskState}} 指 proto 中的消息或枚举，{{docs life-of-a-task}} 指文档页面，{{sdk src/a2a/server/tasks/task_manager.py}} 指 SDK 文件。

代码清单原样复制采集文件中的行，`…` 表示删节，说明文字会交代删去了什么。

字段名和枚举值使用代码字体，按实际传输形式书写，如 `messageId`。图中任务和上下文 ID 缩短至 8 个字符，因此 `728ba084-97eb-422b-b94b-b0fe9153ce2c` 显示为 `728ba084`。

图表在网页上播放动画，可按重播按钮再次播放。打印和减少动态效果模式显示最后一帧。

## 第一次运行 {#s-front-a-first-run}

套件需要 Python 3，以及 `127.0.0.1` 上四个空闲端口：41241 至 41243 用于 agent，41250 用于 webhook 接收器。从仓库根目录运行并检查：

```bash
cd manuals/a2a-101
python3 capture/run.py
python3 capture/run.py --check
```

先打开 `capture/out/02-message-reply.http`：向 `code-reviewer` 提问后得到直接回答，没有任务。再打开 `capture/out/05-streaming.http`，其中发给 `test-runner` 的请求打开了包含九行 `data:` 的流：

```listing
title: 流的开头
source: capture/out/05-streaming.http
lang: http
note: 请求体和第一帧余下部分已省略。文件随后包含第 2 至第 9 帧。
---
POST /a2a/jsonrpc HTTP/1.1
Host: localhost:41241
Content-Type: application/json
A2A-Version: 1.0
Accept: text/event-stream
…
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"jsonrpc": "2.0", "id": 1, "result": {"task": {"id": "728ba084-97eb-422b-b94b-b0fe9153ce2c", … "state": "TASK_STATE_SUBMITTED", …
```

第一帧就是 `task` 本身，[逐个请求看一个任务](#s-one-task-request-by-request)一节解读全部九帧。

## 各部分的顺序 {#s-front-how-the-parts-are-ordered}

第 1 部分概览整个协议。第 2 至第 6 部分逐层展开，从 AgentCard 讲到安全与扩展，第 7 部分构建客户端和服务器：

```parts
```

## 图表配色 {#s-front-colour-in-figures}

每种色相在所有图中保持同一含义：

```palette
```

[此图](#fig-reading-a-sequence)讲解八种箭头样式中的七种。它不含实线李紫色，因为 A2A 从不承载模型调用。

```figure
id: fig-reading-a-sequence
kind: sequence
title: 如何阅读本手册的时序图
claim: 七种箭头样式各标记一种交换，箭头上的标签都来自套件运行中的真实名称。
caption: 按编号逐行从箭尾读向箭头。标签下的注释说明样式及其含义。各行来自 03-blocking-task.http、05-streaming.http、15-push.http、19-planner.log 和 11-errors.http，任务存储是 test-runner 内套件自己的存储。
```

Sources: spec §3.6, §3.7 (research/sources/specification.md); proto TaskState (research/sources/a2a.proto); docs life-of-a-task (research/sources/docs.md); sdk src/a2a/server/tasks/task_manager.py; manual.json; research/sources/README.md; research/brief-spec.md §12.2; research/brief-docs.md; research/sources/specification-main.md (main at 679ab3a); capture/README.md, capture/run.py, capture/agents.py, capture/a2a_ref.py, capture/planner.py; capture/out/02-message-reply.http, 03-blocking-task.http, 05-streaming.http, 11-errors.http, 15-push.http, 19-planner.log
