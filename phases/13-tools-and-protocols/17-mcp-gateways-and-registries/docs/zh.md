# MCP 网关与注册表——企业控制面

> 企业不能放任每个开发者随便装 MCP server。一个网关把鉴权、RBAC、审计、限流、缓存和工具投毒检测集中起来，再把合并后的工具表面作为单个 MCP 端点暴露。官方 MCP Registry（Anthropic + GitHub + PulseMCP + Microsoft，命名空间已验证）是权威的上游。本课点名网关的位置、走一遍极简实现，并综览 2026 年的厂商格局。

**类型：** Learn
**语言：** Python（标准库，极简网关）
**前置要求：** 阶段 13 · 15（工具投毒）、阶段 13 · 16（OAuth 2.1）
**预计时间：** ~45 分钟

## 学习目标

- 解释一个 MCP 网关坐在哪里（在 MCP client 和多个后端 MCP server 之间）。
- 实现网关的五项职责：鉴权、RBAC、审计、限流、策略。
- 在网关层强制一份钉定工具哈希的清单。
- 把官方 MCP Registry 和元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）区分开。

## 问题背景

一家世界 500 强有 30 个批准的 MCP server、5000 名开发者、合规与审计要求，还有一个想要集中策略的安全团队。放任每个开发者在自己 IDE 里装任意 server，根本行不通。

网关模式：

1. 网关作为一个单 Streamable HTTP 端点跑，开发者连它。
2. 网关持有每个后端 MCP server 的凭证。
3. 每个开发者请求都经由网关自己的 OAuth 认证并限定范围。
4. 网关把调用路由到后端 server，并应用策略。
5. 所有调用都记日志供审计。

Cloudflare MCP Portals、Kong AI Gateway、IBM ContextForge、MintMCP、TrueFoundry、Envoy AI Gateway——都在 2025-2026 年发布了网关或网关特性。

与此同时，官方 MCP Registry 作为权威上游上线：经过策展、命名空间已验证、反向 DNS 命名的 server，网关可以从中拉取。元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）跨多个来源聚合 server。

## 核心概念

### 网关五项职责

1. **鉴权。** OAuth 2.1 识别开发者；映射到用户角色。
2. **RBAC。** 每用户策略：哪些 server、哪些工具、哪些 scope。
3. **审计。** 每个调用记录谁、做了什么、何时、结果如何。
4. **限流。** 每用户 / 每工具 / 每 server 的上限，防滥用。
5. **策略。** 拒绝投毒描述、强制 Rule of Two、脱敏 PII。

### 网关作为单端点

对开发者来说，网关看起来像一个 MCP server。内部它路由到 N 个后端。会话 id（阶段 13 · 09）在边界处被重写。

### 凭证保险库

开发者从不见后端 token。网关持有它们（或代理给一个持有它们的身份提供方）。一个在网关上有 `notes:read` 的开发者，可以用网关自己的后端凭证传递性地访问 notes MCP server——但只在绑定那次传递访问的策略之下。

### 网关处的工具哈希钉定

网关持有一份批准过的工具描述清单（SHA256 哈希）。发现时，它拉取每个后端的 `tools/list`，把哈希和清单对比，移除任何描述变异过的工具。这是阶段 13 · 15 的 rug-pull 防御，集中应用。

### 策略即代码

高级网关用 OPA/Rego、Kyverno 或 Styra 表达策略。像 "用户 `alice` 只能在 `acme` 组织里的 repo 上调 `github.open_pr`" 这样的规则被声明式地编码。简单网关用手写 Python。两种形状都合法。

### 会话感知路由

当一个用户的会话含混合的 server 时，网关做多路复用：开发者的单个 MCP 会话持有 N 个后端会话，每个 server 一个。来自任意后端的 notification 经由网关路由到开发者的会话。

### 命名空间合并

网关合并所有后端的工具命名空间，通常用冲突时加前缀。`github.open_pr`、`notes.search`。这让路由无歧义。

### 注册表

- **官方 MCP Registry（`registry.modelcontextprotocol.io`）。** 在 Anthropic、GitHub、PulseMCP、Microsoft 托管下上线。命名空间已验证（反向 DNS：`io.github.user/server`）。经基础质量预筛。
- **Glama。** 以搜索为中心的元注册表，聚合多个来源。
- **MCPMarket。** 偏商业的目录，带厂商列表。
- **MCP.so。** 社区目录；开放提交。
- **Smithery。** 包管理器风格的安装流程。
- **LobeHub。** 集成在他们 LobeChat app 里的 UI 注册表。

