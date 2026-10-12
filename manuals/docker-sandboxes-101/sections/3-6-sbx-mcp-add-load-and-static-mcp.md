# sbx mcp add、sbx mcp load 与 --static-mcp

> MCP 服务器在宿主注册，经一个网关端点服务沙箱；服务器集合可在创建时固定，也可运行中加载并发出 `tools/list_changed` 通知。

你想让 agent 通过 MCP 服务器读文档，却不想把该服务器 token 放进 VM。`sbx mcp` 把注册、OAuth token 和本地服务器进程留在宿主，只给沙箱一个 URL。

读完本节，你能注册服务器、选择静态或动态模式，并将服务器加载到运行中的沙箱。

## 在宿主注册 {#s-sbx-mcp-add-load-and-static-mcp-register-on-the-host}

**sbx mcp add：** “Register an MCP server by name. The server is validated and its specification is stored for use with sbx create/run --static-mcp.” {{help-sbx sbx mcp add}} 按名称注册，验证服务器并存储 spec，供 sbx create/run --static-mcp 使用。

`--url` 接受四种形式：远程端点、社区 registry URL、`server.json` 或 `server.yaml` manifest URL，以及 `dhi.io/` 镜像引用。其他镜像引用被拒绝；`--local` 用 `docker run` 在宿主运行 registry OCI 服务器 {{help-sbx sbx mcp add}}。录制注册并列出一个远程服务器：

```listing
title: 已注册服务器及其网关
source: capture/out/11-mcp-ls.json
lang: json
---
{
  "gateway": {
    "name": "LOCAL",
    "local": true,
    "operator": "managed by you",
    "decision": "local",
    "signed_in_as": "<docker-user>"
  },
  "servers": [
    {
      "name": "m101-deepwiki",
      "transport": "remote http",
      "status": "ready",
      "type": "remote"
    }
  ]
}
```

帮助自带的 registry 示例在 2026-10-08 无法解析：添加 `https://registry.modelcontextprotocol.io/v0/servers/fetch-mcp/versions/latest` 报 `registry returned status 404`（capture/out/11-mcp-add-registry.txt）。另一输入是 `--command`，运行在宿主：“The process runs with your host user's full permissions” {{help-sbx sbx mcp add}}，拥有宿主用户的完整权限。本地服务器启动容器时使用宿主 Docker，不受 [microVM](#s-sbx-diagnose-and-the-microvm-boundary) 引擎边界限制 {{docs-sbx Local stdio server}}。

OAuth 元数据通过 RFC 9728 和 RFC 8414 发现，也可用 `--oauth-authorization-server` 手动提供。`--client-id` 指定预注册客户端，动态注册遵循 RFC 7591。`--scope` 按文档优先级记录默认 scopes，`--resource` 设置 RFC 8707 indicator，`--callback-port` 固定监听端口 {{help-sbx sbx mcp add}}。token 留在宿主，由 `sbx mcp auth [server|--all]`、`auth status` 和 `auth rm` 管理 {{help-sbx sbx mcp auth}}。

deepwiki 无需 OAuth：`sbx mcp inspect` 报 `requires_oauth: false`，`auth status --all --json` 输出 `[]`，所以未录制 OAuth 流程。机密客户端密钥及 `--header 'Name: ${placeholder}'` 值来自密钥存储，键为 `mcp:<server>:client_secret` 和 `mcp:<server>:<placeholder>`。托管网关拒绝带 header 的注册 {{help-sbx sbx mcp add}}。

## 每沙箱一个网关 {#s-sbx-mcp-add-load-and-static-mcp-one-gateway-per-sandbox}

**MCP 网关：** 宿主端点，“brokers access to registered MCP servers” {{docs-sbx MCP gateway}}，代理访问已注册 MCP 服务器。`m101-mcp` 内环境有 `MCP_GATEWAY_URL=http://mcp-gateway.docker.internal/mcp` 和 `MCP_SENTINEL_TOKEN_NAME=proxy-managed`（capture/out/11-static-inside.txt）。文档列出启动时读取该 URL 的 Claude Code、Codex、Devin、Gemini、Kiro 和 OpenCode {{docs-sbx Prerequisites}}，没有 Docker Agent。普通 `shell` 沙箱仍可用 curl 访问网关（capture/fixtures/mcp-probe.sh）：

```listing
title: m101-mcp 内网关的 initialize 响应
source: capture/out/11-gateway-initialize.http
lang: http
note: 三个 headers 与 instructions 文本已截去。
---
HTTP/1.1 200 OK
…
Content-Type: text/event-stream
…
Mcp-Session-Id: <session>
…
event: message
id: <event-id>
data: {"jsonrpc":"2.0","id":1,"result":{"capabilities":{"logging":{},"prompts":{"listChanged":true},"resources":{"listChanged":true},"tools":{"listChanged":true}},"instructions":"### m101-deepwiki…"protocolVersion":"2025-11-25","serverInfo":{"name":"mcp-gateway-m101-mcp","version":"0.1.0"}}}
```

网关自称 `mcp-gateway-m101-mcp`，每沙箱一个；响应协议版本 `2025-11-25`，声明 `tools.listChanged: true`。`sbx mcp ls` 增加 `GATEWAY` 列 `LOCAL, managed by you`，JSON 有 `signed_in_as` {{help-sbx sbx mcp ls}}。默认 `false` 的 `mcp.forceLocalGateway` 及 `SBX_MCP_URL=none` 可在账户本会使用托管网关时选择本地数据平面 {{docs-sbx mcp.forceLocalGateway}}。

