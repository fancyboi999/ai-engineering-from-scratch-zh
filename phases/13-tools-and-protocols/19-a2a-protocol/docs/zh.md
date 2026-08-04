# A2A——Agent-to-Agent 协议

> MCP 是 agent 对工具。A2A（Agent2Agent）是 agent 对 agent——一个让构建于不同框架之上的不透明 agent 协作的开放协议。Google 在 2025 年 4 月发布，2025 年 6 月捐给 Linux Foundation，2026 年 4 月达到 v1.0，拥有 150+ 个支持方，包括 AWS、Cisco、Microsoft、Salesforce、SAP 和 ServiceNow。它吸收了 IBM 的 ACP，并加上了 AP2 支付扩展。本课走一遍 Agent Card、Task 生命周期，以及两种传输绑定。

**类型：** Build
**语言：** Python（标准库，Agent Card + Task 脚手架）
**前置要求：** 阶段 13 · 06（MCP 基础）、阶段 13 · 08（MCP client）
**预计时间：** ~75 分钟

## 学习目标

- 区分 agent 对工具（MCP）和 agent 对 agent（A2A）的用例。
- 在 `/.well-known/agent.json` 发布一张带 skill 和端点元数据的 Agent Card。
- 走一遍 Task 生命周期（submitted → working → input-required → completed / failed / canceled / rejected）。
- 用带 Part（text、file、data）的 Message，以及作为输出的 Artifact。

## 问题背景

一个客服 agent 需要把写报告委派给一个专门的写手 agent。A2A 之前的选项：

- 自定义 REST API。能行，但每一对配对都是一次性的。
- 共享代码库。要求两个 agent 跑同一个框架。
- MCP。不契合：MCP 是用来调工具的，不是让两个 agent 在各自保持不透明内部推理的同时协作的。

A2A 填上这道缺口。它把交互建模为一个 agent 给另一个发一个 Task，配一套生命周期、消息和 artifact。被调用 agent 的内部状态保持不透明——调用方只看到 task 状态转移和最终输出。

A2A 是那个"让跨框架的 agent 互相对话"的协议。它不取代 MCP；两者互补。

## 核心概念

### Agent Card

每个 A2A 合规的 agent 在 `/.well-known/agent.json` 发布一张 card：

```json
{
  "schemaVersion": "1.0",
  "name": "research-agent",
  "description": "Summarizes academic papers and drafts citations.",
  "url": "https://research.example.com/a2a",
  "version": "1.2.0",
  "skills": [
    {
      "id": "summarize_paper",
      "name": "Summarize a paper",
      "description": "Read a paper PDF and produce a 3-paragraph summary.",
      "inputModes": ["text", "file"],
      "outputModes": ["text", "artifact"]
    }
  ],
  "capabilities": {"streaming": true, "pushNotifications": true}
}
```

发现是基于 URL 的：取这张 card，得知 A2A 端点的 URL，枚举各 skill。

### 签名的 Agent Card（AP2）

AP2 扩展（2025 年 9 月）给 Agent Card 加上密码学签名。发布方用一个 JWT 给自己的 card 签名；消费方校验。防止冒充。

### Task 生命周期

```
submitted -> working -> completed | failed | canceled | rejected
             -> input_required -> working (经由 message 循环)
```

client 用 `tasks/send` 发起。被调用 agent 穿过各状态；client 经由 SSE 订阅状态更新，或轮询。

### Message 与 Part

一条 message 携带一个或多个 Part：

- `text`——纯内容。
- `file`——带 mimeType 的 base64 blob。
- `data`——定型 JSON 载荷（给被调用 agent 的结构化输入）。

例子：

```json
{
  "role": "user",
  "parts": [
    {"type": "text", "text": "Summarize this paper."},
    {"type": "file", "file": {"name": "paper.pdf", "mimeType": "application/pdf", "bytes": "..."}},
    {"type": "data", "data": {"targetLength": "3 paragraphs"}}
  ]
}
```

### Artifact

输出是 Artifact，不是裸字符串。一个 Artifact 是一个具名、定型的输出：

