# MCP Resources 与 Prompts：为无状态 Server 提供可寻址上下文

> Tools 执行操作。Resources 暴露可寻址内容。Prompts 打包由用户选择的消息模板。好的 MCP server 会让这些契约保持分离且可预测。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13，第 07 课（构建 MCP Server），阶段 13，第 09 课（MCP Transports）
**预计时间：** 约 60 分钟

## 学习目标

- 根据消费者的 intent，在 tools、resources 和 prompts 之间选择。
- 通过必需的 `server/discover` 声明 resource 和 prompt surface。
- 构建确定性的 `resources/list` 和 `prompts/list` results。
- 应用 `ttlMs` 和 `cacheScope`，且不泄漏用户专属 data。
- 对无效或未知 resource URI 返回 JSON-RPC error `-32602`。
- 打开 `subscriptions/listen` POST-response stream，并以 subscription ID 关联每个 event。
- 将 resource content 和 prompt templates 视为不可信 server output。

## 从消费者开始

误用 MCP 最容易的方式，就是从实现代码开始。因为 functions 很熟悉，database query 被做成 tool；因为可复用 workflow 存储在 file 中，被做成 resource；因为 host 能注入它，prompt 被做成隐藏 policy。

从选择者是谁、他们期望什么开始。

| 基元 | 主要意图 | 选择者 | 典型结果 |
|---|---|---|---|
| Tool | 执行一项操作 | 模型或 application | 结构化 action result |
| Resource | 读取某个 URI 的内容 | Host、application 或用户 | Text 或 binary content |
| Prompt | 启动可复用的消息 workflow | 用户通过 host UI | 一条或多条 prompt messages |

`notes://note-1` 的 note 是 resource，因为它是可寻址内容。`delete_note` 是 tool，因为它改变 state。`review_note` 是 prompt，因为用户选择了一个准备好的 review workflow。

不要为了看起来完整，就将一项 operation 同时暴露为三种形态。每个额外 surface 都需要 discovery、authorization、caching、error handling、tests 和 documentation。

## 2026-07-28 无状态外壳

本课针对 MCP 协议修订版 `2026-07-28`。在该 profile 中没有 initialization handshake 或协议 session。每条请求都在保留的 `_meta` keys 中携带协议版本和 client capabilities。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

server 必须实现 `server/discover`。其结果声明支持的
versions、resource 和 prompt capabilities、implementation identity，以及
cache hints。client 可以直接调用其他 method，但 discovery 会在构建 UI 前为它提供
一份稳定 snapshot。

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "resources": {"listChanged": true, "subscribe": true},
    "prompts": {"listChanged": true}
  },
  "ttlMs": 3600000,
  "cacheScope": "public"
}
```

普通结果声明 `"resultType": "complete"`。response `_meta` 以 `io.modelcontextprotocol/serverInfo` 标识提供服务的 implementation。这些信息有助于 diagnostics，不是 authentication identity。携带不支持 revision 的请求返回 `-32022`，其中包含所请求 revision 和 server 支持的 revisions。

无状态契约改变了你的设计直觉。列表不能依赖于某条 connection 上的此前调用。因为 credentials 是请求输入，authorization 可以改变可见集合；但 connection history 不可以。

## Resources 是稳定的 URI 契约

resource 是由 URI 标识的 content。在编写 handler 前先设计 URI。

良好 URI 的属性：

- 足够稳定，能被书签收藏或在 requests 之间传递。
- 位于 server domain 的 namespace 中。
- 独立于 process ID 或 connection。
- 在访问 storage 前通过校验。
- 在每次读取时授权。

`notes://note-1` 比 `note-1` 更好，因为它的 namespace 明确。file server 可以使用 `file://` URIs，但在解析 symlinks 和 relative segments 后，仍必须检查配置的 directory boundaries。

`resources/list` 返回当前对 caller 可见的 resources。按 URI 等稳定 key 排序。确定性顺序能防止噪声 cache misses、变化的 snapshots，以及在刷新之间跳动的 host UIs。

```json
{
  "resultType": "complete",
  "resources": [
    {
      "uri": "notes://note-1",
      "name": "Architecture decision",
      "description": "Why the service uses a stateless boundary",
      "mimeType": "text/markdown"
    }
  ],
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "notes-server",
      "version": "2.0.0"
    }
  }
}
```

