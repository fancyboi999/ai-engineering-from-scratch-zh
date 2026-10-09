# A2A——Agent-to-Agent 协议

> MCP 是 agent 对工具。A2A（Agent2Agent）是 agent 对 agent——一个让构建于不同框架之上的不透明 agent 协作的开放协议。Google 在 2025 年 4 月发布，2025 年 6 月捐给 Linux Foundation，2026 年 4 月达到 v1.0，拥有 150+ 个支持方，包括 AWS、Cisco、Microsoft、Salesforce、SAP 和 ServiceNow。它吸收了 IBM 的 ACP，并加上了 AP2 支付扩展。本课走一遍 Agent Card、Task 生命周期，以及三种协议绑定，采用 A2A 1.0.1 线缆命名。

**类型：** Build
**语言：** Python（标准库，Agent Card + Task 脚手架）
**前置要求：** 阶段 13 · 06（MCP 基础）、阶段 13 · 08（MCP client）
**预计时间：** ~75 分钟

## 学习目标

- 区分 agent 对工具（MCP）和 agent 对 agent（A2A）的用例。
- 在 `/.well-known/agent-card.json` 发布一张带 skill 和 `supportedInterfaces` 元数据的 Agent Card。
- 走一遍 Task 生命周期：`TASK_STATE_SUBMITTED`、`TASK_STATE_WORKING`、`TASK_STATE_INPUT_REQUIRED`，以及终态 `TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED`、`TASK_STATE_REJECTED`。
- 用各 Part 分别持有 `text`、`raw`、`url` 或 `data` 之一的 Message，以及作为输出的 Artifact。

## 问题背景

一个客服 agent 需要把写报告委派给一个专门的写手 agent。A2A 之前的选项：

- 自定义 REST API。能行，但每一对配对都是一次性的。
- 共享代码库。要求两个 agent 跑同一个框架。
- MCP。不契合：MCP 是用来调工具的，不是让两个 agent 在各自保持不透明内部推理的同时协作的。

A2A 填上这道缺口。它把交互建模为一个 agent 给另一个发一个 Task，配一套生命周期、消息和 artifact。被调用 agent 的内部状态保持不透明——调用方只看到 task 状态转移和最终输出。

A2A 是那个"让跨框架的 agent 互相对话"的协议。它不取代 MCP；两者互补。

## 核心概念

### Agent Card

每个 A2A 合规的 agent 在 `/.well-known/agent-card.json` 发布一张 card：

```json
{
  "name": "research-agent",
  "description": "Summarizes academic papers and drafts citations.",
  "version": "1.2.0",
  "supportedInterfaces": [
    {
      "url": "https://research.example.com/a2a",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    }
  ],
  "capabilities": {"streaming": true, "pushNotifications": true},
  "securitySchemes": {
    "bearer": {"httpAuthSecurityScheme": {"scheme": "Bearer"}}
  },
  "securityRequirements": [{"schemes": {"bearer": {"list": []}}}],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/markdown"],
  "skills": [
    {
      "id": "summarize_paper",
      "name": "Summarize a paper",
      "description": "Read a paper PDF and produce a 3-paragraph summary.",
      "tags": ["research", "summarization"],
      "inputModes": ["text/plain", "application/pdf"],
      "outputModes": ["text/markdown"]
    }
  ]
}
```

发现是基于 URL 的：获取这张 card，挑选 client 能支持的第一个 `supportedInterfaces` 条目（匹配其 `protocolBinding`），并枚举各 skill。输入和输出模式为媒体类型（media types）。

### 签名的 Agent Card

一张 card 可以携带一个 `signatures` 数组。每个条目都是在剔除 `signatures` 字段后的 RFC 8785 规范化 JSON 上计算出的 JWS（RFC 7515）。消费方以相同方式将 card 规范化并校验。防止冒充。

### Task 生命周期

```text
TASK_STATE_SUBMITTED
  -> TASK_STATE_WORKING
  -> TASK_STATE_COMPLETED | TASK_STATE_FAILED | TASK_STATE_CANCELED | TASK_STATE_REJECTED

TASK_STATE_WORKING
  -> TASK_STATE_INPUT_REQUIRED
  -> TASK_STATE_WORKING (client 发送具有相同 taskId 的 message)
```

