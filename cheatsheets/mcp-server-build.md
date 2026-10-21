---
id: mcp-server-build
title: 构建 MCP 服务端
code: BM
subtitle: 验证、分发、封装并缓存无状态 MCP 2026-07-28 服务端，涵盖工具、资源、prompt 与策略。
hue: 172
sources: phases/13-tools-and-protocols/07-building-an-mcp-server, phases/13-tools-and-protocols/10-mcp-resources-and-prompts, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content, phases/19-capstone-projects/13-mcp-server-with-registry, projects/memory-server
source_hash: e8540435faf465db
---

## 运行课程服务端
type: task-table
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/zh.md, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md, phases/19-capstone-projects/13-mcp-server-with-registry/docs/zh.md

| 任务 | 代码 |
|---|---|
| 通过 stdio 提供服务 | `python3 main.py` |
| 运行有限演示 | `python3 main.py --demo` |
| 运行 TypeScript 移植版 | `npx tsx main.ts --demo` |
| 运行课程测试 | `python3 -m unittest discover tests -v` |
| 构造带 `_meta` 的请求 | `make_request(2, "tools/list")` |
| 运行综合项目模型 | `python3 code/main.py` |
| 检查综合项目 TypeScript | `npm run typecheck` |

## 分发循环
type: flow
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py

1. **serve_stdio**：从 stdin 读取一行，无效 JSON 返回 `-32700`。
2. **dispatch**：没有 `id` 就是通知，服务端不返回响应。
3. **validate_request**：检查 `params._meta` 中的版本与能力。
4. **HANDLERS**：按 `method` 路由，未知方法返回 `-32601`。
5. **complete**：为处理器结果加入 `resultType` 和 serverInfo。
6. **serve_stdio**：向 stdout 写出一行 JSON，刷新缓冲区，不保留元数据。

## 验证并封装每个请求
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py

```python
meta = params.get("_meta")                     # 缺失时返回 -32602
requested = meta.get(VERSION_KEY)              # protocolVersion 键
if requested not in SUPPORTED_VERSIONS:
    raise RpcProblem(-32022, "Unsupported protocol version",
        {"requested": requested, "supported": SUPPORTED_VERSIONS.copy()})
if not isinstance(meta.get(CAPABILITIES_KEY), dict):
    raise RpcProblem(-32602, f"{CAPABILITIES_KEY} is required")
result = {"resultType": "complete", **payload,
    "_meta": {SERVER_INFO_KEY: SERVER_INFO.copy()}}
if ttl_ms is not None:                         # 列表、读取、发现
    result["ttlMs"] = ttl_ms
    result["cacheScope"] = cache_scope         # 默认为 "private"
```

## 注册工具及其执行器
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py

```python
TOOL_EXECUTORS = {"notes_search": exec_notes_search}  # 名称到函数的映射
def handle_tools_list(params):
    return complete({"tools": sorted(TOOLS, key=lambda tool: tool["name"])},
                    ttl_ms=60_000, cache_scope="public")
def handle_tools_call(params):
    executor = TOOL_EXECUTORS.get(name)
    if executor is None:                      # 返回结果，而非 RPC 错误
        return complete({"content": [...], "isError": True})
    try:
        return complete({"content": executor(arguments), "isError": False})
    except (KeyError, TypeError, ValueError) as exc:
        return complete({"content": [...], "isError": True})
```

## 工具、资源与 prompt
type: comparison
from: phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/zh.md

| 维度 | 工具 | 资源 | prompt |
|---|---|---|---|
| 意图 | 执行操作 | 读取 URI 中的内容 | 启动消息工作流 |
| 选择者 | 模型或应用 | 宿主、应用或用户 | 用户通过宿主 UI 选择 |
| 结果 | 结构化行动结果 | 文本或二进制内容 | prompt 消息 |
| 方法 | `tools/list`、`tools/call` | `resources/list`、`resources/read` | `prompts/list`、`prompts/get` |
| 示例 | `delete_note` | `notes://note-1` | `review_note` |

## 提示
type: tips
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/zh.md, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md, phases/19-capstone-projects/13-mcp-server-with-registry/docs/zh.md, projects/memory-server/solution

- 用户数据使用 `cacheScope: "private"`，秘密信息使用 `ttlMs: 0`。
- 拒绝将 `password`、`secret`、`token` 或 `authorization` 映射到请求头的描述符。
- 限制请求体大小。记忆服务端对超过 50000 字节的请求返回 413。

