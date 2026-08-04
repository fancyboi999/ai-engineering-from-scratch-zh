# 通信协议

> 不能说同一种语言的 agent 不是团队。它们只是一群对着虚空喊叫的陌生人。

**类型：** Build
**语言：** TypeScript
**前置要求：** Phase 14（Agent 工程）、第 16.01 课（为什么要用多 agent）
**预计时间：** ~120 分钟

## 学习目标

- 实现 MCP 的工具发现与调用，让 agent 能用上外部服务器暴露的工具
- 构建一张 A2A agent card 和一个任务端点，让一个 agent 能通过 HTTP 把活儿委派给另一个 agent
- 对比 MCP（工具访问）、A2A（agent 对 agent）、ACP（企业审计）、ANP（去中心化信任），讲清每个协议解决的是哪个问题
- 把多个协议接到同一套系统里：agent 通过 MCP 发现工具、通过 A2A 委派任务

## 问题背景

你把系统拆成了多个 agent：一个 researcher、一个 coder、一个 reviewer。它们各自的活儿干得漂亮。但现在你需要它们真的彼此对话。

你的第一反应很显然：到处传字符串。researcher 返回一坨文本，coder 能怎么解析就怎么解析。这能凑合到 coder 误读了一份调研摘要那一刻、或两个 agent 互相等待死锁那一刻、或你需要不同团队造的 agent 协作那一刻。突然之间，「直接传字符串」就散架了。

这就是通信协议问题。没有一份共享契约来规定 agent 如何交换信息，多 agent 系统就会脆弱、不可审计，而且无法扩展到你亲手写的那几个 agent 之外。

AI 生态给出了四个协议作为回应，每个解决问题的一个切面：

- **MCP** 管工具访问
- **A2A** 管 agent 之间的协作
- **ACP** 管企业级可审计性
- **ANP** 管去中心化身份与信任

本课讲得很深。你会读到每份规范真实的线格式，构建可运行的实现，并把这四个连成一套统一的系统。

## 核心概念

### 协议版图

把这四个协议想成不同的层，每层回答一个不同的问题：

```mermaid
flowchart TD
  ANP["ANP — agent 之间如何信任陌生人？<br/>去中心化身份 (DID)、端到端加密、元协议"]
  A2A["A2A — agent 之间如何协作达成目标？<br/>Agent Card、任务生命周期、流式传输、谈判"]
  ACP["ACP — agent 如何在可审计系统中通信？<br/>Run、轨迹元数据、会话连续性"]
  MCP["MCP — agent 如何使用工具？<br/>工具发现、执行、上下文共享"]

  style ANP fill:#f3e8ff,stroke:#7c3aed
  style A2A fill:#dbeafe,stroke:#2563eb
  style ACP fill:#fef3c7,stroke:#d97706
  style MCP fill:#d1fae5,stroke:#059669
```

它们不是竞争关系。它们在不同层级解决不同的问题。

### MCP（回顾）

MCP 在 Phase 13 里讲得很透。快速回顾：MCP 标准化了 LLM 如何连接外部工具和数据源。它是一个**客户端-服务器**协议，agent（客户端）发现并调用服务器暴露的工具。

```mermaid
sequenceDiagram
    participant Agent as Agent（客户端）
    participant MCP1 as MCP 服务器<br/>（数据库、API、文件）

    Agent->>MCP1: 列出工具
    MCP1-->>Agent: 工具定义
    Agent->>MCP1: 调用工具 X
    MCP1-->>Agent: 结果
```

MCP 是 **agent 对工具**的通信。它帮不了 agent 彼此对话。

### A2A（Agent2Agent 协议）

**作者：** Google（现归 Linux Foundation，标识为 `lf.a2a.v1`）
**规范版本：** 1.0.0
**问题：** 自主 agent 如何彼此协作、谈判、委派任务？

A2A 是用于 **agent 对等协作**的协议。MCP 把 agent 连到工具，A2A 把 agent 连到其他 agent。每个 agent 在一个 well-known URL 上发布一张 **Agent Card**，其他 agent 据此发现它、与它谈判、把任务委派给它。

#### A2A 怎么运转

```mermaid
sequenceDiagram
    participant Client as 客户端 Agent
    participant Remote as 远端 Agent

    Client->>Remote: GET /.well-known/agent-card.json
    Remote-->>Client: Agent Card（技能、模式、安全）

    Client->>Remote: POST /message:send
    Remote-->>Client: 任务（已提交/处理中）

    alt 轮询
        Client->>Remote: GET /tasks/{id}
        Remote-->>Client: 任务状态 + 产物
    else 流式传输
        Client->>Remote: POST /message:stream
        Remote-->>Client: SSE: 状态更新
        Remote-->>Client: SSE: 产物更新
        Remote-->>Client: SSE: 完成
    end
```

#### 真实的 Agent Card

这就是 A2A Agent Card 在真实环境里的样子。在 `GET /.well-known/agent-card.json` 上提供：

```json
{
  "name": "Research Agent",
  "description": "Searches documentation and summarizes findings",
  "version": "1.0.0",
  "supportedInterfaces": [
    {
      "url": "https://research-agent.example.com/a2a/v1",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    },
    {
      "url": "https://research-agent.example.com/a2a/rest",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    }
  ],
  "provider": {
    "organization": "Your Company",
    "url": "https://example.com"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "web-research",
      "name": "Web Research",
      "description": "Searches the web and synthesizes findings",
      "tags": ["research", "search", "summarization"],
      "examples": ["Research the latest changes in React 19"]
    },
    {
      "id": "doc-analysis",
      "name": "Documentation Analysis",
      "description": "Reads and analyzes technical documentation",
      "tags": ["docs", "analysis"],
      "inputModes": ["text/plain", "application/pdf"],
      "outputModes": ["application/json"]
    }
  ],
  "securitySchemes": {
    "bearer": {
      "httpAuthSecurityScheme": {
        "scheme": "Bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [{ "bearer": [] }]
}
```

几个要注意的点：
- **Skills（技能）** 是一个 agent 能做的事。每项技能有 ID、标签、支持的输入/输出 MIME 类型。客户端 agent 据此判断这个远端 agent 能不能处理它的请求。
- **supportedInterfaces** 列出多种协议绑定。单个 agent 能同时说 JSON-RPC、REST 和 gRPC。
- **Security（安全）** 内置在 card 里。客户端在发出第一个请求之前就知道需要什么认证。