`resources/read` 返回一个或多个 content items。未知 URI 不是成功的空读取。当前 Resources specification 将无效或未知 resource URIs 归为 JSON-RPC invalid parameters，code 为 `-32602`。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32602,
    "message": "Unknown or invalid resource URI",
    "data": {
      "uri": "notes://missing"
    }
  }
}
```

这种区分让 client 能够将不存在与有效的空 document 分开，也防止意外回退到更宽泛的 lookup。

### Resource templates

resource template 描述一族参数化 URIs。当列出每个 concrete item 成本很高或无界时，使用 template。例如，`notes://projects/{project}/decisions/{decision}` 告诉 client 如何构造有效 address，而无需返回每项 decision。

template 不会削弱校验。解析 variables，应用 authorization，执行长度和字符 limits，并用 typed parameters 构建 storage queries。绝不要将任意 URI tail 拼接到 filesystem path 或 database statement 中。

### Content 不是可信指令

resource text 可能含 prompt injection、secrets、误导性 commands 或格式错误 markup。host 应保留 provenance，并将 resource content 视为 data。server 应限制 content size、返回准确 MIME type、脱敏 caller 无权访问的 fields，并避免返回无关 records。

## Prompts 是用户控制的模板

MCP prompts 用于显式的用户选择。host 可以将它们呈现为 slash commands、menu items 或 workflow buttons；协议不要求某一种 UI。

在同一请求 authorization 下，`prompts/list` 应当保持确定性。每个 prompt 需要稳定 name、有用 description，以及让 host 在 `prompts/get` 前收集输入的 argument declarations。

```json
{
  "resultType": "complete",
  "prompts": [
    {
      "name": "review_note",
      "title": "Review a note",
      "description": "Review one note for a named concern",
      "arguments": [
        {
          "name": "uri",
          "description": "The note resource URI",
          "required": true
        }
      ]
    }
  ],
  "ttlMs": 600000,
  "cacheScope": "public"
}
```

`prompts/get` 将 arguments 解析为 messages。它不能替代 host 的 system instructions。host 决定返回 messages 如何进入模型 context，并将自己可信 policy 保持在更高 priority。

在 server boundary 校验 prompt arguments。prompt URI 应通过与直接 resource read 相同的 authorization check。不要让 prompt 成为绕过 resource access 的 side channel。

## Cache Hints 是正确性的一部分

`ttlMs` 告诉 client 一个结果可以复用多久。`cacheScope` 描述谁可以共享该 cached value。

| Scope | 含义 | 典型用途 |
|---|---|---|
| `public` | 当 authorization 允许时，可跨用户复用 | 公共 prompt catalog |
| `private` | 绑定到请求用户或 credential context | 用户拥有的 note content |

根据 data 的 change rate 和 stale 造成的损害选择 TTL。五分钟可能适合公共 prompt catalog；私有 note read 可使用一分钟。

MCP 仅将 `public` 和 `private` 定义为 `cacheScope` values。对于含 secrets 或快速变化的结果，返回 `cacheScope: "private"` 与 `ttlMs: 0`，然后在 host cache policy 中应用任何更严格的 no-store rule。`no-store` 本身不是 MCP `cacheScope` value。

cache hints 永远不能替代 authorization。cache key 必须包含会改变可见性的每个请求维度，包括 tenant、user、scope、locale 和 pagination cursor。若共享 cache 无法安全表达这些维度，使用 zero TTL 的 `private`，并采用 host-level no-store policy。

## Subscriptions 使用 client 打开的 Response Stream

现代 subscription pattern 取代了此前的 `resources/subscribe` RPC 和旧 HTTP GET event endpoint。

