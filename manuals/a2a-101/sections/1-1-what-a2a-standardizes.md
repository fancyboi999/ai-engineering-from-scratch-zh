# A2A 标准化了什么

> A2A 为内部互不可见的 agent 定义数据模型、一组操作和三种绑定，agent 内部的一切则交给实现。

你的 planner 需要在提交 `9f3c2e1` 上运行 `payments-api` 的单元测试。`test-runner` agent 在端口 41241 执行这项工作，运行于平台团队维护的容器中。你无法把它作为函数导入，只能发送请求并读取返回内容。

规范将这类 agent 称为独立、内部可能不透明的 AI agent 系统："independent, potentially opaque AI agent systems" {{spec §1}}。读完本节后，你可以说出三个层次、核心规则以及 A2A 的边界。

## 规范中的三个层次 {#s-what-a2a-standardizes-three-layers-in-the-specification}

规范分为三个独立层次："organized into three distinct layers" {{spec §1.3}}。

**数据模型：** 定义记录是什么。第 1 层用 Protocol Buffer 消息表达它们："expressed as Protocol Buffer messages" {{spec §1.3}}，proto 文件具有规范性 {{spec §1.4}}。

**操作：** 定义客户端可以请求什么。第 2 层描述 `A2AService` 的十一种 RPC {{proto A2AService}}，不依赖它们如何通过具体协议暴露："independent of how they are exposed over specific protocols" {{spec §1.3}}。

**绑定：** 定义字节如何传输。第 3 层将操作映射到 JSON-RPC、gRPC 和 HTTP+JSON {{spec §1.3}}。