#### 任务生命周期

任务（Task）是 A2A 里的核心工作单元。它们在一组已定义的状态之间流转：

```mermaid
stateDiagram-v2
    [*] --> submitted
    submitted --> working
    working --> input_required: 需要更多信息
    input_required --> working: 客户端发送数据
    working --> completed: 成功
    working --> failed: 出错
    working --> canceled: 客户端取消
    submitted --> rejected: agent 拒绝

    completed --> [*]
    failed --> [*]
    canceled --> [*]
    rejected --> [*]

    note right of completed
        终态不可变。
        后续操作在同一个 contextId 下
        创建新任务。
    end note
```

全部 8 个状态（规范还定义了 `UNSPECIFIED` 作为哨兵值，这里省略）：

| 状态 | 终态？ | 含义 |
|---|---|---|
| `TASK_STATE_SUBMITTED` | 否 | 已确认，尚未开始处理 |
| `TASK_STATE_WORKING` | 否 | 正在处理中 |
| `TASK_STATE_INPUT_REQUIRED` | 否 | agent 需要客户端提供更多信息 |
| `TASK_STATE_AUTH_REQUIRED` | 否 | 需要认证 |
| `TASK_STATE_COMPLETED` | 是 | 成功完成 |
| `TASK_STATE_FAILED` | 是 | 出错结束 |
| `TASK_STATE_CANCELED` | 是 | 完成前被取消 |
| `TASK_STATE_REJECTED` | 是 | agent 拒绝了该任务 |

任务一旦进入终态就不可变了。不再有后续消息。后续工作会在同一个 `contextId` 下创建新任务。

#### 线格式

A2A 用 JSON-RPC 2.0。真实的消息交换长这样：

**客户端发送一个任务：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "ROLE_USER",
      "parts": [{ "text": "Research React 19 compiler features" }]
    },
    "configuration": {
      "acceptedOutputModes": ["text/plain", "application/json"],
      "historyLength": 10
    }
  }
}
```

**agent 用一个任务回应：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "task": {
      "id": "task-abc-123",
      "contextId": "ctx-xyz-789",
      "status": {
        "state": "TASK_STATE_COMPLETED",
        "timestamp": "2026-03-27T10:30:00Z"
      },
      "artifacts": [
        {
          "artifactId": "art-001",
          "name": "research-results",
          "parts": [{
            "data": {
              "findings": [
                "React 19 compiler auto-memoizes components",
                "No more manual useMemo/useCallback needed",
                "Compiler runs at build time, not runtime"
              ]
            },
            "mediaType": "application/json"
          }]
        }
      ]
    }
  }
}
```

**通过 SSE 流式传输：**
```text
POST /message:stream HTTP/1.1
Content-Type: application/json
A2A-Version: 1.0

data: {"task":{"id":"task-123","status":{"state":"TASK_STATE_WORKING"}}}

data: {"statusUpdate":{"taskId":"task-123","status":{"state":"TASK_STATE_WORKING","message":{"role":"ROLE_AGENT","parts":[{"text":"Searching documentation..."}]}}}}

data: {"artifactUpdate":{"taskId":"task-123","artifact":{"artifactId":"art-1","parts":[{"text":"partial findings..."}]},"append":true,"lastChunk":false}}

data: {"statusUpdate":{"taskId":"task-123","status":{"state":"TASK_STATE_COMPLETED"}}}
```

### ACP（Agent Communication Protocol）

**作者：** IBM / BeeAI
**规范版本：** 0.2.0（OpenAPI 3.1.1）
**状态：** 正在并入 Linux Foundation 旗下的 A2A
**问题：** agent 如何在完整可审计、会话连续、轨迹可追踪的前提下通信？

ACP 是**企业级协议**。和许多摘要的说法相反，ACP **不**用 JSON-LD。它是一个由 OpenAPI 定义的直白的 REST/JSON API。让它与众不同的是 **TrajectoryMetadata**：每条 agent 响应都能携带一份详细日志，记录产出它的推理步骤和工具调用。

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant ACP as ACP Agent
    participant Audit as 审计日志

    Client->>ACP: POST /runs (mode: sync)
    ACP->>ACP: 处理请求...
    ACP->>Audit: 记录轨迹：<br/>推理 + 工具调用
    ACP-->>Client: 响应 + TrajectoryMetadata
    Note over Audit: 每一步都被记录：<br/>tool_name、tool_input、<br/>tool_output、推理过程
```

#### ACP 里的 agent 发现

ACP 定义了四种发现方式：

```mermaid
graph LR
    A[Agent 发现] --> B["运行时<br/>GET /agents"]
    A --> C["开放<br/>.well-known/agent.yml"]
    A --> D["注册表<br/>集中式目录"]
    A --> E["嵌入式<br/>容器标签"]

    style B fill:#dbeafe,stroke:#2563eb
    style C fill:#d1fae5,stroke:#059669
    style D fill:#fef3c7,stroke:#d97706
    style E fill:#f3e8ff,stroke:#7c3aed
```

**AgentManifest** 比 A2A 的 Agent Card 更简单：

```json
{
  "name": "summarizer",
  "description": "Summarizes documents with source citations",
  "input_content_types": ["text/plain", "application/pdf"],
  "output_content_types": ["text/plain", "application/json"],
  "metadata": {
    "tags": ["summarization", "RAG"],
    "framework": "BeeAI",
    "capabilities": [
      {
        "name": "Document Summarization",
        "description": "Condenses long documents into key points"
      }
    ],
    "recommended_models": ["llama3.3:70b-instruct-fp16"],
    "license": "Apache-2.0",
    "programming_language": "Python"
  }
}
```

#### Run 生命周期

ACP 用「Run（运行）」而不是「Task（任务）」。一个 Run 是一次 agent 执行，有三种模式：

| 模式 | 行为 |
|---|---|
| `sync` | 阻塞。响应里包含完整结果。 |
| `async` | 立即返回 202。轮询 `GET /runs/{id}` 查状态。 |
| `stream` | SSE 流。agent 干活时不断发出事件。 |

```mermaid
stateDiagram-v2
    [*] --> created
    created --> in_progress
    in_progress --> completed: 成功
    in_progress --> failed: 出错
    in_progress --> awaiting: 需要输入
    awaiting --> in_progress: 客户端恢复
    in_progress --> cancelling: 取消请求
    cancelling --> cancelled

    completed --> [*]
    failed --> [*]
    cancelled --> [*]
