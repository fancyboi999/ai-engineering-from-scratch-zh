# 无状态 MCP 网关与注册表准入

> 网关应让每条路由清晰可见。2026-07-28 协议为它划定方法、名称、版本、能力、身份、缓存和追踪边界，无需传输层会话。

**类型：** Learn
**语言：** Python
**前置要求：** 阶段 13 · 15（安全）、阶段 13 · 16（授权）
**预计时间：** ~75 分钟

## 学习目标

- 在不依赖会话亲和性的情况下，将多个 MCP server 聚合在一个 2026-07-28 端点后。
- 在执行策略或转发前校验每个请求的元数据和路由头。
- 以稳定命名空间、确定性顺序、描述符钉定、RBAC 和私有缓存合并工具。
- 将注册表记录视为仍需准入策略的发现证据。
- 正确路由请求范围内的 SSE、`subscriptions/listen`、MRTR 重试和 Tasks 扩展调用。
- 将旧版握手与会话支持隔离在现代路径外。

## 问题背景

把一个 client 直接连到一个 server 很简单。规模更大的部署需要为这些更棘手的问题给出一致答案：

- 哪些 server 被允许？
- 哪个主体能看到和调用每个工具？
- 两个后端暴露同名工具时怎么办？
- 如何审查描述符变更？
- 在哪里实施限流和记录审计事件？
- 任意实例都能处理下一个请求吗？

网关位于 client 和后端 MCP server 之间。它呈现一个 MCP 端点，实施横切策略，并转发已批准的请求。

早期网关设计常把一个 client 会话多路复用为多个后端会话，并重写 `Mcp-Session-Id`。那是旧版兼容设计。2026-07-28 核心没有协议会话。

## 核心概念

### 现代网关路径

对每个请求：

1. 从传输层授权信息认证主体。
2. 校验 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name` 和 `params._meta`。
3. 对主体、资源、方法、工具和参数授权。
4. 应用描述符、注册表、限流和数据策略。
5. 为选定后端创建全新的自包含请求。
6. 校验后端结果并返回网关结果。
7. 记录审计事件，不记录机密信息。

没有一步需要隐藏的协议会话。应用状态仍可存在于数据库、显式句柄、Tasks 或受完整性保护的 MRTR 状态中。

### 运行时策略是网关的主要决策

准入决定哪个后端版本可以进入网关，并不授权一次实时调用。对每个请求，网关都会依据已认证主体、issuer 和 resource、租户、匹配的方法和名称、规范化参数、已准入的描述符钉定、当前后端健康状态、能力交集、数据分类、限流状态和任何与动作绑定的批准，重新计算策略。

这个顺序很重要。用户角色被撤销时，Registry 记录仍可能活跃；目标参数跨越租户边界时，描述符仍可能被钉定；事故策略隔离变更状态调用时，后端仍可能获批。因此运行时策略才是主要的允许或拒绝决定，Registry 和描述符证据只是输入。

不要按连接或已移除的会话标识符缓存允许决定。策略不可用时，应按操作类别采取预先声明的失败策略。安全默认值是对状态变更和敏感读取失败关闭；明确批准的公开读取路径只有在其风险模型允许时，才可短暂使用最后已知策略。记录作出决定所用的策略版本和失败路径，然后在返回前校验后端结果。

### 一个 POST 端点

现代 Streamable HTTP 通过 POST 发送每条 JSON-RPC 消息：

```text
POST /mcp
Authorization: Bearer <gateway-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.search
Accept: application/json, text/event-stream
```

网关可为该 POST 返回 JSON 或请求范围内的 SSE。现代请求的 GET 和 DELETE 返回 405。`Mcp-Session-Id` 和 `Last-Event-ID` 不会建立授权、亲和性或重放行为。

头部和 body 值必须一致。查找后端前，先用 `-32020` 拒绝不匹配。这让负载均衡器、网关和限流器无需解析完整 body 即可路由，同时保留端到端完整性。

按严格顺序校验：JSON-RPC 和元数据类型、头部与 body 相等性、最后才是匹配版本是否受支持。不匹配时返回带 `-32020` 的 HTTP 400。头部和 body 一致但版本不受支持时，返回带 `-32022` 的 HTTP 400，且 `data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回带 `-32601` 的 HTTP 404。

