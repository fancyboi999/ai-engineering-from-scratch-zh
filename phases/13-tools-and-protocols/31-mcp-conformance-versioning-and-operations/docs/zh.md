# MCP 一致性工程：版本、证据与运维

> 某个 SDK 的 happy path 跑通一次，并不代表 server 就一致。真正的一致性存在于线上、版本边界、中间层和回滚期间。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 09（传输）、阶段 13 · 17（网关）、阶段 13 · 30（Registry 准入）
**预计时间：** 约 100 分钟

## 学习目标

- 将规范性的 MCP 规则转化为 golden 和负向传输层转录记录。
- 将严格的 `2026-07-28` 行为与有边界的遗留回退行为分开。
- 区分可加的未知字段和无效的未知 `resultType`。
- 对比原始 JSON-RPC 证据与 SDK 归一化后的视图。
- 通过真实代理边界证明 header 和 body 的完整性。
- 以脱敏后的转录记录、健康度和回滚证据为发布设门。

## 问题背景

你的 client 通过 SDK 调用 `tools/list`，拿到了 tools。集成测试通过了。

这个结果仍留下重要问题：

- 请求是否携带了现代的逐请求协议元数据？
- `MCP-Protocol-Version`、`Mcp-Method` 和 `Mcp-Name` 是否与 JSON-RPC body 相符？
- 响应在原始传输中携带的是有效的 `resultType`，还是 SDK 合成了一个？
- client 会保留未来新增的字段吗？
- 已识别的现代错误会意外触发遗留握手吗？
- 代理是否保留了 origin status 和 JSON-RPC 错误？
- notification serializer 是否输出了被禁止的响应？
- 运维能否在不存储 secrets 的前提下，证明某次发布为何被提升或回滚？

一致性是一组可观察的不变量。在生产流量不得不替你发现问题之前，先构建一个能捕获这些不变量的 harness。

```figure
mcp-conformance-operations
```

## 从版本时代开始

MCP `2026-07-28` 使用自包含的逐请求元数据。现代请求携带 `params._meta.io.modelcontextprotocol/protocolVersion` 和 `params._meta.io.modelcontextprotocol/clientCapabilities`。精确的命名空间 key 很重要；不带命名空间的 `protocolVersion` 或 `clientCapabilities` 别名都是格式错误。当 HTTP 边界存在镜像路由 header 时，其值必须与 JSON-RPC body 一致。现代成功结果携带 `resultType`。

截至 `2025-11-25` 的版本使用更早的初始化时代。只有 client 选定了那个更早时代后，缺少 `resultType` 的遗留结果才会被解释为 complete。

不要创建一个同时接受两种形态的宽松 validator。使用两个分支：

| 分支 | 进入证据 | 缺少 `resultType` | 初始化 |
|---|---|---|---|
| 现代 | 成功的 `server/discover` 或已识别的现代响应 | 无效 | 不是默认路径 |
| 遗留 | 配置的 allowlist，加上现代探测无结论后有效的遗留 `initialize` 结果 | 解释为 complete | 该时代必需 |

这种分离能避免格式错误的现代 peer 因此获得更弱的验证。

### 严格模式

严格模式需要现代行为的证据。成功的 `server/discover` 证明应走现代分支。已识别的现代 JSON-RPC 错误同样能证明这一点。修正请求或停止。server 返回 `-32020`、`-32021` 或 `-32022` 时，绝不要降级。

### 回退模式

回退模式执行一次有边界的现代探测。timeout、空回复、连接关闭或未识别响应都没有结论。它们不能证明 peer 是遗留版本。只有为兼容性显式配置或加入 allowlist 的 endpoint，才能接收有边界的遗留探测；并且 client 必须在验证该探测的 `initialize` 结果及协商的遗留 revision 后，才能选定遗留分支。

回退不是“遇到任何错误后都尝试遗留版本”。已识别的现代错误包含有用的修正信息。此后降级可能掩盖 header 不匹配、缺少 capability 声明或不支持的版本。

