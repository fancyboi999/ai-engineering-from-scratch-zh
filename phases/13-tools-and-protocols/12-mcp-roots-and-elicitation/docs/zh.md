# 显式 Scope 与无状态 Elicitation

> Roots 在 MCP 2026-07-28 中已弃用，且从来不是 security sandbox。将 scope 放入可见的 tool arguments 或 resource URIs，在 server 授权；当 tool 确实需要用户输入时使用 MRTR。用户看到决策，模型看到 handle，任一 server instance 都能处理 retry。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 07（MCP server），阶段 13 · 11（无状态 MRTR）
**预计时间：** 约 60 分钟

## 学习目标

- 以显式 workspace parameters、resource URIs 或 server configuration 替换已弃用 Roots。
- 将 scope hints 与 authorization、path containment 和 operating-system sandboxing 分开。
- 通过 MRTR `input_required` result 提供 form-mode `elicitation/create`。
- 在逐请求 client capabilities 中声明 elicitation support，并拒绝不支持的 modes。
- 将 `accept`、`decline` 和 `cancel` 校验为不同 outcomes。
- 将破坏性确认绑定到 authenticated principal、原始 arguments、candidate set 和 expiry。

## 两个看似相同的问题

一个 notes tool 收到请求：“删除旧的 TPS report。”

server 必须回答两个不同问题：

1. 这项操作可以触及哪个 workspace？
2. 三条匹配 notes 中，用户指的是哪一条？

第一个是 scope 和 authorization，第二个是交互式 disambiguation。混淆它们会导致危险设计，例如将 client 提供的 folder 视为 caller 可以删除其内所有内容的证明。

## Roots 是迁移 surface

早期 MCP 修订版允许 client 声明 Roots，并在列表变化时通知 server。Roots 是信息性 guidance：它们不约束 server process 可读取的内容，不授权 caller，也不创建 operating-system sandbox。

MCP 2026-07-28 为新设计弃用了 `roots/list` 与 `notifications/roots/list_changed`。优先使用以下显式替代方案之一：

- 当 scope 每次 call 变化时，使用 `workspaceUri` 或 `directory` tool argument。
- 当 operation 已针对 resource 时，使用 resource URI。
- 当一个 deployment 拥有一个固定 workspace 时，使用 server configuration。
- 当 code 在技术上必须无法逃逸时，使用 process sandbox 或 jailed filesystem。

若现有 2026-07-28 integration 在弃用窗口内仍需 `roots/list`，server 将其嵌入 MRTR `inputRequests`；不得发送实时 reverse request。这是 migration adapter，新 handlers 应改为接受显式 scope。

模型能看到并重复显式 handle；隐藏的 transport-session scope 更难检查、replay、audit 和 route。

### 三层规则

显式 URI 仍不会自行授权。执行全部三层：

1. **Authorization：** 这个 authenticated principal 是否允许使用该 workspace？
2. **Containment：** 正规化的 target URI 是否保持在已授权 workspace boundary 内？
3. **Sandbox：** 即使 server 被攻破，operating system 能否阻止它逃逸？

可运行的 server 维护已授权 workspace URIs 的 allowlist，正规化 percent-encoded paths，检查真实 path-component boundary，并在删除前立即重新检查 containment。

朴素 string-prefix checks 是错误的：

```text
allowed:   file:///work/notes
attacker:  file:///work/notes-evil/secret.md
traversal: file:///work/notes/%2e%2e/private.md
```

两个 hostile paths 都以误导性的 string 开头。先正规化，再比较 path components。生产 filesystem server 还必须防御 symbolic-link races 和 platform-specific path semantics。

## Elicitation 仍存在，但传递方式改变

Elicitation 是当前用于在 `tools/call`、`prompts/get` 或 `resources/read` 期间收集用户 input 的 client feature。method name 保持为 `elicitation/create`，变化的是 wire flow 的方向。

