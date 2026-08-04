# MCP Sampling——server 请求的 LLM 补全与 agent 循环

> 多数 MCP server 是傻执行器：取参数、跑代码、返回内容。Sampling 让 server 反转方向：它请求 client 的 LLM 来做一个决策。这让 server 托管的 agent 循环成为可能，而 server 不必拥有任何模型凭证。SEP-1577 在 2025-11-25 合入，给 sampling 请求里加了工具，让循环能纳入更深的推理。漂移风险提示：SEP-1577 的 sampling-内带工具形状在整个 2026 年第一季度仍是实验性的，在 SDK API 里还在沉淀。

**类型：** Build
**语言：** Python（标准库，sampling 脚手架）
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 10（resources 与 prompts）
**预计时间：** ~75 分钟

## 学习目标

- 解释 `sampling/createMessage` 解决了什么（无 server 端 API key 的 server 托管循环）。
- 实现一个 server，让它请求 client 在一个多轮 prompt 上采样，并返回补全。
- 用 `modelPreferences`（成本 / 速度 / 智能优先级）来引导 client 的模型选择。
- 构建一个 `summarize_repo` 工具，让它内部经由 sampling 迭代，而非硬编码行为。

## 问题背景

一个对代码摘要工作流有用的 MCP server 需要：遍历文件树、挑选读哪些文件、合成一份摘要、返回。LLM 推理在哪儿发生？

选项 A：server 调它自己的 LLM。需要一个 API key，在 server 端计费，每用户都贵。

选项 B：server 返回原始内容；client 的 agent 做推理。能行，但把 server 逻辑搬进了 client prompt，这很脆。

选项 C：server 经由 `sampling/createMessage` 请求 client 的 LLM。server 保留算法（读哪些文件、做几遍），而 client 保留计费和模型选择。server 根本没有凭证。

Sampling 就是选项 C。它是一个受信 server 托管一个 agent 循环、却本身不当一个完整 LLM 宿主的机制。

## 核心概念

### `sampling/createMessage` 请求