这可防止攻击者、故障或过滤代理通过丢弃现代响应来强制降级。将 endpoint policy、无结论的现代观察、精确的正向遗留证据和选定时代一并记录。

在每份转录记录旁记录选定的时代。没有这个事实，同一个缺失字段可能在一次测试中看起来可接受，在另一次测试中却无效。

## 构建转录记录语料库

转录记录 fixture 记录的是跨越边界的内容，而不只是 SDK 调用：

```json
{
  "name": "golden-modern-list",
  "era": "modern",
  "headers": {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/list"
  },
  "request": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  },
  "responseStatus": 200,
  "responseBody": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "resultType": "complete",
      "tools": []
    }
  }
}
```

保留两类 fixtures。

### Golden 转录记录

Golden 转录记录证明被接受的行为：

- 元数据和 headers 匹配的现代 discovery 或 method 请求
- 携带必需字段的 complete 结果
- 当 method 可以请求更多输入时的 `input_required` 结果
- 仅在宣告了对应 capability 后出现的 extension 结果
- 没有 `resultType` 的遗留结果，但仅限已选定的遗留时代
- 不产生 JSON-RPC 响应的 notification 处理

Golden 转录记录要精确，而非庞大。对易变的 IDs 和 timestamps 保持确定性，或在比较前将其归一化。

### 负向转录记录

负向转录记录证明拒绝行为：

- header 和 body 不匹配
- 缺少逐请求 capabilities
- 不支持但已匹配的协议版本
- 缺少现代 `resultType`
- 未知或未宣告的 `resultType`
- 响应 `jsonrpc` 不是 `2.0`，或 ID 的值或 JSON 类型不同
- 响应同时包含 `result` 与 `error`，或者两者皆无
- error 没有整数 `code` 和字符串 `message`
- 已知协议错误映射到了错误的 HTTP status
- 为 notification 输出了响应
- 格式错误的 JSON-RPC envelope
- 代理将协议错误折叠处理

对每个负向 case，断言拒绝边界和稳定的错误码。“调用失败了”太弱。代理生成的 500 和 origin 的 `-32020` 都可能看起来是失败，却给运维讲述完全不同的故事。

header 不匹配 fixture 必须包含 server 实际返回的 HTTP 400 JSON-RPC 响应，其中包含匹配的请求 ID 和错误码 `-32020`。只要本地 validator 观察到 `HeaderMismatch`，就自动强制执行此要求；不要将响应验证做成可选的 fixture flag。即使本地拒绝码正确，HTTP 500 且没有 body 的 case 仍然失败。在自己的请求 validator 抛出后就停止的 harness，测试的只是自己而非 server 的传输层行为。

官方 MCP conformance project 可作为外部 suite 和版本化参考。也要保留本地转录记录。它们捕获了你的 proxy、SDK、authentication、extensions 和发布路径，而通用 suite 无从得知这些内容。

## Header 值必须与 RPC Body 匹配

在现代 Streamable HTTP 中，中间层可以使用镜像 headers 进行路由或执行 policy。JSON-RPC body 仍是协议的事实来源。不匹配是完整性失败，而不是让你任选一个值的提示。

按此顺序验证：

1. 解析并验证 JSON-RPC envelope 和元数据类型。
2. 将 `MCP-Protocol-Version` 与 `params._meta.io.modelcontextprotocol/protocolVersion` 比较。
3. 将 `Mcp-Method` 与 `method` 比较。
4. method 有路由名称时，将 `Mcp-Name` 与对应的 body 值比较。
5. 确立相等性后，再决定匹配的版本和 capability 集是否受支持。

这个顺序区分不匹配 `-32020` 和不支持的版本 `-32022`。它还能阻止 gateway 授权 header 中的名称，而 origin 执行不同的 body 名称。

