---
id: mcp-client-transports
title: MCP 客户端与传输
code: MP
subtitle: 通过 stdio 与 Streamable HTTP 探测、合并和路由 MCP 2026-07-28 对端。重试 MRTR 轮次，封装 JSON-RPC 消息。
hue: 190
sources: phases/11-llm-engineering/14-model-context-protocol, phases/13-tools-and-protocols/08-building-an-mcp-client, phases/13-tools-and-protocols/09-mcp-transports, phases/13-tools-and-protocols/11-mcp-sampling, phases/19-capstone-projects/22-jsonrpc-stdio-transport, projects/mcp-at-scale
source_hash: 33c69ec4647b24d2
---

## 多服务端客户端
type: architecture
from: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py

```arch
node | host | 1,1 | 宿主 | 模型与 UI | client
node | client | 2,1 | MultiServerClient | 每个服务端一个 Peer | process
node | reg | 2,2 | registry | 规范名称到对端的映射 | store
node | notes | 3,1 | notes | 现代对端 | process
node | files | 3,2 | files | 现代对端 | process
node | archive | 3,3 | archive | 旧版，allow_legacy=True | process
edge | host | client | 规范名称
edge | client | reg | 查找
edge | client | notes | 每请求携带 _meta
edge | client | files | 每请求携带 _meta
edge | client | archive | 一次 initialize 探测
```

## Stdio 代际探测
type: flow
from: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md

1. **客户端**：在任何其他请求前发送 `server/discover`。
2. **结果**：现代对端。选择双方支持的最高版本。
3. **-32022**：现代对端。从 `data.supported` 选择版本，用新标识重试。
4. **-32020、-32021**：现代对端。修正请求，不使用 `initialize`。
5. **超时、关闭、未知错误**：无法确定。默认拒绝。
6. **允许列表中的对端**：执行一次有界 `initialize`。检查 `protocolVersion`、`capabilities`、`serverInfo`。
7. **代际缓存**：在传输生命周期内保留。

## 客户端代码任务
type: task-table
span: 2
from: phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py, phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/code/main.py, phases/19-capstone-projects/22-jsonrpc-stdio-transport/code/main.py

| 任务 | 代码 |
|---|---|
| 注册现代对端 | `client.add_server("notes", notes)` |
| 允许一次旧版探测 | `client.add_server("archive", archive, allow_legacy=True)` |
| 按名称顺序探测所有对端 | `client.connect_all()` |
| 列出各在线对端的工具 | `client.discover_tools()` |
| 拒绝重复名称 | `client.merge(policy="reject")` |
| 按规范名称调用 | `client.call("notes/search", {})` |
| 将请求体字段镜像至请求头 | `http_headers_for(message)` |
| 处理 JSON-RPC 行直至 EOF | `serve(handler, StdioTransport(stdin, stdout))` |

## 运行课程
type: command-table
from: phases/11-llm-engineering/14-model-context-protocol/docs/zh.md, phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/code/main.py, phases/13-tools-and-protocols/11-mcp-sampling/docs/zh.md, phases/19-capstone-projects/22-jsonrpc-stdio-transport/code/main.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 11.14：以 `2026-07-28` 发现 `demo-server` |
| `python3 main.py` | 13.08 的 `code/`：对端、合并工具、调用 |
| `python3 main.py --probe` | 13.09：在空闲端口运行 HTTP 探测 |
| `python3 main.py --serve` | 13.09：服务地址为 `http://127.0.0.1:8017/mcp` |
| `python3 main.py` | 13.11 的 `code/`：请求标识 `[1, 2, 3]` |
| `python3 code/main.py` | 19.22：BytesIO 演示，打印 `server_responses` |
| `python3 -m unittest discover tests -v` | 在 `code/` 中运行测试 |

## 标记每个现代请求
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py

```python
def modern_request(request_id, method, params, version, capabilities=None):
    body_params = dict(params or {})
    body_params["_meta"] = request_meta(version, capabilities)  # 每次调用重新生成
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": body_params}
VERSION_KEY = "io.modelcontextprotocol/protocolVersion"          # 必填
CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"  # 必填
CLIENT_INFO_KEY = "io.modelcontextprotocol/clientInfo"           # 客户端身份
RECOGNIZED_MODERN_ERRORS = {-32020, -32021, -32022}              # 绝不降级
```

## stdio 与 Streamable HTTP
type: comparison
from: phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/11-llm-engineering/14-model-context-protocol/docs/zh.md

| 因素 | stdio | Streamable HTTP |
|---|---|---|
| 适用场景 | 客户端启动的子进程 | 网络服务 |
| 消息定界 | 每行一条 UTF-8 JSON-RPC 消息 | 每次 POST 一条 JSON-RPC 消息 |
| 版本上下文 | `params._meta` | `params._meta` 加镜像请求头 |
| 响应 | stdout 中一行 | JSON 或请求级 SSE |
| 通知 | 不返回响应行 | `202 Accepted`，无响应体 |
| 诊断 | 仅 stderr | HTTP 状态加 JSON-RPC 错误 |
| 变更事件 | 重启后重新打开 | `subscriptions/listen` POST 流 |
| 安全 | stdin EOF 时退出 | 验证 `Origin`，绑定 `127.0.0.1` |

