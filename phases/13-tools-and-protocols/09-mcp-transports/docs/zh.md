# MCP 传输——stdio vs Streamable HTTP vs SSE 迁移

> stdio 在本地好使，别处都不行。Streamable HTTP（2025-03-26）是远程标准。旧的 HTTP+SSE 传输已弃用，正在 2026 年中被移除。选错传输要付出一次迁移的代价；选对了，你就买到一个可远程托管、带会话连续性和 DNS-rebinding 防护的 MCP server。

**类型：** Learn
**语言：** Python（标准库，Streamable HTTP 端点骨架）
**前置要求：** 阶段 13 · 07、08（MCP server 与 client）
**预计时间：** ~45 分钟

## 学习目标

- 基于部署形状（本地 vs 远程、单进程 vs 集群）在 stdio 和 Streamable HTTP 之间做选择。
- 实现 Streamable HTTP 的单端点模式：POST 发请求，GET 开会话流。
- 强制 `Origin` 校验和会话 id 语义，挫败 DNS-rebinding。
- 在 2026 年中的移除截止期前，把一个遗留的 HTTP+SSE server 迁移到 Streamable HTTP。

## 问题背景

第一个 MCP 远程传输（2024-11）是 HTTP+SSE：两个端点，一个收 client 的 POST，一个 Server-Sent-Events 通道走 server 到 client 的流。它能行。它也笨拙：每会话两个端点、某些 CDN 前面缓存出问题，以及对长连 SSE 连接的硬依赖——而有些 WAF 会激进地把这种连接掐断。

2025-03-26 规范用 Streamable HTTP 取代了它：一个端点，POST 发 client 请求，GET 建立会话流，两者共享一个 `Mcp-Session-Id` 头。自那以后构建或迁移的每个 server 都用 Streamable HTTP。旧的 SSE 模式正在被弃用——Atlassian Rovo 于 2026 年 6 月 30 日移除它；Keboola 于 2026 年 4 月 1 日；余下多数企业 server 到 2026 年底。

而 stdio 对本地 server 仍重要。Claude Desktop、VS Code，以及每个 IDE 形状的 client 都经 stdio 启动 server。正确的心智模型：stdio 用于"这台机器"，Streamable HTTP 用于"跨网络"。没有交叉。

## 核心概念

### stdio

- 子进程传输。client 启动 server，经 stdin/stdout 通信。
- 每行一个 JSON 对象。换行分隔。
- 没有会话 id；进程身份就是会话。
- 不需要鉴权（子进程继承父进程的信任边界）。
- 绝不用于远程 server——你得用 SSH 或 socat 隧道，到那一步还不如用 Streamable HTTP。

### Streamable HTTP

单端点 `/mcp`（或任意路径）。支持三种 HTTP 方法：

- **POST /mcp。** client 发一条 JSON-RPC 消息。server 用单个 JSON 响应回复，或回一股 SSE 流装一条或多条响应（对批量响应以及和那个请求相关的 notification 有用）。
- **GET /mcp。** client 开一个长连 SSE 通道。server 用它发 server 到 client 的请求（sampling、notification、elicitation）。
- **DELETE /mcp。** client 显式终止会话。

会话由 `Mcp-Session-Id` 头标识：server 在第一个响应上设它，client 在随后每个请求上回带它。会话 id 必须是密码学随机的（128+ 比特）；为安全计，client 自选的 id 会被拒绝。

### 单端点 vs 两端点

旧规范的两端点模式在 2026 年仍可调——规范宣称它"遗留兼容"。但所有新 server 都应该是单端点。官方 SDK 发单端点；只在跟一个未迁移的远程对话时才用遗留模式。

### `Origin` 校验与 DNS-rebinding

浏览器（今天）不是 MCP client，但攻击者能炮制一个网页，诱使浏览器 POST 到 `localhost:1234/mcp`——用户本地 MCP server 监听的地方。如果 server 不检查 `Origin`，浏览器的同源策略救不了它，因为 `Origin: http://evil.com` 是合法的跨源。

2025-11-25 规范要求 server 拒绝 `Origin` 不在白名单上的请求。白名单通常含 MCP client 宿主（`https://claude.ai`、`vscode-webview://*`）和本地 UI 的 localhost 变体。

### 会话 id 生命周期

1. client 发第一个请求，不带 `Mcp-Session-Id`。
2. server 分配一个随机 id，在响应头上设 `Mcp-Session-Id`。
3. client 在所有随后请求上、以及在开流的 `GET /mcp` 上回带那个头。
4. 会话可被 server 撤销；client 在随后请求上见到 404，必须重新初始化。
5. client 可以显式 DELETE 会话以干净关闭。

### Keepalive 与重连

SSE 连接会掉。client 靠用同一个 `Mcp-Session-Id` 重新 GET 来重建。server 必须把中断期间漏掉的事件排队（到一个合理窗口内），并经由 client 回带的 `last-event-id` 头重放。

阶段 13 · 13 讲 Tasks，它让长跑工作连一次整会话重连都能挺过去。

### 向后兼容探测

一个想同时支持新旧 server 的 client：

1. POST 到 `/mcp`。
2. 如果响应是带 JSON 或 SSE 的 `200 OK`，这是 Streamable HTTP。
3. 如果响应是带 `Content-Type: text/event-stream` 且有一个指向次级端点的 `Location` 头的 `200 OK`，这是遗留 HTTP+SSE；跟随 `Location`。