client 通过 `SendMessage` 发起，由服务端创建 Task。被调用的 agent 穿过各状态；client 用 `GetTask` 轮询，或通过 `SendStreamingMessage` 和 `SubscribeToTask` 经由 SSE 进行流式传输。流携带 `statusUpdate` 与 `artifactUpdate` 事件，并在任务达到终态时关闭。不存在 `final` 标记。

### Message 与 Part

一条 message 具有 `messageId`、`role`（`ROLE_USER` 或 `ROLE_AGENT`）以及一个或多个 Part。每个 Part 恰好持有一个内容字段，该字段名即为其类型，没有 `kind` 字段。

- `text`：纯文本内容。
- `raw`：文件字节，JSON 中为 base64，通常附带 `filename` 和 `mediaType`。
- `url`：指向文件内容的链接。
- `data`：结构化 JSON 载荷（给被调用 agent 的结构化输入）。

例子：

```json
{
  "messageId": "msg-001",
  "role": "ROLE_USER",
  "parts": [
    {"text": "Summarize this paper."},
    {"raw": "...", "filename": "paper.pdf", "mediaType": "application/pdf"},
    {"data": {"targetLength": "3 paragraphs"}, "mediaType": "application/json"}
  ]
}
```

### Artifact

输出是 Artifact，不是裸字符串。一个 Artifact 是一个具名、定型的输出：

```json
{
  "artifactId": "art-001",
  "name": "summary",
  "parts": [{"text": "...", "mediaType": "text/markdown"}]
}
```

Artifact 可以分块流式传输。每个 `artifactUpdate` 事件携带 artifact 以及 `append` 和 `lastChunk` 标志。调用方进行累积。

### 三种协议绑定

