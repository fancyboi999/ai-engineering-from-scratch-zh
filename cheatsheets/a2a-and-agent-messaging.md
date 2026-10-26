---
id: a2a-and-agent-messaging
title: A2A 与 agent 通信协议
code: A2
subtitle: 对比 MCP、A2A、ACP、ANP 和 FIPA-ACL。掌握 Agent 卡片、任务、传输名称与故障。基于 A2A 1.0.1。
hue: 165
sources: phases/13-tools-and-protocols/19-a2a-protocol, phases/16-multi-agent-and-swarms/02-fipa-acl-heritage, phases/16-multi-agent-and-swarms/03-communication-protocols, phases/16-multi-agent-and-swarms/12-a2a-protocol
source_hash: 9b770ef16e7d5b4d
---

## 四种协议对比
type: comparison
span: 2
from: phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md

| 比较项 | MCP | A2A | ACP | ANP |
|---|---|---|---|---|
| 主要用途 | agent 调用工具 | agent 间通信 | agent 间通信 | agent 间通信 |
| 规范格式 | JSON-RPC | JSON-RPC / REST / gRPC | OpenAPI 3.1 (REST) | JSON-RPC |
| 发现 | 工具列表 | `/.well-known/agent-card.json` | `GET /agents`, `/.well-known/agent.yml` | `/.well-known/agent-descriptions` |
| 身份 | 隐式（本地） | 安全方案（OAuth、mTLS） | 服务端级别 | W3C DID (`did:wba`)，配合 E2EE |
| 审计轨迹 | 不适用 | 基础功能（任务历史） | TrajectoryMetadata | 未正式规定 |
| 流式传输 | 不适用 | SSE | SSE | 与传输方式无关 |
| 独有特性 | 工具 schema | Agent 卡片 + 技能 | 执行轨迹审计 | 元协议协商 |
| 状态 | 稳定 | 稳定（v1.0） | 正在合并到 A2A | 持续开发 |

## 按场景选择
type: concepts
from: phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md, phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md

- **MCP**：调用特定工具，即 agent 调用工具。
- **A2A**：把完整任务委派给另一个 agent。
- **A2A + ACP 模式**：需要满足合规要求的审计轨迹。
- **ANP + A2A**：agent 位于组织外，且没有共享基础设施。
- **A2A + 消息代理**：外部 agent 使用共享基础设施。
- **直接 RPC**：对延迟敏感的小调用。A2A 的生命周期是异步的。
- **不使用协议**：agent 之间无需通信。

## 通过 HTTP+JSON 调用 A2A
type: architecture
from: phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/code/main.py

```arch
node | client | 1,1 | 客户端 agent | 发送 A2A-Version: 1.0 | client
node | card | 2,1 | Agent 卡片 | /.well-known/agent-card.json | store
node | send | 1,2 | POST /message:send | returnImmediately | process
node | store | 2,2 | TaskStore | 状态 + 产物 | store
node | poll | 3,2 | GET /tasks/{id} | 直到任务进入终态 | process
edge | client | card | 发现
edge | client | send | 消息
edge | send | store | 创建任务
edge | store | poll | 任务
```

## 可暂停的任务生命周期
type: flow
from: phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md, phases/13-tools-and-protocols/19-a2a-protocol/code/main.py, phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md

1. **客户端**：发送不带 `taskId` 的 `SendMessage`。服务端创建 Task。
2. **服务端**：先设置 `TASK_STATE_SUBMITTED`，再设置 `TASK_STATE_WORKING`。
3. **服务端**：数据缺失时，设置 `TASK_STATE_INPUT_REQUIRED`，并附上 `ROLE_AGENT` 消息。
4. **客户端**：使用相同的 `taskId` 发送新消息，带上 `data` 内容块。
5. **服务端**：恢复 `TASK_STATE_WORKING`，并添加一个 Artifact。
6. **服务端**：设置 `TASK_STATE_COMPLETED`。终态不可修改。
7. **客户端**：后续请求在同一 `contextId` 内创建新任务。

## A2A 任务的传输形式
type: task-table
span: 2
from: phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/code/main.py

| 任务 | 代码 |
|---|---|
| 发现 agent | `GET /.well-known/agent-card.json` |
| 发送并等待（JSON-RPC） | `"method": "SendMessage"` |
| 发送后立即返回（HTTP+JSON） | `POST /message:send`，带 `configuration.returnImmediately` |
| 轮询任务 | `GetTask` 或 `GET /tasks/{id}` |
| 通过 SSE 流式跟踪任务 | `SendStreamingMessage` 或 `POST /message:stream` |
| 重新连接运行中的任务 | `SubscribeToTask` 或 `/tasks/{id}:subscribe` |
| 取消或列出任务 | `CancelTask`, `ListTasks` |
| 运行演示服务端和客户端 | `python3 code/main.py` |

## Agent 卡片与 Message 的结构
type: annotated-code
lang: json
from: phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md

