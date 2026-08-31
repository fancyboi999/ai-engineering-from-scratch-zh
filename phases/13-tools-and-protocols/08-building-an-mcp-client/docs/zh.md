# 构建 MCP Client：发现、路由与双时代回退

> 现代 MCP client 在每条请求中重复自己的契约。它最棘手的兼容性决定，是分清旧 server 真正过时的情形，与现代 server 正在报告可纠正 error 的情形。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13，第 07 课
**预计时间：** 约 85 分钟

## 学习目标

- 使用当前元数据构建每条 MCP `2026-07-28` 请求。
- 用 `server/discover` 探测 stdio servers，并选择双方支持的版本。
- 只为明确 allowlisted 的 peers 授权有限的旧版探测。
- 仅在已校验某个受支持修订版的正向 `initialize` 结果后，接受旧版 era。
- 合并确定性的 tool lists，且不悄悄覆盖冲突。
- 将 calls 路由到拥有对应 tool 的 peer，而不虚构协议 sessions。

## 问题背景

一个 agent host 通常会与不止一个 MCP server 通信。它必须发现每个 server、合并 tool catalogs、解决重复名称、路由 calls，并从 transport failure 中恢复。

`2026-07-28` 修订版使稳态更简单，因为每条请求都是自包含的；但兼容性让启动过程更微妙。client 可能遇到：

- 支持首选版本的现代 server；
- 返回已识别版本或 header error 的现代 server；
- 从未听说过 `server/discover` 的旧版 server；
- 直到收到 `initialize` 才响应的旧版 server。

把每个 probe error 都视为旧版很危险。格式错误的现代请求、过载的 server、失效的 process 和旧 server 都可能产生相同的 timeout 或 connection close。这些信号都有歧义。client 必须在选择旧版 era 前，将明确的 operator intent 与正向协议证据结合起来。

## 核心概念

### Peer，而非协议 session

为每个 server process 或 endpoint 保留一条 transport peer record：

- transport handle 或 send function；
- 选定的协议 era 和版本；
- 最后发现的 server capabilities；
- 最后的确定性 tool list；
- 用于关联的 pending request ids；
- transport health。

这是 client bookkeeping，不是协议 session state。在现代 MCP 上，server 仍会在每条请求中收到当前版本和 capabilities。

### 从头构建每条现代请求

```python
def modern_request(request_id, method, params, version, capabilities):
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": {
            **params,
            "_meta": {
                "io.modelcontextprotocol/protocolVersion": version,
                "io.modelcontextprotocol/clientCapabilities": capabilities,
                "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
            },
        },
    }
```

不要只把元数据附到 connection object，就假定它已到达线上。要在序列化前为最终请求盖上元数据并检查它。

### 现代发现

`server/discover` 返回支持的版本、server capabilities、instructions、cache hints，以及建议提供的 server identity。client 选择双方都支持的最高现代版本。

发现对于纯现代 client 是可选的，但建议在 stdio 上使用。有些旧 server 能在初始化前接受操作，因此先发送 `tools/list` 可能得到含糊的成功。`server/discover` 建立了清晰的 era 边界。

### stdio 兼容性探测

双时代 stdio client 在任何其他请求之前，先发送带首选现代元数据的 `server/discover`。结果分为三类：

1. **DiscoverResult。** server 是现代的。选择双方支持的版本，并继续使用逐请求元数据。
2. **已识别的现代 error。** server 是现代的。对于 `-32022`，从 `data.supported` 中选择版本，并以新的请求 id 重试。对于 header 或 capability errors，修正请求。不要发送 `initialize`。
3. **歧义信号。** 未识别的 JSON-RPC error、timeout、connection close 或空响应无法识别 era。除非该确切 peer 配置了旧版兼容性，否则 fail closed。

已识别的现代协议 errors 包括：

- `-32020` HeaderMismatch
- `-32021` MissingRequiredClientCapability
- `-32022` UnsupportedProtocolVersion

即使 peer 位于旧版 allowlist 上，已识别的现代 errors 仍然是现代的。一旦 server 证明它理解现代 error vocabulary，发送 `initialize` 就会构成降级。

不要把 `-32601` 当作正向旧版证据。它只让一个明确 allowlisted 的 peer 有资格进行一次旧版 probe。timeout、connection close 或空响应同样适用这一规则。

### Allowlisting 是 operator intent，不是证据

旧版兼容性必须是一个固定 peer configuration 的显式属性：

```python
client.add_server("archive", archive_transport, allow_legacy=True)
```

将这一选择绑定到配置的 command 或 endpoint。不要使用让任意 server 将自己选择进较弱语义的 wildcard。未设置 `allow_legacy=True` 的 peer 在发现结果歧义后会失败，且永远不会收到 `initialize`。

allowlist 授予的是探测许可，不选择 era。client 在 transport-enforced deadline 内发送一次 `initialize`，然后要求满足以下全部条件：

- JSON-RPC `2.0` response，且有匹配的请求 id；
- 恰好一个 `result`，且没有 `error`；
- `protocolVersion` 位于 client 配置的旧版 revision set 中；
- 值为 object 的 `capabilities` 字段；
- `serverInfo` 为 object，且其 `name` 和 `version` 均为非空字符串。

timeout、connection close、error response、格式错误的 result、不匹配的 id 或不受支持的 revision 都会 fail closed。只有结构上有效的正向结果才选择旧版 era。代码将 `legacy_probe_timeout_ms` 传给 transport adapter；真正的 stdio 或 HTTP adapter 必须执行该 deadline，而非仅记录它。

缓存该 transport peer 选定的 era。不要在每次 call 前重复探测。

### Legacy 是兼容性分支