```

#### TrajectoryMetadata（审计轨迹）

这是 ACP 的核心差异点。每个消息片段都能附带元数据，精确展示 agent 做了什么：

```json
{
  "role": "agent/researcher",
  "parts": [
    {
      "content_type": "text/plain",
      "content": "The weather in San Francisco is 72F and sunny.",
      "metadata": {
        "kind": "trajectory",
        "message": "I need to check the weather for this location",
        "tool_name": "weather_api",
        "tool_input": { "location": "San Francisco, CA" },
        "tool_output": { "temperature": 72, "condition": "sunny" }
      }
    }
  ]
}
```

对受监管行业来说这是金子。每个答案都附带一条可证明的推理链：调了哪些工具、用了什么输入、收到了什么输出。没有黑盒。

ACP 还支持用于来源标注的 **CitationMetadata**：

```json
{
  "kind": "citation",
  "start_index": 0,
  "end_index": 47,
  "url": "https://weather.gov/sf",
  "title": "NWS San Francisco Forecast"
}
```

### ANP（Agent Network Protocol）

**作者：** 开源社区（由 GaoWei Chang 发起）
**仓库：** [github.com/agent-network-protocol/AgentNetworkProtocol](https://github.com/agent-network-protocol/AgentNetworkProtocol)
**问题：** 来自不同组织的 agent 如何在没有中心权威的情况下互相信任？

ANP 是**去中心化身份协议**。它用 W3C 去中心化标识符（DID）和端到端加密来建立信任。A2A 是通过已知端点来发现 agent，而 ANP 让 agent 用密码学方式证明自己的身份。

ANP 有三层：

```mermaid
graph TB
    subgraph Layer3["第 3 层：应用协议"]
        AD[Agent 描述文档]
        DISC[发现端点]
    end
    subgraph Layer2["第 2 层：元协议"]
        NEG[AI 驱动的协议谈判]
        CODE[动态代码生成]
    end
    subgraph Layer1["第 1 层：身份与安全通信"]
        DID["did:wba (W3C DID)"]
        HPKE[HPKE 端到端加密 - RFC 9180]
        SIG[签名验证]
    end

    Layer3 --> Layer2
    Layer2 --> Layer1

    style Layer1 fill:#d1fae5,stroke:#059669
    style Layer2 fill:#dbeafe,stroke:#2563eb
    style Layer3 fill:#f3e8ff,stroke:#7c3aed
```

#### DID 文档（真实结构）

ANP 用一个自定义的 DID 方法，叫 `did:wba`（Web-Based Agent）。DID `did:wba:example.com:user:alice` 解析到 `https://example.com/user/alice/did.json`：

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1"
  ],
  "id": "did:wba:example.com:user:alice",
  "verificationMethod": [
    {
      "id": "did:wba:example.com:user:alice#key-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:wba:example.com:user:alice",
      "publicKeyJwk": {
        "crv": "secp256k1",
        "x": "NtngWpJUr-rlNNbs0u-Aa8e16OwSJu6UiFf0Rdo1oJ4",
        "y": "qN1jKupJlFsPFc1UkWinqljv4YE0mq_Ickwnjgasvmo",
        "kty": "EC"
      }
    },
    {
      "id": "did:wba:example.com:user:alice#key-x25519-1",
      "type": "X25519KeyAgreementKey2019",
      "controller": "did:wba:example.com:user:alice",
      "publicKeyMultibase": "z9hFgmPVfmBZwRvFEyniQDBkz9LmV7gDEqytWyGZLmDXE"
    }
  ],
  "authentication": [
    "did:wba:example.com:user:alice#key-1"
  ],
  "keyAgreement": [
    "did:wba:example.com:user:alice#key-x25519-1"
  ],
  "humanAuthorization": [
    "did:wba:example.com:user:alice#key-1"
  ],
  "service": [
    {
      "id": "did:wba:example.com:user:alice#agent-description",
      "type": "AgentDescription",
      "serviceEndpoint": "https://example.com/agents/alice/ad.json"
    }
  ]
}
```

几个要注意的点：
- 强制**密钥分离**。签名密钥（secp256k1）和加密密钥（X25519）是分开的。
- **`humanAuthorization`** 是 ANP 独有的。这些密钥使用前需要明确的人类批准（生物识别、密码、HSM）。转账之类的高风险操作走这条路径。
- **`keyAgreement`** 密钥用于 HPKE 端到端加密（RFC 9180）。
- **service** 段链接到 Agent Description 文档。

#### ANP 里的信任怎么运作

ANP **不**用信任网（web-of-trust）或背书图。信任是双边的，每次交互单独验证：

```mermaid
sequenceDiagram
    participant A as Agent A
    participant Domain as Agent A 的域名
    participant B as Agent B

    A->>B: HTTP 请求 + DID + 签名
    B->>Domain: 拉取 DID 文档 (HTTPS)
    Domain-->>B: DID 文档 + 公钥
    B->>B: 用公钥验证签名
    B-->>A: 签发访问 token
    A->>B: 后续请求使用 token
    Note over A,B: 信任 = TLS 域名验证<br/>+ DID 签名验证<br/>+ 最小信任原则
```

信任来自三个来源：
1. **域级 TLS** 验证 DID 文档的宿主
2. **DID 密码学签名** 验证 agent 的身份
3. **最小信任原则** 只授予最低限度的权限

没有基于 gossip 的信任传播，也没有 PageRank 打分。你直接通过每个 agent 的 DID 来验证它。

#### 元协议谈判

这是 ANP 最新颖的特性。当来自不同生态的两个 agent 相遇时，它们不需要预先约定的数据格式。它们用自然语言谈判：

```json
{
  "action": "protocolNegotiation",
  "sequenceId": 0,
  "candidateProtocols": "I can communicate using:\n1. JSON-RPC with hotel booking schema\n2. REST with OpenAPI 3.1 spec\n3. Natural language over HTTP",
  "modificationSummary": "Initial proposal",
  "status": "negotiating"
}
```

```mermaid
sequenceDiagram
    participant A as Agent A
    participant B as Agent B

    A->>B: protocolNegotiation（候选协议）
    B->>A: protocolNegotiation（反提案）
    A->>B: protocolNegotiation（已接受）
    Note over A,B: agent 动态生成代码<br/>来处理约定的格式。<br/>最多 10 轮，超时即终止。