`ProtocolError` 可携带可选 `data`，网关会将其序列化到 JSON-RPC error 对象。notification 没有 `id`，因此绝不会收到 JSON-RPC 成功或错误。已接受的 HTTP notification 返回空 body 的 202。

### 在每一层实现发现

网关为 client 实现 `server/discover`，同时发现每个后端，以了解协议版本、能力和扩展。

网关结果示例：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {"listChanged": true}
  },
  "ttlMs": 30000,
  "cacheScope": "private",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "enterprise-gateway",
      "version": "2.0.0"
    }
  }
}
```

只声明网关能端到端兑现的能力交集。后端功能不会自动变得可安全暴露；没有后端路径的网关功能也不值得声明。

`serverInfo` 是自报的展示和诊断数据，不要把它用作注册表或发布者证明。

### 每个请求的 client 能力

每个转发请求都需要当前的 `_meta` 信封：

```json
{
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": {
    "name": "enterprise-gateway",
    "version": "1.0.0"
  }
}
```

不要盲目把外层 client 能力复制到后端。网关才是后端的 client，只应声明网关会正确调解的功能。

### 确定性命名空间

在稳定的公开名称下合并后端工具：

```text
notes.search
notes.create
issues.list
issues.open
```

维护从公开名称到后端和原始工具名称的映射。绝不要按碰撞时的第一个或最后一个来选择。公开名称是批准与审计契约的一部分，改名就是一次迁移。

`tools/list` 必须具有确定性。当可见性因主体而异时，返回 `cacheScope: private`。有界的 `ttlMs` 能降低后端发现负载，又不会让用户专属列表泄漏到其他授权上下文。

每个已暴露工具描述符包含稳定名称、描述和对象根级别的 `inputSchema`。命名空间不能移除必填描述符字段。完整列表结果还包含 `resultType`、server 身份元数据和缓存提示。

### 钉定已批准的描述符

在准入时，对完整描述符做规范化，并按限定公开名称保存其摘要。在列出和调用时，将实时描述符与已批准摘要比较。

若它发生变更：

- 从 `tools/list` 中移除它。
- 拒绝直接调用。
- 发出审计事件。
- 更新钉定前要求策略或人工重新批准。

网关是有用的集中执行点，但它不会把首次看到的描述符变成安全描述符。初始审查仍然必要。

### 注册表帮助发现，不负责决策

Registry 的 `server.json` 提供发布元数据。一个以 package 为后端的记录可能如下：

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.example/notes",
  "description": "Example notes MCP server.",
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@example/notes-mcp",
      "version": "1.0.0",
      "transport": {"type": "stdio"}
    }
  ]
}
```

发布元数据不承载网关的安全决定。将已验证的发布者和溯源证据保存在独立准入状态中：

```json
{
  "registryName": "com.example/notes",
  "registryVersion": "1.0.0",
  "publisher": {"namespace": "com.example", "status": "verified"},
  "provenance": {
    "source": "registry.modelcontextprotocol.io",
    "recordId": "com.example/notes@1.0.0"
  },
  "admission": {"status": "approved", "reviewedBy": "gateway-policy"}
}
```

网关检查 `server.json` 的形状，并将其与外部状态关联。网关仍需要准入策略。

对每个获准后端，记录：

- 精确的注册表和记录标识符。
- 已验证的发布者命名空间或域名证据。
- 允许的传输方式和端点。
- 钉定版本或获批准的升级策略。
- 制品或描述符摘要。
- 授权 issuer 和 resource。
- 审查者、批准时间和过期时间。

不要因 server 的展示名称像熟悉产品就接受它。不要把注册表中的存在当作运行时安全审查。私有 server 即使从未出现在公开注册表中，也可以通过同一证据 schema 获得准入。

