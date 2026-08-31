# MCP 安全：投毒元数据、路由与 MRTR 状态

> 无状态不等于无须信任。它意味着每个请求都要携带让 server 和 gateway 能够独立验证调用所需的证据。

**类型：** Learn
**语言：** Python
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 08（MCP client）
**预计时间：** ~60 分钟

## 学习目标

- 将工具描述、注解、client 信息和 server 信息都视为不可信数据。
- 检测元数据投毒、descriptor 变更及跨 server 名称冲突。
- 验证 2026-07-28 的请求元数据和 Streamable HTTP 路由头。
- 防护 MRTR `requestState` 不被篡改，并将确认绑定到精确参数。
- 将授权和限流应用于 principal，而不是已移除的协议 session。

## 问题背景

模型读取工具描述来决定调用什么。router 读取工具名来决定将请求发往哪里。用户读取标签来决定批准什么。一个恶意 descriptor 可以同时攻击这三方。

官方 MCP 安全指引说得很直接：除非描述和注解来自可信 server，否则应将它们视为不可信。即便来自可信 server，部署信任也可能变化。server 更新、被攻陷的包、注册表失误或 gateway 合并都可能改变模型所看到的内容。

当前协议也改变了安全边界。2026-07-28 没有核心握手，也没有 transport session。若安全设计只按 `Mcp-Session-Id` 键控批准、限流或审计历史，它就不是当前设计。

## 核心概念

### 值得检查的七个攻击面

不要只笼统地说要小心，使用一份具体清单。

1. **元数据投毒。** 描述中包含与声明的工具行为无关的指令。
2. **Descriptor rug pull。** 已经批准的名称、描述、schema 或 annotation 被修改。
3. **跨 server 影子覆盖。** 两个 backend 暴露相同的未限定工具名，而路由悄悄选择了其中一个。
4. **Header 与 body 混淆。** `Mcp-Method` 或 `Mcp-Name` 与 JSON-RPC 请求不一致。
5. **能力升级。** 对端声明某扩展或 client 特性，而 server 把这份声明误当成授权。
6. **MRTR 状态篡改。** client 修改 `requestState`、回答另一个问题，或将确认复用于不同参数。
7. **供应链身份混淆。** 将熟悉的展示名称当作发布者或 server 身份的证明。

这些攻击面彼此重叠。哈希钉定有助于发现 descriptor 变更，却不能证明最初的 descriptor 安全。静态扫描能捕获明显的语句，却捕获不了隐晦指令。命名空间可避免一类冲突，却挡不住恶意的已命名 server。要叠加控制措施。

### 当前请求信封是证据，不是身份

每个 2026-07-28 请求都包含：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "elicitation": {"form": {}}
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "security-lab",
      "version": "1.0.0"
    }
  }
}
```

在每个请求上验证版本和 capability 形状。使用 capability 选择兼容的响应形状。不要将 `clientInfo` 用作经认证的 principal；它由对端自行声明。

同样的警告也适用于结果元数据中的 `io.modelcontextprotocol/serverInfo`。它对日志和调试有用，但不是证书、注册表证明或授权决策。

### 在策略之前验证路由

对于 `tools/call`，Streamable HTTP 包含：

```text
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.export
```

header method 必须等于 body method。header name 必须等于 `params.name`。在选择 backend、应用 RBAC 或消耗限流 token 之前，以 `-32020` 拒绝不一致的请求。

这个顺序消除了一个常见歧义：一个组件按 body 授权，另一个组件却按 header 路由。

连线验证遵循一套精确顺序。验证 JSON-RPC 和元数据类型，比较 header 值与 body，再检查匹配的版本是否受支持。header 不匹配时返回 HTTP 400 和 `-32020`。如果 header 与 body 一致但版本不受支持，则返回 HTTP 400 和 `-32022`，并让 `data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知 method 返回 HTTP 404 和 `-32601`。

每个 error 对象都在契约需要结构化恢复信息时包含可选的 `data`。notification 没有 `id`，所以绝不接收 JSON-RPC 成功或 error 响应。已接受的 HTTP notification 返回空 body 的 202。

### 钉定整个 descriptor

只对描述做哈希会漏掉 schema 和 annotation 变更。规范化并哈希用户所批准的 descriptor 字段：

```python
normalized = json.dumps(tool, sort_keys=True, separators=(",", ":"))
digest = hashlib.sha256(normalized.encode()).hexdigest()
```

使用诸如 `notes.export` 的限定 key 存储 digest；在这个玩具示例之外，还应一同存储发布者证据和批准时间。

每次刷新时：

- 未知 key：隔离，等待审查。
- key 相同、digest 不同：按 rug pull 隔离，直到重新批准。
- 重复的未限定名称：要求确定性的命名空间。
- 扫描器命中：阻止并审查完整 descriptor。