HTTP field name 不区分大小写，而其值仍区分大小写。查找前规范化 header names，并拒绝相互冲突的重复项。对于不安全、非 ASCII 或有前导或尾随空白的 `Mcp-Name`，与 body 比较前须解码精确的 `=?base64?{Base64EncodedValue}?=` UTF-8 sentinel。以 `-32020` 拒绝不完整的 sentinel、无效 Base64、无效 UTF-8 或原始不安全值。即使 body 包含相同字符，原始的前后空白也无效，因为该值在传输前需要 sentinel 编码。

中间层可能在请求到达 MCP server 前就拒绝格式错误的 HTTP，因此它的失败可能是没有 JSON-RPC 的 HTTP 错误。捕获拒绝是来自中间层还是 origin。origin MCP server 在处理有效 JSON-RPC 请求后应使用协议错误契约。

## 未知字段不等于未知结果

前向兼容性需要两条不同的规则。

### 可加的未知字段

结果对象和 `_meta` maps 可以增加字段。除非字段违反保留契约，否则 validator 应依其角色保留或忽略可加字段。示例会将完整的原始结果留在证据中，并接受已知结果旁的 `futureHint`。

如果你是透明 proxy，保留未知字段通常比剥离更安全。如果你是 application client，忽略它也可以有效。你的 differential test 仍应揭示 SDK 忽略了它，使这一行为是经过有意选择的。

### 未知的 `resultType`

`resultType` 是一个 discriminator。核心现代结果使用 `complete` 或 `input_required`。只有在宣告了 capability 时，extension 才能增加另一个值。例如，Tasks extension 能在协商出的 capability context 中增加 `task`。

未知或未宣告的 discriminator 不能被安全地当作 complete。client 不知道自己会丢弃什么 lifecycle。拒绝它。

因此，相同的原始响应可以包含可接受的未知字段和不可接受的未知 result type。两种情况都要测试。

discriminator 只是第一层。之后要验证 method-specific payload。完整的 `tools/list` 结果需要一个 `tools` array，其中 descriptors 有唯一的非空名称、有用的描述和 object-root `inputSchema` 值。 `task` 结果仅对拥有 Tasks capability 的合格 `tools/call` 有效，并要求 `taskId`、已知状态、创建和更新时间戳以及 `ttlMs`，外加有效的可选 polling interval。完整的 `completion/complete` 结果需要一个 `completion` object，其中最多 100 个字符串值、可选的非负整数 `total` 不得小于已返回值数量，以及可选的 Boolean `hasMore`。正确拼写的 `resultType` 不能让格式错误的 payload 符合一致性。

## Notification 不变量

JSON-RPC notification 没有 `id`。接收方不得发送 JSON-RPC success 或 error 响应。

对于被接受的 HTTP notification 形态，harness 预期 HTTP `202` 和空 body。MCP `2026-07-28` 没有定义 Streamable HTTP 上的核心 client-to-server notifications。示例仅使用带命名空间的课程 extension notification 来测试单向 serializer 不变量。不要把它表述为新的核心 method。

测试 serializer，而不只是 handler。handler 可能返回 `None`，middleware 却将其包成 JSON success object。捕获最终 egress bytes。

## 添加 SDK 差异对比

SDK 经常将线上对象转换成方便的语言类型。这很有用，但归一化对象无法证明实际接收了什么。

对每个高风险 fixture，捕获：

1. SDK 解码前的原始 status、headers 和 response body。
2. SDK 归一化的返回值或 exception。
3. 所选时代的预期语义投影。
4. SDK 提取、合成、剥离或变更的字段。

示例在比较 application payload 时，允许 SDK 仅移除已知的传输层记账字段，例如 `resultType`、`_meta`、`ttlMs` 和 `cacheScope`。它会报告被丢弃的 `futureHint`，因为这个未知的语义字段消失了。

不要假设每个差异都是 SDK bug。重点是让转换可见。确定你的 component 是可忽略可加字段的 application endpoint，还是应保留它们的透明 intermediary。

对你要发布的每个 SDK 和版本运行 differential。如果两个 SDK 将相同的转录记录归一化为不同结果，release policy 应说明哪种行为可接受，而不是事后选择最方便的输出。

