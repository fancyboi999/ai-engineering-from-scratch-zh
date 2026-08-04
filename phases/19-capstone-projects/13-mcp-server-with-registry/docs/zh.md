# 顶点项目 13 —— 带注册中心和治理的 MCP 服务器

> Model Context Protocol 不再是未来，在 2026 年成了默认的工具使用规范。Anthropic、OpenAI、Google，以及每个主流 IDE 都出了 MCP 客户端。Pinterest 公开了它内部的 MCP 服务器生态。AAIF Registry 在 `.well-known` 处把能力元数据规范化了。AWS ECS 发布了参考级的无状态部署。Block 的 goose-agent 把同一套协议塞进了一个托管助手里。2026 年的生产形态是：StreamableHTTP 传输、OAuth 2.1 scope、OPA 策略把关，以及一个让平台团队发现、校验、启用服务器的注册中心。把它端到端做出来。

**类型：** Capstone
**语言：** Python（服务器，经由 FastMCP）或 TypeScript（@modelcontextprotocol/sdk），Go（注册中心服务）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具与 MCP）、第 14 阶段（agent）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P11 · P13 · P14 · P17 · P18
**预计时间：** 25 小时

## 问题背景

MCP 成了工具使用的通用语。Claude Code、Cursor 3、Amp、OpenCode、Gemini CLI，以及每个托管 agent 现在都消费 MCP 服务器。生产上的挑战不在编写服务器（FastMCP 让这事很简单），而在带企业要求大规模部署它们：逐租户的 OAuth scope、破坏性工具上的 OPA 策略、StreamableHTTP 无状态扩展、一个用于发现的注册中心、逐工具调用的审计日志。Pinterest 内部的 MCP 生态和 AAIF Registry 规范立下了 2026 年的标准。

你将做一个暴露 10 个内部工具（Postgres 只读、S3 列举、Jira、Linear、Datadog 等）的 MCP 服务器、一个供平台发现的注册中心 UI，以及破坏性工具的人类审批闸门。负载测试演示 StreamableHTTP 的水平扩展。审计轨迹满足一次企业安全评审。

## 核心概念

MCP 2026 修订版强制把 StreamableHTTP 作为默认传输。不像早先的 stdio-加-SSE 形态，StreamableHTTP 默认无状态：单个 HTTP 端点接收 JSON-RPC 请求、流式回响应，并支持给通知用的长连接。无状态意味着能在负载均衡器后面水平扩展。

授权是带逐工具 scope 的 OAuth 2.1。一个 token 携带 `jira:read`、`s3:list`、`postgres:query:readonly` 这类 scope。MCP 服务器在工具调用时检查 scope，而不只是在会话开始时。对高风险工具，服务器拒绝任何 scope 未在最近 N 分钟内被提升到 `approved:by:human` 的调用——那次提升来自一张 Slack 评审卡片。

注册中心是一个独立服务。每个 MCP 服务器在 `.well-known/mcp-capabilities` 处暴露一份文档，带它的工具清单、传输 URL、鉴权要求。注册中心轮询、校验并建索引。平台团队用注册中心 UI 看有哪些工具可用、它们需要什么 scope、哪些团队拥有它们。

## 架构

```
MCP client (Claude Code, Cursor 3, ...)
          |
          v
StreamableHTTP over HTTPS (JSON-RPC + streaming)
          |
          v
MCP server (FastMCP) behind load balancer
          |
   +------+------+---------+----------+------------+
   v             v         v          v            v
Postgres    S3 listing  Jira       Linear     Datadog
(read-only) (paged)     (read)     (read)     (query)
          |
   +------+-------------+
   v                    v
 OPA policy gate   destructive tool MCP (separate server)
                        |
                        v
                   human approval via Slack
                        |
                        v
                   audit log (append-only, per-tenant)

  registry service
     |
     v  GET /.well-known/mcp-capabilities from each server
     v
     UI: search / validate / enable-disable / ownership
```

## 技术栈

- 服务器框架：FastMCP（Python）或 `@modelcontextprotocol/sdk`（TypeScript）
- 传输：StreamableHTTP over HTTPS（无状态）
- 鉴权：OAuth 2.1，工作负载身份经由 SPIFFE / SPIRE
- 策略：逐工具的 OPA / Rego 规则；每请求一个策略决策服务
- 注册中心：自托管，消费 `.well-known/mcp-capabilities` 清单
- 人类审批：破坏性工具用 Slack 交互式消息
- 部署：AWS ECS Fargate 或 Fly.io，每租户一个服务器，或共享并带租户圈定
- 审计：逐租户桶的结构化 JSONL，带逐调用血缘

```figure
cf-mcp-gate
```

## 动手构建

1. **工具面。** 暴露 10 个内部工具：Postgres 只读查询、S3 列对象、Jira 搜索/取、Linear 搜索/取、Datadog 指标查询、PagerDuty 值班查询、GitHub 只读、Notion 搜索、Slack 搜索、Salesforce 读。每个工具有一个带类型的 schema 和一个 scope 标签。

2. **FastMCP 服务器。** 挂上工具。配置 StreamableHTTP 传输。加一个做 OAuth token 内省和 scope 强制的中间件。