client 将 `subscriptions/listen` 作为普通 JSON-RPC request 发送。通过 Streamable HTTP 时，它是一个 response 保持打开的 POST，其形态为 SSE stream。`notifications` object 是 allowlist，server 不得提供未请求的 notification types。

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "subscriptions/listen",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    },
    "notifications": {
      "resourcesListChanged": true,
      "promptsListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

request ID 就是 subscription ID。在任何被请求 event 之前，server 发送 `notifications/subscriptions/acknowledged`。其 filter 只包含 server 接受的子集。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "notifications": {
      "resourcesListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

该 stream 上的每个后续 event 都携带相同 metadata。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "uri": "notes://note-1"
  }
}
```

notification 表示 resource 已变化。client 受当前 authorization 约束，重新通过 `resources/read` 读取它；不应假定 event 包含新 document。

多个 subscriptions 可以共享一个 stdio channel。subscription ID 让 client 能够 demultiplex 它们。通过 HTTP 时，关闭 response stream 会取消 subscription。server 正常结束 stream 时，会返回与原始请求关联的最终 `resultType: "complete"` response。

不要将 subscription stream 用作协议 session。后续 read 仍是一条完整请求，可以到达任何健康 server instance。

```figure
t3-primitive-sort
```

## 交互实验

使用 figure 对项目 tracker 的五种 capabilities 分类：issue details、create issue、sprint review template、project policy 和 close issue。然后决定哪些 lists 可以公共缓存、哪些 reads 必须保持私有、哪些 resources 值得 update notifications。

对每个分类，指出选择者。如果模型执行 action，使用 tool；如果 host 读取 URI-addressed content，使用 resource；如果用户启动准备好的 message workflow，使用 prompt。

## 实践实验

从仓库根目录运行 simulator：

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

按以下顺序检查 transcript：

1. 确认 `server/discover` 声明当前 revision 和两种 capabilities。
2. 确认两个 list results 都排序，且使用 `resultType: "complete"`。
3. 确认 list 和 read results 携带有意设定的 cache hints。
4. 将 read URI 改为 `notes://missing`，并观察 `-32602`。
5. 确认 subscription acknowledgment 先于 resource event。
6. 确认 event 和正常关闭均携带 subscription ID `5`。

Python model 不会打开真实 HTTP connection。它表示 SDK 必须放入请求范围 response stream 的消息。生产环境中应使用官方 SDK 负责 framing 和 transport。

## 交付产物

`outputs/skill-primitive-splitter.md` 是一份可复用的 MCP 基元选择设计审查。它现在检查确定性 discovery、cache scope、无效 URI 行为和现代 subscription filters。

本课还交付 `assets/primitive-split.svg`，它是离线学习用的静态基元与 subscription boundary 图。

## 验证

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果：主程序打印 JSON transcript，测试命令报告至少十二个通过的 tests。

## 综合项目关联

当你的 capstone server 在 actions 旁暴露可寻址 knowledge 时，使用这份契约。包含一份确定性 catalog snapshot、一次已授权 resource read、一次 prompt resolution、一个无效 URI case 和一份 subscription transcript。

你的 evidence 应表明没有任何 list 依赖 connection history，且 subscription event 从不授予对底层 resource 的访问权。

## 练习

1. 添加 `notes://projects/{project}/notes/{id}` resource template，并校验两个 variables。
2. 为 `resources/list` 添加 pagination，同时保留确定性顺序。
3. 将一个 resource 改为 `cacheScope: "private"` 与 `ttlMs: 0`，加入 host-level no-store policy，并解释同时需要两种控制的 threat。
4. 添加 prompt-list change subscription，并证明当 filter 省略 `promptsListChanged` 时不会发送 event。
5. 创建两个同时存在的 subscriptions，并证明每个 event 都携带正确 request ID。
6. 为 read handler 添加 authorization subject，并证明 cache entry 不能跨 subjects。

## 关键术语

- **Resource：** 由 MCP server 暴露的 URI-addressed content。
- **Prompt：** 由 MCP server 暴露、由用户控制的 message template。
- **确定性列表：** 对同一请求输入，membership 和 ordering 稳定的 discovery result。
- **`ttlMs`：** 以毫秒计的 cache freshness duration。
- **`cacheScope`：** cached result 的 sharing boundary。
- **`subscriptions/listen`：** response stream 提供明确过滤 notifications 的 long-lived request。
- **Subscription ID：** 原始 listen request ID，会在 notification metadata 中重复。
- **无效 parameters：** 用于无效或未知 resource URI 的 JSON-RPC error `-32602`。
- **不支持的协议版本：** 包含 `supported` 与 `requested` revisions 的 JSON-RPC error `-32022`。
- **`server/discover`：** 返回支持 revisions、capabilities、identity 和可选 cache hints 的必需 server method。

## 延伸阅读

- [MCP 2026-07-28 Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP 2026-07-28 Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP 2026-07-28 Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 Caching](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/caching)