## 捕获代理证据

大多数生产 MCP 失败跨越不止一个 process。记录三种视图：

| 视图 | 最低证据 |
|---|---|
| Ingress | 请求 headers、JSON-RPC body、content type、已认证 route、接收时间 |
| Origin | 转发的 headers 和 body digest、origin status、response headers 和 body |
| Egress | client 可见的 status、headers、body 和发送时间 |

示例检测两种常见转换：

- origin HTTP 400 或 404 JSON-RPC error 变成通用的 proxy 500
- egress JSON-RPC body 与 origin body 不同

为 content type、`Accept`、compression、request-scoped SSE、cache headers 和 trace correlation 添加部署专用断言。policy 允许时，捕获 TLS termination 的两侧。绝不要为了证明路径而记录 credentials。

## 证据离开内存前先脱敏

脱敏是一致性运维的一部分，不是事后清理工作。在 serialization、hashing、logs、test artifacts 或失败上传之前执行它。

示例先对 key names 做大小写折叠并移除分隔符后再匹配，然后递归替换 `Authorization`、`Cookie`、`Set-Cookie`、`X-Api-Key`、`accessToken`、`clientSecret`、`registrationAccessToken`、`token`、`password`、`secret` 和 `api_key` 等 keys 下的值。canonicalization 和 denylist 必须使用相同形式，这样 camelCase、连字符、下划线和点号变体才无法绕过 policy。生产 collector 应添加 method-specific argument policy，因为像 `query` 这样无害的 key 仍可能包含个人或受监管数据。

对脱敏后的 evidence bundle 进行 hash。只有特定调查需要时，才在获批的短期系统中保留原始 captures。digest 证明哪份脱敏 bundle 驱动了决定；它不会泄露被删除的值。

## 将健康度和回滚纳入 Gate

协议一致性是发布的必要条件，但并不充分。符合一致性的 candidate 仍可能 timeout、泄漏 memory 或压垮 dependency。

在 rollout 前定义 health window：

- 最小 sample count
- 最大 error rate
- 最大 latency percentile
- saturation 或资源限制
- observation duration
- 与已准入 baseline 的比较

也要在 rollout 前定义 rollback evidence：

- 精确的先前版本
- 准入 evidence digest
- SHA-256 artifact 和 descriptor pins
- 当前 Registry status
- 当前 health result
- route restoration procedure
- 可信 release-controller identity 对这些精确字段的 attestation

在提升前要求该 rollback target 已验证且健康，而不只是在 candidate 失败后才验证。没有可用恢复路径的成功发布，还不能进入生产。

如果 candidate 失败而 rollback target 缺少这些证据，就暂停流量，不要猜测。“回滚到之前的版本”不是运维控制措施。

不要将就绪状态简化为真值检查，例如非空版本、`healthy: "yes"` 或任意 evidence string。示例要求精确类型、active status、三个 SHA-256 digests、可信 signer，以及覆盖完整 rollback payload 的有效 HMAC-SHA-256 attestation。其确定性的 demo key 是非 secret fixture。在生产环境中，请在 release boundary 注入受保护 key、KMS verification result 或 public-key attestation verifier。

release gate 同样拒绝空的 transcript、SDK differential 或 proxy evidence。每个来源都必须携带有效 evidence digests。绿色的 health window 不能补足从未观察到的边界。

## 动手构建