客户端先读取 `AgentCard`，通常在 `/.well-known/agent-card.json` {{spec §8.2}}，使用普通 `GET`，它不属于十一种操作。`test-runner` 的卡片列出 `/a2a/jsonrpc` 和 `/a2a/rest`，[图中](#fig-spec-layers)展示了路径背后的分层。

虚线以下是 `test-runner` 自行实现、协议未规定的部分：HTTP 路由器、请求处理器、任务存储和事件广播。§1.3 的图列出 Get Agent Card 操作，但 §3.1 没有定义它（[冲突 D25](#s-ref-sources)）。§1.4 还写错了 proto 路径（[冲突 D15](#s-ref-sources)）。

```figure
id: fig-spec-layers
kind: layers
title: test-runner 的 A2A 协议栈
claim: A2A 定义卡片、绑定、操作和对象，虚线以下 test-runner 的服务器组件和 agent 逻辑归其维护者负责。
caption: 从 planner 向下读。虚线上是 spec §1.3 的三层，路径来自 capture/out/01-agent-cards.http 中 test-runner 的真实路径。虚线下是 capture/a2a_ref.py 中套件自己的组件，虚线框标出生产 agent 需要添加的部分。
```

## 核心规则 {#s-what-a2a-standardizes-the-core-rules}

**agent 内部不透明：** agent 协作无需共享内部思考、计划或工具实现："without needing to share their internal thoughts, plans, or tool implementations" {{spec §1.2}}，客户端只看得到返回内容。

**服务器决定回复形式：** 消息得到一个新 `Task`，或在简单交互中得到直接 `Message` 回复："a direct `Message` response for simple interactions" {{spec §3.1.1}}。[SendMessage](#s-send-message) 展示两种形式。

**服务器拥有任务：** 不支持客户端用自定 `taskId` 创建任务："Client-provided `taskId` values for creating new tasks is NOT supported" {{spec §3.4.2}}，客户端只生成 `messageId` {{proto Message}}。

**任务处于九种状态之一：** `status.state` 保存一个 `TaskState` 值 {{proto TaskState}}，其中四种是终态，两种是中断态。[Task、TaskStatus 和 TaskState](#s-task-and-task-state) 列出全部九种。

**终态任务不再变化：** 任何消息都不能再改变它，见 [CancelTask 与终态](#s-cancel-task-and-terminal-states)。

```rule
label: 任务的结束
source: spec §3.1.1
---
"Messages sent to Tasks that are in a terminal state (`TASK_STATE_COMPLETED`, `TASK_STATE_FAILED`, `TASK_STATE_CANCELED`, `TASK_STATE_REJECTED`) cannot accept further messages."
```

**产物承载结果：** 消息不应传递任务输出："Messages `SHOULD NOT` be used to deliver task outputs" {{spec §3.7}}，因此 planner 从 `summary.json` 读取测试数量。

**事件按顺序到达：** 所有实现必须按生成顺序交付事件："All implementations `MUST` deliver events in the order they were generated" {{spec §3.5.2}}，重连的客户端用 `GetTask` 确认状态 {{spec §3.7}}。

**凭据放在 HTTP 头中：** 客户端每次 A2A 请求都把凭据放入适合协议的头或元数据："includes these credentials in protocol-appropriate headers or metadata for every A2A request" {{spec §7.3}}，因此 planner 向 `deployer` 的每次请求都发送 `Authorization: Bearer`。

## 与 MCP 的边界 {#s-what-a2a-standardizes-the-boundary-with-mcp}

MCP 连接 agent 与工具，A2A 连接 agent 彼此："One connects agents to tools and resources. The other enables agent-to-agent collaboration" {{docs a2a-and-mcp}}。1.0 公告简写为 agent 内用 MCP、agent 之间用 A2A："MCP inside agents, A2A between agents" {{docs announcing-1.0}}。卡片不指定工具：`test-runner` 卡片上的 `run-tests` 技能只描述工作，到此为止。[MCP 基础](phases/13-tools-and-protocols/06-mcp-fundamentals)讲解另一个协议。

## A2A 留给宿主的工作 {#s-what-a2a-standardizes-what-a2a-leaves-to-the-host}

A2A 不定义注册中心："does not prescribe a standard API for curated registries" {{docs agent-discovery}}。它不签发凭据，身份在协议层处理，而非 A2A 语义内："at the protocol layer, not within A2A semantics" {{spec §7}}。它不规定保留期，因此任务 ID 可能无效、过期或已完成并清除："invalid, expired, or already completed and purged" {{spec §3.3.2}}。它不保证效果恰好发生一次，发送操作可以是幂等的："Send Message operations `MAY` be idempotent" {{spec §3.3.1}}，webhook 至少尝试一次 {{spec §4.3.3}}。[此图](#fig-guarantees)把每项保证与宿主的职责配对。

```figure
id: fig-guarantees
kind: comparison
title: A2A 的保证与宿主的实现
claim: A2A 固定 agent 之间的消息、状态和事件，信任、发现、保留以及恰好一次的效果留给宿主。
caption: 逐行横向阅读，每行一个步骤。左框是规范的保证，旁边灰框是你要构建的部分。没有采集记录：各行来自 spec §1、§3.3.1、§3.4.1、§3.7、§4.3.3、§7、§8.2 和 §13.1。
```

规范还有十处影响代码的自相矛盾，列在下表，并在[来源参考](#s-ref-sources)中给出取舍。

| 冲突 | 不一致之处 |
|---|---|
| [D1](#s-ref-sources) | `SubscribeToTask` 的 HTTP 动词 |
| [D2](#s-ref-sources) | 普通 `SendMessage` 是否等待 |
| [D3](#s-ref-sources) | 中断态是否关闭流 |
| [D4](#s-ref-sources) 和 [D5](#s-ref-sources) | 推送配置对象的名称 |
| [D6](#s-ref-sources) | 卡片安全字段的名称 |
| [D11](#s-ref-sources) | 已弃用的 OAuth 流程 |
| [D12](#s-ref-sources) | `ListTasks` 分页字段名称 |
| [D13](#s-ref-sources) | HTTP+JSON 错误体 |
| [D36](#s-ref-sources) | 访问另一客户端任务时的错误 |

```takeaways
- 按操作和对象构建客户端，每种绑定独立放在一个模块中。
- 将远程 agent 端点背后的一切视为私有。
- 每条消息生成新的 `messageId`，从产物读取结果，在 HTTP 头中发送凭据。
```

Sources: spec §1, §1.2, §1.3, §1.4, §3.1.1, §3.3.1, §3.3.2, §3.4.1, §3.4.2, §3.5.2, §3.7, §4.3.3, §7, §7.3, §8.2, §13.1 (research/sources/specification.md); proto A2AService, Message, TaskState (research/sources/a2a.proto); docs a2a-and-mcp, announcing-1.0, agent-discovery (research/sources/docs.md); capture/a2a_ref.py, capture/planner.py; capture/out/01-agent-cards.http, 03-blocking-task.http, 10-cancel.http, 19-planner.http
