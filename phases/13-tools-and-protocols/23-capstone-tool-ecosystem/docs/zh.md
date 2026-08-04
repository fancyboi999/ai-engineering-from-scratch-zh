# 综合项目——构建一套完整的工具生态

> 阶段 13 把每个零件都教了。这个综合项目把它们串成一个生产形状的系统：一个带 tools + resources + prompts + tasks + UI 的 MCP server、边缘处的 OAuth 2.1、一个 RBAC 网关、一个多 server client、一次 A2A 子 agent 调用、进入 collector 的 OTel 追踪、CI 里的工具投毒检测，以及一个 AGENTS.md + SKILL.md 包。到最后，你能为每一个架构选择做辩护。

**类型：** Build
**语言：** Python（标准库，端到端生态脚手架）
**前置要求：** 阶段 13 · 01 到 21
**预计时间：** ~120 分钟

## 学习目标

- 组合一个暴露 tools、resources、prompts，以及一个带 `ui://` app 的 task 的 MCP server。
- 用一个强制 RBAC 和钉定哈希的 OAuth 2.1 网关罩住这个 server。
- 写一个端到端用 OTel GenAI 属性追踪的多 server client。
- 把一部分工作负载委派给一个 A2A 子 agent；验证不透明性得以保持。
- 用 AGENTS.md + SKILL.md 把整个栈打包，让其他 agent 能驱动它。

## 问题背景

交付那个"研究并出报告"的系统：

- 用户问："总结 2026 年 arXiv 上关于 agent 协议、引用最多的三篇论文。"
- 系统：经由 MCP 搜 arXiv；经由 A2A 把论文摘要委派给一个专门的写手 agent；聚合结果；把一份交互式报告渲染成一个 MCP Apps `ui://` 资源；把每一步记到 OTel。

阶段 13 的所有基元都登场了。这不是玩具——2026 年 Anthropic（Claude Research 产品）、OpenAI（带 Apps SDK 的 GPT）和第三方交付的生产级研究助手系统，正是这个形状。

## 核心概念

### 架构

```
[user] -> [client] -> [gateway (OAuth 2.1 + RBAC)] -> [research MCP server]
                                                      |
                                                      +- MCP 工具: arxiv_search (纯)
                                                      +- MCP 资源: notes://recent
                                                      +- MCP prompt: /research_topic
                                                      +- MCP 任务: generate_report (长)
                                                      +- MCP Apps UI: ui://report/current
                                                      +- A2A 调用: writer-agent (tasks/send)
                                                      |
                                                      +- OTel GenAI span
```

### trace 层级

```
agent.invoke_agent
 ├── llm.chat (起手)
 ├── mcp.call -> tools/call arxiv_search
 ├── mcp.call -> resources/read notes://recent
 ├── mcp.call -> prompts/get research_topic
 ├── a2a.tasks/send -> writer-agent
 │    └── task 转移 (内部不透明)
 ├── mcp.call -> tools/call generate_report (task 增强)
 │    └── tasks/status 轮询
 │    └── tasks/result (completed, 返回 ui:// 资源)
 └── llm.chat (最终合成)
```

一个 trace id。每个 span 都有正确的 `gen_ai.*` 属性。

### 安全态势

- OAuth 2.1 + PKCE，配把受众钉到网关的 resource indicator。
- 网关持有上游凭证；用户从不见它们。
- RBAC：`alice` 有 `research:read`、`research:write`，能调所有工具。`bob` 有 `research:read`，不能调 `generate_report`。
- 钉定描述清单：丢掉任何工具哈希变了的 server。
- Rule of Two 审计：没有工具同时组合不可信输入、敏感数据和有后果的动作。

### 渲染

最终的 `generate_report` 任务返回内容 block 加一个 `ui://report/current` 资源。client 的宿主（Claude Desktop 等）把交互式仪表盘渲染在一个沙箱 iframe 里。仪表盘含一个排序的论文列表、引用计数，以及一个按钮，对用户点的任意论文调 `host.callTool('summarize_paper', {arxiv_id})`。

### 打包

整个东西作为以下交付：

