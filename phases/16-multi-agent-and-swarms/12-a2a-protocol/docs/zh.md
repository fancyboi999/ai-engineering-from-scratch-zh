# A2A —— Agent 对 Agent 协议

> Google 在 2025 年 4 月公布了 A2A；到 2026 年 4 月规范位于 https://a2a-protocol.org/latest/specification/，有 150+ 个组织支持它。A2A 是 MCP（第 13 课）的横向补充：MCP 是纵向的（agent ↔ 工具），A2A 是对等的（agent ↔ agent）。它定义了 Agent Card（发现）、带产物（文本、结构化数据、视频）的任务、不透明的任务生命周期、以及认证。生产系统越来越多地把 MCP 和 A2A 配对使用。Google Cloud 在 2025-2026 年间把 A2A 支持卷进了 Vertex AI Agent Builder。

**类型：** Learn + Build
**语言：** Python（标准库，`http.server`、`json`）
**前置要求：** Phase 16 · 04（原语模型）
**预计时间：** ~75 分钟

## 问题背景

你的 agent 需要调另一套系统上的另一个 agent。怎么调？你可以暴露一个 HTTP 端点、定义一份定制 JSON schema，然后祈祷对面能说它。每一对 agent 都变成一次定制集成。

A2A 就是那次调用的通用线协议。标准发现、标准任务模型、标准传输、标准产物。就像 HTTP+REST，但把 agent 当一等公民。

## 核心概念

### 四个要素

**Agent Card。** 位于 `/.well-known/agent.json` 的 JSON 文档，描述这个 agent：名字、技能、端点、支持的模态、认证要求。发现就是去读这张 card。

```
GET https://agent.example.com/.well-known/agent.json
→ {
    "name": "code-review-agent",
    "skills": ["review-python", "review-typescript"],
    "endpoints": {
      "tasks": "https://agent.example.com/tasks"
    },
    "auth": {"type": "bearer"},
    "modalities": ["text", "structured"]
  }
```

**Task。** 工作单元。一个异步、有状态的对象，带生命周期：`submitted → working → completed / failed / canceled`。客户端发送一个任务，轮询或订阅来获取更新。

**Artifact（产物）。** 任务产出的结果类型。文本、结构化 JSON、图像、视频、音频。产物是类型化的，所以不同模态都是一等公民。

**不透明生命周期。** A2A 不规定远端 agent *如何*解决任务。客户端看到的是状态转移和产物；实现可以自由使用任何框架。

### MCP/A2A 的分工

- **MCP**（第 13 课）：agent ↔ 工具。agent 通过 JSON-RPC 对工具服务器读/写。默认无状态。
- **A2A**：agent ↔ agent。对等协议；双方都是有自己推理的 agent。

生产多 agent 系统两个都用。一个 A2A 对等端在自己这边调 MCP 工具。这种分工让两个关注点保持干净。

### 发现流程

```
Client                     Agent server
  ├──GET /.well-known/agent.json──>
  <──Agent Card JSON─────────────
  ├──POST /tasks {skill, input}──>
  <──201 task_id, state=submitted
  ├──GET /tasks/{id}──────────────>
  <──state=working, 42% done──────
  ├──GET /tasks/{id}──────────────>
  <──state=completed, artifacts──
```

或者用流式：订阅 `/tasks/{id}/events` 的 SSE 来推送更新。

### 认证

A2A 支持三种常见模式：

- **Bearer token** —— OAuth2 或不透明 token。
- **mTLS** —— 双向 TLS；组织间互相证明身份。
- **签名请求** —— 对载荷做 HMAC。

认证在 Agent Card 里声明；客户端发现并遵从。

### 到 2026 年 4 月的 150+ 个组织

企业采用推动了 A2A 的规模。重点：A2A 成了企业 agent 系统跨越信任边界的方式。Google Cloud 发布了 Vertex AI Agent Builder 的 A2A 支持；Microsoft Agent Framework 支持它；大多数主流框架（LangGraph、CrewAI、AutoGen）都附带 A2A 适配器。

### A2A 在哪赢

- **跨组织调用。** 公司 A 的 agent 调公司 B 的 agent。没有 A2A，每一对都是定制契约。
- **异质框架。** LangGraph agent 调 CrewAI agent 调自定义 Python agent。A2A 把它们归一化。
- **类型化产物。** 视频结果、结构化 JSON、音频——全是一等公民。
- **长时间运行任务。** 不透明生命周期 + 轮询让数小时的任务变得直白。