```

两个 agent 来回往返（最多 10 轮）直到就格式达成一致，然后动态生成代码来处理它。状态值有：`negotiating`、`rejected`、`accepted`、`timeout`。

这意味着两个素未谋面的 agent 能在没人预先定义共享 schema 的情况下，自己摸索出如何通信。

### 对比（修正版）

| | MCP | A2A | ACP | ANP |
|---|---|---|---|---|
| **作者** | Anthropic | Google / Linux Foundation | IBM / BeeAI | 社区 |
| **规范格式** | JSON-RPC | JSON-RPC / REST / gRPC | OpenAPI 3.1（REST） | JSON-RPC |
| **主要用途** | Agent 对工具 | Agent 对 Agent | Agent 对 Agent | Agent 对 Agent |
| **发现方式** | 工具列表 | `/.well-known/agent-card.json` | `GET /agents`、`/.well-known/agent.yml` | `/.well-known/agent-descriptions`、DID service 端点 |
| **身份** | 隐式（本地） | 安全方案（OAuth、mTLS） | 服务器级 | 带 E2EE 的 W3C DID（`did:wba`） |
| **审计轨迹** | 无 | 基础（任务历史） | TrajectoryMetadata（工具调用、推理） | 未正式规定 |
| **状态机** | 无 | 9 个任务状态 | 7 个 run 状态 | 无 |
| **流式传输** | 无 | SSE | SSE | 与传输无关 |
| **独有特性** | 工具 schema | Agent Card + Skills | 轨迹审计 | 元协议谈判 |
| **最适合** | 工具与数据 | 动态协作 | 受监管行业 | 跨组织信任 |
| **状态** | 稳定 | 稳定（v1.0） | 正并入 A2A | 活跃开发中 |

### 它们如何协同工作

这些协议不是互斥的。一套现实的企业系统会同时用多个：

```mermaid
graph TB
    subgraph org["你的组织"]
        RA[调研 Agent] <-->|A2A| CA[编码 Agent]
        RA -->|MCP| SS[搜索服务器]
        CA -->|MCP| GS[GitHub 服务器]
        AUDIT["所有 agent 响应都携带<br/>ACP TrajectoryMetadata"]
    end

    subgraph ext["外部（通过 ANP 做 DID 验证）"]
        EA[外部 Agent]
        PA[合作伙伴 Agent]
    end

    RA <-->|ANP + A2A| EA
    CA <-->|ANP + A2A| PA

    style org fill:#f8fafc,stroke:#334155
    style ext fill:#fef2f2,stroke:#991b1b
    style AUDIT fill:#fef3c7,stroke:#d97706
```

- **MCP** 把每个 agent 连到它的工具
- **A2A** 处理 agent 之间（内部和外部）的协作
- **ACP** 用轨迹元数据包住响应，实现可审计
- **ANP** 为你掌控不了的 agent 提供身份验证

```figure
swarm-message-bus
```

## 动手构建

### 第 1 步：核心消息类型

每套多 agent 系统都从一个消息格式起步。我们定义一些类型，对应真实协议所用的东西：

```typescript
import crypto from "node:crypto";

type MessageRole = "user" | "agent";

type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "data"; data: unknown; mediaType: string }
  | { kind: "file"; name: string; url: string; mediaType: string };

type TrajectoryEntry = {
  reasoning: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  timestamp: number;
};

type AgentMessage = {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  trajectory?: TrajectoryEntry[];
  replyTo?: string;
  timestamp: number;
};

function createMessage(
  role: MessageRole,
  parts: MessagePart[],
  replyTo?: string
): AgentMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts,
    replyTo,
    timestamp: Date.now(),
  };
}

function textMessage(role: MessageRole, text: string): AgentMessage {
  return createMessage(role, [{ kind: "text", text }]);
}
```

注意：`MessagePart` 是多模态的（文本、结构化数据、文件），和真实的 A2A、ACP 规范一样。`TrajectoryEntry` 捕获推理链，对应 ACP 的 TrajectoryMetadata。

### 第 2 步：A2A Agent Card 与注册表

构建一套符合真实 A2A 规范的 agent 发现：

```typescript
type Skill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  inputModes: string[];
  outputModes: string[];
};

type AgentCard = {
  name: string;
  description: string;
  version: string;
  url: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Skill[];
};

class AgentRegistry {
  private cards: Map<string, AgentCard> = new Map();

  register(card: AgentCard) {
    this.cards.set(card.name, card);
  }

  discoverBySkillTag(tag: string): AgentCard[] {
    return [...this.cards.values()].filter((card) =>
      card.skills.some((skill) => skill.tags.includes(tag))
    );
  }

  discoverByInputMode(mimeType: string): AgentCard[] {
    return [...this.cards.values()].filter(
      (card) =>
        card.defaultInputModes.includes(mimeType) ||
        card.skills.some((skill) => skill.inputModes.includes(mimeType))
    );
  }

  resolve(name: string): AgentCard | undefined {
    return this.cards.get(name);
  }

  listAll(): AgentCard[] {
    return [...this.cards.values()];
  }
}
```

这比一个简单的「名字到能力」映射丰富得多。你可以按技能标签、按输入 MIME 类型、或按名字来发现 agent，跟真实 A2A 规范支持的一样。

### 第 3 步：A2A 任务生命周期

构建完整的任务状态机：

```typescript
type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "auth-required"
  | "completed"
  | "failed"
  | "canceled"
  | "rejected";

const TERMINAL_STATES: TaskState[] = [
  "completed",
  "failed",
  "canceled",
  "rejected",
];

type TaskStatus = {
  state: TaskState;
  message?: AgentMessage;
  timestamp: number;
};

type Artifact = {
  id: string;
  name: string;
  parts: MessagePart[];
};