哈希相等证明稳定，不证明安全。一个被投毒的 descriptor 即使被完美钉定，也仍是被投毒的。

### 静态扫描是绊线

简单模式可以标记角色标签、指令覆盖、隐瞒、秘密访问和被混淆的网络目的地。它们足够便宜，适合在安装时和 CI 中执行。

它们不是语义证明。安全的描述也可能在合理的警告里包含被标记的短语；恶意描述也能避开每一个短语。将扫描器输出视为审查证据，而不是自动判定无害的分数。

### 合并之前先命名空间化

假设两个 server 都暴露 `search`。绝不能让发现顺序决定谁胜出。

```text
notes.search
issues.search
```

限定名称是公开的 gateway 名称。单独记录 backend 映射。稳定的名称让批准、审计、哈希钉定和 `Mcp-Name` 路由都指向同一个对象。

### Capability 是兼容性声明

逐请求的 `clientCapabilities` 告诉 server，client 可以处理哪些协议特性；它不会授予 client 访问工具、数据或操作的权限。

授权仍来自经过认证的 principal 和资源策略。顺序如下：

1. 认证 transport 凭据。
2. 验证版本、header 和请求形状。
3. 检查 capability 兼容性。
4. 授权 principal、工具、资源和参数。
5. 执行或请求用户输入。

### 防护无状态 MRTR 确认

有后果的工具可能需要用户确认。当前 MCP 使用 Multi Round-Trip Requests，而不是 server 到 client 的 callback。

第一次响应：

```json
{
  "resultType": "input_required",
  "inputRequests": {
    "confirm": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Export notes to archive?",
        "requestedSchema": {
          "type": "object",
          "properties": {
            "confirm": {"type": "boolean"}
          },
          "required": ["confirm"]
        }
      }
    }
  },
  "requestState": "opaque-integrity-protected-value"
}
```