一旦有限 probe 返回有效的正向旧版证据，client 就严格按照选定 revision 的定义使用旧版版本：

1. 校验 response envelope 和关联 id。
2. 校验协商的 revision 位于配置的旧版集合中。
3. 记录已校验的 capabilities 和 server identity。
4. 仅在所有检查通过后发送 `notifications/initialized`。
5. 在该 transport 生命周期内使用旧版请求形状。

此分支是为与已知 peers 互操作而存在的，不是新 servers 或新请求的默认设计。如果 transport 重启或 endpoint 改变，丢弃 peer-era cache 并重新协商。

### 发现并缓存 tools

对每个活跃 peer 调用 `tools/list`。现代结果包含 `resultType`、`ttlMs` 和 `cacheScope`。在正确的授权上下文中遵守 freshness hint；过期或收到订阅的列表变更 event 后重新获取。

client 必须将旧 server 缺失的 `resultType` 视作 `"complete"`。不要要求较早协商 era 的响应提供现代 cache fields。

server 应返回确定性排序。client 也应在合并前排序，这样本地 registry 顺序就不会依赖 process startup timing。

### 防冲突的命名空间合并

两个 servers 都可能暴露 `search`。选择一条声明的 policy：

1. **冲突时加前缀。** 保留第一条 canonical name，将之后的冲突暴露为 `<server>/<tool>`。
2. **冲突时拒绝。** 不加载重复项，并显示清晰的 configuration error。
3. **静默覆盖。** 永远不要使用。它隐藏了 model-selected action 实际会发送到哪个 server。

同时存储 canonical 和 local names。模型看到 canonical name；发出的 `tools/call` 使用拥有该 tool 的 server 所声明的 local name。

### 路由一条 call

路由是纯 lookup：

```text
canonical tool name
  -> peer name + local tool name
  -> new JSON-RPC request id
  -> modern request metadata or explicit legacy shape
  -> matching response id
```

当拥有该 tool 的 transport 不可用时，不要发送 call。重连或重启 transport 后，重新运行 discovery 和 `tools/list`。当操作的安全 policy 允许时，因 transport 损坏而丢失的现代 in-flight requests 可使用新的 JSON-RPC id 重试。

### Notifications 与 subscriptions

现代列表和 resource changes 只会出现在 client 打开的 `subscriptions/listen` stream 上。client 发送 notification filter，等待 `notifications/subscriptions/acknowledged`，并在 notification metadata 中用 listen request id 关联 events。

断开后，打开新的 listen request，并重新获取相关 lists 或 resources。现代 streams 不会使用 `Last-Event-ID` 恢复。

### 不允许 server 发起请求

现代 servers 不会为 sampling、elicitation 或 roots 通过独立 JSON-RPC requests 调用 client。它们返回 `input_required`，client 完成嵌入的输入请求后重试原始请求。

完成 input 时不要阻塞 peer 的 response reader。保留关联关系，并为 retry 创建新的 JSON-RPC id。

```figure
tp-client-merge
```

## 实际使用

`code/main.py` 使用进程内 peer functions，让协议决策保持可见。它连接两个现代 peers 和一个刻意 allowlisted 的旧版 peer，然后合并并路由它们的 tools。transport callable 接收 timeout budget，因此兼容性分支无法隐藏无界 probe。

```bash
cd code
python3 main.py
python3 -m unittest discover tests -v
```

这些测试证明了普通 demo 看不到的边界：

- 现代请求重复元数据；
- `-32022` 会重试现代 discovery，不会初始化；
- 已识别现代 errors 从不降级，即使 peer 已 allowlisted；
- 没有 allowlist 时，timeouts、connection closes、空 responses 和未识别 errors 不会触发 `initialize`；
- allowlisted peer 只有在有效、受支持的 `initialize` 结果后才成为旧版；
- 格式错误和不受支持的旧版结果使 peer 保持不可用；
- 成功选定的 era 会在 transport 生命周期内缓存。

## 拿去用

本课交付 `outputs/skill-mcp-client-harness.md`。它搭建现代请求盖章、stdio era 协商、确定性命名空间合并、路由和 fail-closed 旧版兼容性分支。

## 练习

1. 让 fake server 返回没有双方支持版本的 `-32022`。确认 client 会失败，而不是发送 `initialize`。
2. Allowlist 一个 fake legacy server，让它的有限 `initialize` probe 超时，并证明 peer 保持 `unknown` 且不可用。
3. 为两个授权上下文添加 `cacheScope: "private"` 的 tool lists。确认 client 绝不会将一个上下文的缓存结果共享给另一个。
4. 将 collision policy 改为拒绝，并使启动失败消息包含两个 peer names。
5. 添加有限的 `subscriptions/listen` simulator。stream 丢失后，以新的请求 id 重新监听并重新获取 tools。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Peer | 一个 server transport 及其发现数据的 client 侧记录 |
| 协议时代 | 现代逐请求元数据，或旧版初始化语义 |
| 发现探测 | 用于识别 stdio era 的初始 `server/discover` |
| 已识别的现代 error | 证明现代行为且禁止旧版回退的 error |
| 旧版 allowlist | operator 配置，允许对固定 peer 做一次有限兼容性 probe |
| 正向旧版证据 | 为明确支持的旧版 revision 产生的有效、可关联 `initialize` result |
| 合并后的命名空间 | 所有活跃 peers 中的 canonical tool names |
| 冲突 policy | 对重复 tool names 加前缀或拒绝的规则 |
| Era cache | 为一个 transport peer 保存的选定现代或旧版行为 |
| Transport recovery | 重启或重连、重新发现、重新列出，并以新 id 安全重试 |

## 延伸阅读

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP stdio Transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
