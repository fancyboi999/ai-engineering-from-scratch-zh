# MCP Model Input：Sampling 迁移与无状态 MRTR

> MCP 2026-07-28 不推荐为新设计使用 Sampling，并移除了 server-to-client request channel。若现有 workflow 仍需 client 的 model，server 返回 `input_required` result，client 携带 model output 重试原始 request。推理 loop 在协议层变得显式、有界且无状态。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 07（MCP server），阶段 13 · 10（resources 与 prompts）
**预计时间：** 约 75 分钟

## 学习目标

- 解释为何 MCP 2026-07-28 不推荐 Sampling，并为新 servers 选择 direct model integration 默认方案。
- 实现通过多轮往返请求（MRTR）承载 `sampling/createMessage` 的兼容 workflow。
- 在每个请求 `_meta` object 中放入协议 revision 和 client capabilities。
- 返回 `resultType: "input_required"`，并以新的 JSON-RPC id 重试原始 method。
- 完整性保护 `requestState`，并将其绑定到 principal、method、arguments 和 expiry。
- 使用 capability checks、approval、response validation 和 round limit 约束 model-assisted loops。

## 协议之前的决策

像 `summarize_repo` 这样的 tool 需要两类 work：

1. 确定性 work：列出 files、读取允许的 files、校验 paths，并组装 content。
2. Model work：选择有代表性的 files，并综合 summary。

现在有两种有效架构。

### 新 server：直接集成 model provider

这是当前默认方案。server 拥有 model selection、credentials、budgets、retries 和 observability。它向 MCP client 返回一个普通 `tools/call` result。

当 server 已是 hosted service，或可预测的 model behavior 比使用 host model 更重要时，选择它。

### 现有 Sampling workflow：迁移到 MRTR

Sampling 在弃用窗口内仍然存在。面向 2026-07-28 的 server 不能向 client 发回实时 `sampling/createMessage` request，而是在 `InputRequiredResult` 中嵌入该 request。

仅当使用 client model 和 credentials 是真实 product requirement 时选择这条兼容路径。记录 removal plan，因为新 implementations 不应采用已弃用的 Sampling。

## 无状态契约

2026 年 7 月协议没有 `initialize` exchange、没有 `notifications/initialized`，也没有 `Mcp-Session-Id`。每条请求都携带原先位于 handshake 中的信息：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}},
      "io.modelcontextprotocol/clientInfo": {
        "name": "lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

server 在每条请求上校验 revision。缺失或非字符串 version 属于 invalid params，返回 `-32602`。不支持的字符串返回 `-32022`，其精确 data 为 `{"supported":["2026-07-28"],"requested":"<client version>"}`。缺少 Sampling capability 返回 `-32021`，其 `data.requiredCapabilities` 设为 `{"sampling":{}}`。

没有 JSON-RPC `id` 的 envelope 是 notification。receiver 可以处理它，但既不发送 success response，也不发送 error response。Streamable HTTP adapter 对已接受 notification 返回无 body 的 `202 Accepted`。

server 还要实现带精确 `supportedVersions` key、capabilities、`ttlMs` 和 `cacheScope` 的 `server/discover`，使 client 可以在调用 tool 前了解并缓存 server contract。因为 discovery 声明了 `tools`，server 也实现必需的 `tools/list`。其确定性的 `summarize_repo` descriptor 包含有效 object `inputSchema`、`resultType: "complete"`、server identity metadata 和 public cache hints。

每个成功的现代 result 都有 discriminator：

- `resultType: "complete"` 表示 operation 已完成。
- `resultType: "input_required"` 表示 client 必须满足嵌入的 requests 后重试。
- Extensions 可定义额外 result types。Tasks extension 在第 13 课加入了 `"task"`。

## 一轮 MRTR

server 在处理 request 时不能调用 client，因此返回此 result：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "pick_files": {
        "method": "sampling/createMessage",
        "params": {
          "messages": [
            {
              "role": "user",
              "content": {
                "type": "text",
                "text": "Choose three representative files and return a JSON array."
              }
            }
          ],
          "systemPrompt": "Return only the requested value.",
          "modelPreferences": {
            "costPriority": 0.8,
            "intelligencePriority": 0.2
          },
          "maxTokens": 400
        }
      }
    },
    "requestState": "opaque-integrity-protected-value"
  }
}
```

client 校验自己支持 Sampling，应用自己的 approval 和 model policies，并获得 model response。随后它以不同 JSON-RPC id 发送一条新 request：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "inputResponses": {
      "pick_files": {
        "role": "assistant",
        "content": {
          "type": "text",
          "text": "[\"README.md\", \"server.py\", \"docs/intro.md\"]"
        },
        "model": "host-model",
        "stopReason": "endTurn"
      }
    },
    "requestState": "opaque-integrity-protected-value",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}}
    }
  }
}
```

retry 不是协议 session 的 continuation。它是新请求：重复原始 method 和 arguments，仅添加当前 round 的 `inputResponses`，并逐字回显 `requestState`。

MRTR 只允许用于 `tools/call`、`prompts/get` 和 `resources/read`。server 不得从无关 methods 返回 `input_required`。

## 多轮状态

本课需要两次 model calls：

1. `pick_files` 返回 JSON array。
2. `summary` 返回最终 prose。

每次 retry 只携带该 round 的 responses。因此，server 将 phase 和已校验 intermediate data 放入下一个 `requestState`。

将该 value 视为 attacker-controlled。仅签名原始 phase name 不够。将 state 绑定到：