1. **JSON-RPC 2.0 over HTTP**（`JSONRPC`）。POST 发请求，SSE 做流式。方法名采用 PascalCase：`SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、`CreateTaskPushNotificationConfig`、`GetTaskPushNotificationConfig`、`ListTaskPushNotificationConfigs`、`DeleteTaskPushNotificationConfig` 和 `GetExtendedAgentCard`。
2. **gRPC**（`GRPC`）。用于 gRPC 原生的企业环境。方法名相同。
3. **HTTP+JSON/REST**（`HTTP+JSON`）。资源 URL 例如 `POST /message:send` 和 `GET /tasks/{id}`。

三种绑定承载相同的数据模型。每个 `supportedInterfaces` 条目声明一种绑定及其 `protocolVersion`。client 在每个请求上发送 HTTP 标头 `A2A-Version: 1.0`，因为没有该标头的请求服务端会按 0.3 版本处理。

```http
POST /a2a HTTP/1.1
Host: research.example.com
Content-Type: application/json
A2A-Version: 1.0

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "ROLE_USER",
      "parts": [{"text": "Summarize this paper."}]
    }
  }
}
```

### 不透明性保持

一个关键设计原则：被调用 agent 的内部状态不透明。调用方看到 task 状态和 artifact。被调用 agent 的思维链、它的工具调用、它的子 agent 委派——全都不可见。这和 MCP 不同，MCP 里工具调用是透明的。

理由：A2A 让竞争对手能在不暴露内部的情况下协作。A2A 可以是"调用这个客服 agent"，而调用方不会得知那个 agent 是怎么实现这项服务的。

### 时间线

- **2025-04-09。** Google 宣布 A2A。
- **2025-06-23。** 捐给 Linux Foundation。
- **2025-08。** 吸收 IBM 的 ACP。
- **2025-09。** AP2 扩展（Agent Payments）发布。
- **2026-04。** v1.0 发布，有 150+ 个支持组织。

### 与 MCP 的关系

| 维度 | MCP | A2A |
|-----------|-----|-----|
| 用例 | agent 对工具 | agent 对 agent |
| 不透明性 | 透明的工具调用 | 不透明的内部推理 |
| 典型调用方 | agent 运行时 | 另一个 agent |
| 状态 | 工具调用结果 | 带生命周期的 Task |
| 授权 | OAuth 2.1（阶段 13 · 16） | Agent Card `securitySchemes` + `securityRequirements` |
| 传输 | Stdio / Streamable HTTP | JSON-RPC / gRPC / HTTP+JSON |

想调用一个特定工具时用 MCP。想把一整个 task 委派给另一个 agent 时用 A2A。许多生产系统两者都用：一个 agent 把 MCP 用于它的工具层，把 A2A 用于它的协作层。

```figure
a2a-task-lifecycle
```

## 实际使用

`code/main.py` 实现一个极简 A2A 脚手架：写手 agent 发布其 card，研究 agent 向其发送携带 PDF part 和文本指令的 `SendMessage` 请求，任务穿过 `TASK_STATE_WORKING` → `TASK_STATE_INPUT_REQUIRED` → `TASK_STATE_WORKING` → `TASK_STATE_COMPLETED`，最终返回一个文本 artifact。全标准库；用内存传输来聚焦于消息形状。

要看什么：

- Agent Card 的 JSON 形状。
- 服务端 Task id 分配与状态转移。
- 通过所包含的内容字段来定型的 Part。
- 任务中途的 `TASK_STATE_INPUT_REQUIRED` 分支。
- 完成时返回的 artifact。

## 拿去用

本课产出 `outputs/skill-a2a-agent-spec.md`。给定一个应当能被其他 agent 调用的新 agent，这个 skill 产出 Agent Card JSON、skill schema 和端点蓝图。

## 练习

1. 跑 `code/main.py`。追踪完整的 Task 生命周期，包括被调用 agent 索要澄清的 `TASK_STATE_INPUT_REQUIRED` 暂停。

2. 加一张签名的 Agent Card。在 `signatures` 中放入一个 `alg` 为 `HS256` 的 JWS 条目，签名剔除了 `signatures` 字段的规范化 JSON。写一个校验器，确认它在被篡改的 card 上校验失败。

3. 用 `SendStreamingMessage` 实现任务流式传输：写手 agent 经由 SSE 发出 `task`、三个 `artifactUpdate` 分块，以及带有 `TASK_STATE_COMPLETED` 的 `statusUpdate`，随后关闭流。调用方累积分块。

4. 设计一个包住一个 MCP server 的 A2A agent。把每个 MCP 工具映射到一个 A2A skill。记下权衡——丢失了什么不透明性？

5. 读 A2A v1.0 公告，找出截至 2026 年 4 月还没被任何框架实现的那个特性。（提示：它跟多跳 task 委派有关。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| A2A | "Agent-to-Agent 协议" | 用于不透明 agent 协作的开放协议 |
| Agent Card | "`/.well-known/agent-card.json`" | 描述一个 agent 的技能与 `supportedInterfaces` 的已发布元数据 |
| Skill | "一个可调用单位" | agent 支持的具名操作（类比 MCP tool） |
| Task | "委派单位" | 带生命周期和最终 artifact 的工作项 |
| Message | "task 输入" | 携带 Part（`text`、`raw`、`url`、`data`） |
| Part | "定型块" | 恰好持有 `text` / `raw` / `url` / `data` 之一，加可选 `mediaType`；没有 `kind` 字段 |
| Artifact | "task 输出" | 完成时返回的具名、定型输出 |
| AP2 | "Agent Payments Protocol" | 构建在 A2A 之上的支付扩展；card 签名是 A2A 核心能力（`signatures`） |
| Opacity | "黑盒协作" | 被调用 agent 的内部对调用方隐藏 |
| `TASK_STATE_INPUT_REQUIRED` | "task 暂停" | agent 需要更多信息时的中断状态 |

## 延伸阅读

- [a2a-protocol.org](https://a2a-protocol.org/latest/) — 权威 A2A 规范
- [a2aproject/A2A — GitHub](https://github.com/a2aproject/A2A) — 参考实现与 SDK
- [A2A v1.0.1 release](https://github.com/a2aproject/A2A/tree/v1.0.1)：本课所遵循的打标签 `docs/specification.md` 以及规范化的 `specification/a2a.proto`
- [Linux Foundation — A2A launch press release](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents) — 2025 年 6 月治理移交
- [Google Cloud — A2A protocol upgrade](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade) — 路线图与合作伙伴势头
- [Google Dev — A2A 1.0 milestone](https://discuss.google.dev/t/the-a2a-1-0-milestone-ensuring-and-testing-backward-compatibility/352258) — v1.0 发布说明与向后兼容指引