企业网关默认从官方 Registry 拉取，允许管理员策展的来自元注册表的添加，并拒绝任何未钉定的东西。

### 反向 DNS 命名

官方 Registry 为公开 server 强制反向 DNS 名：`io.github.alice/notes`。命名空间防止抢注，并让信任委派更清晰。

### 厂商综览，2026 年 4 月

| 厂商 | 强项 |
|--------|----------|
| Cloudflare MCP Portals | 边缘托管；集成 OAuth；有免费档 |
| Kong AI Gateway | K8s 原生；细粒度策略；记录到 OpenTelemetry |
| IBM ContextForge | 企业 IAM；合规；审计导出 |
| TrueFoundry | 偏 DevOps；度量优先 |
| MintMCP | 面向开发者平台 |
| Envoy AI Gateway | 开源；可定制过滤器 |

阶段 17（生产基础设施）更深入网关运维。

```figure
t3-gateway-funnel
```

## 实际使用

`code/main.py` 用约 150 行交付一个极简网关：用一个假 Bearer token 认证用户、持有每用户 RBAC 策略、把请求路由到两个后端 MCP server、把每个调用写进审计日志、强制一个限流，并拒绝任何描述哈希对不上钉定清单的后端工具。

要看什么：

- 按 `user_id` 作键、带允许的 `server_tool` 条目的 `RBAC` dict。
- `AUDIT_LOG` 是一个只追加的事件列表。
- 限流用每用户一个 token bucket。
- 钉定清单是一个 `server::tool -> hash` 的 dict。

## 拿去用

本课产出 `outputs/skill-gateway-bootstrap.md`。给定一个企业 MCP 计划（用户、后端、合规），这个 skill 产出一份网关配置规格。

## 练习

1. 跑 `code/main.py`。以一个被允许的用户做一个调用；再以一个被禁止的用户做；再来一个超限流的突发。验证三条流程。

2. 加一个策略，在结果返回给 client 前对 PII 脱敏。用一个简单的正则扫 SSN 形状的字符串；记下缺口（邮箱、电话号码）。

3. 扩展审计日志以发出 OpenTelemetry GenAI span。阶段 13 · 20 讲确切的属性。

4. 为一个有五个后端（notes、github、postgres、jira、slack）的 50 人开发团队设计一个 RBAC 策略。谁在每个上拿只读？谁拿写？

5. 从头到尾读 Cloudflare 的企业 MCP 博文。找出一个 Cloudflare 交付、而这个标准库网关没有的特性。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Gateway | "MCP 代理" | 在 client 和后端之间做集中的 server |
| Credential vaulting | "后端 token 留在 server 端" | 开发者从不见上游 token |
| Session-aware routing | "多后端会话" | 网关每开发者会话多路复用 N 个后端会话 |
| Tool-hash pinning | "批准清单" | 每个批准工具描述的 SHA256；集中拦截 rug-pull |
| RBAC | "每用户策略" | 针对工具和 server 的基于角色的访问控制 |
| Policy-as-code | "声明式规则" | 在网关强制的 OPA/Rego、Kyverno、Styra 策略 |
| Audit log | "谁、做了什么、何时" | 供合规用的只追加事件日志 |
| Rate limit | "每用户 token bucket" | 防滥用的每分钟上限 |
| Official MCP Registry | "权威上游" | `registry.modelcontextprotocol.io`，命名空间已验证 |
| Reverse-DNS naming | "注册表命名空间" | `io.github.user/server` 约定 |

## 延伸阅读

- [Official MCP Registry](https://registry.modelcontextprotocol.io/) — 权威上游，命名空间已验证
- [Cloudflare — Enterprise MCP](https://blog.cloudflare.com/enterprise-mcp/) — 带 OAuth 和策略的网关模式
- [agentic-community — MCP gateway registry](https://github.com/agentic-community/mcp-gateway-registry) — 开源参考网关
- [TrueFoundry — What is an MCP gateway?](https://www.truefoundry.com/blog/what-is-mcp-gateway) — 特性对比文章
- [IBM — MCP context forge](https://github.com/IBM/mcp-context-forge) — 来自 IBM 的企业网关