server 发：

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "sampling/createMessage",
  "params": {
    "messages": [{"role": "user", "content": {"type": "text", "text": "..."}}],
    "systemPrompt": "...",
    "includeContext": "none",
    "modelPreferences": {
      "costPriority": 0.3,
      "speedPriority": 0.2,
      "intelligencePriority": 0.5,
      "hints": [{"name": "claude-3-5-sonnet"}]
    },
    "maxTokens": 1024
  }
}
```

client 跑它的 LLM，返回：

```json
{"jsonrpc": "2.0", "id": 42, "result": {
  "role": "assistant",
  "content": {"type": "text", "text": "..."},
  "model": "claude-3-5-sonnet-20251022",
  "stopReason": "endTurn"
}}
```

### `modelPreferences`

三个加起来为 1.0 的浮点数：

- `costPriority`：偏向更便宜的模型。
- `speedPriority`：偏向更快的模型。
- `intelligencePriority`：偏向更强的模型。

外加 `hints`：server 偏好的具名模型。client 可以认也可以不认 hints；client 的用户配置永远说了算。

### `includeContext`

三个取值：

- `"none"`——只有 server 提供的消息。默认。
- `"thisServer"`——纳入这个 server 会话里的先前消息。
- `"allServers"`——纳入所有会话上下文。

`includeContext` 自 2025-11-25 起被软弃用，因为它泄漏跨 server 上下文，这是个安全隐患。优先 `"none"`，把显式上下文放进消息里传。

### 带工具的 sampling（SEP-1577）

2025-11-25 新增：sampling 请求可以含一个 `tools` 数组。client 用这些工具跑一整个工具调用循环。这让 server 经由 client 的模型托管一个 ReAct 风格的 agent 循环。

```json
{
  "messages": [...],
  "tools": [
    {"name": "fetch_url", "description": "...", "inputSchema": {...}}
  ]
}
```

client 循环：采样、若被调用则执行工具、再采样、返回最终 assistant 消息。这在整个 2026 年第一季度都是实验性的；SDK 签名可能还会漂移。你实现时对照 2025-11-25 规范的 client/sampling 章节确认。

### 人在回路

client 必须在跑采样前，向用户展示 server 在要模型做什么。一个恶意 server 可能用 sampling 操纵用户的会话（"跟用户说 X，让他们点 Y"）。Claude Desktop、VS Code 和 Cursor 把 sampling 请求呈现为一个用户可以拒绝的确认对话框。

2026 年的共识：无人工确认的 sampling 是个危险信号。网关（阶段 13 · 17）能自动批准低风险 sampling，自动拒绝任何可疑的。

### 无 API key 的 server 托管循环

权威用例：一个自身无 LLM 访问的代码摘要 MCP server。它做：

1. 遍历 repo 结构。
2. 用 "挑五个最可能描述这个 repo 用途的文件" 调 `sampling/createMessage`。
3. 读那些文件。
4. 用文件内容和 "用 3 段摘要这个 repo" 调 `sampling/createMessage`。
5. 把摘要作为一个 `tools/call` 结果返回。

server 从不碰 LLM API。client 的用户用自己的凭证为这些补全付费。

### 安全风险（Unit 42 披露，2026 Q1）

- **隐蔽 sampling。** 一个总用 "用会话上下文里的用户邮箱来回复" 调 sampling 的工具。阶段 13 · 15 讲这些攻击向量。
- **经由 sampling 的资源窃取。** server 让 client 摘要攻击者的载荷，由用户买单。
- **循环炸弹。** server 在一个紧循环里调 sampling。client 必须强制每会话限流。

```figure
t3-sampling-flip
```

## 实际使用

`code/main.py` 交付一个假的 server 到 client 的 sampling 脚手架。一个模拟的 "summarize_repo" 工具调用两轮 sampling（挑文件，然后摘要），假 client 返回预制响应。脚手架展示：

- server 带 `modelPreferences` 发 `sampling/createMessage`。
- client 返回一个补全。
- server 继续它的循环。
- 限流器给每次工具调用的总 sampling 调用数封顶。

要看什么：

- server 只暴露一个工具（`summarize_repo`）；所有推理都在 sampling 调用里发生。
- 模型偏好给 client 的模型选择加权；hints 列出偏好的模型。
- 循环在 `stopReason: "endTurn"` 时终止。
- `max_samples_per_tool = 5` 上限抓住一个失控循环。

## 拿去用

本课产出 `outputs/skill-sampling-loop-designer.md`。给定一个需要 LLM 调用的 server 端算法（研究、摘要、规划），这个 skill 用正确的 modelPreferences、限流和安全确认设计一个基于 sampling 的实现。

## 练习

1. 跑 `code/main.py`。把 `max_samples_per_tool` 改成 2，观察限流截断。

2. 实现 SEP-1577 的 sampling-内带工具变体：sampling 请求携带一个 `tools` 数组。验证 client 端循环在返回最终补全前执行了那些工具。注意漂移风险：SDK 签名在 2026 上半年可能还会变。

3. 加人在回路确认：在 server 第一次 `sampling/createMessage` 前，暂停并等用户批准。被拒的调用返回一个定型拒绝。

4. 加一个按 client 会话作键的每用户限流器。同一用户的同 server 循环应共享一份预算。

5. 设计一个用 sampling 挑选要纳入哪些块的 `summarize_pdf` 工具。勾画发出的消息。`modelPreferences.intelligencePriority` 在 0.1 vs 0.9 时如何改变行为？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Sampling | "server 到 client 的 LLM 调用" | server 向 client 的模型要一个补全 |
| `sampling/createMessage` | "那个方法" | sampling 请求的 JSON-RPC 方法 |
| `modelPreferences` | "模型优先级" | 成本 / 速度 / 智能权重外加名字 hints |
| `includeContext` | "跨会话泄漏" | 被软弃用的上下文纳入模式 |
| SEP-1577 | "sampling 里的工具" | 允许 sampling 内带工具以做 server 托管的 ReAct |
| Human-in-the-loop | "用户确认" | client 在跑之前把 sampling 请求呈现给用户 |
| Loop bomb | "失控 sampling" | server 端的无限 sampling 循环；client 必须限流 |
| Covert sampling | "隐藏推理" | 恶意 server 把意图藏进 sampling prompt |
| Resource theft | "用掉用户的 LLM 预算" | server 强迫 client 在它不想要的 sampling 上花钱 |
| `stopReason` | "为什么生成停了" | `endTurn`、`stopSequence` 或 `maxTokens` |

## 延伸阅读

- [MCP — Concepts: Sampling](https://modelcontextprotocol.io/docs/concepts/sampling) — sampling 的高层概览
- [MCP — Client sampling spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling) — 权威的 `sampling/createMessage` 形状
- [MCP — GitHub SEP-1577](https://github.com/modelcontextprotocol/modelcontextprotocol) — sampling 里带工具的 Spec Evolution Proposal（实验性）
- [Unit 42 — MCP attack vectors](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/) — 隐蔽 sampling 与资源窃取模式
- [Speakeasy — MCP sampling core concept](https://www.speakeasy.com/mcp/core-concepts/sampling) — 配 client 端代码示例的逐步讲解