3. **OPA 策略。** 逐工具的 Rego 策略：什么 scope 允许调用、应用什么 PII 脱敏、应用什么 payload 大小上限。每个工具调用都调决策服务。

4. **注册中心服务。** 一个独立的 Go 或 TS 服务，从已注册的服务器轮询 `.well-known/mcp-capabilities`、用 JSON Schema 校验，并暴露一个 列举 / 搜索 / 校验 / 启用-停用 的 UI。

5. **能力清单。** 每个服务器暴露 `.well-known/mcp-capabilities`，带：工具列表、鉴权要求、传输 URL、所有者团队、SLO。

6. **破坏性工具分离。** 改变状态的工具（Jira 创建、Linear 创建、Postgres 写）住在第二个 MCP 服务器上，带更严的鉴权流：token 必须带一个在 15 分钟内经 Slack 卡片提升的 `approved:by:human` scope。

7. **审计日志。** 逐租户的仅追加 JSONL：`{timestamp, user, tool, args_redacted, response_redacted, outcome}`。写之前用 Presidio 做 PII 脱敏。

8. **负载测试。** StreamableHTTP 上 100 个并发客户端。通过加第二个副本演示水平扩展；展示负载均衡器在无会话粘性的情况下重新分配。

9. **一致性测试。** 对两个服务器跑官方 MCP 一致性套件。通过所有强制章节。

## 实际使用

```
$ curl -H "Authorization: Bearer eyJhbGc..." \
       -X POST https://mcp.internal.example.com/ \
       -d '{"jsonrpc":"2.0","method":"tools/call",
            "params":{"name":"postgres.readonly","arguments":{"sql":"SELECT 1"}}}'
[registry]   capability validated: postgres.readonly v1.2
[policy]    scope postgres:query:readonly present; allowed
[audit]     logged: user=u42 tool=postgres.readonly outcome=ok
response:    { "result": { "rows": [[1]] } }
```

## 拿去用

`outputs/skill-mcp-server.md` 描述交付物。一个生产级的 MCP 服务器 + 注册中心 + 审计层，给内部工具用，带 OAuth 2.1 scope 和 OPA 把关。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 规范一致性 | StreamableHTTP + 能力清单通过 MCP 一致性测试 |
| 20 | 安全性 | scope 强制、OPA 覆盖每个工具、密钥卫生 |
| 20 | 可观测性 | 带 PII 脱敏的逐工具调用审计日志 |
| 20 | 规模 | 100 客户端负载测试的水平扩展演示 |
| 15 | 注册中心体验 | 发现 / 校验 / 启用-停用 工作流 |
| **100** | | |

## 练习

1. 加一个新工具（Confluence 搜索）。让它过注册中心校验流上线，而不碰核心服务器。

2. 写一个 OPA 策略，脱敏 Postgres 查询结果里名为 `email`、`ssn`、`phone` 的列。用一个探针查询演练。

3. 在本地延迟上给 StreamableHTTP vs stdio 跑基准。报告逐调用 p50/p95。

4. 实现逐租户配额：每租户每工具每分钟最多 N 次调用。用第二条 OPA 规则强制。

5. 跑 [mcp-conformance-tests](https://github.com/modelcontextprotocol/conformance) 里的 MCP 一致性套件，修掉每个失败。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| StreamableHTTP | “2026 MCP 传输” | 无状态 HTTP + 流式；为网络化服务器取代 SSE + stdio |
| Capability manifest（能力清单） | “well-known 文档” | `.well-known/mcp-capabilities`，带工具列表、鉴权、传输 URL |
| OPA / Rego | “策略引擎” | Open Policy Agent，对照外部规则授权工具调用 |
| Scope elevation（scope 提升） | “经人类批准” | 经 Slack 审批授予的短时 scope，破坏性工具必需 |
| Registry（注册中心） | “工具发现” | 从能力清单给 MCP 服务器建索引的服务 |
| Workload identity（工作负载身份） | “SPIFFE / SPIRE” | 给 OAuth token 签发用的加密服务身份 |
| Conformance suite（一致性套件） | “规范测试” | 官方 MCP 测试套，查 StreamableHTTP + 工具清单正确性 |

## 延伸阅读

- [Model Context Protocol 2026 Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) —— StreamableHTTP、能力元数据、注册中心
- [AAIF MCP Registry spec](https://github.com/modelcontextprotocol/registry) —— 2026 注册中心规范
- [AWS ECS reference deployment](https://aws.amazon.com/blogs/containers/deploying-model-context-protocol-mcp-servers-on-amazon-ecs/) —— 参考级生产部署
- [Pinterest internal MCP ecosystem](https://www.infoq.com/news/2026/04/pinterest-mcp-ecosystem/) —— 参考级内部部署
- [Block `goose` MCP usage](https://block.github.io/goose/) —— 参考级 agent 消费模式
- [FastMCP](https://github.com/jlowin/fastmcp) —— Python 服务器框架
- [Open Policy Agent](https://www.openpolicyagent.org/) —— 策略引擎参考
- [SPIFFE / SPIRE](https://spiffe.io) —— 工作负载身份参考