运行这个仅用标准库的 harness：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
```

这个 demo 会运行恰好十五条 golden 和负向转录记录，包括有效和格式错误的 completion 结果；比较原始结果与 SDK 视图；检查折叠了 origin error 的 proxy；评估 health；认证 rollback evidence；并选择该 target。

预期形态：

```json
{
  "transcriptsPassed": 15,
  "transcriptsTotal": 15,
  "sdkDroppedFields": ["futureHint"],
  "proxyIssues": [
    "proxy collapsed a protocol error into HTTP 500",
    "proxy changed the origin JSON-RPC body"
  ],
  "releaseAction": "rollback",
  "evidenceDigest": "..."
}
```

按此顺序阅读 `code/main.py`：

1. `validate_request()` 强制执行时代专属的请求和 header 规则。
2. `validate_result()` 区分缺失的遗留 discriminator、有效的现代值、extensions 和未知值。
3. `select_era()` 实现严格和有边界的回退 policy。
4. `run_transcript()` 评估 golden 和负向 fixtures。
5. `compare_sdk_view()` 暴露归一化差异。
6. `inspect_proxy()` 对比 ingress、origin 和 egress evidence。
7. `redact()` 在 evidence hashing 前移除明显的 secrets。
8. `rollback_evidence_ready()` 验证精确的 pin fields 和可信 release attestation。
9. `ReleaseGate.evaluate()` 汇合非空的一致性、SDK、proxy、health 和 rollback evidence。

## 实际使用

在四个时点运行 harness：

1. 每次实现变更时，使用进程内 test adapter。
2. 针对通过真实 transport 构建的 client 和 server binaries。
3. 在 staging environment 中通过已部署的 proxy 或 gateway。
4. 在 canary rollout 期间，结合实时 health 和 rollback evidence。

让各层使用相同且稳定的 case names。 `negative-header-body-mismatch` 在 unit、end-to-end、proxy 和 canary reports 中应表示同一个不变量。evidence digest 会因为边界变化而不同；要求不应变化。

将 fixture schemas 存入 version control。将脱敏后的 run evidence 存入 release system。仅在 incident access controls 下存储短期原始 captures。

## 交互实验

### 实验 A：证明时代边界

在 `code` 目录中打开 Python：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/code
python3 -q
```

运行：

```python
from main import *
validate_result({"tools": []}, "legacy")
validate_result({"tools": []}, "modern")
```

遗留调用会推断 `complete`。现代调用会抛出 `ProtocolViolation`。现在测试回退：

```python
select_era({"kind": "timeout"}, "fallback")
select_era(
    {"kind": "timeout"},
    "fallback",
    legacy_allowed=True,
    legacy_evidence={"kind": "initialize_success", "protocolVersion": LEGACY_VERSION},
)
select_era({"kind": "jsonrpc_error", "code": -32021}, "fallback")
```

第一次 timeout 会以关闭失败，因为静默不是遗留证据。第二次调用只因配置允许且观察到有效的遗留初始化结果，才选定 legacy。已识别的缺少 capability error 证明了现代分支。

### 实验 B：可加字段与 discriminator 的区别

```python
validate_result({"resultType": "complete", "tools": [], "futureHint": True}, "modern")
validate_result({"resultType": "future_mode", "tools": []}, "modern")
```

第一个结果保留 `futureHint`。第二个结果被拒绝，因为 lifecycle discriminator 未知。

### 实验 C：检查 SDK 转换

```python
compare_sdk_view(
    {"resultType": "complete", "tools": [], "futureHint": {"mode": "new"}},
    {"tools": []},
)
```

决定你的 component 能否忽略 `futureHint`，还是必须转发它。把这个选择写入 release policy。不要悄悄抹掉差异。

### 实验 D：修复代理

修改 demo exchange，使 egress 保留 origin status 和 body。再次运行 `python3 main.py`。proxy issues 应会消失，但 SDK differential 仍会阻止 promotion。然后将 `futureHint` 包含到 SDK view 中，观察每个 evidence source 都通过时 action 变为 `promote`。

## 实践实验

向 harness 添加 request-scoped SSE 转录记录。

要求：

- 捕获 response status、content type、有序 SSE events 和 stream termination。
- 证明每个 JSON-RPC event 都有有效的时代专属 result 或 error。
- 为在转发前缓冲整个 stream 的 proxy 添加负向 case。
- 为 JSON-RPC id 与请求不同的 SSE event 添加负向 case。
- 在写入 evidence 前脱敏 event data。
- 在 health window 中包含 stream duration、first-event latency 和 event count。
- stream 失败时，令 release gate 只选择具有证据的 rollback target。