type Task = {
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts: Artifact[];
  history: AgentMessage[];
};

type TaskEvent =
  | { kind: "statusUpdate"; taskId: string; status: TaskStatus }
  | {
      kind: "artifactUpdate";
      taskId: string;
      artifact: Artifact;
      append: boolean;
      lastChunk: boolean;
    };

type TaskHandler = (
  task: Task,
  message: AgentMessage
) => AsyncGenerator<TaskEvent>;

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private handlers: Map<string, TaskHandler> = new Map();
  private listeners: Map<string, ((event: TaskEvent) => void)[]> = new Map();

  registerHandler(agentName: string, handler: TaskHandler) {
    this.handlers.set(agentName, handler);
  }

  subscribe(taskId: string, listener: (event: TaskEvent) => void) {
    const existing = this.listeners.get(taskId) ?? [];
    existing.push(listener);
    this.listeners.set(taskId, existing);
  }

  async sendMessage(
    agentName: string,
    message: AgentMessage,
    contextId?: string
  ): Promise<Task> {
    const handler = this.handlers.get(agentName);
    if (!handler) {
      const task = this.createTask(contextId);
      task.status = {
        state: "rejected",
        timestamp: Date.now(),
        message: textMessage("agent", `No handler for ${agentName}`),
      };
      return task;
    }

    const task = this.createTask(contextId);
    task.history.push(message);
    task.status = { state: "submitted", timestamp: Date.now() };

    this.processTask(task, handler, message).catch((err) => {
      task.status = {
        state: "failed",
        timestamp: Date.now(),
        message: textMessage("agent", String(err)),
      };
    });
    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || TERMINAL_STATES.includes(task.status.state)) return false;
    task.status = { state: "canceled", timestamp: Date.now() };
    this.emit(taskId, {
      kind: "statusUpdate",
      taskId,
      status: task.status,
    });
    return true;
  }

  private createTask(contextId?: string): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      contextId: contextId ?? crypto.randomUUID(),
      status: { state: "submitted", timestamp: Date.now() },
      artifacts: [],
      history: [],
    };
    this.tasks.set(task.id, task);
    return task;
  }

  private async processTask(
    task: Task,
    handler: TaskHandler,
    message: AgentMessage
  ) {
    task.status = { state: "working", timestamp: Date.now() };
    this.emit(task.id, {
      kind: "statusUpdate",
      taskId: task.id,
      status: task.status,
    });

    try {
      for await (const event of handler(task, message)) {
        if (TERMINAL_STATES.includes(task.status.state)) break;

        if (event.kind === "statusUpdate") {
          task.status = event.status;
        }
        if (event.kind === "artifactUpdate") {
          const existing = task.artifacts.find(
            (a) => a.id === event.artifact.id
          );
          if (existing && event.append) {
            existing.parts.push(...event.artifact.parts);
          } else {
            task.artifacts.push(event.artifact);
          }
        }
        this.emit(task.id, event);
      }
    } catch (err) {
      task.status = {
        state: "failed",
        timestamp: Date.now(),
        message: textMessage("agent", String(err)),
      };
      this.emit(task.id, {
        kind: "statusUpdate",
        taskId: task.id,
        status: task.status,
      });
    }
  }

  private emit(taskId: string, event: TaskEvent) {
    for (const listener of this.listeners.get(taskId) ?? []) {
      listener(event);
    }
  }
}
```

这实现了真实的 A2A 任务生命周期：submitted、working、input-required，再到终态。handler 是异步生成器，yield 出事件（状态更新和产物分片），对应 SSE 流式模型。

### 第 4 步：ACP 风格的审计轨迹

给通信包上轨迹追踪：

```typescript
type AuditEntry = {
  runId: string;
  agentName: string;
  input: AgentMessage[];
  output: AgentMessage[];
  trajectory: TrajectoryEntry[];
  status: "created" | "in-progress" | "completed" | "failed" | "awaiting";
  startedAt: number;
  completedAt?: number;
  sessionId?: string;
};

class AuditableRunner {
  private log: AuditEntry[] = [];
  private handlers: Map<
    string,
    (input: AgentMessage[]) => Promise<{
      output: AgentMessage[];
      trajectory: TrajectoryEntry[];
    }>
  > = new Map();

  registerAgent(
    name: string,
    handler: (input: AgentMessage[]) => Promise<{
      output: AgentMessage[];
      trajectory: TrajectoryEntry[];
    }>
  ) {
    this.handlers.set(name, handler);
  }

  async run(
    agentName: string,
    input: AgentMessage[],
    sessionId?: string
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      runId: crypto.randomUUID(),
      agentName,
      input: structuredClone(input),
      output: [],
      trajectory: [],
      status: "created",
      startedAt: Date.now(),
      sessionId,
    };
    this.log.push(entry);

    const handler = this.handlers.get(agentName);
    if (!handler) {
      entry.status = "failed";
      return entry;
    }

    entry.status = "in-progress";
    try {
      const result = await handler(input);
      entry.output = structuredClone(result.output);
      entry.trajectory = structuredClone(result.trajectory);
      entry.status = "completed";
      entry.completedAt = Date.now();
    } catch (err) {
      entry.status = "failed";
      entry.trajectory.push({
        reasoning: `Error: ${String(err)}`,
        timestamp: Date.now(),
      });
      entry.completedAt = Date.now();
    }
    return entry;
  }

  getFullAuditLog(): AuditEntry[] {
    return structuredClone(this.log);
  }

  getAuditLogForAgent(agentName: string): AuditEntry[] {
    return structuredClone(
      this.log.filter((e) => e.agentName === agentName)
    );
  }

  getAuditLogForSession(sessionId: string): AuditEntry[] {
    return structuredClone(
      this.log.filter((e) => e.sessionId === sessionId)
    );
  }

  getTrajectoryForRun(runId: string): TrajectoryEntry[] {
    const entry = this.log.find((e) => e.runId === runId);
    return entry ? structuredClone(entry.trajectory) : [];
  }
}
```

每次 agent 执行都产出一条完整的审计记录：输入是什么、输出是什么，以及中间工具调用和推理步骤的完整轨迹。你可以按 agent、按会话、或按单次 run 来查询。

### 第 5 步：ANP 风格的身份验证

构建基于 DID 的身份与验证：

```typescript
type VerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyDer: string;
};