- authenticated principal，而非 self-reported `clientInfo`；
- originating method；
- 原始 arguments 的 digest；
- 较短 expiry；
- 当前 phase 和已校验 intermediate values。

不要求 confidentiality 时使用 HMAC；client 不应读取 state 时使用 authenticated encryption。对错误 signature、过期 value、变更 principal 或变更 arguments，返回 `-32602`。

client 不得解析或修改 `requestState`。它唯一的工作是，在 retry 中回显完全相同的 string。

## Model Preferences 是 Hints

`costPriority`、`speedPriority` 和 `intelligencePriority` 是彼此独立的 preferences。它们不是 probability distribution，也不需要加和为一。client 可以忽略它们，因为 client 拥有 model policy。

如果维护旧版 Sampling flow，将 `includeContext` 保持为 `"none"`。其他 context modes 会提高 leakage risk，且它们本身也已弃用。在 request 中传入最少的显式 context。

## 安全不变量

client 是嵌入 Sampling requests 的 trust boundary。

- 当 policy 要求 approval 时，向用户展示 server 正要求 model 执行什么。
- 限制 MRTR rounds，否则恶意 server 可制造 model-spend loop。
- 将每个 sampling response 用作 filename、URL 或 tool input 前先校验。
- 限制每轮 bytes 和 tokens。
- 拒绝当前 client capabilities 未声明支持的 input request。
- 不让 model output 参与 authorization decisions。
- 记录 originating method 与 input-request key，但不记录敏感 prompt content。

`clientInfo` 和 `serverInfo` 是 display 与 diagnostics metadata。绝不要将任一者作为 authenticated identity。

```figure
t3-sampling-flip
```

## 动手构建

`code/main.py` 不依赖第三方 package，实现完整两轮 flow：

- `server/discover` 返回 `supportedVersions`、声明 tool support，并返回 cache hints。
- `tools/list` 返回确定性的、可缓存的 `summarize_repo` descriptor 和 object input schema。
- `tools/call` 校验逐请求 metadata。
- 第一个 result 嵌入用于 file selection 的 `sampling/createMessage`。
- 第一次 retry 校验 model result，并嵌入第二个 request。
- HMAC-protected `requestState` 在独立 requests 间携带 phase。
- 最终 result 使用 `resultType: "complete"`。

fake host model 让示例保持确定性。连接真实 host 时只替换 `fake_host_model`；server-side state machine 应保持确定性且可测试。

## 实际使用

从 repository root：

```bash
cd phases/13-tools-and-protocols/11-mcp-sampling/code
python3 main.py
python3 -m unittest discover tests -v
```

预期 checkpoints：

- Discovery 返回带 `ttlMs` 和 `cacheScope` 的 complete result。
- Tool discovery 返回相同的已排序 descriptor，其中有 `resultType`、server identity 和 cache hints。
- 缺少 capabilities 和不支持 versions 使用精确 `-32021` 与 `-32022` error data。
- 无 id notification 不产生 JSON-RPC response。
- Request ids 是 `[1, 2, 3]`，证明每轮 MRTR 独立。
- 前两个 results 是 `input_required`。
- 最终 result 是 `complete`，并包含 selected files 与 summary。
- 在 retry 中修改原始 arguments 会使 request-state check 失败。

## 拿去用

`outputs/skill-sampling-loop-designer.md` 现在是一份迁移 planner。它首先决定是否应移除 Sampling，改用 direct model integration。若需要兼容性，它会产出 MRTR rounds、state binding、capability gate、budget、validation 和 removal plan。

## 练习

1. 将 file-selection response 改为无效 JSON。确认 server 返回 `-32602`，而不是信任 model output。
2. 在第一条 call 与 retry 之间修改 `audience`。解释为何 sealed state 阻止跨请求复用。
3. 添加第三轮，让 host 批评 summary。将先前 summary 放在 signed state 中，并将整个 flow 限制为三轮。
4. 通过以 server-owned model adapter 替换 fake host callback 移除 Sampling。列出移交给 server 的 approval、billing 和 observability responsibilities。
5. 添加 expiry test，使用一个比 deadline 晚一秒的 state value。

## 关键术语

| 术语 | 在 2026-07-28 中的含义 |
|------|------------------------|
| Sampling | 已弃用的功能：要求 client model 提供 completion |
| MRTR | 当 request 需要 client input 时使用的无状态 retry pattern |
| `InputRequiredResult` | 带有 `resultType: "input_required"` 的 result |
| `inputRequests` | 由 server 分配的、嵌入 elicitation、sampling 或 roots requests 的 map |
| `inputResponses` | 以 `inputRequests` 相同 keys 组织的当前 round client results |
| `requestState` | client 原样回显、server 校验的不透明 server state |
| `resultType` | 现代 MCP results 的必需 discriminator |
| Direct model integration | 新 servers 需要 model inference 时推荐的替代方案 |
| Capability gate | 阻止发送 client 未声明支持的 embedded request 的规则 |
| Loop budget | 为 operation 允许的最大 rounds、tokens、bytes、time 和 spend |

## 旧版兼容性

固定在 2025-11-25 的 client 仍可通过 live connection 使用较早的 server-initiated `sampling/createMessage` flow。仅在 version-specific adapter 中保留该行为。不要将 sessionful path 作为 2026-07-28 server 的架构。

官方 SDKs 能够为较早 peers 转换现代 `input_required` handlers。该 shim 是 compatibility boundary，不是添加新 session-dependent logic 的许可。

## 延伸阅读

- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP Sampling deprecation](https://modelcontextprotocol.io/seps/2577-deprecate-roots-sampling-and-logging)
- [MCP 2026-07-28 server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