```json
{
  "name": "summary",
  "parts": [{"type": "text", "text": "..."}],
  "mimeType": "text/markdown"
}
```

Artifact 可以分块流式传。调用方累积。

### 两种传输绑定

1. **JSON-RPC over HTTP。** `/a2a` 端点，POST 发请求，可选 SSE 做流式。默认绑定。
2. **gRPC。** 用于 gRPC 原生的企业环境。

两种绑定携带相同的逻辑消息形状。

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
| 授权 | OAuth 2.1（阶段 13 · 16） | JWT 签名的 Agent Card（AP2） |
| 传输 | Stdio / Streamable HTTP | JSON-RPC over HTTP / gRPC |

想调用一个特定工具时用 MCP。想把一整个 task 委派给另一个 agent 时用 A2A。许多生产系统两者都用：一个 agent 把 MCP 用于它的工具层，把 A2A 用于它的协作层。

```figure
a2a-task-lifecycle
```

## 实际使用

`code/main.py` 实现一个极简 A2A 脚手架：一个研究 agent 发布它的 card，一个写手 agent 收到一个带 part（含一个 PDF 和一条文本指令）的 `tasks/send`，穿过 working → input_required → working → completed，并返回一个文本 artifact。全标准库；用一个内存传输来聚焦于消息形状。

要看什么：

- Agent Card 的 JSON 形状。
- Task id 分配和状态转移。
- 带混合类型 part 的 message。
- task 中途的 input-required 分支。
- 完成时返回的 artifact。

## 拿去用

本课产出 `outputs/skill-a2a-agent-spec.md`。给定一个应当能被其他 agent 调用的新 agent，这个 skill 产出 Agent Card JSON、skill schema 和端点蓝图。

## 练习

1. 跑 `code/main.py`。追踪完整的 Task 生命周期，包括被调用 agent 索要澄清的 input-required 暂停。

2. 加一张签名的 Agent Card。在 card 的规范化 JSON 上用 HMAC 签。写一个校验器，确认它在被改动的 card 上失败。

3. 实现 task 流式：写手 agent 经由 SSE 发出三个增量 artifact 分块，调用方把它们累积起来。

4. 设计一个包住一个 MCP server 的 A2A agent。把每个 MCP 工具映射到一个 A2A skill。记下权衡——丢失了什么不透明性？

5. 读 A2A v1.0 公告，找出截至 2026 年 4 月还没被任何框架实现的那个特性。（提示：它跟多跳 task 委派有关。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| A2A | "Agent-to-Agent 协议" | 用于不透明 agent 协作的开放协议 |
| Agent Card | "`.well-known/agent.json`" | 描述一个 agent 的 skill 和端点的已发布元数据 |
| Skill | "一个可调用单位" | agent 支持的具名操作（类比 MCP tool） |
| Task | "委派单位" | 带生命周期和最终 artifact 的工作项 |
| Message | "task 输入" | 携带 Part（text、file、data） |
| Part | "定型块" | 一条 message 的 `text` / `file` / `data` 元素 |
| Artifact | "task 输出" | 完成时返回的具名、定型输出 |
| AP2 | "Agent Payments Protocol" | 用于信任和支付的签名 Agent Card 扩展 |
| Opacity | "黑盒协作" | 被调用 agent 的内部对调用方隐藏 |
| Input-required | "task 暂停" | agent 需要更多信息时的生命周期状态 |

## 延伸阅读

- [a2a-protocol.org](https://a2a-protocol.org/latest/) — 权威 A2A 规范
- [a2aproject/A2A — GitHub](https://github.com/a2aproject/A2A) — 参考实现与 SDK
- [Linux Foundation — A2A launch press release](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents) — 2025 年 6 月治理移交
- [Google Cloud — A2A protocol upgrade](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade) — 路线图与合作伙伴势头
- [Google Dev — A2A 1.0 milestone](https://discuss.google.dev/t/the-a2a-1-0-milestone-ensuring-and-testing-backward-compatibility/352258) — v1.0 发布说明与向后兼容指引