type DIDDocument = {
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  keyAgreement: string[];
  humanAuthorization: string[];
  service: { id: string; type: string; serviceEndpoint: string }[];
};

type AgentIdentity = {
  did: string;
  document: DIDDocument;
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
};

class IdentityRegistry {
  private documents: Map<string, DIDDocument> = new Map();

  publish(doc: DIDDocument) {
    this.documents.set(doc.id, doc);
  }

  resolve(did: string): DIDDocument | undefined {
    return this.documents.get(did);
  }

  verify(did: string, signature: string, payload: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;

    const authKeyIds = doc.authentication;
    const authKeys = doc.verificationMethod.filter((vm) =>
      authKeyIds.includes(vm.id)
    );

    for (const key of authKeys) {
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(key.publicKeyDer, "base64"),
        format: "der",
        type: "spki",
      });
      const isValid = crypto.verify(
        null,
        Buffer.from(payload),
        publicKey,
        Buffer.from(signature, "hex")
      );
      if (isValid) return true;
    }
    return false;
  }

  requiresHumanAuth(did: string, operationKeyId: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;
    return doc.humanAuthorization.includes(operationKeyId);
  }
}

function createIdentity(domain: string, agentName: string): AgentIdentity {
  const did = `did:wba:${domain}:agent:${agentName}`;
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  const publicKeyDer = publicKey
    .export({ format: "der", type: "spki" })
    .toString("base64");

  const keyId = `${did}#key-1`;
  const encKeyId = `${did}#key-x25519-1`;

  const document: DIDDocument = {
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyDer,
      },
      {
        id: encKeyId,
        type: "X25519KeyAgreementKey2019",
        controller: did,
        publicKeyDer,
      },
    ],
    authentication: [keyId],
    keyAgreement: [encKeyId],
    humanAuthorization: [],
    service: [
      {
        id: `${did}#agent-description`,
        type: "AgentDescription",
        serviceEndpoint: `https://${domain}/agents/${agentName}/ad.json`,
      },
    ],
  };

  return { did, document, privateKey, publicKey };
}

function signPayload(identity: AgentIdentity, payload: string): string {
  return crypto
    .sign(null, Buffer.from(payload), identity.privateKey)
    .toString("hex");
}
```

这照搬了真实的 ANP 身份模型：agent 有 DID 文档，里面分开存放认证密钥、密钥协商密钥和人类授权密钥。`IdentityRegistry` 模拟 DID 解析（在生产里这会是对 agent 域名的 HTTP 拉取）。

### 第 6 步：协议网关

把这四个协议连成一套统一的系统：

```mermaid
graph LR
    REQ[传入请求] --> ANP_V{ANP：验证 DID}
    ANP_V -->|合法| A2A_D{A2A：发现 Agent}
    ANP_V -->|非法| REJECT[拒绝]
    A2A_D -->|找到| ACP_A[ACP：审计 Run]
    A2A_D -->|未找到| REJECT
    ACP_A --> A2A_T[A2A：创建任务]
    A2A_T --> RESULT[任务 + 审计记录]

    style ANP_V fill:#d1fae5,stroke:#059669
    style A2A_D fill:#dbeafe,stroke:#2563eb
    style ACP_A fill:#fef3c7,stroke:#d97706
    style A2A_T fill:#dbeafe,stroke:#2563eb
```

```typescript
class ProtocolGateway {
  private registry: AgentRegistry;
  private taskManager: TaskManager;
  private auditRunner: AuditableRunner;
  private identityRegistry: IdentityRegistry;

  constructor(
    registry: AgentRegistry,
    taskManager: TaskManager,
    auditRunner: AuditableRunner,
    identityRegistry: IdentityRegistry
  ) {
    this.registry = registry;
    this.taskManager = taskManager;
    this.auditRunner = auditRunner;
    this.identityRegistry = identityRegistry;
  }

  async delegateTask(
    fromDid: string,
    signature: string,
    targetAgent: string,
    message: AgentMessage,
    sessionId?: string
  ): Promise<{ task: Task; audit: AuditEntry } | { error: string }> {
    if (!this.identityRegistry.verify(fromDid, signature, message.id)) {
      return { error: "Identity verification failed" };
    }

    const card = this.registry.resolve(targetAgent);
    if (!card) {
      return { error: `Agent ${targetAgent} not found in registry` };
    }

    const audit = await this.auditRunner.run(
      targetAgent,
      [message],
      sessionId
    );
    const task = await this.taskManager.sendMessage(targetAgent, message);

    return { task, audit };
  }

