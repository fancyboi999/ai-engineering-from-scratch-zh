---
id: mcp
title: 模型上下文协议（MCP）
subtitle: 通过 stdio 和 Streamable HTTP 构建、调用并提供无状态 MCP 2026-07-28 服务。
hue: 160
sources: phases/13-tools-and-protocols/06-mcp-fundamentals, phases/13-tools-and-protocols/07-building-an-mcp-server, phases/13-tools-and-protocols/08-building-an-mcp-client, phases/13-tools-and-protocols/09-mcp-transports, phases/13-tools-and-protocols/12-mcp-roots-and-elicitation, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control
code: MC
source_hash: e528b68b9e4293fc
---

## 任务
type: task-table
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/code/main.py

| 任务 | 代码 |
|---|---|
| 通过 stdio 提供服务 | `python3 main.py` |
| 运行 stdio 演示 | `python3 main.py --demo` |
| 提供 Streamable HTTP 服务 | `python3 main.py --serve` |
| 探测 HTTP 服务 | `python3 main.py --probe` |
| 发现服务 | `make_request(1, "server/discover")` |
| 列出工具 | `make_request(2, "tools/list")` |
| 调用工具 | `make_request(5, "tools/call", {"name": "<tool>", "arguments": <args>})` |
| 添加旧版对端 | `client.add_server("<name>", <transport>, allow_legacy=True)` |

## 定义并运行工具
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py

```python
TOOLS = [{
    "name": "notes_search",                    # 模型看到的名称
    "description": "Search note titles and bodies by keyword.",
    "inputSchema": {"type": "object",          # 参数的 JSON Schema
        "properties": {"query": {"type": "string"}},
        "required": ["query"]},
    "annotations": {"readOnlyHint": True},     # 仅作为提示
}]
def handle_tools_call(params):
    executor = TOOL_EXECUTORS.get(params.get("name"))
    if executor is None:                       # 未知工具
        return complete({"content": [...], "isError": True})
    content = executor(params.get("arguments", {}))
    return complete({"content": content, "isError": False})
```

## 通过 HTTP 执行一次 tools/call
type: annotated-code
lang: text
from: phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md

```text
POST /mcp                                  # 每个 POST 一条消息
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28           # 与 _meta 版本一致
Mcp-Method: tools/call                     # 与 JSON-RPC 方法一致
Mcp-Name: notes_search                     # 与 params.name 一致
{"jsonrpc": "2.0", "id": 7, "method": "tools/call",
 "params": {"name": "notes_search", "arguments": {"query": "MCP"},
  "_meta": {
   "io.modelcontextprotocol/protocolVersion": "2026-07-28",
   "io.modelcontextprotocol/clientCapabilities": {}}}}
```

## 架构
type: architecture
from: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md

```arch
node | host | 1,1 | Agent 宿主 | 合并工具目录
node | client | 2,1 | MultiServerClient | 每个服务一个 Peer
node | stdio | 3,1 | stdio | 每次一行 JSON
node | server | 4,1 | MCP 服务 | 分发、HANDLERS
node | authz | 2,2 | 授权服务 | 颁发 token
node | http | 3,2 | Streamable HTTP | POST /mcp
node | prims | 4,2 | 原语 | tools, resources, prompts
edge | host | client | 路由
edge | client | stdio | 子进程
edge | client | authz | token
edge | client | http | POST
edge | stdio | server | stdin
edge | http | server | /mcp
edge | server | prims | 处理器
```

## 发现、列举、调用
type: flow
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md

1. **客户端**：发送 `server/discover`，在 `params._meta` 中携带版本与能力。
2. **服务端**：返回 `supportedVersions` 和 `capabilities`，不建立会话。
3. **客户端**：发送 `tools/list`，得到带 `ttlMs` 和 `cacheScope` 的有序列表。
4. **客户端**：发送 `tools/call`，包含 `name`、`arguments` 与新 `id`。
5. **服务端**：`validate_request()` 检查 `params._meta`，不支持的版本返回 `-32022`。
6. **服务端**：`dispatch()` 按 `method` 路由到 `handle_tools_call()`。
7. **服务端**：返回 complete 类型的 `resultType`，包含 `content` 与 `isError`。

## 方法
type: command-table
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md