## 课程中的缓存提示
type: defaults
span: 1
from: phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code/main.py, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/code/main.py, phases/19-capstone-projects/13-mcp-server-with-registry/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `server/discover` ttl | 3_600_000 | 单位 ms，`cacheScope` 为 public |
| `tools/list` ttl | 60_000 | public，综合项目使用 private |
| `resources/list` ttl | 10_000 | 第 07 课，private |
| `resources/read` ttl | 5_000 | 第 07 课，private |
| `prompts/list` ttl | 600_000 | 第 10 课，public |
| `cache_scope` | private | 第 07 课中 `complete()` 的默认值 |
| `notes_search` 的 `limit` | 10 | 1 至 50 的整数 |
| `MAX_TOOL_LIST_PAGES` | 100 | 第 28 课客户端的分页上限 |

## 错误码
type: troubleshooting
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/07-building-an-mcp-server/code/main.py, phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/zh.md, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `-32700` 解析错误 | 该行不是 JSON | 每行发送一个 JSON 对象 |
| `-32600` 无效请求 | 缺少值为 2.0 的 `jsonrpc`，或缺少方法 | 修正请求封装 |
| `-32602` 无效参数 | 缺少 `params._meta` | 每次都发送版本与能力 |
| `-32022` | 不支持该版本字符串 | 使用 `supported` 中的版本重试 |
| `-32601` | 方法不在 `HANDLERS` 中 | 添加处理器或修正名称 |
| `resources/read` 返回 `-32602` | URI 未知或无效 | 不能返回空读取结果 |
| HTTP `400` 与 `-32020` | `Mcp-Param-*` 请求头与正文不一致 | 在分发前拒绝 |
| 客户端解析失败 | 日志写入 stdout | 将诊断写入 stderr |

## 工具契约
type: concepts
from: phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/code/main.py

- **inputSchema**：JSON Schema。没有 `$schema` 时，方言为 2020-12。
- **无参数**：`{"type": "object", "additionalProperties": false}`。
- **outputSchema**：可选。一旦发布，每个结果都携带符合模式的 `structuredContent`。
- **structuredContent**：任意 JSON 值，同时将 JSON 作为文本块发送。
- **内容块**：`text`、`image`、`audio`、`resource_link`、`resource`。
- **x-mcp-header**：将顶层参数映射到 `Mcp-Param-{name}`，只允许字符串、整数或布尔值。
- **请求头编码**：非 ASCII 值或带首尾空格的值使用 `=?base64?{Base64UTF8}?=`。
- **游标**：不透明。空 `nextCursor` 有效，只在 `None` 时停止。

## 记忆服务端项目
type: command-table
from: projects/memory-server/README.md, projects/memory-server/API.md, projects/memory-server/project.json, projects/memory-server/solution

| 命令 | 作用 |
|---|---|
| `project_test.py --init <workspace>` | 创建工作区，全新起始实现会失败 |
| `project_test.py --all --path <workspace> --strict` | 评测全部四个阶段 |
| `cli.ts --data-dir <dir> --put <file>` | 将修订 1 追加到 JSONL 日志 |
| `cli.ts --data-dir <dir> --query "<text>"` | 0.6 词汇得分加 0.4 余弦得分 |
| `cli.ts --data-dir <dir> --history <id>` | 查看每个修订及其来源 |
| `--put <file> --revision 1` | 追加修订 2，修订 0 会冲突 |
| `cli.ts --data-dir <dir> --serve --port 8788` | REST 与 MCP 共用存储，需要 MEMORY_TOKEN |

## 综合项目策略闸门
type: architecture
from: phases/19-capstone-projects/13-mcp-server-with-registry/docs/zh.md, phases/19-capstone-projects/13-mcp-server-with-registry/code/main.py

```arch
node | reg | 1,1 | 注册表 API | server.json | store
node | client | 2,1 | MCP 客户端 | server/discover、tools/list | client
node | gw | 3,1 | policy_decide | issuer、audience、scope | process
node | ro | 4,1 | 只读副本 | 无亲和性 | process
node | appr | 2,2 | 批准记录 | arguments_digest | store
node | rw | 3,2 | 改变状态的副本 | 破坏性工具 | process
node | audit | 4,2 | 审计接收端 | 脱敏条目 | store
edge | reg | client | 远程 URL
edge | client | gw | tools/call
edge | gw | ro | 放行
edge | gw | rw | 放行
edge | appr | rw | 批准
edge | ro | audit |
edge | rw | audit |
```

## 问答
type: qa
from: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/zh.md, phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/zh.md, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md, phases/19-capstone-projects/13-mcp-server-with-registry/docs/zh.md, projects/memory-server/project.json

- **工具错误还是协议错误？** 有效调用执行失败时返回 `isError: true`，请求封装无效时返回 JSON-RPC 错误。
- **发现服务会解锁服务端吗？** 不会，`tools/list` 携带相同的请求元数据。
- **服务端可以向客户端索要输入吗？** 它返回 `input_required`，绝不主动发送自己的请求。
- **客户端如何知道资源变化？** 打开 `subscriptions/listen`，随后再次调用 `resources/read`。
- **注解能授权吗？** 不能，`readOnlyHint` 与 `destructiveHint` 只是提示。