2026-07-28 server 不发送反向 JSON-RPC request，而是返回 `InputRequiredResult`：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "delete_choice": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Choose one matching note and confirm deletion.",
          "requestedSchema": {
            "type": "object",
            "properties": {
              "note_id": {
                "type": "string",
                "enum": ["note-3", "note-7", "note-14"]
              },
              "confirm": {"type": "boolean"}
            },
            "required": ["note_id", "confirm"]
          }
        }
      }
    },
    "requestState": "integrity-protected-delete-state"
  }
}
```

host 渲染 form。用户可以 accept、明确 decline 或 dismiss。随后 client 以新的 id 重试原始 `tools/call`：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes_delete",
    "arguments": {
      "workspaceUri": "file:///Users/alice/Documents/Notes",
      "title": "TPS report"
    },
    "inputResponses": {
      "delete_choice": {
        "action": "accept",
        "content": {"note_id": "note-14", "confirm": true}
      }
    },
    "requestState": "integrity-protected-delete-state",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

两次 calls 之间不存在协议 session。server 校验回显 state，将 response 按预期 schema 校验，检查所选 note 位于已签名 candidate set 中，重新授权 workspace、重新检查 containment，然后才删除。

## Capability Negotiation 是逐请求的

支持 form-mode elicitation 的 client 声明：

```json
{
  "io.modelcontextprotocol/clientCapabilities": {
    "elicitation": {"form": {}}
  }
}
```

空 elicitation capability，即 `"elicitation": {}`，为兼容性仍等同于仅 form support。显式 `"elicitation": {"form": {}}` 也支持 form mode；仅 URL 声明 `"elicitation": {"url": {}}` 则不支持。server 不得嵌入当前 request capabilities 中缺少的 mode，即使此前 request 曾声明它。

每条请求还携带 `io.modelcontextprotocol/protocolVersion`。缺失或非字符串 version 返回 `-32602`；不支持 string 返回带精确 `supported` 与 `requested` data 的 `-32022`。缺少或仅 URL 的 elicitation support 返回 `-32021`，其 `data.requiredCapabilities` 为 `{"elicitation":{"form":{}}}`。

没有 JSON-RPC `id` 的 envelope 是 notification。处理它但不发送 JSON-RPC success 或 error response。在 Streamable HTTP 上，已接受 notification 返回无 body 的 `202 Accepted`。

`clientInfo` 应包含在 diagnostics 中，但它是 self-reported，不能用于为 authorization 识别用户。

server 实现 `server/discover`，返回带 `resultType: "complete"` 的 `supportedVersions`、capabilities、`ttlMs` 和 `cacheScope`。本现代设计不声明 Roots。因为它声明 tools，也实现必需的 `tools/list`。该 result 返回确定性的 `notes_delete` descriptor、有效 object `inputSchema`、server identity metadata 和 public cache hints。

## Form Mode

Form mode 使用面向可用 dialogs 的受限 JSON Schema。root 是 object，其 properties 是 flat primitive fields 或受支持的 enum arrays。深度嵌套 objects 与通用 document schemas 不属于 confirmation dialog。

将 form mode 用于：

- 从多个 candidates 中选择一个；
- 确认破坏性 operation；
- 收集非敏感 preferences；
- 收集少量必须由用户而非模型决定的 values。

不要将 form mode 用于 passwords、API keys、access tokens 或 payment credentials。这些 secrets 会经过 MCP client，且可能进入 logs 或 model context。

server 会再次校验返回 content。client-side form validation 改善 UX，但不创造 trust。

## URL Mode

URL mode 为 out-of-band interaction 发送安全 web URL：

```json
{
  "method": "elicitation/create",
  "params": {
    "mode": "url",
    "message": "Connect the report service to continue.",
    "url": "https://mcp.example.com/connect/report-service"
  }
}
```

当敏感 information 必须直接进入 server-controlled web flow（如 third-party authorization）时使用它。client 在打开前显示完整 destination 并获取 consent，不得 prefetch URL。

`accept` response 表示用户同意打开 URL，不证明外部 flow 已完成。retry 时，server 检查自身 state，并完成或返回另一个 `input_required` result。

URL elicitation 不替代 MCP client 和 MCP server 间的 authorization。它用于 MCP server 需要代表用户完成的外部 interaction。server 必须将 browser user 绑定到启动该 MCP operation 的同一 authenticated principal。

## Response Branches

将 actions 视为 product decisions，而非 aliases：

| Action | 含义 | 安全的 server 行为 |
|--------|---------|----------------------|
| `accept` | 用户提交 interaction | 校验 content 并继续 |
| `decline` | 用户明确拒绝 | 返回 complete、non-error 的拒绝 outcome |
| `cancel` | 用户关闭或无法完成 | 安全停止，并允许之后 retry |

绝不将缺失 content 解释为 consent，也绝不将 decline 转换为重复 prompt loop。

## 保护破坏性 MRTR State

candidate list 不能仅存在于 prompt 或未签名 Base64 value 中，client 控制它发回的每件内容。

本课签名一个包含以下内容的 state payload：

- authenticated principal；
- originating method；
- `workspaceUri` 与 `title` 的 digest；
- form 中展示的 allowed note ids；
- operation phase；
- 短 expiry。

mutation 前，server 也会检查 live note record。这能捕获 deletion races，以及 form 展示后 target 被移出 workspace 的情况。

对于一次性 financial 或不可逆 action，仅 HMAC 无法阻止有效 state 在 expiry 内被 replay。将 nonce 恰好一次地存储和消费在每个 handler instance 共享的 replay store 中。本课注入一个有界、TTL-pruned store，并在执行 in-memory deletion 时保持其原子 claim。生产 database 应在一个 transaction 或等价 conditional-write boundary 内耦合 nonce claim 和 mutation。

在 claim nonce 前校验 interaction。格式错误 response 或 `cancel` 不执行 mutation，并让 state 在 expiry 前保持可重试；明确 `decline` 是终态，因此本课消费 nonce 但不删除内容。

```figure
t3-roots-boundary
```

## 动手构建

`code/main.py` 演示一个现代 `notes_delete` tool：

- `tools/list` 返回带所需 workspace 和 title schema 的确定性、可缓存 descriptor。
- Scope 是显式 `workspaceUri` argument。
- Server configuration 为 lesson principal 授权该 workspace。
- URI normalization 拒绝 prefix confusion 和 encoded traversal。
- 每次破坏性 deletion 都要求 form-mode elicitation。
- Elicitation 在 `resultType: "input_required"` 中传递。
- 已签名 `requestState` 绑定精确 candidate list 与原始 arguments。
- 注入的 replay store 拒绝跨 server instances 的同一已接受或已拒绝 state。
- Retry 使用新的 request id，并返回 `resultType: "complete"`。

data store 在内存中，便于检查协议行为；使用 database 时 security rules 不变。

## 实际使用

从 repository root：

```bash
cd phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code
python3 main.py
python3 -m unittest discover tests -v
```

预期 checkpoints：

- Discovery 声明 tools，但不声明 Roots。
- Tool discovery 返回带 `resultType`、server identity 和 cache hints 的 `notes_delete`。
- Request id `1` 在 `inputRequests.delete_choice` 中返回 form。
- Request id `2` 回显 signed state 并完成 deletion。
- prefix path 和 encoded traversal path 都无法通过 containment。
- 修改 title 不能复用原 confirmation state。
- decline 保持 note 不变。
- 两个共享 note 与 replay state 的 server objects 无法同时执行一次 confirmation。
- 空与显式 form declarations 可用，只有 URL support 返回精确 `-32021` form requirements。
- 不支持 version failures 使用精确 `-32022` data shape。
- 无 id notification 不产生 JSON-RPC response。

## 拿去用

`outputs/skill-elicitation-form-designer.md` 设计显式 scope、authorization checks、MRTR form、response branches 和 state binding。它拒绝将已弃用 Roots 当作 sandbox，或通过 form mode 收集 secrets。

## 练习

1. 将 in-memory replay store 替换为 SQLite。用一个 transaction claim nonce 并删除 note，然后证明两个 processes 无法同时 commit。
2. 添加 `url` capability negotiation 与 out-of-band setup flow。将 third-party credentials 留在 `inputResponses` 之外。
3. 将 in-memory note map 替换为临时 SQLite database。在 mutation transaction 内重新检查 authorization 与 containment。
4. 为真实 filesystem implementation 添加 symbolic-link policy。解释为何仅 URI lexical containment 无法阻止 symlink escape。
5. 设计一个 2025-11-25 adapter，将现代 MRTR handler output 映射到旧版 server-initiated elicitation；将它与当前 handler 隔离。

## 关键术语

| 术语 | 在 2026-07-28 中的含义 |
|------|------------------------|
| Roots | 已弃用的信息性 workspace hints，不是 authorization 或 sandboxing |
| 显式 scope | 请求 arguments 中可见的 workspace、directory 或 resource handle |
| Containment | 将 target 保持在 boundary 内的正规化 path-component check |
| Elicitation | 在 MCP operation 中获取用户 input 的 client feature |
| Form mode | 使用受限 flat schema 的 in-band structured user input |
| URL mode | 面向敏感或外部 workflows 的 out-of-band interaction |
| MRTR | 无状态 input-required result 后接新的 retry |
| `requestState` | client 原样回显并由 server integrity-check 的不透明 state |
| Decline | 用户明确拒绝 |
| Cancel | 没有 approval 的关闭或未完成 interaction |

## 旧版兼容性

对固定在 2025-11-25 的 peer，`roots/list`、`notifications/roots/list_changed` 和实时 server-initiated `elicitation/create` 仍可能存在。将那个 adapter 标记为旧版。不要让旧版 Root list 绕过 server authorization，也不要将协议 session assumptions 带入现代 handler。

## 延伸阅读

- [MCP 2026-07-28 Elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 Roots deprecation](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [MCP 2026-07-28 server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