client 获取输入后，以新的 JSON-RPC id 重试原始 method：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes.export",
    "arguments": {"query": "private", "destination": "archive"},
    "requestState": "opaque-integrity-protected-value",
    "inputResponses": {
      "confirm": {
        "action": "accept",
        "content": {"confirm": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

每个 `inputRequests` 值都是包含 `method` 和 `params` 的完整嵌入式请求。它的 key 必须与 `inputResponses` 中对应条目匹配。form elicitation 使用对象根级的 `requestedSchema`，而且在 server 请求它之前，client 必须已声明 form elicitation capability。

当前 capability 有两种有效的 form 声明。`{"elicitation":{}}` 隐式支持 form elicitation，而 `{"elicitation":{"form":{}}}` 明确声明它。仅 URL 的声明，例如 `{"elicitation":{"url":{}}}`，不支持 form 请求。server 返回 HTTP 400 和 `-32021`，且 `data.requiredCapabilities` 等于 `{"elicitation":{"form":{}}}`。

将 `requestState` 当作敌对输入。对它签名或加密，验证它，并将它绑定到 method、工具、精确参数、目的、过期时间、principal，以及在重放重要时的一次性 nonce。本课代码使用 HMAC 和精确参数匹配来让这条边界清晰可见。

nonce ledger 不能存放在单个 gateway 对象中。可运行模型注入了一个有界、TTL 修剪的重放存储，可由多个 gateway 实例共享。它的原子 claim 是执行边界：只有经过验证的接受或明确的终态拒绝会消耗状态。格式错误的响应或 `cancel` 不执行任何操作，并且在过期前仍可重试。生产集群需要在共享的持久化存储中实现相同的条件 claim。

不要把隐藏的确认上下文存进协议 session。任何 server 实例都应能验证重试。

### 高风险调用的 Rule of Two

沿三个轴对调用分类：

- 它消耗不可信输入。
- 它能访问敏感数据。
- 它会造成有后果的外部操作。

单个自动化步骤不应同时组合三者。拆分它、降低权限，或通过 MRTR 请求明确的用户输入。这是一条设计启发式，不是协议 capability。

### 在执行前降低权限

无状态本身不是安全。它移除了隐藏的协议历史，但一个自包含请求仍可能要求权限过大的 handler 泄露数据或作出不可逆更改。安全来自在每个边界降低权限：

1. **带类型的动词。** 暴露一个有边界的操作，例如 `archive_note`，不要暴露能表达无关权限的通用 `run` 或 `request` 工具。
2. **已验证的参数。** 尽可能使用封闭 schema，拒绝未知字段，只规范化一次标识符，限制大小，并在策略求值之前验证目标、tenant 和资源所有权。
3. **当前授权。** 将经认证的 principal 绑定到精确动词、资源、环境和规范化参数。工具 annotation 和 client capability 不授予这种权限。
4. **操作绑定的批准。** 对有后果的调用，将批准绑定到带类型动词和规范化参数的 digest，再加上 principal、过期时间和一次性策略。任何字段变更都需要新的决策。
5. **一等拒绝。** 将拒绝、批准过期、用户拒绝和不安全目的地建模为不执行副作用的正常结果。不要把拒绝转换为权限更弱的后备工具。
6. **脱敏的审计证据。** 记录谁发起请求、使用了哪个准入的 descriptor 和策略版本、哪个规范化目标获授权、决策为何允许或拒绝，以及执行是否开始。存储 digest 或脱敏值，而非秘密。

每一步都收窄下一组件可执行的范围。最终 handler 接收的应是已经验证的领域命令，而不是原始模型文本加宽泛凭据。在 MRTR 重试、task update 或 gateway 转发调用时，重复整个链条。早先的批准不会把后续请求变成可信的 session 流量。

### 当前与旧版交互路径

对于新的 2026-07-28 实现，Roots、Sampling 和 Logging 都已废弃。gateway 可以保留旧的请求通道代码，但只能作为由版本控制的兼容路径。

不要围绕按 session 的 sampling limiter 构建新的防御。将配额应用于经过认证的 principal、issuer、资源、工具和时间窗口。对于当前的交互工作，检查 MRTR 输入请求和响应。

### 无状态 transport 检查

- 在唯一的 POST endpoint 接受现代 MCP 消息。
- 对现代 GET 和 DELETE 返回 405。
- 不生成或依赖 `Mcp-Session-Id`。
- 忽略旧版 session 和 replay header 作为授权输入。
- 对该 POST 返回 JSON 或请求范围的 SSE。
- 只为选择加入的长期变更通知使用 `subscriptions/listen`。

```figure
tp-tool-poisoning
```

## 动手构建

`code/main.py` 实现了一个小型进程内安全 gateway 模型。它规范化并钉定完整工具 descriptor，报告元数据投毒和影子覆盖，验证现代请求信封和路由值，并借助已签名的 `requestState` 与注入的共享重放存储执行两轮确认导出。

该模型从 HTTP adapter 已解析 JSON body 和路由 header 后开始。它不验证 `Content-Type` 或 `Accept`。将同一个 dispatcher 接入第 09 课的完整 Streamable HTTP adapter；后者要求 `Content-Type: application/json`，并要求 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行它：

```bash
cd phases/13-tools-and-protocols/15-mcp-security-tool-poisoning
python3 code/main.py
python3 -m unittest discover code/tests -v
```

示例会故意变异一个 descriptor。扫描器和 digest 比较会产生彼此独立的发现。随后导出会演示 `input_required` 响应和无状态重试。

## 实际使用

用来自你自己的已批准 servers 的规范化快照替换 `SAFE_TOOLS`。不要在快照中保留凭据和秘密。更新 digest 前，审查每个新的或已变更的 descriptor。

在 gateway 中，于发现阶段执行同样检查，并在 dispatch 前再次执行。缓存可以减少发现工作，但缓存的批准必须在 descriptor 变更时过期或失效。

## 拿去用

本课交付 `outputs/skill-mcp-threat-model.md`。它会产出一份针对当前协议的威胁模型，覆盖元数据、路由、capability、授权、MRTR、缓存、注册表和兼容性边界。

## 练习

1. 将经过认证的 principal 和当前授权决策绑定到密封的 MRTR 状态，然后拒绝不同 principal 下的重试。
2. 用持久化条件插入替换内存内重放存储，并证明两个进程不能同时 claim 一个 nonce。
3. 在重放 claim 后、模拟导出前注入失败。定义并测试能够安全恢复的事务或幂等规则。
4. 在不更改工具描述的情况下更改工具的 `inputSchema`。确认完整 descriptor 钉定能捕获它。
5. 添加一条策略：当 `tools/list` 因 principal 而异时，拒绝公开缓存。
6. 在 gateway 后模拟较旧的 server。将所有握手和 session 行为置于明确的 `2025-11-25` 兼容分支之后。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 元数据投毒 | 嵌入工具 descriptor 的指令或欺骗性声明 |
| Rug pull | 对先前已批准 descriptor 的变更 |
| 工具影子覆盖 | 由重复的未限定名称引起的歧义路由 |
| Header 不匹配 | 路由 header 与 JSON-RPC body 不一致，错误为 `-32020` |
| 哈希钉定 | 完整已批准 descriptor 的 digest |
| MRTR | server 请求输入时使用的无状态响应与重试模式 |
| `requestState` | 必须视为不可信输入的 opaque 往返值 |
| Capability 声明 | 协议兼容性声明，不是授权 |
| 隐式 form 支持 | 空的 `elicitation` capability 对象，等同于支持 form |
| 限定工具名 | 稳定的 gateway 名称，例如 `notes.search` |

## 延伸阅读

- [MCP security and trust guidance](https://modelcontextprotocol.io/specification/2026-07-28#security-and-trust--safety)
- [Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Deprecated features](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