### A2A 在哪吃力

- **延迟敏感的微调用。** A2A 的生命周期是异步的。亚毫秒级的 agent 对 agent 不适合；用直接 RPC。
- **紧耦合的进程内 agent。** 如果两个 agent 跑在同一个 Python 进程里，A2A 的 HTTP 往返是杀鸡用牛刀。
- **小团队。** 规范开销是真实的；纯内部的 agent 可能不需要这份正式。

### A2A 对 ACP、ANP、NLIP

2024-2026 年间冒出了几个相关规范：

- **ACP**（IBM/Linux Foundation）—— A2A 的前身，范围更窄。
- **ANP**（Agent Network Protocol）—— 重对等发现、去中心化优先。
- **NLIP**（Ecma 自然语言交互协议，2025 年 12 月标准化）—— 自然语言内容类型。

截至 2026 年 4 月，A2A 是采用最广的对等协议。对比见 arXiv:2505.02279（Liu 等人，《A Survey of Agent Interoperability Protocols》）。

```figure
sw-agent-card-discovery
```

## 动手构建

`code/main.py` 用 `http.server` 和 JSON 实现一个 A2A 最小服务器和客户端。服务器：

- 暴露 `/.well-known/agent.json`，
- 接受 `POST /tasks`，
- 管理任务状态，
- 在 `GET /tasks/{id}` 上返回产物。

客户端：

- 拉取 Agent Card，
- 提交一个任务，
- 轮询直到完成，
- 读取产物。

运行：

```
python3 code/main.py
```

脚本在后台线程里启动服务器，然后对它跑客户端。你能看到完整流程：发现、提交、轮询、产物。

## 实际使用

`outputs/skill-a2a-integrator.md` 设计一次 A2A 集成：Agent Card 内容、任务 schema、认证选择、流式 vs 轮询。

## 拿去用

检查清单：

- **钉死规范版本。** A2A 仍在演进；Agent Card 应该声明协议版本。
- **幂等的任务创建。** 重复提交（网络重试）应该只产出一个任务。
- **产物 schema。** 声明 agent 返回什么形状；消费方应该校验。
- **限流 + 认证。** A2A 是面向公网的；套用标准 web 安全。
- **失败任务的死信。** 长期观察模式，找出反复出现的失败类型。

## 练习

1. 跑 `code/main.py`。确认客户端发现了服务器并收到正确的产物。
2. 给服务器加第二个技能（比如「summarize」）。更新 Agent Card。写一个根据任务类型挑技能的客户端。
3. 实现一个 SSE 流式端点：`/tasks/{id}/events`，发出状态变化。客户端需要做哪些不同的事？
4. 读 A2A 规范（https://a2a-protocol.org/latest/specification/）。指出规范强制要求、而这个演示没实现的三件事。
5. 对比 A2A（Agent Card 发现）和 MCP（通过 `listTools` 的服务器端能力列举）。自描述的 agent 和能力探测之间的取舍是什么？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| A2A | 「agent 对 agent」 | 让 agent 跨系统调其他 agent 的对等协议。Google 2025。 |
| Agent Card | 「agent 的名片」 | 位于 `/.well-known/agent.json` 的 JSON，描述技能、端点、认证。 |
| Task | 「工作单元」 | 带生命周期的异步有状态对象；完成时产出产物。 |
| Artifact | 「结果」 | 类型化输出：文本、结构化 JSON、图像、视频、音频。一等媒体。 |
| Opaque lifecycle | 「怎么解决是 agent 自己的事」 | 客户端看到状态转移；服务器可自由选框架/工具。 |
| Discovery | 「找到那个 agent」 | `GET /.well-known/agent.json` 返回 card。 |
| MCP vs A2A | 「工具 vs 对等端」 | MCP：纵向 agent ↔ 工具。A2A：横向 agent ↔ agent。 |
| ACP / ANP / NLIP | 「兄弟协议」 | 相邻规范；A2A 是 2026 年采用最广的。 |

## 延伸阅读

- [A2A specification](https://a2a-protocol.org/latest/specification/) —— 标准规范
- [Google Developers Blog — A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) —— 2025 年 4 月发布博文
- [A2A GitHub repo](https://github.com/a2aproject/A2A) —— 参考实现与 SDK
- [Liu et al. — A Survey of Agent Interoperability Protocols](https://arxiv.org/html/2505.02279v1) —— MCP、ACP、A2A、ANP 对比