### Cloudflare、ngrok 与托管

2026 年生产远程 MCP server 跑在 Cloudflare Workers（配它们的 MCP Agents SDK）、Vercel Functions，或容器化的 Node/Python 上。关键：你的托管必须支持长连 HTTP 连接来撑那个 SSE GET。Vercel 免费档封顶 10 秒，不合适。Cloudflare Workers 支持无限期流。

### 网关组合

当你用一个网关（阶段 13 · 17）罩住多个 MCP server 时，网关是一个单 Streamable HTTP 端点，它重写会话 id 并多路复用到上游。工具在网关层合并；client 看到的是单个逻辑 server。

### 传输失败模式

- **stdio SIGPIPE。** 子进程写到一半死了会触发 SIGPIPE；server 应干净退出。client 应检测 EOF 并把会话标记为死的。
- **HTTP 502 / 504。** Cloudflare、nginx 和其他代理在上游失败时发这些。Streamable HTTP client 应在短退避后重试一次。
- **SSE 连接掉。** TCP RST、代理超时，或 client 网络切换关闭了流。client 用 `Mcp-Session-Id` 和可选的 `last-event-id` 重连来续上。
- **会话撤销。** server 作废一个会话 id；client 下个请求见到 404。client 必须重新握手。
- **时钟偏移。** client 上的 resource-TTL 计算和 server 分歧。client 应把 server 时间戳当权威。

### 何时绕过 Streamable HTTP

有些企业在自己的网络内把 MCP server 部署在 gRPC 或消息队列传输之后。这是非标的——MCP 规范没正式定义这些。网关可以对 MCP client 暴露一个 Streamable HTTP 表面，内部用 gRPC。外部表面保持规范合规；网关拥有那道翻译。

```figure
tp-transport-handshake
```

## 实际使用

`code/main.py` 用 `http.server`（标准库）实现一个极简 Streamable HTTP 端点。它在 `/mcp` 上处理 POST、GET、DELETE，在第一个响应上设 `Mcp-Session-Id`，校验 `Origin`，并拒绝非白名单源的请求。处理器复用第 07 课 notes server 的分发逻辑。

要看什么：

- POST 处理器读 JSON-RPC body，分发，写一个 JSON 响应（单响应变体；SSE 变体结构上类似）。
- `Origin` 检查拒绝默认的 `http://evil.example` 探测，但接受 `http://localhost`。
- 会话 id 是随机 128 比特十六进制字符串；server 把每会话状态留在内存里。

## 拿去用

本课产出 `outputs/skill-mcp-transport-migrator.md`。给定一个 HTTP+SSE（遗留）MCP server，这个 skill 产出一份迁移到 Streamable HTTP 的计划，带会话 id 连续性、Origin 检查和向后兼容探测支持。

## 练习

1. 跑 `code/main.py`。用 `curl` POST 一个 `initialize`，观察 `Mcp-Session-Id` 响应头。POST 第二个请求回带那个头，验证会话连续性。

2. 加一个 GET 处理器开 SSE 流。每五秒发一个 `notifications/progress` 事件。用同一个会话 id 重新 GET 来重连，确认 server 接受它。

3. 实现 `last-event-id` 重放逻辑。重连时，重放那个 id 之后产生的任意事件。

4. 扩展 `Origin` 校验以支持通配符模式（`https://*.example.com`），确认它接受 `https://app.example.com` 但拒绝 `https://evil.example.com.attacker.net`。

5. 从官方注册表里拿一个遗留 HTTP+SSE server（有好几个），勾画迁移：端点处理、会话 id 生成和头语义里有什么变化。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| stdio transport | "本地子进程" | stdin/stdout 上的 JSON-RPC，换行分隔 |
| Streamable HTTP | "远程传输" | 单端点 POST + GET + 可选 SSE，2025-03-26 规范 |
| HTTP+SSE | "遗留" | 正在 2026 年中被移除的两端点模型 |
| `Mcp-Session-Id` | "会话头" | server 分配的随机 id，随后每个请求都回带 |
| `Origin` allowlist | "DNS-rebinding 防御" | 拒绝 Origin 未获批的请求 |
| Single endpoint | "一个 URL" | `/mcp` 为所有会话操作处理 POST / GET / DELETE |
| `last-event-id` | "SSE 重放" | 用于续上掉线流而不漏事件的头 |
| Backwards-compat probe | "新旧检测" | client 靠响应形状检查自动选传输 |
| Long-lived HTTP | "SSE 流式" | server 在一条 TCP 连接上推几分钟或几小时事件 |
| Session revocation | "强制重新 init" | server 作废一个会话 id；client 必须再次握手 |

## 延伸阅读

- [MCP — Basic transports spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) — stdio 和 Streamable HTTP 的权威参考
- [MCP — Basic transports spec 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — 引入 Streamable HTTP 的修订版
- [Cloudflare — MCP transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/) — Workers 托管的 Streamable HTTP 模式
- [AWS — MCP transport mechanisms](https://builder.aws.com/content/35A0IphCeLvYzly9Sw40G1dVNzc/mcp-transport-mechanisms-stdio-vs-streamable-http) — 跨部署形状的比较
- [Atlassian — HTTP+SSE deprecation notice](https://community.atlassian.com/forums/Atlassian-Remote-MCP-Server/HTTP-SSE-Deprecation-Notice/ba-p/3205484) — 具体的迁移截止期示例