| 命令 | 作用 |
|---|---|
| `server/discover` | 版本、能力、指令、服务身份 |
| `tools/list` | 列出工具，可缓存 |
| `tools/call` | 运行一个工具，返回内容块 |
| `resources/list` | 列出以 URI 寻址的数据，可缓存 |
| `resources/read` | 按 URI 读取一个资源 |
| `prompts/list`, `prompts/get` | 列出与渲染 prompt 模板 |
| `subscriptions/listen` | 接收变更事件的长连接 POST 流 |
| `notifications/cancelled` | 在 stdio 上取消请求，无响应 |

## 关键概念
type: concepts
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md

- **无状态核心**：每个请求都携带解释该请求所需的元数据。
- **请求元数据**：版本与能力必填，建议带上 `clientInfo`。
- **完成结果**：每个成功响应的 `resultType` 都设为 complete。
- **可缓存结果**：列举、读取与发现响应携带 `ttlMs` 和 `cacheScope`。
- **工具注解**：`readOnlyHint`、`destructiveHint` 只是提示，约束由服务端执行。
- **stdio**：客户端启动的子进程，stdout 输出 JSON，stderr 输出日志。
- **Streamable HTTP**：只有一个 `/mcp` 端点，每条消息都是新 POST。
- **旧版阶段**：截至 `2025-11-25`，先 `initialize`，再 `notifications/initialized`。

## 默认值
type: defaults
from: phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py, phases/13-tools-and-protocols/09-mcp-transports/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `PROTOCOL_VERSION` | 2026-07-28 | 课程采用的现代修订版 |
| `server/discover` ttl | 3_600_000 | 毫秒，`cacheScope` 为 public |
| `tools/list` ttl | 60_000 | 毫秒，`cacheScope` 为 public |
| `resources/read` ttl | 5_000 | 毫秒，`cacheScope` 为 private |
| `cache_scope` | private | `complete()` 默认值 |
| HTTP 端口 | 8017 | `--serve` 绑定 127.0.0.1 |
| `MAX_REQUEST_BYTES` | 1_048_576 | HTTP 请求体上限 |
| `legacy_probe_timeout_ms` | 1_000 | 单次 `initialize` 探测期限 |

## 故障排查
type: troubleshooting
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `-32022` | 不支持该版本 | 从 `data.supported` 选择版本，用新 id 重试 |
| `-32602` | 缺少请求元数据 | 每次请求都附加 `_meta` |
| HTTP 400 `-32020` | 请求头与请求体不一致 | 版本、方法、名称必须完全一致 |
| POST 返回 HTTP 403 | `Origin` 未被允许 | 将精确来源加入允许列表 |
| HTTP 405 | 对 `/mcp` 发出 GET 或 DELETE | 使用 POST，事件用 `subscriptions/listen` |
| stdio 客户端解析失败 | stdout 混入日志 | 诊断信息写到 stderr |
| HTTP 401 | token 无效、过期或受众错误 | 获取属于此资源的 token |
| 403 `insufficient_scope` | 工具需要更大权限范围 | 根据挑战中的 scope 提升授权 |

## 术语表
type: glossary
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md

- **JSON-RPC 2.0**：每条 MCP 请求、响应与通知的信封。
- **SSE**：`text/event-stream` 响应，先通知，再最终响应。
- **MRTR**：多往返请求，先 `input_required`，再发起新重试。
- **PKCE**：验证器与 S256 挑战，防止授权码被截获后滥用。
- **CIMD**：HTTPS 元数据文档，文档 URL 即客户端标识。
- **DCR**：已弃用的动态客户端注册，仅用于兼容。
- **RFC 9728**：受保护资源元数据，声明授权服务。

## 问答
type: qa
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md, phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md

- **工具错误还是协议错误？** 合法调用执行失败用 `isError: true`，无效请求用 JSON-RPC 错误。
- **服务端能调用客户端吗？** 不能，它返回 `input_required`，客户端使用新 id 重试。
- **如何取消？** stdio 发送 `notifications/cancelled`，HTTP 关闭响应流。
- **stdio 需要 OAuth 吗？** 不需要，授权适用于 HTTP 传输。
- **何时发送 `initialize`？** 仅对允许列表中的旧版对端发送，默认不发送。

## 提示
type: tips
from: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md

- 对列表项排序，稳定顺序能带来稳定缓存键和模型上下文。
- 本地服务绑定 `127.0.0.1`，Origin 检查不是认证。
- 精确匹配来源，前缀检查会放过攻击者后缀。
- bearer token 放在 `Authorization` 中，绝不放进 URL。
- 返回明确的状态句柄，粘性路由在故障转移时会失效。
- 工具名称冲突时加前缀或拒绝，绝不覆盖。