## Sampling 的 MRTR 轮次
type: flow
from: phases/13-tools-and-protocols/11-mcp-sampling/docs/zh.md, phases/13-tools-and-protocols/11-mcp-sampling/code/main.py

1. **客户端**：调用 `tools/call`。能力中包含 `sampling`。
2. **服务端**：返回 `input_required`、`inputRequests`、`requestState`。
3. **客户端**：检查策略并请求自身模型。
4. **客户端**：方法与参数相同，使用新标识、`inputResponses` 及原样的 `requestState`。
5. **服务端**：验证 HMAC、主体、参数摘要及过期时间。
6. **服务端**：最后一轮返回 `resultType: "complete"`。

## 课程代码默认值
type: defaults
from: phases/13-tools-and-protocols/08-building-an-mcp-client/code/main.py, phases/13-tools-and-protocols/09-mcp-transports/code/main.py, phases/13-tools-and-protocols/11-mcp-sampling/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `discovery_timeout_ms` | 1_000 | 必须为正数 |
| `legacy_probe_timeout_ms` | 1_000 | 传给传输适配器 |
| `merge` 策略 | prefix-on-collision | 或 `reject` |
| 发现 `ttl_ms` | 3_600_000 | `cache_scope="public"` |
| `MAX_REQUEST_BYTES` | 1_048_576 | 更大的请求体返回 `-32700` |
| `READ_TIMEOUT_SECONDS` | 5.0 | 读取请求体的套接字超时 |
| `maxTokens` | 400 | 每个嵌入的采样请求 |
| `requestState` 有效期 | 300 | 自首次调用起的秒数 |

## 状态与错误码
type: troubleshooting
from: phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/code/main.py, phases/11-llm-engineering/14-model-context-protocol/docs/zh.md, phases/13-tools-and-protocols/11-mcp-sampling/docs/zh.md, phases/19-capstone-projects/22-jsonrpc-stdio-transport/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| HTTP 400, `-32020` | 缺少请求头或与请求体不同 | 根据最终请求体生成请求头 |
| HTTP 400, `-32022` | 不支持该版本 | 从 `supported` 选值重试 |
| `-32021` | 客户端缺少必需能力 | 读取 `data.requiredCapabilities` |
| `-32602` | 缺少 `_meta` 或 `requestState` 无效 | 发送 `_meta` 并原样回传状态 |
| HTTP 403 | `Origin` 不在允许列表中 | 精确匹配源 |
| HTTP 404, `-32601` | 未知现代方法 | 不将其视为旧版证据 |
| HTTP 405 | 对 `/mcp` 使用 GET 或 DELETE | 使用 POST 与 `subscriptions/listen` |
| `-32700`，id 为 null | 某行 stdio 不是有效 JSON | 继续处理下一行 |

## 问答
type: qa
from: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/11-mcp-sampling/docs/zh.md

- **-32601 能证明是旧版服务端吗？** 不能。它仅允许名单内对端获得一次探测机会。
- **流能恢复吗？** 不能。`Last-Event-ID` 被忽略。用新标识发送新请求。
- **工作流状态放在哪里？** 放在服务端生成的句柄中，由客户端作为参数传递。
- **服务端能调用客户端吗？** 不能。它返回 `input_required`，然后客户端重试。
- **模型偏好总和为一吗？** 不是。它们是独立提示。

## 项目：MCP 工具发现工作台
type: command-table
span: 2
from: projects/mcp-at-scale/README.md, projects/mcp-at-scale/API.md, projects/mcp-at-scale/project.json, projects/mcp-at-scale/solution

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py mcp-at-scale --all --path <dir> --strict` | 运行评测器。先用 `--init <dir>` 初始化 |
| `python3 cli.py samples/inventory.json --query "pods count" --max-chars 500` | 预算内最合适的 schema |
| `python3 cli.py /absolute/inventory.json --serve` | 提供 `catalog_search` 的 stdio 服务端 |
| 检查项 | initialize 前返回 -32002。每页 32 个工具。250 个名称共 8 页 |

## 提示
type: tips
from: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/zh.md, phases/13-tools-and-protocols/09-mcp-transports/docs/zh.md, phases/13-tools-and-protocols/11-mcp-sampling/docs/zh.md

- 检查最终序列化的请求。
- 非 ASCII 的 `Mcp-Name` 按 `=?base64?{Base64EncodedValue}?=` 发送。
- 限制 MRTR 轮次。验证每个采样响应。
- 流丢失时重新发起 `subscriptions/listen` 并重新获取数据。
- stdio 下将诊断写入 stderr。