  discoverAndDelegate(
    fromDid: string,
    signature: string,
    skillTag: string,
    message: AgentMessage
  ): Promise<{ task: Task; audit: AuditEntry } | { error: string }> {
    const candidates = this.registry.discoverBySkillTag(skillTag);
    if (candidates.length === 0) {
      return Promise.resolve({
        error: `No agents found with skill tag: ${skillTag}`,
      });
    }
    return this.delegateTask(
      fromDid,
      signature,
      candidates[0].name,
      message
    );
  }
}
```

网关在一次调用里做四件事：
1. **ANP**：通过 DID 签名验证调用方身份
2. **A2A**：发现目标 agent 并检查其能力
3. **ACP**：把执行包进带轨迹的审计记录里
4. **A2A**：创建一个带完整生命周期追踪的任务

### 第 7 步：全部接起来

```typescript
async function protocolDemo() {
  const registry = new AgentRegistry();
  registry.register({
    name: "researcher",
    description: "Searches and summarizes findings",
    version: "1.0.0",
    url: "https://researcher.local/a2a/v1",
    capabilities: { streaming: true, pushNotifications: false },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain", "application/json"],
    skills: [
      {
        id: "web-research",
        name: "Web Research",
        description: "Searches the web",
        tags: ["research", "search", "summarization"],
        inputModes: ["text/plain"],
        outputModes: ["application/json"],
      },
    ],
  });
  registry.register({
    name: "coder",
    description: "Writes code from specs",
    version: "1.0.0",
    url: "https://coder.local/a2a/v1",
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain"],
    skills: [
      {
        id: "code-gen",
        name: "Code Generation",
        description: "Generates code",
        tags: ["coding", "generation"],
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/plain"],
      },
    ],
  });

  const taskManager = new TaskManager();
  const auditRunner = new AuditableRunner();

  const researchTrajectory: TrajectoryEntry[] = [];

  taskManager.registerHandler(
    "researcher",
    async function* (task, message) {
      yield {
        kind: "statusUpdate" as const,
        taskId: task.id,
        status: { state: "working" as const, timestamp: Date.now() },
      };

      researchTrajectory.push({
        reasoning: "Searching for React 19 documentation",
        toolName: "web_search",
        toolInput: { query: "React 19 compiler features" },
        toolOutput: {
          results: ["react.dev/blog/react-19", "github.com/react/react"],
        },
        timestamp: Date.now(),
      });

      researchTrajectory.push({
        reasoning: "Extracting key findings from search results",
        toolName: "doc_analysis",
        toolInput: { url: "react.dev/blog/react-19" },
        toolOutput: {
          summary:
            "React 19 compiler auto-memoizes, no manual useMemo needed",
        },
        timestamp: Date.now(),
      });

      yield {
        kind: "artifactUpdate" as const,
        taskId: task.id,
        artifact: {
          id: crypto.randomUUID(),
          name: "research-results",
          parts: [
            {
              kind: "data" as const,
              data: {
                findings: [
                  "React 19 compiler auto-memoizes components",
                  "No more manual useMemo/useCallback needed",
                  "Compiler runs at build time, not runtime",
                ],
                sources: ["react.dev/blog/react-19"],
              },
              mediaType: "application/json",
            },
          ],
        },
        append: false,
        lastChunk: true,
      };

      yield {
        kind: "statusUpdate" as const,
        taskId: task.id,
        status: { state: "completed" as const, timestamp: Date.now() },
      };
    }
  );

  auditRunner.registerAgent("researcher", async () => ({
    output: [
      textMessage("agent", "React 19 compiler auto-memoizes components"),
    ],
    trajectory: researchTrajectory,
  }));

  const identityRegistry = new IdentityRegistry();

  const coderIdentity = createIdentity("coder.local", "coder");
  const researcherIdentity = createIdentity("researcher.local", "researcher");

  identityRegistry.publish(coderIdentity.document);
  identityRegistry.publish(researcherIdentity.document);

  const gateway = new ProtocolGateway(
    registry,
    taskManager,
    auditRunner,
    identityRegistry
  );

  console.log("=== Protocol Demo ===\n");

  console.log("1. Agent Discovery (A2A)");
  const researchAgents = registry.discoverBySkillTag("research");
  console.log(
    `   Found ${researchAgents.length} agent(s):`,
    researchAgents.map((a) => a.name)
  );

  console.log("\n2. Identity Verification (ANP)");
  const message = textMessage("user", "Research React 19 compiler features");
  const signature = signPayload(coderIdentity, message.id);
  const verified = identityRegistry.verify(
    coderIdentity.did,
    signature,
    message.id
  );
  console.log(`   Coder DID: ${coderIdentity.did}`);
  console.log(`   Signature verified: ${verified}`);

  console.log("\n3. Task Delegation (A2A + ACP + ANP)");
  const result = await gateway.delegateTask(
    coderIdentity.did,
    signature,
    "researcher",
    message,
    "session-001"
  );

  if ("error" in result) {
    console.log(`   Error: ${result.error}`);
    return;
  }

  console.log(`   Task ID: ${result.task.id}`);
  console.log(`   Task state: ${result.task.status.state}`);
  console.log(`   Artifacts: ${result.task.artifacts.length}`);

  console.log("\n4. Audit Trail (ACP)");
  console.log(`   Run ID: ${result.audit.runId}`);
  console.log(`   Status: ${result.audit.status}`);
  console.log(`   Trajectory steps: ${result.audit.trajectory.length}`);
  for (const step of result.audit.trajectory) {
    console.log(`     - ${step.reasoning}`);
    if (step.toolName) {
      console.log(`       Tool: ${step.toolName}`);
    }
  }

  console.log("\n5. Full Audit Log");
  const fullLog = auditRunner.getFullAuditLog();
  console.log(`   Total runs: ${fullLog.length}`);
  for (const entry of fullLog) {
    const duration = entry.completedAt
      ? `${entry.completedAt - entry.startedAt}ms`
      : "in-progress";
    console.log(`   ${entry.agentName}: ${entry.status} (${duration})`);
  }
}