本课实现网关接缝：在后端可路由前，将发布证据关联到本地准入状态。[第 30 课：MCP Registry 供应链、准入、漂移与回滚](../../30-mcp-registry-supply-chain-and-drift/docs/zh.md) 构建完整控制面，涵盖精确命名空间证明、制品溯源、不可变钉定、实时描述符漂移、Registry 状态协调、防篡改准入账本和基于证据的回滚。将这些供应链状态与上文按请求作出的运行时决定分离。

### 凭证调解

网关认证调用方，并单独向后端认证。后端凭证绝不发送给 client。

明确保留这些绑定：

```text
outer principal -> gateway role and policy
backend issuer + resource -> backend registration and token
```

绝不要把外层网关 token 传给后端。绝不要在不同 issuer 或 resource 上复用后端 token。如果工具代表终端用户行动，应通过设计好的交换或 claims 模型保留该委派，而不是用共享服务凭证冒充用户。

### 没有会话的限流

以已认证主体、issuer、resource、公开工具、成本类别和时间窗口作为限流键。会话 id 不存在；即使存在，也很容易被轮换。

在消耗昂贵工作前实施低成本校验。决定被拒调用是否计入滥用限制、业务配额或两者。

### 审计决策链

记录足以重建一次调用的信息：

- 请求和追踪标识符。
- 已认证主体和 issuer。
- 公开工具和后端路由。
- 描述符钉定版本。
- 策略决定及原因。
- 延迟和结果类别。
- 适用时的 MRTR 轮次或任务标识符。

脱敏 bearer token、授权码、refresh token、原始机密信息和不必要的敏感参数。

### 请求范围内的 SSE

普通 POST 可在该请求中有流式工作时返回请求范围内的 SSE。关闭响应流会取消这个进行中的现代 HTTP 请求。

不要创建独立 GET 流，也不要承诺 `Last-Event-ID` 重放。这些是旧传输假设。

### 长生命周期变更通知

对于列表和资源变更通知，当前 client 通过 POST 发送 `subscriptions/listen` 并接收 SSE 响应。通知过滤器使用严格的扁平字段 `toolsListChanged`、`promptsListChanged`、`resourcesListChanged` 和 `resourceSubscriptions`：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-tools",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