成功意味着同一 case 可以直接运行并经由 proxy 运行，且报告能识别改变行为的精确边界。

## 交付产物

本课交付 `outputs/skill-mcp-conformance-release-gate.md`。用它将一次 server、client、gateway 或 SDK 变更转化为版本化的一致性矩阵和发布决策。该产物要求原始线上证据、负向 cases、明确的时代选择、SDK differentials、proxy proof、脱敏、health thresholds 和 rollback evidence。

## 验证

运行 demo 和确定性 suite：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 每条纳入的 golden 和负向转录记录都达到预期结果
- 现代请求要求精确的命名空间元数据 keys
- HTTP header names 以不区分大小写的方式匹配，并且编码的 `Mcp-Name` 值被精确解码
- header 和 body 不匹配返回现代不匹配错误码
- 响应版本、ID、result 或 error 的互斥性、error shape 和 HTTP 映射都已验证
- method-specific 的 tool-list、task 和 completion payload 要求被强制执行
- 每个观察到的 `HeaderMismatch` 都要求实际的 HTTP 400 JSON-RPC `-32020` 响应
- 原始 `Mcp-Name` 空白会被拒绝，精确 sentinel 编码的空白可往返
- 缺少 `resultType` 仅在选定遗留时代有效
- 可加字段通过原始验证，未知 result types 失败
- extension result types 要求已宣告的 capability
- 已识别的现代 errors 永不触发遗留回退
- notifications 不产生 JSON-RPC 响应
- 区分 SDK bookkeeping 移除和语义字段丢失
- 检测 proxy error collapse，并在 camelCase 和分隔符变体中递归脱敏 credentials
- promotion 要求非空的 transcript、SDK、proxy 和健康的运维证据
- promotion 与 rollback 都要求经过认证、已 pinned、active 且健康的 rollback target

## 生产故障模式

| 故障 | 弱测试报告什么 | Harness 必须证明什么 |
|---|---|---|
| SDK 合成了缺失的 discriminator | “tools/list passed” | 原始现代结果缺少 `resultType`，因而无效 |
| client 在 `-32021` 后降级 | “legacy retry worked” | 已识别的现代 error 禁止回退 |
| 将未知 result type 当作 complete | “response parsed” | 未宣告的 lifecycle discriminator 会被拒绝 |
| proxy 授权一个 tool，而 origin 执行另一个 | “request reached server” | 每一跳的 `Mcp-Name` 都等于 body 中的路由名称 |
| harness 读取 server response 前就抛出 | “header mismatch test passed” | HTTP 400 和 JSON-RPC `-32020` 响应被捕获并验证 |
| proxy 将 origin 400 变成通用 500 | “upstream error” | 保留 origin 和 egress statuses 以及 JSON-RPC bodies |
| notification middleware 输出 `{result: null}` | “handler returned none” | 最终 egress body 为空，且不存在 JSON-RPC 响应 |
| SDK 剥离了可加字段 | “typed objects match” | 原始视图和归一化视图显示精确丢失的字段 |
| 失败 artifact 泄露 bearer token | “debug bundle uploaded” | hashing、logging 或 upload 前已脱敏 |
| credential key 风格绕过脱敏 | “denylist contains api_key” | CamelCase 和分隔符变体共享一种 canonical denylist 形式 |
| canary 没有 samples 却显示健康 | “zero errors” | 强制执行最小 sample count |
| rollback 选择未知 build | “previous deployment restored” | target version、admission digest、pins、status 和 health 全部存在 |

## 运维规则

测试你发出的 bytes、每个 intermediary 转发的 bytes、每个 SDK 暴露的语义，以及运维在压力下要使用的证据。兼容性是显式分支。回滚是有证据支撑的发布动作。两者都不应是宽松 parser 的意外副作用。

## 延伸阅读

- [MCP 2026-07-28 基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP 版本协商](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [官方 MCP conformance project](https://github.com/modelcontextprotocol/conformance)