protocolDemo().catch((err) => {
  console.error("Protocol demo failed:", err);
  process.exitCode = 1;
});
```

## 会出什么岔子

协议解决的是顺风顺水的路径。下面是生产里会崩的地方：

**Schema 漂移。** Agent A 发布的 Agent Card 宣称输出 `application/json`。但 JSON schema 在不同版本之间变了。Agent B 按旧格式解析，拿到一堆垃圾。修法：给你的技能和输出 schema 打版本号。A2A 规范在 Agent Card 上支持 `version` 正是为此。

**违反状态机。** 一个 agent handler 先 yield 了 `completed` 事件，然后还想 yield 更多产物。可任务已经不可变了。你的代码要么默默丢弃这些更新，要么抛异常。修法：yield 之前先检查是否已是终态。上面的 `TaskManager` 用终态后的 `break` 来强制这一点。

**信任解析失败。** Agent A 想验证 Agent B 的 DID，但 Agent B 的域名挂了，DID 文档拉不到。你是失败放行（接受未验证的 agent），还是失败拒绝（一概拒掉）？ANP 推荐按最小信任原则失败拒绝。

**轨迹膨胀。** ACP 轨迹日志很强大，但也很贵。一个复杂 agent 每次 run 调 200 次工具，会产出巨大的审计记录。修法：按可配置的详细级别记录轨迹。为合规记录工具名和输入输出，对非受监管的负载跳过推理步骤。

**发现惊群。** 50 个 agent 在启动时同时查 `GET /agents`。修法：给 Agent Card 加 TTL 缓存、错开发现间隔，或用基于推送的注册代替轮询。

## 实际使用

### 真实的实现

**A2A** 最成熟。Google 的[官方规范](https://github.com/google/A2A)在 Linux Foundation 旗下开源，有 Python 和 TypeScript 的 SDK。如果你的 agent 需要动态发现与协作，从这里开始。

**ACP** 正在并入 A2A。IBM 的 [BeeAI 项目](https://github.com/i-am-bee/acp)把 ACP 做成了一个 REST 优先的替代方案，但它的轨迹元数据概念正被 A2A 生态吸收。即使你用 A2A 当传输层，也可以套用 ACP 的模式（轨迹日志、run 生命周期）。

**ANP** 最实验性。[社区仓库](https://github.com/agent-network-protocol/AgentNetworkProtocol)有一个 Python SDK（AgentConnect）。元协议谈判这个概念是真正新颖的。对于跨组织的 agent 部署值得关注。

**MCP** 在 Phase 13 已经讲过。如果你想让 agent 用工具，MCP 就是标准。

### 选对协议

```mermaid
graph TD
    START{agent 需要<br/>使用工具吗？}
    START -->|是| MCP_R[用 MCP]
    START -->|否| TALK{agent 需要<br/>互相对话吗？}
    TALK -->|否| NONE[你不需要协议]
    TALK -->|是| AUDIT{需要审计轨迹<br/>来满足合规？}
    AUDIT -->|是| ACP_R[A2A + ACP<br/>轨迹模式]
    AUDIT -->|否| ORG{所有 agent<br/>都在你的组织内？}
    ORG -->|是| A2A_R[A2A<br/>Agent Card + 任务]
    ORG -->|否| INFRA{共享<br/>基础设施？}
    INFRA -->|是| BROKER[A2A + 消息代理]
    INFRA -->|否| ANP_R[ANP + A2A<br/>DID 验证]

    style MCP_R fill:#d1fae5,stroke:#059669
    style A2A_R fill:#dbeafe,stroke:#2563eb
    style ACP_R fill:#fef3c7,stroke:#d97706
    style ANP_R fill:#f3e8ff,stroke:#7c3aed
    style BROKER fill:#e0e7ff,stroke:#4338ca
```

## 拿去用

本课产出：
- `code/main.ts` —— 四种协议模式的完整实现
- `outputs/prompt-protocol-selector.md` —— 一个帮你为系统选协议的 prompt

## 练习

1. **多跳任务委派。** 扩展 `TaskManager`，让一个 agent handler 能把子任务委派给其他 agent。researcher 收到一个任务，把「搜索」和「总结」两个子任务委派给两个专精 agent，等两个都完成，再把结果合并进自己的产物里。

2. **流式审计轨迹。** 改造 `AuditableRunner` 以支持流式模式。不要等完整结果，而是在轨迹条目被加入时实时 yield `AuditEntry` 更新。用一个产出审计快照的异步生成器。

3. **DID 轮换。** 给 `IdentityRegistry` 加密钥轮换。一个 agent 应该能发布带新密钥的 DID 文档，同时保留一个 `previousDid` 引用。验证方应该在一个宽限期内同时接受当前密钥和旧密钥的签名。

4. **协议谈判。** 实现 ANP 的元协议概念。两个 agent 交换 `protocolNegotiation` 消息，带上候选格式（比如「我能说 JSON-RPC」对「我更想用 REST」）。最多 3 轮后，它们就格式达成一致或超时。约定的格式决定它们用哪个 `TaskManager` 或 `AuditableRunner`。

5. **限速发现。** 加一个 `RateLimitedRegistry` 包装器，用可配置的 TTL 缓存 Agent Card 查询，并对每个 agent 每秒的发现查询数限速。模拟 100 个 agent 在启动时互相发现的惊群，测一测差异。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|----------------------|
| MCP | 「AI 工具的协议」 | 一个供 agent 发现和使用工具的客户端-服务器协议。是 agent 对工具，不是 agent 对 agent。 |
| A2A | 「Google 的 agent 协议」 | Linux Foundation 旗下的 agent 协作对等协议。通过 Agent Card 发现，9 状态任务生命周期，通过 SSE 流式传输。支持 JSON-RPC、REST、gRPC 绑定。 |
| ACP | 「企业级 agent 消息」 | IBM/BeeAI 的 agent run REST API，带 TrajectoryMetadata：每条响应都携带完整的推理链和工具调用。正并入 A2A。 |
| ANP | 「去中心化 agent 身份」 | 一个社区协议，用 `did:wba`（DID）做密码学身份、用 HPKE 做端到端加密、用 AI 驱动的元协议谈判让素未谋面的 agent 沟通。 |
| Agent Card | 「agent 的名片」 | 位于 `/.well-known/agent-card.json` 的 JSON 文档，描述技能、支持的 MIME 类型、安全方案和协议绑定。 |
| DID | 「去中心化 ID」 | W3C 标准，用于托管在 agent 自己域名上、可密码学验证的身份。ANP 用 `did:wba` 方法。 |
| TrajectoryMetadata | 「审计回执」 | ACP 的机制，把推理步骤、工具调用及其输入输出附到每条 agent 响应上。 |
| Meta-protocol | 「agent 谈判怎么对话」 | ANP 的做法：agent 用自然语言动态约定数据格式，然后生成代码来处理它们。 |
| Task | 「一个工作单元」 | A2A 的有状态对象，追踪工作从提交到完成的全过程。一旦终态就不可变。 |

## 延伸阅读

- [Google A2A specification](https://github.com/google/A2A) —— 官方规范与 SDK（v1.0.0，Linux Foundation）
- [IBM/BeeAI ACP specification](https://github.com/i-am-bee/acp) —— agent run 和轨迹元数据的 OpenAPI 3.1 规范
- [Agent Network Protocol](https://github.com/agent-network-protocol/AgentNetworkProtocol) —— 基于 DID 的身份、E2EE、元协议谈判
- [Model Context Protocol docs](https://modelcontextprotocol.io/) —— Anthropic 的 MCP 规范（Phase 13 已讲）
- [W3C Decentralized Identifiers](https://www.w3.org/TR/did-core/) —— 支撑 ANP 的身份标准
- [RFC 9180 (HPKE)](https://www.rfc-editor.org/rfc/rfc9180) —— ANP 用于 E2EE 的加密方案
- [FIPA Agent Communication Language](http://www.fipa.org/specs/fipa00061/SC00061G.html) —— 现代 agent 协议的学术前身