第一个事件确认受支持的子集。其订阅标识符就是打开该流的请求的 JSON-RPC id：

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": "listen-tools"
    },
    "notifications": {
      "toolsListChanged": true
    }
  }
}
```

网关随后只转发已确认变更类型。该流上的每个 notification 都在 `params._meta` 中携带相同的 `io.modelcontextprotocol/subscriptionId`。没有自动重放或自动重新监听。重新连接时，client 重新打开订阅并刷新所依赖列表。server 发起的优雅关闭会返回带有相同订阅 id 标记的最终完整结果。

现代路径取代了 `resources/subscribe`、`resources/unsubscribe` 和非请求式的独立 GET 流。只在按版本区分的旧路径中保留它们。

### 通过网关处理 MRTR

后端返回 `resultType: input_required` 时，只有外层 client 支持所需输入请求，网关才能转发该结果。除非网关有意终止并重新发起交互，否则应逐字节保留 `requestState`。

client 使用新的 JSON-RPC id 和 `inputResponses` 重试原始公开工具。网关对该重试重新授权，检查同一公开路由，再转发全新后端请求。它不能假定早先一轮授予了无限批准。

### Tasks 扩展路由

Tasks 是由 `io.modelcontextprotocol/tasks` 标识的官方扩展，并非核心会话的替代品。

client 在逐请求 client 能力中声明扩展，网关只有在能够端到端保留其生命周期时，才在发现结果中声明它。对受支持的 `tools/call`，仅后端决定返回普通结果还是 `resultType: task`。任务结果直接携带 `taskId`、`status`、时间戳、`ttlMs` 和可选 `pollIntervalMs`。发送该结果前，任务必须已经可持久读取。

网关记录不透明任务标识符对应的已认证主体和后端路由。后续 `tasks/get`、`tasks/update`、`tasks/cancel` 调用使用 `params.taskId` 作为 `Mcp-Name`，为中间件提供路由键。`tasks/get` 返回带当前任务状态的 `resultType: complete`，在终态内联最终结果或协议错误。`tasks/update` 为待处理任务输入发送带键的 `inputResponses`，返回空的完整确认。`tasks/cancel` 是返回空完整确认的协作性意图，不保证工作停止。

不要实现新的 `tasks/list` 或 `tasks/result` 方法；它们属于旧实验模型。需要输入的任务会通过 `tasks/get` 暴露完整嵌入请求；client 通过 `tasks/update` 回答，而不是重试原始工具调用。client 仍按建议间隔轮询；创建任务仍由 server 决定。

持久任务路由状态是按任务句柄键控的应用数据，不是协议会话。

### 兼容性边界

如果网关必须服务旧 client 或后端：

- 显式检测其协议时代。
- 将初始化、传输会话、GET 流、资源订阅和旧任务词汇封装在 legacy adapter 中。
- 绝不让旧版会话 id 泄漏到现代路由或授权中。
- 相比静默降级，优先选择有界的发现探测和显式回退策略。

```figure
t3-gateway-funnel
```

## 动手构建

`code/main.py` 实现一个进程内协议网关和两个后端 server。每个后端都会收到全新的当前协议请求。网关提供发现、按用户过滤且确定的 `tools/list`、命名空间路由、Registry `server.json` 加外部准入状态、描述符钉定、RBAC、按主体键控的限流、审计决定，以及建模的 `subscriptions/listen` SSE 确认。

该模型接收已解析请求 body、路由头和已认证 bearer 身份。它不是完整 HTTP adapter，不解析 `Content-Type` 或完整 `Accept` 契约。应将它连接到第 09 课的 Streamable HTTP adapter；后者要求 `Content-Type: application/json`，且 `Accept` 值包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/17-mcp-gateways-and-registries
python3 code/main.py
PYTHONPATH=code python3 -m unittest discover code/tests -v
```

演示会打印外层请求 id 和全新的后端请求 id，让无状态跳转可见。

## 实际使用

用真实当前协议 client 替换进程内后端对象，仍保留相同接缝：

- 连接前的准入记录。
- 暴露能力前的后端发现。
- 授权前的限定公开名称。
- 列出或调用前的描述符钉定。
- 转发前的全新逐请求元数据。
- 返回前的结果校验。

## 拿去用

本课交付 `outputs/skill-gateway-bootstrap.md`。它会生成现代网关设计，涵盖入口、发现、准入、命名空间、授权、缓存、流、订阅、MRTR、Tasks、可观测性和旧版隔离。

## 练习

1. 为外层和转发请求元数据加入 trace context，并在审计事件中记录关联关系。
2. 加入支持 Tasks 的后端，并通过 `Mcp-Name` 中的任务 id 路由 `tasks/get`。
3. 修改一个后端描述符，证明发现和直接调用都会被拦截。
4. 加入仅对某个主体开放的 server 能力，并说明发现结果为何必须保持私有缓存。
5. 编写一个 legacy adapter 接口，但不要向现代 `Gateway` 类添加任何旧版状态。

## 关键术语

| 术语 | 含义 |
|------|---------|
| MCP gateway | 位于 client 和后端 MCP server 之间的策略与路由 server |
| 准入记录 | 允许一个后端进入网关的证据和策略决定 |
| 限定工具名称 | 如 `notes.search` 的稳定公开路由 |
| 描述符钉定 | 在发现和分派期间检查的已批准摘要 |
| 私有缓存范围 | 仅限于一个授权上下文的缓存结果 |
| 请求范围内的 SSE | 绑定在一个 POST 请求上的流式响应 |
| `subscriptions/listen` | client 为选定的长生命周期变更通知打开的 SSE 流 |
| 任务路由 | 从不透明任务 id 到其后端的应用映射 |
| legacy adapter | 为旧握手和会话行为划定的显式、按版本区分的边界 |

## 延伸阅读

- [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [Official Registry server.json requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [MCP Tasks extension](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