文档区分 Desktop 产品：“You don't need the Docker Desktop MCP Toolkit to use `sbx mcp`” {{docs-sbx MCP gateway}}，使用 sbx mcp 不需要 Desktop MCP Toolkit。Kevin Wittek 在 2026-09-04 说宿主注册的服务器不受网络策略限制 {{talk 2026-09-04 T02}}，agent 在 VM 内启动的服务器则受限制。[DMR、Compose models 与 MCP 网关服务](#s-dmr-compose-models-and-the-mcp-gateway-service) 介绍 Toolkit 网关。

## 静态与动态 {#s-sbx-mcp-add-load-and-static-mcp-static-and-dynamic}

**静态模式：** `create` 或 `run` 的 `--static-mcp a,b` 在创建时固定集合 {{help-sbx sbx create}}。静态沙箱暴露三个 deepwiki 工具及 `code-mode`、`mcp-exec`，没有发现工具。动态沙箱起初只有发现工具；`sbx mcp load m101-deepwiki --sandbox m101-mcp-dyn` 加入这三个工具：

| 沙箱与时点 | `tools/list` 名称 | 录制 |
|---|---|---|
| `m101-mcp`，静态 | `ask_wiki_question code-mode mcp-exec read_wiki_contents read_wiki_structure` | capture/out/11-gateway-probe-static.txt |
| `m101-mcp-dyn`，加载前 | `code-mode mcp-add mcp-config-set mcp-exec mcp-find` | capture/out/11-gateway-probe-dynamic-before.txt |
| `m101-mcp-dyn`，加载后 | `ask_wiki_question code-mode mcp-add mcp-config-set mcp-exec mcp-find read_wiki_contents read_wiki_structure` | capture/out/11-gateway-probe-dynamic-after.txt |

```listing
title: 向运行中的沙箱加载已注册服务器
source: capture/out/11-load.txt
lang: text
---
$ sbx mcp load m101-deepwiki --sandbox m101-mcp-dyn
MCP server "m101-deepwiki" loaded into sandbox "m101-mcp-dyn" (live)
```

帮助承诺通知：“Connected agents see the new server's tools immediately via the standard MCP tools/list_changed notification” {{help-sbx sbx mcp load}}，连接中的 agent 会经标准通知立即看到新工具。探针每次新建会话，因此录制了两个列表，未录制通知本身。内置工具归网关：`mcp-exec`、`code-mode`、`mcp-find`、`mcp-add`、`mcp-config-set`，以及 OAuth 服务器的 `<server>-authorize` {{docs-sbx Built-in gateway tools}}。Cedar MCP 策略将它们作为 `MCP::Primordial` 资源，服务器工具为 `MCP::Tool` 资源 {{docs-sbx Built-in gateway tools}}，见[组织策略](#s-org-policies-profiles-and-the-audit-log)。

`sbx mcp catalog` 在 v0.45.0 移除 {{rel-sbx v0.45.0}}，产品页的 `sbx mcp enable` 从未存在（[冲突 C11](#s-ref-sources-and-the-conflicts-register)）。[图](#fig-3-7) 展示存储、两个网关与加载。协议本身见 [MCP 课程](phases/13-tools-and-protocols/06-mcp-fundamentals)。

```figure
id: fig-3-7
kind: flow
title: 一次注册、两个网关、两份工具列表
claim: 宿主存储只保存一次 m101-deepwiki；各沙箱在一个 URL 获得独立网关；静态集合固定，load 实时改变动态集合。
caption: 从左侧存储读向右侧两个沙箱。墨色实线表示注册到达网关，靛蓝点线是 tools/list_changed 通知，橄榄虚线是 VM 外的远程服务器。来源为 capture/out/11-mcp-inspect.json、11-static-inside.txt、11-gateway-probe-static.txt、11-gateway-probe-dynamic-before.txt、11-load.txt 和 11-gateway-probe-dynamic-after.txt。
```

```takeaways
- 用 `sbx mcp add` 注册；固定集合选 `--static-mcp`，实时变更用 `sbx mcp load`。
- `--command` 服务器是拥有你权限的宿主进程，不是沙箱进程。
- 用 `sbx mcp inspect NAME --json` 查 `requires_oauth`，客户端密钥存为 `mcp:NAME:client_secret`。
- agent 不在集成清单中时，读取沙箱内 `MCP_GATEWAY_URL`。
```

Sources: help-sbx sbx mcp, sbx mcp add, sbx mcp auth, sbx mcp inspect, sbx mcp load, sbx mcp ls, sbx create (research/sources/help-sbx.md); docs-sbx MCP gateway, Architecture, Security model, Settings (research/sources/docs-sandboxes.md); rel-sbx v0.45.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C11, C91; talk T02 (2026-09-04), T23 (2026-09-29) from research/plan.md; capture/fixtures/mcp-probe.sh; capture/out/11-mcp-add.txt, 11-mcp-add-registry.txt, 11-mcp-ls.json, 11-mcp-inspect.json, 11-mcp-auth-status.json, 11-static-create.txt, 11-static-inside.txt, 11-gateway-initialize.http, 11-gateway-probe-static.txt, 11-dynamic-create.txt, 11-gateway-probe-dynamic-before.txt, 11-load.txt, 11-gateway-probe-dynamic-after.txt, 11-mcp-rm.txt