```json
{"name": "research-agent", "version": "1.2.0",
 "supportedInterfaces": [{"url": "<url>",           // 选择第一个支持的绑定
   "protocolBinding": "JSONRPC", "protocolVersion": "1.0"}],
 "capabilities": {"streaming": true, "pushNotifications": true},
 "securitySchemes": {"bearer": {"httpAuthSecurityScheme": {"scheme": "Bearer"}}},
 "securityRequirements": [{"schemes": {"bearer": {"list": []}}}],
 "defaultInputModes": ["text/plain"],               // 媒体类型
 "skills": [{"id": "summarize_paper", "tags": ["research"]}]}
{"messageId": "msg-001", "role": "ROLE_USER",       // 或 ROLE_AGENT
 "parts": [{"text": "Summarize this paper."},       // 每个 Part 只能有一个内容字段
   {"raw": "...", "filename": "paper.pdf", "mediaType": "application/pdf"},
   {"data": {"targetLength": "3 paragraphs"}}]}     // 没有 kind 字段
```

## 默认值与数值
type: defaults
from: phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/code/main.py, phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `A2A_VERSION` | "1.0" | 每次请求都发送 `A2A-Version: 1.0` |
| 缺少 `A2A-Version` 请求头 | 0.3 | 服务端按 0.3 版本解析请求 |
| `returnImmediately` | False | `SendMessage` 阻塞到终态或中断状态 |
| `A2A_MEDIA_TYPE` | "application/a2a+json" | HTTP+JSON 绑定的内容类型 |
| `PORT` | 8765 | 第 16.12 课的演示服务端 |
| ANP 协商 | 最多 10 轮 | 之后超时 |

## FIPA-ACL 的传承
type: comparison
from: phases/16-multi-agent-and-swarms/02-fipa-acl-heritage/docs/zh.md

| 现代规范 | FIPA 对应项 | 保留 | 舍弃 |
|---|---|---|---|
| MCP `tools/call` | `request` | 意图、关联标识 | 语义、本体 |
| MCP `resources/read` | `query-ref` | 意图、关联标识 | 形式语义 |
| A2A Task 生命周期 | contract-net + request-when | 异步生命周期 | 完整性保证 |
| A2A 流式事件 | subscribe/notify | 异步推送 | 类型化谓词订阅 |
| NLIP | 自然语言内容 | LLM 原生 | schema |

## 故障排查
type: troubleshooting
from: phases/13-tools-and-protocols/19-a2a-protocol/code/main.py, phases/16-multi-agent-and-swarms/12-a2a-protocol/code/main.py, phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md, phases/16-multi-agent-and-swarms/02-fipa-acl-heritage/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| JSON-RPC 错误 `-32009` | `A2A-Version` 缺失或错误 | 发送 `A2A-Version: 1.0` |
| JSON-RPC 错误 `-32601` | 未知方法名 | 使用 `SendMessage` 等 PascalCase 名称 |
| HTTP 400 `VERSION_NOT_SUPPORTED` | HTTP+JSON 调用缺少请求头 | 每次请求都添加该请求头 |
| HTTP 404 `TASK_NOT_FOUND` | `GET /tasks/{id}` 使用了未知任务标识 | 使用 `task` 响应中的标识 |
| 完成后的更新丢失 | 任务进入终态后不可修改 | 产出更新前先检查终态 |
| 卡片更新后出现无效数据 | 版本间 schema 漂移 | 为技能和输出 schema 标明版本 |
| 同一词语触发错误动作 | 缺少本体导致语义漂移 | 对 `content` 使用 JSON Schema，使用类型化产物 |
| 50 个 agent 同时请求 `GET /agents` | 发现阶段发生惊群 | 为 Agent 卡片设置 TTL 缓存 |

## 缩写
type: glossary
from: phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md, phases/16-multi-agent-and-swarms/02-fipa-acl-heritage/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md

- **A2A**：Agent2Agent。使用 Agent 卡片和任务的对等协议。
- **ACP**：Agent Communication Protocol，agent 通信协议。REST 执行附带 TrajectoryMetadata。
- **ANP**：Agent Network Protocol，agent 网络协议。使用 `did:wba` 身份与 HPKE E2EE。
- **DID**：去中心化标识符。agent 自有域名上的 W3C 身份。
- **NLIP**：Ecma 自然语言交互协议。使用自然语言内容类型。
- **FIPA**：智能物理 agent 基金会。2000 年将 ACL 标准化。
- **ACL**：agent 通信语言。由言语行为、内容和元数据组成。
- **KQML**：知识查询与操纵语言（1993）。FIPA 的前身。

## 问答
type: qa
from: phases/13-tools-and-protocols/19-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/zh.md, phases/16-multi-agent-and-swarms/03-communication-protocols/docs/zh.md, phases/16-multi-agent-and-swarms/02-fipa-acl-heritage/docs/zh.md

- **A2A 调用方能看到什么？** 任务状态与产物。被调用 agent 的内部实现仍不透明。
- **重试时如何避免重复任务？** 按客户端的 `messageId` 去重。
- **Agent 卡片如何签名？** 对排除 `signatures` 的 RFC 8785 规范化 JSON 生成 JWS，放入 `signatures`。
- **ACP 增加了什么？** 每个内容块都可携带 `tool_name`、`tool_input` 和 `tool_output` 元数据。
- **DID 获取失败时放行还是拒绝？** 遵循最小信任原则，失败时拒绝。
- **哪些 FIPA 协议值得移植？** Contract Net、Subscribe/Notify 和 Request-When。