```
research-system/
  AGENTS.md                     # 项目约定
  skills/
    run-research/
      SKILL.md                  # 顶层工作流
  servers/
    research-mcp/               # MCP server
      pyproject.toml
      src/
  agents/
    writer/                     # A2A agent
  gateway/
    config.yaml                 # RBAC + 钉定清单
```

用户用 `docker compose up` 部署。Claude Code、Cursor、Codex 和 opencode 的用户可以靠触发 `run-research` skill 来驱动这个系统。

### 阶段 13 每一课贡献了什么

| 课 | 综合项目用上的 |
|--------|------------------------|
| 01-05 | 工具接口、provider 可移植性、并行调用、schema、lint |
| 06-10 | MCP 基元、server、client、传输、resources + prompts |
| 11-14 | sampling、roots + elicitation、异步 tasks、`ui://` apps |
| 15-17 | 工具投毒、OAuth 2.1、网关 + 注册表 |
| 18 | A2A 子 agent 委派 |
| 19 | OTel GenAI 追踪 |
| 20 | LLM 层的路由网关 |
| 21 | SKILL.md + AGENTS.md 打包 |

```figure
t3-capstone-chain
```

## 实际使用

`code/main.py` 把前几课的模式缝成一个可运行的 demo。全标准库、全进程内，让你能端到端地读它。它跑研究并出报告场景的完整流程：和网关握手、OAuth 2.1 模拟、tools/list 合并、generate_report 作为一个 task、对 writer 的 A2A 调用、返回 ui:// 资源、发出 OTel span。

要看什么：

- 贯穿每一跳的一个 trace id。
- 网关策略拦住第二个用户写入。
- task 生命周期走 working → completed，并同时返回 text 和 ui:// 内容。
- A2A 调用的内部状态对编排器不透明。
- AGENTS.md 和 SKILL.md 是另一个 agent 重现这个工作流唯一需要的文件。

## 拿去用

本课产出 `outputs/skill-ecosystem-blueprint.md`。给定一个产品需求（研究、摘要、自动化），这个 skill 产出完整架构：用哪些 MCP 基元、哪些网关控制、哪些 A2A 调用、哪些遥测、哪种打包。

## 练习

1. 跑 `code/main.py`。注意那个单一 trace id 以及 span 如何嵌套。数一数 demo 触及了阶段 13 的多少个基元。

2. 扩展 demo：加第二个后端 MCP server（比如 `bibliography`），确认网关把它的工具合并进同一个命名空间。

3. 把假的 A2A 写手 agent 换成一个跑在子进程上的真实的。用第 19 课的脚手架。

4. 在编排器和 LLM 之间，给路由网关加一个 PII 脱敏步骤。确认用户查询里的邮箱被清洗掉。

5. 为一个将要维护这个系统的队友写一个 AGENTS.md。它应该不到五分钟就能读完，并给他们驱动这个综合项目（在 Cursor 或 Codex 里）所需的一切。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Capstone | "阶段 13 集成 demo" | 用上每个基元的端到端系统 |
| Research and report | "那个场景" | 搜索、摘要、渲染模式 |
| Ecosystem | "所有零件放一起" | server + client + 网关 + 子 agent + 遥测 + 包 |
| Trace hierarchy | "单一 trace id" | 每跳的 span 共享 trace；父子经由 span id |
| Gateway-issued token | "传递性鉴权" | client 只见网关的 token；网关持有上游凭证 |
| Merged namespace | "所有工具在一个扁平列表里" | 网关处的多 server 合并，冲突时加前缀 |
| Opacity boundary | "A2A 调用隐藏内部" | 子 agent 的推理对编排器不可见 |
| Three-layer stack | "AGENTS.md + SKILL.md + MCP" | 项目上下文 + 工作流 + 工具 |
| Defense-in-depth | "多个安全层" | 钉定哈希、OAuth、RBAC、Rule of Two、审计日志 |
| Spec compliance matrix | "我们交付的对应规范所要求的" | 把交付物映射到 2025-11-25 要求的清单 |

## 延伸阅读

- [MCP — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — 整合参考
- [MCP blog — 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) — 协议的走向
- [a2a-protocol.org](https://a2a-protocol.org/latest/) — A2A v1.0 参考
- [OpenTelemetry — GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — 权威追踪约定
- [Anthropic — Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) — 生产 agent 运行时模式
